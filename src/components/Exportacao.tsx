import React, { useState, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import SpreadRenderer from './SpreadRenderer';
import ExportModal, { type ExportOptions } from './ExportModal';
import { toJpeg } from 'html-to-image';

const Exportacao: React.FC = () => {
  const { spreads, activeSpreadIndex, setActiveSpread, albumConfig, customLayouts, showToast } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  
  // Hidden ref for capturing
  const exportRef = useRef<HTMLDivElement>(null);
  const [captureSpreadIdx, setCaptureSpreadIdx] = useState<number | null>(null);

  const currentSpread = spreads[activeSpreadIndex];
  const currentLayout = currentSpread ? customLayouts[currentSpread.layoutId] : undefined;

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setExportPath(path);
        showToast(`Pasta de destino: ${path}`, 'info');
      }
    } else {
      showToast("Seleção de pasta disponível apenas no aplicativo desktop.", "warning");
    }
  };

  const handleStartExport = async (options: ExportOptions) => {
    setIsModalOpen(false);
    
    const targets = options.range === 'all' 
      ? spreads.map((_, i) => i) 
      : [activeSpreadIndex];

    setExportProgress(0);
    showToast(`Iniciando exportação de ${targets.length} lâmina(s)...`, 'info');

    let successCount = 0;

    for (let i = 0; i < targets.length; i++) {
       const idx = targets[i];
       setCaptureSpreadIdx(idx);
       setExportProgress(Math.round(((i + 1) / targets.length) * 100));
       
       // Wait for React to render the hidden spread
       await new Promise(resolve => setTimeout(resolve, 600));

       if (exportRef.current) {
         try {
           const dataUrl = await toJpeg(exportRef.current, { 
             quality: options.quality / 100,
             pixelRatio: options.dpi / 72, 
             backgroundColor: '#ffffff'
           });
           
           const fileName = `${options.filename}_lamina_${(idx + 1).toString().padStart(2, '0')}.jpg`;

           if (exportPath && window.electronAPI) {
              // Native Export (Silent)
              const filePath = `${exportPath}/${fileName}`;
              const success = await window.electronAPI.saveFile(filePath, dataUrl);
              if (success) successCount++;
           } else {
              // Browser Export (Download Link)
              const link = document.createElement('a');
              link.download = fileName;
              link.href = dataUrl;
              link.click();
              successCount++;
           }
         } catch (err) {
           console.error("Export error:", err);
         }
       }
    }

    setExportProgress(null);
    setCaptureSpreadIdx(null);
    showToast(`Exportação concluída! ${successCount} arquivo(s) salvos.`, 'success');
  };

  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Main Content Area: The Canvas */}
      <section className="flex-1 bg-surface flex flex-col relative overflow-hidden">
        {/* Breadcrumbs / Active Step Info */}
        <div className="px-12 pt-8 pb-4 flex justify-between items-end">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-background mb-1">Revisão Final</h1>
            <p className="text-on-surface-variant font-body text-sm tracking-wide">
              {albumConfig.name} / {spreads.length} Lâminas / Formato {albumConfig.spreadWidth}x{albumConfig.spreadHeight}
            </p>
          </div>
          {exportProgress !== null && (
             <div className="flex items-center gap-4 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Processando: {exportProgress}%</span>
             </div>
          )}
        </div>

        {/* Central Carousel */}
        <div className="flex-1 flex items-center justify-center px-12 relative min-h-[400px]">
          <button 
            onClick={() => setActiveSpread(Math.max(0, activeSpreadIndex - 1))}
            disabled={activeSpreadIndex === 0}
            className="absolute left-8 z-10 p-3 bg-surface-container/50 backdrop-blur-md rounded-full text-on-surface hover:bg-surface-container transition-all disabled:opacity-20 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="w-full max-w-5xl group relative">
            {currentSpread ? (
              <SpreadRenderer 
                spread={currentSpread}
                layout={currentLayout}
                albumConfig={albumConfig}
                className="rounded-sm shadow-2xl ring-1 ring-outline-variant/10"
              />
            ) : (
              <div className="aspect-[2/1] bg-surface-container-low rounded-lg flex items-center justify-center border-2 border-dashed border-outline-variant/30">
                 <p className="text-on-surface-variant text-sm font-medium">Nenhuma lâmina disponível</p>
              </div>
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/5 text-[10px] font-bold tracking-widest uppercase text-white shadow-xl">
              Lâmina {activeSpreadIndex + 1} de {spreads.length}
            </div>
          </div>
          <button 
            onClick={() => setActiveSpread(Math.min(spreads.length - 1, activeSpreadIndex + 1))}
            disabled={activeSpreadIndex === spreads.length - 1}
            className="absolute right-8 z-10 p-3 bg-surface-container/50 backdrop-blur-md rounded-full text-on-surface hover:bg-surface-container transition-all disabled:opacity-20 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Filmstrip / Thumbnail Tray */}
        <div className="h-32 bg-surface-container-low border-t border-outline-variant/10 px-12 flex items-center gap-4 overflow-x-auto hide-scrollbar">
          {spreads.map((s, i) => (
            <div 
              key={s.id}
              onClick={() => setActiveSpread(i)}
              className={`flex-none w-44 h-full py-4 transition-all cursor-pointer ${activeSpreadIndex === i ? 'scale-105 z-10' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
            >
              <SpreadRenderer 
                spread={s}
                layout={customLayouts[s.layoutId]}
                albumConfig={albumConfig}
                className={`h-full rounded shadow-md border-2 ${activeSpreadIndex === i ? 'border-primary' : 'border-outline-variant/20'}`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Inspector Panel: Export Options */}
      <aside className="w-96 bg-surface-container-high border-l border-outline-variant/10 flex flex-col overflow-y-auto">
        <div className="p-8">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-background mb-6">Opções de Exportação</h2>
          
          {/* Directory Selector (Electron Only) */}
          <div className="mb-8">
             <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">Destino</label>
             <button 
               onClick={handleSelectDirectory}
               className="w-full flex items-center justify-between p-3 bg-surface-container-highest/20 rounded-sm border border-outline-variant/30 hover:border-primary/50 transition-all text-left"
             >
               <div className="flex items-center gap-3 overflow-hidden">
                 <span className="material-symbols-outlined text-primary text-xl">folder_open</span>
                 <div className="overflow-hidden">
                    <p className="text-[11px] font-bold text-on-surface truncate">
                      {exportPath ? exportPath : 'Selecionar Pasta de Destino'}
                    </p>
                    <p className="text-[9px] text-on-surface-variant">
                      {exportPath ? 'Clique para alterar' : 'Exportação direta para o Windows'}
                    </p>
                 </div>
               </div>
               {exportPath && <span className="material-symbols-outlined text-success text-sm">check_circle</span>}
             </button>
          </div>

          {/* Format Selector */}
          <div className="space-y-4 mb-8">
            <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Formato</label>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-between p-4 bg-surface-bright rounded-sm border border-primary/40 group hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="material-symbols-outlined text-primary">image</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">JPEG Spreads</p>
                    <p className="text-[10px] text-on-surface-variant">Exportar lâminas em alta definição</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary">settings</span>
              </button>
              
              <button className="flex items-center justify-between p-4 bg-surface-container-highest/50 rounded-sm border border-transparent opacity-50 cursor-not-allowed text-left">
                <div className="flex items-center gap-3 text-left">
                  <span className="material-symbols-outlined text-on-surface-variant">picture_as_pdf</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface-variant text-on-surface-variant">PDF para Impressão</p>
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-tighter">Em breve</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          <div className="mt-12 space-y-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-4 rounded-sm font-headline text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/10 hover:brightness-110 active:scale-95 transition-all"
            >
              Configurar Exportação
            </button>
            <p className="text-center text-[10px] text-on-surface-variant leading-relaxed">
              As lâminas serão geradas individualmente.<br/>
              Perfeito para envio a laboratórios profissionais.
            </p>
          </div>
        </div>
      </aside>

      {/* Hidden Export Container */}
      {captureSpreadIdx !== null && (
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
          <div ref={exportRef} style={{ width: '1200px' }}>
             <SpreadRenderer 
               spread={spreads[captureSpreadIdx]}
               layout={customLayouts[spreads[captureSpreadIdx].layoutId]}
               albumConfig={albumConfig}
               showBleed={true}
             />
          </div>
        </div>
      )}

      <ExportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartExport={handleStartExport}
      />
    </main>
  );
};

export default Exportacao;
