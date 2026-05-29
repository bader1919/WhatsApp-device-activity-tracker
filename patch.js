const fs = require('fs');
const path = require('path');
const file = 'src/server.ts';

if (!fs.existsSync(file)) {
    console.log('❌ Error: src/server.ts not found.');
    process.exit(1);
}

let content = fs.readFileSync(file, 'utf8');

// 1. Ensure core dependencies are imported at the top
if (!content.includes("import fs from 'fs';")) {
    content = "import fs from 'fs';\nimport path from 'path';\n" + content;
}

// 2. Locate the socket notification logic to hook data recording
const searchPattern = /io\.emit\(\s*['"]tracker-update['"]\s*,\s*data\s*\);/g;
const loggingHook = `io.emit('tracker-update', data);
            
            // Persistent storage file recording patch
            try {
                const historyPath = path.join(process.cwd(), 'auth_info_baileys', 'tracking_history.json');
                let logs = [];
                if (fs.existsSync(historyPath)) {
                    logs = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                }
                logs.push({
                    timestamp: new Date().toISOString(),
                    target: data.jid || 'Unknown',
                    status: data.status || 'Standby',
                    rtt: data.rtt || 0,
                    median: data.median || 0,
                    threshold: data.threshold || 0
                });
                fs.writeFileSync(historyPath, JSON.stringify(logs, null, 2), 'utf8');
            } catch (err) {
                console.error('Failed to save log record onto storage disk:', err.message);
            }`;

// 3. Inject the API route endpoint right before app.listen
const routeCode = `
// API Endpoint to stream tracking history to frontend UI query layers
app.get('/api/history', (req, res) => {
    try {
        const historyPath = path.join(process.cwd(), 'auth_info_baileys', 'tracking_history.json');
        if (!fs.existsSync(historyPath)) return res.json([]);
        let logs = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        
        const { target, status } = req.query;
        if (target) logs = logs.filter(l => l.target.includes(target));
        if (status) logs = logs.filter(l => l.status === status);
        
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
`;

if (content.match(searchPattern)) {
    content = content.replace(searchPattern, loggingHook);
    if (!content.includes('/api/history')) {
        content = content.replace(/app\.listen/g, routeCode + '\napp.listen');
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Changes applied successfully to src/server.ts!');
} else {
    console.log('⚠️ Could not locate the exact event handler pattern inside server.ts.');
}
