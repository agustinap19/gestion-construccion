import React from 'react';

const CategoriaProyectoBadge = ({ categoria }) => {
    const config = {
        social: {
            label: 'Social',
            bg: 'bg-cyan-500/10 border-cyan-500/20',
            text: 'text-cyan-400',
            icon: (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        privado: {
            label: 'Privado',
            bg: 'bg-violet-500/10 border-violet-500/20',
            text: 'text-violet-400',
            icon: (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
                </svg>
            ),
        },
    };

    const c = config[categoria] || config.privado;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-lg ${c.bg} ${c.text}`}>
            {c.icon}
            {c.label}
        </span>
    );
};

export default CategoriaProyectoBadge;
