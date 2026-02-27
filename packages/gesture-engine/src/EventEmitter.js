export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, cb) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(cb);
    return this;
  }

  off(event, cb) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(cb);
      if (set.size === 0) this._listeners.delete(event);
    }
    return this;
  }

  emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`EventEmitter: listener for "${event}" threw:`, err);
        }
      }
    }
    return this;
  }
}
