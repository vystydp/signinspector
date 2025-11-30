import { describe, it, expect } from 'vitest';
import { EventEmitter } from '../../src/lib/events';

describe('EventEmitter', () => {
  it('should subscribe to events', () => {
    const emitter = new EventEmitter();
    let called = false;

    emitter.on('documentLoaded', () => {
      called = true;
    });

    emitter.emit('documentLoaded');
    expect(called).toBe(true);
  });

  it('should unsubscribe from events', () => {
    const emitter = new EventEmitter();
    let count = 0;

    const callback = () => {
      count++;
    };

    emitter.on('documentLoaded', callback);
    emitter.emit('documentLoaded');
    expect(count).toBe(1);

    emitter.off('documentLoaded', callback);
    emitter.emit('documentLoaded');
    expect(count).toBe(1); // Should not increment
  });

  it('should pass data to event handlers', () => {
    const emitter = new EventEmitter();
    let receivedData: any;

    emitter.on('validationComplete', (data) => {
      receivedData = data;
    });

    const testData = { status: 'VALID' };
    emitter.emit('validationComplete', testData);
    expect(receivedData).toEqual(testData);
  });
});
