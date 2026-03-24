import React from 'react';
import { useProjectStore, type MediaItem } from '../store/useProjectStore';

const Filmstrip: React.FC = () => {
  const media = useProjectStore((state) => state.media);

  const handleDragStart = (e: React.DragEvent, item: MediaItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    if (e.dataTransfer.setDragImage) {
      const img = new Image();
      img.src = item.path;
      e.dataTransfer.setDragImage(img, 10, 10);
    }
  };

  return (
    <div className="h-32 bg-surface-container-low border-t border-outline-variant/10 flex flex-col">
      <div className="px-6 py-2 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Project Media ({media.length} Photos)</span>
        <div className="flex gap-4">
          <button className="material-symbols-outlined text-sm text-on-surface-variant">filter_list</button>
          <button className="material-symbols-outlined text-sm text-on-surface-variant">sort</button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto scrollbar-hide px-6 flex items-center gap-3 pb-4">
        {media.map((image, index) => (
          <div 
            key={index}
            draggable
            onDragStart={(e) => handleDragStart(e, image)}
            className="h-20 rounded overflow-hidden bg-surface-container-highest shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-primary/50 flex items-center justify-center"
          >
            <img className="h-full w-auto object-contain pointer-events-none" src={image.path}/>
          </div>
        ))}
        {media.length === 0 && (
          <div className="text-xs text-on-surface-variant italic">Import media to start arranging spreads.</div>
        )}
      </div>
    </div>
  );
};

export default Filmstrip;
