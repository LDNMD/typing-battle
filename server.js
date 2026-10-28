const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// 静态文件服务
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/') url = '/index.html';
  const filePath = path.normalize(path.join(__dirname, url));
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

function send(ws, obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

// 房间：code -> { code, password, players: [], finished }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 0/O/1/I 易混淆字符
  let code;
  do { code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function opponentOf(p) { if (!p.room) return null; return p.room.players.find(x => x !== p) || null; }

function startRoom(room) {
  const [a, b] = room.players;
  a.id = 0; b.id = 1;
  send(a.ws, { type: 'start', id: 0, name: a.name, opponentName: b.name });
  send(b.ws, { type: 'start', id: 1, name: b.name, opponentName: a.name });
}

wss.on('connection', (ws) => {
  const player = { ws, name: '玩家', id: -1, room: null, rematch: false, state: {} };

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.type) {
      case 'createRoom': {
        if (player.room) return;
        player.name = String(msg.name || '玩家').slice(0, 12) || '玩家';
        const code = genCode();
        const room = { code, password: String(msg.password || ''), players: [player], finished: false };
        player.room = room;
        rooms.set(code, room);
        send(ws, { type: 'roomCreated', code });
        break;
      }
      case 'joinRoom': {
        if (player.room) return;
        player.name = String(msg.name || '玩家').slice(0, 12) || '玩家';
        const code = String(msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { type: 'roomError', message: '房间不存在' }); break; }
        if (room.password && room.password !== String(msg.password || '')) { send(ws, { type: 'roomError', message: '密码错误' }); break; }
        if (room.players.length >= 2) { send(ws, { type: 'roomError', message: '房间已满' }); break; }
        player.room = room;
        room.players.push(player);
        if (room.players.length === 2) startRoom(room);
        break;
      }
      case 'state': {
        player.state = { hp: msg.hp, score: msg.score, kills: msg.kills, combo: msg.combo, level: msg.level };
        const opp = opponentOf(player);
        if (opp) send(opp.ws, Object.assign({ type: 'opponent' }, player.state));
        break;
      }
      case 'dead': {
        const room = player.room;
        if (!room || room.finished) return;
        room.finished = true;
        const opp = opponentOf(player);
        send(ws, { type: 'result', win: false, opponentScore: opp ? (opp.state.score || 0) : 0 });
        if (opp) send(opp.ws, { type: 'result', win: true, opponentScore: msg.score || 0 });
        break;
      }
      case 'rematch': {
        const room = player.room;
        if (!room) return;
        player.rematch = true;
        const opp = opponentOf(player);
        if (opp && opp.rematch) {
          player.rematch = false; opp.rematch = false;
          room.finished = false;
          startRoom(room);
        } else {
          send(ws, { type: 'rematchWait' });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    const room = player.room;
    if (room) {
      rooms.delete(room.code);
      const opp = room.players.find(x => x !== player);
      if (opp && opp.ws.readyState === 1) {
        opp.room = null;
        send(opp.ws, { type: 'opponentLeft' });
      }
    }
  });
});

function lanIPs() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

server.listen(PORT, () => {
  console.log('Typing Battle server started on port ' + PORT);
  console.log('Local:    http://localhost:' + PORT);
  for (const ip of lanIPs()) console.log('LAN:      http://' + ip + ':' + PORT);
});
