// Client WebSocket manager — room flow, message API, opponent bird state
// Usage:
//   import { multiplayer } from './multiplayer.js';
//   multiplayer.connect();
//   multiplayer.on('START', ({ seed }) => resetGame(seed));

const WS_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL)
  || 'ws://localhost:3001';

class MultiplayerClient {
  constructor() {
    this._ws = null;
    this._listeners = {}; // type → Set<Function>
    this.playerId = null;  // 1 | 2
    this.roomCode = null;
    this.connected = false;
    this._pingInterval = null;
    this._latency = 0;     // one-way estimated latency (ms)
    this._lastPingSent = 0;
    this._queue = [];      // messages buffered while connecting
  }

  // --- Public API ---

  /** Open WebSocket connection. Safe to call multiple times — closes existing first. */
  connect() {
    this._close();
    const ws = new WebSocket(WS_URL);
    this._ws = ws;

    ws.addEventListener('open', () => {
      this.connected = true;
      this._startHeartbeat();
      // Flush any messages queued before the connection opened
      for (const msg of this._queue) {
        ws.send(JSON.stringify(msg));
      }
      this._queue = [];
      this._emit('connected');
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this._handle(msg);
    });

    ws.addEventListener('close', () => {
      this.connected = false;
      this._stopHeartbeat();
      this._emit('disconnected');
    });

    ws.addEventListener('error', () => {
      this._emit('error', { reason: 'WebSocket error' });
    });
  }

  /** Disconnect and clean up. */
  disconnect() {
    this._close();
  }

  /** Send CREATE_ROOM — server replies with ROOM_CREATED { code }. */
  createRoom() {
    this._send({ type: 'CREATE_ROOM' });
  }

  /** Send JOIN_ROOM — server replies with JOIN_OK or JOIN_ERROR. */
  joinRoom(code) {
    this._send({ type: 'JOIN_ROOM', code: code.toUpperCase() });
  }

  /** Signal this client is ready to start (after countdown). */
  sendReady() {
    this._send({ type: 'READY' });
  }

  /** Send flap event to opponent. */
  sendFlap() {
    this._send({ type: 'FLAP' });
  }

  /** Send position snapshot so opponent bird stays in sync. */
  sendSync(y, vy, score) {
    this._send({ type: 'SYNC', y, vy, score });
  }

  /** Notify server (and opponent) that local bird died. */
  sendDead(score) {
    this._send({ type: 'DEAD', score });
  }

  /** Request a rematch. */
  sendPlayAgain() {
    this._send({ type: 'PLAY_AGAIN' });
  }

  /** Subscribe to a message type. Returns unsubscribe function. */
  on(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = new Set();
    this._listeners[type].add(fn);
    return () => this._listeners[type].delete(fn);
  }

  /** One-way latency estimate in ms (half of last round-trip). */
  get latency() { return this._latency; }

  // --- Internal ---

  _send(msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    } else if (this._ws && this._ws.readyState === WebSocket.CONNECTING) {
      // Connection in progress — buffer until open
      this._queue.push(msg);
    }
  }

  _handle(msg) {
    const { type } = msg;

    switch (type) {
      case 'ROOM_CREATED':
        this.roomCode = msg.code;
        this.playerId = 1;
        break;
      case 'JOIN_OK':
        this.playerId = msg.playerId;
        break;
      case 'PONG':
        this._latency = (performance.now() - this._lastPingSent) / 2;
        return; // don't emit to callers
    }

    this._emit(type, msg);
  }

  _emit(type, data) {
    const fns = this._listeners[type];
    if (fns) fns.forEach(fn => fn(data));
  }

  _startHeartbeat() {
    this._pingInterval = setInterval(() => {
      this._lastPingSent = performance.now();
      this._send({ type: 'PING', t: this._lastPingSent });
    }, 5000);
  }

  _stopHeartbeat() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  _close() {
    this._stopHeartbeat();
    this._queue = [];
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.connected = false;
    this.playerId = null;
    this.roomCode = null;
  }
}

export const multiplayer = new MultiplayerClient();
