const express = require("express");
const axios = require("axios");
const app = express();

// --- CONFIGURATION ---
// Replace these with the keys you got from Step 1
const BIN_ID = "YOUR_BIN_ID_HERE"; 
const API_KEY = "$2b$10$YOUR_MASTER_KEY_HERE"; 

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Endpoint: GET /message
app.get("/message", (req, res) => {
  res.send("Render Server Online!");
});

// Endpoint: GET /highscore
app.get("/highscore", async (req, res) => {
  try {
    // Fetch data from JSONBin
    const response = await axios.get(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": API_KEY }
    });
    // Send just the score number back to the game
    res.send(response.data.record.score.toString());
  } catch (error) {
    console.error(error);
    res.send("0");
  }
});

// Endpoint: POST /submit?name=ABC&score=123
app.post("/submit", async (req, res) => {
  const newScore = parseInt(req.query.score);
  const newName = req.query.name;

  try {
    // 1. Get current data
    const readResponse = await axios.get(JSONBIN_URL + "/latest", {
      headers: { "X-Master-Key": API_KEY }
    });
    
    const currentData = readResponse.data.record;

    // 2. Check if we beat the score
    if (newScore > currentData.score) {
      const newData = { score: newScore, holder: newName };

      // 3. Save new data back to JSONBin
      await axios.put(JSONBIN_URL, newData, {
        headers: { 
            "Content-Type": "application/json",
            "X-Master-Key": API_KEY 
        }
      });
      console.log(`New High Score: ${newScore} by ${newName}`);
    }
    
    res.send("OK");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});