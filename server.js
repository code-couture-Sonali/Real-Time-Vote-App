const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Session middleware
app.use(session({
  secret: 'voting-app-secret',
  resave: false,
  saveUninitialized: true,
  store: new MemoryStore({
    checkPeriod: 86400000 // Prune expired entries every 24h
  }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Serve static files from 'public'
app.use(express.static('public'));

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });
const httpServer = app.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});

// Handle WebSocket upgrade
httpServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Voting state
let votes = { "Option A": 0, "Option B": 0, "Option C": 0 };
let userVotes = new Map(); // Tracks votes per user

// Broadcast function
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const session = req.session || {};
  const userId = session.userId || uuidv4();
  session.userId = userId;

  if (!userVotes.has(userId)) userVotes.set(userId, null); // Null until they vote

  console.log(`Client connected: ${userId}`);

  // Send initial state
  ws.send(JSON.stringify({
    type: 'init',
    votes,
    options: Object.keys(votes),
    hasVoted: !!userVotes.get(userId) // True if user has voted
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const userVote = userVotes.get(userId);

      if (data.type === 'vote' && votes.hasOwnProperty(data.option)) {
        if (!userVote) { // Only allow voting if they haven’t voted yet
          votes[data.option] += 1;
          userVotes.set(userId, data.option);
          broadcast({
            type: 'update',
            votes,
            hasVoted: true
          });
          console.log(`Vote by ${userId} for ${data.option}. Tally:`, votes);
        }
      }
    } catch (error) {
      console.error(`Error processing message from ${userId}:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${userId}`);
  });
});