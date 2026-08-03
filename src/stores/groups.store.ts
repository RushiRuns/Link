import { create } from 'zustand';
import { LinkGroup, LinkMessage } from '../types/ipc';
import { useAppStore } from './app.store';
import { playNotificationSound } from '../utils/audio';

interface GroupsState {
  groups: Map<string, LinkGroup>; // groupId -> LinkGroup
  unreadCounts: Map<string, number>; // groupId -> count
  createGroup: (name: string, memberPeerIds: string[]) => Promise<LinkGroup | undefined>;
  sendGroupMessage: (groupId: string, content: string, replyToMessageId?: string) => Promise<void>;
  addGroupMessage: (message: LinkMessage) => void;
  addGroup: (group: LinkGroup) => void;
  renameGroup: (groupId: string, newName: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMembersToGroup: (groupId: string, memberPeerIds: string[]) => Promise<void>;
  removeMemberFromGroup: (groupId: string, peerIdToRemove: string) => Promise<void>;
  markGroupRead: (groupId: string) => void;
  editGroupMessageLocally: (groupId: string, messageId: string, newContent: string) => void;
  deleteGroupMessageLocally: (groupId: string, messageId: string) => void;
  loadGroupsFromDisk: () => Promise<void>;
  initListeners: () => () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: new Map(),
  unreadCounts: new Map(),

  loadGroupsFromDisk: async () => {
    if (window.link?.groups?.getAllGroups) {
      try {
        const groupsList = await window.link.groups.getAllGroups();
        if (groupsList && Array.isArray(groupsList)) {
          set((state) => {
            const nextMap = new Map(state.groups);
            groupsList.forEach(g => {
              // Ensure all members have peerId and status for frontend compat
              const mappedGroup = {
                ...g,
                members: (g.members || []).map((m: any) => ({
                  ...m,
                  peerId: m.peerId || m.deviceId,
                  status: m.status || 'offline',
                }))
              };
              nextMap.set(mappedGroup.id, mappedGroup);
            });
            return { groups: nextMap };
          });
        }
      } catch (err) {
        console.error('[GroupsStore] Error loading groups from disk:', err);
      }
    }
  },

  markGroupRead: (groupId) => {
    set((state) => {
      const nextUnreads = new Map(state.unreadCounts);
      nextUnreads.delete(groupId);
      return { unreadCounts: nextUnreads };
    });
  },

  editGroupMessageLocally: (groupId, messageId, newContent) => {
    set((state) => {
      const group = state.groups.get(groupId);
      if (!group || !group.messages) return state;

      const msgIndex = group.messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return state;

      const newMessages = [...group.messages];
      newMessages[msgIndex] = { ...newMessages[msgIndex], content: newContent };

      const nextGroups = new Map(state.groups);
      nextGroups.set(groupId, { ...group, messages: newMessages });
      return { groups: nextGroups };
    });
  },

  deleteGroupMessageLocally: (groupId, messageId) => {
    set((state) => {
      const group = state.groups.get(groupId);
      if (!group || !group.messages) return state;

      const newMessages = group.messages.filter(m => m.id !== messageId);
      
      const nextGroups = new Map(state.groups);
      nextGroups.set(groupId, { ...group, messages: newMessages });
      return { groups: nextGroups };
    });
  },

  addGroup: (group) => {
    set((state) => {
      // Ensure all members have peerId and status
      const mappedGroup = {
        ...group,
        members: group.members.map((m: any) => ({
          ...m,
          peerId: m.peerId || m.deviceId,
          status: m.status || 'online',
        }))
      };
      
      const nextMap = new Map(state.groups);
      nextMap.set(mappedGroup.id, mappedGroup);
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

  renameGroup: async (groupId, newName) => {
    if (window.link?.groups) {
      try {
        await window.link.groups.renameGroup(groupId, newName);
      } catch (err) {
        console.error('[GroupsStore] Error renaming group:', err);
      }
    }
  },

  deleteGroup: async (groupId) => {
    if (window.link?.groups) {
      try {
        await window.link.groups.deleteGroup(groupId);
      } catch (err) {
        console.error('[GroupsStore] Error deleting group:', err);
      }
    }
  },

  addMembersToGroup: async (groupId, memberPeerIds) => {
    if (window.link?.groups) {
      try {
        await window.link.groups.addMembers(groupId, memberPeerIds);
      } catch (err) {
        console.error('[GroupsStore] Error adding members to group:', err);
      }
    }
  },

  removeMemberFromGroup: async (groupId, peerIdToRemove) => {
    if (window.link?.groups) {
      try {
        await window.link.groups.removeMember(groupId, peerIdToRemove);
      } catch (err) {
        console.error('[GroupsStore] Error removing member from group:', err);
      }
    }
  },

  sendGroupMessage: async (groupId, content, replyToMessageId) => {
    if (window.link?.groups) {
      try {
        const linkMsg = await window.link.groups.sendGroupMessage(groupId, content, replyToMessageId);
        get().addGroupMessage(linkMsg);
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

          const { selectedGroupId } = useAppStore.getState();
          const nextUnreads = new Map(state.unreadCounts);
          if (selectedGroupId !== groupId) {
            const count = nextUnreads.get(groupId) || 0;
            nextUnreads.set(groupId, count + 1);
          }
          return { groups: nextMap, unreadCounts: nextUnreads };
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

      const { selectedGroupId } = useAppStore.getState();
      if (selectedGroupId !== message.groupId || !document.hasFocus()) {
        window.electron?.flashFrame(true);
        playNotificationSound();
      }
    });

    const cleanRenamed = window.link.groups.onGroupRenamed(({ groupId, newName }) => {
      set((state) => {
        const nextMap = new Map(state.groups);
        const group = nextMap.get(groupId);
        if (group) {
          nextMap.set(groupId, { ...group, name: newName });
        }
        return { groups: nextMap };
      });
    });

    const cleanDeleted = window.link.groups.onGroupDeleted((groupId) => {
      set((state) => {
        const nextMap = new Map(state.groups);
        nextMap.delete(groupId);
        const nextUnreads = new Map(state.unreadCounts);
        nextUnreads.delete(groupId);
        return { groups: nextMap, unreadCounts: nextUnreads };
      });

      // Navigate away if we're currently viewing this group
      const appStore = useAppStore.getState();
      if (appStore.selectedGroupId === groupId) {
        appStore.selectGroup(null);
      }
    });

    const cleanMembersAdded = window.link.groups.onGroupMembersAdded(({ groupId, newMembers }) => {
      set((state) => {
        const nextMap = new Map(state.groups);
        const group = nextMap.get(groupId);
        if (group) {
          const existingIds = new Set(group.members.map(m => m.peerId));
          const toAdd = newMembers
            .filter((m: any) => !existingIds.has(m.deviceId))
            .map((m: any) => ({
              peerId: m.deviceId,
              displayName: m.displayName,
              publicKey: m.publicKey,
              status: m.status || 'online',
              networkAddress: m.networkAddress,
              tcpPort: m.tcpPort
            }));

          nextMap.set(groupId, { ...group, members: [...group.members, ...toAdd] });
        }
        return { groups: nextMap };
      });
    });

    const cleanMemberRemoved = window.link.groups.onGroupMemberRemoved(({ groupId, removedPeerId }) => {
      set((state) => {
        const nextMap = new Map(state.groups);
        const group = nextMap.get(groupId);
        if (group) {
          nextMap.set(groupId, { 
            ...group, 
            members: group.members.filter(m => m.peerId !== removedPeerId) 
          });
        }
        return { groups: nextMap };
      });

      // Self-kicked check
      window.link?.identity?.getIdentity().then(identity => {
        if (identity.deviceId === removedPeerId) {
          set((state) => {
            const nextMap = new Map(state.groups);
            nextMap.delete(groupId);
            const nextUnreads = new Map(state.unreadCounts);
            nextUnreads.delete(groupId);
            return { groups: nextMap, unreadCounts: nextUnreads };
          });
          
          const appStore = useAppStore.getState();
          if (appStore.selectedGroupId === groupId) {
            appStore.selectGroup(null);
          }
        }
      });
    });

    return () => {
      cleanCreated();
      cleanMsg();
      cleanRenamed();
      cleanDeleted();
      cleanMembersAdded();
      cleanMemberRemoved();
    };
  }
}));
