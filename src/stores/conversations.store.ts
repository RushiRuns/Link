import { create } from 'zustand';
import { LinkMessage } from '../types/ipc';
import { playNotificationSound } from '../utils/audio';
import { useAppStore } from './app.store';

interface ConversationsState {
  messages: Map<string, LinkMessage[]>; // conversationId -> LinkMessage[]
  unreadCounts: Map<string, number>; // conversationId -> count
  typingPeers: Map<string, number>; // conversationId -> timestamp
  addMessage: (message: LinkMessage) => void;
  updateDeliveryStatus: (messageId: string, status: LinkMessage['deliveryStatus']) => void;
  markConversationRead: (conversationId: string) => void;
  clearConversation: (conversationId: string) => void;
  setTyping: (conversationId: string) => void;
  clearExpiredTyping: () => void;
  sendMessage: (peerId: string, content: string) => Promise<void>;
  loadFromDisk: () => Promise<void>;
  initListeners: () => () => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  messages: new Map(),
  unreadCounts: new Map(),
  typingPeers: new Map(),

  addMessage: (message) => {
    const convId = message.conversationId || 'default';
    set((state) => {
      const nextMessages = new Map(state.messages);
      const existing = nextMessages.get(convId) || [];
      
      // Avoid duplicate messages
      if (!existing.some((m) => m.id === message.id)) {
        nextMessages.set(convId, [...existing, message]);
      }

      const nextUnreads = new Map(state.unreadCounts);
      if (message.deliveryStatus === 'delivered') {
        const { selectedPeerId } = useAppStore.getState();
        // Only increment unread count if we are not actively viewing this peer's chat
        if (selectedPeerId !== message.senderId) {
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

  setTyping: (conversationId) => {
    set((state) => {
      const nextTyping = new Map(state.typingPeers);
      nextTyping.set(conversationId, Date.now());
      return { typingPeers: nextTyping };
    });
  },

  clearExpiredTyping: () => {
    set((state) => {
      const now = Date.now();
      let changed = false;
      const nextTyping = new Map(state.typingPeers);
      for (const [convId, timestamp] of nextTyping.entries()) {
        if (now - timestamp > 3000) { // 3 seconds timeout
          nextTyping.delete(convId);
          changed = true;
        }
      }
      return changed ? { typingPeers: nextTyping } : state;
    });
  },

  sendMessage: async (peerId, content) => {
    if (window.link?.messaging) {
      try {
        const msg = await window.link.messaging.sendMessage(peerId, content);
        get().addMessage(msg);
      } catch (err) {
        console.error('[ConversationsStore] Error sending message:', err);
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

    const cleanReceived = window.link.messaging.onMessageReceived((message) => {
      get().addMessage(message);
      
      const { selectedPeerId } = useAppStore.getState();
      // Flash and play sound if we are not actively viewing this peer's chat, OR if the app is in the background
      if (selectedPeerId !== message.senderId || !document.hasFocus()) {
        window.electron?.flashFrame(true);
        playNotificationSound();
      }
    });

    const cleanDelivered = window.link.messaging.onMessageDelivered((messageId) => {
      get().updateDeliveryStatus(messageId, 'delivered');
    });

    const cleanTyping = window.link.messaging.onTypingReceived((event) => {
      if (event.conversationId) {
        get().setTyping(event.conversationId);
      }
    });

    const typingInterval = setInterval(() => {
      get().clearExpiredTyping();
    }, 1000);

    return () => {
      cleanReceived();
      cleanDelivered();
      cleanTyping();
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
