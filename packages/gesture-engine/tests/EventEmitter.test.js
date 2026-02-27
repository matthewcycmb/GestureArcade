import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/EventEmitter.js';

describe('EventEmitter', () => {
  it('calls listener on emit', () => {
    const ee = new EventEmitter();
    const cb = vi.fn();
    ee.on('test', cb);
    ee.emit('test', { value: 42 });
    expect(cb).toHaveBeenCalledWith({ value: 42 });
  });

  it('supports multiple listeners', () => {
    const ee = new EventEmitter();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    ee.on('test', cb1);
    ee.on('test', cb2);
    ee.emit('test', 'data');
    expect(cb1).toHaveBeenCalledWith('data');
    expect(cb2).toHaveBeenCalledWith('data');
  });

  it('removes listener with off', () => {
    const ee = new EventEmitter();
    const cb = vi.fn();
    ee.on('test', cb);
    ee.off('test', cb);
    ee.emit('test', 'data');
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not affect other listeners when removing one', () => {
    const ee = new EventEmitter();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    ee.on('test', cb1);
    ee.on('test', cb2);
    ee.off('test', cb1);
    ee.emit('test', 'data');
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledWith('data');
  });

  it('isolates errors — one bad listener does not prevent others', () => {
    const ee = new EventEmitter();
    const bad = vi.fn(() => { throw new Error('boom'); });
    const good = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    ee.on('test', bad);
    ee.on('test', good);
    ee.emit('test', 'data');

    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalledWith('data');
    consoleSpy.mockRestore();
  });

  it('returns this for chaining', () => {
    const ee = new EventEmitter();
    const cb = vi.fn();
    const result = ee.on('a', cb).on('b', cb).emit('a', 1).off('a', cb);
    expect(result).toBe(ee);
  });

  it('does not throw when emitting event with no listeners', () => {
    const ee = new EventEmitter();
    expect(() => ee.emit('nope', 'data')).not.toThrow();
  });

  it('does not throw when removing listener from non-existent event', () => {
    const ee = new EventEmitter();
    expect(() => ee.off('nope', () => {})).not.toThrow();
  });
});
