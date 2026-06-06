import React, { useState } from 'react';

/**
 * Tabs component - soporta dos modos:
 * 
 * 1. Controlado (sin children): Solo renderiza las tabs, el padre maneja el contenido
 *    <Tabs tabs={tabs} activeTab={activeTab} onChange={onChange} />
 *
 * 2. Auto-contenido (con children como dict): Renderiza tabs + contenido automáticamente
 *    <Tabs tabs={[{id:'info', label:'Info'}, ...]}>
 *        {{ info: <Card>...</Card>, datos: <Card>...</Card> }}
 *    </Tabs>
 */
const Tabs = ({
    tabs,
    activeTab: controlledActiveTab,
    onChange: controlledOnChange,
    children,
    className = ''
}) => {
    const [internalTab, setInternalTab] = useState(tabs[0]?.id || tabs[0]?.key || '');
    
    // Determinar si es controlado o auto
    const isControlled = controlledActiveTab !== undefined && controlledOnChange !== undefined;
    const activeTab = isControlled ? controlledActiveTab : internalTab;
    const handleChange = isControlled ? controlledOnChange : setInternalTab;

    // Normalizar tabs: soportar tanto {id, label} como {key, label}
    const normalizedTabs = tabs.map(t => ({
        id: t.id || t.key,
        label: t.label,
        icon: t.icon,
        badge: t.badge,
    }));

    // Determinar el contenido de las tabs (si children es un object dict)
    const tabContentMap = children && typeof children === 'object' && !React.isValidElement(children) ? children : null;

    return (
        <div className={className}>
            <div className="border-b border-slate-200 dark:border-slate-800/80">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {normalizedTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleChange(tab.id)}
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

            {/* Render tab content if children is a content map */}
            {tabContentMap && (
                <div className="mt-6 animate-fade-in" key={activeTab}>
                    {tabContentMap[activeTab] || null}
                </div>
            )}
        </div>
    );
};

export default Tabs;
