import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLoading } from '../../../context/LoadingContext';
import { categoriaMaterialService } from '../../../services/categoriaMaterialService';
import { X, Plus, Edit, Trash2, Tag, Check } from '../../../components/icons/Icons';
import { motion, AnimatePresence } from 'framer-motion';

const CategoriasDrawer = ({ isOpen, onClose, onSaved }) => {
    const { startLoading, stopLoading } = useLoading();
    const [categorias, setCategorias] = useState([]);
    
    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', color: '#94a3b8' });

    useEffect(() => {
        if (isOpen) {
            loadCategorias();
            resetForm();
        }
    }, [isOpen]);

    const loadCategorias = async () => {
        try {
            startLoading();
            const res = await categoriaMaterialService.getAll();
            if (res.status === 'success') {
                setCategorias(res.data);
            }
        } catch (error) {
            toast.error('Error al cargar categorías');
        } finally {
            stopLoading();
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ nombre: '', descripcion: '', color: '#94a3b8' });
    };

    const handleEditClick = (cat) => {
        setIsEditing(true);
        setEditId(cat.id);
        setFormData({
            nombre: cat.nombre,
            descripcion: cat.descripcion || '',
            color: cat.color || '#94a3b8'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta categoría? Solo será posible si no tiene materiales asignados.')) return;
        
        try {
            startLoading();
            await categoriaMaterialService.delete(id);
            toast.success('Categoría eliminada');
            loadCategorias();
            if (onSaved) onSaved();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar');
        } finally {
            stopLoading();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            startLoading();
            if (isEditing) {
                await categoriaMaterialService.update(editId, formData);
                toast.success('Categoría actualizada');
            } else {
                await categoriaMaterialService.create(formData);
                toast.success('Categoría creada');
            }
            resetForm();
            loadCategorias();
            if (onSaved) onSaved();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar categoría');
        } finally {
            stopLoading();
        }
    };

    if (!isOpen) return null;

    const presetColors = ['#94a3b8', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md h-full bg-white dark:bg-[#080c15] shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10"
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Tag size={18} className="text-emerald-500" />
                        Categorías de Materiales
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                        </h3>
                        
                        <div>
                            <input 
                                type="text"
                                placeholder="Nombre de categoría"
                                required
                                value={formData.nombre}
                                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                className="w-full bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                        
                        <div>
                            <input 
                                type="text"
                                placeholder="Descripción breve (opcional)"
                                value={formData.descripcion}
                                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                className="w-full bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-2">Color identificativo</label>
                            <div className="flex flex-wrap gap-2">
                                {presetColors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData({...formData, color})}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${formData.color === color ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-[#080c15]' : ''}`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {formData.color === color && <Check size={12} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isEditing ? <Check size={16}/> : <Plus size={16}/>}
                                {isEditing ? 'Guardar Cambios' : 'Agregar Categoría'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {categorias.map(cat => (
                        <div key={cat.id} className="glass-panel p-3 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{cat.nombre}</p>
                                    <p className="text-xs text-slate-500 mt-1">{cat.materiales_count || 0} materiales activos</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEditClick(cat)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(cat.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {categorias.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-sm text-slate-500">No hay categorías creadas aún.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CategoriasDrawer;
