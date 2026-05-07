import React from 'react';

/**
 * @typedef {Object} TabItem
 * @property {string} key
 * @property {string} label
 * @property {React.ReactNode} [icon]
 * @property {React.ReactNode} [badge]
 * 
 * @param {Object} props
 * @param {TabItem[]} props.tabs
 * @param {string} props.activeTab
 * @param {Function} props.onChange
 */
const Tabs = ({
    tabs,
    activeTab,
    onChange,
    className = ''
}) => {
    return (
        <div className={`border-b border-slate-200 dark:border-slate-800/80 ${className}`}>
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => onChange(tab.key)}
                            className={`
                                group relative flex items-center py-4 px-1 text-sm font-medium transition-colors outline-none
                                ${isActive 
                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }
                            `}
                        >
                            {tab.icon && (
                                <span className={`mr-2 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>
                                    {tab.icon}
                                </span>
                            )}
                            {tab.label}
                            {tab.badge && (
                                <span className="ml-2">
                                    {tab.badge}
                                </span>
                            )}
                            
                            {/* Animated indicator */}
                            <div className={`absolute bottom-0 left-0 w-full h-[2px] rounded-t-full transition-transform duration-300 origin-center
                                ${isActive ? 'bg-emerald-600 dark:bg-emerald-500 shadow-none dark:shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-transparent scale-x-0'}
                            `} />
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Tabs;
