import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, Upload, Check, Camera } from '../../components/icons/Icons';
import { actaEntregaService } from '../../services/actaEntregaService';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button, ComponentCard, TextArea, Select, Label, ImageDropzone } from '../../components/ui';

const ESTADOS_DEVOLUCION = [
    { val: 'bueno',              label: 'Buen estado' },
    { val: 'con_observaciones',  label: 'Con observaciones' },
    { val: 'dañado',             label: 'Dañado' },
];

export default function AccionActaButton({ acta, onUpdated }) {
    const { hasPermission } = useAuth();
    const [loading, setLoading]       = useState(false);
    const [modalRechazo, setModalRechazo] = useState(false);
    const [notaRechazo, setNotaRechazo]   = useState('');
    const [modalEntrega, setModalEntrega] = useState(false);
    const [fotoEntrega, setFotoEntrega]   = useState(null);
    const [modalDevolucion, setModalDevolucion] = useState(false);
    const [estadoDevolucion, setEstadoDevolucion] = useState('bueno');
    const [fotoDevolucion, setFotoDevolucion] = useState(null);

    const inputFirmadaRef = useRef(null);
    const inputEntregaRef = useRef(null);
    const inputDevolucionRef = useRef(null);

    const ejecutar = async (fn, mensajeOk) => {
        setLoading(true);
        try {
            await fn();
            toast.success(mensajeOk);
            onUpdated?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al actualizar el acta.');
        } finally {
            setLoading(false);
        }
    };

    if (acta.estado === 'generada') {
        return (
            <Button variant="outline" size="sm" disabled={loading}
                onClick={() => ejecutar(() => actaEntregaService.marcarImpresa(acta.id), 'Acta marcada como impresa.')}
                startIcon={<Printer className="w-3.5 h-3.5" />}>
                Marcar como impresa
            </Button>
        );
    }

    if (acta.estado === 'impresa') {
        return (
            <>
                <input ref={inputFirmadaRef} type="file" accept="application/pdf" className="hidden"
                    onChange={e => {
                        const file = e.target.files[0];
                        e.target.value = '';
                        if (file) ejecutar(() => actaEntregaService.subirPdfFirmado(acta.id, file), 'Acta firmada subida.');
                    }} />
                <Button size="sm" disabled={loading} onClick={() => inputFirmadaRef.current?.click()}
                    startIcon={<Upload className="w-3.5 h-3.5" />}>
                    Subir acta firmada
                </Button>
            </>
        );
    }

    if (acta.estado === 'firmada_subida') {
        if (!hasPermission('activos.aprobar_acta')) {
            return <span className="text-xs text-gray-400 dark:text-white/30 italic">Esperando aprobación</span>;
        }
        return (
            <>
                <div className="flex items-center gap-2">
                    <Button size="sm" disabled={loading}
                        onClick={() => ejecutar(() => actaEntregaService.aprobar(acta.id), 'Acta aprobada.')}
                        startIcon={<Check className="w-3.5 h-3.5" />}>
                        Aprobar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setModalRechazo(true)}>
                        Rechazar
                    </Button>
                </div>

                <Modal isOpen={modalRechazo} onClose={() => setModalRechazo(false)} className="max-w-md w-full">
                    <div className="px-6 py-5 border-b border-white/10 pr-14">
                        <h3 className="text-base font-semibold text-white">Rechazar acta firmada</h3>
                        <p className="mt-1 text-sm text-white/50">El acta volverá a Impresa para volver a firmarse.</p>
                    </div>
                    <div className="p-6">
                        <TextArea
                            rows={3}
                            value={notaRechazo}
                            onChange={e => setNotaRechazo(e.target.value)}
                            placeholder="Motivo del rechazo (mínimo 10 caracteres)"
                        />
                        <div className="mt-5 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setModalRechazo(false)}>Cancelar</Button>
                            <Button disabled={notaRechazo.trim().length < 10 || loading}
                                onClick={() => ejecutar(async () => {
                                    await actaEntregaService.rechazar(acta.id, notaRechazo.trim());
                                    setModalRechazo(false);
                                    setNotaRechazo('');
                                }, 'Acta rechazada.')}>
                                Rechazar acta
                            </Button>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }

    if (acta.estado === 'aprobada') {
        if (!hasPermission('activos.registrar_entrega')) return null;
        return (
            <>
                <Button size="sm" disabled={loading} onClick={() => setModalEntrega(true)}
                    startIcon={<Camera className="w-3.5 h-3.5" />}>
                    Registrar entrega
                </Button>

                <Modal isOpen={modalEntrega} onClose={() => setModalEntrega(false)} className="max-w-md w-full">
                    <div className="px-6 py-5 border-b border-white/10 pr-14">
                        <h3 className="text-base font-semibold text-white">Registrar entrega</h3>
                        <p className="mt-1 text-sm text-white/50">Sube una foto que evidencie la entrega del activo.</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-5">
                            <div>
                                <Label>Foto de la entrega</Label>
                                <div className="mt-2">
                                    <ImageDropzone file={fotoEntrega} onChange={setFotoEntrega} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setModalEntrega(false)}>Cancelar</Button>
                            <Button disabled={!fotoEntrega || loading}
                                onClick={() => ejecutar(async () => {
                                    await actaEntregaService.subirFotoEntrega(acta.id, fotoEntrega);
                                    setModalEntrega(false);
                                    setFotoEntrega(null);
                                }, 'Entrega registrada.')}>
                                Confirmar entrega
                            </Button>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }

    if (acta.estado === 'entregada') {
        if (!hasPermission('activos.registrar_entrega')) return null;
        return (
            <>
                <Button variant="outline" size="sm" onClick={() => setModalDevolucion(true)}
                    startIcon={<Camera className="w-3.5 h-3.5" />}>
                    Registrar devolución
                </Button>

                <input ref={inputDevolucionRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => setFotoDevolucion(e.target.files[0] || null)} />

                <Modal isOpen={modalDevolucion} onClose={() => setModalDevolucion(false)} className="max-w-md w-full">
                    <div className="px-6 py-5 border-b border-white/10 pr-14">
                        <h3 className="text-base font-semibold text-white">Registrar devolución</h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-5">
                            <div>
                                <Label>Estado del activo al devolver</Label>
                                <div className="mt-1">
                                    <Select value={estadoDevolucion} onChange={e => setEstadoDevolucion(e.target.value)}>
                                        {ESTADOS_DEVOLUCION.map(e => <option key={e.val} value={e.val}>{e.label}</option>)}
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Foto de la devolución</Label>
                                <div className="mt-2">
                                    <ImageDropzone file={fotoDevolucion} onChange={setFotoDevolucion} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setModalDevolucion(false)}>Cancelar</Button>
                            <Button disabled={!fotoDevolucion || loading}
                                onClick={() => ejecutar(async () => {
                                    await actaEntregaService.subirFotoDevolucion(acta.id, fotoDevolucion, estadoDevolucion);
                                    setModalDevolucion(false);
                                    setFotoDevolucion(null);
                                }, 'Devolución registrada.')}>
                                Confirmar devolución
                            </Button>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }

    if (acta.estado === 'devuelta') {
        return <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Completada</span>;
    }

    return null;
}
