# Bug Fix Tasks: Startup Window, Display Name Sync & Refresh Peer State

## Overview
This document outlines the actionable tasks to resolve 3 critical issues in the Link LAN Messenger desktop application:
1. **Unwanted Extra 'Electron' Window on Startup**: Triggered by `app.setLoginItemSettings` running in development mode and registering raw `electron.exe` in Windows startup registry.
2. **Slow / Non-existent Peer Display Name Sync**: Triggered by missing identity update broadcasting across active P2P TCP connections and local discovery services when a user updates their name.
3. **Peer Discovery Wipeout on `Ctrl + R` / `Ctrl + Shift + R`**: Triggered by renderer page reloads resetting React state without hydrating active peer connections or re-requesting active peer state from the Electron main process.

---

## Tasks

### Task 1: Fix Startup Settings & Unwanted 'Electron' Window (Issue 1)
- [x] **1.1 Scope `setLoginItemSettings` to Packaged Builds Only**:
  - Update `electron/main.ts` to check `app.isPackaged` before calling `app.setLoginItemSettings`.
  - Prevent dev server / unpacked executable (`node_modules/electron/dist/electron.exe`) from registering itself to Windows startup registry.
- [x] **1.2 Clean Up Dev Startup Registry Entries & Window Visibility**:
  - Add logic in main process initialization to disable login item settings when running in non-packaged mode (`!app.isPackaged`).
  - Respect `app.getLoginItemSettings().wasOpenedAtLogin` and `openAsHidden` configuration so the main window stays hidden in the system tray on boot if launched at startup.

### Task 2: Implement Real-Time Peer Display Name Synchronization (Issue 2)
- [x] **2.1 Add Identity Update Protocol Signal**:
  - Create a new identity update message type (`PROFILE_UPDATE` / `IDENTITY_UPDATE`) in P2P protocol contracts (`electron/services/network/handshake.ts` or `message-service.ts`).
- [x] **2.2 Broadcast Name Changes across Active Connections & Discovery**:
  - In `identity:set-name` IPC handler (`electron/services/ipc/handlers.ts`), send the updated display name to all currently connected peers via active TCP sockets in `connectionManager`.
  - Re-announce updated identity metadata via `discoveryManager` (mDNS & UDP broadcast).
- [x] **2.3 Handle Profile Updates in Renderer State**:
  - Emit a main-to-renderer IPC event (`peer:updated` / `peer:connected`) when an identity update packet is received.
  - Update `usePeersStore` in the frontend so peer display names update instantly across all UI components without requiring connection drops.

### Task 3: Fix Peer State Hydration & Reload (`Ctrl + R`) Support (Issue 3)
- [x] **3.1 Add Main Process Handler to Query Active Peers**:
  - Create an IPC handle function `peers:get-active` in `electron/services/ipc/handlers.ts` that returns all currently connected active peers with their live network status.
- [x] **3.2 Hydrate Peer Store on Component Mount**:
  - Update `usePeersStore` in `src/stores/peers.store.ts` to fetch active connected peers from the main process during `initListeners()` or `App.tsx` mount.
- [x] **3.3 Handle Window Reload Gracefully**:
  - Ensure pressing `Ctrl + R` or `Ctrl + Shift + R` in `electron/main.ts` triggers a peer state re-hydration in the renderer so active peers are preserved visually in the UI.

---

## Verification Plan
1. **Startup Check**: Confirm no extra "Electron" window opens upon system startup/reboot and dev mode does not write raw `electron.exe` to registry.
2. **Display Name Sync Check**: Change display name in settings on Peer A and verify Peer B updates Peer A's name in under 1 second over LAN.
3. **Reload Check**: Press `Ctrl + R` and `Ctrl + Shift + R` while connected to peers; verify all active peers remain in the sidebar immediately.
