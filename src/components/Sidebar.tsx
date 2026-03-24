import React from 'react';
import { useProjectStore } from '../store/useProjectStore';

const Sidebar: React.FC = () => {
  const { currentView, setCurrentView } = useProjectStore();

  const handleImportMedia = async () => {
    if (window.electronAPI) {
      const files = await window.electronAPI.selectFiles();
      if (files && files.length > 0) {
        const mediaItems = await Promise.all(
          files.map((fileUrl) => new Promise<{path: string, aspect: 'H'|'V'|'S'}>((resolve) => {
            const img = new Image();
            img.onload = () => {
              let aspect: 'H'|'V'|'S' = 'S';
              if (img.width > img.height * 1.1) aspect = 'H';
              else if (img.height > img.width * 1.1) aspect = 'V';
              resolve({ path: fileUrl, aspect });
            };
            img.onerror = () => resolve({ path: fileUrl, aspect: 'H' });
            img.src = fileUrl;
          }))
        );
        useProjectStore.getState().addMedia(mediaItems);
      }
    }
  };

  return (
    <aside className="w-20 bg-surface-container-low border-r border-outline-variant/15 flex flex-col items-center py-4 z-20 flex-shrink-0">
      {/* Brand logo */}
      <div className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center font-bold text-xl mb-6 shadow-md cursor-pointer hover:bg-primary/90 transition-colors">
        SB
      </div>

      {/* Main navigation */}
      <nav className="flex flex-col gap-2 w-full px-2 mt-2 flex-1">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-lg transition-all ${currentView === 'dashboard' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
          title="Overview"
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
          <span className="text-[9px] font-medium tracking-tighter">Overview</span>
        </button>
        <button 
          onClick={() => setCurrentView('editor')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-lg transition-all ${currentView === 'editor' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
          title="Editor"
        >
          <span className="material-symbols-outlined text-xl">auto_awesome_mosaic</span>
          <span className="text-[9px] font-medium tracking-tighter">Editor</span>
        </button>
        <button 
          onClick={() => setCurrentView('biblioteca')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-lg transition-all ${currentView === 'biblioteca' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
          title="Assets"
        >
          <span className="material-symbols-outlined text-xl">photo_library</span>
          <span className="text-[9px] font-medium tracking-tighter">Assets</span>
        </button>
        <button
          onClick={() => setCurrentView('layout_designer')}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-lg transition-all ${currentView === 'layout_designer' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
          title="Layout Studio"
        >
          <span className="material-symbols-outlined text-xl">space_dashboard</span>
          <span className="text-[9px] font-medium tracking-tighter">Studio</span>
        </button>
      </nav>

      {/* Import Button */}
      <div className="px-6 mb-8 mt-4">
        <button onClick={handleImportMedia} className="w-full primary-gradient text-on-primary py-3 rounded-none font-headline font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all">
          Import Media
        </button>
      </div>
      <footer className="px-2 pt-6 border-t border-outline-variant/10">
        <button className="w-full flex items-center gap-4 py-2 px-5 text-[#acabaa] opacity-70 hover:opacity-100 font-['Inter'] text-xs">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Help</span>
        </button>
        <button className="w-full flex items-center gap-4 py-2 px-5 text-[#acabaa] opacity-70 hover:opacity-100 font-['Inter'] text-xs">
          <span className="material-symbols-outlined">cloud_done</span>
          <span>Cloud</span>
        </button>
      </footer>
    </aside>
  );
};

export default Sidebar;
