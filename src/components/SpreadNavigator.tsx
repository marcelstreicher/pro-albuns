import React from 'react';
import { useProjectStore } from '../store/useProjectStore';


import ConfirmDialog from './ConfirmDialog';

const SpreadNavigator: React.FC = () => {
  const { 
    spreads, activeSpreadIndex, setActiveSpread, 
    customLayouts, reorderSpreads, addSpread, deleteSpread,
    addPhotosToSpread, hasLayoutForPhotoCount, setPendingDraftPhotos,
    setCurrentView
  } = useProjectStore();
  const allLayouts = customLayouts;
  
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dragCounter, setDragCounter] = React.useState<Record<number, number>>({});
  const [spreadToDelete, setSpreadToDelete] = React.useState<number | null>(null);
  const [layoutConfirm, setLayoutConfirm] = React.useState<{ spreadId: string, items: any[], count: number } | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragCounter(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
    setDragOverIndex(idx);
  };

  const handleDragLeave = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const newCount = (dragCounter[idx] || 0) - 1;
    setDragCounter(prev => ({ ...prev, [idx]: Math.max(0, newCount) }));
    if (newCount <= 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const spreadId = spreads[idx].id;
    
    // 1. Check if it's a media drop from Filmstrip
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const items = JSON.parse(jsonData);
        if (Array.isArray(items) && items.length > 0 && items[0].path) {
          const currentPhotos = Object.keys(spreads[idx].images).length;
          const totalPhotos = currentPhotos + items.length;
          
          if (!hasLayoutForPhotoCount(totalPhotos)) {
            setLayoutConfirm({ spreadId, items, count: totalPhotos });
            return;
          }

          addPhotosToSpread(spreadId, items);
          setActiveSpread(idx);
          setDragOverIndex(null);
          return;
        }
      } catch (err) { /* ignore parse errors */ }
    }

    // 2. Internal spread reordering
    if (draggedIndex !== null && draggedIndex !== idx) {
      reorderSpreads(draggedIndex, idx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragCounter({});
  };

  const isBelowMin = spreads.length <= 10; // 20 pages

  return (
    <div className="h-32 bg-surface border-t border-outline-variant/10 flex items-center px-4 gap-6 overflow-x-auto overflow-y-hidden no-scrollbar shrink-0">
      
      <ConfirmDialog 
        isOpen={spreadToDelete !== null}
        title="Excluir Lâmina"
        message={isBelowMin 
          ? "Atenção: A exclusão desta lâmina fará com que seu álbum tenha menos de 20 páginas (mínimo recomendado). Deseja continuar mesmo assim?" 
          : "Tem certeza que deseja excluir esta lâmina e todas as suas fotos?"}
        onConfirm={() => {
          if (spreadToDelete !== null) deleteSpread(spreadToDelete);
          setSpreadToDelete(null);
        }}
        onCancel={() => setSpreadToDelete(null)}
      />

      <ConfirmDialog
        isOpen={layoutConfirm !== null}
        title="Layout Indisponível"
        message={`Não encontramos um layout automático para ${layoutConfirm?.count} fotos. Deseja criar um layout personalizado agora no Studio?`}
        confirmLabel="Ir para o Studio"
        variant="primary"
        onConfirm={() => {
          if (layoutConfirm) {
            setPendingDraftPhotos(layoutConfirm.spreadId, layoutConfirm.items);
            useProjectStore.setState({ layoutDesignerPendingCount: layoutConfirm.count });
            setCurrentView('layout_designer');
          }
          setLayoutConfirm(null);
        }}
        onCancel={() => setLayoutConfirm(null)}
      />

      <div className="flex items-center gap-4 py-2">
        {spreads.map((spread, index) => {
          const layout = allLayouts[spread.layoutId];
          const isActive = index === activeSpreadIndex;
          const photoCount = Object.keys(spread.images).length;
          const isDragging = index === draggedIndex;
          const isDragOver = index === dragOverIndex && index !== draggedIndex;

          return (
            <div
              key={spread.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDragLeave={(e) => handleDragLeave(e, index)}
              onDrop={(e) => handleDrop(index, e)}
              onClick={() => setActiveSpread(index)}
              className={`flex flex-col items-center shrink-0 cursor-pointer transition-all group/card
                ${isActive ? 'scale-105' : 'hover:scale-102 opacity-70 hover:opacity-100'}
                ${isDragging ? 'opacity-20 scale-95' : ''}
                ${isDragOver ? 'translate-x-2' : ''}
              `}
            >
              {/* Spread Thumbnail */}
              <div className={`w-36 aspect-[2/1] rounded-lg border-2 relative overflow-hidden bg-surface-container shadow-sm transition-all 
                ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant/20'}
                ${isDragOver ? 'border-primary border-dashed scale-105' : ''}
              `}>
                
                {/* Mini Layout Preview */}
                {layout ? (
                  <div className="absolute inset-0 p-1">
                    {layout.placeholders.map(ph => (
                      <div
                        key={ph.id}
                        className={`absolute rounded-[0.5px] border border-white/10 ${spread.images[ph.id] ? 'bg-primary/40' : 'bg-outline-variant/20'}`}
                        style={{ left: `${ph.x}%`, top: `${ph.y}%`, width: `${ph.width}%`, height: `${ph.height}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <span className="material-symbols-outlined text-xl">auto_awesome_mosaic</span>
                  </div>
                )}

                {/* Spread Number Overlay */}
                <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {index + 1}
                </div>

                {/* Delete Icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSpreadToDelete(index); }}
                  className="absolute bottom-1 left-1 opacity-0 group-hover/card:opacity-100 p-1 hover:bg-error/10 text-error rounded transition-opacity pointer-events-auto"
                  title="Excluir Lâmina"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>

                {/* Status Dot */}
                {photoCount > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary shadow-sm border border-white/20"></div>
                )}

                {/* Drag Over Hint */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                    <span className="material-symbols-outlined text-4xl text-primary drop-shadow-md">
                      {draggedIndex !== null ? 'swap_horiz' : 'add_photo_alternate'}
                    </span>
                  </div>
                )}
              </div>

              {/* Labels */}
              <div className={`mt-1.5 text-[9px] uppercase font-bold tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                Lâmina {index + 1}
              </div>
              <div className="text-[8px] text-on-surface-variant opacity-60">
                Págs. {index * 2 + 1}-{index * 2 + 2}
              </div>
            </div>
          );
        })}

        {/* Add Spread Button */}
        <button
          onClick={addSpread}
          className="flex flex-col items-center shrink-0 group px-4"
        >
          <div className="w-36 aspect-[2/1] rounded-lg border-2 border-dashed border-outline-variant/30 flex items-center justify-center bg-surface-container-high/30 hover:bg-primary/5 hover:border-primary/50 transition-all group-hover:scale-105">
            <span className="material-symbols-outlined text-3xl font-light text-on-surface-variant group-hover:text-primary transition-colors">add</span>
          </div>
          <div className="mt-1.5 text-[9px] uppercase font-bold tracking-widest text-on-surface-variant group-hover:text-primary transition-colors">
            Adicionar Lâmina
          </div>
        </button>
      </div>
    </div>
  );
};

export default SpreadNavigator;
