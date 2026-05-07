import React, { useEffect, useState } from 'react';
import { useLoading } from '../../context/LoadingContext';

const GlobalLoadingBar = () => {
    const { isLoading } = useLoading();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval;
        if (isLoading) {
            setProgress(15);
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 10;
                });
            }, 500);
        } else {
            setProgress(100);
            const timeout = setTimeout(() => {
                setProgress(0);
            }, 300);
            return () => clearTimeout(timeout);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    if (progress === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent overflow-hidden pointer-events-none">
            <div 
                className="h-full bg-emerald-500 transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
            >
                {/* Efecto de brillo */}
                <div className="absolute top-0 right-0 bottom-0 w-[100px] bg-gradient-to-r from-transparent to-white/30 animate-[shimmer_1.5s_infinite]" />
            </div>
        </div>
    );
};

export default GlobalLoadingBar;
