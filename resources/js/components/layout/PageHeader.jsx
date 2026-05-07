import React from 'react';
import Tabs from '../ui/Tabs';

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} [props.actions]
 * @param {Array} [props.tabs]
 * @param {string} [props.activeTab]
 * @param {Function} [props.onTabChange]
 */
const PageHeader = ({
    title,
    subtitle,
    icon,
    actions,
    tabs,
    activeTab,
    onTabChange
}) => {
    return (
        <div className="mb-6 animate-fade-in">
            <div className={`pb-6 ${!tabs ? 'border-b border-slate-200 dark:border-slate-800/50' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center shrink-0 shadow-sm dark:shadow-inner">
                                {icon}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {actions && (
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            {actions}
                        </div>
                    )}
                </div>
            </div>

            {tabs && tabs.length > 0 && (
                <div className="mt-2">
                    <Tabs 
                        tabs={tabs}
                        activeTab={activeTab}
                        onChange={onTabChange}
                    />
                </div>
            )}
        </div>
    );
};

export default PageHeader;
