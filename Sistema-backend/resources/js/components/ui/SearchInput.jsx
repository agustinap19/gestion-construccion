import React, { useState, useEffect } from 'react';
import { Search, X } from '../icons/Icons';

/**
 * @param {Object} props
 * @param {string} props.value
 * @param {Function} props.onChange
 * @param {string} [props.placeholder='Buscar...']
 * @param {Function} [props.onClear]
 */
const SearchInput = ({
    value,
    onChange,
    placeholder = 'Buscar...',
    onClear,
    className = ''
}) => {
    // Debounce state (optional internal use if parent doesn't handle it)
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e) => {
        setLocalValue(e.target.value);
        if (onChange) onChange(e.target.value);
    };

    const handleClear = () => {
        setLocalValue('');
        if (onChange) onChange('');
        if (onClear) onClear();
    };

    return (
        <div className={`relative group ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                <Search size={18} />
            </div>
            <input
                type="text"
                value={localValue}
                onChange={handleChange}
                className="block w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-600/50 dark:focus:ring-emerald-500/50 focus:border-emerald-600/50 dark:focus:border-emerald-500/50 transition-all focus:bg-slate-50 dark:focus:bg-slate-900/80 outline-none"
                placeholder={placeholder}
            />
            {localValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default SearchInput;
