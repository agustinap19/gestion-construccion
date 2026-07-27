import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Card from '../ui/Card';

const AvanceChart = ({ data }) => {
    return (
        <Card className="h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Tendencia Financiera (Ejecutado vs Planificado)</h3>
            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorEjecutado" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPlanificado" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Area type="monotone" dataKey="planificado" name="Planificado" stroke="#6366f1" fillOpacity={1} fill="url(#colorPlanificado)" />
                        <Area type="monotone" dataKey="ejecutado" name="Ejecutado" stroke="#10b981" fillOpacity={1} fill="url(#colorEjecutado)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default AvanceChart;
