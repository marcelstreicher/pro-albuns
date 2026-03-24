import React from 'react';
import { useProjectStore } from '../store/useProjectStore';

const TopNavBar: React.FC = () => {
  const { currentView, setCurrentView } = useProjectStore();

  return (
    <header className="h-[60px] bg-surface border-b border-outline-variant/20 flex items-center justify-between px-6 shrink-0 z-30">
      
      {/* Centered navigation tabs */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant/10 shadow-sm">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`px-4 py-1.5 text-xs font-headline font-bold uppercase tracking-widest rounded-md transition-all ${currentView === 'dashboard' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Projetos
        </button>
        <button 
          onClick={() => setCurrentView('editor')}
          className={`px-4 py-1.5 text-xs font-headline font-bold uppercase tracking-widest rounded-md transition-all ${currentView === 'editor' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Lâminas
        </button>
        <button 
          onClick={() => setCurrentView('exportacao')}
          className={`px-4 py-1.5 text-xs font-headline font-bold uppercase tracking-widest rounded-md transition-all ${currentView === 'exportacao' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Revisão
        </button>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">undo</span>
        </button>
        <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">redo</span>
        </button>
        <div className="w-px h-6 bg-outline-variant/20"></div>
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary text-on-primary transition-all font-bold text-xs">
          <span className="material-symbols-outlined text-sm">ios_share</span>
          Export
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;
