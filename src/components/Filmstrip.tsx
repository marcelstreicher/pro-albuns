import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useProjectStore, type MediaItem } from '../store/useProjectStore';
import ConfirmDialog from './ConfirmDialog';

const Filmstrip: React.FC = () => {
  const media = useProjectStore((state) => state.media);
  const { removeMedia } = useProjectStore();
  const [height, setHeight] = useState(160);
  const [isResizing, setIsResizing] = useState(false);
  
  // Selection
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // External Drag State
  const [isDragOverExternal, setIsDragOverExternal] = useState(false);
  
  // Lasso State
  const [lassoBox, setLassoBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const lassoStart = useRef<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseSelection = useRef<string[]>([]);

  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeightRef.current + deltaY));
      setHeight(newHeight);
    };
    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.filmstrip-item') || 
        (e.target as HTMLElement).classList.contains('cursor-ns-resize')) {
       return;
    }
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top;
    
    lassoStart.current = { x, y };
    setLassoBox({ x, y, w: 0, h: 0 });
    
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
       setSelectedPaths([]);
       baseSelection.current = [];
    } else {
       baseSelection.current = [...selectedPaths];
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!lassoStart.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const currentY = e.clientY - rect.top;
    
    const x = Math.min(lassoStart.current.x, currentX);
    const y = Math.min(lassoStart.current.y, currentY);
    const w = Math.abs(currentX - lassoStart.current.x);
    const h = Math.abs(currentY - lassoStart.current.y);
    
    setLassoBox({ x, y, w, h });
    
    const newSelected: string[] = [];
    const elements = containerRef.current.querySelectorAll('.filmstrip-item');
    const scrollLeft = containerRef.current.scrollLeft;
    
    elements.forEach(el => {
       const elRect = el.getBoundingClientRect();
       const elLeft = elRect.left - rect.left + scrollLeft;
       const elTop = elRect.top - rect.top;
       const elRight = elLeft + elRect.width;
       const elBottom = elTop + elRect.height;
       
       const overlaps = !(x > elRight || (x+w) < elLeft || y > elBottom || (y+h) < elTop);
       if (overlaps) {
           newSelected.push((el as HTMLElement).dataset.path!);
       }
    });
    
    setSelectedPaths(Array.from(new Set([...baseSelection.current, ...newSelected])));
  };

  const handleContainerMouseUp = () => {
     lassoStart.current = null;
     setLassoBox(null);
  };

  const handlePhotoClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
       setSelectedPaths(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
       setLastSelectedPath(path);
    } else if (e.shiftKey && lastSelectedPath) {
       const lastIdx = media.findIndex(m => m.path === lastSelectedPath);
       const currIdx = media.findIndex(m => m.path === path);
       const start = Math.min(lastIdx, currIdx);
       const end = Math.max(lastIdx, currIdx);
       const range = media.slice(start, end + 1).map(m => m.path);
       setSelectedPaths(Array.from(new Set([...selectedPaths, ...range])));
    } else {
       setSelectedPaths([path]);
       setLastSelectedPath(path);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: MediaItem) => {
    let dragItems = [item];
    if (selectedPaths.includes(item.path)) {
       dragItems = media.filter(m => selectedPaths.includes(m.path));
    }
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragItems));
    if (e.dataTransfer.setDragImage) {
      const img = new Image();
      img.src = item.path;
      e.dataTransfer.setDragImage(img, 10, 10);
    }
  };

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverExternal(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter only images
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const { addMedia, showToast } = useProjectStore.getState();
    showToast(`Processando ${imageFiles.length} foto(s)...`, 'info');

    const mediaItems = await Promise.all(
      imageFiles.map((file) => new Promise<MediaItem>((resolve) => {
        // In Electron, File objects have a 'path' property
        const filePath = (file as any).path || URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          let aspect: 'H'|'V'|'S' = 'S';
          if (img.width > img.height * 1.1) aspect = 'H';
          else if (img.height > img.width * 1.1) aspect = 'V';
          resolve({ path: filePath, aspect });
        };
        img.onerror = () => resolve({ path: filePath, aspect: 'H' });
        img.src = filePath;
      }))
    );

    addMedia(mediaItems);
    showToast(`${mediaItems.length} foto(s) adicionada(s) com sucesso.`, 'success');
  };

  // Media Usage Calculation
  const mediaUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    useProjectStore.getState().spreads.forEach(spread => {
      Object.values(spread.images).forEach(img => {
        counts[img.path] = (counts[img.path] || 0) + 1;
      });
    });
    return counts;
  }, [useProjectStore.getState().spreads]);

  return (
    <div 
      tabIndex={0}
      onKeyDown={(e) => {
         if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.length > 0) {
            setIsConfirmOpen(true);
         }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
          setIsDragOverExternal(true);
        }
      }}
      onDragLeave={() => setIsDragOverExternal(false)}
      onDrop={handleExternalDrop}
      className={`bg-surface-container-low border-t transition-all flex flex-col relative focus:outline-none ${isDragOverExternal ? 'border-primary bg-primary/5 ring-4 ring-inset ring-primary/20' : 'border-outline-variant/10'}`}
      style={{ height: `${height}px`, minHeight: '100px' }}
    >
      <ConfirmDialog 
         isOpen={isConfirmOpen}
         title="Excluir Fotos"
         message={`Tem certeza que deseja remover ${selectedPaths.length} foto(s) do projeto?`}
         onConfirm={() => {
            removeMedia(selectedPaths);
            setSelectedPaths([]);
            setIsConfirmOpen(false);
         }}
         onCancel={() => setIsConfirmOpen(false)}
      />

      {/* Resizer Handle */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1.5 -translate-y-1/2 cursor-ns-resize transition-colors z-10 ${isResizing ? 'bg-primary' : 'hover:bg-primary/50'}`}
        onMouseDown={handleResizeMouseDown}
      />
      
      <div className="px-6 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] uppercase tracking-widest font-bold transition-all ${isDragOverExternal ? 'text-primary scale-110' : 'text-on-surface-variant'}`}>
            {isDragOverExternal ? 'Solte para importar fotos' : `Project Media (${media.length} Photos)`}
          </span>
          {selectedPaths.length > 0 && <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{selectedPaths.length} Selecionadas</span>}
        </div>
        <div className="flex gap-4">
          {selectedPaths.length > 0 && (
            <button onClick={() => setIsConfirmOpen(true)} className="material-symbols-outlined text-sm text-error hover:text-red-400" title="Excluir Seleção">delete</button>
          )}
          <button className="material-symbols-outlined text-sm text-on-surface-variant">filter_list</button>
          <button className="material-symbols-outlined text-sm text-on-surface-variant">sort</button>
        </div>
      </div>
      <div 
        ref={containerRef}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4 relative select-none"
      >
        {lassoBox && (
           <div 
             className="absolute bg-primary/20 border border-primary pointer-events-none z-50 rounded-sm"
             style={{ left: lassoBox.x, top: lassoBox.y, width: lassoBox.w, height: lassoBox.h }}
           />
        )}
        <div className="flex flex-wrap gap-3">
        {media.map((image, index) => {
          const usageCount = mediaUsage[image.path] || 0;
          const isSelected = selectedPaths.includes(image.path);
          
          return (
            <div 
              key={index}
              draggable
              data-path={image.path}
              onClick={(e) => handlePhotoClick(e, image.path)}
              onDragStart={(e) => handleDragStart(e, image)}
              className={`filmstrip-item h-20 rounded overflow-hidden shrink-0 transition-all cursor-grab active:cursor-grabbing border-4 flex items-center justify-center relative
                ${isSelected 
                  ? 'border-primary grayscale-0 opacity-100 shadow-lg scale-[1.05] z-10' 
                  : (usageCount > 0 
                      ? 'bg-surface-container-highest border-transparent grayscale opacity-50 hover:opacity-80 hover:grayscale-0' 
                      : 'bg-surface-container border-transparent grayscale-0 opacity-100 hover:border-primary/50')
                }`}
            >
              <img className="h-full w-auto object-contain pointer-events-none" src={image.path}/>
              
              {/* Usage Badge */}
              {usageCount > 0 && (
                <div className="absolute top-1 left-1 bg-surface-container-highest/90 text-on-surface px-1.5 py-0.5 rounded-full text-[8px] font-bold border border-outline-variant/30 flex items-center gap-0.5 shadow-sm">
                  <span className="material-symbols-outlined text-[10px]">done_all</span>
                  {usageCount}
                </div>
              )}

              {isSelected && (
                 <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-white text-[10px] font-bold">check</span>
                 </div>
              )}
            </div>
          );
        })}
        {media.length === 0 && (
          <div className="text-xs text-on-surface-variant italic w-full pointer-events-none">Import media to start arranging spreads.</div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Filmstrip;
