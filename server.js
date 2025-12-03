const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURATION ---
const BIN_ID = "6925bcefd0ea881f40ff674e"; 
const API_KEY = "$2a$10$sVMLR2Pslzjh4azLrjabseG.LR3H3Qko9FyycwVDTySgHrK0LS9v2"; 
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// --- HTTP ROUTES (Single Player) ---
let chatMemory = [];
let serverAnnouncement = "3/12/2025 Update: Multiplayer added! So fucking ass, ain't it?";

app.get("/data", async (req, res) => {
    let leaderboard = [];
    try {
        const response = await axios.get(JSONBIN_URL + "/latest", { 
            headers: { "X-Master-Key": API_KEY } 
        });
        leaderboard = response.data.record.leaderboard || [];
    } catch (e) { 
        console.error("JsonBin Error:", e.message); 
    }
    
    res.json({ 
        leaderboard: leaderboard, 
        chat: chatMemory,
        announcement: serverAnnouncement
    });
});

app.post("/submit", async (req, res) => {
    const newScore = parseInt(req.body.score);
    const newName = req.body.name || "Unknown";
    
    try {
        const response = await axios.get(JSONBIN_URL + "/latest", { 
            headers: { "X-Master-Key": API_KEY } 
        });
        let leaderboard = response.data.record.leaderboard || [];
        
        leaderboard.push({ name: newName, score: newScore });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        
        await axios.put(JSONBIN_URL, { leaderboard }, {
            headers: { 
                "Content-Type": "application/json", 
                "X-Master-Key": API_KEY 
            }
        });
        
        res.send("Score Saved");
    } catch (e) { 
        console.error("Submit Error:", e.message);
        res.status(500).send("Error"); 
    }
});

app.post("/chat", (req, res) => {
    const name = (req.body.name || "Anon").substring(0, 20); // Limit length
    const msg = (req.body.msg || "").substring(0, 100); // Limit length
    
    if (msg.trim()) {
        chatMemory.push({ name, msg, timestamp: Date.now() });
        if (chatMemory.length > 50) {
            chatMemory = chatMemory.slice(-50); // Keep last 50
        }
    }
    res.send("Sent");
});

// --- REAL-TIME MULTIPLAYER (Socket.IO) ---
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    pingInterval: 10000,
    pingTimeout: 5000
});

let players = {};
let stateChanged = false; // Track if any player moved

io.on("connection", (socket) => {
    console.log(`Player Connected: ${socket.id}`);
    
    // Assign random color (only once)
    const r = Math.random();
    const g = Math.random();
    const b = Math.random();
    
    players[socket.id] = { 
        x: 400, 
        y: 300, 
        name: "Pilot", 
        r, 
        g, 
        b,
        lastUpdate: Date.now()
    };
    
    stateChanged = true;
    
    // Send initial state to new player
    socket.emit("serverState", players);
    
    // Handle Movement Updates (with rate limiting)
    socket.on("updatePlayer", (data) => {
        if (!players[socket.id]) return;
        
        const now = Date.now();
        const player = players[socket.id];
        
        // Rate limit: max 60 updates per second per client
        if (now - player.lastUpdate < 16) return;
        
        // Validate bounds (adjust to your game size)
        const x = Math.max(0, Math.min(800, data.x || 0));
        const y = Math.max(0, Math.min(600, data.y || 0));
        const name = (data.name || "Pilot").substring(0, 20);
        
        // Only update if actually changed
        if (player.x !== x || player.y !== y || player.name !== name) {
            player.x = x;
            player.y = y;
            player.name = name;
            player.lastUpdate = now;
            stateChanged = true;
        }
    });
    
    socket.on("disconnect", () => {
        console.log(`Player Disconnected: ${socket.id}`);
        delete players[socket.id];
        stateChanged = true;
    });
});

// Optimized broadcast: only send when state changes, at 30 FPS
setInterval(() => {
    if (stateChanged && Object.keys(players).length > 0) {
        io.emit("serverState", players);
        stateChanged = false;
    }
}, 1000 / 30); // 30 FPS is plenty for this type of game

// Cleanup stale connections
setInterval(() => {
    const now = Date.now();
    for (const id in players) {
        if (now - players[id].lastUpdate > 30000) { // 30 seconds timeout
            console.log(`Removing stale player: ${id}`);
            delete players[id];
            stateChanged = true;
        }
    }
}, 10000); // Check every 10 seconds

// --- START SERVER ---
const port = process.env.PORT || 3000;
server.listen(port, () => { 
    console.log(`Server running on port ${port}`); 
});
