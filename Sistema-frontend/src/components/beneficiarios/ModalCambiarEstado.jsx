import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import FloatingInput from '../ui/FloatingInput';

const ModalCambiarEstado = ({ isOpen, onClose, beneficiario, transiciones, onGuardar }) => {
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [razon, setRazon] = useState('');
    const [fecha, setFecha] = useState('');
    const [loading, setLoading] = useState(false);

    if (!beneficiario) return null;

    const handleGuardar = async () => {
        setLoading(true);
        try {
            const payload = { estado_seleccion: nuevoEstado };
            if (['retirado', 'rechazado'].includes(nuevoEstado)) {
                payload.razon = razon;
            }
            if (nuevoEstado === 'aceptado' && fecha) {
                payload.fecha_aceptacion = fecha;
            }
            if (nuevoEstado === 'vivienda_entregada' && fecha) {
                payload.fecha_entrega_vivienda = fecha;
            }

            await onGuardar(payload);
            setNuevoEstado('');
            setRazon('');
            setFecha('');
        } finally {
            setLoading(false);
        }
    };

    const config = {
        'candidato': { label: 'Candidato', color: 'text-slate-400' },
        'aceptado': { label: 'Aceptado', color: 'text-blue-400' },
        'en_construccion': { label: 'En Construcción', color: 'text-yellow-400' },
        'vivienda_entregada': { label: 'Vivienda Entregada', color: 'text-emerald-400' },
        'retirado': { label: 'Retirado', color: 'text-orange-400' },
        'rechazado': { label: 'Rechazado', color: 'text-red-400' }
    };

    const requiereRazon = ['retirado', 'rechazado'].includes(nuevoEstado);
    const requiereFechaAceptacion = nuevoEstado === 'aceptado';
    const requiereFechaEntrega = nuevoEstado === 'vivienda_entregada';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Estado del Beneficiario">
            <div className="space-y-4">
                <p className="text-sm text-slate-400">
                    Selecciona el nuevo estado para <span className="text-white font-medium">{beneficiario.nombre_completo}</span>. 
                    Actualmente se encuentra como <span className="text-white font-medium">{config[beneficiario.estado_seleccion]?.label}</span>.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    {transiciones.length === 0 ? (
                        <div className="col-span-2 p-3 bg-slate-800/50 rounded-lg text-center text-slate-400 text-sm border border-slate-700/50">
                            No hay transiciones permitidas desde este estado.
                        </div>
                    ) : (
                        transiciones.map(estado => (
                            <button
                                key={estado}
                                onClick={() => setNuevoEstado(estado)}
                                className={`p-3 rounded-xl border transition-all text-left ${
                                    nuevoEstado === estado 
                                        ? 'bg-slate-800 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                }`}
                            >
                                <span className={`block font-medium ${config[estado]?.color}`}>{config[estado]?.label}</span>
                            </button>
                        ))
                    )}
                </div>

                {requiereRazon && (
                    <div className="mt-4 animate-fadeIn">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Razón obligatoria <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={razon}
                            onChange={(e) => setRazon(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                            rows="3"
                            placeholder="Escribe el motivo del cambio de estado..."
                        ></textarea>
                    </div>
                )}

                {requiereFechaAceptacion && (
                    <div className="mt-4 animate-fadeIn">
                        <FloatingInput
                            type="date"
                            label="Fecha de Aceptación (Opcional)"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            icon={<span className="text-slate-400 pl-3">📅</span>}
                        />
                        <p className="text-xs text-slate-500 mt-1">Si dejas esto en blanco, se usará la fecha de hoy.</p>
                    </div>
                )}

                {requiereFechaEntrega && (
                    <div className="mt-4 animate-fadeIn">
                        <FloatingInput
                            type="date"
                            label="Fecha de Entrega (Opcional)"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            icon={<span className="text-slate-400 pl-3">📅</span>}
                        />
                        <p className="text-xs text-slate-500 mt-1">Si dejas esto en blanco, se usará la fecha de hoy.</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/50">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button 
                        variant="primary" 
                        onClick={handleGuardar}
                        disabled={!nuevoEstado || loading || (requiereRazon && !razon.trim())}
                        isLoading={loading}
                    >
                        Confirmar Cambio
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalCambiarEstado;
