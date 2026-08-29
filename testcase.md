Searched for "test"
Viewed package.json:1-66
Listed directory specs
Searched for "loadMessages"
Viewed message-store.ts:1-100
Viewed conversations.store.ts:1-100

Here is a comprehensive, step-by-step **Test Case Specification** designed to rigorously verify that the file/image transfer history and timeline fix works as expected across all scenarios.

---

# 🧪 Test Specification: File & Image Transfer Chat Timeline & History Persistence

| Test Suite | LAN Chat & File Transfer Synchronization |
| :--- | :--- |
| **Peer Under Test** | Rohan (or secondary peer/instance) |
| **Target Platforms** | Electron Desktop (Windows / macOS / Linux) |
| **Pass Criteria** | 100% of all test steps pass with zero timeline jumps or missing transfer history |

---

## 📋 Test Scenario Matrix

```
[Text Message] ──> [File Transfer (Success)] ──> [Text Message] ──> [File Transfer (Declined)] ──> [Restart App] ──> [Verify Full Timeline Intact]
```

---

### Test Case 1: Outgoing File & Image Transfer in Chat Timeline
**Objective:** Verify that outgoing file transfers and pasted image transfers appear inline as cards within the conversation stream.

* **Steps:**
  1. Open conversation with peer **Rohan**.
  2. Send a text message: `"Sending you the design assets"`.
  3. Attach and send a document (`.pdf` or `.zip`).
  4. Paste or drag-and-drop an image (`.png` or `.jpg`) into the chat.
  5. Send another text message: `"Let me know once received"`.
* **Expected Result:**
  * ✅ Text message 1 appears first.
  * ✅ Document transfer card appears next with filename, file size, and upload progress.
  * ✅ Image transfer card appears after the document, showing a thumbnail preview.
  * ✅ Text message 2 appears at the bottom.
  * ✅ Chat scrolls smoothly without jumping or misplacing any blocks.

---

### Test Case 2: Incoming File & Image Transfer in Chat Timeline
**Objective:** Verify that files and images received from Rohan render as inline transfer cards in chronological order.

* **Steps:**
  1. Have Rohan send a text message: `"Here are the logs"`.
  2. Have Rohan offer a file or folder transfer.
  3. Send a reply text message: `"Got the notification"`.
* **Expected Result:**
  * ✅ Rohan's text message appears.
  * ✅ Incoming file transfer card appears inline in the chat timeline with **Accept / Save / Decline** action buttons.
  * ✅ Your reply appears right below the incoming transfer card.

---

### Test Case 3: Transfer Outcome States (Completed, Declined, Failed)
**Objective:** Ensure that transfer blocks remain in the chat stream regardless of the final transfer status.

#### 3A. Successful / Completed Transfer
* **Action:** Accept an incoming file and let it finish transferring.
* **Expected Result:**
  * ✅ Card updates status to **Completed**.
  * ✅ Action button changes to **Open File / Show in Folder**.
  * ✅ Card stays in its original timeline position.

#### 3B. Declined / Denied Transfer
* **Action:** 
  * Case A: You click **Decline** on an incoming transfer from Rohan.
  * Case B: Rohan declines a file you sent him.
* **Expected Result:**
  * ✅ The transfer block does **NOT** disappear from the chat feed.
  * ✅ The status badge on the card clearly updates to **Declined** / **Cancelled**.
  * ✅ Timeline position remains intact.

#### 3C. Failed / Interrupted Transfer
* **Action:** Disconnect the network mid-transfer or terminate one peer.
* **Expected Result:**
  * ✅ The transfer block does **NOT** disappear.
  * ✅ The status badge updates to **Failed** (with error details or retry prompt if supported).
  * ✅ Card stays in its exact chronological spot.

---

### Test Case 4: Timeline Sequence & Clock Skew Resilience
**Objective:** Confirm strict chronological ordering between text messages and transfers even under rapid sending or slight clock skew between machines.

* **Steps:**
  1. Send alternating items rapidly:
     * Text: `Message 1`
     * File: `file1.txt`
     * Text: `Message 2`
     * Image: `screenshot.png`
     * Text: `Message 3`
* **Expected Result:**
  * ✅ Visual rendering order exactly matches: `Message 1` ➔ `file1.txt` ➔ `Message 2` ➔ `screenshot.png` ➔ `Message 3`.
  * ✅ No transfers are pinned incorrectly to the top or bottom of the chat history.

---

### Test Case 5: Persistence Across App Reload & Restart (Crucial)
**Objective:** Verify that past transfer history is preserved upon reloading or restarting Link.

* **Steps:**
  1. Complete a conversation with Rohan containing:
     * At least 2 text messages.
     * 1 completed file transfer.
     * 1 declined file transfer.
     * 1 completed image transfer.
  2. Reload the app (`Ctrl + R` or `Cmd + R`) OR completely close and re-launch the Link application.
  3. Click on **Rohan** in the sidebar to open his conversation.
* **Expected Result:**
  * ✅ **All** text messages are loaded and displayed.
  * ✅ **All** file and image transfer blocks (completed, declined, and image previews) are restored in their exact chronological positions.
  * ✅ Completed transfers still retain their **Open Folder** / **File** capability where the downloaded file path exists.

---

### Test Case 6: Conversation Clear Action
**Objective:** Verify that clearing a conversation removes both text and transfer records cleanly.

* **Steps:**
  1. In Rohan's conversation, click the **Clear Conversation / Trash** icon and confirm.
  2. Reload the app.
* **Expected Result:**
  * ✅ Both text messages and file transfer history are cleared.
  * ✅ Empty state view (`"Encrypted 1-to-1 conversation with Rohan"`) is displayed.

---

### 📊 Verification Checklist Summary

| Check ID | Verification Item | Status |
| :--- | :--- | :---: |
| **CHK-01** | Outgoing file/image transfers render inline in chat | 🔲 |
| **CHK-02** | Incoming file/image transfers render inline in chat | 🔲 |
| **CHK-03** | Completed transfers show "Completed" & open actions | 🔲 |
| **CHK-04** | Declined transfers persist as "Declined" cards | 🔲 |
| **CHK-05** | Failed transfers persist as "Failed" cards | 🔲 |
| **CHK-06** | Chat timeline strictly preserves chronological interleaving | 🔲 |
| **CHK-07** | Reloading app (`Ctrl+R` / relaunch) preserves all transfer history | 🔲 |
| **CHK-08** | Clearing conversation clears both messages & transfers | 🔲 |

---

Whenever you are ready to proceed with planning the implementation, let me know!