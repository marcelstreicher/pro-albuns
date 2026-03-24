import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl p-6 max-w-sm w-full flex flex-col scale-100 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-error text-3xl">warning</span>
          <h2 className="text-on-surface font-headline font-bold text-lg">{title}</h2>
        </div>
        <p className="text-on-surface-variant text-sm mb-6 ml-10">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm text-on-surface font-medium hover:bg-surface-variant transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 rounded text-sm bg-error text-white font-bold hover:brightness-110 shadow-lg shadow-error/20 transition-all uppercase tracking-wider"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
