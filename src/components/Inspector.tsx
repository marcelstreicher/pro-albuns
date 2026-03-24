import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { layoutsDictionary } from '../utils/layouts';

// Clamp crop offset so image always covers the placeholder
function clampOffset(offset: number, scale: number): number {
  const maxOffset = ((scale - 1) / 2) * 100;
  return Math.max(-maxOffset, Math.min(maxOffset, offset));
}

interface InspectorProps {
  selectedPlaceholder: string | null;
  onCropChange?: (cropX: number, cropY: number, cropScale: number) => void;
}

const Inspector: React.FC<InspectorProps> = ({ selectedPlaceholder, onCropChange }) => {
  const {
    albumConfig, spreads, activeSpreadIndex,
    setSpreadLayout, setAlbumConfig, customLayouts, updatePhotoCrop
  } = useProjectStore();
  const activeSpread = spreads[activeSpreadIndex];

  // Local crop state (syncs from selected placeholder image)
  const [cropState, setCropState] = useState({ cropX: 0, cropY: 0, cropScale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef<{ mx: number, my: number, cropX: number, cropY: number } | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Sync crop state when selection or spread changes
  useEffect(() => {
    if (!selectedPlaceholder || !activeSpread) { setCropState({ cropX: 0, cropY: 0, cropScale: 1 }); return; }
    const img = activeSpread.images[selectedPlaceholder];
    if (!img) { setCropState({ cropX: 0, cropY: 0, cropScale: 1 }); return; }
    setCropState({ cropX: img.cropX ?? 0, cropY: img.cropY ?? 0, cropScale: img.cropScale ?? 1 });
  }, [selectedPlaceholder, activeSpread?.id]);

  const commitCrop = useCallback((cropX: number, cropY: number, cropScale: number) => {
    if (!activeSpread || !selectedPlaceholder) return;
    updatePhotoCrop(activeSpread.id, selectedPlaceholder, cropX, cropY, cropScale);
    onCropChange?.(cropX, cropY, cropScale);
  }, [activeSpread, selectedPlaceholder, updatePhotoCrop, onCropChange]);

  // Thumbnail drag-to-pan
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, cropX: cropState.cropX, cropY: cropState.cropY };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !dragStart.current || !thumbRef.current) return;
      const rect = thumbRef.current.getBoundingClientRect();
      // Thumbnail is smaller so movement is amplified for better control
      const dx = ((e.clientX - dragStart.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.my) / rect.height) * 100;
      const newX = clampOffset(dragStart.current.cropX + dx, cropState.cropScale);
      const newY = clampOffset(dragStart.current.cropY + dy, cropState.cropScale);
      setCropState(prev => ({ ...prev, cropX: newX, cropY: newY }));
    };
    const onUp = () => {
      if (isDragging.current) commitCrop(cropState.cropX, cropState.cropY, cropState.cropScale);
      isDragging.current = false;
      dragStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [cropState, commitCrop]);

  // Layout gallery
  const allLayouts = { ...layoutsDictionary, ...customLayouts };
  const layoutsByCount = useMemo(() => {
    const groups: Record<number, typeof allLayouts[string][]> = {};
    Object.values(allLayouts).forEach(layout => {
      if (!groups[layout.photoCount]) groups[layout.photoCount] = [];
      groups[layout.photoCount].push(layout);
    });
    return groups;
  }, [customLayouts]);

  if (!activeSpread) return null;

  const currentPhotoCount = Object.keys(activeSpread.images).length;
  const suggestedCounts = currentPhotoCount > 0 ? [currentPhotoCount] : [1, 2, 3, 4, 5];

  const selectedImage = selectedPlaceholder ? activeSpread.images[selectedPlaceholder] : null;

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const format = e.target.value;
    if (format === 'square-30') setAlbumConfig({ name: 'Square 30x30 Album', pageWidth: 300, pageHeight: 300 });
    else if (format === 'landscape-30x20') setAlbumConfig({ name: 'Landscape 30x20 Album', pageWidth: 300, pageHeight: 200 });
    else if (format === 'portrait-20x30') setAlbumConfig({ name: 'Portrait 20x30 Album', pageWidth: 200, pageHeight: 300 });
  };

  return (
    <aside className="w-80 bg-surface-container-low border-l border-outline-variant/15 flex flex-col h-full">

      {/* ── Album Config ─────────────────────────── */}
      <div className="p-4 border-b border-outline-variant/10 bg-surface-container-lowest/50 shrink-0">
        <h4 className="font-headline font-bold text-[10px] text-on-surface mb-2 uppercase tracking-wider flex justify-between items-center">
          Configurações do Álbum
          <span className="material-symbols-outlined text-sm text-on-surface-variant">book</span>
        </h4>
        <select
          className="w-full bg-surface-container-high text-xs text-on-surface p-2 rounded border border-outline-variant/20 outline-none focus:border-primary"
          onChange={handleFormatChange}
          value={albumConfig.pageWidth === 300 && albumConfig.pageHeight === 300 ? 'square-30' :
                 albumConfig.pageWidth === 300 && albumConfig.pageHeight === 200 ? 'landscape-30x20' : 'portrait-20x30'}
        >
          <option value="square-30">Quadrado — 30×30 cm</option>
          <option value="landscape-30x20">Paisagem — 30×20 cm</option>
          <option value="portrait-20x30">Retrato — 20×30 cm</option>
        </select>
      </div>

      {/* ── Layout Gallery ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="flex justify-between items-end mb-3">
          <h4 className="font-headline font-bold text-[10px] text-on-surface uppercase tracking-wider">Layout Gallery</h4>
          <span className="text-[9px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{currentPhotoCount} foto(s)</span>
        </div>
        <div className="space-y-6">
          {suggestedCounts.map(count => {
            const layouts = layoutsByCount[count];
            if (!layouts) return null;
            return (
              <div key={count}>
                <h5 className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest mb-2 border-b border-outline-variant/10 pb-1">
                  {count} foto{count > 1 ? 's' : ''}
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {layouts.map(l => (
                    <div
                      key={l.id}
                      onClick={() => setSpreadLayout(activeSpread.id, l.id)}
                      className="group cursor-pointer flex flex-col items-center"
                    >
                      <div className={`w-full aspect-[2/1] rounded-sm border-2 transition-all shadow-sm overflow-hidden relative
                        ${activeSpread.layoutId === l.id
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'bg-surface-container-high border-outline-variant/20 hover:border-primary/50'}`}
                      >
                        {l.placeholders.map((ph: { id: string; x: number; y: number; width: number; height: number }) => (
                          <div
                            key={ph.id}
                            className={`absolute rounded-[1px] transition-colors ${activeSpread.layoutId === l.id ? 'bg-primary/30' : 'bg-outline-variant/30'}`}
                            style={{ left: `${ph.x}%`, top: `${ph.y}%`, width: `${ph.width}%`, height: `${ph.height}%` }}
                          />
                        ))}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-outline-variant/20"></div>
                      </div>
                      <p className={`mt-1 text-[9px] uppercase tracking-tighter text-center transition-colors truncate w-full
                        ${activeSpread.layoutId === l.id ? 'text-primary font-bold' : 'text-on-surface-variant group-hover:text-primary'}`}>
                        {l.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Element Properties ─────────────────────── */}
      <div className="border-t border-outline-variant/15 bg-surface-container-lowest/40 shrink-0">
        {selectedImage ? (
          <div className="p-4">
            <h4 className="font-headline font-bold text-[10px] text-on-surface uppercase tracking-wider mb-3 flex items-center justify-between">
              Propriedades do Elemento
              <span className="material-symbols-outlined text-sm text-on-surface-variant">tune</span>
            </h4>

            {/* Photo thumbnail + drag-to-pan */}
            <div className="mb-4">
              <label className="text-[9px] uppercase tracking-widest text-on-surface-variant block mb-1.5">
                Posição — Arraste para enquadrar
              </label>
              <div
                ref={thumbRef}
                onMouseDown={handleThumbMouseDown}
                className="w-full aspect-[16/9] rounded overflow-hidden bg-surface-container cursor-grab active:cursor-grabbing relative border border-outline-variant/20"
                style={{ userSelect: 'none' }}
              >
                <img
                  src={selectedImage.path}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    transformOrigin: 'center',
                    transform: `translate(${cropState.cropX}%, ${cropState.cropY}%) scale(${cropState.cropScale})`,
                    transition: isDragging.current ? 'none' : 'transform 0.1s',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white/60 rounded-sm w-[60%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"></div>
                </div>
              </div>
            </div>

            {/* Scale slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] uppercase tracking-widest text-on-surface-variant">Escala</label>
                <span className="text-xs font-bold text-on-surface font-mono">{(cropState.cropScale * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropState.cropScale}
                className="w-full accent-primary"
                onChange={(e) => {
                  const newScale = parseFloat(e.target.value);
                  const newX = clampOffset(cropState.cropX, newScale);
                  const newY = clampOffset(cropState.cropY, newScale);
                  setCropState({ cropScale: newScale, cropX: newX, cropY: newY });
                }}
                onMouseUp={() => commitCrop(cropState.cropX, cropState.cropY, cropState.cropScale)}
              />
              <div className="flex justify-between text-[8px] text-on-surface-variant mt-0.5">
                <span>100%</span><span>300%</span>
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                const reset = { cropX: 0, cropY: 0, cropScale: 1 };
                setCropState(reset);
                commitCrop(0, 0, 1);
              }}
              className="mt-3 w-full py-1.5 bg-surface-container border border-outline-variant/20 rounded text-[10px] text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Resetar Enquadramento
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col items-center justify-center text-on-surface-variant/40 py-8 gap-2">
            <span className="material-symbols-outlined text-3xl">touch_app</span>
            <p className="text-[10px] uppercase tracking-widest text-center">Clique em um elemento<br/>para ver as propriedades</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Inspector;
