import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import SpreadRenderer from './SpreadRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: (options: ExportOptions) => void;
}

export interface ExportOptions {
  quality: number;
  dpi: number;
  includeBleed: boolean;
  range: 'all' | 'current';
  filename: string;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onStartExport }) => {
  const { albumConfig, spreads, activeSpreadIndex, customLayouts } = useProjectStore();
  const [options, setOptions] = useState<ExportOptions>({
    quality: 90,
    dpi: 300,
    includeBleed: false,
    range: 'all',
    filename: albumConfig.name || 'album_export'
  });

  if (!isOpen) return null;

  const currentSpread = spreads[activeSpreadIndex];
  const currentLayout = currentSpread ? customLayouts[currentSpread.layoutId] : undefined;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-surface-container-high border border-outline-variant/20 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Left Side: Settings */}
        <div className="flex-1 p-8 border-r border-outline-variant/10 space-y-8 bg-surface-container-low/50">
          <div className="flex items-center gap-3">
             <span className="material-symbols-outlined text-primary text-3xl">download_for_offline</span>
             <h2 className="text-on-surface font-headline font-extrabold text-2xl tracking-tight">Opções de Exportação</h2>
          </div>

          <div className="space-y-6">
            {/* Filename */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Nome do Arquivo</label>
              <input 
                type="text" 
                value={options.filename}
                onChange={e => setOptions({ ...options, filename: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                placeholder="Ex: album_casamento_final"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quality */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Qualidade (JPG)</label>
                <select 
                  value={options.quality}
                  onChange={e => setOptions({ ...options, quality: parseInt(e.target.value) })}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium appearance-none cursor-pointer"
                >
                  <option value={80}>Normal (80%)</option>
                  <option value={90}>Alta (90%)</option>
                  <option value={100}>Máxima (100%)</option>
                </select>
              </div>

              {/* DPI */}
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Resolução (DPI)</label>
                 <select 
                   value={options.dpi}
                   onChange={e => setOptions({ ...options, dpi: parseInt(e.target.value) })}
                   className="w-full bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium appearance-none cursor-pointer"
                 >
                   <option value={72}>Digital (72 DPI)</option>
                   <option value={150}>Média (150 DPI)</option>
                   <option value={300}>Impressão (300 DPI)</option>
                 </select>
              </div>
            </div>

            {/* Scale/Range */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Intervalo</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setOptions({ ...options, range: 'all' })}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all uppercase tracking-widest ${options.range === 'all' ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-highest'}`}
                >
                  Todas as Lâminas
                </button>
                <button 
                  onClick={() => setOptions({ ...options, range: 'current' })}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all uppercase tracking-widest ${options.range === 'current' ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20' : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-highest'}`}
                >
                  Lâmina Atual
                </button>
              </div>
            </div>

            {/* Bleed Switch */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/10 rounded-2xl">
               <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-xl ${options.includeBleed ? 'text-primary' : 'text-on-surface-variant'}`}>grid_guides</span>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Incluir Sangria</p>
                    <p className="text-[9px] text-on-surface-variant">Exportar com as margens de corte (Bleed)</p>
                  </div>
               </div>
               <button
                onClick={() => setOptions({ ...options, includeBleed: !options.includeBleed })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${options.includeBleed ? 'bg-primary' : 'bg-surface-container-highest'}`}
               >
                 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${options.includeBleed ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
            </div>
          </div>
        </div>

        {/* Right Side: Preview & Actions */}
        <div className="hidden md:flex w-[460px] flex-col p-8 bg-surface-container-highest/20">
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Preview do Arquivo</label>
          
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="w-full relative group">
               <SpreadRenderer 
                 spread={currentSpread}
                 layout={currentLayout}
                 albumConfig={albumConfig}
                 className="rounded-lg shadow-2xl ring-1 ring-white/10"
                 showBleed={options.includeBleed}
               />
               <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
                 {options.filename}.jpg
               </div>
            </div>

            <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">file_save</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface uppercase tracking-tight">Resumo do Arquivo</h4>
                    <p className="text-[10px] text-on-surface-variant">Pronto para exportação em alta qualidade</p>
                  </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-on-surface-variant uppercase tracking-wider font-bold opacity-60">Resolução Final</span>
                    <span className="text-on-surface font-mono">{options.dpi} DPI</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-on-surface-variant uppercase tracking-wider font-bold opacity-60">Formato</span>
                    <span className="text-on-surface font-mono">JPG (Qualidade {options.quality}%)</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-on-surface-variant uppercase tracking-wider font-bold opacity-60">Páginas</span>
                    <span className="text-on-surface font-mono">{options.range === 'all' ? spreads.length : 1} Lâmina(s)</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl border border-outline-variant/30 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:bg-surface-variant transition-all active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onStartExport(options)}
              className="flex-[2] py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl text-xs font-bold font-headline uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transform transition-all active:scale-95 active:brightness-95"
            >
              Iniciar Exportação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
