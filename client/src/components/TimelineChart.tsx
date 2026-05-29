import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';

interface HistoryEntry {
    timestamp: string;
    target: string;
    platform: string;
    status: string;
    rtt: number;
    median: number;
    threshold: number;
}

interface TimelineChartProps {
    data: HistoryEntry[];
    targetDevice?: string;
    privacyMode?: boolean;
}

export function TimelineChart({ data, targetDevice, privacyMode = false }: TimelineChartProps) {
    // Generate unique gradient ID for this chart instance to prevent collisions
    const gradientId = `colorRtt-${Math.random().toString(36).substr(2, 9)}`;

    if (data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Activity className="text-purple-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Device State Timeline</h3>
                </div>
                <p className="text-gray-500 text-center py-8">No data available for the selected filters</p>
            </div>
        );
    }

    // Transform data for chart
    const chartData = data.map(entry => ({
        time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullTime: new Date(entry.timestamp).toLocaleString(),
        rtt: entry.rtt,
        median: entry.median,
        threshold: entry.threshold,
        status: entry.status,
        statusValue: entry.status === 'Online' ? 1 : entry.status === 'Standby' ? 0.5 : 0
    }));

    // Get latest stats
    const latest = data[data.length - 1];
    const avgRtt = data.reduce((sum, d) => sum + d.rtt, 0) / data.length;
    const onlineCount = data.filter(d => d.status === 'Online').length;
    const standbyCount = data.filter(d => d.status === 'Standby').length;
    const offlineCount = data.filter(d => d.status === 'Offline' || d.status === 'OFFLINE').length;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Activity className="text-purple-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Device State Timeline</h3>
                    {targetDevice && <span className="text-sm text-gray-500">({privacyMode ? targetDevice.replace(/\d/g, '•') : targetDevice})</span>}
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Online: {onlineCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Standby: {standbyCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Offline: {offlineCount}</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="time"
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                        stroke="#6b7280"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        label={{ value: 'RTT (ms)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label) => {
                            const entry = chartData.find(d => d.time === label);
                            return entry ? entry.fullTime : String(label);
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="rtt"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill={`url(#${gradientId})`}
                        name="RTT"
                    />
                    <Line
                        type="monotone"
                        dataKey="median"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="Median"
                    />
                    <ReferenceLine
                        y={latest.threshold}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={{ value: 'Threshold', fill: '#f59e0b', fontSize: 11 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
