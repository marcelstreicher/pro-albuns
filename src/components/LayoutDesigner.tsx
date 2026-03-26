import React, { useState, useRef, useEffect } from 'react';
import { type LayoutTemplate } from '../utils/layouts';
import { detectPlaceholdersFromImage } from '../utils/LayoutDetector';
import { useProjectStore } from '../store/useProjectStore';
import ConfirmDialog from './ConfirmDialog';

interface DraftPlaceholder {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  proportionLock?: '1:1' | '3:2' | '2:3' | 'custom';
}

type DragType = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const generateId = () => Math.random().toString(36).substr(2, 9);
const SNAP_TOLERANCE = 1.5; // percent

const LayoutDesigner: React.FC = () => {
  const { 
    albumConfig, customLayouts, setCurrentView, pendingDraftPhotos, deleteCustomLayout,
    designerPlaceholders, saveDesignerHistory, undoDesigner, redoDesigner
  } = useProjectStore();
  const [placeholders, setPlaceholders] = useState<DraftPlaceholder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [layoutToDelete, setLayoutToDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, phId: string } | null>(null);
  const [designerFormat, setDesignerFormat] = useState<'square' | 'landscape' | 'portrait'>('square');
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<DragType>('move');
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSnapshot, setStartSnapshot] = useState<DraftPlaceholder | null>(null);
  
  // Snap lines state
  const [snapLines, setSnapLines] = useState<{ v?: number, h?: number, vEdges?: number[], hEdges?: number[] }>({});
  
  type SnapMode = 'none' | 'page' | 'elements' | 'all';
  const [snapMode, setSnapMode] = useState<SnapMode>('all');

  // Gap Magnetic State
  const [gapCm, setGapCm] = useState(0.5);
  const [activeGaps, setActiveGaps] = useState<{ x: number, y: number, w: number, h: number, valCm: number }[]>([]);

  // Toast notification
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'warning' } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); }, []);
  
  const spreadRatio = designerFormat === 'landscape' ? 3.0 : designerFormat === 'portrait' ? 1.33 : 2.0;

  // Virtual Dimensions for Measurements in Studio (cm)
  const getVirtualDimensions = (format: 'square' | 'landscape' | 'portrait') => {
     if (format === 'landscape') return { w: 60, h: 20 }; // 30x20 pages -> 60x20 spread
     if (format === 'portrait') return { w: 40, h: 30 };  // 20x30 pages -> 40x30 spread
     return { w: 60, h: 30 }; // 30x30 pages -> 60x30 spread
  };

  // Keydown listener for Deletion & Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const next = placeholders.filter(p => p.id !== selectedId);
        saveDesignerHistory(next);
        setPlaceholders(next);
        setSelectedId(null);
      }

      // Undo / Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) redoDesigner();
          else undoDesigner();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redoDesigner();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, placeholders, undoDesigner, redoDesigner, saveDesignerHistory]);

  // Initial Format & History Sync
  useEffect(() => {
    const format = useProjectStore.getState().getProjectFormat();
    setDesignerFormat(format);
    // Initialize store with current placeholders if empty
    if (designerPlaceholders.length === 0 && placeholders.length > 0) {
      saveDesignerHistory(placeholders);
    }
  }, []);

  // Sync local placeholders when history changes (Undo/Redo)
  useEffect(() => {
    if (JSON.stringify(designerPlaceholders) !== JSON.stringify(placeholders)) {
      setPlaceholders(designerPlaceholders);
    }
  }, [designerPlaceholders]);

  useEffect(() => {
    const state = useProjectStore.getState();
    const pendingCount = state.layoutDesignerPendingCount;
    if (pendingCount && pendingCount > 0) {
      // Auto-generate N placeholders in a simple grid to bootstrap creation
      const newPlaceholders: DraftPlaceholder[] = [];
      const cols = Math.ceil(Math.sqrt(pendingCount));
      const rows = Math.ceil(pendingCount / cols);
      const cellW = 100 / cols;
      const cellH = 100 / rows;
      
      let index = 0;
      for (let r = 0; r < rows; r++) {
         for (let c = 0; c < cols; c++) {
            if (index >= pendingCount) break;
            newPlaceholders.push({
               id: generateId(),
               x: c * cellW + 2,
               y: r * cellH + 2,
               width: cellW - 4,
               height: cellH - 4,
               proportionLock: 'custom' as const
            });
            index++;
         }
      }
      
      setPlaceholders(newPlaceholders);
      saveDesignerHistory(newPlaceholders);
      useProjectStore.setState({ layoutDesignerPendingCount: null });
    }
  }, []);

  useEffect(() => {
    if (!isDragging || !startSnapshot || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      // (Rest of MouseMove logic)
      const rect = containerRef.current!.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - startPos.x) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - startPos.y) / rect.height) * 100;
      
      let newX = startSnapshot.x;
      let newY = startSnapshot.y;
      let newW = startSnapshot.width;
      let newH = startSnapshot.height;

      if (dragType === 'move') {
        newX = Math.min(Math.max(0, startSnapshot.x + deltaXPercent), 100 - newW);
        newY = Math.min(Math.max(0, startSnapshot.y + deltaYPercent), 100 - newH);
      } else {
        if (dragType.includes('e')) {
           newW = Math.max(5, Math.min(startSnapshot.width + deltaXPercent, 100 - startSnapshot.x));
        }
        if (dragType.includes('s')) {
           newH = Math.max(5, Math.min(startSnapshot.height + deltaYPercent, 100 - startSnapshot.y));
        }
        if (dragType.includes('w')) {
           const proposedW = startSnapshot.width - deltaXPercent;
           if (proposedW >= 5 && startSnapshot.x + deltaXPercent >= 0) {
              newW = proposedW;
              newX = startSnapshot.x + deltaXPercent;
           } else if (startSnapshot.x + deltaXPercent < 0) {
              newX = 0;
              newW = startSnapshot.width + startSnapshot.x;
           }
        }
        if (dragType.includes('n')) {
           const proposedH = startSnapshot.height - deltaYPercent;
           if (proposedH >= 5 && startSnapshot.y + deltaYPercent >= 0) {
              newH = proposedH;
              newY = startSnapshot.y + deltaYPercent;
           } else if (startSnapshot.y + deltaYPercent < 0) {
              newY = 0;
              newH = startSnapshot.height + startSnapshot.y;
           }
        }

        // Apply Ratio Lock
        let targetR: number | null = null;
        if (e.shiftKey) {
           targetR = (startSnapshot.width * spreadRatio) / startSnapshot.height;
        } else if (startSnapshot.proportionLock === '1:1') {
           targetR = 1;
        } else if (startSnapshot.proportionLock === '3:2') {
           targetR = 1.5;
        } else if (startSnapshot.proportionLock === '2:3') {
           targetR = 2 / 3;
        }

        if (targetR !== null) {
           if (dragType === 'n' || dragType === 's') {
              // height drives width
              newW = (newH * targetR) / spreadRatio;
              if (dragType === 'n') newX = startSnapshot.x + (startSnapshot.width - newW) / 2; // Keep center X during N drag
           } else {
              // width drives height
              newH = (newW * spreadRatio) / targetR;
              if (dragType === 'w') newY = startSnapshot.y + (startSnapshot.height - newH) / 2;
           }
        }
      }

      // Snapping Logic
      let snapV: number | undefined;
      let snapH: number | undefined;
      const vEdges: number[] = [];
      const hEdges: number[] = [];
      
      const targetsX: number[] = [];
      const targetsY: number[] = [];

      if (snapMode === 'page' || snapMode === 'all') {
         targetsX.push(0, 25, 50, 75, 100);
         targetsY.push(0, 50, 100);
      }

      const spreadW = (albumConfig.spreadWidth || 600) / 10;
      const spreadH = (albumConfig.spreadHeight || 300) / 10;
      const pGapX = (gapCm / spreadW) * 100;
      const pGapY = (gapCm / spreadH) * 100;

      const gapSnapsX: { t: number, p: DraftPlaceholder, type: string, val: number, valCm: number }[] = [];
      const gapSnapsY: { t: number, p: DraftPlaceholder, type: string, val: number, valCm: number }[] = [];
      const newGaps: { x: number, y: number, w: number, h: number, valCm: number }[] = [];
      
      if (snapMode === 'elements' || snapMode === 'all') {
         const dynamicGapsCm = new Set<string>();
         for (let i = 0; i < placeholders.length; i++) {
            if (placeholders[i].id === startSnapshot.id) continue;
            for (let j = i + 1; j < placeholders.length; j++) {
               if (placeholders[j].id === startSnapshot.id) continue;
               const A = placeholders[i];
               const B = placeholders[j];
               const dx1 = B.x - (A.x + A.width);
               if (dx1 > 0 && dx1 < 50) dynamicGapsCm.add(((dx1 / 100) * spreadW).toFixed(2));
               const dx2 = A.x - (B.x + B.width);
               if (dx2 > 0 && dx2 < 50) dynamicGapsCm.add(((dx2 / 100) * spreadW).toFixed(2));
               
               const dy1 = B.y - (A.y + A.height);
               if (dy1 > 0 && dy1 < 50) dynamicGapsCm.add(((dy1 / 100) * spreadH).toFixed(2));
               const dy2 = A.y - (B.y + B.height);
               if (dy2 > 0 && dy2 < 50) dynamicGapsCm.add(((dy2 / 100) * spreadH).toFixed(2));
            }
         }

         const allGapsX = [{ val: pGapX, valCm: gapCm }];
         const allGapsY = [{ val: pGapY, valCm: gapCm }];
         
         dynamicGapsCm.forEach(gStr => {
            const gCm = parseFloat(gStr);
            if (gCm <= 0) return;
            // Prevent duplicate of the default gap
            if (Math.abs(gCm - gapCm) > 0.05) {
               allGapsX.push({ val: (gCm / spreadW) * 100, valCm: gCm });
               allGapsY.push({ val: (gCm / spreadH) * 100, valCm: gCm });
            }
         });

         placeholders.forEach(p => {
            if (p.id === startSnapshot.id) return;
            targetsX.push(p.x, p.x + p.width, p.x + p.width/2);
            targetsY.push(p.y, p.y + p.height, p.y + p.height/2);

            for (const gx of allGapsX) {
               gapSnapsX.push({ t: p.x - gx.val, p, type: 'left-of-p', val: gx.val, valCm: gx.valCm });
               gapSnapsX.push({ t: p.x + p.width + gx.val, p, type: 'right-of-p', val: gx.val, valCm: gx.valCm });
            }
            for (const gy of allGapsY) {
               gapSnapsY.push({ t: p.y - gy.val, p, type: 'top-of-p', val: gy.val, valCm: gy.valCm });
               gapSnapsY.push({ t: p.y + p.height + gy.val, p, type: 'bottom-of-p', val: gy.val, valCm: gy.valCm });
            }
         });
      }

      for (const t of targetsX) {
         if (dragType === 'move' || dragType.includes('w')) {
             if (Math.abs(newX - t) < SNAP_TOLERANCE) { 
                if (dragType.includes('w')) newW += (newX - t); 
                newX = t; snapV = t; vEdges.push(t); break; 
             }
         }
         if (dragType === 'move' || dragType.includes('e')) {
             if (Math.abs((newX + newW) - t) < SNAP_TOLERANCE) { 
                if (dragType === 'move') newX = t - newW; 
                else newW = t - newX;
                snapV = t; vEdges.push(t); break; 
             }
         }
         if (dragType === 'move') {
             if (Math.abs((newX + newW/2) - t) < SNAP_TOLERANCE) {
                newX = t - newW/2;
                snapV = t; vEdges.push(t); break;
             }
         }
      }

      for (const t of targetsY) {
         if (dragType === 'move' || dragType.includes('n')) {
             if (Math.abs(newY - t) < SNAP_TOLERANCE) { 
                if (dragType.includes('n')) newH += (newY - t); 
                newY = t; snapH = t; hEdges.push(t); break; 
             }
         }
         if (dragType === 'move' || dragType.includes('s')) {
             if (Math.abs((newY + newH) - t) < SNAP_TOLERANCE) { 
                if (dragType === 'move') newY = t - newH;
                else newH = t - newY;
                snapH = t; hEdges.push(t); break; 
             }
         }
         if (dragType === 'move') {
             if (Math.abs((newY + newH/2) - t) < SNAP_TOLERANCE) {
                newY = t - newH/2;
                snapH = t; hEdges.push(t); break;
             }
         }
      }

      // Gap Snaps X
      for (const gap of gapSnapsX) {
         if (gap.type === 'right-of-p' && (dragType === 'move' || dragType.includes('w'))) {
             if (Math.abs(newX - gap.t) < SNAP_TOLERANCE) { 
                if (dragType.includes('w')) newW += (newX - gap.t); 
                newX = gap.t; 
                newGaps.push({ x: gap.p.x + gap.p.width, y: newY + newH/2, w: gap.val, h: 0, valCm: gap.valCm });
                break; 
             }
         }
         if (gap.type === 'left-of-p' && (dragType === 'move' || dragType.includes('e'))) {
             if (Math.abs((newX + newW) - gap.t) < SNAP_TOLERANCE) { 
                if (dragType === 'move') newX = gap.t - newW; 
                else newW = gap.t - newX;
                newGaps.push({ x: gap.t, y: newY + newH/2, w: gap.val, h: 0, valCm: gap.valCm });
                break; 
             }
         }
      }

      // Gap Snaps Y
      for (const gap of gapSnapsY) {
         if (gap.type === 'bottom-of-p' && (dragType === 'move' || dragType.includes('n'))) {
             if (Math.abs(newY - gap.t) < SNAP_TOLERANCE) { 
                if (dragType.includes('n')) newH += (newY - gap.t); 
                newY = gap.t; 
                newGaps.push({ x: newX + newW/2, y: gap.p.y + gap.p.height, w: 0, h: gap.val, valCm: gap.valCm });
                break; 
             }
         }
         if (gap.type === 'top-of-p' && (dragType === 'move' || dragType.includes('s'))) {
             if (Math.abs((newY + newH) - gap.t) < SNAP_TOLERANCE) { 
                if (dragType === 'move') newY = gap.t - newH; 
                else newH = gap.t - newY;
                newGaps.push({ x: newX + newW/2, y: gap.t, w: 0, h: gap.val, valCm: gap.valCm });
                break; 
             }
         }
      }

      setSnapLines({ v: snapV, h: snapH, vEdges, hEdges });
      setActiveGaps(newGaps);

      setPlaceholders(prev => prev.map(ph => 
        ph.id === startSnapshot.id 
          ? { ...ph, x: newX, y: newY, width: newW, height: newH } 
          : ph
      ));
    };

    const handleMouseUp = () => {
      if (isDragging) {
        saveDesignerHistory(placeholders);
      }
      setIsDragging(false);
      setStartSnapshot(null);
      setSnapLines({});
      setActiveGaps([]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos, startSnapshot, dragType, placeholders]);

  const startInteraction = (e: React.MouseEvent, type: DragType, ph: DraftPlaceholder) => {
    if (e.button === 2) return; // ignore right click for dragging
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(ph.id);
    setIsDragging(true);
    setDragType(type);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSnapshot({ ...ph });
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, ph: DraftPlaceholder) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(ph.id);
    setContextMenu({ x: e.clientX, y: e.clientY, phId: ph.id });
  };

  const handleAddPlaceholder = () => {
    const next: DraftPlaceholder[] = [...placeholders, {
      id: generateId(),
      x: 30, y: 30, width: 40, height: 40,
      proportionLock: 'custom' as const
    }];
    saveDesignerHistory(next);
    setPlaceholders(next);
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      const next = placeholders.filter(p => p.id !== selectedId);
      saveDesignerHistory(next);
      setPlaceholders(next);
      setSelectedId(null);
      setContextMenu(null);
    }
  };

  const handleDuplicate = (phId: string) => {
    const source = placeholders.find(p => p.id === phId);
    if (!source) return;
    const next = [...placeholders, {
      ...source,
      id: generateId(),
      x: Math.min(source.x + 2, 100 - source.width),
      y: Math.min(source.y + 2, 100 - source.height)
    }];
    saveDesignerHistory(next);
    setPlaceholders(next);
    setContextMenu(null);
  };

  const handleSavePreset = () => {
    if (placeholders.length === 0) return;
    
    if (editingPresetId) {
       const existing = customLayouts[editingPresetId];
       if (existing) {
          const layoutConfig: LayoutTemplate = {
             ...existing,
             photoCount: placeholders.length,
             placeholders: placeholders.map(p => ({...p})),
             format: designerFormat
          };
          useProjectStore.getState().saveCustomLayout(layoutConfig);
          showToast(`Preset "${existing.name}" atualizado com sucesso!`);
          return;
       }
    }

    const layoutConfig: LayoutTemplate = {
      id: `custom_${generateId()}`,
      name: `Preset ${Object.keys(customLayouts).length + 1} (${placeholders.length} Fotos)`,
      photoCount: placeholders.length,
      placeholders: placeholders.map(p => ({...p})),
      format: designerFormat
    };
    useProjectStore.getState().saveCustomLayout(layoutConfig);
    setEditingPresetId(layoutConfig.id);
    showToast(`Novo preset salvo com ${placeholders.length} fotos! Uso liberado no Editor.`);

    // If we came here from a pending drop, return to editor automatically
    if (pendingDraftPhotos) {
      setCurrentView('editor');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface relative h-full overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-xl pointer-events-none
          ${toast.type === 'success' ? 'bg-surface-container-high border-primary/30 text-on-surface' : 
    toast.type === 'warning' ? 'bg-error-container border-error/30 text-on-error-container' :
    'bg-surface-container-high border-outline-variant/30 text-on-surface'}`}
        >
          <span className={`material-symbols-outlined text-xl ${toast.type === 'success' ? 'text-primary' : toast.type === 'warning' ? 'text-error' : 'text-on-surface-variant'}`}>
            {toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'info'}
          </span>
          <span className="text-sm font-medium whitespace-nowrap">{toast.message}</span>
        </div>
      )}
      {/* Top Controls */}
      <div className="h-16 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between px-8">
        <h2 className="text-on-surface font-headline font-bold text-sm uppercase tracking-widest">Layout Designer Studio</h2>
        <div className="flex items-center gap-4">
          <select 
             className="bg-surface-container-high text-xs text-on-surface p-2 rounded border border-outline-variant/20 outline-none hover:border-primary transition-colors cursor-pointer"
             value={designerFormat}
             onChange={(e) => {
               setDesignerFormat(e.target.value as any);
             }}
          >
             <option value="square">Square Format</option>
             <option value="landscape">Landscape Format</option>
             <option value="portrait">Portrait Format</option>
          </select>
          
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  showToast('Analisando imagem...', 'info');
                  try {
                    const detected = await detectPlaceholdersFromImage(file);
                    setPlaceholders(detected.map(p => ({
                      id: p.id,
                      x: p.x,
                      y: p.y,
                      width: p.width,
                      height: p.height,
                      locked: false
                    })));
                    showToast(`${detected.length} fotos detectadas com sucesso!`, 'success');
                  } catch (err) {
                    showToast('Falha ao analisar imagem.', 'warning');
                    console.error(err);
                  }
                }
              };
              input.click();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            Smart Import
          </button>

          <div className="flex items-center gap-1 bg-surface-container-high border border-outline-variant/20 px-2 py-1.5 rounded" title="Modo Magnético (Snap)">
             <span className="material-symbols-outlined text-[14px] text-on-surface-variant">magnet</span>
             <select
                value={snapMode}
                onChange={(e) => setSnapMode(e.target.value as SnapMode)}
                className="bg-transparent text-xs text-on-surface outline-none cursor-pointer"
             >
                <option value="none" className="bg-surface-container-high">Livre (Desativado)</option>
                <option value="page" className="bg-surface-container-high">Só Guias da Página</option>
                <option value="elements" className="bg-surface-container-high">Só Elementos</option>
                <option value="all" className="bg-surface-container-high">Completo</option>
             </select>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-high border border-outline-variant/20 px-2 py-1.5 rounded outline-none hover:border-primary transition-colors" title="Espaçamento Padrão entre Elementos">
             <span className="material-symbols-outlined text-[14px] text-on-surface-variant">space_bar</span>
             <input 
                type="number" 
                step="0.1" 
                value={gapCm} 
                onChange={(e) => setGapCm(parseFloat(e.target.value) || 0)}
                className="w-10 bg-transparent text-xs text-on-surface font-mono outline-none text-right"
             />
             <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">cm</span>
          </div>
          <button 
             onClick={handleAddPlaceholder}
             className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all px-4 py-1.5 rounded font-bold text-xs uppercase"
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            Add Placeholder
          </button>
          <button 
             onClick={handleDeleteSelected}
             disabled={!selectedId}
             className="flex items-center gap-2 bg-error/10 text-error hover:bg-error hover:text-on-error transition-all px-4 py-1.5 rounded font-bold text-xs uppercase disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete Box
          </button>
          <div className="w-px h-6 bg-outline-variant/20 mx-2"></div>
          <div className="flex items-center gap-4">
             {placeholders.length > 0 && (
                <button 
                   onClick={() => {
                      setPlaceholders([]);
                      setEditingPresetId(null);
                   }}
                   className="text-xs font-bold text-on-surface hover:text-error uppercase tracking-wider transition-colors"
                >
                   Limpar Tela
                </button>
             )}
             <button 
                onClick={handleSavePreset}
                className="flex items-center gap-2 bg-primary text-on-primary hover:brightness-110 transition-all px-4 py-1.5 rounded font-bold text-xs uppercase shadow-lg shadow-primary/20"
             >
               <span className="material-symbols-outlined text-[16px]">save</span>
               {editingPresetId ? 'Atualizar Preset' : 'Salvar Novo'}
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Saved Layouts Panel */}
        <aside className="w-64 bg-surface-container-low border-r border-outline-variant/15 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-outline-variant/10">
             <h4 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider flex items-center gap-2">
               <span className="material-symbols-outlined text-primary text-[16px]">view_quilt</span>
               Meus Layouts
             </h4>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <button 
               onClick={() => {
                  setPlaceholders([]);
                  setEditingPresetId(null);
                  setSelectedId(null);
               }}
               className="flex items-center justify-center gap-2 p-3 mb-2 rounded border border-dashed border-primary text-primary hover:bg-primary/10 transition-colors w-full font-bold text-xs uppercase"
            >
               <span className="material-symbols-outlined text-[16px]">add</span>
               Novo Layout
            </button>
            
            {Object.values(customLayouts).length === 0 ? (
               <div className="text-center p-4 mt-6">
                  <span className="material-symbols-outlined text-outline-variant/50 text-3xl mb-2">dashboard_customize</span>
                  <p className="text-[10px] text-on-surface-variant">Nenhum layout salvo ainda!</p>
               </div>
            ) : Object.values(customLayouts).reverse().map(layout => (
               <button 
                  key={layout.id}
                  onClick={() => {
                     setPlaceholders(layout.placeholders.map(p => ({...p})));
                     setEditingPresetId(layout.id);
                     setSelectedId(null);
                     // Sync designer format
                     if (layout.format && layout.format !== 'all') {
                        setDesignerFormat(layout.format);
                     }
                  }}
                  className={`flex items-center gap-3 p-3 rounded border text-left cursor-pointer transition-colors overflow-hidden group ${editingPresetId === layout.id ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline-variant/20 hover:border-primary/50 text-on-surface'}`}
               >
                  {(() => {
                     const thumbRatio = layout.format === 'landscape' ? 3.0 : layout.format === 'portrait' ? 1.33 : 2.0;
                     return (
                        <div 
                           className="w-16 shrink-0 bg-surface-container-high relative overflow-hidden ring-1 ring-outline-variant/20 shadow-inner group-hover:ring-primary/50 transition-all"
                           style={{ aspectRatio: thumbRatio }}
                        >
                           {/* Center Spine in Thumbnail */}
                           <div className="absolute left-1/2 top-0 bottom-0 w-px bg-outline-variant/20"></div>
                           
                           {layout.placeholders.map(ph => (
                              <div 
                                 key={ph.id} 
                                 className="absolute border border-outline-variant/50 bg-outline-variant/10 shadow-sm"
                                 style={{
                                    left: `${ph.x}%`, 
                                    top: `${ph.y}%`, 
                                    width: `${ph.width}%`, 
                                    height: `${ph.height}%`
                                 }}
                              />
                           ))}
                           {/* Badge for PhotoCount */}
                           <div className="absolute bottom-0 right-0 bg-surface-container-highest text-on-surface-variant text-[8px] font-bold px-1 rounded-tl shadow border-l border-t border-outline-variant/20">
                              {layout.photoCount}📸
                           </div>
                        </div>
                     );
                  })()}
                  <div className="overflow-hidden flex-1 min-w-0 text-left">
                     <div className="text-[10px] font-bold truncate leading-tight uppercase tracking-tight">{layout.name}</div>
                     <div className="text-[8px] opacity-60 uppercase tracking-tighter mt-0.5">{layout.format || 'All'}</div>
                  </div>
                  
                  <button 
                     onClick={(e) => {
                        e.stopPropagation();
                        setLayoutToDelete(layout.id);
                     }}
                     className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-error/20 text-error transition-all"
                  >
                     <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
               </button>
            ))}
          </div>
        </aside>

        {/* Designer Canvas */}
        <div 
          className="flex-1 bg-surface-container-lowest p-12 flex items-center justify-center overflow-auto relative"
          onMouseDown={() => {
             setSelectedId(null);
             setContextMenu(null);
          }}
          onContextMenu={(e) => {
             e.preventDefault();
             setContextMenu(null);
          }}
        >
           <div 
              ref={containerRef}
              style={{ aspectRatio: spreadRatio }}
              className="bg-[#fff] shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-4xl max-h-[75vh] relative ring-1 ring-black/10"
           >
              {/* Guide Grid Optional */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #0000000a 1px, transparent 1px), linear-gradient(to bottom, #0000000a 1px, transparent 1px)', backgroundSize: '5% 5%' }}></div>
              
              {/* Spine */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-error/50 pointer-events-none z-10 flex items-center justify-center">
                 <span className="bg-error text-white text-[8px] px-1 py-0.5 absolute -translate-x-1/2 uppercase tracking-widest rounded-sm">Spine (Fold)</span>
              </div>

              {/* Smart Snap Lines */}
              {snapLines.vEdges?.map((v, i) => (
                 <div key={`v-${i}`} style={{ left: `${v}%` }} className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-10 shadow-[0_0_5px_rgba(var(--primary),0.5)]"></div>
              ))}
              {snapLines.hEdges?.map((h, i) => (
                 <div key={`h-${i}`} style={{ top: `${h}%` }} className="absolute left-0 right-0 h-px bg-primary pointer-events-none z-10 shadow-[0_0_5px_rgba(var(--primary),0.5)]"></div>
              ))}

              {/* Gap Dimension Lines */}
              {activeGaps.map((g, i) => (
                  <div key={`gap-${i}`} 
                     className="absolute flex items-center justify-center pointer-events-none z-50 text-error"
                     style={{ 
                        left: `${g.x}%`, top: `${g.y}%`, 
                        width: g.w > 0 ? `${g.w}%` : '0px', 
                        height: g.h > 0 ? `${g.h}%` : '0px',
                        transform: g.w > 0 ? 'translateY(-50%)' : 'translateX(-50%)'
                     }}
                  >
                     <div className={g.w > 0 ? "h-px w-full bg-error" : "w-px h-full bg-error"} />
                     <div className={`absolute bg-error text-white text-[9px] font-mono px-1 py-0.5 rounded shadow whitespace-nowrap`}>
                        {g.valCm.toFixed(1)} cm
                     </div>
                  </div>
              ))}

              {/* Placeholders */}
              {placeholders.map(ph => {
                 const isSelected = selectedId === ph.id;
                 return (
                    <div
                       key={ph.id}
                       onMouseDown={(e) => startInteraction(e, 'move', ph)}
                       onContextMenu={(e) => handleContextMenu(e, ph)}
                       style={{
                          left: `${ph.x}%`, top: `${ph.y}%`, width: `${ph.width}%`, height: `${ph.height}%`
                       }}
                       className={`absolute flex items-center justify-center cursor-move transition-shadow group ${isSelected ? 'border-2 border-primary bg-primary/10 shadow-lg ring-4 ring-primary/20 z-20' : 'border border-outline-variant/60 bg-surface-container-high hover:border-primary/50'}`}
                    >
                       <span className="material-symbols-outlined text-outline-variant/30 text-4xl pointer-events-none">image</span>
                       
                       {/* 8-Directional Resize Handles - Visible on Hover/Select */}
                       <div className={`absolute inset-0 z-30 opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''}`}>
                          {/* Corners */}
                          <div onMouseDown={(e) => startInteraction(e, 'nw', ph)} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-sm" />
                          <div onMouseDown={(e) => startInteraction(e, 'ne', ph)} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nesw-resize shadow-sm" />
                          <div onMouseDown={(e) => startInteraction(e, 'sw', ph)} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nesw-resize shadow-sm" />
                          <div onMouseDown={(e) => startInteraction(e, 'se', ph)} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-primary rounded-full cursor-nwse-resize shadow-sm" />
                          
                          {/* Edges */}
                          <div onMouseDown={(e) => startInteraction(e, 'n', ph)} className="absolute -top-1 left-2 right-2 h-2 cursor-ns-resize hover:bg-primary/30" />
                          <div onMouseDown={(e) => startInteraction(e, 's', ph)} className="absolute -bottom-1 left-2 right-2 h-2 cursor-ns-resize hover:bg-primary/30" />
                          <div onMouseDown={(e) => startInteraction(e, 'w', ph)} className="absolute top-2 bottom-2 -left-1 w-2 cursor-ew-resize hover:bg-primary/30" />
                          <div onMouseDown={(e) => startInteraction(e, 'e', ph)} className="absolute top-2 bottom-2 -right-1 w-2 cursor-ew-resize hover:bg-primary/30" />
                       </div>
                       
                       {/* Info floating */}
                       {isSelected && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-40">
                             W: {Math.round(ph.width)}% | H: {Math.round(ph.height)}%
                          </div>
                       )}
                    </div>
                 );
              })}
           </div>

           {/* Context Menu */}
           {contextMenu && (
             <div 
                className="fixed bg-surface-container-high border border-outline-variant/20 rounded shadow-xl py-1 z-50 w-40"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
             >
                <button 
                   className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-primary/20 hover:text-primary flex items-center gap-2"
                   onClick={() => handleDuplicate(contextMenu.phId)}
                >
                   <span className="material-symbols-outlined text-[16px]">content_copy</span>
                   Duplicate
                </button>
                <div className="h-px bg-outline-variant/10 my-1 w-full" />
                <button 
                   className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/20 flex items-center gap-2"
                   onClick={() => handleDeleteSelected()} // handleDeleteSelected uses selectedId, which is already set by context menu!
                >
                   <span className="material-symbols-outlined text-[16px]">delete</span>
                   Delete
                </button>
             </div>
           )}
        </div>

        {/* Properties Panel (Inspector) */}
        <aside className="w-80 bg-surface-container-low border-l border-outline-variant/15 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 border-b border-outline-variant/10">
             <h4 className="font-headline font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">aspect_ratio</span>
               Properties
             </h4>
             <p className="text-[10px] text-on-surface-variant mt-1.5">Real-world physical measurements for the selected placeholder.</p>
          </div>
          
          {!selectedId ? (
             <div className="p-12 flex flex-col items-center justify-center text-center opacity-50 mt-10">
                <span className="material-symbols-outlined text-4xl mb-4">touch_app</span>
                <p className="text-xs text-on-surface">Select a placeholder to edit its properties.</p>
             </div>
          ) : (() => {
             const ph = placeholders.find(p => p.id === selectedId);
             if (!ph) return null;
             
             const dims = getVirtualDimensions(designerFormat);
             const spreadW = dims.w;
             const spreadH = dims.h;
             
             const widthCm = (ph.width / 100) * spreadW;
             const heightCm = (ph.height / 100) * spreadH;
             
             const xInitialCm = (ph.x / 100) * spreadW;
             const yInitialCm = (ph.y / 100) * spreadH;

             const updateField = (field: 'x' | 'y' | 'width' | 'height', cmValue: number) => {
                if (isNaN(cmValue)) return;
                const next = placeholders.map(p => {
                   if (p.id !== selectedId) return p;
                   const newP = { ...p };
                   if (field === 'x') newP.x = (cmValue / spreadW) * 100;
                   if (field === 'y') newP.y = (cmValue / spreadH) * 100;
                   if (field === 'width') newP.width = (cmValue / spreadW) * 100;
                   if (field === 'height') newP.height = (cmValue / spreadH) * 100;
                   
                   // Constrain
                   if (newP.x < 0) newP.x = 0;
                   if (newP.x + newP.width > 100) newP.x = 100 - newP.width;
                   if (newP.y < 0) newP.y = 0;
                   if (newP.y + newP.height > 100) newP.y = 100 - newP.height;
                   return newP;
                });
                saveDesignerHistory(next);
                setPlaceholders(next);
             };

             const updateProportion = (prop: '1:1' | '3:2' | '2:3' | 'custom') => {
                const next = placeholders.map(p => {
                   if (p.id !== selectedId) return p;
                   if (prop === 'custom') return { ...p, proportionLock: 'custom' as const };
                   
                   const R = prop === '1:1' ? 1 : prop === '3:2' ? 1.5 : (2/3);
                   let newHeight = (p.width * spreadRatio) / R;
                   let newWidth = p.width;
                   
                   if (p.y + newHeight > 100) {
                      newHeight = 100 - p.y;
                      newWidth = (newHeight * R) / spreadRatio;
                   }
                   if (p.x + newWidth > 100) {
                      newWidth = 100 - p.x;
                      newHeight = (newWidth * spreadRatio) / R;
                   }
                   
                   return { ...p, proportionLock: prop, height: newHeight, width: newWidth };
                });
                saveDesignerHistory(next);
                setPlaceholders(next);
             };

             return (
                <div className="p-6 space-y-6">
                   {/* Size */}
                   <div>
                      <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant/10 pb-1">Dimension (cm)</h5>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-surface-container p-2 rounded border border-outline-variant/20 flex flex-col">
                            <span className="text-[9px] text-on-surface-variant uppercase block mb-0.5">Width</span>
                            <div className="flex items-center gap-1">
                               <input 
                                  type="number" 
                                  value={widthCm.toFixed(1)} 
                                  onChange={(e) => updateField('width', parseFloat(e.target.value))}
                                  className="w-full bg-transparent text-sm font-mono text-on-surface font-medium border-none outline-none focus:ring-0 p-0"
                                  step="0.5"
                               />
                               <span className="text-xs text-on-surface-variant font-mono">cm</span>
                            </div>
                         </div>
                         <div className="bg-surface-container p-2 rounded border border-outline-variant/20 flex flex-col">
                            <span className="text-[9px] text-on-surface-variant uppercase block mb-0.5">Height</span>
                            <div className="flex items-center gap-1">
                               <input 
                                  type="number" 
                                  value={heightCm.toFixed(1)} 
                                  onChange={(e) => updateField('height', parseFloat(e.target.value))}
                                  className="w-full bg-transparent text-sm font-mono text-on-surface font-medium border-none outline-none focus:ring-0 p-0"
                                  step="0.5"
                               />
                               <span className="text-xs text-on-surface-variant font-mono">cm</span>
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   {/* Proportion */}
                   <div>
                      <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant/10 pb-1">Proportion</h5>
                      <select 
                         value={ph.proportionLock || 'custom'}
                         onChange={(e) => updateProportion(e.target.value as any)}
                         className="w-full bg-surface-container text-xs text-on-surface p-3 rounded border border-outline-variant/20 outline-none focus:border-primary cursor-pointer"
                      >
                         <option value="custom">Custom (Free Drag)</option>
                         <option value="1:1">Square (1:1)</option>
                         <option value="3:2">Horizontal (3:2)</option>
                         <option value="2:3">Vertical (2:3)</option>
                      </select>
                   </div>
                   
                   {/* Position */}
                   <div>
                      <h5 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 border-b border-outline-variant/10 pb-1">Start Position (cm)</h5>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-surface-container/50 p-2 rounded border border-outline-variant/10 flex flex-col">
                            <span className="text-[9px] text-on-surface-variant uppercase block mb-0.5">X (Horiz)</span>
                            <div className="flex items-center gap-1">
                               <input 
                                  type="number" 
                                  value={xInitialCm.toFixed(1)} 
                                  onChange={(e) => updateField('x', parseFloat(e.target.value))}
                                  className="w-full bg-transparent text-sm font-mono text-on-surface font-medium border-none outline-none focus:ring-0 p-0"
                                  step="0.5"
                               />
                               <span className="text-[10px] text-on-surface-variant font-mono">cm</span>
                            </div>
                         </div>
                         <div className="bg-surface-container/50 p-2 rounded border border-outline-variant/10 flex flex-col">
                            <span className="text-[9px] text-on-surface-variant uppercase block mb-0.5">Y (Vert)</span>
                            <div className="flex items-center gap-1">
                               <input 
                                  type="number" 
                                  value={yInitialCm.toFixed(1)} 
                                  onChange={(e) => updateField('y', parseFloat(e.target.value))}
                                  className="w-full bg-transparent text-sm font-mono text-on-surface font-medium border-none outline-none focus:ring-0 p-0"
                                  step="0.5"
                               />
                               <span className="text-[10px] text-on-surface-variant font-mono">cm</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             );
          })()}
        </aside>
      <ConfirmDialog 
        isOpen={layoutToDelete !== null}
        title="Excluir Layout?"
        message="Tem certeza que deseja excluir permanentemente este preset customizado? Esta ação não pode ser desfeita."
        onConfirm={() => {
           if (layoutToDelete) {
              deleteCustomLayout(layoutToDelete);
              if (editingPresetId === layoutToDelete) {
                 setEditingPresetId(null);
                 setPlaceholders([]);
              }
              setLayoutToDelete(null);
              showToast("Layout excluído com sucesso!", "info");
           }
        }}
        onCancel={() => setLayoutToDelete(null)}
      />
    </div>
  </div>
);
};

export default LayoutDesigner;
