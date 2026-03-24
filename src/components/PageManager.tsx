import React, { useState } from 'react';
import { useProjectStore, type AlbumTemplate } from '../store/useProjectStore';
import { scanTemplateImage } from '../utils/templateScanner';
import ConfirmDialog from './ConfirmDialog';

interface PageManagerProps {
  onClose: () => void;
}

const PageManager: React.FC<PageManagerProps> = ({ onClose }) => {
  const { 
    binderies, addBindery, updateBindery, deleteBindery,
    albumTemplates, addAlbumTemplate, updateAlbumTemplate, deleteAlbumTemplate,
    showToast
  } = useProjectStore();

  const [selectedBinderyId, setSelectedBinderyId] = useState<string | null>(
    binderies.length > 0 ? binderies[0].id : null
  );
  const [isEditingBindery, setIsEditingBindery] = useState(false);
  const [editingBinderyId, setEditingBinderyId] = useState<string | null>(null);
  const [binderyName, setBinderyName] = useState('');
  
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [binderyToDeleteId, setBinderyToDeleteId] = useState<string | null>(null);
  const [templateToDeleteId, setTemplateToDeleteId] = useState<string | null>(null);
  
  const [templateForm, setTemplateForm] = useState<Omit<AlbumTemplate, 'id' | 'binderyId'>>({
    name: '',
    spreadWidth: 600,
    spreadHeight: 300,
    bleed: 5,
    description: ''
  });

  const selectedBindery = binderies.find((b) => b.id === selectedBinderyId);
  const templates = albumTemplates.filter((t) => t.binderyId === selectedBinderyId);
  
  const bToDelete = binderies.find((b) => b.id === binderyToDeleteId);
  const tToDelete = albumTemplates.find((t) => t.id === templateToDeleteId);

  const handleAddBindery = () => {
    if (!binderyName.trim()) return;
    if (editingBinderyId) {
      updateBindery(editingBinderyId, binderyName);
      showToast('Empresa atualizada');
    } else {
      addBindery(binderyName);
      showToast('Empresa adicionada');
    }
    setBinderyName('');
    setIsEditingBindery(false);
    setEditingBinderyId(null);
  };

  const handleSaveTemplate = () => {
    if (!selectedBinderyId || !templateForm.name.trim()) return;

    if (editingTemplateId) {
      updateAlbumTemplate(editingTemplateId, templateForm);
      showToast('Modelo atualizado');
    } else {
      addAlbumTemplate({ ...templateForm, binderyId: selectedBinderyId });
      showToast('Modelo adicionado');
    }

    setIsAddingTemplate(false);
    setEditingTemplateId(null);
    setTemplateForm({
      name: '',
      spreadWidth: 600,
      spreadHeight: 300,
      bleed: 5,
      description: ''
    });
  };

  const startEditTemplate = (t: AlbumTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateForm({
      name: t.name,
      spreadWidth: t.spreadWidth,
      spreadHeight: t.spreadHeight,
      bleed: t.bleed,
      description: t.description || ''
    });
    setIsAddingTemplate(true);
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const result = await scanTemplateImage(file);
      setTemplateForm({
        ...templateForm,
        spreadWidth: result.spreadWidth,
        spreadHeight: result.spreadHeight,
        bleed: result.bleedMm
      });
      showToast(`Detectado: ${result.spreadWidth}x${result.spreadHeight}mm com sangria de ${result.bleedMm}mm`, 'info');
    } catch (err) {
      showToast('Erro ao ler Gabarito', 'warning');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      
      <ConfirmDialog
        isOpen={!!binderyToDeleteId}
        title="Excluir Encadernadora"
        message={`Deseja realmente excluir "${bToDelete?.name}"? Todos os modelos vinculados também serão removidos.`}
        onConfirm={() => {
          if (binderyToDeleteId) deleteBindery(binderyToDeleteId);
          setBinderyToDeleteId(null);
        }}
        onCancel={() => setBinderyToDeleteId(null)}
      />

      <ConfirmDialog
        isOpen={!!templateToDeleteId}
        title="Excluir Modelo"
        message={`Deseja realmente excluir o modelo "${tToDelete?.name}"?`}
        onConfirm={() => {
          if (templateToDeleteId) deleteAlbumTemplate(templateToDeleteId);
          setTemplateToDeleteId(null);
        }}
        onCancel={() => setTemplateToDeleteId(null)}
      />

      <div className="bg-surface-container-highest w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20 flex flex-col h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-high/30">
          <div>
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tighter">Gerenciamento de Páginas</h2>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">Encadernadoras e Modelos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Binderies */}
          <div className="w-64 border-r border-outline-variant/10 bg-surface-container-low flex flex-col">
            <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Encadernadoras</span>
              <button 
                onClick={() => { setIsEditingBindery(true); setBinderyName(''); }}
                className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center text-primary"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {binderies.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBinderyId(b.id)}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center justify-between group ${
                    selectedBinderyId === b.id ? 'bg-primary text-on-primary shadow-lg' : 'hover:bg-surface-variant text-on-surface'
                  }`}
                >
                  <span className="font-medium truncate">{b.name}</span>
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${selectedBinderyId === b.id ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingBinderyId(b.id); 
                        setBinderyName(b.name); 
                        setIsEditingBindery(true); 
                      }}
                      className="material-symbols-outlined text-sm hover:text-primary"
                    >
                      edit
                    </span>
                    <span 
                      onClick={(e) => { e.stopPropagation(); setBinderyToDeleteId(b.id); }}
                      className="material-symbols-outlined text-sm hover:text-error"
                    >
                      delete
                    </span>
                  </div>
                </button>
              ))}

              {isEditingBindery && (
                <div className="p-2 space-y-2 animate-in slide-in-from-top-2">
                  <input
                    autoFocus
                    type="text"
                    value={binderyName}
                    onChange={(e) => setBinderyName(e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full bg-surface-container p-2 rounded-lg border border-primary outline-none text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBindery()}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddBindery} className="flex-1 py-1 px-2 bg-primary text-on-primary text-[10px] font-bold uppercase rounded-md">Salvar</button>
                    <button onClick={() => setIsEditingBindery(false)} className="flex-1 py-1 px-2 bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase rounded-md">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Templates */}
          <div className="flex-1 flex flex-col bg-surface-container-lowest overflow-hidden">
            {selectedBindery ? (
              <>
                <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-headline font-bold text-on-surface">{selectedBindery.name}</h3>
                    <p className="text-xs text-on-surface-variant">Modelos cadastrados para esta encadernadora</p>
                  </div>
                  <button 
                    onClick={() => { setIsAddingTemplate(true); setEditingTemplateId(null); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:scale-[1.02] transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">add_box</span>
                    Novo Modelo
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  {templates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map((t) => (
                        <div key={t.id} className="group p-5 bg-surface-container rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-on-surface">{t.name}</h4>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditTemplate(t)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors">
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button onClick={() => setTemplateToDeleteId(t.id)} className="text-on-surface-variant hover:text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors">
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-4 mb-4">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Dimensão: <span className="text-on-surface">{t.spreadWidth} × {t.spreadHeight} mm (Lâmina)</span>
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                Sangria: <span className="text-on-surface">{t.bleed} mm</span>
                              </div>
                            </div>
                            {t.description && (
                              <p className="text-xs text-on-surface-variant line-clamp-2">{t.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <span className="material-symbols-outlined text-6xl font-light mb-4">inventory_2</span>
                      <p className="font-medium text-on-surface">Nenhum modelo cadastrado</p>
                      <p className="text-xs">Comece adicionando as dimensões exatas da {selectedBindery.name}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
                <span className="material-symbols-outlined text-8xl font-light mb-4">storefront</span>
                <h3 className="text-2xl font-headline font-bold">Gerenciamento de Encadernadoras</h3>
                <p className="max-w-md mx-auto mt-2">Selecione uma encadernadora à esquerda para gerenciar seus modelos ou adicione uma nova empresa para começar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Template Form Modal (Simple overlay) */}
        {isAddingTemplate && (
          <div className="absolute inset-0 z-[110] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-12">
            <div className="bg-surface-container-high w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-highest">
                <h4 className="font-bold text-on-surface">
                  {editingTemplateId ? 'Editar Modelo' : 'Novo Modelo para ' + selectedBindery?.name}
                </h4>
                <div className="flex gap-2">
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                    isScanning ? 'bg-primary/20 text-primary animate-pulse' : 'bg-primary text-on-primary hover:scale-[1.02]'
                  }`}>
                    <span className="material-symbols-outlined text-[14px]">{isScanning ? 'sync' : 'photo_library'}</span>
                    {isScanning ? 'Lendo...' : 'Scan Gabarito'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleScanFile} disabled={isScanning} />
                  </label>
                  <button onClick={() => setIsAddingTemplate(false)} className="p-1.5 hover:bg-surface-variant rounded-full text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Nome do Modelo</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    placeholder="Ex: 30x30 Signature"
                    className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface transition-all"
                  />
                </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Largura Lâmina (mm)</label>
                      <input
                        type="number"
                        value={templateForm.spreadWidth}
                        onChange={(e) => setTemplateForm({...templateForm, spreadWidth: Number(e.target.value)})}
                        className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface transition-all"
                      />
                    </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Altura Lâmina (mm)</label>
                    <input
                      type="number"
                      value={templateForm.spreadHeight}
                      onChange={(e) => setTemplateForm({...templateForm, spreadHeight: Number(e.target.value)})}
                      className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Sangria (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={templateForm.bleed}
                      onChange={(e) => setTemplateForm({...templateForm, bleed: Number(e.target.value)})}
                      className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">Observações (opcional)</label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                    placeholder="Notas sobre o acabamento ou restrições..."
                    rows={3}
                    className="w-full bg-surface-container-highest p-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-on-surface transition-all resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-surface-container flex justify-end gap-3 border-t border-outline-variant/10">
                <button 
                  onClick={() => setIsAddingTemplate(false)}
                  className="px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] text-on-surface-variant hover:bg-surface-variant transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!templateForm.name.trim()}
                  className="px-8 py-2.5 bg-primary text-on-primary rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {editingTemplateId ? 'Atualizar' : 'Salvar Modelo'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PageManager;
