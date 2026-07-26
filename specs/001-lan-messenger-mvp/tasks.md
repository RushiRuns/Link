---
description: "Task list for Link LAN Messenger MVP implementation"
---

# Tasks: Link LAN Messenger MVP

**Input**: Design documents from `specs/001-lan-messenger-mvp/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/p2p-protocol.md ✅

**Tests**: Not included — testing standard not yet defined (TODO(TESTING_STANDARD) in constitution Quality Gates). Add test tasks once the testing strategy is locked.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- Main process services: `electron/services/<domain>/`
- IPC bridge: `electron/services/ipc/`
- Renderer components: `src/components/<domain>/`
- Renderer hooks: `src/hooks/`
- Renderer stores: `src/stores/`
- Shared types: `src/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, design system foundation, and IPC bridge skeleton — required before any feature work.

- [x] T001 Extend `electron/preload.ts` to expose typed IPC bridge stubs for all service domains (discovery, messaging, groups, file-transfer, calls, storage) via `contextBridge`
- [x] T002 [P] Create `src/types/ipc.ts` with TypeScript interfaces for all IPC channel payloads (LinkPeer, LinkMessage, LinkGroup, LinkFileTransfer, LinkCall, LinkIdentity)
- [x] T003 [P] Create `src/types/electron.d.ts` extensions — add `window.link` typed API surface mirroring IPC bridge stubs
- [x] T004 [P] Create design system foundation in `src/components/design-system/tokens.css` — define CSS custom properties for color palette (matte dark-grey dark mode, light mode), spacing scale, border-radius, and typography (system font stack)
- [x] T005 [P] Create `src/components/design-system/GlobalStyles.tsx` — apply CSS reset, body background, font, and OS-level `prefers-color-scheme` binding via `nativeTheme` IPC event
- [x] T006 [P] Scaffold app shell layout in `src/components/layout/AppShell.tsx` — sidebar (peer list) + main pane (conversation/call view) split layout, responsive to window resize
- [x] T007 [P] Install and configure `electron-store` in `electron/main.ts` — configure with `safeStorage` encryption for credential fields; define schema for `displayName`, `deviceId`, `encryptedPrivateKey`, `publicKey`
- [x] T008 [P] Install and configure `better-sqlite3` (with SQLCipher) in `electron/services/storage/db.ts` — open encrypted DB in `app.getPath('userData')`, enable WAL mode, define initial schema migrations for `peers` table
- [x] T009 [P] Install wire-protocol dependencies: `msgpackr` for MessagePack encoding, `uuid` for ID generation — add encode/decode helpers in `electron/services/network/wire.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. This phase delivers the identity system, encryption layer, and TCP connection manager that every feature depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T010 Create `electron/services/identity/identity.ts` — implement `LocalIdentity` lifecycle: generate Curve25519 keypair on first launch using `@stablelib/x25519`, encrypt private key via `safeStorage`, persist to `electron-store`, load on subsequent launches; expose `getIdentity()` function
- [x] T011 [P] Create `electron/services/identity/fingerprint.ts` — derive human-readable public key fingerprint (truncated hex of SHA-256 of publicKey); expose `getFingerprint(publicKey)` helper
- [x] T012 Create `electron/services/network/noise.ts` — implement Noise_XX handshake using `@stablelib/x25519` and `@stablelib/chacha20poly1305`; expose `initiateHandshake(socket, localKeypair, remotePubKey?)` and `acceptHandshake(socket, localKeypair)` returning an established `NoiseSession` with `encrypt(plaintext)` / `decrypt(ciphertext)` methods
- [x] T013 Create `electron/services/network/connection-manager.ts` — manage a registry of active `NoiseSession` connections keyed by `deviceId`; implement `connect(peer)`, `disconnect(peerId)`, `send(peerId, envelope)`, `broadcast(peerIds, envelope)`, and `onMessage(handler)` using TCP sockets; emit `peer:connected`, `peer:disconnected` events
- [x] T014 Create `electron/services/network/handshake.ts` — implement post-Noise `HandshakeHello` / `HandshakeAck` exchange (version check: major.minor must match); reject and close connection on version mismatch; TOFU: on first connection store peer's public key, on subsequent connections verify it matches stored key
- [x] T015 [P] Create `electron/services/network/keepalive.ts` — send `keepalive` message every 15s on idle connections; detect peer offline if no message received for 30s; emit `peer:timeout` event on connection manager
- [x] T016 Create `electron/services/storage/peers-store.ts` — CRUD operations on SQLite `peers` table (upsert peer on connect, update lastSeen, query all known peers); run in main process only; expose via IPC
- [x] T017 [P] Create `electron/services/ipc/handlers.ts` — register all `ipcMain.handle()` stubs for identity, peers, messaging, groups, file-transfer, and calls domains; wire to service implementations as they are built
- [x] T018 Create `src/stores/peers.store.ts` — Zustand store for runtime peer list (online peers, status, display names); subscribe to `peer:connected` / `peer:disconnected` IPC events from main process
- [x] T019 Create `src/stores/app.store.ts` — Zustand store for global app state: active view, selected conversation/group, call state, theme

**Checkpoint**: Foundation ready — identity created, Noise_XX encryption working, TCP connections established with version check and TOFU. User story work can begin.

---

## Phase 3: User Story 1 — Peer Discovery & Online Presence (Priority: P1) 🎯 MVP

**Goal**: Users automatically see all online teammates on the LAN the moment they open Link — no configuration.

**Independent Test**: Launch on two LAN machines → both appear in each other's peer list within 5s. Disconnect one → marked offline within 10s. (quickstart.md Scenario 1)

### Implementation for User Story 1

- [x] T020 [P] [US1] Create `electron/services/discovery/mdns.ts` — broadcast `DiscoveryAnnounce` via `multicast-dns` on launch and every 5s; listen for announces from other peers and emit `discovery:peer-found` events; advertise service type `_link._tcp`
- [x] T021 [P] [US1] Create `electron/services/discovery/udp-broadcast.ts` — broadcast `DiscoveryAnnounce` as UDP packet to subnet broadcast address (port 47431) as fallback; listen for incoming broadcasts on same port; emit `discovery:peer-found` events
- [x] T022 [US1] Create `electron/services/discovery/discovery-manager.ts` — orchestrate layered discovery: attempt mDNS first, fall back to UDP broadcast after 3s timeout if no peers found; deduplicate peer announcements from both sources; initiate TCP connection + Noise handshake for each newly discovered peer via connection-manager; emit `peer:online` when handshake completes
- [x] T023 [US1] Add `discovery:no-peers-found` IPC event in `electron/services/ipc/handlers.ts` — fire after 10s with no peers; renderer shows "No peers found — your network may block peer discovery" message
- [x] T024 [P] [US1] Create `src/components/peers/PeerList.tsx` — renders the sidebar peer list from `peers.store`; groups peers by online/offline; uses `PeerItem` component
- [x] T025 [P] [US1] Create `src/components/peers/PeerItem.tsx` — renders a single peer row: avatar placeholder, display name, `StatusBadge` (online/offline/version_mismatch indicator)
- [x] T026 [P] [US1] Create `src/components/peers/StatusBadge.tsx` — coloured dot indicating peer status; version mismatch shows warning icon + tooltip "Update Link to connect"
- [x] T027 [US1] Wire `PeerList` into `AppShell` sidebar; subscribe to `peers.store`; verify peer list updates reactively when peers come online/offline

**Checkpoint**: User Story 1 complete — both machines see each other in peer list; offline detection works; no-peers warning shows on isolated networks.

---

## Phase 4: User Story 2 — 1-to-1 Direct Messaging (Priority: P1) 🎯 MVP

**Goal**: Any two online peers can open a direct conversation and exchange text messages with sub-second delivery and Sent/Delivered status.

**Independent Test**: Alice sends "Hello Bob" → appears in Bob's view within 1s; delivery status changes Sent → Delivered. Network capture shows zero plaintext. (quickstart.md Scenario 2)

### Implementation for User Story 2

- [x] T028 [P] [US2] Create `electron/services/messaging/message-service.ts` — implement `sendMessage(peerId, content)`: generate `TextMessage` envelope, encode with MessagePack, encrypt via NoiseSession, send over TCP; implement `onMessage` handler: decrypt, decode, emit `message:received` IPC event; send `MessageAck` immediately on receipt
- [x] T029 [P] [US2] Add `MessageAck` handling in `electron/services/messaging/message-service.ts` — on receiving `message.ack`, update message delivery status from `sent` → `delivered`; emit `message:delivered` IPC event with `messageId`
- [x] T030 [P] [US2] Create `src/stores/conversations.store.ts` — Zustand store keyed by `conversationId`; holds `Message[]` per conversation (in-memory, session only); handles `message:received`, `message:delivered` IPC events; manages `unreadCount`
- [x] T031 [P] [US2] Create `src/components/conversations/ConversationView.tsx` — renders message list for selected peer; auto-scrolls to latest message; shows empty state when no messages
- [x] T032 [P] [US2] Create `src/components/conversations/MessageBubble.tsx` — renders a single message: sender label (for group view), content, timestamp, delivery status icon (clock → single tick → double tick for sending/sent/delivered)
- [x] T033 [P] [US2] Create `src/components/conversations/MessageInput.tsx` — text input with Send button; handles Enter-to-send; enforces 10,000 char limit with counter; disables when peer is offline
- [x] T034 [US2] Wire conversation view into `AppShell` — clicking a peer in `PeerList` opens `ConversationView` for that peer; update `app.store` selected conversation; show peer offline banner if peer status is offline

**Checkpoint**: User Story 2 complete — 1-to-1 messaging works; delivery status visible; UI stays responsive; wire capture shows only encrypted traffic.

---

## Phase 5: User Story 3 — Group Chats (Priority: P2)

**Goal**: A user creates a named group with multiple online peers; all members can exchange messages; group survives creator disconnect.

**Independent Test**: Create group with Alice, Bob, Carol → Alice sends message → Bob and Carol receive within 1s. Alice disconnects → Bob and Carol continue messaging each other. (quickstart.md Scenario 5)

### Implementation for User Story 3

- [x] T035 [P] [US3] Create `electron/services/groups/group-service.ts` — implement `createGroup(name, memberPeerIds)`: generate groupId, build `GroupCreate` envelope with full member list (deviceId, displayName, publicKey, networkAddress, tcpPort), send individually to each invited member over their Noise-encrypted connection; on receiving `group.create`, open connections to all group members not yet connected
- [x] T036 [P] [US3] Add group message handling in `electron/services/groups/group-service.ts` — implement `sendGroupMessage(groupId, content)`: send `TextMessage` with `groupId` set to every currently online group member individually; handle incoming group `TextMessage`; emit `group-message:received` IPC event
- [x] T037 [P] [US3] Create `src/stores/groups.store.ts` — Zustand store: `GroupMap` keyed by `groupId`; holds group name, member list with runtime status, `Message[]` (in-memory); handles `group-message:received` IPC events; tracks which members are online via `peers.store`
- [x] T038 [P] [US3] Create `src/components/groups/GroupCreate.tsx` — modal/sheet to name the group and select online peers (checkboxes from `PeerList`); minimum 1 other peer required; calls `window.link.groups.create()`
- [x] T039 [P] [US3] Create `src/components/groups/GroupView.tsx` — renders group conversation: message list (with sender names), `MessageInput`; shows member sidebar with online/offline status per member; reuses `MessageBubble`
- [x] T040 [US3] Wire group management into `AppShell` — "New Group" button in sidebar triggers `GroupCreate`; created/joined groups appear in sidebar below direct conversations; clicking a group opens `GroupView`

**Checkpoint**: User Story 3 complete — group creation, distributed membership, and post-creator-disconnect messaging all work.

---

## Phase 6: User Story 4 — File Transfer (Priority: P2)

**Goal**: Users send files of any size; recipients see an accept/decline prompt; transfer shows live progress; transferred files are byte-identical to originals.

**Independent Test**: Send 100 MB file → recipient sees offer within 2s → accepts → progress bar updates → file saved; SHA-256 of saved file matches original. UI stays responsive throughout. (quickstart.md Scenario 6)

### Implementation for User Story 4

- [x] T041 [P] [US4] Create `electron/services/file-transfer/file-transfer-service.ts` — implement `offerFile(peerId, filePath)`: read file metadata (name, size, MIME type), compute `totalChunks = ceil(size / 65536)`, send `FileTransferOffer` envelope; implement `sendChunks(transferId, filePath)`: stream file in 64 KB chunks using `fs.createReadStream`, send each `FileChunk` over Noise-encrypted connection; run all file I/O via Node.js streams in main process (never block renderer)
- [x] T042 [P] [US4] Add receive side in `electron/services/file-transfer/file-transfer-service.ts` — on `file.offer`: emit `file-transfer:offer` IPC event to renderer; on `file.response` accepted: begin streaming chunks; on `file.chunk`: write to temp file path, update `bytesTransferred`, emit `file-transfer:progress` IPC event; on final chunk: move temp file to `savePath`, send `file.complete`, emit `file-transfer:completed`
- [x] T043 [P] [US4] Create `src/stores/file-transfer.store.ts` — Zustand store: active transfers keyed by `transferId`; handles offer, progress, completed, failed IPC events; tracks `bytesTransferred` / `fileSizeBytes` for progress calculation
- [x] T044 [P] [US4] Create `src/components/file-transfer/FileTransferOffer.tsx` — modal shown to recipient: file name, size (human-readable), sender name; Accept and Decline buttons; calls `window.link.fileTransfer.respond(transferId, accepted, savePath)`
- [x] T045 [P] [US4] Create `src/components/file-transfer/TransferProgress.tsx` — inline progress bar in conversation/group view: shows filename, `X MB / Y MB`, percentage, estimated time remaining; updates reactively from `file-transfer.store`
- [x] T046 [US4] Wire file transfer UI into `ConversationView` and `GroupView` — file attachment button (paperclip) in `MessageInput` triggers system file picker via `window.link.fileTransfer.offer()`; incoming offers trigger `FileTransferOffer` modal; active transfers rendered as `TransferProgress` in the message thread

**Checkpoint**: User Story 4 complete — file send/receive works; progress visible; UI responsive during large transfers; byte-identical verification passes.

---

## Phase 7: User Story 5 — Voice/Video Calls (Priority: P3)

**Goal**: Users initiate and receive 1-to-1 voice or video calls over WebRTC; signaling uses the existing Noise-encrypted TCP connection; no external servers.

**Independent Test**: Alice calls Bob (video) → incoming call UI appears within 2s → accept → both see live video within 3s → end call → both return to chat. (quickstart.md Scenarios 7 & 8)

### Implementation for User Story 5

- [ ] T047 [P] [US5] Create `electron/services/calls/call-signaling.ts` — implement WebRTC signaling over existing Noise TCP connections: `sendOffer(peerId, mediaType, sdp)` sends `call.offer`; `sendAnswer(callId, accepted, sdp?)` sends `call.answer`; relay `IceCandidate` messages; relay `call.end`; emit corresponding IPC events to renderer for each received signal message
- [ ] T048 [P] [US5] Create `src/stores/calls.store.ts` — Zustand store: active call state (callId, peerId, mediaType, status); handles `call:offer-received`, `call:answer-received`, `call:ice-candidate`, `call:ended` IPC events
- [ ] T049 [P] [US5] Create `src/components/calls/IncomingCallModal.tsx` — overlay shown when `call:offer-received`; displays caller name and media type (voice/video icon); Accept and Decline buttons; auto-dismiss on `call:ended` from caller side
- [ ] T050 [P] [US5] Create `src/components/calls/CallScreen.tsx` — full-screen (or floating) call UI: local + remote video elements; mute/unmute toggle; camera on/off toggle (video calls); end call button; shows call duration timer; collapses to audio-only view for voice calls
- [ ] T051 [US5] Create `src/components/calls/CallControls.tsx` — extracted control bar (mute, camera, end) used by `CallScreen`; handles media track toggling via WebRTC `RTCPeerConnection.getSenders()`
- [ ] T052 [US5] Implement WebRTC peer connection in renderer `src/hooks/useWebRTC.ts` — create `RTCPeerConnection` with no ICE servers (LAN-only, no STUN/TURN); handle `negotiationneeded`, `icecandidate`, `track` events; relay signals via `window.link.calls.*` IPC; attach remote track to `<video>` element in `CallScreen`
- [ ] T053 [US5] Wire call initiation into `PeerItem` — "Call" button (voice/video toggle) on each online peer; calls `window.link.calls.offer(peerId, mediaType)`; opens `CallScreen` on answer accepted; route incoming `call:offer-received` to `IncomingCallModal`

**Checkpoint**: User Story 5 complete — voice and video calls connect within 3s; signaling is encrypted; call ends cleanly on either party's action.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, settings, cross-platform verification, and constitution compliance final pass.

- [ ] T054 [P] Create `src/components/settings/SettingsPanel.tsx` — display name editing (persists via `window.link.identity.setDisplayName()`); key fingerprint display (FR-015); app version display; light/dark mode override toggle (optional, OS default by default)
- [ ] T055 [P] Create `src/components/peers/PeerProfile.tsx` — shown on peer name click: display name, public key fingerprint for out-of-band verification (FR-015), connection status, last seen
- [ ] T056 [P] Implement graceful disconnect handling in `electron/services/network/connection-manager.ts` — on unexpected TCP close during file transfer: send `file.complete` with `success: false, reason: 'connection_lost'`; on call drop: send `call.end` with `reason: 'connection_lost'`; renderer shows user-readable error (FR-014)
- [ ] T057 [P] Implement `nativeTheme` OS appearance binding in `electron/main.ts` — listen for `nativeTheme.on('updated')`, send IPC event `theme:changed` with `shouldUseDarkColors`; renderer `useTheme` hook applies `data-theme` attribute to `<html>` element toggling CSS token sets (FR-010)
- [ ] T058 [P] Implement platform-specific window chrome in `electron/main.ts` — `titleBarStyle: 'hiddenInset'` on macOS (traffic-light controls); default title bar on Windows; `frame: false` with custom drag region if needed for Windows (FR-011)
- [ ] T059 [P] Add "No peers found" UI in `src/components/peers/PeerList.tsx` — empty state with network warning icon and message: "No peers found — your network may block peer discovery" triggered by `discovery:no-peers-found` IPC event (Edge Case)
- [ ] T060 [P] Add version mismatch UI state in `src/components/peers/StatusBadge.tsx` and `PeerItem.tsx` — show warning badge; tooltip "Link version mismatch — please ensure all teammates are on the same version" (FR-019)
- [ ] T061 Run quickstart.md Scenario 10 (cross-platform parity) — verify all scenarios pass on both macOS and Windows; fix any platform-specific regressions before marking MVP complete (FR-011, SC-008)
- [ ] T062 Final constitution compliance review — verify all 5 gates in plan.md Constitution Check; confirm no renderer-side blocking I/O; confirm no plaintext on wire; confirm both themes render correctly; confirm cross-platform parity

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — **BLOCKS ALL user stories**
- **US1 Discovery (Phase 3)**: Depends on Foundational — can start once Phase 2 complete
- **US2 Messaging (Phase 4)**: Depends on Foundational — can run in parallel with US1 after Phase 2
- **US3 Groups (Phase 5)**: Depends on US2 complete (reuses messaging infrastructure)
- **US4 File Transfer (Phase 6)**: Depends on Foundational — can run in parallel with US1/US2 after Phase 2
- **US5 Calls (Phase 7)**: Depends on Foundational — can run in parallel after Phase 2; independent of US2/US3/US4
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — first to start after Foundational
- **US2 (P1)**: No dependency on US1 — can start in parallel after Foundational
- **US3 (P2)**: Depends on US2 complete — reuses `conversations.store`, `MessageBubble`, `MessageInput`
- **US4 (P2)**: No dependency on US1/US2/US3 — independent after Foundational
- **US5 (P3)**: No dependency on US1–US4 — independent after Foundational; uses `PeerList` click handler

### Within Each User Story

- Main process service → IPC handler → Zustand store → React component
- All [P]-marked tasks within a story can be built simultaneously (different files)
- Non-[P] tasks must follow stated order (service before UI that calls it)

### Parallel Opportunities

```bash
# Phase 1 — all setup tasks can run in parallel:
T001 (preload IPC) | T002 (ipc types) | T003 (electron.d.ts)
T004 (design tokens) | T005 (global styles) | T006 (app shell)
T007 (electron-store) | T008 (SQLite+SQLCipher) | T009 (wire helpers)

# Phase 2 — dependency chain, but some parallel:
T010 (identity) → T011 (fingerprint) [P after T010]
T012 (noise.ts) → T013 (connection-manager) → T014 (handshake) → T015 (keepalive) [P after T014]
T016 (peers-store) [P with T012]
T017 (ipc handlers) | T018 (peers.store) | T019 (app.store) [P after Phase 1]

# Phase 3+4 — can run in parallel after Phase 2:
[US1] T020–T027  ║  [US2] T028–T034  ║  [US4] T041–T046  ║  [US5] T047–T053
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL** — blocks everything)
3. Complete Phase 3: US1 — Discovery & Presence
4. Complete Phase 4: US2 — 1-to-1 Messaging
5. **STOP and VALIDATE**: Run quickstart.md Scenarios 1, 2, 3, 4 independently
6. Two peers discover each other, message each other, TOFU verified, version mismatch handled → **Link MVP is functional**

### Incremental Delivery

1. Setup + Foundational → Core infrastructure ready
2. US1 + US2 → Peer discovery + text messaging → **Usable MVP**
3. US3 → Group chats → Deploy/demo
4. US4 → File transfer → Deploy/demo
5. US5 → Voice/video → Deploy/demo
6. Polish → Cross-platform parity verified → **v1.0.0**

### Parallel Team Strategy

With 2+ developers after Foundational phase:
- Dev A: US1 (discovery) + US3 (groups — after US2)
- Dev B: US2 (messaging) + US4 (file transfer)
- Dev C: US5 (calls) + Polish

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks in same phase
- `[USn]` label maps each task to its user story for traceability
- All main-process services communicate with renderer exclusively via IPC (never import renderer code into main or vice versa)
- Cryptographic operations MUST stay in `electron/` (main process) — never move to `src/` (renderer)
- Verify each quickstart.md scenario after its corresponding user story phase completes
- Commit after each phase or logical group of tasks
- `TODO(TESTING_STANDARD)`: When the test strategy is defined, add test task phases for each user story before implementation tasks
