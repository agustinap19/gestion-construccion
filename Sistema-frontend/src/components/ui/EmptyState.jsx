import React from 'react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]
 */
const EmptyState = ({
    icon,
    title,
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 mb-4 ring-1 ring-slate-200 dark:ring-slate-700/50">
                {icon}
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
            )}
            {action && (
                <div>{action}</div>
            )}
        </div>
    );
};

export default EmptyState;
