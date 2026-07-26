import { encode, decode } from 'msgpackr';
import { v4 as uuidv4 } from 'uuid';

export interface WireEnvelope {
  type: string;
  id: string;
  ts: number;
  payload: any;
}

export function generateId(): string {
  return uuidv4();
}

export function encodeWireMessage(type: string, payload: any, id: string = generateId()): Uint8Array {
  const envelope: WireEnvelope = {
    type,
    id,
    ts: Date.now(),
    payload
  };
  return encode(envelope);
}

export function decodeWireMessage(data: Uint8Array): WireEnvelope {
  return decode(data) as WireEnvelope;
}
