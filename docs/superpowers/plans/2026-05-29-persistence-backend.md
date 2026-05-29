# Persistence Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement persistent storage and auto-recovery for tracked contacts across server restarts, with REST API access to tracking history.

**Architecture:** Add async save/restore functions that serialize the `trackers` Map to JSON on add/remove operations, restore trackers on platform connection, and serve history via Express GET endpoint. Use atomic file writes for concurrent write safety.

**Tech Stack:** Node.js, TypeScript, Express, Socket.IO, fs module

---

## File Structure

**Files to modify:**
- `src/server.ts` - Main Express/Socket.IO server; add persistence functions and API route
- `src/diskLogger.ts` - Disk logging utility; enhance with atomic writes

**Files created at runtime:**
- `auth_info_baileys/monitored_targets.json` - Persisted tracker configurations
- `auth_info_baileys/tracking_history.json` - Tracking history logs (already created by existing code)

---

## Task 1: Add imports and type definitions

**Files:**
- Modify: `src/server.ts:10-18`

- [ ] **Step 1: Add fs and path imports**

Add to the existing import block at the top of the file:

```typescript
import fs from 'fs';
import path from 'path';
```

- [ ] **Step 2: Add SerializableTrackerEntry interface after line 45 (after Platform type)**

```typescript
interface SerializableTrackerEntry {
    id: string;              // JID for WhatsApp, signal:+number for Signal
    platform: Platform;      // 'whatsapp' | 'signal'
    number: string;          // Clean phone number
}
```

- [ ] **Step 3: Run build to verify type safety**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 2: Implement saveTrackedTargets function

**Files:**
- Modify: `src/server.ts:53` (after trackers Map declaration)

- [ ] **Step 1: Write saveTrackedTargets function**

Add this function immediately after the `trackers` Map declaration (after line 52):

```typescript
async function saveTrackedTargets(): Promise<void> {
    try {
        const targetsPath = path.join(process.cwd(), 'auth_info_baileys', 'monitored_targets.json');

        // Ensure directory exists
        const dir = path.dirname(targetsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Serialize trackers Map to array
        const serializable: SerializableTrackerEntry[] = Array.from(trackers.entries()).map(([id, entry]) => ({
            id,
            platform: entry.platform,
            number: entry.platform === 'signal'
                ? id.replace('signal:', '').replace(/\+/g, '')
                : id.split('@')[0],
        }));

        // Atomic write using temp file pattern
        const tempPath = targetsPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(serializable, null, 2), 'utf8');
        fs.renameSync(tempPath, targetsPath);

        console.log(`[PERSIST] Saved ${serializable.length} tracked targets to disk`);
    } catch (err) {
        console.error('[PERSIST] Error saving tracked targets:', err);
    }
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 3: Implement reinstateTracker helper function

**Files:**
- Modify: `src/server.ts` (after saveTrackedTargets function)

- [ ] **Step 1: Write reinstateTracker helper function**

Add this function immediately after `saveTrackedTargets`:

```typescript
async function reinstateTracker(target: SerializableTrackerEntry): Promise<void> {
    if (target.platform === 'whatsapp') {
        if (!sock) {
            console.log('[PERSIST] WhatsApp socket not available');
            return;
        }

        const results = await sock.onWhatsApp(target.id);
        const result = results?.[0];

        if (result?.exists) {
            const tracker = new WhatsAppTracker(sock, result.jid);
            tracker.setProbeMethod(globalProbeMethod);
            trackers.set(result.jid, { tracker, platform: 'whatsapp' });

            tracker.onUpdate = (updateData) => {
                io.emit('tracker-update', {
                    jid: result.jid,
                    platform: 'whatsapp',
                    ...updateData
                });
            };

            tracker.startTracking();
            console.log(`[PERSIST] Restored WhatsApp tracker for ${result.jid}`);
        }
    } else if (target.platform === 'signal') {
        const cleanNumber = target.number.replace(/\D/g, '');
        const targetNumber = cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
        const signalId = `signal:${cleanNumber}`;

        if (!signalAccountNumber) {
            console.log('[PERSIST] Signal account not available');
            return;
        }

        const tracker = new SignalTracker(SIGNAL_API_URL, signalAccountNumber, targetNumber);
        trackers.set(signalId, { tracker, platform: 'signal' });

        tracker.onUpdate = (updateData) => {
            io.emit('tracker-update', {
                jid: signalId,
                platform: 'signal',
                ...updateData
            });
        };

        tracker.startTracking();
        console.log(`[PERSIST] Restored Signal tracker for ${signalId}`);
    }
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 4: Implement restoreTrackedTargets function

**Files:**
- Modify: `src/server.ts` (after reinstateTracker function)

- [ ] **Step 1: Write restoreTrackedTargets function**

Add this function immediately after `reinstateTracker`:

```typescript
async function restoreTrackedTargets(): Promise<void> {
    const targetsPath = path.join(process.cwd(), 'auth_info_baileys', 'monitored_targets.json');

    if (!fs.existsSync(targetsPath)) {
        console.log('[PERSIST] No saved targets file found, starting fresh');
        return;
    }

    try {
        const data = fs.readFileSync(targetsPath, 'utf8');
        const savedTargets: SerializableTrackerEntry[] = JSON.parse(data);

        console.log(`[PERSIST] Found ${savedTargets.length} saved targets, restoring...`);

        for (const target of savedTargets) {
            // Only restore targets for connected platforms
            if (target.platform === 'whatsapp' && !isWhatsAppConnected) {
                console.log(`[PERSIST] Skipping WhatsApp target ${target.id} - not connected`);
                continue;
            }

            if (target.platform === 'signal' && !isSignalConnected) {
                console.log(`[PERSIST] Skipping Signal target ${target.id} - not connected`);
                continue;
            }

            try {
                await reinstateTracker(target);
            } catch (err) {
                console.error(`[PERSIST] Failed to restore tracker for ${target.id}:`, err);
            }
        }

        console.log('[PERSIST] Target restoration complete');
    } catch (err) {
        console.error('[PERSIST] Error restoring tracked targets:', err);
    }
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 5: Integrate saveTrackedTargets after WhatsApp contact added

**Files:**
- Modify: `src/server.ts:385-387` (after socket.emit('contact-added') for WhatsApp)

- [ ] **Step 1: Add save call after WhatsApp contact added**

Find the WhatsApp contact-added block (around line 379-387) and add the save call:

```typescript
socket.emit('contact-added', {
    jid: result.jid,
    number: cleanNumber,
    platform: 'whatsapp'
});

// ADD THIS LINE:
await saveTrackedTargets();

io.emit('profile-pic', { jid: result.jid, url: ppUrl });
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 6: Integrate saveTrackedTargets after Signal contact added

**Files:**
- Modify: `src/server.ts:329-334` (after socket.emit('contact-added') for Signal)

- [ ] **Step 1: Add save call after Signal contact added**

Find the Signal contact-added block (around line 329-334) and add the save call:

```typescript
socket.emit('contact-added', {
    jid: signalId,
    number: cleanNumber,
    platform: 'signal'
});

// ADD THIS LINE:
await saveTrackedTargets();

io.emit('contact-name', { jid: signalId, name: cleanNumber });
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 7: Integrate saveTrackedTargets after contact removed

**Files:**
- Modify: `src/server.ts:397-405` (in remove-contact handler)

- [ ] **Step 1: Add save call after contact removed**

Find the remove-contact handler (around line 397-405) and add the save call:

```typescript
socket.on('remove-contact', (jid: string) => {
    console.log(`Request to stop tracking: ${jid}`);
    const entry = trackers.get(jid);
    if (entry) {
        entry.tracker.stopTracking();
        trackers.delete(jid);
        socket.emit('contact-removed', jid);

        // ADD THIS LINE:
        saveTrackedTargets().catch(err => console.error('Save error after remove:', err));
    }
});
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 8: Trigger restore on WhatsApp connection open

**Files:**
- Modify: `src/server.ts:81-86` (in connection.update handler for connection === 'open')

- [ ] **Step 1: Add restore call after WhatsApp connection opens**

Find the WhatsApp connection open block (around line 81-86) and add the restore call:

```typescript
} else if (connection === 'open') {
    isWhatsAppConnected = true;
    currentWhatsAppQr = null;
    console.log('opened connection');
    io.emit('connection-open');

    // ADD THESE LINES:
    restoreTrackedTargets().catch(err => console.error('Restore error:', err));
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 9: Trigger restore on Signal connection open

**Files:**
- Modify: `src/server.ts:142-148` (in checkSignalConnection after signal-connection-open emit)

- [ ] **Step 1: Add restore call after Signal connection opens**

Find the Signal connection open block (around line 142-148) and add the restore call:

```typescript
if (!isSignalConnected) {
    isSignalConnected = true;
    signalAccountNumber = accounts[0];
    signalLinkingInProgress = false;
    console.log(`[SIGNAL] Connected with account: ${signalAccountNumber}`);
    io.emit('signal-connection-open', { number: signalAccountNumber });

    // ADD THESE LINES:
    restoreTrackedTargets().catch(err => console.error('Restore error:', err));
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 10: Add /api/history GET endpoint

**Files:**
- Modify: `src/server.ts:429` (before httpServer.listen)

- [ ] **Step 1: Add history API endpoint**

Add this endpoint immediately before `httpServer.listen(PORT)`:

```typescript
// REST API: Get tracking history
app.get('/api/history', (req, res) => {
    const historyPath = path.join(process.cwd(), 'auth_info_baileys', 'tracking_history.json');

    if (!fs.existsSync(historyPath)) {
        return res.json([]);
    }

    try {
        const data = fs.readFileSync(historyPath, 'utf8');
        const logs = JSON.parse(data);
        res.json(logs);
    } catch (err) {
        console.error('[API] Error reading history:', err);
        res.status(500).json({ error: 'Failed to read history file' });
    }
});

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 11: Enhance diskLogger with atomic writes

**Files:**
- Modify: `src/diskLogger.ts` (entire file)

- [ ] **Step 1: Replace diskLogger.ts with enhanced version**

Replace the entire content of `src/diskLogger.ts` with:

```typescript
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
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 12: Remove duplicate setupDiskLogger from server.ts

**Files:**
- Modify: `src/server.ts:434-464` (inline setupDiskLogger implementation)

- [ ] **Step 1: Remove duplicate inline setupDiskLogger**

Find and remove the inline `setupDiskLogger` function at the end of the file (lines 434-464 approximately). The code to remove starts with:

```typescript
// Persistent Background Tracking Disk Logger Implementation
import fs from 'fs';
import path from 'path';

export function setupDiskLogger(ioInstance: any) {
    ...
}
```

Delete this entire block since we now use the module version from `diskLogger.ts`.

- [ ] **Step 2: Verify import statement exists at top of file**

Ensure line 35 of `src/server.ts` has:
```typescript
import { setupDiskLogger } from './diskLogger.js';
```

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: No TypeScript errors

---

## Task 13: Final verification and testing

**Files:**
- Test: Manual verification

- [ ] **Step 1: Run final build**

Run: `npm run build`
Expected: Clean build with no errors

- [ ] **Step 2: Start server and test persistence**

Run: `npm run dev`

Test sequence:
1. Start server, scan WhatsApp QR
2. Add a contact (e.g., 1234567890)
3. Verify file created: `cat auth_info_baileys/monitored_targets.json`
4. Kill server (Ctrl+C)
5. Restart server: `npm run dev`
6. Scan WhatsApp QR again
7. Check console for `[PERSIST] Found 1 saved targets, restoring...`
8. Check console for `[PERSIST] Restored WhatsApp tracker for ...`

- [ ] **Step 3: Test history API**

While server is running:
```bash
curl http://localhost:3001/api/history
```

Expected: JSON array of tracking logs

- [ ] **Step 4: Test contact removal persistence**

1. Remove a contact via web interface
2. Verify `monitored_targets.json` is updated
3. Restart server and verify removed contact doesn't restore

---

## Self-Review Results

**Spec coverage:** ✓ All requirements covered
- Target persistence (Tasks 1-9)
- Auto-recovery (Tasks 3-4, 8-9)
- History API (Task 10)
- Atomic logger (Tasks 11-12)

**Placeholder scan:** ✓ No placeholders found

**Type consistency:** ✓ All type names consistent (Platform, SerializableTrackerEntry, TrackerEntry)

**No duplicate code:** ✓ Removed inline setupDiskLogger in Task 12
