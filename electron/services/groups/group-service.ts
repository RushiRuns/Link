import { connectionManager } from '../network/connection-manager.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { db } from '../storage/db.js';
import { v4 as uuidv4 } from 'uuid';

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

  public init(mainWindow: any) {
    this.windowRef = mainWindow;

    connectionManager.on('message', (senderDeviceId: string, envelope: any) => {
      if (envelope.type === 'group.create') {
        this.handleGroupCreate(senderDeviceId, envelope);
      } else if (envelope.type === 'group.rename') {
        this.handleGroupRename(senderDeviceId, envelope);
      } else if (envelope.type === 'group.delete') {
        this.handleGroupDelete(senderDeviceId, envelope);
      } else if (envelope.type === 'message.text' && envelope.payload?.groupId) {
        this.handleGroupMessage(senderDeviceId, envelope);
      }
    });
  }

  public setWindow(mainWindow: any) {
    this.windowRef = mainWindow;
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

    this.groupsMap.set(groupId, groupInfo);

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

  public async sendGroupMessage(groupId: string, content: string) {
    const identity = getOrGenerateIdentity();
    const group = this.groupsMap.get(groupId);
    const messageId = uuidv4();
    const now = Date.now();

    const linkMsg = {
      id: messageId,
      groupId,
      senderId: identity.deviceId,
      senderName: identity.displayName,
      content,
      timestamp: now,
      deliveryStatus: 'sent' as const
    };

    if (group) {
      // Send directly to each member (except self) over peer-to-peer mesh
      for (const member of group.members) {
        if (member.deviceId !== identity.deviceId) {
          connectionManager.send(member.deviceId, {
            type: 'message.text',
            id: messageId,
            ts: now,
            payload: {
              messageId,
              groupId,
              senderName: identity.displayName,
              content
            }
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
    this.groupsMap.set(groupId, group);

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

    this.groupsMap.delete(groupId);

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

    this.groupsMap.set(payload.groupId, groupInfo);

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
    if (!payload || !payload.groupId || !payload.content) return;

    const incomingMsg = {
      id: payload.messageId || envelope.id,
      groupId: payload.groupId,
      senderId: senderDeviceId,
      senderName: payload.senderName || 'Teammate',
      content: payload.content,
      timestamp: envelope.ts || Date.now(),
      deliveryStatus: 'delivered' as const
    };

    // Forward group message to renderer
    this.windowRef?.webContents?.send('group-message:received', incomingMsg);
  }

  private handleGroupRename(_senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId || !payload.newName) return;

    const group = this.groupsMap.get(payload.groupId);
    if (group && group.creatorId === _senderDeviceId) {
      group.name = payload.newName;
      this.groupsMap.set(payload.groupId, group);
      this.windowRef?.webContents?.send('group:renamed', { groupId: payload.groupId, newName: payload.newName });
    }
  }

  private handleGroupDelete(_senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.groupId) return;

    const group = this.groupsMap.get(payload.groupId);
    if (group && group.creatorId === _senderDeviceId) {
      this.groupsMap.delete(payload.groupId);
      this.windowRef?.webContents?.send('group:deleted', payload.groupId);
    }
  }
}

export const groupService = new GroupService();
