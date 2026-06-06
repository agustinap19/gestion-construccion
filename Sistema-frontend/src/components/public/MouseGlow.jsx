import React, { useEffect, useState, useCallback } from 'react';

const MouseGlow = () => {
    const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = useCallback((e) => {
        requestAnimationFrame(() => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY,
            });
        });
    }, []);

    const handleMouseOver = useCallback((e) => {
        if (e.target.closest('button, a, input, select, textarea')) {
            setIsHovering(true);
        } else {
            setIsHovering(false);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseover', handleMouseOver);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, [handleMouseMove, handleMouseOver]);

    return (
        <div
            className="fixed inset-0 pointer-events-none z-0 transition-all duration-500 ease-out"
            style={{
                background: `
                    radial-gradient(
                        ${isHovering ? '800px' : '600px'} circle at ${mousePosition.x}px ${mousePosition.y}px, 
                        rgba(139, 92, 246, ${isHovering ? '0.18' : '0.12'}), 
                        transparent 80%
                    ),
                    radial-gradient(
                        ${isHovering ? '300px' : '200px'} circle at ${mousePosition.x}px ${mousePosition.y}px, 
                        rgba(16, 185, 129, ${isHovering ? '0.08' : '0.04'}), 
                        transparent 60%
                    )
                `
            }}
        />
    );
};

export default MouseGlow;
