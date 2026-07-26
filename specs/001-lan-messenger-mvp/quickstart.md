# Quickstart Validation Guide: Link LAN Messenger MVP

**Date**: 2026-07-27
**Purpose**: Manual end-to-end validation scenarios to verify the feature works correctly.
**References**: [spec.md](spec.md) | [data-model.md](data-model.md) | [contracts/p2p-protocol.md](contracts/p2p-protocol.md)

---

## Prerequisites

- Two physical or virtual machines on the **same LAN/Wi-Fi network** (or two user accounts on separate machines)
- Link installed and built on both machines (run `npm run dev` or production build)
- Both machines must be able to reach each other over TCP/UDP on the app's designated ports
- Windows: Ensure the app is allowed through Windows Firewall as a "Private Network" app when prompted

---

## Scenario 1: First Launch & Peer Discovery

**Tests**: FR-001, FR-002, SC-001, SC-007

1. Launch Link on Machine A. Enter display name "Alice".
2. Launch Link on Machine B. Enter display name "Bob".
3. **Expected**: Within 5 seconds, "Bob" appears in Alice's peer list with an "Online" badge.
4. **Expected**: Within 5 seconds, "Alice" appears in Bob's peer list with an "Online" badge.
5. Close Link on Machine B.
6. **Expected**: Within 10 seconds, "Bob" is marked "Offline" in Alice's peer list.
7. Re-launch Link on Machine B (name should be pre-filled as "Bob").
8. **Expected**: "Bob" reappears in Alice's list as "Online" within 5 seconds.

**Pass criteria**: Both peers discover each other within 5s; offline detection within 10s; name persists across restart.

---

## Scenario 2: 1-to-1 Text Messaging & Delivery Status

**Tests**: FR-003, FR-008, FR-016, SC-002, SC-006

1. From Scenario 1, both peers online.
2. Alice clicks "Bob" in the peer list and opens a conversation.
3. Alice types "Hello Bob" and presses Send.
4. **Expected**: Message appears in Alice's view immediately with status "Sent".
5. **Expected**: Message appears in Bob's view within 1 second with status visible.
6. **Expected**: Alice's message status changes from "Sent" to "Delivered" within 1 second of Bob receiving it.
7. Bob types "Hi Alice!" and presses Send.
8. **Expected**: Alice sees Bob's reply within 1 second.
9. Run a network packet capture (e.g., Wireshark) on the LAN during step 3–8.
10. **Expected**: No plaintext message content is visible in the capture — all payloads encrypted.

**Pass criteria**: Sub-1-second delivery; Sent→Delivered status transition; zero plaintext on wire.

---

## Scenario 3: Peer Identity & TOFU Verification

**Tests**: FR-008, FR-015, FR-017, SC-006

1. Alice opens her conversation with Bob.
2. Alice navigates to Bob's peer profile or conversation details.
3. **Expected**: Bob's public key fingerprint is displayed (truncated hex or similar).
4. Restart Link on both machines.
5. **Expected**: Alice's display name "Alice" is pre-filled on relaunch (no re-entry required).
6. **Expected**: Bob still appears in Alice's known-peers list after restart.
7. **Expected**: No re-keying prompt — Bob's stored public key is used automatically.

**Pass criteria**: Fingerprint visible; name and peer list survive restart without re-keying.

---

## Scenario 4: Version Mismatch Rejection

**Tests**: FR-019

1. Modify Machine B's Link app to report a different incompatible `appVersion` (e.g., "2.0.0" vs "1.0.0").
2. Launch both machines.
3. **Expected**: Link on Machine A shows a version mismatch indicator for "Bob" — not "Online".
4. **Expected**: A clear message is shown: "Link version mismatch — please ensure all teammates are on the same version."
5. No messages can be sent to the mismatched peer.

**Pass criteria**: Connection refused; user-readable mismatch message shown on both machines; no silent degradation.

---

## Scenario 5: Group Chat & Creator Disconnect

**Tests**: FR-004, FR-018, SC-002

*Requires 3 machines: Alice, Bob, Carol*

1. All three peers are online and visible to each other.
2. Alice creates a group named "Team Chat" with Bob and Carol.
3. **Expected**: Bob and Carol both receive a group invitation and join.
4. Alice sends "Hello group!" in the group chat.
5. **Expected**: Both Bob and Carol receive the message within 1 second.
6. Bob sends "Hey!" — **Expected**: Alice and Carol receive it within 1 second.
7. **Alice closes Link** (group creator disconnects).
8. Bob sends "Still here?" in the group.
9. **Expected**: Carol receives Bob's message — group survives creator disconnect.
10. Carol replies — Bob receives it.

**Pass criteria**: Group functions after creator disconnect; messages flow between remaining members.

---

## Scenario 6: File Transfer

**Tests**: FR-005, FR-013, FR-014, SC-004

1. Alice and Bob are in a conversation.
2. Alice selects a 100 MB file and sends it to Bob.
3. **Expected**: Bob sees a transfer prompt with the filename and file size within 2 seconds.
4. Bob accepts.
5. **Expected**: A progress bar appears on both machines, updating in real time.
6. **Expected**: The file completes successfully and is saved to Bob's chosen download folder.
7. **Expected**: The saved file is byte-identical to the original (verify with checksum).
8. **Expected**: During the entire transfer, the Link UI remains responsive — Alice and Bob can still send text messages while the file transfers.

**Pass criteria**: Progress visible; file byte-identical; UI not blocked during transfer.

---

## Scenario 7: Voice Call

**Tests**: FR-006, SC-005

1. Alice initiates a voice call with Bob.
2. **Expected**: Bob sees an incoming call notification with "Alice is calling…" within 2 seconds.
3. Bob accepts.
4. **Expected**: Both parties can hear each other within 3 seconds of acceptance.
5. Alice ends the call.
6. **Expected**: Both call windows close cleanly; both users return to the chat view.

**Pass criteria**: Call connects within 3s; audio audible on both sides; clean termination.

---

## Scenario 8: Video Call

**Tests**: FR-007, SC-005

1. Alice initiates a video call with Bob.
2. Bob accepts.
3. **Expected**: Both parties see each other's live video within 3 seconds.
4. Bob declines a subsequent call attempt.
5. **Expected**: Alice is notified "Bob declined the call."

**Pass criteria**: Video visible within 3s; decline notification shown.

---

## Scenario 9: Light/Dark Mode

**Tests**: FR-010

1. Set Machine A's OS appearance to **Dark mode**.
2. Launch Link — **Expected**: App uses matte dark-grey palette (not pure black). All text readable.
3. Set Machine A's OS appearance to **Light mode**.
4. **Expected**: App switches to light theme. No unstyled elements visible.

**Pass criteria**: Both appearances render correctly; no layout regressions; dark mode uses Sequoia-inspired palette.

---

## Scenario 10: Cross-Platform Parity

**Tests**: FR-011, SC-008

1. Run Scenarios 1–9 with Machine A on **macOS** and Machine B on **Windows** (or vice versa).
2. **Expected**: All scenarios produce identical results regardless of which OS is which.
3. Verify platform-specific window controls appear (macOS traffic lights vs Windows title bar) but all functional features are identical.

**Pass criteria**: All scenarios pass on both OS combinations; no feature gaps.
