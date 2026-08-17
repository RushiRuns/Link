export function getConversationId(deviceIdA: string, deviceIdB: string): string {
  return [deviceIdA, deviceIdB].sort().join('_');
}
