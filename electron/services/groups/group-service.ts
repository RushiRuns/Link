import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { connectionManager } from '../network/connection-manager.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { db } from '../storage/db.js';
import { v4 as uuidv4 } from 'uuid';
import { showAndFocusWindow } from '../../main.js';

export interface GroupMemberInfo {
  deviceId: string;
  displayName: string;
  publicKey: string;
  networkAddress: string;
  tcpPort: number;
}

export interface GroupInfo {
  id: string;
  name: string;
  creatorId: string;
  members: GroupMemberInfo[];
  isActive: boolean;
  createdAt: number;
}

class GroupService {
  private windowRef: any = null;
  private groupsMap: Map<string, GroupInfo> = new Map();
  private dbPath: string = '';

  public init(mainWindow: any) {
    this.windowRef = mainWindow;

    try {
      const userDataDir = app.getPath('userData');
      const dbDir = path.join(userDataDir, 'storage');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      this.dbPath = path.join(dbDir, 'groups.json');
      this.loadGroups();
    } catch (err) {
      console.warn('[GroupService] Initializing in fallback memory mode:', err);
    }

    connectionManager.on('message', (senderDeviceId: string, envelope: any) => {
      if (envelope.type === 'group.create') {
        this.handleGroupCreate(senderDeviceId, envelope);
      } else if (envelope.type === 'group.rename') {
        this.handleGroupRename(senderDeviceId, envelope);
      } else if (envelope.type === 'group.delete') {
        this.handleGroupDelete(senderDeviceId, envelope);
      } else if (envelope.type === 'group.members.add') {
        this.handleGroupMembersAdd(senderDeviceId, envelope);
      } else if (envelope.type === 'group.member.remove') {
        this.handleGroupMemberRemove(senderDeviceId, envelope);
      } else if (envelope.type === 'message.text' && envelope.payload?.groupId) {
        this.handleGroupMessage(senderDeviceId, envelope);
      }
    });
  }

  public setWindow(mainWindow: any) {
    this.windowRef = mainWindow;
  }

  
  public getAllGroups(): GroupInfo[] {
    return Array.from(this.groupsMap.values());
  }

  private loadGroups() {
    if (this.dbPath && fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const list: GroupInfo[] = JSON.parse(raw);
        list.forEach((g) => this.groupsMap.set(g.id, g));
      } catch (err) {
        console.error('[GroupService] Error reading groups file:', err);
      }
    }
  }

  private persistGroups() {
    if (!this.dbPath) return;
    try {
      const list = Array.from(this.groupsMap.values());
      fs.writeFileSync(this.dbPath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[GroupService] Error persisting groups:', err);
    }
  }

  private updateGroup(groupId: string, group: GroupInfo | null) {
    if (group) {
      this.groupsMap.set(groupId, group);
    } else {
      this.groupsMap.delete(groupId);
    }
    this.persistGroups();
  }

  public async createGroup(name: string, memberPeerIds: string[]): Promise<GroupInfo> {
    const identity = getOrGenerateIdentity();
    const groupId = uuidv4();
    const now = Date.now();

    const members: GroupMemberInfo[] = [
      {
        deviceId: identity.deviceId,
        displayName: identity.displayName,
        publicKey: identity.publicKeyBase64,
        networkAddress: '127.0.0.1',
        tcpPort: connectionManager.getPort()
      }
    ];

    for (const peerId of memberPeerIds) {
      const known = db.getPeer(peerId);
      const activeConn = connectionManager.getActiveConnection(peerId);
      if (known || activeConn) {
        members.push({
          deviceId: peerId,
          displayName: known?.displayName || 'Peer',
          publicKey: known?.publicKey || '',
          networkAddress: activeConn?.socket.remoteAddress || '127.0.0.1',
          tcpPort: activeConn?.socket.remotePort || 0
        });
      }
    }

    const groupInfo: GroupInfo = {
      id: groupId,
      name,
      creatorId: identity.deviceId,
      members,
      isActive: true,
      createdAt: now
    };

    this.updateGroup(groupId, groupInfo);

    // Broadcast GroupCreate payload to all invited members
    for (const peerId of memberPeerIds) {
      connectionManager.send(peerId, {
        type: 'group.create',
        id: 'gcreate_' + uuidv4(),
        ts: now,
        payload: {
          groupId,
          groupName: name,
          members
        }
      });
    }

    return groupInfo;
  }

  public async sendGroupMessage(groupId: string, content: string, replyToMessageId?: string) {
    const identity = getOrGenerateIdentity();
    const group = this.groupsMap.get(groupId);
    const messageId = uuidv4();
    const now = Date.now();

    const linkMsg: any = {
      id: messageId,
      groupId,
      senderId: identity.deviceId,
      senderName: identity.displayName,
      content,
      timestamp: now,
      deliveryStatus: 'sent' as const
    };
    
    if (replyToMessageId) {
      linkMsg.replyToMessageId = replyToMessageId;
    }

    if (group) {
      // Send directly to each member (except self) over peer-to-peer mesh
      for (const member of group.members) {
        if (member.deviceId !== identity.deviceId) {
            const payload: any = {
              messageId,
              groupId,
              senderName: identity.displayName,
              content
            };
            
            if (replyToMessageId) {
              payload.replyToMessageId = replyToMessageId;
            }

            connectionManager.send(member.deviceId, {
              type: 'message.text',
              id: messageId,
              ts: now,
              payload
            });
        }
      }
    }

    return linkMsg;
  }

  public async renameGroup(groupId: string, newName: string) {
    const identity = getOrGenerateIdentity();
    const group = this.groupsMap.get(groupId);
    if (!group) return;

    group.name = newName;
    this.updateGroup(groupId, group);

    const now = Date.now();
    for (const member of group.members) {
      if (member.deviceId !== identity.deviceId) {
        connectionManager.send(member.deviceId, {
          type: 'group.rename',
          id: 'grename_' + uuidv4(),
          ts: now,
          payload: { groupId, newName }
        });
      }
    }

    // Notify local renderer
    this.windowRef?.webContents?.send('group:renamed', { groupId, newName });
  }

  public async deleteGroup(groupId: string) {
    const identity = getOrGenerateIdentity();
    const group = this.groupsMap.get(groupId);
    if (!group) return;

    this.updateGroup(groupId, null);

    const now = Date.now();
    for (const member of group.members) {
      if (member.deviceId !== identity.deviceId) {
        connectionManager.send(member.deviceId, {
          type: 'group.delete',
          id: 'gdelete_' + uuidv4(),
          ts: now,
          payload: { groupId }
        });
      }
    }

    // Notify local renderer
    this.windowRef?.webContents?.send('group:deleted', groupId);
  }

  public async addMembers(groupId: string, memberPeerIds: string[]) {
    const identity = getOrGenerateIdentity();
    const group = this.groupsMap.get(groupId);
    if (!group || group.creatorId !== identity.deviceId) return;

    const newMembers: GroupMemberInfo[] = [];
    const now = Date.now();

    for (const peerId of memberPeerIds) {
      if (!group.members.some(m => m.deviceId === peerId)) {
        const known = db.getPeer(peerId);
        const activeConn = connectionManager.getActiveConnection(peerId);
        if (known || activeConn) {
          newMembers.push({
            deviceId: peerId,
            displayName: known?.displayName || 'Peer',
            publicKey: known?.publicKey || '',
            networkAddress: activeConn?.socket.remoteAddress || '127.0.0.1',
            tcpPort: activeConn?.socket.remotePort || 0
          });
        }
      }
    }

    if (newMembers.length === 0) return;

    group.members.push(...newMembers);
    this.updateGroup(groupId, group);

    // Broadcast `group.create` to NEW members so they have full state
    for (const member of newMembers) {
      connectionManager.send(member.deviceId, {
        type: 'group.create',
        id: 'gcreate_' + uuidv4(),
        ts: now,
        payload: {
          groupId,
          groupName: group.name,
          members: group.members
        }
      });
    }

    // Broadcast `group.members.add` to EXISTING members
    for (const member of group.members) {
      if (member.deviceId !== identity.deviceId && !newMembers.some(m => m.deviceId === member.deviceId)) {
        connectionManager.send(member.deviceId, {
          type: 'group.members.add',
          id: 'gadd_' + uuidv4(),
          ts: now,
          payload: { groupId, newMembers }
        });
      }
    }

    // Notify local renderer
    this.windowRef?.webContents?.send('group:members-added', { groupId, newMembers });
  }

  public async removeMember(groupId: string, peerIdToRemove: string) {
    const identity = getOrGenerateIdentity();
    const group = this.groupsMap.get(groupId);
    if (!group || group.creatorId !== identity.deviceId) return;

    // Can't remove creator
    if (peerIdToRemove === identity.deviceId) return;

    const memberExists = group.members.some(m => m.deviceId === peerIdToRemove);
    if (!memberExists) return;

    const now = Date.now();
    
    // Broadcast `group.member.remove` to ALL current members (including the one being kicked)
    for (const member of group.members) {
      if (member.deviceId !== identity.deviceId) {
        connectionManager.send(member.deviceId, {
          type: 'group.member.remove',
          id: 'gremove_' + uuidv4(),
          ts: now,
          payload: { groupId, removedPeerId: peerIdToRemove }
        });
      }
    }

    group.members = group.members.filter(m => m.deviceId !== peerIdToRemove);
    this.updateGroup(groupId, group);

    // Notify local renderer
    this.windowRef?.webContents?.send('group:member-removed', { groupId, removedPeerId: peerIdToRemove });
  }

  private async handleGroupCreate(senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId) return;

    const groupInfo: GroupInfo = {
      id: payload.groupId,
      name: payload.groupName || 'Group',
      creatorId: senderDeviceId,
      members: payload.members || [],
      isActive: true,
      createdAt: envelope.ts || Date.now()
    };

    this.updateGroup(payload.groupId, groupInfo);

    // Mesh connection: Connect to any group members local user isn't connected to yet
    const identity = getOrGenerateIdentity();
    for (const member of groupInfo.members) {
      if (member.deviceId !== identity.deviceId && !connectionManager.getActiveConnection(member.deviceId)) {
        if (member.networkAddress && member.tcpPort) {
          try {
            await connectionManager.connectToPeer(member.networkAddress, member.tcpPort);
          } catch (err) {
            console.warn(`[GroupService] Mesh connect to member ${member.displayName} failed:`, err);
          }
        }
      }
    }

    // Forward group creation event to renderer
    this.windowRef?.webContents?.send('group:created', groupInfo);
  }

  private handleGroupMessage(senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.content || !payload.groupId) return;

    const incomingMsg: any = {
      id: payload.messageId || envelope.id,
      groupId: payload.groupId,
      senderId: senderDeviceId,
      senderName: payload.senderName || 'Teammate',
      content: payload.content,
      timestamp: envelope.ts || Date.now(),
      deliveryStatus: 'delivered' as const
    };
    
    if (payload.replyToMessageId) {
      incomingMsg.replyToMessageId = payload.replyToMessageId;
    }

    // Forward group message to renderer
    this.windowRef?.webContents?.send('group-message:received', incomingMsg);
    
    // Auto-unhide and focus window
    showAndFocusWindow();
  }

  private handleGroupRename(_senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId || !payload.newName) return;

    const group = this.groupsMap.get(payload.groupId);
    if (group && group.creatorId === _senderDeviceId) {
      group.name = payload.newName;
      this.updateGroup(payload.groupId, group);
      this.windowRef?.webContents?.send('group:renamed', { groupId: payload.groupId, newName: payload.newName });
    }
  }

  private handleGroupDelete(_senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId) return;

    const group = this.groupsMap.get(payload.groupId);
    if (group && group.creatorId === _senderDeviceId) {
      this.updateGroup(payload.groupId, null);
      this.windowRef?.webContents?.send('group:deleted', payload.groupId);
    }
  }

  private handleGroupMembersAdd(senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId || !payload.newMembers) return;

    const group = this.groupsMap.get(payload.groupId);
    if (group && group.creatorId === senderDeviceId) {
      group.members.push(...payload.newMembers);
      this.updateGroup(payload.groupId, group);
      this.windowRef?.webContents?.send('group:members-added', { groupId: payload.groupId, newMembers: payload.newMembers });
    }
  }

  private handleGroupMemberRemove(senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId || !payload.removedPeerId) return;

    const group = this.groupsMap.get(payload.groupId);
    if (group && group.creatorId === senderDeviceId) {
      group.members = group.members.filter(m => m.deviceId !== payload.removedPeerId);
      this.updateGroup(payload.groupId, group);
      this.windowRef?.webContents?.send('group:member-removed', { groupId: payload.groupId, removedPeerId: payload.removedPeerId });
    }
  }
}

export const groupService = new GroupService();
