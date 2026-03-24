import { create } from 'zustand';
import type { LayoutTemplate } from '../utils/layouts';

export interface MediaItem {
  path: string;
  aspect: 'H' | 'V' | 'S';
}

export interface AlbumConfig {
  name: string;
  pageWidth: number; // in mm
  pageHeight: number; // in mm
  bleed: number; // in mm
}

export interface Spread {
  id: string;
  layoutId: string; // references a LayoutTemplate.id
  images: Record<string, MediaItem>; // placeholderId -> MediaItem
}

type ViewType = 'dashboard' | 'editor' | 'biblioteca' | 'exportacao' | 'layout_designer';

interface ProjectState {
  currentView: ViewType;
  albumConfig: AlbumConfig;
  media: MediaItem[];
  spreads: Spread[];
  customLayouts: Record<string, LayoutTemplate>;
  activeSpreadIndex: number;
  setCurrentView: (view: ViewType) => void;
  setAlbumConfig: (config: Partial<AlbumConfig>) => void;
  addMedia: (items: MediaItem[]) => void;
  clearMedia: () => void;
  setActiveSpread: (index: number) => void;
  addPhotoToPlaceholder: (spreadId: string, placeholderId: string, item: MediaItem) => void;
  removePhotoFromPlaceholder: (spreadId: string, placeholderId: string) => void;
  setSpreadLayout: (spreadId: string, layoutId: string) => void;
  saveCustomLayout: (layout: LayoutTemplate) => void;
  autoAssignLayout: (spreadId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentView: 'editor',
  albumConfig: {
    name: 'Square 30x30 Album',
    pageWidth: 300,
    pageHeight: 300,
    bleed: 5
  },
  media: [],
  spreads: [
    { id: '1', images: {}, layoutId: '1-full-spread' },
    { id: '2', images: {}, layoutId: '2-split-equal' },
    { id: '3', images: {}, layoutId: '4-grid' },
  ],
  customLayouts: {},
  activeSpreadIndex: 0,
  
  setCurrentView: (view) => set({ currentView: view }),

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
    
    return { media: [...state.media, ...uniqueNewItems] };
  }),
  
  clearMedia: () => set({ media: [] }),
  setActiveSpread: (index) => set({ activeSpreadIndex: index }),
  
  saveCustomLayout: (layout) => set((state) => ({
    customLayouts: { ...state.customLayouts, [layout.id]: layout }
  })),

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
  
  removePhotoFromPlaceholder: (spreadId, placeholderId) => set((state) => ({
    spreads: state.spreads.map(spread => {
      if (spread.id === spreadId) {
        const newImages = { ...spread.images };
        delete newImages[placeholderId];
        return { ...spread, images: newImages };
      }
      return spread;
    })
  })),
  
  setSpreadLayout: (spreadId, layoutId) => set((state) => ({
    spreads: state.spreads.map(spread => {
      if (spread.id === spreadId) {
         // Optionally, we should remap images to the new layout's placeholders
         // For now, we just clear images if the layout changes, or keep them if ids match
         return { ...spread, layoutId };
      }
      return spread;
    })
  })),

  autoAssignLayout: (spreadId) => set((state) => state) // Stub for future logic
}));
