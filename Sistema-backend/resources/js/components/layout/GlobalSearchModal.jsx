import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from '../icons/Icons';
import EmptyState from '../ui/EmptyState';

const GlobalSearchModal = ({ open, onClose }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            // timeout para permitir que el modal se renderice antes de hacer focus
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            setQuery('');
        }
    }, [open]);

    // Cerrar con click fuera y Escape es manejado por el hook general, 
    // pero también podemos agregarlo aquí para aislar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && open) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 sm:px-6">
            <div 
                className="fixed inset-0 bg-[#050505]/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
                <div className="flex items-center px-4 py-4 border-b border-slate-200 dark:border-slate-800">
                    <Search size={20} className="text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar en todo el sistema..."
                        className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 px-4 py-2 text-lg"
                    />
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center gap-2 text-xs font-semibold"
                    >
                        <span className="hidden sm:inline bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">ESC</span>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 sm:p-8 min-h-[300px] flex flex-col">
                    {query.length > 0 ? (
                        <EmptyState 
                            icon={<Search size={32} />}
                            title={`Sin resultados para "${query}"`}
                            description="La búsqueda global unificada será implementada próximamente."
                        />
                    ) : (
                        <div className="text-center text-slate-500 my-auto">
                            <p className="mb-4 text-sm font-medium">Búsquedas recientes</p>
                            <p className="text-xs text-slate-400">No hay búsquedas recientes.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
