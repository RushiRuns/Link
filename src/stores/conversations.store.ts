import { create } from 'zustand';
import { LinkMessage } from '../types/ipc';
import { playNotificationSound } from '../utils/audio';
import { useAppStore } from './app.store';

interface ConversationsState {
  messages: Map<string, LinkMessage[]>; // conversationId -> LinkMessage[]
  unreadCounts: Map<string, number>; // conversationId -> count
  addMessage: (message: LinkMessage) => void;
  updateDeliveryStatus: (messageId: string, status: LinkMessage['deliveryStatus']) => void;
  markConversationRead: (conversationId: string) => void;
  sendMessage: (peerId: string, content: string) => Promise<void>;
  initListeners: () => () => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  messages: new Map(),
  unreadCounts: new Map(),

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

    return () => {
      cleanReceived();
      cleanDelivered();
    };
  }
}));
