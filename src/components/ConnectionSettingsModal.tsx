import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';

interface ConnectionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionSettingsModal: React.FC<ConnectionSettingsModalProps> = ({ isOpen, onClose }) => {
  const { apiSettings, updateApiSettings, showToast } = useProjectStore();
  
  const [endpoint, setEndpoint] = useState(apiSettings.endpoint);
  const [token, setToken] = useState(apiSettings.token);

  if (!isOpen) return null;

  const handleSave = () => {
    updateApiSettings({ endpoint, token });
    showToast('Configurações de conexão salvas!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-highest/50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">hub</span>
            <h2 className="text-on-surface font-headline font-bold text-lg">Conexão Online (SaaS)</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Endpoint do Sistema</label>
              <input
                type="text"
                placeholder="https://api.seusistema.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full bg-surface-container p-3 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-sm text-on-surface transition-all"
              />
              <p className="text-[10px] text-on-surface-variant mt-2 italic">URL base da API do sistema online.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Chave de Conexão (Token)</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Seu token de acesso"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-surface-container p-3 pr-12 rounded-xl border border-outline-variant/30 outline-none focus:border-primary text-sm text-on-surface transition-all"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40">vpn_key</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2 italic">Chave gerada no painel administrativo do sistema.</p>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              <strong>Importante:</strong> Estas configurações permitem que o aplicativo desktop se conecte à sua conta online para importar projetos e baixar fotos automaticamente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-highest/30 border-t border-outline-variant/10 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-on-surface-variant hover:bg-surface-variant rounded-full text-xs font-bold transition-all uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2 bg-primary text-on-primary rounded-full text-xs font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all uppercase tracking-wider"
          >
            Salvar Conexão
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionSettingsModal;
