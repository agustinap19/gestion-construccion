import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Camera, X } from '../icons/Icons';

export default function ImageDropzone({ file, onChange, className = "" }) {
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type.startsWith('image/')) {
                onChange(droppedFile);
            }
        }
    }, [onChange]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onChange(e.target.files[0]);
        }
    };

    const clearFile = (e) => {
        e.stopPropagation();
        onChange(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div 
            className={`relative w-full rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                isDragging 
                    ? 'border-violet-400 bg-violet-500/10' 
                    : previewUrl 
                        ? 'border-white/10 bg-white/[0.02]' 
                        : 'border-white/20 hover:border-violet-400/60 hover:bg-violet-500/5 bg-white/[0.02]'
            } ${className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
            />

            {previewUrl ? (
                <div className="relative w-full h-48 group">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#0a0a0a]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button 
                            type="button" 
                            onClick={clearFile}
                            className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <X className="w-4 h-4" /> Eliminar foto
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[12rem]">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragging ? 'bg-violet-500/20 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 text-white/40'}`}>
                        <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-white/80 mb-1">
                        {isDragging ? 'Suelta la imagen aquí' : 'Haz clic o arrastra una imagen'}
                    </p>
                    <p className="text-xs text-white/40">Soporta PNG, JPG, WebP</p>
                </div>
            )}
        </div>
    );
}
