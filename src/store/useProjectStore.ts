import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { layoutsDictionary, type LayoutTemplate, type Placeholder } from '../utils/layouts';

export type { LayoutTemplate, Placeholder };

export interface MediaItem {
  path: string;
  aspect: 'H' | 'V' | 'S';
  aspectRatio?: number; // Real aspect ratio (W/H)
  cropX?: number;   
  cropY?: number;   
  cropScale?: number; 
}

export interface Bindery {
  id: string;
  name: string;
}

export interface AlbumTemplate {
  id: string;
  binderyId: string;
  name: string;
  spreadWidth: number; 
  spreadHeight: number; 
  bleed: number;
  description?: string;
}

export interface AlbumConfig {
  name: string;
  spreadWidth: number; 
  spreadHeight: number; 
  bleed: number; 
  maxPhotosPerSpread?: number;
  useBorder?: boolean;
  borderWidth?: number; 
  borderColor?: string;
  numPages?: number;
  binderyId?: string;
  templateId?: string;
  autoLayoutOnRemove?: boolean;
}

export interface Spread {
  id: string;
  layoutId: string; 
  images: Record<string, MediaItem>; 
  isLocked?: boolean;
  customPlaceholders?: Placeholder[];
}

export interface ProjectData {
  id: string;
  name: string;
  config: AlbumConfig;
  media: MediaItem[];
  spreads: Spread[];
  lastUpdated: number;
}

type ViewType = 'dashboard' | 'editor' | 'biblioteca' | 'exportacao' | 'layout_designer';

export type ToastType = 'success' | 'info' | 'warning';
export interface Toast { message: string; type: ToastType; }

interface ProjectState {
  projects: ProjectData[];
  activeProjectId: string | null;
  currentView: ViewType;
  
  albumConfig: AlbumConfig;
  media: MediaItem[];
  spreads: Spread[];
  customLayouts: Record<string, LayoutTemplate>;
  activeSpreadIndex: number;
  
  // Page Management
  binderies: Bindery[];
  albumTemplates: AlbumTemplate[];

  layoutDesignerPendingCount: number | null;
  pendingDraftPhotos: { spreadId: string, photos: MediaItem[] } | null;
  toast: Toast | null;
  isResizeMode: boolean;
  isGridMode: boolean;

  toggleResizeMode: () => void;
  toggleGridMode: () => void;
  toggleSpreadLock: (spreadId: string) => void;
  updateSpreadPlaceholders: (spreadId: string, placeholders: Placeholder[]) => void;

  setCurrentView: (view: ViewType) => void;
  showToast: (message: string, type?: ToastType) => void;
  clearToast: () => void;
  
  initProject: (name: string, config: Partial<AlbumConfig>, initialMedia?: MediaItem[]) => void;
  loadProject: (id: string) => void;
  deleteProjectById: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
  
  setAlbumConfig: (config: Partial<AlbumConfig>) => void;
  addMedia: (items: MediaItem[]) => void;
  clearMedia: () => void;
  setActiveSpread: (index: number) => void;
  addPhotosToSpread: (spreadId: string, items: MediaItem[]) => void;
  removeMedia: (paths: string[]) => void;
  addPhotoToPlaceholder: (spreadId: string, placeholderId: string, item: MediaItem) => void;
  removePhotoFromPlaceholder: (spreadId: string, placeholderId: string) => void;
  setSpreadLayout: (spreadId: string, layoutId: string) => void;
  swapPhotos: (spreadId: string, fromPhId: string, toPhId: string) => void;
  saveCustomLayout: (layout: LayoutTemplate) => void;
  deleteCustomLayout: (id: string) => void;
  hasLayoutForPhotoCount: (count: number) => boolean;
  getProjectFormat: () => 'square' | 'landscape' | 'portrait';
  getCompatibleLayouts: (count: number) => LayoutTemplate[];
  setPendingDraftPhotos: (spreadId: string, photos: MediaItem[]) => void;
  clearPendingDraftPhotos: () => void;
  reorderSpreads: (sourceIndex: number, targetIndex: number) => void;
  addSpread: () => void;
  deleteSpread: (index: number) => void;
  updatePhotoAspect: (spreadId: string, placeholderId: string, ratio: number) => void;
  updatePhotoCrop: (spreadId: string, placeholderId: string, x: number, y: number, scale: number) => void;

  // Bindery & Template Actions
  addBindery: (name: string) => void;
  updateBindery: (id: string, name: string) => void;
  deleteBindery: (id: string) => void;
  addAlbumTemplate: (template: Omit<AlbumTemplate, 'id'>) => void;
  updateAlbumTemplate: (id: string, template: Partial<AlbumTemplate>) => void;
  deleteAlbumTemplate: (id: string) => void;
}

const DEFAULT_CONFIG: AlbumConfig = {
  name: 'Novo Álbum',
  spreadWidth: 600,
  spreadHeight: 300,
  bleed: 5,
  maxPhotosPerSpread: 20,
  useBorder: false,
  borderWidth: 1.5,
  borderColor: '#ffffff',
  numPages: 20,
  autoLayoutOnRemove: true
};

const syncProject = (state: ProjectState): ProjectData[] => {
  if (!state.activeProjectId) return state.projects;
  return state.projects.map(p => 
    p.id === state.activeProjectId 
      ? { ...p, config: state.albumConfig, media: state.media, spreads: state.spreads, lastUpdated: Date.now() } 
      : p
  );
};

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        projects: [] as ProjectData[],
        activeProjectId: null as string | null,
        currentView: 'dashboard' as ViewType,
        
        albumConfig: DEFAULT_CONFIG,
        media: [] as MediaItem[],
        spreads: [] as Spread[],
        customLayouts: { ...layoutsDictionary } as Record<string, LayoutTemplate>,
        activeSpreadIndex: 0,
        
        binderies: [] as Bindery[],
        albumTemplates: [] as AlbumTemplate[],

        layoutDesignerPendingCount: null as number | null,
        pendingDraftPhotos: null as { spreadId: string, photos: MediaItem[] } | null,
        toast: null as Toast | null,
        isResizeMode: false,
        isGridMode: false,

        toggleResizeMode: () => set((state) => ({ isResizeMode: !state.isResizeMode })),
        toggleGridMode: () => set((state) => ({ isGridMode: !state.isGridMode })),
        
        toggleSpreadLock: (spreadId) => set((state) => {
          const newSpreads = state.spreads.map(s => 
            s.id === spreadId ? { ...s, isLocked: !s.isLocked } : s
          );
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        updateSpreadPlaceholders: (spreadId, placeholders) => set((state) => {
          const newSpreads = state.spreads.map(s => 
            s.id === spreadId ? { ...s, customPlaceholders: placeholders, layoutId: 'custom' } : s
          );
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        showToast: (message, type = 'success') => set({ toast: { message, type } }),
        clearToast: () => set({ toast: null }),

        setCurrentView: (view) => set((state) => {
          let updates: Partial<ProjectState> = { currentView: view };
          if (view === 'editor' && state.pendingDraftPhotos) {
            const { spreadId, photos } = state.pendingDraftPhotos;
            const allLayouts = Object.values(state.customLayouts);
            const format = state.getProjectFormat();
            const matchingLayout = allLayouts.find(L => 
              L.photoCount === photos.length && 
              (!L.format || L.format === 'all' || L.format === format)
            );

            if (matchingLayout) {
              const matchingLayoutId = matchingLayout.id;
              const imgMap: Record<string, MediaItem> = {};
              photos.forEach((img, i) => { if (matchingLayout.placeholders[i]) imgMap[matchingLayout.placeholders[i].id] = img; });
              updates.spreads = state.spreads.map(s => s.id === spreadId ? { ...s, layoutId: matchingLayoutId, images: imgMap } : s);
            }
            updates.pendingDraftPhotos = null;
            updates.layoutDesignerPendingCount = null;
          }
          const nextState = { ...state, ...updates };
          return { ...updates, projects: syncProject(nextState) };
        }),

        initProject: (name, config, initialMedia = []) => set((state) => {
          const id = crypto.randomUUID();
          const fullConfig: AlbumConfig = {
            name,
            spreadWidth: 600,
            spreadHeight: 300,
            bleed: 5,
            numPages: 20,
            ...config
          };
          const numPages = fullConfig.numPages || 20;
          const numSpreads = Math.ceil(numPages / 2);
          
          let spreads = Array.from({ length: numSpreads }, (_, i) => ({
            id: (i + 1).toString(),
            images: {},
            layoutId: ''
          }));

          if (initialMedia.length > 0) {
            const allLayouts = Object.values(state.customLayouts);
            const ratio = fullConfig.spreadWidth / (fullConfig.spreadHeight || 1);
            const format = ratio > 2.2 ? 'landscape' : ratio < 1.8 ? 'portrait' : 'square';

            const matchingLayout = allLayouts.find(L => 
              L.photoCount === initialMedia.length && 
              (!L.format || L.format === 'all' || L.format === format)
            );

            if (matchingLayout) {
              const matchingLayoutId = matchingLayout.id;
              const imgMap: Record<string, MediaItem> = {};
              initialMedia.forEach((img, i) => { if (matchingLayout.placeholders[i]) imgMap[matchingLayout.placeholders[i].id] = img; });
              spreads = spreads.map((s, idx) => idx === 0 ? { ...s, layoutId: matchingLayoutId, images: imgMap } : s);
            }
          }

          const newProject: ProjectData = { id, name, config: fullConfig, media: initialMedia, spreads: spreads, lastUpdated: Date.now() };
          const newState = {
            ...state,
            activeProjectId: id,
            currentView: 'editor' as const,
            albumConfig: fullConfig,
            media: initialMedia,
            spreads,
            activeSpreadIndex: 0,
            projects: [...state.projects, newProject],
            toast: { message: `Projeto "${name}" iniciado!`, type: 'success' as ToastType }
          };
          return newState;
        }),

        loadProject: (id) => set((state) => {
          const project = state.projects.find(p => p.id === id);
          if (!project) return state;
          return {
            ...state,
            activeProjectId: id,
            currentView: 'editor' as const,
            albumConfig: project.config,
            media: project.media,
            spreads: project.spreads,
            activeSpreadIndex: 0
          };
        }),

        deleteProjectById: (id) => set((state) => {
          const newProjects = state.projects.filter(p => p.id !== id);
          const updates: Partial<ProjectState> = { projects: newProjects };
          if (state.activeProjectId === id) {
             updates.activeProjectId = null;
             updates.currentView = 'dashboard';
          }
          return updates;
        }),

        renameProject: (id, newName) => set((state) => {
          const updatedProjects = state.projects.map(p => p.id === id ? { ...p, name: newName, lastUpdated: Date.now() } : p);
          let updates: Partial<ProjectState> = { projects: updatedProjects };
          if (state.activeProjectId === id) {
            updates.albumConfig = { ...state.albumConfig, name: newName };
          }
          return updates;
        }),

        setAlbumConfig: (config) => set((state) => {
          const newState = { ...state, albumConfig: { ...state.albumConfig, ...config } };
          return { albumConfig: newState.albumConfig, projects: syncProject(newState) };
        }),

        addMedia: (items) => set((state) => {
          const existingPaths = new Set(state.media.map(m => m.path));
          const uniqueNewItems = items.filter(item => !existingPaths.has(item.path));
          const newState = { ...state, media: [...state.media, ...uniqueNewItems] };
          return { media: newState.media, projects: syncProject(newState) };
        }),

        clearMedia: () => set((state) => {
          const newState = { ...state, media: [] };
          return { media: [], projects: syncProject(newState) };
        }),

        setActiveSpread: (index) => set({ activeSpreadIndex: index }),

        addPhotosToSpread: (spreadId, items) => set((state) => {
          const newSpreads = state.spreads.map(s => {
            if (s.id !== spreadId) return s;
            const currentImages = Object.values(s.images);
            const totalPhotos = currentImages.length + items.length;
            const allLayouts = Object.values(state.customLayouts);
            const format = state.getProjectFormat();

            const matchingLayout = allLayouts.find(L => 
              L.photoCount === totalPhotos && 
              (!L.format || L.format === 'all' || L.format === format)
            );

            if (!matchingLayout) return s;
            
            const matchingLayoutId = matchingLayout.id;
            const newImagesMap: Record<string, MediaItem> = {};
            const combined = [...currentImages, ...items];
            combined.forEach((img, i) => { if (matchingLayout.placeholders[i]) newImagesMap[matchingLayout.placeholders[i].id] = img; });
            return { ...s, layoutId: matchingLayoutId, images: newImagesMap };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        removeMedia: (paths) => set((state) => {
          const pathsSet = new Set(paths);
          const newMedia = state.media.filter(m => !pathsSet.has(m.path));
          const newSpreads = state.spreads.map(s => {
            const newImages: Record<string, MediaItem> = {};
            Object.entries(s.images).forEach(([phId, img]) => { if (!pathsSet.has(img.path)) newImages[phId] = img; });
            return { ...s, images: newImages };
          });
          const newState = { ...state, media: newMedia, spreads: newSpreads };
          return { media: newMedia, spreads: newSpreads, projects: syncProject(newState) };
        }),

        addPhotoToPlaceholder: (spreadId, phId, item) => set((state) => {
          const newSpreads = state.spreads.map(s => {
            if (s.id !== spreadId) return s;
            return { ...s, images: { ...s.images, [phId]: item } };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        removePhotoFromPlaceholder: (spreadId, phId) => set((state) => {
          const newSpreads = state.spreads.map(s => {
            if (s.id !== spreadId) return s;
            
            const newImages = { ...s.images };
            delete newImages[phId];

            if (state.albumConfig.autoLayoutOnRemove) {
               const photos = Object.values(newImages);
               const format = state.getProjectFormat();
               const allLayouts = Object.values(state.customLayouts);
               const matchingLayout = allLayouts.find(L => 
                 L.photoCount === photos.length && 
                 (!L.format || L.format === 'all' || L.format === format)
               );

               if (matchingLayout) {
                 const updatedImages: Record<string, MediaItem> = {};
                 photos.forEach((img, i) => {
                   if (matchingLayout.placeholders[i]) updatedImages[matchingLayout.placeholders[i].id] = img;
                 });
                 return { ...s, layoutId: matchingLayout.id, images: updatedImages };
               }
            }
            return { ...s, images: newImages };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        setSpreadLayout: (spreadId, layoutId) => set((state) => {
          const newSpreads = state.spreads.map(s => {
            if (s.id !== spreadId) return s;
            const L = state.customLayouts[layoutId];
            const oldImages = Object.values(s.images);
            const newImages: Record<string, MediaItem> = {};
            oldImages.slice(0, L.photoCount).forEach((img, i) => { newImages[L.placeholders[i].id] = img; });
            return { ...s, layoutId, images: newImages, customPlaceholders: undefined };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        swapPhotos: (spreadId, fromPhId, toPhId) => set((state) => {
          const newSpreads = state.spreads.map(s => {
            if (s.id !== spreadId) return s;
            const fromImg = s.images[fromPhId];
            const toImg = s.images[toPhId];
            const newImages = { ...s.images };
            
            if (toImg) newImages[fromPhId] = toImg;
            else delete newImages[fromPhId];
            
            if (fromImg) newImages[toPhId] = fromImg;
            else delete newImages[toPhId];
            
            return { ...s, images: newImages };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        saveCustomLayout: (L) => set((state) => ({
          customLayouts: { ...state.customLayouts, [L.id]: L }
        })),

        deleteCustomLayout: (id) => set((state) => {
          const newCustom = { ...state.customLayouts };
          delete newCustom[id];
          const newState = { ...state, customLayouts: newCustom };
          return { customLayouts: newCustom, projects: syncProject(newState) };
        }),

        getProjectFormat: () => {
          const { spreadWidth, spreadHeight } = get().albumConfig;
          const ratio = spreadWidth / (spreadHeight || 1);
          if (ratio > 2.2) return 'landscape';
          if (ratio < 1.8) return 'portrait';
          return 'square';
        },

        hasLayoutForPhotoCount: (count) => {
          const { customLayouts } = get();
          const format = get().getProjectFormat();
          return Object.values(customLayouts).some(l => 
            l.photoCount === count && (l.format === 'all' || l.format === format || !l.format)
          );
        },

        getCompatibleLayouts: (count) => {
          const { customLayouts } = get();
          const format = get().getProjectFormat();
          return Object.values(customLayouts).filter(l => 
            l.photoCount === count && (l.format === 'all' || l.format === format || !l.format)
          );
        },

        setPendingDraftPhotos: (spreadId: string, photos: MediaItem[]) => set({ 
          pendingDraftPhotos: { spreadId, photos },
          layoutDesignerPendingCount: photos.length
        }),

        reorderSpreads: (src: number, dst: number) => set((state) => {
          const newSpreads = [...state.spreads];
          const [moved] = newSpreads.splice(src, 1);
          newSpreads.splice(dst, 0, moved);
          let newActive = state.activeSpreadIndex;
          if (src === state.activeSpreadIndex) newActive = dst;
          else if (state.activeSpreadIndex > src && state.activeSpreadIndex <= dst) newActive--;
          else if (state.activeSpreadIndex < src && state.activeSpreadIndex >= dst) newActive++;
          const newState = { ...state, spreads: newSpreads, activeSpreadIndex: newActive };
          return { spreads: newSpreads, activeSpreadIndex: newActive, projects: syncProject(newState) };
        }),

        addSpread: () => set((state) => {
          const nextId = (Math.max(...state.spreads.map(s => parseInt(s.id)), 0) + 1).toString();
          const newSpreads = [...state.spreads, { id: nextId, images: {}, layoutId: '' }];
          const newConfig = { ...state.albumConfig, numPages: (state.albumConfig.numPages || 0) + 2 };
          const newState = { ...state, spreads: newSpreads, albumConfig: newConfig };
          return { spreads: newSpreads, albumConfig: newConfig, projects: syncProject(newState) };
        }),

        deleteSpread: (idx: number) => set((state) => {
          if (state.spreads.length <= 1) return state;
          const newSpreads = [...state.spreads];
          newSpreads.splice(idx, 1);
          let newActive = state.activeSpreadIndex;
          if (newActive >= newSpreads.length) newActive = newSpreads.length - 1;
          const newConfig = { ...state.albumConfig, numPages: Math.max(0, (state.albumConfig.numPages || 0) - 2) };
          const newState = { ...state, spreads: newSpreads, activeSpreadIndex: newActive, albumConfig: newConfig };
          return { spreads: newSpreads, activeSpreadIndex: newActive, albumConfig: newConfig, projects: syncProject(newState) };
        }),

        clearPendingDraftPhotos: () => set({ pendingDraftPhotos: null, layoutDesignerPendingCount: null }),

        updatePhotoAspect: (spreadId, phId, ratio) => set((state) => {
          const newSpreads = state.spreads.map(s => {
            if (s.id !== spreadId) return s;
            const img = s.images[phId];
            if (!img || img.aspectRatio === ratio) return s;
            return { ...s, images: { ...s.images, [phId]: { ...img, aspectRatio: ratio } } };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        updatePhotoCrop: (spreadId, phId, x, y, s) => set((state) => {
          const newSpreads = state.spreads.map(spr => {
            if (spr.id !== spreadId) return spr;
            const img = spr.images[phId];
            if (!img) return spr;
            return { ...spr, images: { ...spr.images, [phId]: { ...img, cropX: x, cropY: y, cropScale: s } } };
          });
          const newState = { ...state, spreads: newSpreads };
          return { spreads: newSpreads, projects: syncProject(newState) };
        }),

        addBindery: (name) => set((state) => ({
          binderies: [...state.binderies, { id: crypto.randomUUID(), name }]
        })),

        updateBindery: (id, name) => set((state) => ({
          binderies: state.binderies.map(b => b.id === id ? { ...b, name } : b)
        })),

        deleteBindery: (id) => set((state) => ({
          binderies: state.binderies.filter(b => b.id !== id),
          albumTemplates: state.albumTemplates.filter(t => t.binderyId !== id)
        })),

        addAlbumTemplate: (template) => set((state) => ({
          albumTemplates: [...state.albumTemplates, { ...template, id: crypto.randomUUID() }]
        })),

        updateAlbumTemplate: (id, template) => set((state) => ({
          albumTemplates: state.albumTemplates.map(t => t.id === id ? { ...t, ...template } : t)
        })),

        deleteAlbumTemplate: (id) => set((state) => ({
          albumTemplates: state.albumTemplates.filter(t => t.id !== id)
        })),
      }),
      { 
        name: 'pro-albuns-storage',
        version: 3,
        migrate: (persistedState: any, version: number) => {
          if (version < 2) {
            const config = persistedState.albumConfig;
            if (config) {
              if (config.pageWidth && !config.spreadWidth) {
                config.spreadWidth = config.pageWidth; config.spreadHeight = config.pageHeight;
                delete config.pageWidth; delete config.pageHeight;
              }
              if (config.bladeWidth && !config.spreadWidth) {
                config.spreadWidth = config.bladeWidth; config.spreadHeight = config.bladeHeight;
                delete config.bladeWidth; delete config.bladeHeight;
              }
            }
            if (persistedState.projects) {
              persistedState.projects = persistedState.projects.map((p: any) => {
                if (p.config) {
                  if (p.config.pageWidth && !p.config.spreadWidth) {
                    p.config.spreadWidth = p.config.pageWidth; p.config.spreadHeight = p.config.pageHeight;
                    delete p.config.pageWidth; delete p.config.pageHeight;
                  }
                  if (p.config.bladeWidth && !p.config.spreadWidth) {
                    p.config.spreadWidth = p.config.bladeWidth; p.config.spreadHeight = p.config.bladeHeight;
                    delete p.config.bladeWidth; delete p.config.bladeHeight;
                  }
                }
                return p;
              });
            }
          }
          if (version < 3) {
            const sanitize = (p: string) => {
              if (p && !p.startsWith('file:///') && !p.startsWith('blob:') && /^[a-zA-Z]:/.test(p)) {
                return `file:///${p.replace(/\\/g, '/')}`;
              }
              return p;
            };
            if (persistedState.media) persistedState.media = persistedState.media.map((m: any) => ({ ...m, path: sanitize(m.path) }));
            if (persistedState.spreads) {
              persistedState.spreads = persistedState.spreads.map((s: any) => {
                const newImgs: any = {};
                Object.entries(s.images || {}).forEach(([k, v]: [string, any]) => { newImgs[k] = { ...v, path: sanitize(v.path) }; });
                return { ...s, images: newImgs };
              });
            }
            if (persistedState.projects) {
              persistedState.projects = persistedState.projects.map((proj: any) => ({
                ...proj,
                media: (proj.media || []).map((m: any) => ({ ...m, path: sanitize(m.path) })),
                spreads: (proj.spreads || []).map((s: any) => {
                  const newImgs: any = {};
                  Object.entries(s.images || {}).forEach(([k, v]: [string, any]) => { newImgs[k] = { ...v, path: sanitize(v.path) }; });
                  return { ...s, images: newImgs };
                })
              }));
            }
          }
          return persistedState;
        }
      }
    )
  )
);
