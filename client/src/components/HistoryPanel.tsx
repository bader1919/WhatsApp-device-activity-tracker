import React, { useEffect, useState } from 'react';
import { Clock, Calendar, Filter, Download } from 'lucide-react';
import { TimelineChart } from './TimelineChart';
import { SummaryCards } from './SummaryCards';

interface HistoryEntry {
    timestamp: string;
    target: string;
    platform: string;
    status: string;
    rtt: number;
    median: number;
    threshold: number;
}

interface HistoryPanelProps {
    contacts: Map<string, any>;
    privacyMode?: boolean;
}

export function HistoryPanel({ contacts, privacyMode = false }: HistoryPanelProps) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDevice, setSelectedDevice] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'all'>('all');

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [history, selectedDevice, dateRange]);

    const fetchHistory = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/history`);
            const result = await response.json();
            // Handle both paginated response and legacy array format
            setHistory(Array.isArray(result) ? result : (result.data || []));
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...history];

        // Filter by device
        if (selectedDevice !== 'all') {
            filtered = filtered.filter(entry => entry.target === selectedDevice);
        }

        // Filter by date range
        if (dateRange === 'today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(entry => {
                const entryDate = new Date(entry.timestamp).toDateString();
                return entryDate === today;
            });
        } else if (dateRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(entry => new Date(entry.timestamp) >= weekAgo);
        }

        setFilteredHistory(filtered);
    };

    const exportHistory = () => {
        const dataStr = JSON.stringify(filteredHistory, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tracking-history-${new Date().toISOString()}.json`;
        link.click();
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-gray-500">Loading history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Clock className="text-purple-600" size={24} />
                        <h2 className="text-xl font-semibold text-gray-900">Activity History</h2>
                        <span className="text-sm text-gray-500">({filteredHistory.length} entries)</span>
                    </div>
                    <button
                        onClick={exportHistory}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium transition-colors text-sm"
                    >
                        <Download size={16} /> Export
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Device:</span>
                        <select
                            value={selectedDevice}
                            onChange={(e) => setSelectedDevice(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="all">All Devices</option>
                            {Array.from(contacts.keys()).map(jid => (
                                <option key={jid} value={jid}>{jid}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Range:</span>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="today">Today</option>
                            <option value="week">Past Week</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <SummaryCards
                data={filteredHistory}
                targetDevice={selectedDevice !== 'all' ? selectedDevice : undefined}
                privacyMode={privacyMode}
            />

            {/* Timeline Chart */}
            <TimelineChart
                data={filteredHistory}
                targetDevice={selectedDevice !== 'all' ? selectedDevice : undefined}
                privacyMode={privacyMode}
            />
        </div>
    );
}
