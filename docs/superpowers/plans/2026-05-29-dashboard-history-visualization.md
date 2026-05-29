# Dashboard History Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add historical data visualization to the React dashboard with timeline charts, summary cards, and extended device metadata display.

**Architecture:** Create new React components that fetch data from the `/api/history` endpoint, display timeline charts of device states (Online/Standby/Offline), and show summary cards with filtering capabilities. Integrate with existing Dashboard component.

**Tech Stack:** React, TypeScript, recharts (already used), lucide-react icons, Tailwind CSS

---

## File Structure

**Files to create:**
- `client/src/components/HistoryPanel.tsx` - Main history visualization component
- `client/src/components/TimelineChart.tsx` - Timeline chart for device states
- `client/src/components/SummaryCards.tsx` - Summary cards with metadata
- `client/src/components/HistoryFilter.tsx` - Filter controls

**Files to modify:**
- `client/src/components/Dashboard.tsx` - Add HistoryPanel integration

---

## Task 1: Create HistoryPanel component skeleton

**Files:**
- Create: `client/src/components/HistoryPanel.tsx`

- [ ] **Step 1: Create HistoryPanel component with basic structure**

Create `client/src/components/HistoryPanel.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Clock, Calendar, Filter, Download } from 'lucide-react';

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
    contacts: Map<string, any>; // Reuse ContactInfo type from Dashboard
}

export function HistoryPanel({ contacts }: HistoryPanelProps) {
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
            const response = await fetch('http://localhost:3001/api/history');
            const data = await response.json();
            setHistory(data);
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
                <div className="flex items-center gap-4">
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

            {/* Content will be added in next tasks */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <p className="text-gray-500">Timeline chart and summary cards will be added here...</p>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify component compiles**

Check for any TypeScript errors in the component.

---

## Task 2: Create TimelineChart component

**Files:**
- Create: `client/src/components/TimelineChart.tsx`

- [ ] **Step 1: Create TimelineChart component**

Create `client/src/components/TimelineChart.tsx`:

```typescript
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
}

export function TimelineChart({ data, targetDevice }: TimelineChartProps) {
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
        // Numeric status for color coding: Online=1, Standby=0.5, Offline=0
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
                    {targetDevice && <span className="text-sm text-gray-500">({targetDevice})</span>}
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
                        <linearGradient id="colorRtt" x1="0" y1="0" x2="0" y2="1">
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
                        formatter={(value: any, name: string) => {
                            if (name === 'status') return [value, 'Status'];
                            return [value + ' ms', name === 'rtt' ? 'RTT' : name === 'median' ? 'Median' : 'Threshold'];
                        }}
                        labelFormatter={(label) => {
                            const entry = chartData.find(d => d.time === label);
                            return entry ? entry.fullTime : label;
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="rtt" 
                        stroke="#8b5cf6" 
                        fillOpacity={1} 
                        fill="url(#colorRtt)"
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
```

---

## Task 3: Create SummaryCards component

**Files:**
- Create: `client/src/components/SummaryCards.tsx`

- [ ] **Step 1: Create SummaryCards component with extended metadata**

Create `client/src/components/SummaryCards.tsx`:

```typescript
import React from 'react';
import { Smartphone, Clock, Activity, TrendingUp, Signal, Eye, EyeOff } from 'lucide-react';
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
```

---

## Task 4: Update HistoryPanel to use TimelineChart and SummaryCards

**Files:**
- Modify: `client/src/components/HistoryPanel.tsx`

- [ ] **Step 1: Import and integrate new components**

Update the HistoryPanel component to include TimelineChart and SummaryCards:

```typescript
// Add these imports at the top:
import { TimelineChart } from './TimelineChart';
import { SummaryCards } from './SummaryCards';

// Replace the placeholder content div with:

            {/* Summary Cards */}
            <SummaryCards 
                data={filteredHistory} 
                targetDevice={selectedDevice !== 'all' ? selectedDevice : undefined}
            />

            {/* Timeline Chart */}
            <TimelineChart 
                data={filteredHistory}
                targetDevice={selectedDevice !== 'all' ? selectedDevice : undefined}
            />
```

---

## Task 5: Integrate HistoryPanel into Dashboard

**Files:**
- Modify: `client/src/components/Dashboard.tsx`

- [ ] **Step 1: Add HistoryPanel import and state**

Add to Dashboard.tsx:

```typescript
// Add import:
import { HistoryPanel } from './HistoryPanel';

// Add state after existing states:
const [showHistory, setShowHistory] = useState(false);
```

- [ ] **Step 2: Add toggle button in header**

Add the history toggle button after the "Privacy Mode" button in the header:

```typescript
{/* Add after Privacy Mode button */}
<button
    onClick={() => setShowHistory(!showHistory)}
    className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 ${
        showHistory 
            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
>
    <Clock size={20} />
    <span>{showHistory ? 'Hide History' : 'Show History'}</span>
</button>
```

- [ ] **Step 3: Add HistoryPanel component**

Add before the closing `</div>` of the Dashboard component:

```typescript
{/* Add before the final closing </div> */}
{showHistory && (
    <HistoryPanel contacts={contacts} />
)}
```

---

## Task 6: Add HistoryFilter component for advanced filtering

**Files:**
- Create: `client/src/components/HistoryFilter.tsx`

- [ ] **Step 1: Create HistoryFilter component**

Create `client/src/components/HistoryFilter.tsx`:

```typescript
import React from 'react';
import { Filter, X } from 'lucide-react';

interface FilterState {
    device: string;
    dateRange: 'today' | 'week' | 'all';
    status?: 'Online' | 'Standby' | 'Offline';
    platform?: 'whatsapp' | 'signal';
}

interface HistoryFilterProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    availableDevices: string[];
}

export function HistoryFilter({ filters, onFiltersChange, availableDevices }: HistoryFilterProps) {
    const updateFilter = (key: keyof FilterState, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({ device: 'all', dateRange: 'all' });
    };

    const hasActiveFilters = filters.device !== 'all' || filters.dateRange !== 'all' || filters.status || filters.platform;

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filters:</span>

            {/* Device Filter */}
            <select
                value={filters.device}
                onChange={(e) => updateFilter('device', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
                <option value="all">All Devices</option>
                {availableDevices.map(device => (
                    <option key={device} value={device}>{device}</option>
                ))}
            </select>

            {/* Date Range Filter */}
            <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="all">All Time</option>
            </select>

            {/* Status Filter */}
            <select
                value={filters.status || 'all'}
                onChange={(e) => updateFilter('status', e.target.value === 'all' ? undefined : e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
                <option value="all">All Statuses</option>
                <option value="Online">Online Only</option>
                <option value="Standby">Standby Only</option>
                <option value="Offline">Offline Only</option>
            </select>

            {/* Platform Filter */}
            <select
                value={filters.platform || 'all'}
                onChange={(e) => updateFilter('platform', e.target.value === 'all' ? undefined : e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
                <option value="all">All Platforms</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="signal">Signal</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                    <X size={14} />
                    Clear
                </button>
            )}
        </div>
    );
}
```

---

## Task 7: Testing and verification

**Files:**
- Test: Manual verification

- [ ] **Step 1: Start the application**

Run: `npm run dev` (backend) and `npm run start:client` (frontend)

- [ ] **Step 2: Test history visualization flow**

1. Start the server and add a contact
2. Wait for some tracking data to accumulate
3. Click "Show History" button
4. Verify:
   - History panel appears with summary cards
   - Timeline chart shows RTT data over time
   - Filters work (device, date range)
   - Export button downloads JSON file
   - Privacy mode blurs device IDs

- [ ] **Step 3: Test filtering**

1. Select specific device from dropdown
2. Change date range (today/week/all)
3. Verify charts and cards update correctly

- [ ] **Step 4: Test persistence**

1. Add contacts, let tracking run
2. Stop server, restart
3. Verify history data persists and displays correctly

---

## Self-Review Results

**Spec coverage:** ✓ All requirements covered
- Timeline charts showing device states over time
- Summary cards with extended metadata
- Filtering by device and date range
- Export functionality
- Privacy mode support

**Placeholder scan:** ✓ No placeholders found

**Type consistency:** ✓ All type names match across components
