import React from 'react';

/**
 * @typedef {'default' | 'tech' | 'success'} CardVariant
 * 
 * @param {Object} props
 * @param {CardVariant} [props.variant='default']
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.actions]
 * @param {string} [props.padding='p-6']
 */
const Card = ({
    children,
    variant = 'default',
    title,
    subtitle,
    actions,
    padding = 'p-6',
    className = '',
    ...props
}) => {
    const baseStyles = 'bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden relative shadow-sm dark:shadow-none';
    
    const variants = {
        default: 'border border-slate-200/60 dark:border-slate-800/50',
        tech: 'border border-purple-200 dark:border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.05)] before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-500 before:to-transparent before:opacity-50',
        success: 'border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)] before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500 before:to-transparent before:opacity-50'
    };

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            {(title || actions) && (
                <div className={`px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${padding.replace('p-', 'px-')}`}>
                    <div>
                        {title && <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>}
                        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
                    </div>
                    {actions && (
                        <div className="flex items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>
            )}
            <div className={padding}>
                {children}
            </div>
        </div>
    );
};

export default Card;
