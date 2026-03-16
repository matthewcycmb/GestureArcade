// WebSocket relay server — zero game logic, pure message forwarding
// Deploy to Railway: set PORT env var (Railway provides it automatically)
// Local: node relay.js  →  ws://localhost:3001

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// Room code alphabet — consonant-heavy, avoids I/1 and O/0 confusion
const ALPHABET = 'BCDFGHJKLMNPRST';

function generateCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// rooms: Map<code, { p1: WebSocket, p2: WebSocket|null, state: 'waiting'|'ready'|'playing' }>
const rooms = new Map();

function send(ws, msg) {
  if (ws && ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(msg));
  }
}

function findRoomBySocket(ws) {
  for (const [code, room] of rooms) {
    if (room.p1 === ws || room.p2 === ws) return { code, room };
  }
  return null;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    ws.isAlive = true;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const { type } = msg;

    if (type === 'CREATE_ROOM') {
      // Generate unique code
      let code;
      let attempts = 0;
      do {
        code = generateCode();
        attempts++;
      } while (rooms.has(code) && attempts < 100);

      rooms.set(code, { p1: ws, p2: null, state: 'waiting', readyCount: 0 });
      ws._roomCode = code;
      ws._playerId = 1;
      send(ws, { type: 'ROOM_CREATED', code });

    } else if (type === 'JOIN_ROOM') {
      const code = (msg.code || '').toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        send(ws, { type: 'JOIN_ERROR', reason: 'Room not found' });
      } else if (room.p2) {
        send(ws, { type: 'JOIN_ERROR', reason: 'Room is full' });
      } else if (room.state === 'playing') {
        send(ws, { type: 'JOIN_ERROR', reason: 'Game already in progress' });
      } else {
        room.p2 = ws;
        room.state = 'ready';
        ws._roomCode = code;
        ws._playerId = 2;
        send(ws, { type: 'JOIN_OK', playerId: 2 });
        send(room.p1, { type: 'OPPONENT_JOINED' });
      }

    } else if (type === 'READY') {
      const entry = findRoomBySocket(ws);
      if (!entry) return;
      const { room } = entry;

      // Guard: track per-player ready state to prevent double-counting
      if (!room._readySet) room._readySet = new Set();
      if (room._readySet.has(ws)) return; // already marked ready
      room._readySet.add(ws);

      if (room._readySet.size >= 2) {
        // Both players ready — generate seed and start
        const seed = Math.floor(Math.random() * 2 ** 32);
        room.state = 'playing';
        room._readySet = null;
        send(room.p1, { type: 'START', seed });
        send(room.p2, { type: 'START', seed });
      }

    } else if (type === 'FLAP') {
      const entry = findRoomBySocket(ws);
      if (!entry) return;
      const { room } = entry;
      const opponent = ws === room.p1 ? room.p2 : room.p1;
      send(opponent, { type: 'FLAP' });

    } else if (type === 'SYNC') {
      // Forward position snapshot to opponent
      const entry = findRoomBySocket(ws);
      if (!entry) return;
      const { room } = entry;
      const opponent = ws === room.p1 ? room.p2 : room.p1;
      send(opponent, { type: 'SYNC', y: msg.y, vy: msg.vy, score: msg.score });

    } else if (type === 'DEAD') {
      const entry = findRoomBySocket(ws);
      if (!entry) return;
      const { room } = entry;
      const opponent = ws === room.p1 ? room.p2 : room.p1;
      send(opponent, { type: 'OPPONENT_DEAD', score: msg.score });

    } else if (type === 'PLAY_AGAIN') {
      const entry = findRoomBySocket(ws);
      if (!entry) return;
      const { room } = entry;

      // Track which players want a rematch
      if (!room._rematchSet) room._rematchSet = new Set();
      room._rematchSet.add(ws);

      const opponent = ws === room.p1 ? room.p2 : room.p1;

      if (room._rematchSet.size >= 2) {
        // Both want rematch — reset room and start countdown
        room.readyCount = 0;
        room.state = 'ready';
        room._rematchSet = null;
        send(room.p1, { type: 'REMATCH_START' });
        send(room.p2, { type: 'REMATCH_START' });
      } else {
        // First player requested — notify opponent
        send(opponent, { type: 'REMATCH_REQUESTED' });
        send(ws, { type: 'REMATCH_WAITING' });
      }

    } else if (type === 'PING') {
      send(ws, { type: 'PONG', t: msg.t });
    }
  });

  ws.on('close', () => {
    const entry = findRoomBySocket(ws);
    if (!entry) return;
    const { code, room } = entry;

    const opponent = ws === room.p1 ? room.p2 : room.p1;

    // Notify opponent regardless of room state
    if (opponent) {
      send(opponent, { type: 'OPPONENT_DISCONNECTED' });
    }

    rooms.delete(code);
  });

  ws.on('error', () => {});
});

// Heartbeat: close connections that haven't responded in 30s
const heartbeatInterval = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

console.log(`Relay server listening on ws://localhost:${PORT}`);
