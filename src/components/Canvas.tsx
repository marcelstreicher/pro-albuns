import React, { useState } from 'react';
import { useProjectStore, type MediaItem } from '../store/useProjectStore';
import { layoutsDictionary } from '../utils/layouts';

const Canvas: React.FC = () => {
  const { albumConfig, spreads, activeSpreadIndex, addPhotoToPlaceholder, removePhotoFromPlaceholder, customLayouts } = useProjectStore();
  const activeSpread = spreads[activeSpreadIndex];
  
  const [dragOverPlaceholder, setDragOverPlaceholder] = useState<string | null>(null);

  if (!activeSpread) return <div className="flex-1 canvas-grid flex items-center justify-center">No active spread</div>;

  const allLayouts = { ...layoutsDictionary, ...customLayouts };
  const layout = allLayouts[activeSpread.layoutId] || layoutsDictionary['auto'];
  const spreadRatio = (albumConfig.pageWidth * 2) / albumConfig.pageHeight;

  const handleDragOver = (e: React.DragEvent, placeholderId: string) => {
    e.preventDefault();
    setDragOverPlaceholder(placeholderId);
  };

  const handleDrop = (e: React.DragEvent, placeholderId: string) => {
    e.preventDefault();
    setDragOverPlaceholder(null);
    const data = e.dataTransfer.getData('application/json');
    if (data && activeSpread) {
      try {
        const item = JSON.parse(data) as MediaItem;
        addPhotoToPlaceholder(activeSpread.id, placeholderId, item);
      } catch (err) {
        console.error("Drop failed", err);
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverPlaceholder(null);
  };

  return (
    <div className="flex-1 canvas-grid flex items-center justify-center p-20 relative">
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-surface-container-high/80 backdrop-blur-xl rounded-full border border-outline-variant/20 shadow-2xl">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg" title="Select">
          <span className="material-symbols-outlined">near_me</span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors" title="Crop/Pan">
          <span className="material-symbols-outlined">crop</span>
        </button>
        <div className="w-px h-6 bg-outline-variant/40 mx-1"></div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors" title="Guide Lines">
          <span className="material-symbols-outlined">grid_4x4</span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors" title="Layers">
          <span className="material-symbols-outlined">layers</span>
        </button>
      </div>
    
      {/* Spread Container locked to precise Aspect Ratio */}
      <div 
         style={{ aspectRatio: spreadRatio }}
         className="bg-[#fdfdfd] shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-full max-w-5xl max-h-[80vh] relative group transition-all duration-300"
      >
        
        {/* Render Placeholders from JSON Layout */}
        <div className="absolute inset-0 z-10">
          {layout.placeholders.map((ph) => {
            const image = activeSpread.images[ph.id];
            const isHovered = dragOverPlaceholder === ph.id;
            
            return (
              <div 
                key={ph.id}
                onDragOver={(e) => handleDragOver(e, ph.id)}
                onDrop={(e) => handleDrop(e, ph.id)}
                onDragLeave={handleDragLeave}
                style={{ 
                  left: `${ph.x}%`, 
                  top: `${ph.y}%`, 
                  width: `${ph.width}%`, 
                  height: `${ph.height}%` 
                }}
                className={`absolute overflow-hidden group/item transition-all duration-200 border-2 ${isHovered ? 'bg-primary/20 border-primary scale-[0.98] z-20 shadow-xl' : 'bg-surface-container-lowest border-black/5'}`}
              >
                {image ? (
                  <>
                    <img className="absolute inset-0 w-full h-full object-cover" src={image.path} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); removePhotoFromPlaceholder(activeSpread.id, ph.id); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-[#cb3b3b]/90 text-white rounded opacity-0 group-hover/item:opacity-100 hover:scale-110 transition-all flex items-center justify-center shadow-lg hover:rotate-90 z-30"
                      title="Remover Foto"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">close</span>
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-surface pointer-events-none">
                    <span className="material-symbols-outlined text-3xl mb-1">add_photo_alternate</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Page Spine */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-r from-transparent via-black/15 to-transparent z-20 pointer-events-none"></div>
        {/* Spine Crease visual effect */}
        <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent z-20 pointer-events-none mix-blend-overlay"></div>
      </div>
    </div>
  );
};

export default Canvas;
