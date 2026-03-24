import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { layoutsDictionary } from '../utils/layouts';

// Clamp crop offset so image always covers the placeholder
// Scale 1 = object-cover. If aspect ratios don't match, there's always an overflow.
// Allowing some base overflow movement even at scale 1.
function clampOffset(offset: number, scale: number, extraRange: number = 0): number {
  const maxOffset = (((scale - 1) / 2) * 100) + extraRange;
  return Math.max(-maxOffset, Math.min(maxOffset, offset));
}

interface InspectorProps {
  selectedPlaceholder: string | null;
  onCropChange?: (cropX: number, cropY: number, cropScale: number) => void;
}

const Inspector: React.FC<InspectorProps> = ({ selectedPlaceholder, onCropChange }) => {
  const {
    albumConfig, spreads, activeSpreadIndex,
    setSpreadLayout, setAlbumConfig, customLayouts, updatePhotoCrop,
    binderies, albumTemplates
  } = useProjectStore();
  const activeSpread = spreads[activeSpreadIndex];

  // Calculate Aspect Ratio of the selected Placeholder
  const phAspect = useMemo(() => {
    if (!selectedPlaceholder || !activeSpread) return 1.5; // fallback
    const allLayouts = { ...layoutsDictionary, ...customLayouts };
    const layout = allLayouts[activeSpread.layoutId];
    const ph = layout?.placeholders.find(p => p.id === selectedPlaceholder);
    if (!ph) return 1.5;
    
    // Width in mm
    // Height in mm
    const w = (albumConfig.spreadWidth || 600) * (ph.width / 100);
    const h = (albumConfig.spreadHeight || 300) * (ph.height / 100);
    if (!w || !h) return 1.5;
    return w / h;
  }, [selectedPlaceholder, activeSpread, albumConfig, customLayouts]);

  // Image Aspect Ratio discovery (real-time from img load)
  const [detectedImgAspect, setDetectedImgAspect] = useState<number | null>(null);

  const imgAspect = useMemo(() => {
    if (detectedImgAspect) return detectedImgAspect;
    const img = selectedPlaceholder ? activeSpread?.images[selectedPlaceholder] : null;
    if (!img) return 1.5;
    if (img.aspect === 'V') return 0.66;
    return 1.5;
  }, [selectedPlaceholder, activeSpread, detectedImgAspect]);

  // Extra range allowed even at scale 1 (pan overflow)
  const extraRange = useMemo(() => {
    if (imgAspect > phAspect) {
      // Image is wider than box -> allow horizontal pan
      return { x: ((imgAspect / phAspect - 1) / 2) * 100, y: 0 };
    } else {
      // Image is taller than box -> allow vertical pan
      return { x: 0, y: ((phAspect / imgAspect - 1) / 2) * 100 };
    }
  }, [imgAspect, phAspect]);

  const selectedImage = selectedPlaceholder ? activeSpread.images[selectedPlaceholder] : null;

  // Handle image load to get actual dimensions
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) setDetectedImgAspect(naturalWidth / naturalHeight);
  };
  
  // Reset detected aspect when image changes
  useEffect(() => { setDetectedImgAspect(null); }, [selectedImage?.path]);

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
      const dx = ((e.clientX - dragStart.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.my) / rect.height) * 100;
      const newX = clampOffset(dragStart.current.cropX + dx, cropState.cropScale, extraRange.x);
      const newY = clampOffset(dragStart.current.cropY + dy, cropState.cropScale, extraRange.y);
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

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    const template = albumTemplates.find(t => t.id === templateId);
    if (template) {
      setAlbumConfig({ 
        name: template.name, 
        spreadWidth: template.spreadWidth, 
        spreadHeight: template.spreadHeight,
        bleed: template.bleed,
        templateId: template.id,
        binderyId: template.binderyId
      });
    }
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
          value={albumConfig.templateId || ''}
        >
          {!albumConfig.templateId && <option value="">Customizado — {albumConfig.spreadWidth}×{albumConfig.spreadHeight}mm</option>}
          {binderies.map(b => (
            <optgroup key={b.id} label={b.name}>
              {albumTemplates.filter(t => t.binderyId === b.id).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.spreadWidth}×{t.spreadHeight}mm)
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* ── Frame Style ─────────────────────────── */}
        <div className="mt-4 pt-4 border-t border-outline-variant/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-widest">Molduras</span>
            <button
              onClick={() => setAlbumConfig({ useBorder: !albumConfig.useBorder })}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${albumConfig.useBorder ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${albumConfig.useBorder ? 'translate-x-4' : 'translate-x-1.5'}`} />
            </button>
          </div>

          {albumConfig.useBorder && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Width */}
              <div>
                <div className="flex justify-between text-[8px] uppercase text-on-surface-variant mb-1">
                  <span>Espessura</span>
                  <span className="font-mono text-on-surface">{albumConfig.borderWidth}mm</span>
                </div>
                <input
                  type="range" min="0.5" max="5" step="0.1"
                  value={albumConfig.borderWidth || 1}
                  className="w-full accent-primary h-1"
                  onChange={e => setAlbumConfig({ borderWidth: parseFloat(e.target.value) })}
                />
              </div>
              
              {/* Color */}
              <div className="flex items-center justify-between">
                <span className="text-[8px] uppercase text-on-surface-variant">Cor</span>
                <div className="flex gap-1.5">
                  {['#ffffff', '#000000', '#f4f4f4', '#333333'].map(color => (
                    <button
                      key={color}
                      onClick={() => setAlbumConfig({ borderColor: color })}
                      className={`w-4 h-4 rounded-full border border-outline-variant/30 transition-transform hover:scale-110 ${albumConfig.borderColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={albumConfig.borderColor || '#ffffff'}
                    onChange={e => setAlbumConfig({ borderColor: e.target.value })}
                    className="w-4 h-4 rounded-full bg-transparent overflow-hidden cursor-pointer border border-outline-variant/30 block"
                    style={{ padding: 0 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
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
                  className="w-full aspect-[16/9] rounded overflow-hidden bg-surface-container-high relative border border-outline-variant/20 flex items-center justify-center p-2"
                  style={{ userSelect: 'none' }}
                >
                  {/* The Viewport: This matches the placeholder aspect ratio exactly */}
                  <div 
                    ref={thumbRef}
                    onMouseDown={handleThumbMouseDown}
                    className="relative shadow-2xl overflow-hidden bg-black/20 cursor-grab active:cursor-grabbing border border-white/20"
                    style={{
                      width: phAspect > (16/9) ? '100.1%' : `${100 * (phAspect / (16/9))}%`,
                      height: phAspect > (16/9) ? `${100 * ((16/9) / phAspect)}%` : '100.1%',
                      aspectRatio: phAspect,
                    }}
                  >
                    <img
                      src={selectedImage.path}
                      onLoad={onImageLoad}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                      style={{
                        transformOrigin: 'center',
                        transform: `translate(${cropState.cropX}%, ${cropState.cropY}%) scale(${cropState.cropScale})`,
                        transition: isDragging.current ? 'none' : 'transform 0.1s',
                      }}
                    />
                    
                    {/* Grid overlay for alignment assistance */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 border-white/20 grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b"></div><div className="border-r border-b"></div><div className="border-b"></div>
                      <div className="border-r border-b"></div><div className="border-r border-b"></div><div className="border-b"></div>
                      <div className="border-r"></div><div className="border-r"></div><div></div>
                    </div>
                  </div>

                  {/* Visual hint that it is a mini-preview of the canvas */}
                  <div className="absolute top-1 right-1 px-1.5 bg-black/40 rounded text-[7px] text-white/60 uppercase tracking-tighter">
                    Preview
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
                  const newX = clampOffset(cropState.cropX, newScale, extraRange.x);
                  const newY = clampOffset(cropState.cropY, newScale, extraRange.y);
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
