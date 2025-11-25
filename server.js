const express = require("express");
const axios = require("axios");
const app = express();

// --- CONFIGURATION ---
const BIN_ID = "6925bcefd0ea881f40ff674e"; 
const API_KEY = "$2a$10$sVMLR2Pslzjh4azLrjabseG.LR3H3Qko9FyycwVDTySgHrK0LS9v2"; 

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

let chatMemory = []; 
let serverAnnouncement = "Ai đạt được 1000 điểm sẽ reset leaderboard và reset threshold sẽ tăng thêm 1000";

// Helper: Get Leaderboard
async function getLeaderboard() {
  try {
    const response = await axios.get(JSONBIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
    return response.data.record.leaderboard || [];
  } catch (e) { return []; }
}

// Helper: Save Leaderboard
async function saveLeaderboard(leaderboardData) {
  await axios.put(JSONBIN_URL, { leaderboard: leaderboardData }, {
    headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY }
  });
}

// Endpoint: GET /data (Includes Announcement now)
app.get("/data", async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.json({ 
    leaderboard: leaderboard, 
    chat: chatMemory,
    announcement: serverAnnouncement // <--- SENDING TO CLIENT
  });
});

// Endpoint: POST /announce (Protected by Password)
// Usage: /announce?msg=NewUpdate&pass=mypassword123
app.post("/announce", (req, res) => {
  const msg = req.query.msg;
  const pass = req.query.pass;

  if (pass !== ADMIN_PASSWORD) return res.send("Wrong Password");
  if (!msg) return res.send("Empty Message");

  serverAnnouncement = msg;
  res.send("Announcement Updated");
});

// Endpoint: POST /chat
app.post("/chat", (req, res) => {
  const name = req.query.name || "Anon";
  const msg = req.query.msg || "";
  if (!msg) return res.send("Empty");
  chatMemory.push({ name: name, msg: msg });
  if (chatMemory.length > 20) chatMemory = chatMemory.slice(chatMemory.length - 20);
  res.send("Sent");
});

// Endpoint: POST /submit
app.post("/submit", async (req, res) => {
  const newScore = parseInt(req.query.score);
  const newName = req.query.name || "Unknown";
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

