import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'primary' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, 
  confirmLabel = 'Excluir', variant = 'danger' 
}) => {
  if (!isOpen) return null;

  const variantClasses = {
    danger: 'bg-error text-white shadow-error/20',
    primary: 'bg-primary text-on-primary shadow-primary/20',
    info: 'bg-info text-on-info shadow-info/20'
  };

  const iconClasses = {
    danger: 'text-error',
    primary: 'text-primary',
    info: 'text-info'
  };

  const iconName = {
    danger: 'warning',
    primary: 'add_circle',
    info: 'info'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl p-6 max-w-sm w-full flex flex-col scale-100 transition-all">
        <div className="flex items-center gap-3 mb-3">
          <span className={`material-symbols-outlined ${iconClasses[variant]} text-3xl`}>{iconName[variant]}</span>
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
            className={`px-4 py-2 rounded text-sm font-bold hover:brightness-110 shadow-lg transition-all uppercase tracking-wider ${variantClasses[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
