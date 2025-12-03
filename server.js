const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

const BIN_ID = "6925bcefd0ea881f40ff674e"; 
const API_KEY = "$2a$10$sVMLR2Pslzjh4azLrjabseG.LR3H3Qko9FyycwVDTySgHrK0LS9v2"; 
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

const ADMIN_PASSWORD = "mypassword123"; 

let chatMemory = []; 
let serverAnnouncement = "26/11/2025 Update: OpenGL renderer supported. Improved UX.";

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

app.get("/data", async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.json({ 
    leaderboard: leaderboard, 
    chat: chatMemory,
    announcement: serverAnnouncement
  });
});

app.post("/announce", (req, res) => {
  const msg = req.body.msg || req.query.msg; 
  const pass = req.body.pass || req.query.pass;

  if (pass !== ADMIN_PASSWORD) return res.send("Wrong Password");
  if (!msg) return res.send("Empty Message");

  serverAnnouncement = msg;
  res.send("Announcement Updated");
});

app.post("/chat", (req, res) => {
  const name = req.body.name || "Anon";
  const msg = req.body.msg || "";

  if (!msg) return res.send("Empty");

  chatMemory.push({ name: name, msg: msg });

  if (chatMemory.length > 20) {
    chatMemory = chatMemory.slice(chatMemory.length - 20);
  }
  
  res.send("Sent");
});

app.post("/submit", async (req, res) => {
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





