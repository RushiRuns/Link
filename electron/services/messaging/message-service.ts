import { connectionManager } from '../network/connection-manager.js';
import { getOrGenerateIdentity } from '../identity/identity.js';
import { v4 as uuidv4 } from 'uuid';

export interface SendMessageOptions {
  peerId: string;
  content: string;
}

class MessageService {
  private windowRef: any = null;

  public init(mainWindow: any) {
    this.windowRef = mainWindow;

    connectionManager.on('message', (senderDeviceId: string, envelope: any) => {
      if (envelope.type === 'message.text') {
        this.handleTextMessage(senderDeviceId, envelope);
      } else if (envelope.type === 'message.ack') {
        this.handleMessageAck(senderDeviceId, envelope);
      } else if (envelope.type === 'message.typing') {
        this.handleTypingSignal(senderDeviceId, envelope);
      }
    });
  }

  public setWindow(mainWindow: any) {
    this.windowRef = mainWindow;
  }

  public async sendMessage(peerId: string, content: string) {
    const identity = getOrGenerateIdentity();
    const messageId = uuidv4();
    const now = Date.now();

    const conversationId = [identity.deviceId, peerId].sort().join('_');

    const payload = {
      messageId,
      conversationId,
      content
    };

    const sent = connectionManager.send(peerId, {
      type: 'message.text',
      id: messageId,
      ts: now,
      payload
    });

    const linkMsg = {
      id: messageId,
      conversationId,
      senderId: identity.deviceId,
      senderName: identity.displayName,
      content,
      timestamp: now,
      deliveryStatus: sent ? ('sent' as const) : ('failed' as const)
    };

    return linkMsg;
  }

  public sendTypingSignal(peerId: string, groupId?: string) {
    const identity = getOrGenerateIdentity();
    
    let payload: any = {};
    if (groupId) {
      payload.groupId = groupId;
    } else {
      payload.conversationId = [identity.deviceId, peerId].sort().join('_');
    }

    connectionManager.send(peerId, {
      type: 'message.typing',
      id: uuidv4(),
      ts: Date.now(),
      payload
    });
  }

  private handleTextMessage(senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (!payload || !payload.content) return;

    const identity = getOrGenerateIdentity();
    const conversationId = [identity.deviceId, senderDeviceId].sort().join('_');

    const incomingMsg = {
      id: payload.messageId || envelope.id,
      conversationId,
      senderId: senderDeviceId,
      senderName: payload.senderName || 'Teammate',
      content: payload.content,
      timestamp: envelope.ts || Date.now(),
      deliveryStatus: 'delivered' as const
    };

    // Forward received message to renderer
    this.windowRef?.webContents?.send('message:received', incomingMsg);

    // Send MessageAck immediately on receipt
    connectionManager.send(senderDeviceId, {
      type: 'message.ack',
      id: 'ack_' + uuidv4(),
      ts: Date.now(),
      payload: {
        messageId: payload.messageId || envelope.id,
        status: 'delivered'
      }
    });
  }

  private handleMessageAck(_senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (payload && payload.messageId) {
      // Forward delivery ACK to renderer
      this.windowRef?.webContents?.send('message:delivered', payload.messageId);
    }
  }

  private handleTypingSignal(senderDeviceId: string, envelope: any) {
    const payload = envelope.payload;
    if (payload) {
      this.windowRef?.webContents?.send('message:typing', {
        peerId: senderDeviceId,
        conversationId: payload.conversationId,
        groupId: payload.groupId
      });
    }
  }
}

export const messageService = new MessageService();
