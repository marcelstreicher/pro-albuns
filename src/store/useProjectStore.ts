import { create } from 'zustand';
import { layoutsDictionary, type LayoutTemplate } from '../utils/layouts';

export interface MediaItem {
  path: string;
  aspect: 'H' | 'V' | 'S';
  cropX?: number;   // offset in % of container width (can be negative)
  cropY?: number;   // offset in % of container height
  cropScale?: number; // 1.0 = fill, > 1 = zoomed in
}

export interface AlbumConfig {
  name: string;
  pageWidth: number; // in mm
  pageHeight: number; // in mm
  bleed: number; // in mm
  maxPhotosPerSpread?: number;
}

export interface Spread {
  id: string;
  layoutId: string; // references a LayoutTemplate.id
  images: Record<string, MediaItem>; // placeholderId -> MediaItem
}

type ViewType = 'dashboard' | 'editor' | 'biblioteca' | 'exportacao' | 'layout_designer';

export type ToastType = 'success' | 'info' | 'warning';
export interface Toast { message: string; type: ToastType; }

interface ProjectState {
  currentView: ViewType;
  albumConfig: AlbumConfig;
  media: MediaItem[];
  spreads: Spread[];
  customLayouts: Record<string, LayoutTemplate>;
  activeSpreadIndex: number;
  layoutDesignerPendingCount: number | null;
  pendingDraftPhotos: { spreadId: string, photos: MediaItem[] } | null;
  toast: Toast | null;
  setCurrentView: (view: ViewType) => void;
  setAlbumConfig: (config: Partial<AlbumConfig>) => void;
  addMedia: (items: MediaItem[]) => void;
  clearMedia: () => void;
  setActiveSpread: (index: number) => void;
  addPhotosToSpread: (spreadId: string, items: MediaItem[]) => void;
  removeMedia: (paths: string[]) => void;
  addPhotoToPlaceholder: (spreadId: string, placeholderId: string, item: MediaItem) => void;
  removePhotoFromPlaceholder: (spreadId: string, placeholderId: string) => void;
  setSpreadLayout: (spreadId: string, layoutId: string) => void;
  saveCustomLayout: (layout: LayoutTemplate) => void;
  clearPendingDraftPhotos: () => void;
  updatePhotoCrop: (spreadId: string, placeholderId: string, cropX: number, cropY: number, cropScale: number) => void;
  showToast: (message: string, type?: ToastType) => void;
  clearToast: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentView: 'editor',
  albumConfig: {
    name: 'Square 30x30 Album',
    pageWidth: 300,
    pageHeight: 300,
    bleed: 5,
    maxPhotosPerSpread: 20
  },
  media: [],
  spreads: [
    { id: '1', images: {}, layoutId: '' },
    { id: '2', images: {}, layoutId: '' },
    { id: '3', images: {}, layoutId: '' },
  ],
  customLayouts: {},
  activeSpreadIndex: 0,
  layoutDesignerPendingCount: null,
  pendingDraftPhotos: null,
  toast: null,

  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
  },
  clearToast: () => set({ toast: null }),

  setCurrentView: (view) => set((state) => {
    let updates: Partial<ProjectState> = { currentView: view };
    
    if (view === 'editor' && state.pendingDraftPhotos) {
      const { spreadId, photos } = state.pendingDraftPhotos;
      const allLayouts = { ...layoutsDictionary, ...state.customLayouts };
      const matchingLayoutId = Object.keys(allLayouts).find(
        key => allLayouts[key].photoCount === photos.length
      );
      
      if (matchingLayoutId) {
        const layout = allLayouts[matchingLayoutId];
        const newImagesMap: Record<string, MediaItem> = {};
        photos.forEach((img, i) => {
          if (layout.placeholders[i]) newImagesMap[layout.placeholders[i].id] = img;
        });
        
        updates.spreads = state.spreads.map(s => {
          if (s.id === spreadId) return { ...s, layoutId: matchingLayoutId, images: newImagesMap };
          return s;
        });
      }
      updates.pendingDraftPhotos = null;
      updates.layoutDesignerPendingCount = null;
      // Toast: photos loaded from pending draft
      if (matchingLayoutId) {
        const n = photos.length;
        updates.toast = { message: `${n} foto${n > 1 ? 's' : ''} organizadas automaticamente!`, type: 'success' };
      }
    }
    return updates;
  }),

  setAlbumConfig: (config) => set((state) => ({
    albumConfig: { ...state.albumConfig, ...config }
  })),

  addMedia: (items) => set((state) => {
    const currentCount = state.media.length;
    const allowedNewCount = 500 - currentCount;
    if (allowedNewCount <= 0) return state;
    
    const newItems = items.slice(0, allowedNewCount);
    const existingPaths = new Set(state.media.map(m => m.path));
    const uniqueNewItems = newItems.filter(item => !existingPaths.has(item.path));
    const added = uniqueNewItems.length;
    const toast: Toast | null = added > 0
      ? { message: `${added} foto${added > 1 ? 's' : ''} adicionada${added > 1 ? 's' : ''} ao projeto`, type: 'success' }
      : null;
    return { media: [...state.media, ...uniqueNewItems], toast };
  }),
  
  clearMedia: () => set({ media: [] }),
  setActiveSpread: (index) => set({ activeSpreadIndex: index }),
  
  saveCustomLayout: (layout) => set((state) => ({
    customLayouts: { ...state.customLayouts, [layout.id]: layout }
  })),

  clearPendingDraftPhotos: () => set({ pendingDraftPhotos: null, layoutDesignerPendingCount: null }),
  
  removeMedia: (paths) => set((state) => {
    const pathsSet = new Set(paths);
    return { media: state.media.filter(m => !pathsSet.has(m.path)) };
  }),

  addPhotosToSpread: (spreadId, items) => set((state) => {
    const spreadInfo = state.spreads.find(s => s.id === spreadId);
    if (!spreadInfo) return state;
    
    const currentImages = Object.values(spreadInfo.images);
    const maxPhotos = state.albumConfig.maxPhotosPerSpread || 20;

    let newPhotos = [...currentImages, ...items];
    if (newPhotos.length > maxPhotos) {
       newPhotos = newPhotos.slice(0, maxPhotos);
    }

    const newCount = newPhotos.length;
    
    const allLayouts = { ...layoutsDictionary, ...state.customLayouts };
    const matchingLayoutId = Object.keys(allLayouts).find(
      key => allLayouts[key].photoCount === newCount
    );

    if (matchingLayoutId) {
      const layout = allLayouts[matchingLayoutId];
      const newImagesMap: Record<string, MediaItem> = {};
      newPhotos.forEach((img, i) => {
        if (layout.placeholders[i]) newImagesMap[layout.placeholders[i].id] = img;
      });
      const n = newPhotos.length;
      return {
        spreads: state.spreads.map(s => {
          if (s.id === spreadId) return { ...s, layoutId: matchingLayoutId, images: newImagesMap };
          return s;
        }),
        toast: { message: `Layout '${n} Foto${n > 1 ? 's' : ''}' aplicado`, type: 'success' } as Toast
      };
    } else {
      return {
        pendingDraftPhotos: { spreadId, photos: newPhotos },
        layoutDesignerPendingCount: newCount,
        currentView: 'layout_designer',
        toast: { message: `Nenhum modelo para ${newCount} fotos. Crie um no Studio!`, type: 'info' } as Toast
      };
    }
  }),

  addPhotoToPlaceholder: (spreadId, placeholderId, item) => set((state) => ({
    spreads: state.spreads.map(spread => {
      if (spread.id === spreadId) {
        return { 
          ...spread, 
          images: { ...spread.images, [placeholderId]: item } 
        };
      }
      return spread;
    })
  })),
  
  removePhotoFromPlaceholder: (spreadId, placeholderId) => set((state) => {
    let newSpreads = state.spreads.map(spread => {
      if (spread.id === spreadId) {
        const newImages = { ...spread.images };
        delete newImages[placeholderId];
        
        const remainingPhotos = Object.values(newImages);
        const newCount = remainingPhotos.length;
        
        if (newCount === 0) {
           return { ...spread, layoutId: '', images: {} };
        }
        
        const allLayouts = { ...layoutsDictionary, ...state.customLayouts };
        const matchingLayoutId = Object.keys(allLayouts).find(
          key => allLayouts[key].photoCount === newCount
        );
        
        if (matchingLayoutId) {
          const layout = allLayouts[matchingLayoutId];
          const newImagesMap: Record<string, MediaItem> = {};
          remainingPhotos.forEach((img, i) => {
            if (layout.placeholders[i]) newImagesMap[layout.placeholders[i].id] = img;
          });
          return { ...spread, layoutId: matchingLayoutId, images: newImagesMap };
        }
        
        return { ...spread, images: newImages };
      }
      return spread;
    });
    return { spreads: newSpreads, toast: { message: 'Foto removida da lâmina', type: 'info' } as Toast };
  }),

  updatePhotoCrop: (spreadId, placeholderId, cropX, cropY, cropScale) => set((state) => ({
    spreads: state.spreads.map(spread => {
      if (spread.id !== spreadId) return spread;
      const existing = spread.images[placeholderId];
      if (!existing) return spread;
      return { ...spread, images: { ...spread.images, [placeholderId]: { ...existing, cropX, cropY, cropScale } } };
    })
  })),

  setSpreadLayout: (spreadId, layoutId) => set((state) => ({
    spreads: state.spreads.map(spread => {
      if (spread.id === spreadId) {
         return { ...spread, layoutId };
      }
      return spread;
    })
  }))
}));
