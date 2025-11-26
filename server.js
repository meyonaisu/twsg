const express = require("express");
const axios = require("axios");
const cors = require("cors"); // Recommended: Run 'npm install cors'
const app = express();

// --- MIDDLEWARE ---
app.use(express.json()); // <--- CRITICAL: Allows server to read JSON body
app.use(cors());         // <--- CRITICAL: Fixes browser connection blocks

// --- CONFIGURATION ---
const BIN_ID = "6925bcefd0ea881f40ff674e"; 
const API_KEY = "$2a$10$sVMLR2Pslzjh4azLrjabseG.LR3H3Qko9FyycwVDTySgHrK0LS9v2"; 
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Admin Password (was missing in your snippet, added placeholder)
const ADMIN_PASSWORD = "mypassword123"; 

let chatMemory = []; 
let serverAnnouncement = "26/11/2025 Update: Live chat added. (Shout out to JUNAR for testing the chat function)";

// ... [getLeaderboard and saveLeaderboard functions stay the same] ...

// Helper: Get Leaderboard
async function getLeaderboard() {
  try {
    const response = await axios.get(JSONBIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
    return response.data.record.leaderboard || [];
  } catch (e) { return []; }
}

async function saveLeaderboard(leaderboardData) {
  await axios.put(JSONBIN_URL, { leaderboard: leaderboardData }, {
    headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY }
  });
}

// Endpoint: GET /data
app.get("/data", async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.json({ 
    leaderboard: leaderboard, 
    chat: chatMemory,
    announcement: serverAnnouncement
  });
});

// Endpoint: POST /announce
app.post("/announce", (req, res) => {
  // Use req.body for POST requests, not req.query
  const msg = req.body.msg || req.query.msg; 
  const pass = req.body.pass || req.query.pass;

  if (pass !== ADMIN_PASSWORD) return res.send("Wrong Password");
  if (!msg) return res.send("Empty Message");

  serverAnnouncement = msg;
  res.send("Announcement Updated");
});

// Endpoint: POST /chat
app.post("/chat", (req, res) => {
  // FIXED: Changed to req.body to handle special characters and long text
  const name = req.body.name || "Anon";
  const msg = req.body.msg || "";

  if (!msg) return res.send("Empty");

  chatMemory.push({ name: name, msg: msg });

  // Logic: Keep only the NEWEST 20 messages
  if (chatMemory.length > 20) {
    chatMemory = chatMemory.slice(chatMemory.length - 20);
  }
  
  res.send("Sent");
});

// Endpoint: POST /submit
app.post("/submit", async (req, res) => {
  // FIXED: Changed to req.body
  const newScore = parseInt(req.body.score);
  const newName = req.body.name || "Unknown";

  try {
    let leaderboard = await getLeaderboard();
    leaderboard.push({ name: newName, score: newScore });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    await saveLeaderboard(leaderboard);
    res.send("Score Saved");
  } catch (e) { res.status(500).send("Error"); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => { console.log(`Server running on port ${port}`); });



