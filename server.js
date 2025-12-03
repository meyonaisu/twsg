const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURATION (Keep your existing keys) ---
const BIN_ID = "6925bcefd0ea881f40ff674e"; 
const API_KEY = "$2a$10$sVMLR2Pslzjh4azLrjabseG.LR3H3Qko9FyycwVDTySgHrK0LS9v2"; 
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const ADMIN_PASSWORD = "mypassword123";

// --- HTTP ROUTES (For Single Player Leaderboard/Chat) ---
let chatMemory = [];
let serverAnnouncement = "26/11/2025 Update: Multiplayer added! So fucking ass, ain't it?";

// Fetch Data (Leaderboard + Chat)
app.get("/data", async (req, res) => {
    let leaderboard = [];
    try {
        const response = await axios.get(JSONBIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
        leaderboard = response.data.record.leaderboard || [];
    } catch (e) { console.error("JsonBin Error"); }

    res.json({ 
        leaderboard: leaderboard, 
        chat: chatMemory,
        announcement: serverAnnouncement
    });
});

// Submit Score (Single Player)
app.post("/submit", async (req, res) => {
    const newScore = parseInt(req.body.score);
    const newName = req.body.name || "Unknown";
    try {
        const response = await axios.get(JSONBIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
        let leaderboard = response.data.record.leaderboard || [];
        leaderboard.push({ name: newName, score: newScore });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);

        await axios.put(JSONBIN_URL, { leaderboard: leaderboard }, {
            headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY }
        });
        res.send("Score Saved");
    } catch (e) { res.status(500).send("Error"); }
});

// Simple Chat (Single Player Screen)
app.post("/chat", (req, res) => {
    const name = req.body.name || "Anon";
    const msg = req.body.msg || "";
    if (msg) {
        chatMemory.push({ name: name, msg: msg });
        if (chatMemory.length > 20) chatMemory = chatMemory.slice(chatMemory.length - 20);
    }
    res.send("Sent");
});

// --- REAL-TIME MULTIPLAYER (Socket.IO) ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {}; // Format: { socketId: { x, y, name, r, g, b } }

io.on("connection", (socket) => {
    console.log(`Player Connected: ${socket.id}`);

    // Assign random color
    const r = Math.random();
    const g = Math.random();
    const b = Math.random();

    // Initialize player data
    players[socket.id] = { x: 0, y: 0, name: "Pilot", r, g, b };

    // Handle Movement Updates from Client
    socket.on("updatePlayer", (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].name = data.name;
        }
    });

    // Handle Disconnect
    socket.on("disconnect", () => {
        console.log(`Player Disconnected: ${socket.id}`);
        delete players[socket.id];
    });
});

// Broadcast Loop: Send all player positions to everyone 30 times a second
setInterval(() => {
    io.emit("serverState", players);
}, 1000 / 30);

// --- START SERVER ---
const port = process.env.PORT || 3000;
server.listen(port, () => { 
    console.log(`Server running on port ${port}`); 
});
