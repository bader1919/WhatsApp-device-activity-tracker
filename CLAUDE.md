# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a proof-of-concept privacy research tool that demonstrates vulnerabilities in messaging apps (WhatsApp & Signal) through RTT (Round-Trip Time) analysis. Based on the paper "Careless Whisper: Exploiting Silent Delivery Receipts to Monitor Users on Mobile Instant Messengers" by Gegenhuber et al., University of Vienna & SBA Research.

**For educational and research purposes only.** Never track individuals without explicit consent.

## Architecture

### Dual-Platform Tracking System
The codebase implements RTT-based activity monitoring for both WhatsApp and Signal through a unified backend:

- **WhatsApp Tracking** (`src/tracker.ts`): Uses `@whiskeysockets/baileys` library to send probe messages (delete or reaction) and measure delivery receipt timing
- **Signal Tracking** (`src/signal-tracker.ts`): Uses `signal-cli-rest-api` WebSocket to receive delivery receipts from probe reactions
- **Web Server** (`src/server.ts`): Express + Socket.IO server that coordinates both platforms and broadcasts updates to React frontend

### Key Components

| File | Purpose |
|------|---------|
| `src/tracker.ts` | `WhatsAppTracker` class - RTT analysis for WhatsApp targets |
| `src/signal-tracker.ts` | `SignalTracker` class - RTT analysis for Signal targets |
| `src/server.ts` | Main web server with Socket.IO, handles both platforms |
| `src/index.ts` | CLI interface for WhatsApp-only tracking |
| `src/diskLogger.ts` | Persistent history logging to JSON file |
| `client/` | React frontend (do not modify unless explicitly requested) |

### RTT Detection Logic
- Sends probe messages at ~2 second intervals
- Measures time to receive CLIENT ACK (delivery receipt)
- Device state determined by comparing RTT to dynamic threshold (90% of global median):
  - **Online**: RTT below threshold (device actively in use)
  - **Standby**: RTT above threshold (device idle/locked)
  - **Offline**: No CLIENT ACK within 10 seconds

## Requirements

- **Node.js 20+** (required by `@whiskeysockets/baileys` - will fail on Node 18)
- npm or yarn
- For Signal tracking: `signal-cli-rest-api` running separately

## Common Commands

```bash
# Build TypeScript (requires Node 20+)
npm run build

# Development modes
npm run dev              # Start backend server (both platforms)
npm start                # CLI interface (WhatsApp only)

# With Signal
npm run start:signal-api  # Initialize signal-cli-rest-api
npm run start:server       # Start Signal API + main server

# Frontend
npm run start:client    # Start React dev server

# Docker (recommended - handles Node version)
docker compose up --build
docker compose down
```

## Important Implementation Notes

### Persistent Volume Usage
All persistent data must be stored in `auth_info_baileys/` directory (mounted volume in Docker):
- WhatsApp authentication/session files
- `monitored_targets.json` - Saved tracked contacts for recovery
- `tracking_history.json` - Historical RTT log entries

### Probe Methods
Two probe methods are supported for WhatsApp:
- **delete** (default): Sends delete request for non-existent message ID - completely silent/covert
- **reaction**: Sends reaction emoji to non-existent message ID - may be visible to target

Signal only supports reaction-based probing via `signal-cli-rest-api`.

### WhatsApp Multi-Device Support
The tracker handles multiple device JIDs per target (e.g., phone + linked devices):
- Main JID: `number@s.whatsapp.net`
- Device JID: `number:device_id@s.whatsapp.net`
- LID JID: `number@lid` (linked devices)

The `trackedJids` Set in `WhatsAppTracker` contains all variants for a target.

### Connection Recovery
WhatsApp automatically reconnects on disconnect unless logged out. The `connection.update` event handler in `server.ts` manages reconnection.

### Signal Integration Requirements
Signal tracking requires `signal-cli-rest-api` running at `http://localhost:8080` (configurable via `SIGNAL_API_URL` env var). The server polls for account status every 5 seconds.

## TypeScript Configuration

- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- Build outputs to `dist/` directory

Run `npm run build` before committing to verify no type errors.

## Platform-Specific Patterns

**WhatsApp tracker event flow:**
1. `sendProbe()` → `sendMessage()` with delete/reaction
2. Message ID stored in `probeStartTimes` Map
3. Wait for `messages.update` event with status 3 (CLIENT ACK)
4. Calculate RTT = `Date.now() - startTime`
5. Update device metrics and emit via `onUpdate` callback

**Signal tracker event flow:**
1. `sendReactionProbe()` → fetch to `/v1/reactions`
2. `pendingProbeStartTime` stores timestamp
3. WebSocket receives delivery receipt
4. Matched by serialized probe approach (only one probe in flight at a time)
5. Calculate RTT and emit via `onUpdate` callback

## Socket.IO Events

**Client → Server:**
- `add-contact`: `{ number: string, platform: 'whatsapp'|'signal' }`
- `remove-contact`: `jid` string
- `set-probe-method`: `'delete' | 'reaction'`
- `get-tracked-contacts`: Request list of active trackers

**Server → Client:**
- `qr`: WhatsApp QR code string
- `signal-qr-image`: Signal QR URL (PNG image)
- `connection-open` / `signal-connection-open`: Platform connected
- `tracker-update`: RTT data with `{ jid, platform, devices, median, threshold, status, rtt }`
- `contact-added` / `contact-removed`: Tracker lifecycle events
- `error`: `{ message, jid? }` error notifications
