/**
 * SignalR client that connects to an external hub and forwards events.
 * Uses @microsoft/signalr for the connection.
 *
 * Key features:
 * - Connects to hub, handles automatic reconnection
 * - Joins a group if configured, rejoins on reconnect
 * - Rate-limited queue (sliding window) to stay within hub limits
 * - Server event handlers (ValidationError, Error)
 * - Graceful degradation — never throws, never blocks caller
 */

import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { logger } from '../utils/index.js';
import type { HubMessage } from './event-types.js';

export interface SignalRBroadcasterOptions {
  hubUrl: string;
  group?: string;
  logLevel?: 'Information' | 'Warning' | 'Error';
  maxQueueSize?: number;
  rateLimitPerMinute?: number;
  rateLimitBurst?: number;
  reconnectDelay?: number;
}

function mapLogLevel(level: string): LogLevel {
  switch (level) {
    case 'Error':
      return LogLevel.Error;
    case 'Warning':
      return LogLevel.Warning;
    case 'Information':
    default:
      return LogLevel.Information;
  }
}

export class SignalRBroadcaster {
  private connection: HubConnection;
  private group?: string;
  private maxQueueSize: number;
  private rateLimitPerMinute: number;
  private rateLimitBurst: number;
  private reconnectDelay: number;

  private queue: HubMessage[] = [];
  private sendTimestamps: number[] = []; // sliding window of send times
  private drainTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  constructor(options: SignalRBroadcasterOptions) {
    this.group = options.group;
    this.maxQueueSize = options.maxQueueSize ?? 500;
    this.rateLimitPerMinute = options.rateLimitPerMinute ?? 60;
    this.rateLimitBurst = options.rateLimitBurst ?? 10;
    this.reconnectDelay = options.reconnectDelay ?? 5000;

    this.connection = new HubConnectionBuilder()
      .withUrl(options.hubUrl)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(mapLogLevel(options.logLevel ?? 'Information'))
      .build();

    this.setupServerEventHandlers();
    this.setupConnectionHandlers();
  }

  // ─── Lifecycle ───

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    try {
      await this.connection.start();
      logger.info('SignalR broadcaster connected', { url: this.connection.baseUrl });

      if (this.group) {
        await this.joinGroup(this.group);
      }

      // Start draining any queued messages
      this.ensureDrainTimer();
    } catch (error) {
      logger.error('SignalR broadcaster failed to connect', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.scheduleReconnect();
    }
  }

  async stop(): Promise<void> {
    this.started = false;

    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    try {
      await this.connection.stop();
      logger.info('SignalR broadcaster stopped');
    } catch (error) {
      logger.error('SignalR broadcaster stop error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ─── Broadcasting ───

  /**
   * Broadcast an event. Non-blocking — queues if disconnected or rate-limited.
   * Never throws.
   */
  broadcast(event: HubMessage): void {
    if (this.connection.state === HubConnectionState.Connected && this.canSendNow()) {
      this.send(event).catch((error) => {
        logger.error('SignalR send failed, re-queuing', {
          type: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
        this.enqueue(event);
      });
    } else {
      this.enqueue(event);
    }
  }

  get isConnected(): boolean {
    return this.connection.state === HubConnectionState.Connected;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  // ─── Internals ───

  private setupServerEventHandlers(): void {
    this.connection.on('ValidationError', (error: { Error: string; Details?: string[] }) => {
      logger.error('SignalR ValidationError from hub', error);
    });

    this.connection.on('Error', (error: { Message?: string }) => {
      const msg = error?.Message ?? JSON.stringify(error);
      if (msg.toLowerCase().includes('rate limit')) {
        logger.warn('SignalR rate limit hit — backing off', { message: msg });
      } else {
        logger.error('SignalR Error from hub', { message: msg });
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.connection.onreconnecting((error) => {
      logger.warn('SignalR reconnecting', {
        error: error instanceof Error ? error.message : undefined,
      });
      this.ensureDrainTimer();
    });

    this.connection.onreconnected(async (connectionId) => {
      logger.info('SignalR reconnected', { connectionId });

      // Rejoin group if configured
      if (this.group) {
        try {
          await this.joinGroup(this.group);
        } catch (error) {
          logger.error('SignalR failed to rejoin group after reconnect', {
            group: this.group,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.ensureDrainTimer();
    });

    this.connection.onclose((error) => {
      logger.error('SignalR connection closed', {
        error: error instanceof Error ? error.message : undefined,
      });

      if (this.started) {
        this.scheduleReconnect();
      }
    });
  }

  private async joinGroup(groupName: string): Promise<void> {
    await this.connection.invoke('JoinGroup', groupName);
    logger.info('SignalR joined group', { group: groupName });
  }

  private async send(event: HubMessage): Promise<void> {
    if (this.group) {
      await this.connection.invoke('SendToGroup', this.group, event);
    } else {
      await this.connection.invoke('BroadcastMessage', event);
    }
    this.recordSend();
  }

  // ─── Rate Limiting (sliding window) ───

  private canSendNow(): boolean {
    const now = Date.now();
    this.pruneTimestamps(now);

    // Check burst limit (messages in last 10 seconds count as burst window)
    const burstWindowStart = now - 10_000;
    const burstCount = this.sendTimestamps.filter((t) => t > burstWindowStart).length;
    if (burstCount >= this.rateLimitBurst) {
      return false;
    }

    // Check per-minute limit
    if (this.sendTimestamps.length >= this.rateLimitPerMinute) {
      return false;
    }

    return true;
  }

  private recordSend(): void {
    const now = Date.now();
    this.sendTimestamps.push(now);
    this.pruneTimestamps(now);
  }

  private pruneTimestamps(now: number): void {
    const oneMinuteAgo = now - 60_000;
    this.sendTimestamps = this.sendTimestamps.filter((t) => t > oneMinuteAgo);
  }

  // ─── Queue Management ───

  private enqueue(event: HubMessage): void {
    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('SignalR queue full, dropping oldest event', {
        queueSize: this.queue.length,
        maxSize: this.maxQueueSize,
        droppedType: this.queue[0]?.type,
      });
      this.queue.shift();
    }
    this.queue.push(event);
    this.ensureDrainTimer();
  }

  private ensureDrainTimer(): void {
    if (this.drainTimer) return;
    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      this.drainQueue().finally(() => {
        // Re-arm if there are still pending events
        if (this.queue.length > 0) {
          this.ensureDrainTimer();
        }
      });
    }, 1000);
  }

  private async drainQueue(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    if (this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    // Send as many as rate limits allow
    while (this.queue.length > 0 && this.canSendNow()) {
      const event = this.queue.shift();
      if (!event) break;
      try {
        await this.send(event);
      } catch (error) {
        logger.error('SignalR drain send failed, re-queuing', {
          type: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
        this.queue.unshift(event);
        break;
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimer) return;

    this.retryTimer = setTimeout(async () => {
      this.retryTimer = null;
      if (!this.started) return;

      logger.info('SignalR attempting reconnect', { url: this.connection.baseUrl });
      try {
        await this.connection.start();
        logger.info('SignalR reconnected successfully');

        if (this.group) {
          await this.joinGroup(this.group);
        }

        this.ensureDrainTimer();
      } catch (error) {
        logger.error('SignalR reconnect failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.scheduleReconnect();
      }
    }, this.reconnectDelay);
  }
}
