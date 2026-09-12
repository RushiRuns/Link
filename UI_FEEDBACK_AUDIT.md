# Link LAN Messenger — UI Feedback Audit & Action Matrix

This document provides a comprehensive audit of all user actions and operations across the Link LAN Messenger desktop application that currently lack immediate, perceptible UI feedback. It catalogs the current behavior, the user experience friction it causes, and the recommended UI feedback pattern for each operation.

---

## Table of Contents
1. [Core UX Feedback Principles](#core-ux-feedback-principles)
2. [Category 1: Direct Messaging & Chat Interaction](#category-1-direct-messaging--chat-interaction)
3. [Category 2: Settings, Identity & Peer Profile](#category-2-settings-identity--peer-profile)
4. [Category 3: Group Mesh Chat & Member Management](#category-3-group-mesh-chat--member-management)
5. [Category 4: File Transfers & Download Tray](#category-4-file-transfers--download-tray)
6. [Category 5: Audio/Video Calling & Screen Sharing](#category-5-audiovideo-calling--screen-sharing)
7. [Category 6: Remote Desktop Access & Control](#category-6-remote-desktop-access--control)
8. [Category 7: Error States & Native Dialog Replacements](#category-7-error-states--native-dialog-replacements)
9. [Recommended Technical Architecture](#recommended-technical-architecture)

---

## Core UX Feedback Principles

For a desktop application running in Electron, UI feedback must be:
- **Immediate (<50ms)**: Direct response to mouse clicks or keyboard triggers to acknowledge user intent.
- **Contextual**: Located near the trigger element whenever possible (e.g., button icon morphing or tooltip updates) rather than distracting screen-wide alerts.
- **Non-blocking**: Avoid native OS dialogs (`window.alert`, `window.confirm`) that freeze the renderer thread.
- **Consistent**: Standardized animations, color tokens, and durations (e.g., 1.5s for micro-state checkmarks, 3s for toast notifications).

---

## Category 1: Direct Messaging & Chat Interaction

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1.1** | **Copy Message Content** | [`MessageBubble.tsx`](file:///c:/Dev/Link/src/components/conversations/MessageBubble.tsx#L194-L200) | Copies text to clipboard silently. The `<Copy />` icon and tooltip remain unchanged. | User clicks repeatedly or paste-checks because they are uncertain if the clipboard took the text. | **Button Micro-State**: Morph `<Copy />` icon into `<Check color="var(--status-online)" />` for 1.5s and update tooltip from "Copy" to "Copied!". | **Critical** |
| **1.2** | **Copy Teammate Fingerprint** | [`ConversationView.tsx`](file:///c:/Dev/Link/src/components/conversations/ConversationView.tsx#L360-L379) | Clicking the `<Shield />` icon next to the peer's name copies the fingerprint to clipboard silently. | Zero feedback on a security-sensitive identity fingerprint. | Temporarily swap the `<Shield />` icon to a `<Check />` icon for 1.5s and/or trigger a brief toast: *"Fingerprint copied to clipboard"*. | **High** |
| **1.3** | **Message Edit Mode Indication** | [`ConversationView.tsx`](file:///c:/Dev/Link/src/components/conversations/ConversationView.tsx#L649-L654)<br>[`MessageInput.tsx`](file:///c:/Dev/Link/src/components/conversations/MessageInput.tsx#L257-L298) | Clicking "Edit" prefills input, but there is no banner indicating an edit is in progress (unlike the Reply banner). | User can lose context of which message is being edited or may not realize they are in edit mode. | Add an **"Editing message" banner** above `MessageInput` (matching the Replying banner style) showing the original message excerpt, an `[Esc to cancel]` hint, and an (X) close button. | **High** |
| **1.5** | **Retry Failed Delivery** | [`MessageBubble.tsx`](file:///c:/Dev/Link/src/components/conversations/MessageBubble.tsx#L58-L68) | Clicking the red warning icon retries sending, but the icon remains static until network returns. | User doesn't know if the re-send request was dispatched. | Temporarily pulse or spin the alert icon to signify an active re-transmission attempt. | **Medium** |

---

## Category 2: Settings, Identity & Peer Profile

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2.1** | **Save Display Name** | [`SettingsPanel.tsx`](file:///c:/Dev/Link/src/components/settings/SettingsPanel.tsx#L148-L173) | User clicks "Save". The button transitions to disabled state with no text change or acknowledgment. | Users are left wondering if the name was saved or if it silently failed. | Change button text to `<Check size={14} /> Saved!` with a green background for 1.5s, plus a toast: *"Display name updated"*. | **High** |
| **2.2** | **Copy TOFU Fingerprint (Settings)** | [`SettingsPanel.tsx`](file:///c:/Dev/Link/src/components/settings/SettingsPanel.tsx#L189-L208) | Fingerprint is displayed inside a static box with no copy button or click-to-copy handler. | Selecting 64 hexadecimal characters manually is tedious and error-prone. | Add a dedicated copy button next to the fingerprint with instant *"Copied"* feedback. | **High** |
| **2.3** | **Copy Peer Fingerprint (Profile)** | [`PeerProfile.tsx`](file:///c:/Dev/Link/src/components/peers/PeerProfile.tsx#L108-L116) | Fingerprint is rendered as plain text without a copy action. | Teammates cannot easily copy out-of-band identity verification keys. | Add a click-to-copy action on the fingerprint card with a *"Copied"* badge. | **High** |
| **2.4** | **Change Download Folder** | [`SettingsPanel.tsx`](file:///c:/Dev/Link/src/components/settings/SettingsPanel.tsx#L295-L311) | User selects a directory via OS dialog. The text silently updates. | Subtle path change is easy to overlook. | Show a temporary checkmark indicator or toast: *"Download folder updated"*. | **Low** |

---

## Category 3: Group Mesh Chat & Member Management

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **3.1** | **Create New Group** | [`GroupCreate.tsx`](file:///c:/Dev/Link/src/components/groups/GroupCreate.tsx#L30-L39) | `createGroup` runs asynchronously; button has no loading state, and modal vanishes abruptly. | User experiences a momentary freeze or wonder if group was created. | Show a spinner inside the "Create Group" button while deriving mesh keys, followed by toast: *"Group '[Name]' created"*. | **High** |
| **3.2** | **Rename Group** | [`GroupView.tsx`](file:///c:/Dev/Link/src/components/groups/GroupView.tsx#L619-L644) | Clicking Save closes the inline input with no feedback. | No confirmation that the updated name was propagated to other peers. | Toast: *"Group renamed to '[New Name]'"*. | **Medium** |
| **3.3** | **Add Member to Group** | [`GroupView.tsx`](file:///c:/Dev/Link/src/components/groups/GroupView.tsx#L680-L689) | User selects teammates and clicks "Add". Picker closes instantly. | No feedback on how many peers were added or if peer invitation succeeded. | Toast: *"Added X member(s) to [Group Name]"*. | **Medium** |
| **3.4** | **Remove Member from Group** | [`GroupView.tsx`](file:///c:/Dev/Link/src/components/groups/GroupView.tsx#L783-L790) | Clicking "Remove" deletes the member from the list with no feedback. | Abrupt removal without confirmation. | Toast: *"Removed [Name] from [Group Name]"*. | **Medium** |
| **3.5** | **Delete Group** | [`GroupView.tsx`](file:///c:/Dev/Link/src/components/groups/GroupView.tsx#L714-L721) | Clicking "Yes, Delete" clears group state and resets view abruptly to blank screen. | Feels like an accidental UI crash or blank screen bug. | Toast: *"Group '[Name]' deleted"*. | **Medium** |
| **3.6** | **Copy Group Message** | [`GroupView.tsx`](file:///c:/Dev/Link/src/components/groups/GroupView.tsx#L112-L115) | Copies group message to clipboard with no feedback (same as direct chat). | Same copy uncertainty. | Button micro-state: Morph `<Copy />` icon into `<Check />` for 1.5s. | **Critical** |

---

## Category 4: File Transfers & Download Tray

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **4.1** | **Accept / Decline File Offer** | [`FileTransferOffer.tsx`](file:///c:/Dev/Link/src/components/file-transfer/FileTransferOffer.tsx#L104-L146) | Modal closes abruptly upon clicking Accept or Decline. | User is unsure if the file started downloading or where it is going. | Brief toast: *"Transfer accepted — downloading to Link folder"* or *"Transfer declined"*. | **High** |
| **4.2** | **Send Files from Preview Modal** | [`FilePreviewModal.tsx`](file:///c:/Dev/Link/src/components/file-transfer/FilePreviewModal.tsx#L80-L83) | Modal immediately disappears upon clicking Send. | No instant indicator that the file transfer was queued or offered over LAN. | Toast: *"Sending X file(s) to [Peer/Group]"*. | **Medium** |
| **4.3** | **Open Downloaded File / Folder** | [`SessionDownloads.tsx`](file:///c:/Dev/Link/src/components/file-transfer/SessionDownloads.tsx#L132-L156) | Clicking a downloaded item calls Electron IPC to reveal in Windows Explorer. Row has no click feedback. | If Explorer takes a second to launch, the user clicks repeatedly. If file was deleted on disk, nothing happens. | Add an active press state on the row and trigger an error toast if the file no longer exists at path. | **Medium** |

---

## Category 5: Audio/Video Calling & Screen Sharing

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **5.1** | **Select Screen to Share** | [`ScreenPickerModal.tsx`](file:///c:/Dev/Link/src/components/calls/ScreenPickerModal.tsx#L134-L156) | Clicking a screen card dismisses the modal immediately while WebRTC stream negotiation takes 1-2s. | The delay between clicking and stream appearance feels unresponsive. | Show a quick loading overlay *"Connecting screen stream..."* on the selected thumbnail before closing. | **Medium** |
| **5.2** | **End / Decline Call** | [`IncomingCallModal.tsx`](file:///c:/Dev/Link/src/components/calls/IncomingCallModal.tsx#L91-L109)<br>[`CallScreen.tsx`](file:///c:/Dev/Link/src/components/calls/CallScreen.tsx#L217-L220) | Clicking "End Call" or "Decline" closes modal instantly. | No clear indication of call termination status (e.g., "Call ended — 04:12"). | Brief status banner or toast indicating duration and completion. | **Low** |

---

## Category 6: Remote Desktop Access & Control

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **6.1** | **Request Remote Access** | [`RemoteAccessButton.tsx`](file:///c:/Dev/Link/src/components/remote-access/RemoteAccessButton.tsx#L24-L48) | Button pulses and tooltip says "Waiting...". | No banner or in-chat notification informing the user that the request was sent. | Trigger a toast: *"Remote access request sent to [Teammate]"*. | **Medium** |
| **6.2** | **Deny Remote Access Request** | [`RemoteAccessPromptModal.tsx`](file:///c:/Dev/Link/src/components/remote-access/RemoteAccessPromptModal.tsx#L163-L181) | Modal closes immediately when host denies. | Viewer gets no distinct reason why request closed. | Toast: *"Remote access request was declined"*. | **Medium** |
| **6.3** | **End Remote Access Session** | [`RemoteAccessHostIndicator.tsx`](file:///c:/Dev/Link/src/components/remote-access/RemoteAccessHostIndicator.tsx#L65-L86)<br>[`RemoteAccessToolbar.tsx`](file:///c:/Dev/Link/src/components/remote-access/RemoteAccessToolbar.tsx#L63-L84) | Clicking "Stop Sharing" or "Disconnect" abruptly closes the viewer or indicator. | Abrupt screen transition without confirmation. | Toast: *"Remote access session ended"*. | **Low** |

---

## Category 7: Error States & Native Dialog Replacements

| # | Action / Trigger | Source File & Location | Current Behavior | UX Friction | Recommended UI Feedback | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **7.1** | **Message Deletion Error** | [`ConversationView.tsx`](file:///c:/Dev/Link/src/components/conversations/ConversationView.tsx#L141) | Uses `window.alert('Failed to delete message. The teammate may be offline or unreachable.')`. | Native browser alert blocks the UI and disrupts application aesthetic. | Replace with an in-app error toast: `toast.error("Failed to delete message. Teammate may be offline.")`. | **Critical** |
| **7.2** | **Remote Access During File Transfer** | [`RemoteAccessButton.tsx`](file:///c:/Dev/Link/src/components/remote-access/RemoteAccessButton.tsx#L31-L35) | Uses `window.confirm("A file transfer is currently active... Continue?")`. | Native blocking confirm dialog looks outdated and freezes renderer. | Replace with an in-app confirmation modal or banner. | **High** |

---

## Recommended Technical Architecture

To deliver these improvements efficiently and maintainably across Link LAN Messenger, the following architecture is recommended:

```
src/
├── stores/
│   └── toast.store.ts             # Global toast state (addToast, removeToast, types: success, error, info)
├── components/
│   ├── design-system/
│   │   ├── ToastContainer.tsx     # Fixed top/bottom notification stack with smooth slide-in/fade
│   │   └── CopyButton.tsx         # Reusable copy button with 1.5s checkmark micro-state
│   └── ...
```

### Key Components to Implement:
1. **Global Toast Store (`useToastStore`)**:
   - Manages a FIFO queue of ephemeral notifications.
   - Configurable duration (default 3000ms), dismissible on click.
   - Typed notification variants: `'success' | 'error' | 'info' | 'warning'`.
2. **Reusable Copy Feedback Pattern**:
   - Encapsulate the `copied` state timer logic into a reusable `<CopyButton />` component or a custom hook `useClipboardCopy()`.
   - Used seamlessly in `MessageBubble`, `ConversationView` header, `SettingsPanel`, and `PeerProfile`.
3. **Consolidation of Existing Ad-hoc Toasts**:
   - Replace the localized `toastMessage` state in `ConversationView.tsx` with the unified global toast system so that toasts are visible regardless of which pane is open.
