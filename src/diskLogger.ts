import fs from 'fs';
import path from 'path';

/**
 * Atomic file write helper - prevents corruption from concurrent writes
 */
function atomicWrite(filePath: string, data: string): void {
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, data, 'utf8');
    fs.renameSync(tempPath, filePath);
}

export function setupDiskLogger(io: any) {
    const originalEmit = io.emit;

    io.emit = function (event: string, data: any, ...args: any[]) {
        if (event === 'tracker-update' && data) {
            try {
                const historyPath = path.join(process.cwd(), 'auth_info_baileys', 'tracking_history.json');

                // Ensure directory exists
                const dir = path.dirname(historyPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                let logs = [];

                if (fs.existsSync(historyPath)) {
                    const existingData = fs.readFileSync(historyPath, 'utf8');
                    logs = JSON.parse(existingData);
                }

                logs.push({
                    timestamp: new Date().toISOString(),
                    target: data.jid || 'Unknown',
                    platform: data.platform || 'whatsapp',
                    status: data.status || 'Standby',
                    rtt: data.rtt || 0,
                    median: data.median || 0,
                    threshold: data.threshold || 0
                });

                // Limit history size to prevent unbounded growth
                const MAX_HISTORY_ENTRIES = 10000;
                if (logs.length > MAX_HISTORY_ENTRIES) {
                    logs = logs.slice(-MAX_HISTORY_ENTRIES);
                }

                // Atomic write
                atomicWrite(historyPath, JSON.stringify(logs, null, 2));

            } catch (err: any) {
                console.error('[DISK LOGGER] Write error:', err.message);
            }
        }

        return originalEmit.apply(io, [event, data, ...args]);
    };
}
