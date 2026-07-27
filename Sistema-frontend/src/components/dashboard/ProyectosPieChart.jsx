import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../ui/Card';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

const ProyectosPieChart = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <Card className="h-[300px] flex flex-col items-center justify-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 self-start">Estado de Proyectos</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <p>No hay proyectos registrados</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-[300px] flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Estado de Proyectos</h3>
            <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ProyectosPieChart;
