import React, { useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { layoutsDictionary } from '../utils/layouts';

const Inspector: React.FC = () => {
  const { albumConfig, spreads, activeSpreadIndex, setSpreadLayout, setAlbumConfig } = useProjectStore();
  const activeSpread = spreads[activeSpreadIndex];

  if (!activeSpread) return null;

  const handleApplyLayout = (layoutId: string) => {
    setSpreadLayout(activeSpread.id, layoutId);
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const format = e.target.value;
    if (format === 'square-30') {
      setAlbumConfig({ name: 'Square 30x30 Album', pageWidth: 300, pageHeight: 300 });
    } else if (format === 'landscape-30x20') {
      setAlbumConfig({ name: 'Landscape 30x20 Album', pageWidth: 300, pageHeight: 200 });
    } else if (format === 'portrait-20x30') {
      setAlbumConfig({ name: 'Portrait 20x30 Album', pageWidth: 200, pageHeight: 300 });
    }
  };

  // Group layouts by photo count for a cleaner Gallery view
  const layoutsByCount = useMemo(() => {
    const groups: Record<number, any[]> = {};
    const allLayouts = { ...layoutsDictionary, ...useProjectStore.getState().customLayouts };
    Object.values(allLayouts).forEach(layout => {
      if (!groups[layout.photoCount]) groups[layout.photoCount] = [];
      groups[layout.photoCount].push(layout);
    });
    return groups;
  }, [useProjectStore.getState().customLayouts]);

  const currentPhotoCount = Object.keys(activeSpread.images).length;
  // Suggest layouts prioritizing the current photo count if any photos are added (or default 1, 2)
  const suggestedCounts = currentPhotoCount > 0 ? [currentPhotoCount] : [1, 2, 3, 4, 5];

  return (
    <aside className="w-80 bg-surface-container-low border-l border-outline-variant/15 flex flex-col h-full overflow-y-auto">
      {/* Album Project Settings */}
      <div className="p-6 border-b border-outline-variant/10 bg-surface-container-lowest/50">
         <h4 className="font-headline font-bold text-[11px] text-on-surface mb-3 uppercase tracking-wider flex justify-between items-center">
           Album Configuration
           <span className="material-symbols-outlined text-sm">book</span>
         </h4>
         <select 
           className="w-full bg-surface-container-high text-xs text-on-surface p-2 rounded border border-outline-variant/20 outline-none focus:border-primary mb-3"
           onChange={handleFormatChange}
           value={albumConfig.pageWidth === 300 && albumConfig.pageHeight === 300 ? 'square-30' : 
                  albumConfig.pageWidth === 300 && albumConfig.pageHeight === 200 ? 'landscape-30x20' : 
                  'portrait-20x30'}
         >
            <option value="square-30">Square Album - 30x30 cm</option>
            <option value="landscape-30x20">Landscape Album - 30x20 cm</option>
            <option value="portrait-20x30">Portrait Album - 20x30 cm</option>
         </select>
         <div className="flex gap-4">
            <div className="flex-1">
               <label className="text-[9px] uppercase text-on-surface-variant block mb-1">Spread Aspect Ratio</label>
               <div className="text-xs font-mono bg-surface-container py-1 px-2 rounded w-full border border-outline-variant/10 text-center text-on-surface">
                  {((albumConfig.pageWidth * 2) / albumConfig.pageHeight).toFixed(2)} : 1
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-end mb-4">
          <h4 className="font-headline font-bold text-sm text-on-surface uppercase tracking-wider">Layout Gallery</h4>
          <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{currentPhotoCount} Photo(s) Active</span>
        </div>

        <div className="space-y-8">
          {suggestedCounts.map(count => {
             const layouts = layoutsByCount[count];
             if (!layouts) return null;
             return (
                <div key={count}>
                   <h5 className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-3 border-b border-outline-variant/10 pb-1">
                     {count} Photo Layouts
                   </h5>
                   <div className="grid grid-cols-2 gap-3">
                      {layouts.map(l => (
                         <div 
                           key={l.id} 
                           onClick={() => handleApplyLayout(l.id)} 
                           className="group cursor-pointer flex flex-col items-center"
                         >
                            {/* Layout Visualizer Mini */}
                            <div className={`w-full aspect-[2/1] rounded-sm bg-surface-container-high border-2 transition-all shadow-sm overflow-hidden relative ${activeSpread.layoutId === l.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-outline-variant/20 hover:border-primary/50'}`}>
                               {l.placeholders.map((ph: any) => (
                                 <div 
                                    key={ph.id}
                                    className="absolute bg-outline-variant/30 rounded-[1px]"
                                    style={{
                                       left: `${ph.x}%`, top: `${ph.y}%`, width: `${ph.width}%`, height: `${ph.height}%`
                                    }}
                                 />
                               ))}
                               <div className="absolute left-1/2 top-0 bottom-0 w-px bg-outline-variant/20"></div>
                            </div>
                            <p className={`mt-1.5 text-[9px] uppercase tracking-tighter text-center transition-colors truncate w-full ${activeSpread.layoutId === l.id ? 'text-primary font-bold' : 'text-on-surface-variant group-hover:text-primary'}`}>
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
      
      <div className="p-6 bg-surface-container-highest/30 border-t border-outline-variant/10 shrink-0">
         <button className="w-full py-2 bg-surface-container border border-outline-variant/20 rounded text-xs text-on-surface font-bold hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save Custom Layout (JSON)
         </button>
      </div>
    </aside>
  );
};

export default Inspector;
