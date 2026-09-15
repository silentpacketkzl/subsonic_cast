/**
 * Arpeggi Connect Server
 * Zero-dependency Node.js server providing:
 * 1. Static file hosting for iOS Arpeggi client and PC Receiver
 * 2. Real-time Spotify Connect relay (WebSocket + HTTP fallback)
 * 3. Subsonic CORS proxy for Navidrome integration
 * 4. Local network IP auto-detection for easy iPhone connection
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg'
};

// Device registry for Spotify Connect
const connectedClients = new Map(); // socket -> { id, name, type, ip }
let activePlaybackState = {
  activeDeviceId: 'pc-speaker-1', // Default target device
  isPlaying: false,
  currentSong: null,
  position: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  updatedAt: Date.now()
};

// Find local IPv4 address on LAN (for iPhone pairing)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Broadcast message to all connected WebSocket clients
function broadcast(message, excludeSocket = null) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  for (const [socket, meta] of connectedClients.entries()) {
    if (socket !== excludeSocket && socket.readyState === 'open') {
      sendWsFrame(socket, data);
    }
  }
}

// Get registered device list
function getDeviceList() {
  const devices = [
    {
      id: 'pc-speaker-1',
      name: 'Windows PC (Speakers)',
      type: 'pc-receiver',
      isOnline: true,
      isCurrent: activePlaybackState.activeDeviceId === 'pc-speaker-1'
    }
  ];

  for (const [socket, meta] of connectedClients.entries()) {
    if (meta.type === 'pc-receiver' && meta.id !== 'pc-speaker-1') {
      devices.push({
        id: meta.id,
        name: meta.name || 'External Speaker',
        type: meta.type,
        isOnline: true,
        isCurrent: activePlaybackState.activeDeviceId === meta.id
      });
    }
  }

  return devices;
}

// Minimal native RFC 6455 WebSocket implementation (0 dependencies)
function handleWebSocketUpgrade(req, socket, head) {
  const secKey = req.headers['sec-websocket-key'];
  if (!secKey) {
    socket.destroy();
    return;
  }

  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto.createHash('sha1').update(secKey + GUID).digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');
  socket.readyState = 'open';

  // Client metadata
  const clientId = 'client-' + Math.random().toString(36).substring(2, 9);
  connectedClients.set(socket, {
    id: clientId,
    name: 'Unknown Client',
    type: 'unknown',
    ip: req.socket.remoteAddress
  });

  // Welcome message with state & devices
  sendWsFrame(socket, JSON.stringify({
    type: 'INIT',
    clientId,
    devices: getDeviceList(),
    state: activePlaybackState
  }));

  // Handle incoming data frames
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const byte1 = buffer[0];
      const byte2 = buffer[1];
      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) !== 0;
      let payloadLen = byte2 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) return;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let mask = null;
      if (isMasked) {
        if (buffer.length < offset + 4) return;
        mask = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLen) return;

      const payload = buffer.subarray(offset, offset + payloadLen);
      buffer = buffer.subarray(offset + payloadLen);

      if (isMasked && mask) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      // Close opcode
      if (opcode === 0x08) {
        socket.destroy();
        return;
      }
      // Ping opcode
      if (opcode === 0x09) {
        sendWsPong(socket, payload);
        continue;
      }
      // Text frame
      if (opcode === 0x01) {
        try {
          const messageStr = payload.toString('utf8');
          const message = JSON.parse(messageStr);
          processClientMessage(socket, message);
        } catch (err) {
          console.error('Error processing WS frame:', err.message);
        }
      }
    }
  });

  socket.on('close', () => {
    connectedClients.delete(socket);
    broadcast({ type: 'DEVICES_UPDATE', devices: getDeviceList() });
  });

  socket.on('error', () => {
    connectedClients.delete(socket);
  });
}

// Send unmasked WebSocket text frame
function sendWsFrame(socket, text) {
  if (socket.destroyed || socket.readyState !== 'open') return;
  const payload = Buffer.from(text, 'utf8');
  const length = payload.length;
  let header;

  if (length <= 125) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  try {
    socket.write(Buffer.concat([header, payload]));
  } catch (err) {
    console.error('Failed to send WS frame:', err.message);
  }
}

function sendWsPong(socket, payload) {
  const header = Buffer.from([0x8a, payload.length]);
  try {
    socket.write(Buffer.concat([header, payload]));
  } catch (err) {}
}

// Dispatch actions & state updates
function processClientMessage(socket, message) {
  const clientMeta = connectedClients.get(socket);
  if (!clientMeta) return;

  switch (message.type) {
    case 'REGISTER':
      clientMeta.id = message.id || clientMeta.id;
      clientMeta.name = message.name || clientMeta.name;
      clientMeta.type = message.clientType || 'mobile-controller';
      broadcast({ type: 'DEVICES_UPDATE', devices: getDeviceList() });
      break;

    case 'SELECT_DEVICE':
      activePlaybackState.activeDeviceId = message.deviceId;
      broadcast({
        type: 'DEVICE_CHANGED',
        activeDeviceId: message.deviceId,
        state: activePlaybackState
      });
      break;

    case 'STATE_SYNC':
      // Update receiver state
      if (message.state) {
        activePlaybackState = {
          ...activePlaybackState,
          ...message.state,
          updatedAt: Date.now()
        };
        // Broadcast mirrored state to other controllers
        broadcast({
          type: 'STATE_UPDATE',
          state: activePlaybackState
        }, socket);
      }
      break;

    case 'COMMAND':
      // Relay command (PLAY, PAUSE, SEEK, VOLUME, NEXT, PREV) to target device
      broadcast({
        type: 'COMMAND',
        command: message.command,
        payload: message.payload,
        senderId: clientMeta.id,
        targetDeviceId: message.targetDeviceId || activePlaybackState.activeDeviceId
      });
      break;

    case 'TRANSFER_PLAYBACK':
      activePlaybackState.activeDeviceId = message.targetDeviceId;
      if (message.song) activePlaybackState.currentSong = message.song;
      if (message.position !== undefined) activePlaybackState.position = message.position;
      if (message.isPlaying !== undefined) activePlaybackState.isPlaying = message.isPlaying;
      if (message.queue) activePlaybackState.queue = message.queue;
      activePlaybackState.updatedAt = Date.now();

      broadcast({
        type: 'TRANSFER_PLAYBACK',
        targetDeviceId: message.targetDeviceId,
        state: activePlaybackState
      });
      break;

    default:
      console.log('Unhandled WS message type:', message.type);
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // Add CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // REST API Endpoints for Connect
  if (pathname === '/api/devices') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ devices: getDeviceList(), activeDeviceId: activePlaybackState.activeDeviceId }));
    return;
  }

  if (pathname === '/api/state') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          activePlaybackState = { ...activePlaybackState, ...data, updatedAt: Date.now() };
          broadcast({ type: 'STATE_UPDATE', state: activePlaybackState });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, state: activePlaybackState }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(activePlaybackState));
    return;
  }

  // Network Info API (for QR code & pairing url)
  if (pathname === '/api/info') {
    const localIp = getLocalIpAddress();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      port: PORT,
      localIp,
      mobileUrl: `http://${localIp}:${PORT}/`,
      receiverUrl: `http://${localIp}:${PORT}/receiver.html`
    }));
    return;
  }

  // Subsonic Proxy Endpoint (bypasses browser CORS & mixed-content restrictions)
  if (pathname.startsWith('/api/proxy')) {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing "url" parameter');
      return;
    }

    try {
      const proxyReq = http.request(targetUrl, { method: req.method, headers: req.headers }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${err.message}`);
      });
      req.pipe(proxyReq);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Proxy exception: ${err.message}`);
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range requests for smooth audio streaming/scrubbing
    const range = req.headers.range;
    if (range && (ext === '.mp3' || ext === '.wav' || ext === '.flac')) {
      const fileSize = fs.statSync(filePath).size;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      file.pipe(res);
      return;
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// Attach WebSocket upgrade listener
server.on('upgrade', (req, socket, head) => {
  handleWebSocketUpgrade(req, socket, head);
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log('====================================================');
  console.log('  🎵 Arpeggi Subsonic Music Player & Spotify Connect');
  console.log('====================================================');
  console.log(`  🖥️  PC Speaker Receiver: http://localhost:${PORT}/receiver.html`);
  console.log(`  📱  iOS / Mobile Player: http://${localIp}:${PORT}/`);
  console.log('====================================================');
  console.log('  Connect your iPhone and PC to the same Wi-Fi network.');
  console.log('  Open the Mobile URL on iPhone Safari -> "Add to Home Screen"');
  console.log('====================================================\n');
});
