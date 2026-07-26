<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: (new — no prior version)
Added sections:
  - I. Performance First (NON-NEGOTIABLE)
  - II. Native-Feel Design System
  - III. Full Light/Dark Mode Support
  - IV. Security by Default (NON-NEGOTIABLE)
  - V. Cross-Platform Consistency
  - Technology Constraints
  - Quality Gates
  - Governance
Templates updated:
  ✅ .specify/templates/plan-template.md — Constitution Check section annotated
  ✅ .specify/templates/spec-template.md — Requirements section annotated
  ✅ .specify/templates/tasks-template.md — Foundational phase annotated
Deferred TODOs:
  - TODO(TESTING_STANDARD): Unit/E2E test requirements not yet defined — see Quality Gates
  - TODO(RELEASE_PROCESS): Versioning/release cadence not yet defined — see Quality Gates
-->

# Link Constitution

## Core Principles

### I. Performance First (NON-NEGOTIABLE)

Every feature MUST be evaluated for speed and responsiveness before it is evaluated for
anything else. Message send/receive, UI transitions, and app launch MUST feel instant.

- No feature ships if it introduces perceptible lag on the main thread (renderer process).
- Heavy work — including encryption, file transfer, and peer discovery — MUST run off
  the renderer's main thread using worker threads or the Electron main process.
- Performance regressions discovered in code review or QA are blocking issues; the
  feature MUST NOT merge until resolved.

### II. Native-Feel Design System

The UI MUST follow a macOS Sequoia-inspired design language consistently across all
screens and states.

- Rounded corners, translucency/vibrancy, and system-standard spacing and typography
  MUST be used where appropriate.
- Dark mode MUST use a matte dark-grey palette (not pure black) as the dominant surface
  color, consistent with macOS Sequoia's dark appearance — not a generic dark theme.
- Ad-hoc or inconsistent visual styling is a defect, not a preference.

### III. Full Light/Dark Mode Support

The app MUST support both light and dark themes at all times.

- The OS-level appearance setting MUST be respected by default (no manual toggle required
  from users unless they want to override).
- No visual regressions or unstyled elements are permitted in either mode.
- New UI components MUST be verified in both modes before merging.

### IV. Security by Default (NON-NEGOTIABLE)

End-to-end encryption MUST be built in from the first working version — it MUST NOT be
retrofitted after the fact.

- No message or file transfer path may exist without encryption, including early
  prototypes and development builds.
- Encryption MUST be implemented before P2P messaging is considered "working."
- Any code path that transmits user data without encryption is a critical defect and
  MUST be fixed before any other work proceeds.

### V. Cross-Platform Consistency

The app MUST run on both macOS and Windows with full feature parity.

- Platform-specific OS integrations are permitted (e.g., macOS traffic-light window
  controls vs. Windows title bar styling).
- Core functionality and visual identity MUST remain consistent across both platforms.
- A feature is not "done" until it has been verified on both target operating systems.

## Technology Constraints

- **Framework**: Electron
- **UI Layer**: React + TypeScript
- **Encryption**: MUST be implemented before P2P messaging is considered "working"
  (not an add-on milestone — see Principle IV).
- **Target OS**: macOS, Windows

These constraints are fixed for the current major version. Changes require a constitution
amendment and MAJOR version bump.

## Quality Gates

- TODO(TESTING_STANDARD): Testing requirements are not yet defined (e.g., unit tests
  required per feature? End-to-end tests for messaging flow?). This MUST be resolved
  before `/speckit-plan` enforces test gates. All specs and plans should note this as
  NEEDS CLARIFICATION until resolved.
- TODO(RELEASE_PROCESS): Versioning and release process are not yet defined (e.g.,
  semantic versioning, auto-update cadence). This MUST be resolved before a v1.0 release
  is planned. Feature branches and commits should follow conventional commit style in
  the interim.

## Governance

This constitution supersedes all other development practices for Link. All specs, plans,
and tasks MUST be checked against these principles before acceptance.

- Compliance with Principles I and IV (Performance First, Security by Default) is
  NON-NEGOTIABLE. Violations are blocking defects, not backlog items.
- Amendments to this constitution require:
  1. Explicit re-approval from the project owner.
  2. A version bump following semantic versioning (see below).
  3. An updated `Last Amended` date.
- **Versioning policy**:
  - MAJOR: Backward-incompatible principle removals or redefinitions.
  - MINOR: New principle or section added, or materially expanded guidance.
  - PATCH: Clarifications, wording fixes, non-semantic refinements.
- All PRs and reviews MUST verify compliance with these principles. Complexity that
  violates a principle MUST be justified in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-07-26 | **Last Amended**: 2026-07-26
