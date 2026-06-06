import React, { useState } from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.content
 * @param {React.ReactNode} props.children
 * @param {'top' | 'bottom' | 'left' | 'right'} [props.position='top']
 */
const Tooltip = ({
    content,
    children,
    position = 'top',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrows = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent'
    };

    return (
        <div 
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}
            
            {isVisible && (
                <div className={`absolute z-50 whitespace-nowrap animate-fade-in ${positions[position]}`}>
                    <div className="bg-slate-800 text-slate-100 text-xs font-medium px-2.5 py-1.5 rounded shadow-lg border border-slate-700/50">
                        {content}
                        <div className={`absolute w-0 h-0 border-[4px] ${arrows[position]}`} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
