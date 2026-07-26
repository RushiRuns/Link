# Research: Link LAN Messenger MVP

**Date**: 2026-07-27
**Feature**: specs/001-lan-messenger-mvp/spec.md

---

## 1. Peer Discovery: mDNS/Bonjour vs. UDP Broadcast

### Decision: Layered hybrid — mDNS primary, UDP broadcast fallback

### Rationale

Neither approach alone is robust enough for the target environment (small office, mixed macOS/Windows, managed Wi-Fi):

- **mDNS** (via `multicast-dns` npm package) is the clean, zero-config standard. It works natively on macOS (Bonjour) and Windows 10+ (native mDNS stack). It advertises a named service type (`_link._tcp`) with metadata (port, version). However, enterprise/managed Wi-Fi networks often block or throttle multicast traffic, and port 5353 can conflict with other services.

- **UDP broadcast** is simpler and more robust in controlled LAN environments. It requires no OS-level service and bypasses multicast group membership complexity. However, it adds network "chatter" and requires custom lifecycle management (peer timeout / keepalive).

A **layered strategy** gives the best of both: attempt mDNS first (clean, standard); fall back to UDP broadcast within a short timeout (resilient). This is the established pattern for production LAN discovery tools.

### Alternatives Considered

| Option | Verdict |
|--------|---------|
| mDNS only | Rejected — silently fails on managed corporate Wi-Fi; port conflicts |
| UDP broadcast only | Rejected — non-standard; less efficient on clean networks |
| Hardcoded IP / manual entry | Rejected — violates zero-config requirement (FR-001) |

### Implementation Notes

- Use `multicast-dns` npm package for mDNS in the Electron main process.
- UDP broadcast socket runs on a fixed agreed-upon port (e.g., 47431) as fallback.
- Discovery messages contain only minimum metadata: display name, device ID, protocol version, listening port. No sensitive data in discovery payloads (unencrypted).
- Run both discovery listeners in the Electron main process (not renderer) — satisfies Constitution Principle I.
- Show "No peers found — your network may block peer discovery" if both mechanisms fail within 10s.

---

## 2. E2E Encryption Key Exchange: Noise Protocol Framework vs. TLS 1.3

### Decision: Noise Protocol Framework — `Noise_XX` handshake pattern

### Rationale

Link has no central server, no certificate authority, and uses TOFU key management. This makes TLS 1.3 a poor fit:

- TLS 1.3 is built around X.509 certificates and PKI — creating a certificate authority for a serverless LAN tool is architectural overkill and adds fragile management burden.
- Noise Protocol Framework was specifically designed for P2P, serverless encrypted channels. It is used in production by WireGuard, WhatsApp's Signal Protocol layer, and Lightning Network. It produces lean, low-latency handshakes with mutual authentication and forward secrecy.
- The `Noise_XX` pattern (mutual auth, both parties transmit their static public key during handshake) maps exactly to the TOFU model: both peers learn each other's public keys during the first handshake and can then compare fingerprints.

**Do not implement Noise from scratch.** Use the audited `@stablelib/x25519` + `@stablelib/chacha20poly1305` primitives, or the `noise-protocol` npm package, which provides a spec-compliant implementation.

### Alternatives Considered

| Option | Verdict |
|--------|---------|
| TLS 1.3 with self-signed certs | Rejected — certificate lifecycle complexity; designed for client-server, not P2P |
| libp2p Noise | Considered — full libp2p stack is too heavy for a desktop messenger MVP |
| Signal Protocol (Double Ratchet) | Post-MVP — adds forward-secrecy per-message; appropriate when persistent message history is added |
| Raw AES-GCM with pre-shared key | Rejected — key distribution problem unsolved; weaker than Noise_XX |

### Implementation Notes

- Each peer generates a **Curve25519** keypair on first launch, stored encrypted in local storage.
- `Noise_XX` handshake on every new TCP connection: provides mutual authentication and establishes a session key.
- After handshake, all payloads encrypted with **ChaCha20-Poly1305** (authenticated, fast on ARM/x86 without AES-NI).
- Run all cryptographic operations in the Electron **main process or a Node worker thread** — never in the renderer. Satisfies Constitution Principle I (NON-NEGOTIABLE).
- Public key fingerprints displayed as truncated hex or emoji-encoded for user verification (FR-015).

---

## 3. Local Storage: SQLite vs. Encrypted Flat Files

### Decision: Hybrid — SQLite (`better-sqlite3` + SQLCipher) for structured data, `electron-store` + OS keychain for config/credentials

### Rationale

Link has two distinct storage categories requiring different solutions:

**Structured data** (known-peers list, session message history, file transfer records):
- SQLite with `better-sqlite3` is the industry standard for Electron apps with structured, queryable data. It is synchronous, ACID-compliant, and the fastest Node.js SQLite binding.
- SQLCipher extension provides transparent at-rest encryption for the entire database file — encrypting the known-peers list (which contains public keys, a sensitive security asset).
- WAL mode enables non-blocking reads during writes, keeping the UI responsive.
- **Run all database I/O in the Electron main process** (not renderer) — satisfies Principle I.

**Credentials/config** (user's own private key, display name, app settings):
- `electron-store` with Electron's native `safeStorage` API encrypts small config values using the OS keychain (macOS Keychain, Windows DPAPI). This is the most secure approach for private key storage — keys are bound to the OS user account.
- No native compilation complexity for this path.

### Alternatives Considered

| Option | Verdict |
|--------|---------|
| Encrypted JSON flat files for everything | Rejected — requires loading entire file for every update; corruption risk; no query capability |
| RxDB | Rejected — additional abstraction layer; no sync needed (no server); overkill for MVP |
| IndexedDB / localStorage (renderer) | Rejected — runs in renderer thread; violates Principle I; no encryption path |
| Plain SQLite without SQLCipher | Rejected — known-peers public keys must be encrypted at rest (security requirement) |

### Implementation Notes

- **DB file location**: Electron `app.getPath('userData')` — platform-appropriate, sandboxed per OS user.
- **Schema**: Three tables: `peers` (id, display_name, public_key, last_seen), `messages` (session-scoped, cleared on app exit — satisfies spec assumption), `file_transfers` (transfer log for current session).
- **Private key storage**: Electron `safeStorage.encryptString()` → stored via `electron-store`. Never stored in the SQLite DB.
- **SQLCipher key**: Derived from the OS keychain entry using `safeStorage`, not hardcoded.

---

## Summary: All NEEDS CLARIFICATION Resolved

| Item | Resolution |
|------|-----------|
| Peer discovery mechanism | mDNS primary + UDP broadcast fallback |
| Encryption handshake | Noise Protocol Framework, `Noise_XX` pattern, Curve25519 + ChaCha20-Poly1305 |
| Local storage | SQLite + SQLCipher (structured data) + electron-store + safeStorage (credentials/config) |
