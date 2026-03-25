import React from 'react';
import { useProjectStore } from '../store/useProjectStore';

interface EditorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditorSettingsModal: React.FC<EditorSettingsModalProps> = ({ isOpen, onClose }) => {
  const { albumConfig, setAlbumConfig } = useProjectStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-high border border-outline-variant/20 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-highest/50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">settings</span>
            <h2 className="text-on-surface font-headline font-bold text-lg">Configurações do Editor</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Organization Mode */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-on-surface mb-1 uppercase tracking-wider">Organização de Lâmina</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Define o comportamento do layout ao remover fotos de uma lâmina já organizada.
                </p>
              </div>
              
              <button
                onClick={() => setAlbumConfig({ autoLayoutOnRemove: !albumConfig.autoLayoutOnRemove })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${albumConfig.autoLayoutOnRemove ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${albumConfig.autoLayoutOnRemove ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-2">
              <div className={`p-3 rounded-xl border transition-all ${albumConfig.autoLayoutOnRemove ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-surface-container border-outline-variant/10 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-primary">auto_fix</span>
                  <span className="text-[11px] font-bold uppercase tracking-tight">Modo Automático</span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  Ao deletar uma foto, o layout é recalculado para o novo número de imagens, preenchendo toda a lâmina.
                </p>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${!albumConfig.autoLayoutOnRemove ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-surface-container border-outline-variant/10 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">crop_free</span>
                  <span className="text-[11px] font-bold uppercase tracking-tight">Manter Espaçamento</span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  A moldura permanece vazia no local original. Ideal para quem deseja substituir a foto manualmente.
                </p>
              </div>
            </div>
          </div>

          {/* Info Hint */}
          <div className="p-4 bg-info/5 rounded-xl border border-info/10 flex gap-3">
            <span className="material-symbols-outlined text-info text-2xl">info</span>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Dica: Você pode arrastar fotos diretamente para molduras vazias ou usar as setas do teclado para alternar layouts rapidamente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-highest/30 border-t border-outline-variant/10 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all uppercase tracking-wider"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorSettingsModal;
