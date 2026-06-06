import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from '../icons/Icons';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_HEADER = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

const pad2 = (n) => String(n).padStart(2, '0');

const parseYMD = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

const toYMD = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const toDMY = (str) => {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
};

const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfMonth = (y, m) => new Date(y, m, 1);

const buildGrid = (year, month) => {
    const first = new Date(year, month, 1);
    // JS getDay(): 0=Sun, convert to Mon-based: Mon=0..Sun=6
    let dow = first.getDay() - 1;
    if (dow < 0) dow = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < dow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
};

const DatePickerInput = ({ label, value = '', onChange, maxDate, minDate, error, required, placeholder = 'dd/mm/aaaa' }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getInitialView = () => {
        const parsed = parseYMD(value);
        if (parsed) return { year: parsed.getFullYear(), month: parsed.getMonth() };
        if (maxDate) return { year: maxDate.getFullYear(), month: maxDate.getMonth() };
        return { year: today.getFullYear(), month: today.getMonth() };
    };

    const [open, setOpen] = useState(false);
    const [view, setView] = useState(getInitialView);
    const containerRef = useRef(null);
    const btnRef = useRef(null);

    const syncViewToValue = useCallback(() => {
        const parsed = parseYMD(value);
        if (parsed) {
            setView({ year: parsed.getFullYear(), month: parsed.getMonth() });
        } else if (maxDate) {
            setView({ year: maxDate.getFullYear(), month: maxDate.getMonth() });
        } else {
            setView({ year: today.getFullYear(), month: today.getMonth() });
        }
    }, [value, maxDate]);

    const handleOpen = () => {
        if (!open) syncViewToValue();
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const prevMonth = () => setView(v => {
        if (v.month === 0) return { year: v.year - 1, month: 11 };
        return { year: v.year, month: v.month - 1 };
    });

    const nextMonth = () => setView(v => {
        if (v.month === 11) return { year: v.year + 1, month: 0 };
        return { year: v.year, month: v.month + 1 };
    });

    const isDisabled = (day) => {
        const d = new Date(view.year, view.month, day);
        d.setHours(0, 0, 0, 0);
        if (maxDate) { const mx = new Date(maxDate); mx.setHours(0, 0, 0, 0); if (d > mx) return true; }
        if (minDate) { const mn = new Date(minDate); mn.setHours(0, 0, 0, 0); if (d < mn) return true; }
        return false;
    };

    const handleDay = (day) => {
        if (!day || isDisabled(day)) return;
        onChange(toYMD(new Date(view.year, view.month, day)));
        setOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
    };

    const cells = buildGrid(view.year, view.month);
    const selected = parseYMD(value);

    const btnCls = [
        'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 text-left',
        'bg-white border-slate-200 text-slate-900',
        'dark:bg-slate-900/50 dark:border-slate-700/50 dark:text-slate-200',
        error
            ? 'ring-2 ring-red-500/40 border border-red-500/30'
            : 'border focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40',
    ].join(' ');

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}

            <button type="button" ref={btnRef} onClick={handleOpen} className={btnCls}>
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className={value ? 'flex-1' : 'flex-1 text-slate-400 dark:text-slate-500'}>
                    {value ? toDMY(value) : placeholder}
                </span>
                {value && (
                    <span
                        onMouseDown={handleClear}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5 rounded transition-colors"
                        title="Limpiar"
                    >
                        ×
                    </span>
                )}
            </button>

            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

            {open && (
                <div
                    className="absolute left-0 top-full mt-1.5 z-50 w-72"
                    style={{
                        background: 'rgba(10,15,30,0.97)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderRadius: '1rem',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
                        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-sm font-bold text-white">
                            {MESES[view.month]} {view.year}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                        {DIAS_HEADER.map(d => (
                            <div key={d} className="text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
                        {cells.map((day, i) => {
                            if (!day) return <div key={`e-${i}`} />;

                            const cellDate = new Date(view.year, view.month, day);
                            cellDate.setHours(0, 0, 0, 0);
                            const disabled = isDisabled(day);
                            const isToday = isSameDay(cellDate, today);
                            const isSelected = selected && isSameDay(cellDate, selected);

                            let cellStyle = {};
                            let cellCls = 'relative w-9 h-9 flex items-center justify-center rounded-full text-xs font-medium mx-auto transition-all duration-150 ';

                            if (isSelected) {
                                cellCls += 'text-white font-bold ';
                                cellStyle = { background: 'rgba(16,185,129,0.9)', boxShadow: '0 0 12px rgba(52,211,153,0.45)' };
                            } else if (disabled) {
                                cellCls += 'text-slate-600 opacity-30 cursor-not-allowed ';
                            } else {
                                cellCls += 'text-slate-300 cursor-pointer ';
                                cellStyle = {};
                            }

                            return (
                                <div key={`d-${day}`} className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleDay(day)}
                                        className={cellCls}
                                        style={cellStyle}
                                        onMouseEnter={e => {
                                            if (!disabled && !isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!disabled && !isSelected) e.currentTarget.style.background = '';
                                        }}
                                    >
                                        {day}
                                        {isToday && !isSelected && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer bar */}
                    <div
                        className="flex items-center justify-between px-4 py-2 rounded-b-2xl"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                    >
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Limpiar
                        </button>
                        {maxDate && (
                            <span className="text-[10px] text-slate-600">
                                Máx: {toDMY(toYMD(maxDate))}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePickerInput;
