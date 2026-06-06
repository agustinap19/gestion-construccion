import React, { useState, useEffect, useRef } from 'react';

/**
 * @typedef {Object} DropdownItem
 * @property {string} label
 * @property {React.ReactNode} [icon]
 * @property {Function} onClick
 * @property {boolean} [danger=false]
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.trigger
 * @param {DropdownItem[]} props.items
 * @param {'left' | 'right' | 'top'} [props.align='right']
 */
const Dropdown = ({
    trigger,
    items,
    align = 'right',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const positionClasses = {
        'right': 'mt-2 right-0 origin-top-right top-full',
        'left': 'mt-2 left-0 origin-top-left top-full',
        'top': 'mb-2 right-0 bottom-full origin-bottom-right'
    };

    const alignmentClass = positionClasses[align] || positionClasses.right;

    return (
        <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div className={`absolute z-50 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-scale-in ${alignmentClass}`}>
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {items.map((item, index) => {
                            if (item.divider) {
                                return <div key={index} className="h-px bg-slate-200 dark:bg-slate-800/80 my-1 mx-2" />;
                            }
                            return (
                                <button
                                    key={index}
                                    onClick={() => {
                                        if (item.onClick) item.onClick();
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center transition-colors
                                        ${item.danger 
                                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300' 
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    role="menuitem"
                                >
                                    {item.icon && <span className="mr-3 shrink-0 opacity-80">{item.icon}</span>}
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dropdown;
