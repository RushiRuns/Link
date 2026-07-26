import { create } from 'zustand';
import { LinkGroup, LinkMessage } from '../types/ipc';

interface GroupsState {
  groups: Map<string, LinkGroup>; // groupId -> LinkGroup
  createGroup: (name: string, memberPeerIds: string[]) => Promise<LinkGroup | undefined>;
  sendGroupMessage: (groupId: string, content: string) => Promise<void>;
  addGroupMessage: (message: LinkMessage) => void;
  addGroup: (group: LinkGroup) => void;
  initListeners: () => () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: new Map(),

  addGroup: (group) => {
    set((state) => {
      const nextMap = new Map(state.groups);
      nextMap.set(group.id, group);
      return { groups: nextMap };
    });
  },

  createGroup: async (name, memberPeerIds) => {
    if (window.link?.groups) {
      try {
        const group = await window.link.groups.createGroup(name, memberPeerIds);
        get().addGroup(group);
        return group;
      } catch (err) {
        console.error('[GroupsStore] Error creating group:', err);
      }
    }
    return undefined;
  },

  sendGroupMessage: async (groupId, content) => {
    if (window.link?.groups) {
      try {
        const msg = await window.link.groups.sendGroupMessage(groupId, content);
        get().addGroupMessage(msg);
      } catch (err) {
        console.error('[GroupsStore] Error sending group message:', err);
      }
    }
  },

  addGroupMessage: (message) => {
    const groupId = message.groupId;
    if (!groupId) return;

    set((state) => {
      const nextMap = new Map(state.groups);
      const existing = nextMap.get(groupId);
      if (existing) {
        const existingMessages = existing.messages || [];
        if (!existingMessages.some((m) => m.id === message.id)) {
          const updatedGroup = {
            ...existing,
            messages: [...existingMessages, message]
          };
          nextMap.set(groupId, updatedGroup);
        }
      }
      return { groups: nextMap };
    });
  },

  initListeners: () => {
    if (!window.link?.groups) return () => {};

    const cleanCreated = window.link.groups.onGroupCreated((group) => {
      get().addGroup(group);
    });

    const cleanMsg = window.link.groups.onGroupMessageReceived((message) => {
      get().addGroupMessage(message);
    });

    return () => {
      cleanCreated();
      cleanMsg();
    };
  }
}));
