/**
 * Event system for SignInspector
 */

import type { SignInspectorEvent, SignatureInfo, ValidationResult } from './types';

/**
 * Event data types for each event
 */
export interface EventDataMap {
  signatureSelected: { index: number; signature: SignatureInfo };
  documentLoaded: { filename: string; size: number };
  validationComplete: { result: ValidationResult };
}

/**
 * Type-safe event callback
 */
export type EventCallback<T extends SignInspectorEvent> = (data: EventDataMap[T]) => void;

/**
 * Generic event callback for use in storage where specific type is not known
 */
type AnyEventCallback = EventCallback<SignInspectorEvent>;

export class EventEmitter {
  private listeners: Map<string, Set<AnyEventCallback>> = new Map();

  on<T extends SignInspectorEvent>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as AnyEventCallback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  off<T extends SignInspectorEvent>(event: T, callback: EventCallback<T>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback as AnyEventCallback);
    }
  }

  emit<T extends SignInspectorEvent>(event: T, data: EventDataMap[T]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  removeAllListeners(event?: SignInspectorEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
