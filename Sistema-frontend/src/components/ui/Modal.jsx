import React, { useEffect } from 'react';
import { X } from '../icons/Icons';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md']
 */
const Modal = ({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    className = ''
}) => {
    // Cerrar con Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && open) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        
        // Bloquear scroll
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [open, onClose]);

    if (!open) return null;

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div 
                className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full ${sizes[size]} max-h-[90vh] flex flex-col overflow-hidden animate-scale-in ${className}`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
                    {title && <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>}
                    <button
                        onClick={onClose}
                        className="ml-auto flex items-center justify-center h-8 w-8 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
