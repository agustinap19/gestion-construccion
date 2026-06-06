import React, { useState, useEffect, useRef } from 'react';

const AnimatedCounter = ({ value, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        setCount(Math.floor(progress * value));
                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        } else {
                            setHasAnimated(true);
                            setCount(value); // Asegurar el valor exacto al final
                        }
                    };
                    window.requestAnimationFrame(step);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (countRef.current) {
            observer.observe(countRef.current);
        }

        return () => {
            if (countRef.current) observer.disconnect();
        };
    }, [value, duration, hasAnimated]);

    return <span ref={countRef}>{count}</span>;
};

const Stats = () => {
    const statsData = [
        { id: 1, prefix: '+', value: 15, suffix: '', label: 'Años de Experiencia' },
        { id: 2, prefix: '+', value: 250, suffix: '', label: 'Proyectos Entregados' },
        { id: 3, prefix: '', value: 100, suffix: '%', label: 'Precisión Algorítmica' },
        { id: 4, prefix: '', value: 0, suffix: '', label: 'Días de Retraso Promedio' }
    ];

    return (
        <section className="bg-black py-16 relative z-10 border-b border-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
                    {statsData.map((stat, index) => (
                        <div 
                            key={stat.id} 
                            className={`flex flex-col items-center justify-center py-4 ${
                                index !== statsData.length - 1 ? 'lg:border-r border-slate-800' : ''
                            }`}
                        >
                            <div className="text-4xl md:text-5xl font-extrabold text-emerald-500 mb-2 flex items-center drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                <span>{stat.prefix}</span>
                                <AnimatedCounter value={stat.value} duration={2500} />
                                <span>{stat.suffix}</span>
                            </div>
                            <div className="text-slate-400 font-medium text-sm md:text-base tracking-wide">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Stats;
