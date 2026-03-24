import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';

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
  const { albumConfig, setAlbumConfig } = useProjectStore();
  const [placeholders, setPlaceholders] = useState<DraftPlaceholder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, phId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<DragType>('move');
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSnapshot, setStartSnapshot] = useState<DraftPlaceholder | null>(null);
  
  // Snap lines state
  const [snapLines, setSnapLines] = useState<{ v?: number, h?: number, vEdges?: number[], hEdges?: number[] }>({});
  
  // Gap Magnetic State
  const [gapCm, setGapCm] = useState(0.5);
  const [activeGaps, setActiveGaps] = useState<{ x: number, y: number, w: number, h: number }[]>([]);

  const spreadRatio = (albumConfig.pageWidth * 2) / albumConfig.pageHeight;

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
      
      const targetsX = [0, 25, 50, 75, 100];
      const targetsY = [0, 50, 100];

      const spreadW = (albumConfig.pageWidth * 2) / 10;
      const spreadH = albumConfig.pageHeight / 10;
      const pGapX = (gapCm / spreadW) * 100;
      const pGapY = (gapCm / spreadH) * 100;

      const gapSnapsX: { t: number, p: DraftPlaceholder, type: string }[] = [];
      const gapSnapsY: { t: number, p: DraftPlaceholder, type: string }[] = [];
      const newGaps: { x: number, y: number, w: number, h: number }[] = [];
      
      placeholders.forEach(p => {
         if (p.id === startSnapshot.id) return;
         targetsX.push(p.x, p.x + p.width, p.x + p.width/2);
         targetsY.push(p.y, p.y + p.height, p.y + p.height/2);

         if (gapCm > 0) {
            gapSnapsX.push({ t: p.x - pGapX, p, type: 'left-of-p' });
            gapSnapsX.push({ t: p.x + p.width + pGapX, p, type: 'right-of-p' });
            gapSnapsY.push({ t: p.y - pGapY, p, type: 'top-of-p' });
            gapSnapsY.push({ t: p.y + p.height + pGapY, p, type: 'bottom-of-p' });
         }
      });

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
                newGaps.push({ x: gap.p.x + gap.p.width, y: newY + newH/2, w: pGapX, h: 0 });
                break; 
             }
         }
         if (gap.type === 'left-of-p' && (dragType === 'move' || dragType.includes('e'))) {
             if (Math.abs((newX + newW) - gap.t) < SNAP_TOLERANCE) { 
                if (dragType === 'move') newX = gap.t - newW; 
                else newW = gap.t - newX;
                newGaps.push({ x: gap.t, y: newY + newH/2, w: pGapX, h: 0 });
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
                newGaps.push({ x: newX + newW/2, y: gap.p.y + gap.p.height, w: 0, h: pGapY });
                break; 
             }
         }
         if (gap.type === 'top-of-p' && (dragType === 'move' || dragType.includes('s'))) {
             if (Math.abs((newY + newH) - gap.t) < SNAP_TOLERANCE) { 
                if (dragType === 'move') newY = gap.t - newH; 
                else newH = gap.t - newY;
                newGaps.push({ x: newX + newW/2, y: gap.t, w: 0, h: pGapY });
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
    setPlaceholders([...placeholders, {
      id: generateId(),
      x: 30, y: 30, width: 40, height: 40,
      proportionLock: 'custom'
    }]);
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      setPlaceholders(placeholders.filter(p => p.id !== selectedId));
      setSelectedId(null);
      setContextMenu(null);
    }
  };

  const handleDuplicate = (phId: string) => {
    const source = placeholders.find(p => p.id === phId);
    if (!source) return;
    setPlaceholders([...placeholders, {
      ...source,
      id: generateId(),
      x: Math.min(source.x + 2, 100 - source.width),
      y: Math.min(source.y + 2, 100 - source.height)
    }]);
    setContextMenu(null);
  };

  const handleSavePreset = () => {
    if (placeholders.length === 0) return;
    const layoutConfig = {
      id: `custom_${generateId()}`,
      name: `User Preset (${placeholders.length} Photos)`,
      photoCount: placeholders.length,
      placeholders
    };
    useProjectStore.getState().saveCustomLayout(layoutConfig);
    alert(`Preset salvo com ${placeholders.length} photos! Você já pode usá-lo na Galeria de Layouts do Editor.`);
  };

  return (
    <div className="flex-1 flex flex-col bg-surface relative h-full">
      {/* Top Controls */}
      <div className="h-16 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between px-8">
        <h2 className="text-on-surface font-headline font-bold text-sm uppercase tracking-widest">Layout Designer Studio</h2>
        <div className="flex items-center gap-4">
          <select 
             className="bg-surface-container-high text-xs text-on-surface p-2 rounded border border-outline-variant/20 outline-none hover:border-primary transition-colors cursor-pointer"
             onChange={(e) => {
               const val = e.target.value;
               if(val === 'square') setAlbumConfig({ pageWidth: 300, pageHeight: 300 });
               if(val === 'landscape') setAlbumConfig({ pageWidth: 300, pageHeight: 200 });
               if(val === 'portrait') setAlbumConfig({ pageWidth: 200, pageHeight: 300 });
             }}
          >
             <option value="square">Square Format</option>
             <option value="landscape">Landscape Format</option>
             <option value="portrait">Portrait Format</option>
          </select>
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
          <button 
             onClick={handleSavePreset}
             className="flex items-center gap-2 bg-primary text-on-primary hover:brightness-110 transition-all px-4 py-1.5 rounded font-bold text-xs uppercase shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save Preset to Gallery
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
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
                        {gapCm.toFixed(1)} cm
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
             
             const spreadW = (albumConfig.pageWidth * 2) / 10;
             const spreadH = albumConfig.pageHeight / 10;
             
             const widthCm = (ph.width / 100) * spreadW;
             const heightCm = (ph.height / 100) * spreadH;
             
             const xInitialCm = (ph.x / 100) * spreadW;
             const yInitialCm = (ph.y / 100) * spreadH;

             const updateField = (field: 'x' | 'y' | 'width' | 'height', cmValue: number) => {
                if (isNaN(cmValue)) return;
                setPlaceholders(prev => prev.map(p => {
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
                }));
             };

             const updateProportion = (prop: '1:1' | '3:2' | '2:3' | 'custom') => {
                setPlaceholders(prev => prev.map(p => {
                   if (p.id !== selectedId) return p;
                   if (prop === 'custom') return { ...p, proportionLock: 'custom' };
                   
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
                }));
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
      </div>
    </div>
  );
};

export default LayoutDesigner;
