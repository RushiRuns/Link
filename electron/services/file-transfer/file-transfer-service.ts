import { connectionManager } from '../network/connection-manager.js';
import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import tar from 'tar-fs';

function getFolderSize(dirPath: string): number {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(dirPath, files[i]);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      size += getFolderSize(filePath);
    }
  }
  return size;
}

export interface ActiveFileTransferState {
  id: string;
  direction: 'outgoing' | 'incoming';
  peerId: string;
  groupId?: string;
  filePath?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  bytesTransferred: number;
  status: 'pending_accept' | 'transferring' | 'completed' | 'declined' | 'failed' | 'cancelled';
  startedAt: number;
  savePath?: string;
  tempPath?: string;
  writeStream?: any;
  isFolder?: boolean;
}

class FileTransferService {
  private windowRef: any = null;
  private transfers: Map<string, ActiveFileTransferState> = new Map();

  public init(mainWindow: any) {
    this.windowRef = mainWindow;

    connectionManager.on('message', (senderDeviceId: string, envelope: any) => {
      switch (envelope.type) {
        case 'file.offer':
          this.handleFileOffer(senderDeviceId, envelope);
          break;
        case 'file.response':
          this.handleFileResponse(senderDeviceId, envelope);
          break;
        case 'file.chunk':
          this.handleFileChunk(senderDeviceId, envelope);
          break;
        case 'file.complete':
          this.handleFileComplete(senderDeviceId, envelope);
          break;
      }
    });

    connectionManager.on('peer:disconnected', (peerId: string) => {
      for (const [id, state] of this.transfers.entries()) {
        if (state.peerId === peerId && (state.status === 'transferring' || state.status === 'pending_accept')) {
          state.status = 'failed';
          if (state.writeStream) {
            try { state.writeStream.destroy(); } catch {}
          }
          this.windowRef?.webContents?.send('file-transfer:failed', id);
        }
      }
    });
  }

  public setWindow(mainWindow: any) {
    this.windowRef = mainWindow;
  }

  public getTransferState(transferId: string): ActiveFileTransferState | undefined {
    return this.transfers.get(transferId);
  }

  public async selectAndOfferFile(peerId: string, groupId?: string) {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      title: 'Select File(s) to Send'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const offers = [];
    for (const filePath of result.filePaths) {
      offers.push(await this.offerFile(peerId, filePath, groupId));
    }
    return offers;
  }

  public async savePastedBuffer(buffer: ArrayBuffer, mimeType: string): Promise<string> {
    const extMap: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'text/plain': '.txt',
      'text/html': '.html'
    };
    const ext = extMap[mimeType] || '.bin';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Pasted_${timestamp}${ext}`;
    const tempPath = path.join(app.getPath('temp'), fileName);
    
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    return tempPath;
  }

  public async offerFile(peerId: string, filePath: string, groupId?: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const transferId = uuidv4();
    const chunkSize = 65536; // 64 KB
    const totalChunks = Math.ceil(stat.size / chunkSize);

    const now = Date.now();
    const state: ActiveFileTransferState = {
      id: transferId,
      direction: 'outgoing',
      peerId,
      groupId,
      filePath,
      fileName,
      fileSizeBytes: stat.size,
      mimeType: 'application/octet-stream',
      bytesTransferred: 0,
      status: 'pending_accept',
      startedAt: now
    };

    this.transfers.set(transferId, state);

    connectionManager.send(peerId, {
      type: 'file.offer',
      id: transferId,
      ts: now,
      payload: {
        transferId,
        groupId,
        fileName,
        fileSizeBytes: stat.size,
        mimeType: state.mimeType,
        chunkSizeBytes: chunkSize,
        totalChunks
      }
    });

    return {
      id: transferId,
      direction: 'outgoing' as const,
      peerId,
      groupId,
      fileName,
      fileSizeBytes: stat.size,
      mimeType: state.mimeType,
      status: 'pending_accept' as const,
      bytesTransferred: 0,
      startedAt: now
    };
  }

  public async selectAndOfferFolder(peerId: string, groupId?: string) {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Folder to Send'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const folderPath = result.filePaths[0];
    return this.offerFolder(peerId, folderPath, groupId);
  }

  public async offerFolder(peerId: string, folderPath: string, groupId?: string) {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    const folderName = path.basename(folderPath);
    const transferId = uuidv4();
    const chunkSize = 65536; // 64 KB
    const folderSize = getFolderSize(folderPath);
    const totalChunks = Math.ceil(folderSize / chunkSize);

    const now = Date.now();
    const state: ActiveFileTransferState = {
      id: transferId,
      direction: 'outgoing',
      peerId,
      groupId,
      filePath: folderPath,
      fileName: folderName,
      fileSizeBytes: folderSize,
      mimeType: 'application/x-tar',
      bytesTransferred: 0,
      status: 'pending_accept',
      startedAt: now,
      isFolder: true
    };

    this.transfers.set(transferId, state);

    connectionManager.send(peerId, {
      type: 'file.offer',
      id: transferId,
      ts: now,
      payload: {
        transferId,
        groupId,
        fileName: folderName,
        fileSizeBytes: folderSize,
        mimeType: state.mimeType,
        chunkSizeBytes: chunkSize,
        totalChunks,
        isFolder: true
      }
    });

    return {
      id: transferId,
      direction: 'outgoing' as const,
      peerId,
      groupId,
      fileName: folderName,
      fileSizeBytes: folderSize,
      mimeType: state.mimeType,
      status: 'pending_accept' as const,
      bytesTransferred: 0,
      startedAt: now,
      isFolder: true
    };
  }

  public async respondToOffer(transferId: string, accepted: boolean, customSavePath?: string) {
    const state = this.transfers.get(transferId);
    if (!state) return;

    if (!accepted) {
      state.status = 'declined';
      connectionManager.send(state.peerId, {
        type: 'file.response',
        id: 'resp_' + uuidv4(),
        ts: Date.now(),
        payload: { transferId, accepted: false }
      });
      return;
    }

    // Determine save path if not specified
    let savePath = customSavePath;
    if (!savePath) {
      const downloadsDir = app.getPath('downloads');
      savePath = path.join(downloadsDir, state.fileName);
    }

    const tempPath = path.join(app.getPath('temp'), `link_ft_${transferId}.tmp`);

    state.status = 'transferring';
    state.savePath = savePath;
    state.tempPath = tempPath;
    
    if (state.isFolder) {
      fs.mkdirSync(tempPath, { recursive: true });
      state.writeStream = tar.extract(tempPath);
    } else {
      state.writeStream = fs.createWriteStream(tempPath);
    }

    connectionManager.send(state.peerId, {
      type: 'file.response',
      id: 'resp_' + uuidv4(),
      ts: Date.now(),
      payload: { transferId, accepted: true }
    });
  }

  private handleFileOffer(senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    if (!p || !p.transferId) return;

    const now = envelope.ts || Date.now();
    const state: ActiveFileTransferState = {
      id: p.transferId,
      direction: 'incoming',
      peerId: senderDeviceId,
      groupId: p.groupId,
      fileName: p.fileName,
      fileSizeBytes: p.fileSizeBytes,
      mimeType: p.mimeType || 'application/octet-stream',
      bytesTransferred: 0,
      status: 'pending_accept',
      startedAt: now,
      isFolder: p.isFolder
    };

    this.transfers.set(p.transferId, state);

    // Notify renderer of incoming offer
    this.windowRef?.webContents?.send('file-transfer:offer-received', {
      id: p.transferId,
      direction: 'incoming',
      peerId: senderDeviceId,
      groupId: p.groupId,
      fileName: p.fileName,
      fileSizeBytes: p.fileSizeBytes,
      mimeType: state.mimeType,
      status: 'pending_accept',
      bytesTransferred: 0,
      startedAt: now,
      isFolder: state.isFolder
    });
  }

  private handleFileResponse(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    const state = this.transfers.get(p?.transferId);
    if (!state) return;

    if (!p.accepted) {
      state.status = 'declined';
      this.windowRef?.webContents?.send('file-transfer:declined', state.id);
      return;
    }

    state.status = 'transferring';
    this.startSendingChunks(state);
  }

  private startSendingChunks(state: ActiveFileTransferState) {
    if (!state.filePath || !fs.existsSync(state.filePath)) {
      state.status = 'failed';
      return;
    }

    const readStream = state.isFolder
      ? tar.pack(state.filePath)
      : fs.createReadStream(state.filePath, { highWaterMark: 65536 });
    let chunkIndex = 0;

    readStream.on('data', (chunkBuffer: Buffer | string) => {
      const bytes = typeof chunkBuffer === 'string' ? Buffer.from(chunkBuffer) : chunkBuffer;
      state.bytesTransferred += bytes.length;

      connectionManager.send(state.peerId, {
        type: 'file.chunk',
        id: 'chunk_' + uuidv4(),
        ts: Date.now(),
        payload: {
          transferId: state.id,
          chunkIndex: chunkIndex++,
          data: bytes.toString('base64'),
          isLast: state.isFolder ? false : state.bytesTransferred >= state.fileSizeBytes
        }
      });

      this.windowRef?.webContents?.send('file-transfer:progress', {
        transferId: state.id,
        bytesTransferred: state.bytesTransferred
      });
    });

    readStream.on('end', () => {
      state.status = 'completed';
      connectionManager.send(state.peerId, {
        type: 'file.complete',
        id: 'complete_' + uuidv4(),
        ts: Date.now(),
        payload: { transferId: state.id, success: true }
      });

      this.windowRef?.webContents?.send('file-transfer:completed', state.id);
    });

    readStream.on('error', (err: any) => {
      console.error(`[FileTransfer] Stream read error for ${state.id}:`, err);
      state.status = 'failed';
      this.windowRef?.webContents?.send('file-transfer:failed', state.id);
    });
  }

  private handleFileChunk(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    const state = this.transfers.get(p?.transferId);
    if (!state || !state.writeStream) return;

    try {
      const buffer = Buffer.from(p.data, 'base64');
      state.writeStream.write(buffer);
      state.bytesTransferred += buffer.length;

      this.windowRef?.webContents?.send('file-transfer:progress', {
        transferId: state.id,
        bytesTransferred: state.bytesTransferred
      });
    } catch (err) {
      console.error(`[FileTransfer] Error writing chunk for ${state.id}:`, err);
    }
  }

  private handleFileComplete(_senderDeviceId: string, envelope: any) {
    const p = envelope.payload;
    const state = this.transfers.get(p?.transferId);
    if (!state) return;

    if (state.writeStream) {
      state.writeStream.end(() => {
        if (state.tempPath && state.savePath) {
          try {
            if (state.isFolder) {
              fs.cpSync(state.tempPath, state.savePath, { recursive: true });
              fs.rmSync(state.tempPath, { recursive: true, force: true });
            } else {
              fs.copyFileSync(state.tempPath, state.savePath);
              fs.unlinkSync(state.tempPath);
            }
          } catch (err: any) {
            console.error(`[FileTransfer] Error finalizing saved file for ${state.id}:`, err);
          }
        }
        state.status = 'completed';
        this.windowRef?.webContents?.send('file-transfer:completed', state.id);
      });
    }
  }
}

export const fileTransferService = new FileTransferService();
