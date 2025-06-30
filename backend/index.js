const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mcpClient = require('./mcpClient');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Spotify auth flow
app.get('/api/auth/start', (req, res) => {
  try {
    const url = mcpClient.getSpotifyAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exchange code for token
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    const data = await mcpClient.exchangeCodeForToken(code);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    const data = await mcpClient.getUserPlaylists(accessToken);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate playlist
app.post('/api/generate-playlist', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    const params = req.body;
    const data = await mcpClient.generatePlaylist(params, accessToken);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: Add endpoints for auth, playlist generation, etc.

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 