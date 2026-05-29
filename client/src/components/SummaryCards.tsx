import React from 'react';
import { Smartphone, Clock, Activity, Signal, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface HistoryEntry {
    timestamp: string;
    target: string;
    platform: string;
    status: string;
    rtt: number;
    median: number;
    threshold: number;
}

interface SummaryCardsProps {
    data: HistoryEntry[];
    targetDevice?: string;
    privacyMode?: boolean;
}

export function SummaryCards({ data, targetDevice, privacyMode = false }: SummaryCardsProps) {
    if (data.length === 0) {
        return null;
    }

    // Calculate extended metadata
    const latest = data[data.length - 1];
    const oldest = data[0];

    // Time span
    const timeSpan = new Date(latest.timestamp).getTime() - new Date(oldest.timestamp).getTime();
    const hoursSpan = Math.floor(timeSpan / (1000 * 60 * 60));
    const daysSpan = Math.floor(hoursSpan / 24);
    const timeSpanStr = daysSpan > 0
        ? `${daysSpan} day${daysSpan > 1 ? 's' : ''}`
        : `${hoursSpan} hour${hoursSpan > 1 ? 's' : ''}`;

    // Status counts
    const onlineCount = data.filter(d => d.status === 'Online').length;
    const standbyCount = data.filter(d => d.status === 'Standby').length;
    const offlineCount = data.filter(d => d.status === 'Offline' || d.status === 'OFFLINE').length;
    const totalCount = onlineCount + standbyCount + offlineCount;

    // RTT statistics
    const rttValues = data.map(d => d.rtt).filter(r => r > 0);
    const avgRtt = rttValues.length > 0
        ? Math.round(rttValues.reduce((a, b) => a + b, 0) / rttValues.length)
        : 0;
    const minRtt = rttValues.length > 0 ? Math.min(...rttValues) : 0;
    const maxRtt = rttValues.length > 0 ? Math.max(...rttValues) : 0;

    // Online time percentage
    const onlinePercentage = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

    // Blur device ID in privacy mode
    const blurredId = privacyMode ? latest.target.replace(/\d/g, '•') : latest.target;

    const cards = [
        {
            title: 'Device ID',
            value: blurredId,
            icon: Smartphone,
            color: 'purple',
            subtitle: latest.platform.toUpperCase()
        },
        {
            title: 'Monitoring Period',
            value: timeSpanStr,
            icon: Clock,
            color: 'blue',
            subtitle: `${data.length} data points`
        },
        {
            title: 'Current Status',
            value: latest.status,
            icon: Activity,
            color: latest.status === 'Online' ? 'green' : latest.status === 'Standby' ? 'yellow' : 'red',
            subtitle: `Online ${onlinePercentage}% of time`
        },
        {
            title: 'Avg RTT',
            value: `${avgRtt} ms`,
            icon: Signal,
            color: 'indigo',
            subtitle: `Min: ${minRtt} ms | Max: ${maxRtt} ms`
        }
    ];

    const colorClasses = {
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <div
                        key={index}
                        className={clsx(
                            'p-5 rounded-xl border-2 shadow-sm',
                            colorClasses[card.color as keyof typeof colorClasses]
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                                    {card.title}
                                </p>
                                <p className="text-2xl font-bold mt-1">{card.value}</p>
                                <p className="text-xs mt-1 opacity-70">{card.subtitle}</p>
                            </div>
                            <Icon className="opacity-50" size={20} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
