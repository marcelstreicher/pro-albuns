import React, { useState } from 'react';
import { useProjectStore, type MediaItem, type AlbumConfig } from '../store/useProjectStore';
import { fetchOnlineProjects, fetchProjectPhotos, importOnlineMedia, type OnlineProject } from '../utils/onlineSync';

interface ProjectWizardProps {
  onClose: () => void;
}

const steps = [
  { id: 'identity', title: 'Identidade', icon: 'edit_square' },
  { id: 'format', title: 'Formato', icon: 'straighten' },
  { id: 'pages', title: 'Páginas', icon: 'auto_stories' },
  { id: 'media', title: 'Fotografias', icon: 'add_a_photo' }
];

const ProjectWizard: React.FC<ProjectWizardProps> = ({ onClose }) => {
  const { initProject, binderies, albumTemplates } = useProjectStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  
  const [selectedBinderyId, setSelectedBinderyId] = useState<string>(
    binderies.length > 0 ? binderies[0].id : ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [numPages, setNumPages] = useState(20);
  const [initialPhotos, setInitialPhotos] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Online Import States
  const { apiSettings, showToast } = useProjectStore();
  const [showImportView, setShowImportView] = useState(false);
  const [onlineProjects, setOnlineProjects] = useState<OnlineProject[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [filterPhysical, setFilterPhysical] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<{ completed: number, total: number } | null>(null);

  const availableTemplates = albumTemplates.filter(t => t.binderyId === selectedBinderyId);

  const handleFinish = () => {
    let config: Partial<AlbumConfig> = { 
      numPages,
      binderyId: selectedBinderyId,
      templateId: selectedTemplateId
    };

    const template = albumTemplates.find(t => t.id === selectedTemplateId);
    if (template) {
      config.spreadWidth = template.spreadWidth;
      config.spreadHeight = template.spreadHeight;
      config.bleed = template.bleed;
    } else {
      // Fallback/Standard if no template selected (should not happen with UI validation)
      config.spreadWidth = 600;
      config.spreadHeight = 300;
      config.bleed = 5;
    }

    initProject(name || 'Meu Álbum', config, initialPhotos);
    onClose();
  };

  const processFiles = (files: File[]) => {
    const newPhotos: MediaItem[] = files
      .filter(f => f.type.startsWith('image/'))
      .map(f => {
        // In Electron, File objects have a 'path' property which is the absolute path.
        // We use it to create a persistent file:/// URL.
        const electronPath = (f as any).path;
        const path = electronPath 
          ? `file:///${electronPath.replace(/\\/g, '/')}` 
          : URL.createObjectURL(f);
          
        return {
          path,
          aspect: 'H' // Default, will be refined in the store/editor
        };
      });
    setInitialPhotos((prev: MediaItem[]) => [...prev, ...newPhotos]);
  };

  const handleNativeSelect = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.selectFiles();
      if (selected && selected.length > 0) {
        const newPhotos = selected.map(path => ({ path, aspect: 'H' as const }));
        setInitialPhotos((prev: MediaItem[]) => [...prev, ...newPhotos]);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep((s: number) => s + 1);
    else handleFinish();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-highest w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20 flex flex-col min-h-[500px] max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tighter">Novo Projeto</h2>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">Configuração do Álbum</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Stepper Header */}
        <div className="px-8 py-3 bg-surface-container-high/50 flex justify-between relative">
          <div className="absolute top-1/2 left-8 right-8 h-px bg-outline-variant/20 -translate-y-1/2"></div>
          {steps.map((step, idx) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[xs] font-bold transition-all duration-300 ${
                idx <= currentStep ? 'bg-primary text-on-primary shadow-lg scale-110' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {idx < currentStep ? <span className="material-symbols-outlined text-xs">check</span> : idx + 1}
              </div>
              <span className={`text-[9px] uppercase font-bold tracking-widest ${idx === currentStep ? 'text-primary' : 'text-on-surface-variant'}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
          
          {currentStep === 0 && !showImportView && (
            <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-primary font-light">draw</span>
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Dê um nome ao seu projeto</h3>
              <input
                autoFocus
                type="text"
                placeholder="Ex: Casamento di Marina & Marco"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container p-4 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-lg text-on-surface transition-all text-center"
              />

              <div className="pt-4 border-t border-outline-variant/10">
                <button
                  onClick={async () => {
                    if (!apiSettings.endpoint || !apiSettings.token) {
                      showToast('Configure a conexão online no Dashboard primeiro.', 'warning');
                      return;
                    }
                    setIsFetching(true);
                    try {
                      const projs = await fetchOnlineProjects(apiSettings.endpoint, apiSettings.token);
                      setOnlineProjects(projs);
                      setShowImportView(true);
                    } catch (e) {
                      showToast('Erro ao conectar ao sistema online.', 'warning');
                    } finally {
                      setIsFetching(false);
                    }
                  }}
                  disabled={isFetching}
                  className="w-full py-4 bg-surface-container-high border border-outline-variant/30 rounded-xl text-primary font-bold uppercase tracking-widest text-[10px] hover:bg-surface-bright transition-all flex items-center justify-center gap-3 group"
                >
                  <span className={`material-symbols-outlined text-lg ${isFetching ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
                    {isFetching ? 'sync' : 'cloud_download'}
                  </span>
                  {isFetching ? 'Conectando...' : 'Importar do Sistema Online'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 0 && showImportView && (
            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="text-left">
                  <h3 className="text-xl font-headline font-bold text-on-surface">Selecione o Projeto Online</h3>
                  <p className="text-xs text-on-surface-variant">Listando projetos ativos no seu sistema</p>
                </div>
                <button 
                  onClick={() => setShowImportView(false)}
                  className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:bg-surface-variant rounded-lg"
                >
                  Cancelar
                </button>
              </div>

                <label className="flex items-center gap-4 bg-surface-container/50 p-4 rounded-xl border border-outline-variant/10">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filterPhysical} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterPhysical(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Apenas com Álbum Físico criado</span>
                </label>
              </label>

              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {onlineProjects
                  .filter((p: OnlineProject) => !filterPhysical || p.hasPhysicalAlbum)
                  .map((p: OnlineProject) => (
                    <button
                      key={p.id}
                      onClick={async () => {
                        const dest = await window.electronAPI.selectDirectory();
                        if (!dest) return;

                        setIsFetching(true);
                        try {
                          const photos = await fetchProjectPhotos(apiSettings.endpoint, apiSettings.token, p.id);
                          if (photos.length === 0) {
                            showToast('Este projeto não possui fotos para importar.', 'info');
                            return;
                          }

                          const downloaded = await importOnlineMedia(photos, dest, (prog) => {
                            setDownloadProgress(prog);
                          });

                          setName(p.name);
                          setInitialPhotos(downloaded);
                          setShowImportView(false);
                          setCurrentStep(1); // Pular para configuração de saída
                          showToast(`Importação de "${p.name}" concluída!`, 'success');
                        } catch (e) {
                          showToast('Erro ao importar projeto online.', 'warning');
                        } finally {
                          setIsFetching(false);
                          setDownloadProgress(null);
                        }
                      }}
                      className="group flex items-center justify-between p-4 bg-surface-container hover:bg-surface-container-highest border border-outline-variant/20 hover:border-primary/40 rounded-xl transition-all text-left"
                    >
                      <div>
                        <div className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{p.name}</div>
                        <div className="text-[10px] text-on-surface-variant flex items-center gap-2 mt-1">
                          <span className="material-symbols-outlined text-[12px]">id_card</span> {p.id}
                          {p.hasPhysicalAlbum && (
                            <>
                              <span className="w-1 h-1 bg-outline-variant/40 rounded-full"></span>
                              <span className="text-primary font-bold">ÁLBUM CRIADO</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-all group-hover:translate-x-1">chevron_right</span>
                    </button>
                  ))}
                  
                {onlineProjects.filter((p: OnlineProject) => !filterPhysical || p.hasPhysicalAlbum).length === 0 && (
                  <div className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p className="text-xs uppercase font-bold tracking-widest">Nenhum projeto encontrado</p>
                  </div>
                )}
              </div>

              {downloadProgress && (
                <div className="absolute inset-0 z-50 bg-surface-container-highest/95 backdrop-blur flex flex-col items-center justify-center p-12 text-center rounded-2xl animate-in fade-in duration-300">
                  <div className="w-24 h-24 relative mb-6">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle className="text-outline-variant/20 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                      <circle 
                        className="text-primary stroke-current transition-all duration-300" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        fill="transparent" 
                        r="40" cx="50" cy="50" 
                        style={{ 
                          strokeDasharray: '251.2', 
                          strokeDashoffset: 251.2 - (251.2 * (downloadProgress.completed / downloadProgress.total)) 
                        }} 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-headline font-bold text-primary">{Math.round((downloadProgress.completed / downloadProgress.total) * 100)}%</span>
                    </div>
                  </div>
                  <h4 className="text-lg font-headline font-bold text-on-surface">Baixando Fotografias...</h4>
                  <p className="text-xs text-on-surface-variant mt-2 uppercase tracking-widest font-bold">
                    {downloadProgress.completed} de {downloadProgress.total} baixadas
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-headline font-bold text-on-surface">Configuração de Saída</h3>
              
              <div className="grid grid-cols-2 gap-8 text-left">
                {/* Bindery Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">1. Encadernadora</label>
                  {binderies.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                       {binderies.map(b => (
                         <button
                           key={b.id}
                           onClick={() => { setSelectedBinderyId(b.id); setSelectedTemplateId(''); }}
                           className={`px-4 py-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                             selectedBinderyId === b.id ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-outline-variant/20 hover:border-primary/40'
                           }`}
                         >
                           <span className={`text-sm font-bold ${selectedBinderyId === b.id ? 'text-on-surface' : 'text-on-surface-variant'}`}>{b.name}</span>
                           {selectedBinderyId === b.id && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                         </button>
                       ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-container rounded-xl border border-dashed border-outline-variant/40 text-center">
                      <p className="text-[11px] text-on-surface-variant mb-3">Nenhuma encadernadora configurada</p>
                      <button 
                        onClick={() => { onClose(); /* We should have a way to open PageManager here */ }}
                        className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                      >
                        Configurar agora
                      </button>
                    </div>
                  )}
                </div>

                {/* Template Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">2. Tamanho / Modelo</label>
                  {availableTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {availableTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                            selectedTemplateId === t.id ? 'border-primary bg-primary/5 ring-2 ring-primary/10' : 'border-outline-variant/20 hover:border-primary/40'
                          }`}
                        >
                          <div className={`text-sm font-bold ${selectedTemplateId === t.id ? 'text-on-surface' : 'text-on-surface-variant'}`}>{t.name}</div>
                          <div className="text-[10px] text-on-surface-variant mt-0.5">{t.spreadWidth}x{t.spreadHeight} mm • Sangria {t.bleed}mm</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 bg-surface-container rounded-xl border border-dashed border-outline-variant/40 text-center opacity-50">
                       <span className="material-symbols-outlined text-3xl mb-1">straighten</span>
                       <p className="text-[10px]">Selecione uma encadernadora com modelos cadastrados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-primary font-light">auto_stories</span>
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Número de páginas</h3>
              <p className="text-sm text-on-surface-variant max-w-xs mx-auto">Mínimo de 20 páginas. Cada lâmina equivale a duas páginas.</p>
              
              <div className="flex items-center justify-center gap-8 mt-6">
                <button 
                  onClick={() => setNumPages((p: number) => Math.max(20, p - 2))}
                  className="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-surface-variant text-on-surface transition-all"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-headline font-bold text-primary tracking-tighter">{numPages}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mt-1">Páginas</span>
                </div>
                <button 
                  onClick={() => setNumPages((p: number) => Math.min(100, p + 2))}
                  className="w-12 h-12 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-surface-variant text-on-surface transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">
                Equivale a {numPages / 2} Lâminas
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*"
                className="hidden"
                style={{ display: 'none' }}
              />
              <h3 className="text-xl font-headline font-bold text-on-surface">Adicione as primeiras fotos</h3>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                  isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-outline-variant/30 bg-surface-container-high'
                }`}
              >
                {initialPhotos.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-6 justify-center overflow-y-auto max-h-full">
                    {initialPhotos.map((p, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-white/20 shadow-lg animate-in zoom-in-50 duration-200">
                        <img src={p.path} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <div 
                      onClick={handleNativeSelect}
                      className="w-16 h-16 rounded-lg bg-surface-container-highest border border-dashed border-outline-variant/40 flex items-center justify-center text-on-surface-variant cursor-pointer hover:bg-surface-variant"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 font-light animate-pulse">cloud_upload</span>
                    <p className="text-on-surface font-medium">Arraste seus arquivos para começar</p>
                    <button
                      onClick={handleNativeSelect}
                      className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/20 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                      Selecionar Arquivos
                    </button>
                    <p className="text-xs text-on-surface-variant mt-2">JPEG, PNG ou TIFF suportados</p>
                  </>
                )}
              </div>
              {initialPhotos.length > 0 && (
                <p className="text-[10px] uppercase font-bold text-primary tracking-widest animate-bounce">
                  {initialPhotos.length} fotos selecionadas. Pronto para criar!
                </p>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-surface-container flex justify-between items-center border-t border-outline-variant/10">
          <button
            onClick={() => setCurrentStep((s: number) => s - 1)}
            disabled={currentStep === 0}
            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all ${
              currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            Voltar
          </button>
          
          <button
            onClick={nextStep}
            disabled={(currentStep === 0 && !name.trim()) || (currentStep === 1 && (!selectedBinderyId || !selectedTemplateId))}
            className={`px-10 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all shadow-xl flex items-center gap-2 ${
              ((currentStep === 0 && !name.trim()) || (currentStep === 1 && (!selectedBinderyId || !selectedTemplateId))) ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed grayscale' : 'primary-gradient text-on-primary hover:scale-[1.02] active:scale-95'
            }`}
          >
            {currentStep === steps.length - 1 ? 'Criar Álbum' : 'Continuar'}
            <span className="material-symbols-outlined text-sm">
              {currentStep === steps.length - 1 ? 'auto_awesome' : 'arrow_forward'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProjectWizard;
