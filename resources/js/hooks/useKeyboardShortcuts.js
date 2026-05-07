import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLayout } from '../context/LayoutContext';

const useKeyboardShortcuts = (props = {}) => {
    const navigate = useNavigate();
    const { toggleTheme } = useTheme();
    const { toggleSidebar } = useLayout();
    const { 
        onSearchShortcut, 
        onEscape 
    } = props;

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignorar atajos si el foco está en un input o textarea
            const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            
            // Permitir 'Escape' incluso en inputs
            if (e.key === 'Escape') {
                if (onEscape) onEscape();
                return;
            }

            if (isInputFocused) return;

            // Ctrl+K o Cmd+K para Búsqueda
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (onSearchShortcut) onSearchShortcut();
            }

            // Ctrl+B o Cmd+B para Toggle Sidebar
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }

            // Ctrl+Shift+L para Toggle Theme
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                toggleTheme();
            }

            // Ctrl+, para Configuración
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                navigate('/dashboard/configuracion');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, toggleTheme, toggleSidebar, onSearchShortcut, onEscape]);
};

export default useKeyboardShortcuts;
