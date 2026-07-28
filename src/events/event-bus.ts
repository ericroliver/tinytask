/**
 * Lightweight typed in-process event emitter.
 * No external dependencies — decouples event generation from broadcasting.
 */

import { logger } from '../utils/index.js';
import type { HubMessage } from './event-types.js';

type EventHandler = (event: HubMessage) => void;
type EventType = string; // TaskEventType value or '*'

export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to a specific event type or '*' for all events.
   * @returns An unsubscribe function
   */
  on(type: string, handler: EventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);

    return () => {
      const s = this.handlers.get(type);
      if (s) {
        s.delete(handler);
        if (s.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  /**
   * Emit an event to all matching subscribers.
   * Synchronous — handlers called immediately in subscription order.
   * Handler errors are caught, logged, and do not block subsequent handlers or the caller.
   */
  emit(event: HubMessage): void {
    // Specific subscribers
    const specific = this.handlers.get(event.type);
    if (specific) {
      for (const handler of specific) {
        try {
          handler(event);
        } catch (error) {
          logger.error('EventBus handler error', {
            eventType: event.type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Wildcard subscribers
    const wildcards = this.handlers.get('*');
    if (wildcards) {
      for (const handler of wildcards) {
        try {
          handler(event);
        } catch (error) {
          logger.error('EventBus wildcard handler error', {
            eventType: event.type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Remove all subscribers (for tests).
   */
  clear(): void {
    this.handlers.clear();
  }
}
