const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const SECRET = 'supersecret';
const JWT_TTL = '1h'; // intentionally long

const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());

const users = [
  { username: 'user', password: 'user', role: 'user' },
  { username: 'admin', password: 'admin', role: 'admin' }
];

let carts = {}; // { username: { sku: qty } }
let orders = [];
let adminAlerts = [];

// --- HTTP Auth ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username, role: user.role }, SECRET, { expiresIn: JWT_TTL });
  res.json({ token });
});

// --- Fallback API (admin only) ---
app.get('/api/secret', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    res.json({ orders, adminAlerts });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

function broadcast(obj, filterFn = () => true) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && filterFn(client)) {
      client.send(JSON.stringify(obj));
    }
  });
}

// --- WebSocket ---
wss.on('connection', (ws, req) => {
  ws.isAuthed = false;
  ws.user = null;

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }

    // --- Auth handshake ---
    if (!ws.isAuthed) {
      if (data.type === 'auth' && data.token) {
        try {
          const payload = jwt.verify(data.token, SECRET);
          ws.isAuthed = true;
          ws.user = payload;
          ws.send(JSON.stringify({ type: 'auth', ok: true, user: payload }));
        } catch {
          ws.send(JSON.stringify({ type: 'auth', ok: false }));
          ws.close();
        }
      }
      return;
    }

    // --- VULN: No JWT check after handshake! ---

    // --- Chat ---
    if (data.type === 'chat' && data.msg) {
      // VULN: XSS - no sanitization!
      broadcast({ type: 'chat', user: ws.user.username, msg: data.msg });
    }

    // --- Cart ---
    if (data.type === 'addCart' && data.sku && data.qty) {
      carts[ws.user.username] = carts[ws.user.username] || {};
      carts[ws.user.username][data.sku] = (carts[ws.user.username][data.sku] || 0) + data.qty;
      broadcast({ type: 'cartUpdate', user: ws.user.username, cart: carts[ws.user.username] });
    }

    // --- Admin namespace (no real separation) ---
    if (data.type === 'adminAlert' && data.msg) {
      // VULN: No role check!
      adminAlerts.push({ msg: data.msg, time: Date.now() });
      // VULN: Info disclosure - sent to all, not just admins!
      broadcast({ type: 'adminAlert', msg: data.msg });
    }

    // --- Admin action (should be restricted) ---
    if (data.type === 'adminAction' && data.action) {
      // VULN: No role check!
      if (data.action === 'stockLow') {
        broadcast({ type: 'adminAlert', msg: 'Stock is low for SKU ' + (data.sku || '???') });
      }
    }

    // --- DoS: No frame size check! ---
  });
});

server.listen(3000, () => {
  console.log('SocketShop running on http://localhost:3000');
}); 