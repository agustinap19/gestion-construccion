import React from 'react';
import Spinner from './Spinner';

/**
 * @typedef {'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 *
 * @param {Object} props
 * @param {ButtonVariant} [props.variant='primary']
 * @param {ButtonSize} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.fullWidth=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    ...props
}) => {
    const baseStyles = 'group relative inline-flex items-center justify-center font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050505] disabled:opacity-50 disabled:pointer-events-none rounded-xl';
    
    const variants = {
        primary: 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#050505] hover:bg-emerald-700 dark:hover:bg-emerald-400 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] focus:ring-emerald-500 border border-transparent',
        secondary: 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 hover:-translate-y-0.5 focus:ring-slate-500 border border-slate-300 dark:border-slate-700/50',
        danger: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white hover:-translate-y-0.5 focus:ring-red-500 border border-red-200 dark:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]',
        ghost: 'bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 focus:ring-slate-500 border border-transparent',
        outline: 'bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-600/50 dark:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 focus:ring-emerald-500'
    };

    const sizes = {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-8 text-base'
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            {...props}
        >
            {loading && <Spinner className={`mr-2 ${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} color={variant === 'primary' ? 'text-[#050505]' : 'text-current'} />}
            {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
};

export default Button;
