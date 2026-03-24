import React from 'react';
import { useProjectStore } from '../store/useProjectStore';

const Biblioteca: React.FC = () => {
  const media = useProjectStore((state) => state.media);
  
  return (
    <main className="flex-1 flex flex-col bg-surface relative overflow-hidden">
      {/* Filter Bar */}
      <section className="h-16 flex items-center justify-between px-8 bg-surface-container-low/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-surface-container-highest/50 px-3 py-1.5 rounded border border-outline-variant/10">
            <span className="material-symbols-outlined text-lg text-on-surface-variant">search</span>
            <input className="bg-transparent border-none text-xs text-on-surface focus:ring-0 placeholder:text-outline/50 w-48 outline-none" placeholder="Search filenames..." type="text"/>
          </div>
          <div className="h-4 w-[1px] bg-outline-variant/30"></div>
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <button className="flex items-center gap-1 hover:text-on-surface transition-colors">
              Sort by: <span className="text-primary">Captured Date</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <button className="flex items-center gap-1 hover:text-on-surface transition-colors">
              Filter: <span className="text-on-surface">All Media</span>
              <span className="material-symbols-outlined text-sm">filter_list</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-surface-container-highest p-1 rounded-sm">
            <button className="p-1 rounded bg-surface-bright text-primary">
              <span className="material-symbols-outlined text-lg">grid_view</span>
            </button>
            <button className="p-1 rounded text-on-surface-variant hover:bg-surface-bright/50">
              <span className="material-symbols-outlined text-lg">view_module</span>
            </button>
          </div>
          <input className="w-24 accent-primary opacity-50 hover:opacity-100 transition-opacity" type="range"/>
        </div>
      </section>

      {/* Media Masonry Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {media.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined text-4xl mb-4">photo_library</span>
            <p className="font-headline tracking-widest uppercase text-sm font-bold">No Media Found</p>
            <p className="text-xs mt-2">Use the Import Media button in the sidebar to add photos.</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 space-y-4">
            {media.map((image, index) => (
              <div key={index} className="group relative bg-surface-container-lowest overflow-hidden rounded-sm cursor-pointer hover:ring-2 ring-primary/40 transition-all duration-300 inline-block w-full break-inside-avoid">
                <img alt={`Media ${index}`} className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-700 opacity-90 group-hover:opacity-100" src={image.path} />
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Inspector Tooltip (Floating) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-panel border border-outline-variant/30 px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">Available Media</span>
          <span className="text-sm font-bold text-primary">{media.length} Photos</span>
        </div>
        <div className="h-4 w-[1px] bg-outline-variant/30"></div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-xs text-on-surface hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            Smart Design
          </button>
          <button className="flex items-center gap-2 text-xs text-on-surface hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-base">delete</span>
            Clear All
          </button>
        </div>
      </div>
    </main>
  );
};

export default Biblioteca;
