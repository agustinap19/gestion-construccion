import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, AlertCircle } from '../icons/Icons';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onConfirm
 * @param {Function} props.onCancel
 * @param {string} props.title
 * @param {React.ReactNode} props.message
 * @param {string} [props.confirmText='Confirmar']
 * @param {string} [props.cancelText='Cancelar']
 * @param {boolean} [props.danger=false]
 * @param {boolean} [props.loading=false]
 */
const ConfirmDialog = ({
    open,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false,
    loading = false
}) => {
    return (
        <Modal open={open} onClose={onCancel} size="sm" className="!p-0">
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {danger ? <AlertCircle size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onCancel} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button 
                        variant={danger ? 'danger' : 'primary'} 
                        onClick={onConfirm} 
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
