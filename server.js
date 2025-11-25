const express = require("express");
const axios = require("axios");
const app = express();

// --- CONFIGURATION ---
const BIN_ID = "6925bcefd0ea881f40ff674e"; 
const API_KEY = "$2a$10$sVMLR2Pslzjh4azLrjabseG.LR3H3Qko9FyycwVDTySgHrK0LS9v2"; 

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Endpoint: GET /leaderboard
// Returns a JSON list: [{"name":"Alex","score":500}, {"name":"Bob","score":400}]
app.get("/leaderboard", async (req, res) => {
  try {
    const response = await axios.get(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": API_KEY }
    });
    // Return the array, or empty array if missing
    res.json(response.data.record.leaderboard || []);
  } catch (error) {
    console.error(error);
    res.json([]);
  }
});

// Endpoint: POST /submit?name=ABC&score=123
app.post("/submit", async (req, res) => {
  const newScore = parseInt(req.query.score);
  const newName = req.query.name || "Unknown";

  try {
    // 1. Get current data
    const readResponse = await axios.get(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": API_KEY }
    });
    
    let data = readResponse.data.record;
    if (!data.leaderboard) data.leaderboard = [];

    // 2. Add new score
    data.leaderboard.push({ name: newName, score: newScore });

    // 3. Sort by score (Highest first)
    data.leaderboard.sort((a, b) => b.score - a.score);

    // 4. Keep only Top 50
    data.leaderboard = data.leaderboard.slice(0, 50);

    // 5. Save back to JSONBin
    await axios.put(JSONBIN_URL, data, {
      headers: { 
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY 
      }
    });
    
    res.send("Score Saved");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

