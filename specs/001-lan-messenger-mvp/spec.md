# Feature Specification: LAN Messenger MVP

**Feature Branch**: `001-lan-messenger-mvp`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "Link is a desktop messenger app for teams on the same local network..."

---

## Clarifications

### Session 2026-07-26

- Q: When two peers connect for the first time, how should they establish trust and exchange encryption keys? → A: Trust On First Use (TOFU) — each peer auto-generates a keypair on first launch; accept a peer's public key automatically on first contact and display a fingerprint for optional out-of-band verification.
- Q: Should messages show read receipts (sender can see when recipient has read the message)? → A: Sent + Delivered only — no read receipts. Delivery status has two states: Sent (message left the sender's app) and Delivered (message received by the recipient's app). The sender is not notified when the recipient reads the message.
- Q: Should a peer's display name and list of previously seen peers (with stored public keys) persist to disk across app restarts? → A: Yes — persist both display name and known-peers list (name + public key per peer). Message history remains session-only. This is the minimum persistence required for the TOFU trust model to function correctly across restarts.
- Q: When the group creator goes offline mid-session, what happens to the group? → A: Group survives — the full membership list is broadcast to all members at creation time; the group continues as a peer-to-peer mesh without the creator. No new host is elected; all members hold the peer list.
- Q: When a peer running an older version of Link connects to a newer-version peer, what should happen? → A: Reject with upgrade prompt — incompatible peers cannot connect. Both sides show a clear message: "Link version mismatch — please ensure all teammates are on the same version." No silent degradation.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automatic Peer Discovery & Online Presence (Priority: P1)

A team member opens Link on their laptop. Without any configuration, the app automatically
discovers other teammates currently running Link on the same Wi-Fi/LAN. Each teammate
appears in a sidebar with their display name and an online/available status indicator. When
a teammate closes the app or loses network connectivity, their status updates to offline
within a few seconds.

**Why this priority**: Discovery and presence are the foundation of every other feature.
No chat, file transfer, or call is possible without first knowing who is on the network.
This is the entry point for the entire product.

**Independent Test**: Launch Link on two machines on the same LAN. Within 5 seconds each
machine's sidebar shows the other peer with an "Online" status. Disconnect one machine from
Wi-Fi — within 10 seconds the other machine marks it as "Offline."

**Acceptance Scenarios**:

1. **Given** Link is running on Machine A and Machine B on the same LAN, **When** Machine B
   launches Link, **Then** Machine B appears in Machine A's peer list within 5 seconds,
   labeled with Machine B's display name and an "Online" status badge.
2. **Given** both peers are visible to each other, **When** Machine B closes Link or
   disconnects from the network, **Then** Machine A marks Machine B as "Offline" within
   10 seconds.
3. **Given** a new teammate joins the LAN mid-session, **When** they launch Link, **Then**
   all existing online peers see them appear without requiring a manual refresh.

---

### User Story 2 — 1-to-1 Direct Messaging (Priority: P1)

A team member selects an online colleague from the peer list and opens a direct message
conversation. They type a message and send it. The message appears instantly in both the
sender's and recipient's conversation window. Messages persist for the session so the user
can scroll back through the conversation.

**Why this priority**: 1-to-1 text messaging is the core communication primitive. All
other communication features build on top of the same encrypted messaging infrastructure.

**Independent Test**: Send a text message from Machine A to Machine B. The message appears
on both screens within 1 second. The message is readable only on the two endpoints — no
plaintext is observable on the network.

**Acceptance Scenarios**:

1. **Given** two peers are online, **When** User A types a message and presses Send,
   **Then** the message appears in User A's conversation window immediately and in User B's
   window within 1 second.
2. **Given** a conversation is open, **When** User B sends a reply, **Then** User A's
   window shows the reply without requiring a manual refresh.
3. **Given** a conversation has history from this session, **When** the user scrolls up,
   **Then** previous messages are visible in chronological order.
4. **Given** User B is offline, **When** User A attempts to send a message, **Then** the
   app clearly indicates the peer is unavailable and the message is not queued for later
   delivery (offline messaging is out of scope for MVP).

---

### User Story 3 — Group Chats (Priority: P2)

A team member creates a named group and adds two or more online colleagues. Any group
member can send a text message to the group and all other currently online members receive
it instantly. The group persists for the session.

**Why this priority**: Group communication is the next most critical workflow after 1-to-1
messaging. Teams frequently need to coordinate with more than one person at a time.

**Independent Test**: Create a group with 3 peers. Send a message from Peer A — Peers B
and C both receive it within 1 second. Send from Peer B — Peer A and C receive it.

**Acceptance Scenarios**:

1. **Given** a user creates a group named "Design Team" with 3 online members, **When** the
   creator sends a message, **Then** all other group members receive it within 1 second.
2. **Given** a group exists, **When** any member sends a message, **Then** all other
   currently online group members receive it.
3. **Given** a group member goes offline, **When** remaining members send messages, **Then**
   the offline member does not receive messages (no queuing for MVP) and the group
   continues to function for remaining online members.
4. **Given** the group creator disconnects mid-session, **When** remaining members send
   messages, **Then** the group continues to function between remaining members with no
   interruption — all members received the full peer list at creation time.

---

### User Story 4 — File Transfer (Priority: P2)

A team member selects a file from their filesystem and sends it to a colleague or group
via the chat window. The recipient sees a file transfer notification with filename and size,
and can accept or decline. Accepted files are saved to the recipient's chosen download
location. A progress indicator is shown during transfer.

**Why this priority**: File sharing is a high-frequency team workflow, especially for
documents, screenshots, and assets. It completes the "replace email for quick sharing"
use case.

**Independent Test**: Send a 50 MB file from Machine A to Machine B. Machine B shows the
file name, size, and an Accept/Decline prompt. On Accept, the file downloads to the chosen
folder. The file's contents are byte-identical to the original.

**Acceptance Scenarios**:

1. **Given** two peers are in a conversation, **When** User A selects and sends a file,
   **Then** User B sees a transfer prompt with the filename and file size within 2 seconds.
2. **Given** User B accepts the transfer, **When** the transfer completes, **Then** the
   file is saved to User B's download location and is byte-identical to the original.
3. **Given** a file is being transferred, **When** viewed by either party, **Then** a
   progress indicator shows transfer percentage and estimated time.
4. **Given** User B declines the transfer, **When** the decline is sent, **Then** the
   transfer is cancelled and User A is notified of the decline.

---

### User Story 5 — 1-to-1 Voice/Video Calls (Priority: P3)

A team member initiates a voice or video call with an online colleague. The recipient sees
an incoming call notification and can accept or decline. On acceptance, a call window opens
with audio and/or video streams. Either party can end the call at any time.

**Why this priority**: Voice/video rounds out the communication suite for real-time
collaboration. It is lower priority than text and file workflows because it requires
significantly more infrastructure to build correctly, and text messaging delivers the core
MVP value.

**Independent Test**: Initiate a video call from Machine A to Machine B. Machine B shows an
incoming call UI. Accept — both machines show live video and audio of the other party within
3 seconds of connection. Either party ends the call and both windows close cleanly.

**Acceptance Scenarios**:

1. **Given** two peers are online, **When** User A initiates a call to User B, **Then**
   User B sees an incoming call notification with the caller's name within 2 seconds.
2. **Given** User B accepts the call, **When** the call connects, **Then** both parties can
   hear each other (voice call) or see and hear each other (video call) within 3 seconds.
3. **Given** a call is active, **When** either party ends the call, **Then** both call
   windows close and both users are returned to the chat view.
4. **Given** User B declines the call, **When** the decline is sent, **Then** User A is
   notified the call was declined.

---

### Edge Cases

- What happens when two teammates have the same display name on the network? The app MUST
  distinguish peers by a unique identifier (e.g., device identifier) even if display names
  collide, and display them distinctly in the peer list.
- How does the app behave when the local network has no LAN broadcast support (e.g.,
  managed Wi-Fi with AP isolation)? The app MUST surface a clear "No peers found — your
  network may block peer discovery" message rather than showing an empty list with no
  explanation.
- What happens to in-progress file transfers or calls if a peer disconnects unexpectedly?
  The app MUST detect the disconnection and cleanly terminate the transfer/call with a
  user-visible error, rather than hanging indefinitely.
- What happens when a very large file (e.g., > 1 GB) is sent? The app MUST support files
  of any size with chunked transfer and must not load the entire file into memory at once.
- What happens to a group when the creator disconnects? The group MUST continue to
  function for remaining online members — the complete membership list is distributed to
  all members at group creation, enabling a serverless peer-to-peer mesh. The group is
  marked as ended only when all remaining members have left or gone offline.
- What happens when two peers are running different versions of Link? The app MUST
  exchange version information on every connection attempt. If the versions are
  incompatible, the connection MUST be refused and both peers MUST be shown a clear
  message: "Link version mismatch — please ensure all teammates are on the same version."
  Silent degradation or partial operation with mismatched versions is not permitted.

---

## Requirements *(mandatory)*

<!-- CONSTITUTION COMPLIANCE (Link v1.0.0): All FRs must be checked against:
  I.  Performance First — no renderer main-thread blocking work
  II. Native-Feel Design — Sequoia-inspired, matte dark-grey dark mode
  III. Light/Dark Mode — verified in both appearances
  IV. Security by Default (NON-NEGOTIABLE) — E2E encryption on all data paths
  V.  Cross-Platform — verified on macOS + Windows
-->

### Functional Requirements

- **FR-001**: The app MUST automatically discover all peers running Link on the same
  LAN/Wi-Fi without requiring any manual IP entry or configuration.
- **FR-002**: The app MUST display each discovered peer's name and online/offline status
  in real time, updating within 10 seconds of a status change.
- **FR-003**: Users MUST be able to send and receive text messages in a 1-to-1
  conversation with any online peer.
- **FR-004**: Users MUST be able to create a named group containing two or more online
  peers and exchange text messages within that group.
- **FR-005**: Users MUST be able to send a file of any size to any online peer or group,
  with the recipient able to accept or decline before transfer begins.
- **FR-006**: Users MUST be able to initiate and receive 1-to-1 voice calls with any
  online peer.
- **FR-007**: Users MUST be able to initiate and receive 1-to-1 video calls with any
  online peer.
- **FR-008**: ALL communication — messages, file transfers, voice, and video — MUST be
  end-to-end encrypted using a Trust On First Use (TOFU) model. Each peer generates a
  persistent keypair on first launch. A peer's public key is accepted automatically on
  first contact; no plaintext communication path may exist on the network.
- **FR-015**: The app MUST display each peer's key fingerprint in the peer profile or
  conversation details view, allowing users to optionally verify identity out-of-band.
  No verification step is required before messaging can begin.
- **FR-009**: The app MUST function entirely over the local network with no internet
  connection or external server required for any core feature.
- **FR-010**: The app MUST support both light and dark appearance modes, following the
  host OS appearance setting by default.
- **FR-011**: The app MUST run on macOS and Windows with full feature parity.
- **FR-012**: Peer discovery and message delivery MUST not block or freeze the app's UI
  under any circumstances.
- **FR-013**: In-progress file transfers MUST display a real-time progress indicator to
  both the sender and recipient.
- **FR-014**: The app MUST gracefully handle peer disconnections during active
  conversations, file transfers, and calls — surfacing a clear user-visible error and
  cleaning up resources without hanging.
- **FR-016**: Each sent message MUST display one of two delivery states to the sender:
  **Sent** (message dispatched from the sender's app) and **Delivered** (message received
  by the recipient's app). The app MUST NOT implement read receipts; no signal is sent
  when a recipient opens or reads a message.
- **FR-017**: The app MUST persist the following data to local disk across app restarts:
  (a) the user's chosen display name, (b) the user's own cryptographic keypair, and
  (c) the known-peers list (each previously seen peer's display name and public key).
  Message history MUST NOT be persisted to disk in the MVP.
- **FR-018**: At group creation, the complete membership list (all member names and
  network addresses) MUST be distributed to every group member immediately. The group
  MUST continue functioning as a peer-to-peer mesh if the creator subsequently
  disconnects, with no interruption for the remaining online members.
- **FR-019**: On every peer connection attempt, the app MUST exchange and validate
  protocol version information before any other communication occurs. If the versions
  are incompatible, the connection MUST be refused immediately. Both the initiating
  and receiving peer MUST display a clear, user-readable version mismatch message
  prompting them to ensure all teammates are running the same version of Link.

### Key Entities

- **Peer**: A user running Link on the local network. Has a display name, a unique device
  identity, a persistent cryptographic keypair (generated on first launch), a public key
  fingerprint (for optional out-of-band identity verification), an app_version (advertised
  during connection handshake for compatibility checks), and an online/offline status.
- **Conversation**: A 1-to-1 messaging session between the local user and one peer.
  Contains an ordered list of messages for the current session.
- **Group**: A named collection of two or more peers. The full membership list is
  distributed to all members at creation time. Maintains its own message history for
  the session. Survives the creator's disconnect — remaining members communicate
  directly via a peer-to-peer mesh using the distributed membership list.
- **Message**: A unit of communication within a conversation or group. Has a sender,
  timestamp, content (text), and a two-state delivery status: **Sent** (message has left
  the sender's app) and **Delivered** (message has been received by the recipient's app).
  There are no read receipts — the sender is not notified when the recipient opens or
  reads the message.
- **File Transfer**: A directed transfer of a file between a sender and one or more
  recipients. Has a filename, size, transfer progress, and accept/decline state.
- **Call**: A real-time audio and/or video session between two peers. Has a state
  (ringing, active, ended) and a media type (voice-only or voice+video).
- **KnownPeers**: A locally persisted registry of previously seen peers. Each entry
  contains the peer's display name and their public key. Used to restore the TOFU trust
  model across app restarts without re-accepting keys on every launch.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new team member can discover at least one online colleague and send their
  first message within 60 seconds of launching Link for the first time — with no
  configuration steps required.
- **SC-002**: Sent messages appear on the recipient's screen within 1 second of the
  sender pressing Send, measured over a standard office LAN.
- **SC-003**: Peer online/offline status updates are reflected in all connected peers'
  sidebar within 10 seconds of the actual status change.
- **SC-004**: File transfers of up to 1 GB complete successfully without the app
  freezing, crashing, or consuming more than a reasonable amount of RAM (app remains
  responsive throughout).
- **SC-005**: Voice/video calls connect and produce audible/visible streams within
  3 seconds of the recipient accepting the call.
- **SC-006**: The app passes a network traffic inspection showing that no messages,
  file contents, or media streams are transmitted in plaintext on the LAN.
- **SC-007**: The app launches and is ready for use (peer list populated) within
  5 seconds on a standard office machine.
- **SC-008**: All core features work identically on macOS and Windows with no
  feature gaps between platforms.

---

## Assumptions

- All users are on the same physical LAN or Wi-Fi access point; cross-network (VPN,
  internet) communication is explicitly out of scope.
- The target LAN supports multicast or broadcast for peer discovery; if the network
  blocks these, the app surfaces a clear warning (see Edge Cases).
- Display names are set by each user on first launch via a simple name prompt and are
  persisted to disk. On subsequent launches, the name is pre-filled from local storage;
  there is no central user account or directory.
- The user's cryptographic keypair and the known-peers list (peer names + public keys)
  are persisted to local disk. Message history is session-scoped only — messages are
  not persisted to disk between app restarts in the MVP. Persistent message history
  is a post-MVP feature.
- Group membership is established by the creating user and distributed in full to all
  members at creation time. The group persists as a peer-to-peer mesh for the session
  even if the creator disconnects. There is no persistent group storage or admin role
  in the MVP; groups do not survive an app restart.
- File transfers are direct peer-to-peer; there is no relay or buffer server. If either
  peer disconnects, the transfer fails.
- Voice and video calls are 1-to-1 only for MVP; group calls are out of scope.
- The app does not require administrator/root privileges to run on either platform.
- Users are non-technical; the app must require zero network configuration from the user.
