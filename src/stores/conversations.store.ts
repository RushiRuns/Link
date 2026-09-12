import { create } from 'zustand';
import { LinkMessage } from '../types/ipc';
import { playNotificationSound } from '../utils/audio';
import { useAppStore } from './app.store';

interface ConversationsState {
  messages: Map<string, LinkMessage[]>; // conversationId -> LinkMessage[]
  unreadCounts: Map<string, number>; // conversationId -> count
  typingPeers: Map<string, number>; // conversationId -> timestamp
  editingMessageIds: Record<string, string | null>;
  replyingToMessageIds: Record<string, string | null>;
  addMessage: (message: LinkMessage) => void;
  updateDeliveryStatus: (messageId: string, status: LinkMessage['deliveryStatus']) => void;
  markConversationRead: (conversationId: string) => void;
  clearConversation: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping?: boolean) => void;
  clearExpiredTyping: () => void;
  setEditingMessageId: (conversationId: string, id: string | null) => void;
  setReplyingToMessageId: (conversationId: string, id: string | null) => void;
  editMessageLocally: (conversationId: string, messageId: string, newContent: string) => void;
  deleteMessageLocally: (conversationId: string, messageId: string) => void;
  sendMessage: (peerId: string, content: string, replyToMessageId?: string) => Promise<void>;
  loadFromDisk: () => Promise<void>;
  initListeners: () => () => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  messages: new Map(),
  unreadCounts: new Map(),
  typingPeers: new Map(),
  editingMessageIds: {},
  replyingToMessageIds: {},

  addMessage: (message) => {
    const convId = message.conversationId || 'default';
    set((state) => {
      const nextMessages = new Map(state.messages);
      const existing = nextMessages.get(convId) || [];
      
      // Avoid duplicate messages
      if (!existing.some((m) => m.id === message.id)) {
        let maxLogical = 0;
        if (existing.length > 0) {
          maxLogical = Math.max(...existing.map(m => m.logicalTimestamp || m.timestamp));
        }
        
        // Ensure strictly increasing monotonic timestamps for local timeline
        const messageLogical = Math.max(message.timestamp, maxLogical + 1);
        const msgWithLogical = { ...message, logicalTimestamp: messageLogical };
        
        nextMessages.set(convId, [...existing, msgWithLogical]);
      }

      const nextUnreads = new Map(state.unreadCounts);
      if (message.deliveryStatus === 'delivered') {
        const { selectedPeerId } = useAppStore.getState();
        // Only increment unread count if we are not actively viewing this peer's chat
        const isActiveConversation = selectedPeerId && convId.split('_').includes(selectedPeerId);
        if (!isActiveConversation) {
          const count = nextUnreads.get(convId) || 0;
          nextUnreads.set(convId, count + 1);
        }
      }

      return { messages: nextMessages, unreadCounts: nextUnreads };
    });
  },

  updateDeliveryStatus: (messageId, status) => {
    set((state) => {
      const nextMessages = new Map(state.messages);
      let updated = false;

      for (const [convId, list] of nextMessages.entries()) {
        const index = list.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          const newList = [...list];
          newList[index] = { ...newList[index], deliveryStatus: status };
          nextMessages.set(convId, newList);
          updated = true;
          break;
        }
      }

      return updated ? { messages: nextMessages } : state;
    });
  },

  markConversationRead: (conversationId) => {
    set((state) => {
      const nextUnreads = new Map(state.unreadCounts);
      nextUnreads.delete(conversationId);
      return { unreadCounts: nextUnreads };
    });
  },

  clearConversation: (conversationId) => {
    set((state) => {
      const nextMessages = new Map(state.messages);
      nextMessages.delete(conversationId);
      
      const nextUnreads = new Map(state.unreadCounts);
      nextUnreads.delete(conversationId);
      
      return { messages: nextMessages, unreadCounts: nextUnreads };
    });
  },

  setTyping: (conversationId, isTyping = true) => {
    set((state) => {
      const nextTyping = new Map(state.typingPeers);
      if (isTyping) {
        nextTyping.set(conversationId, Date.now());
      } else {
        nextTyping.delete(conversationId);
      }
      return { typingPeers: nextTyping };
    });
  },

  clearExpiredTyping: () => {
    set((state) => {
      const now = Date.now();
      let changed = false;
      const nextTyping = new Map(state.typingPeers);
      for (const [convId, timestamp] of nextTyping.entries()) {
        if (now - timestamp > 5000) { // 5 seconds timeout
          nextTyping.delete(convId);
          changed = true;
        }
      }
      return changed ? { typingPeers: nextTyping } : state;
    });
  },

  setEditingMessageId: (conversationId, id) => set((state) => ({ editingMessageIds: { ...state.editingMessageIds, [conversationId]: id } })),
  setReplyingToMessageId: (conversationId, id) => set((state) => ({ replyingToMessageIds: { ...state.replyingToMessageIds, [conversationId]: id } })),

  editMessageLocally: (conversationId, messageId, newContent) => {
    set((state) => {
      const nextMessages = new Map(state.messages);
      const list = nextMessages.get(conversationId);
      if (list) {
        const index = list.findIndex(m => m.id === messageId);
        if (index !== -1) {
          const newList = [...list];
          newList[index] = { ...newList[index], content: newContent, isEdited: true, lastEditTimestamp: Date.now() };
          nextMessages.set(conversationId, newList);
          return { messages: nextMessages };
        }
      }
      return state;
    });
  },

  deleteMessageLocally: (conversationId, messageId) => {
    set((state) => {
      const nextMessages = new Map(state.messages);
      const list = nextMessages.get(conversationId);
      if (list) {
        const newList = list.filter(m => m.id !== messageId);
        nextMessages.set(conversationId, newList);
        return { messages: nextMessages };
      }
      return state;
    });
  },

  sendMessage: async (peerId, content, replyToMessageId) => {
    if (window.link?.messaging) {
      try {
        const msg = await window.link.messaging.sendMessage(peerId, content, replyToMessageId);
        get().addMessage(msg);
      } catch (err) {
        console.error('[ConversationsStore] Error sending message:', err);
        try {
          const id = await window.link.identity?.getIdentity();
          if (id) {
            const conversationId = [id.deviceId, peerId].sort().join('_');
            const failedMsg: LinkMessage = {
              id: 'failed_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
              conversationId,
              senderId: id.deviceId,
              senderName: id.displayName,
              content,
              timestamp: Date.now(),
              deliveryStatus: 'failed',
              replyToMessageId
            };
            get().addMessage(failedMsg);
          }
        } catch (e) {
          console.error('Failed to add optimistic failed message', e);
        }
      }
    }
  },

  loadFromDisk: async () => {
    if (window.link?.messaging?.loadMessages) {
      try {
        const data = await window.link.messaging.loadMessages();
        const map = new Map<string, LinkMessage[]>();
        for (const [convId, msgs] of Object.entries(data)) {
          map.set(convId, msgs);
        }
        set({ messages: map });
      } catch (err) {
        console.error('[ConversationsStore] Error loading messages from disk:', err);
      }
    }
  },

  initListeners: () => {
    if (!window.link?.messaging) return () => {};
    let lastNotificationTime = 0;

    const cleanReceived = window.link.messaging.onMessageReceived((message) => {
      if (message.wokeApp) {
        useAppStore.getState().selectPeer(message.senderId);
        useAppStore.getState().setActiveView('chat');
      }

      get().addMessage(message);
      
      if (window.link.messaging.ackMessageReceipt) {
        window.link.messaging.ackMessageReceipt(message.senderId, message.id);
      }

      const { selectedPeerId } = useAppStore.getState();
      // Flash and play sound if we are not actively viewing this peer's chat, OR if the app is in the background
      if (selectedPeerId !== message.senderId || !document.hasFocus()) {
        const now = Date.now();
        if (now - lastNotificationTime > 1000) {
          window.electron?.flashFrame(true);
          playNotificationSound();
          lastNotificationTime = now;
        }
      }
    });

    const cleanDelivered = window.link.messaging.onMessageDelivered((messageId) => {
      get().updateDeliveryStatus(messageId, 'delivered');
    });

    const cleanTyping = window.link.messaging.onTypingReceived((event) => {
      if (event.conversationId) {
        get().setTyping(event.conversationId, event.isTyping);
      }
    });

    const cleanEdited = window.link.messaging.onMessageEdited((event) => {
      set((state) => {
        const nextMessages = new Map(state.messages);
        let changed = false;
        for (const [convId, list] of nextMessages.entries()) {
          const idx = list.findIndex(m => m.id === event.messageId);
          if (idx !== -1 && list[idx].senderId === event.senderDeviceId) {
            const currentLastEdit = list[idx].lastEditTimestamp || 0;
            const newEditTime = event.editTimestamp || 0;
            if (newEditTime >= currentLastEdit) {
              const newList = [...list];
              newList[idx] = { 
                ...newList[idx], 
                content: event.newContent, 
                isEdited: true,
                lastEditTimestamp: newEditTime
              };
              nextMessages.set(convId, newList);
              changed = true;
            }
            break;
          }
        }
        return changed ? { messages: nextMessages } : state;
      });
    });

    const cleanDeleted = window.link.messaging.onMessageDeleted((event) => {
      set((state) => {
        const nextMessages = new Map(state.messages);
        let changed = false;
        for (const [convId, list] of nextMessages.entries()) {
          const idx = list.findIndex(m => m.id === event.messageId);
          if (idx !== -1 && list[idx].senderId === event.senderDeviceId) {
            const newList = list.filter(m => m.id !== event.messageId);
            nextMessages.set(convId, newList);
            changed = true;
            break;
          }
        }
        return changed ? { messages: nextMessages } : state;
      });
    });

    const typingInterval = setInterval(() => {
      get().clearExpiredTyping();
    }, 1000);

    return () => {
      cleanReceived();
      cleanDelivered();
      cleanTyping();
      cleanEdited();
      cleanDeleted();
      clearInterval(typingInterval);
    };
  }
}));

let saveTimeout: any;
let lastMessages: Map<string, LinkMessage[]> | null = null;

useConversationsStore.subscribe((state) => {
  if (state.messages !== lastMessages) {
    lastMessages = state.messages;
    
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (window.link?.messaging?.saveMessages) {
        const record: Record<string, LinkMessage[]> = {};
        for (const [convId, msgs] of state.messages.entries()) {
          record[convId] = msgs;
        }
        try {
          await window.link.messaging.saveMessages(record);
        } catch (err) {
          console.error('[ConversationsStore] Error saving messages to disk:', err);
        }
      }
    }, 500); // 500ms debounce
  }
});

window.addEventListener('beforeunload', () => {
  if (saveTimeout && lastMessages && window.link?.messaging?.saveMessages) {
    clearTimeout(saveTimeout);
    const record: Record<string, LinkMessage[]> = {};
    for (const [convId, msgs] of lastMessages.entries()) {
      record[convId] = msgs;
    }
    // Fire and forget, OS usually allows small async IPC messages in beforeunload
    window.link.messaging.saveMessages(record);
  }
});
