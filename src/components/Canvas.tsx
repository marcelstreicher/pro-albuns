import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useProjectStore, type MediaItem } from '../store/useProjectStore';
import ConfirmDialog from './ConfirmDialog';
import EditorSettingsModal from './EditorSettingsModal';

interface CanvasProps {
  selectedPlaceholder: string | null;
  onSelectPlaceholder: (id: string | null) => void;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
}

const Canvas: React.FC<CanvasProps> = ({ selectedPlaceholder, onSelectPlaceholder, canvasZoom, setCanvasZoom }) => {
  const {
    albumConfig, spreads, activeSpreadIndex,
    addPhotoToPlaceholder, removePhotoFromPlaceholder,
    customLayouts, addPhotosToSpread, showToast,
    swapPhotos, setActiveSpread, hasLayoutForPhotoCount,
    setPendingDraftPhotos, setCurrentView, getCompatibleLayouts,
    isResizeMode, toggleResizeMode, toggleSpreadLock, updateSpreadPlaceholders,
    isGridMode, toggleGridMode, undoEditor, redoEditor
  } = useProjectStore();
  const activeSpread = spreads[activeSpreadIndex];

  const [dragOverPlaceholder, setDragOverPlaceholder] = useState<string | null>(null);
  const [layoutConfirm, setLayoutConfirm] = useState<{ items: MediaItem[], count: number } | null>(null);
  // cropMode = double-clicked placeholder where user can drag-pan directly on canvas
  const [cropModePlaceholder, setCropModePlaceholder] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Image Aspect Ratio discovery (real-time from img load)
  const [detectedImgAspects, setDetectedImgAspects] = useState<Record<string, number>>({});

  const onImageLoad = (placeholderId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      setDetectedImgAspects(prev => ({ ...prev, [placeholderId]: ratio }));
      if (activeSpread) useProjectStore.getState().updatePhotoAspect(activeSpread.id, placeholderId, ratio, true);
    }
  };

  // Canvas-level drag-to-pan state (only when in cropMode)
  const isDraggingCrop = useRef(false);
  const cropDragStart = useRef<{ mx: number, my: number, cropX: number, cropY: number } | null>(null);
  const [liveCanvasCrop, setLiveCanvasCrop] = useState<{ cropX: number, cropY: number, cropScale: number } | null>(null);
  const phRef = useRef<HTMLDivElement | null>(null);
  const spreadRef = useRef<HTMLDivElement | null>(null);

  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mx: number, my: number, x: number, y: number, w: number, h: number } | null>(null);

  // Grid/Snap State
  const [snapLines, setSnapLines] = useState<{ v?: number, h?: number, vEdges?: number[], hEdges?: number[] }>({});

  const allLayouts = activeSpread ? customLayouts : {};
  const layout = activeSpread ? allLayouts[activeSpread.layoutId] : undefined;

  // Calculate Aspect Ratio of the active placeholder
  const phAspect = useMemo(() => {
    const phId = cropModePlaceholder || selectedPlaceholder;
    if (!phId || !activeSpread) return 1.5;
    
    // Get placeholders from custom placeholders if available, otherwise from layout
    const currentPlaceholders = activeSpread.customPlaceholders || layout?.placeholders || [];
    const ph = currentPlaceholders.find(p => p.id === phId);
    
    if (!ph) return 1.5;
    const w = (albumConfig.spreadWidth || 600) * (ph.width / 100);
    const h = (albumConfig.spreadHeight || 300) * (ph.height / 100);
    if (!w || !h) return 1.5;
    return w / h;
  }, [cropModePlaceholder, selectedPlaceholder, activeSpread, layout, albumConfig]);

  const imgAspect = useMemo(() => {
    const phId = cropModePlaceholder || selectedPlaceholder;
    if (phId && detectedImgAspects[phId]) return detectedImgAspects[phId];
    
    const img = phId ? activeSpread?.images[phId] : null;
    if (!img) return 1.5;
    if (img.aspect === 'V') return 0.66;
    return 1.5;
  }, [cropModePlaceholder, selectedPlaceholder, activeSpread, detectedImgAspects]);


  const photoCount = activeSpread ? Object.keys(activeSpread.images).length : 0;
  const matchingLayouts = getCompatibleLayouts(photoCount);
  const currentLayoutIndex = matchingLayouts.findIndex(l => l.id === activeSpread?.layoutId);

  function clampOffset(offset: number, scale: number, M: number) {
    const max = ((M * scale - 1) / 2) * 100;
    return Math.max(-max, Math.min(max, offset));
  }

  // Safety: Reset index if out of bounds (e.g. after template change or migration)
  useEffect(() => {
    if (spreads.length > 0 && activeSpreadIndex >= spreads.length) {
      setActiveSpread(spreads.length - 1);
    }
  }, [spreads.length, activeSpreadIndex, setActiveSpread]);

  // Sync liveCanvasCrop when cropMode changes
  useEffect(() => {
    if (!cropModePlaceholder || !activeSpread) { setLiveCanvasCrop(null); return; }
    const img = activeSpread.images[cropModePlaceholder];
    if (!img) { setLiveCanvasCrop(null); return; }
    setLiveCanvasCrop({ cropX: img.cropX ?? 0, cropY: img.cropY ?? 0, cropScale: img.cropScale ?? 1 });
  }, [cropModePlaceholder, activeSpread?.id]);

  // Canvas crop drag handlers
  const handleCropDragStart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!liveCanvasCrop) return;

    // CAPTURE HISTORY AT START OF CROP PAN
    useProjectStore.getState().saveEditorHistory();

    isDraggingCrop.current = true;
    cropDragStart.current = { mx: e.clientX, my: e.clientY, cropX: liveCanvasCrop.cropX, cropY: liveCanvasCrop.cropY };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingCrop.current || !cropDragStart.current || !liveCanvasCrop || !phRef.current) return;
      const rect = phRef.current.getBoundingClientRect();
      const dx = ((e.clientX - cropDragStart.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - cropDragStart.current.my) / rect.height) * 100;
      const Mx = Math.max(1, imgAspect / phAspect);
      const My = Math.max(1, phAspect / imgAspect);
      const newX = clampOffset(cropDragStart.current.cropX + dx, liveCanvasCrop.cropScale, Mx);
      const newY = clampOffset(cropDragStart.current.cropY + dy, liveCanvasCrop.cropScale, My);
      setLiveCanvasCrop(prev => prev ? { ...prev, cropX: newX, cropY: newY } : null);
    };
    const onUp = () => {
      if (isDraggingCrop.current && liveCanvasCrop && cropModePlaceholder && activeSpread) {
        // Skip history save because we already saved it onMouseDown
        useProjectStore.getState().updatePhotoCrop(activeSpread.id, cropModePlaceholder, liveCanvasCrop.cropX, liveCanvasCrop.cropY, liveCanvasCrop.cropScale, true);
      }
      isDraggingCrop.current = false;
      cropDragStart.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [liveCanvasCrop, cropModePlaceholder, activeSpread]);

  const cycleLayout = useCallback((direction: 1 | -1) => {
    if (!activeSpread || matchingLayouts.length < 2) return;
    const nextIndex = (currentLayoutIndex + direction + matchingLayouts.length) % matchingLayouts.length;
    const nextLayout = matchingLayouts[nextIndex];
    const currentImages = Object.values(activeSpread.images);
    const newImagesMap: Record<string, MediaItem> = {};
    currentImages.forEach((img, i) => {
      if (nextLayout.placeholders[i]) newImagesMap[nextLayout.placeholders[i].id] = img;
    });
    useProjectStore.setState(state => ({
      spreads: state.spreads.map(s =>
        s.id === activeSpread.id ? { ...s, layoutId: nextLayout.id, images: newImagesMap, customPlaceholders: undefined } : s
      )
    }));
    showToast(`Layout: ${nextLayout.name} (${nextIndex + 1}/${matchingLayouts.length})`, 'info');
  }, [activeSpread, matchingLayouts, currentLayoutIndex, showToast]);

  // Resize Handlers
  const startResize = (e: React.MouseEvent, type: string, ph: any) => {
    e.preventDefault(); e.stopPropagation();
    if (activeSpread.isLocked) return;
    
    // CAPTURE HISTORY AT START OF INTERACTION
    useProjectStore.getState().saveEditorHistory();
    
    setIsResizing(true);
    setResizeType(type);
    setResizeStart({ mx: e.clientX, my: e.clientY, x: ph.x, y: ph.y, w: ph.width, h: ph.height });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing || !resizeStart || !activeSpread || activeSpread.isLocked) return;
      const rect = spreadRef.current?.getBoundingClientRect();
      if (!rect) return;

      const SNAP_TOLERANCE = 1.5;
      const dx = ((e.clientX - resizeStart.mx) / rect.width) * 100;
      const dy = ((e.clientY - resizeStart.my) / rect.height) * 100;

      let newX = resizeStart.x;
      let newY = resizeStart.y;
      let newW = resizeStart.w;
      let newH = resizeStart.h;

      if (resizeType?.includes('e')) newW = Math.max(5, Math.min(resizeStart.w + dx, 100 - resizeStart.x));
      if (resizeType?.includes('s')) newH = Math.max(5, Math.min(resizeStart.h + dy, 100 - resizeStart.y));
      if (resizeType?.includes('w')) {
        const proposedW = resizeStart.w - dx;
        if (proposedW >= 5 && resizeStart.x + dx >= 0) {
          newW = proposedW;
          newX = resizeStart.x + dx;
        }
      }
      if (resizeType?.includes('n')) {
        const proposedH = resizeStart.h - dy;
        if (proposedH >= 5 && resizeStart.y + dy >= 0) {
          newH = proposedH;
          newY = resizeStart.y + dy;
        }
      }

      if (resizeType === 'drag') {
        newX = Math.min(Math.max(0, resizeStart.x + dx), 100 - resizeStart.w);
        newY = Math.min(Math.max(0, resizeStart.y + dy), 100 - resizeStart.h);
      }

      // Snapping Logic (only if grid mode is on)
      const vEdges: number[] = [];
      const hEdges: number[] = [];
      if (isGridMode) {
        const targetsX = [0, 25, 50, 75, 100];
        const targetsY = [0, 50, 100];
        const currentPhs = activeSpread.customPlaceholders || layout?.placeholders || [];
        
        currentPhs.forEach(p => {
          if (p.id === selectedPlaceholder) return;
          targetsX.push(p.x, p.x + p.width, p.x + p.width/2);
          targetsY.push(p.y, p.y + p.height, p.y + p.height/2);
        });

        for (const t of targetsX) {
          if (resizeType === 'drag') {
            // Snap left edge
            if (Math.abs(newX - t) < SNAP_TOLERANCE) { newX = t; vEdges.push(t); break; }
            // Snap right edge
            if (Math.abs((newX + newW) - t) < SNAP_TOLERANCE) { newX = t - newW; vEdges.push(t); break; }
            // Snap center
            if (Math.abs((newX + newW/2) - t) < SNAP_TOLERANCE) { newX = t - newW/2; vEdges.push(t); break; }
          } else {
            if (resizeType?.includes('w')) {
              if (Math.abs(newX - t) < SNAP_TOLERANCE) { newW += (newX - t); newX = t; vEdges.push(t); break; }
            }
            if (resizeType?.includes('e')) {
              if (Math.abs((newX + newW) - t) < SNAP_TOLERANCE) { newW = t - newX; vEdges.push(t); break; }
            }
          }
        }
        for (const t of targetsY) {
          if (resizeType === 'drag') {
            // Snap top edge
            if (Math.abs(newY - t) < SNAP_TOLERANCE) { newY = t; hEdges.push(t); break; }
            // Snap bottom edge
            if (Math.abs((newY + newH) - t) < SNAP_TOLERANCE) { newY = t - newH; hEdges.push(t); break; }
            // Snap middle
            if (Math.abs((newY + newH/2) - t) < SNAP_TOLERANCE) { newY = t - newH/2; hEdges.push(t); break; }
          } else {
            if (resizeType?.includes('n')) {
              if (Math.abs(newY - t) < SNAP_TOLERANCE) { newH += (newY - t); newY = t; hEdges.push(t); break; }
            }
            if (resizeType?.includes('s')) {
              if (Math.abs((newY + newH) - t) < SNAP_TOLERANCE) { newH = t - newY; hEdges.push(t); break; }
            }
          }
        }
      }

      setSnapLines({ vEdges, hEdges });
      const currentPhs = activeSpread.customPlaceholders || layout?.placeholders || [];
      const updatedPhs = currentPhs.map(p => 
        p.id === selectedPlaceholder ? { ...p, x: newX, y: newY, width: newW, height: newH } : p
      );
      updateSpreadPlaceholders(activeSpread.id, updatedPhs, true); // true = skipHistory
    };

    const onUp = () => {
      setIsResizing(false);
      setResizeStart(null);
      setResizeType(null);
      setSnapLines({});
    };

    if (isResizing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, resizeStart, resizeType, activeSpread, selectedPlaceholder, layout, updateSpreadPlaceholders, isGridMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
      if (isInput) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setActiveSpread(Math.max(0, activeSpreadIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setActiveSpread(Math.min(spreads.length - 1, activeSpreadIndex + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          cycleLayout(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          cycleLayout(1);
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              redoEditor();
            } else {
              undoEditor();
            }
          }
          break;
        case 'y':
        case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redoEditor();
          }
          break;
        case 'Escape':
          setCropModePlaceholder(null);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedPlaceholder && activeSpread && !cropModePlaceholder) {
            removePhotoFromPlaceholder(activeSpread.id, selectedPlaceholder);
            onSelectPlaceholder(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSpreadIndex, spreads.length, setActiveSpread, cycleLayout,
    selectedPlaceholder, activeSpread, removePhotoFromPlaceholder, 
    cropModePlaceholder, onSelectPlaceholder
  ]);

  if (!activeSpread) return <div className="flex-1 canvas-grid flex items-center justify-center">No active spread</div>;

  const spreadRatio = (albumConfig.spreadWidth / (albumConfig.spreadHeight || 1)) || 2;

  const handleDragOver = (e: React.DragEvent, placeholderId: string) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverPlaceholder(placeholderId);
  };
  const handleDrop = (e: React.DragEvent, placeholderId: string) => {
    e.preventDefault(); e.stopPropagation();
    setDragOverPlaceholder(null);
    
    // 1. Internal swap
    const sourcePhId = e.dataTransfer.getData('sourcePlaceholderId');
    const sourceSpreadId = e.dataTransfer.getData('sourceSpreadId');
    if (sourcePhId && sourceSpreadId === activeSpread?.id && sourcePhId !== placeholderId) {
      if (activeSpread.isLocked) {
        showToast('Página bloqueada para alterações', 'warning');
        return;
      }
      swapPhotos(activeSpread.id, sourcePhId, placeholderId);
      onSelectPlaceholder(placeholderId);
      return;
    }

    // 2. Filmstrip drop
    const data = e.dataTransfer.getData('application/json');
    if (data && activeSpread) {
      if (activeSpread.isLocked) {
        showToast('Página bloqueada para alterações', 'warning');
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const item = Array.isArray(parsed) ? parsed[0] : parsed;
        addPhotoToPlaceholder(activeSpread.id, placeholderId, item);
      } catch (err) { console.error('Drop failed', err); }
    }
  };
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data && activeSpread) {
      if (activeSpread.isLocked) {
        showToast('Página bloqueada para alterações', 'warning');
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const items = (Array.isArray(parsed) ? parsed : [parsed]) as MediaItem[];
        
        const currentPhotos = Object.keys(activeSpread.images).length;
        const totalPhotos = currentPhotos + items.length;

        if (!hasLayoutForPhotoCount(totalPhotos)) {
          setLayoutConfirm({ items, count: totalPhotos });
          return;
        }

        addPhotosToSpread(activeSpread.id, items);
      } catch (err) { console.error('Canvas Drop failed', err); }
    }
  };

  return (
    <div
      className="flex-1 canvas-grid flex items-center justify-center pb-16 relative overflow-hidden"
      onClick={() => { onSelectPlaceholder(null); setCropModePlaceholder(null); }}
    >
      <ConfirmDialog
        isOpen={layoutConfirm !== null}
        title="Layout Indisponível"
        message={`Não encontramos um layout automático para ${layoutConfirm?.count} fotos. Deseja criar um layout personalizado agora no Studio?`}
        confirmLabel="Ir para o Studio"
        variant="primary"
        onConfirm={() => {
          if (layoutConfirm && activeSpread) {
            setPendingDraftPhotos(activeSpread.id, layoutConfirm.items);
            useProjectStore.setState({ layoutDesignerPendingCount: layoutConfirm.count });
            setCurrentView('layout_designer');
          }
          setLayoutConfirm(null);
        }}
        onCancel={() => setLayoutConfirm(null)}
      />

      <EditorSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 bg-surface-container-high/80 backdrop-blur-xl rounded-full border border-outline-variant/20 shadow-2xl">
        <button 
           className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${!isResizeMode ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:bg-surface-variant'}`} 
           title="Selecionar"
           onClick={() => isResizeMode && toggleResizeMode()}
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>
        <button 
           className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isResizeMode ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:bg-surface-variant'}`} 
           title="Redimensionar"
           onClick={() => toggleResizeMode()}
        >
          <span className="material-symbols-outlined">open_with</span>
        </button>
        <button 
           className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isGridMode ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:bg-surface-variant'}`} 
           title="Grade e Guias"
           onClick={() => toggleGridMode()}
        >
          <span className="material-symbols-outlined">grid_4x4</span>
        </button>

        <div className="w-px h-6 bg-outline-variant/40 mx-1"></div>

        <button 
           className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${activeSpread.isLocked ? 'bg-error/20 text-error' : 'text-on-surface-variant hover:bg-surface-variant'}`} 
           title={activeSpread.isLocked ? "Desbloquear Lâmina" : "Bloquear Lâmina"}
           onClick={(e) => { e.stopPropagation(); toggleSpreadLock(activeSpread.id); }}
        >
          <span className="material-symbols-outlined">{activeSpread.isLocked ? 'lock' : 'lock_open'}</span>
        </button>

        {!activeSpread.isLocked && matchingLayouts.length > 0 && (
          <>
            <div className="w-px h-6 bg-outline-variant/40 mx-1"></div>
            <button
              onClick={e => { e.stopPropagation(); cycleLayout(-1); }}
              disabled={matchingLayouts.length < 2}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-30"
              title="Layout anterior (←)"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex flex-col items-center px-2 min-w-[80px]">
              <span className="text-[9px] uppercase tracking-widest text-on-surface-variant leading-none mb-0.5">Layout</span>
              <span className="text-xs font-bold text-on-surface truncate max-w-[90px]">{layout?.name ?? '—'}</span>
              {matchingLayouts.length > 1 && (
                <span className="text-[9px] text-on-surface-variant">{currentLayoutIndex + 1}/{matchingLayouts.length}</span>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); cycleLayout(1); }}
              disabled={matchingLayouts.length < 2}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-30"
              title="Próximo layout (→)"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </>
        )}
      </div>

      {/* Crop Mode Banner */}
      {cropModePlaceholder && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-primary/90 text-on-primary rounded-full text-xs font-bold shadow-lg backdrop-blur-xl animate-pulse pointer-events-none">
          <span className="material-symbols-outlined text-base">open_with</span>
          Modo Enquadramento — Arraste a foto · ESC para sair
        </div>
      )}

      {/* Spread */}
      <div
        ref={spreadRef}
        style={{
          aspectRatio: spreadRatio,
          transform: `scale(${canvasZoom})`,
          transformOrigin: 'center center',
        }}
        className="bg-[#fdfdfd] shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-full max-w-5xl max-h-[80vh] relative transition-transform duration-200 flex items-center justify-center"
        onDragOver={e => e.preventDefault()}
        onDrop={handleCanvasDrop}
      >
        {/* Bleed Lines */}
        {isGridMode && (
          <div 
            className="absolute inset-0 pointer-events-none z-[15] border-[1px] border-dashed border-error/40 m-[-1px]"
            style={{
              margin: `${(albumConfig.bleed / albumConfig.spreadHeight) * 100}% ${(albumConfig.bleed / albumConfig.spreadWidth) * 100}%`
            }}
          >
            <div className="absolute top-0 left-0 bg-error/10 text-[8px] text-error px-1 font-bold uppercase tracking-tighter">Sangria</div>
          </div>
        )}

        {/* Snap Lines */}
        {isGridMode && isResizing && (
          <div className="absolute inset-0 pointer-events-none z-[60]">
            {snapLines.vEdges?.map((v, i) => (
              <div key={`v-${i}`} style={{ left: `${v}%` }} className="absolute top-0 bottom-0 w-[1.5px] bg-primary/70 shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]"></div>
            ))}
            {snapLines.hEdges?.map((h, i) => (
              <div key={`h-${i}`} style={{ top: `${h}%` }} className="absolute left-0 right-0 h-[1.5px] bg-primary/70 shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]"></div>
            ))}
          </div>
        )}

        {!layout && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-outline-variant/50 pointer-events-none z-0 border-2 border-dashed border-outline-variant/20 m-8 rounded-xl">
            <span className="material-symbols-outlined text-6xl mb-4">add_photo_alternate</span>
            <p className="font-headline tracking-widest uppercase text-sm font-bold">Arraste fotos para esta lâmina</p>
            <p className="text-xs mt-2">O layout será ajustado automaticamente</p>
          </div>
        )}

        <div className="absolute inset-0 z-10">
          {(activeSpread.customPlaceholders || layout?.placeholders || []).map((ph) => {
            const image = activeSpread.images[ph.id];
            const isSelected = selectedPlaceholder === ph.id;
            const isCropMode = cropModePlaceholder === ph.id;
            const isHovered = dragOverPlaceholder === ph.id;

            const crop = isCropMode && liveCanvasCrop
              ? liveCanvasCrop
              : { cropX: image?.cropX ?? 0, cropY: image?.cropY ?? 0, cropScale: image?.cropScale ?? 1 };

            const currentImgAspect = detectedImgAspects[ph.id] || 1.5;
            const currentPhAspect = (ph.width / ph.height) * spreadRatio;
            const Mx = Math.max(1, currentImgAspect / currentPhAspect);
            const My = Math.max(1, currentPhAspect / currentImgAspect);

            const tx = -50 + (crop.cropX / Mx);
            const ty = -50 + (crop.cropY / My);

            return (
              <div
                key={ph.id}
                ref={isCropMode ? phRef : null}
                onDragOver={e => handleDragOver(e, ph.id)}
                onDrop={e => handleDrop(e, ph.id)}
                onDragLeave={() => setDragOverPlaceholder(null)}
                onClick={e => { e.stopPropagation(); if (!isCropMode) onSelectPlaceholder(ph.id); }}
                onMouseDown={e => {
                  if (isResizeMode && !activeSpread.isLocked && !isCropMode) {
                    startResize(e, 'drag', ph);
                  }
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  if (image) { setCropModePlaceholder(ph.id); onSelectPlaceholder(ph.id); }
                }}
                style={{ 
                  left: `${ph.x}%`, 
                  top: `${ph.y}%`, 
                  width: `calc(${ph.width}% + 1px)`, 
                  height: `calc(${ph.height}% + 1px)`,
                  ...(albumConfig.useBorder ? {
                    border: `${(albumConfig.borderWidth || 1) * 2}px solid ${albumConfig.borderColor || '#ffffff'}`
                  } : { border: 'none' }),
                  backgroundColor: isSelected ? 'var(--color-primary-container-low, #e0e0e0)' : '#f8f9fa',
                  boxShadow: isSelected ? '0 0 0 2px var(--color-primary)' : 'none',
                  overflow: 'hidden'
                }}
                className={`absolute transition-all duration-150
                  ${isCropMode ? 'ring-4 ring-secondary/30 z-30 cursor-none' :
                    isHovered ? 'ring-4 ring-primary z-20 scale-[1.02] shadow-2xl' :
                    isSelected ? 'ring-2 ring-primary/20 z-20' :
                    'cursor-pointer hover:border-outline-variant/50'}`}
              >
                {image ? (
                  <>
                    <img
                      className="absolute pointer-events-none select-none"
                      draggable={false}
                      src={image.path}
                      onLoad={e => onImageLoad(ph.id, e)}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: `${Mx * 101}%`,
                        height: `${My * 101}%`,
                        objectFit: 'cover',
                        transformOrigin: 'center',
                        transform: `translate(${tx}%, ${ty}%) scale(${crop.cropScale})`,
                        transition: isDraggingCrop.current || isResizing ? 'none' : 'transform 0.1s ease',
                      }}
                    />
                    {/* Resize Handles */}
                    {isSelected && isResizeMode && !activeSpread.isLocked && (
                      <div className="absolute inset-0 z-40 pointer-events-none">
                         {/* Corners */}
                         <div onMouseDown={(e) => startResize(e, 'nw', ph)} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-sm pointer-events-auto" />
                         <div onMouseDown={(e) => startResize(e, 'ne', ph)} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nesw-resize shadow-sm pointer-events-auto" />
                         <div onMouseDown={(e) => startResize(e, 'sw', ph)} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nesw-resize shadow-sm pointer-events-auto" />
                         <div onMouseDown={(e) => startResize(e, 'se', ph)} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-sm pointer-events-auto" />
                         
                         {/* Edges */}
                         <div onMouseDown={(e) => startResize(e, 'n', ph)} className="absolute -top-1 left-2 right-2 h-2 cursor-ns-resize hover:bg-primary/30 pointer-events-auto" />
                         <div onMouseDown={(e) => startResize(e, 's', ph)} className="absolute -bottom-1 left-2 right-2 h-2 cursor-ns-resize hover:bg-primary/30 pointer-events-auto" />
                         <div onMouseDown={(e) => startResize(e, 'w', ph)} className="absolute top-2 bottom-2 -left-1 w-2 cursor-ew-resize hover:bg-primary/30 pointer-events-auto" />
                         <div onMouseDown={(e) => startResize(e, 'e', ph)} className="absolute top-2 bottom-2 -right-1 w-2 cursor-ew-resize hover:bg-primary/30 pointer-events-auto" />
                      </div>
                    )}
                    {/* Crop mode grab overlay */}
                    {isCropMode && (
                      <div
                        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
                        onMouseDown={handleCropDragStart}
                        style={{ background: 'rgba(var(--color-secondary-rgb, 0 128 255) / 0.1)' }}
                      />
                    )}
                    {/* Double-click hint when selected but not yet in crop mode */}
                    {isSelected && !isCropMode && (
                      <div className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded-full backdrop-blur-sm pointer-events-none opacity-80">
                        2× enquadrar
                      </div>
                    )}
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

        {/* Spine */}
        <div className={`absolute left-1/2 top-0 bottom-0 w-[2px] z-20 pointer-events-none ${isGridMode ? 'bg-error/40' : 'bg-gradient-to-r from-transparent via-black/15 to-transparent'}`}>
           {isGridMode && <span className="absolute top-0 left-1/2 -translate-x-1/2 bg-error text-white text-[7px] px-1 font-bold rounded-b">CENTRO</span>}
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent z-20 pointer-events-none mix-blend-overlay"></div>
      </div>

      {/* Canvas Zoom Control */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-surface-container-high/90 backdrop-blur-xl border border-outline-variant/20 rounded-2xl shadow-2xl pointer-events-auto shadow-primary/5">
        <button
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(z => Math.max(0.25, z - 0.1)); }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
          title="Reduzir zoom"
        >
          <span className="material-symbols-outlined text-lg">remove</span>
        </button>
        <div className="flex items-center px-1">
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.05"
            value={canvasZoom}
            className="w-24 h-1 bg-outline-variant/30 rounded-full appearance-none accent-primary cursor-pointer hover:accent-primary-container transition-all"
            onChange={e => { e.stopPropagation(); setCanvasZoom(parseFloat(e.target.value)); }}
            onClick={e => e.stopPropagation()}
          />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(z => Math.min(2, z + 0.1)); }}
          className="w-7 h-7 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
          title="Aumentar zoom"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(1); }}
          className="text-[10px] font-mono font-bold text-on-surface-variant hover:text-primary transition-colors min-w-[36px] text-center"
          title="Resetar Zoom (100%)"
        >
          {(canvasZoom * 100).toFixed(0)}%
        </button>

        <div className="w-px h-6 bg-outline-variant/30 mx-1"></div>

        <button
          onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
          title="Configurações do Editor"
        >
          <span className="material-symbols-outlined text-lg">settings</span>
        </button>
      </div>
    </div>
  );
};

export default Canvas;
