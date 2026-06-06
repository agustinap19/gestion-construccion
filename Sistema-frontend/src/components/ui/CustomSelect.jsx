import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search } from '../icons/Icons';

/**
 * Reemplaza el <select> nativo con un dropdown estilizado.
 *
 * Props:
 *  - value: string|number
 *  - onChange: (value) => void
 *  - options: { value, label, disabled? }[]
 *  - placeholder: string
 *  - label: string
 *  - error: string
 *  - disabled: bool
 *  - searchable: bool
 *  - className: string
 *  - size: 'sm' | 'md' (default md)
 */
const CustomSelect = ({
    value,
    onChange,
    options = [],
    placeholder = 'Seleccionar...',
    label,
    error,
    disabled = false,
    searchable = false,
    className = '',
    size = 'md',
}) => {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const searchRef = useRef(null);
    const listRef = useRef(null);

    const selected = options.find(o => String(o.value) === String(value));

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus al input de búsqueda cuando se abre
    useEffect(() => {
        if (open && searchable && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 60);
        }
    }, [open, searchable]);

    const toggleOpen = () => {
        if (disabled) return;
        setOpen(v => !v);
        if (open) setSearch('');
    };

    const handleSelect = (opt) => {
        if (opt.disabled) return;
        onChange(opt.value);
        setOpen(false);
        setSearch('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') { setOpen(false); setSearch(''); }
        if (e.key === 'Enter' || e.key === ' ') { if (!open) setOpen(true); }
    };

    const filtered = searchable && search
        ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const heightClass = size === 'sm' ? 'h-9 text-xs px-3' : 'h-[42px] text-sm px-3.5';

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                    {label}
                </label>
            )}

            {/* Trigger */}
            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={toggleOpen}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={[
                    'w-full flex items-center justify-between rounded-xl border transition-all duration-200 outline-none focus-visible:ring-2',
                    heightClass,
                    disabled
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
                        : open
                            ? 'bg-white dark:bg-slate-900/80 border-emerald-500 dark:border-emerald-500/70 ring-2 ring-emerald-500/20 dark:ring-emerald-500/15 shadow-sm'
                            : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.14] shadow-sm',
                    error ? 'border-red-400 dark:border-red-500/60' : '',
                ].join(' ')}
            >
                <span className={selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    size={15}
                    className={`shrink-0 ml-2 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    role="listbox"
                    ref={listRef}
                    className={[
                        'absolute z-[999] w-full mt-1.5 rounded-xl overflow-hidden',
                        'bg-white/95 dark:bg-[#0e1420]/95',
                        'backdrop-blur-2xl',
                        'border border-slate-200/80 dark:border-white/[0.08]',
                        'shadow-[0_8px_32px_oklch(0%_0_0/0.12)] dark:shadow-[0_8px_40px_oklch(0%_0_0/0.5)]',
                        'animate-scale-in origin-top',
                    ].join(' ')}
                    style={{ maxHeight: '260px', display: 'flex', flexDirection: 'column' }}
                >
                    {/* Barra de búsqueda */}
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
                            <div className="relative">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full h-8 pl-8 pr-3 text-sm bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.07] rounded-lg outline-none focus:border-emerald-400 dark:focus:border-emerald-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Lista */}
                    <ul className="overflow-y-auto scrollbar-thin p-1.5" style={{ flex: 1 }}>
                        {filtered.length === 0 ? (
                            <li className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-600">
                                Sin resultados
                            </li>
                        ) : filtered.map((opt) => {
                            const isSelected = String(opt.value) === String(value);
                            return (
                                <li
                                    key={opt.value}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(opt)}
                                    className={[
                                        'flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer select-none transition-colors duration-150',
                                        opt.disabled
                                            ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                            : isSelected
                                                ? 'bg-emerald-50 dark:bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300 font-medium'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05]',
                                    ].join(' ')}
                                >
                                    <span>{opt.label}</span>
                                    {isSelected && (
                                        <Check size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {error && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
            )}
        </div>
    );
};

export default CustomSelect;
