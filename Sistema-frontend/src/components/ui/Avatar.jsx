import React from 'react';

/**
 * @param {Object} props
 * @param {string} [props.src]
 * @param {string} [props.name='User']
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md']
 * @param {boolean} [props.online=false]
 */
const Avatar = ({
    src,
    name = 'User',
    size = 'md',
    online = false,
    className = ''
}) => {
    const getInitials = (nameStr) => {
        const parts = nameStr.trim().split(' ');
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Generar un color consistente basado en el string
    const stringToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        const color = '#' + '00000'.substring(0, 6 - c.length) + c;
        return color;
    };

    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl'
    };

    const indicatorSizes = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
        xl: 'w-4 h-4'
    };

    const bgColor = src ? 'bg-slate-800' : stringToColor(name);

    return (
        <div className={`relative inline-block ${className}`}>
            <div 
                className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white overflow-hidden ring-2 ring-white dark:ring-slate-800 shrink-0 select-none`}
                style={{ backgroundColor: !src ? bgColor : undefined }}
            >
                {src ? (
                    <img src={src} alt={name} className="w-full h-full object-cover" />
                ) : (
                    <span className="opacity-90">{getInitials(name)}</span>
                )}
            </div>
            {online && (
                <span className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-[#050505] bg-emerald-500 ${indicatorSizes[size]}`} />
            )}
        </div>
    );
};

export default Avatar;
