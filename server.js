// ========================================
// BLACKGOLD STUDIO - GAME BACKEND
// Simple Express server for game leaderboard
// ========================================

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Path to data files
const GAME_SCORES_FILE = path.join(__dirname, 'data', 'game-scores.json');

// ========== UTILITY FUNCTIONS ==========

// Ensure data directory and files exist
async function ensureDataFile() {
    try {
        const dir = path.join(__dirname, 'data');
        await fs.mkdir(dir, { recursive: true });
        
        try {
            await fs.access(GAME_SCORES_FILE);
        } catch {
            await fs.writeFile(GAME_SCORES_FILE, JSON.stringify({ players: [], scores: [] }, null, 2));
        }
    } catch (error) {
        console.error('Error creating data file:', error);
    }
}

// Read/write helpers for game scores
async function readGameScores() {
    try {
        const data = await fs.readFile(GAME_SCORES_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return {
            players: parsed.players || [],
            scores: parsed.scores || []
        };
    } catch (error) {
        console.error('Error reading game scores:', error);
        return { players: [], scores: [] };
    }
}

async function writeGameScores(payload) {
    try {
        await fs.writeFile(GAME_SCORES_FILE, JSON.stringify(payload, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing game scores:', error);
        return false;
    }
}

// ========== API ENDPOINTS ==========

// Block removed admin panel
app.get('/admin-newsletter.html', (_req, res) => {
    res.status(410).send('Admin panel removed.');
});

app.use(express.static(__dirname));

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST: Submit a game score (keeps highest per user)
app.post('/api/game/submit-score', async (req, res) => {
    try {
        const { tikTokUsername, score } = req.body;

        if (!tikTokUsername || typeof score !== 'number') {
            return res.status(400).json({ success: false, message: 'Username and score are required' });
        }

        const data = await readGameScores();
        const username = tikTokUsername.trim();
        const now = new Date().toISOString();

        // Ensure player exists
        let player = data.players.find(p => p.tikTokUsername.toLowerCase() === username.toLowerCase());
        if (!player) {
            player = {
                id: Date.now(),
                tikTokUsername: username,
                email: '',
                createdAt: now
            };
            data.players.push(player);
        }

        // Upsert score keeping the highest
        const existingIdx = data.scores.findIndex(s => s.tikTokUsername.toLowerCase() === username.toLowerCase());
        if (existingIdx >= 0) {
            if (score > data.scores[existingIdx].score) {
                data.scores[existingIdx].score = score;
                data.scores[existingIdx].timestamp = now;
            }
        } else {
            data.scores.push({
                tikTokUsername: username,
                score,
                timestamp: now
            });
        }

        await writeGameScores(data);

        res.json({ success: true });
    } catch (error) {
        console.error('Submit score error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET: Leaderboard (top 20)
app.get('/api/game/leaderboard', async (_req, res) => {
    try {
        const data = await readGameScores();
        const leaderboard = (data.scores || [])
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        res.json({ success: true, leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ========== START SERVER (LOCAL) ==========
if (process.env.VERCEL !== '1') {
    ensureDataFile().then(() => {
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════╗
║   BLACKGOLD STUDIO GAME SERVER        ║
║   Server running on port ${PORT}        ║
╚════════════════════════════════════════╝

API Endpoints:
  GET  /api/game/leaderboard
  POST /api/game/submit-score
        `);
        });
    });
} else {
    ensureDataFile();
}

module.exports = app;
