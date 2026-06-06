import React from 'react';

/**
 * @param {Object} props
 * @param {string} [props.width]
 * @param {string} [props.height]
 * @param {boolean} [props.circle=false]
 * @param {number} [props.lines=1]
 */
const Skeleton = ({
    width,
    height,
    circle = false,
    lines = 1,
    className = ''
}) => {
    const baseStyle = 'animate-pulse bg-slate-200 dark:bg-slate-800/80';
    const borderRadius = circle ? 'rounded-full' : 'rounded-lg';
    
    if (lines > 1) {
        return (
            <div className="space-y-3 w-full">
                {Array.from({ length: lines }).map((_, i) => (
                    <div 
                        key={i} 
                        className={`${baseStyle} rounded-lg h-4 ${className}`}
                        style={{ width: i === lines - 1 ? '70%' : '100%' }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div 
            className={`${baseStyle} ${borderRadius} ${className}`}
            style={{ 
                width: width || '100%', 
                height: height || (circle ? width : '1rem')
            }}
        />
    );
};

export default Skeleton;
