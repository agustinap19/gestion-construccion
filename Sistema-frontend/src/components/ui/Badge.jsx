import React from 'react';

/**
 * @typedef {'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'tech'} BadgeVariant
 * 
 * @param {Object} props
 * @param {BadgeVariant} [props.variant='neutral']
 * @param {React.ReactNode} [props.icon]
 */
const Badge = ({
    children,
    variant = 'neutral',
    icon,
    className = '',
    ...props
}) => {
    const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
    
    const variants = {
        success: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
        warning: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20',
        danger: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20',
        info: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20',
        neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        tech: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            {icon && <span className="mr-1.5 -ml-0.5">{icon}</span>}
            {children}
        </span>
    );
};

export default Badge;
