import { TinyTaskClient } from './mcp-client.js';

let clientInstance: TinyTaskClient | null = null;

export function getClient(url: string): TinyTaskClient {
  if (!clientInstance) {
    clientInstance = new TinyTaskClient(url);
  }
  return clientInstance;
}

export async function ensureConnected(url: string): Promise<TinyTaskClient> {
  const client = getClient(url);
  await client.connect();
  return client;
}

export async function disconnect(): Promise<void> {
  if (clientInstance) {
    await clientInstance.disconnect();
    clientInstance = null;
  }
}
