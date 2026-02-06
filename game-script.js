/* ========================================
    BLACKGOLD STUDIO - GAME LOGIC
   Geometry Dash Style Mini Game
   ======================================== */

// ========== API CONFIGURATION ==========
const API_URL = window.GAME_API_BASE || 'http://localhost:3000';

// ========== LEADERBOARD LOGIC ==========
async function loadLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');
    
    try {
        // Try backend API first
        console.log(`Loading leaderboard from ${API_URL}/api/game/leaderboard`);
        const response = await fetch(`${API_URL}/api/game/leaderboard`);
        if (response.ok) {
            const data = await response.json();
            console.log('Leaderboard data received:', data);
            displayLeaderboard(data.leaderboard || []);
            return;
        } else {
            console.log('API response not ok:', response.status);
        }
    } catch (error) {
        console.log('Backend not available, using localStorage:', error);
    }
    
    // Fallback: use localStorage
    const scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
    console.log('Using localStorage scores:', scores);
    displayLeaderboard(scores);
}

function displayLeaderboard(scores) {
    const leaderboardBody = document.getElementById('leaderboardBody');
    
    if (!scores || scores.length === 0) {
        leaderboardBody.innerHTML = '<tr class="no-data-row"><td colspan="4">No scores yet. Be the first to play!</td></tr>';
        return;
    }
    
    // Sort scores and get top 20
    const topScores = scores.sort((a, b) => b.score - a.score).slice(0, 20);
    
    let html = '';
    topScores.forEach((entry, index) => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        // Remove @ if it already exists in username
        const username = entry.tikTokUsername.startsWith('@') ? entry.tikTokUsername : `@${entry.tikTokUsername}`;
        html += `
            <tr>
                <td class="rank">${index + 1}</td>
                <td class="username">${username}</td>
                <td class="score">${entry.score}</td>
                <td class="date">${date}</td>
            </tr>
        `;
    });
    
    leaderboardBody.innerHTML = html;
    console.log(`Leaderboard updated with ${topScores.length} scores`);
}


// ========== GAME CONFIGURATION ==========
// Optional: set window.GAME_API_BASE to point to a deployed backend
const API_URL = window.GAME_API_BASE || window.location.origin;

const CONFIG = {
    GRAVITY: 0.6,
    JUMP_FORCE: -12,
    PLAYER_SIZE: 50,
    OBSTACLE_WIDTH: 30,
    OBSTACLE_HEIGHT: 50,
    GROUND_HEIGHT: 80,
    GAME_SPEED: 5,
    OBSTACLE_SPAWN_RATE: 120, // frames between obstacles
    BACKGROUND_COLOR: '#0d0806',
    GROUND_COLOR: '#7A391B',
    OBSTACLE_COLOR: '#7A391B',
    PLAYER_COLOR: '#F3C4AC'
};

// ========== GAME VARIABLES ==========
let canvas, ctx;
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let highScore = 0;
let frameCount = 0;
let logoImage = new Image();

// Load brand logo
logoImage.src = 'assets/images/blackgold-studio-logo.png';

// Player object
let player = {
    x: 150,
    y: 0,
    width: CONFIG.PLAYER_SIZE,
    height: CONFIG.PLAYER_SIZE,
    velocityY: 0,
    isJumping: false,
    rotation: 0
};

// Obstacles array
let obstacles = [];

// ========== DOM ELEMENTS ==========
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const homeBtn = document.getElementById('homeBtn');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const finalScoreDisplay = document.getElementById('finalScore');
const bestScoreDisplay = document.getElementById('bestScore');

// ========== INITIALIZE GAME ==========
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Load high score from localStorage
    highScore = parseInt(localStorage.getItem('lumeaHighScore')) || 0;
    highScoreDisplay.textContent = highScore;
    
    // Load leaderboard
    loadLeaderboard();
    
    // Event listeners
    startBtn.addEventListener('click', startGame);
    retryBtn.addEventListener('click', restartGame);
    homeBtn.addEventListener('click', () => window.location.href = 'index.html');
    
    // Jump controls (click, touch, spacebar)
    canvas.addEventListener('click', jump);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            jump();
        }
    });
}

// ========== RESIZE CANVAS ==========
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Reset player position
    player.y = canvas.height - CONFIG.GROUND_HEIGHT - CONFIG.PLAYER_SIZE;
}

// ========== START GAME ==========
function startGame() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.classList.add('hidden');
    
    // Reset game variables
    score = 0;
    frameCount = 0;
    obstacles = [];
    player.y = canvas.height - CONFIG.GROUND_HEIGHT - CONFIG.PLAYER_SIZE;
    player.velocityY = 0;
    player.rotation = 0;
    
    scoreDisplay.textContent = score;
    
    // Start game loop
    gameLoop();
}

// ========== RESTART GAME ==========
function restartGame() {
    startGame();
}

// ========== JUMP FUNCTION ==========
function jump() {
    if (gameState === 'playing' && !player.isJumping) {
        player.velocityY = CONFIG.JUMP_FORCE;
        player.isJumping = true;
    }
}

// ========== GAME LOOP ==========
function gameLoop() {
    if (gameState !== 'playing') return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Update and draw player
    updatePlayer();
    drawPlayer();
    
    // Update and draw obstacles
    updateObstacles();
    drawObstacles();
    
    // Draw ground
    drawGround();
    
    // Check collisions
    checkCollisions();
    
    // Spawn new obstacles
    spawnObstacles();
    
    // Update score
    updateScore();
    
    // Increment frame count
    frameCount++;
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// ========== DRAW BACKGROUND ==========
function drawBackground() {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0d0806');
    gradient.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw decorative circles (subtle pattern)
    ctx.fillStyle = 'rgba(122, 57, 27, 0.08)';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
            (frameCount * 2 + i * 200) % (canvas.width + 100),
            canvas.height - CONFIG.GROUND_HEIGHT - 50 - i * 20,
            30,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// ========== UPDATE PLAYER ==========
function updatePlayer() {
    // Apply gravity
    player.velocityY += CONFIG.GRAVITY;
    player.y += player.velocityY;
    
    // Ground collision
    const groundY = canvas.height - CONFIG.GROUND_HEIGHT - player.height;
    if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = 0;
        player.isJumping = false;
        player.rotation = 0;
    }
    
    // Rotate player when jumping (Geometry Dash style)
    if (player.isJumping) {
        player.rotation += 0.1;
    }
}

// ========== DRAW PLAYER (BRAND LOGO) ==========
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);
    
    // Draw brand logo as player if loaded, otherwise fallback to gradient circle
    if (logoImage.complete && logoImage.naturalHeight !== 0) {
        // Draw circular clipped logo
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(logoImage, -25, -25, 50, 50);
        
        // Add border
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.strokeStyle = '#7A391B';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else {
        // Fallback: Draw gradient circle
        const gradient = ctx.createLinearGradient(-25, -25, 25, 25);
        gradient.addColorStop(0, '#7A391B');
        gradient.addColorStop(1, '#F3C4AC');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Decorative shape (like the logo)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(10, -5, 8, 5);
        ctx.quadraticCurveTo(0, 12, -8, 5);
        ctx.quadraticCurveTo(-10, -5, 0, -10);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#7A391B';
        ctx.beginPath();
        ctx.arc(-5, 0, 2, 0, Math.PI * 2);
        ctx.arc(5, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// ========== SPAWN OBSTACLES ==========
function spawnObstacles() {
    if (frameCount % CONFIG.OBSTACLE_SPAWN_RATE === 0) {
        obstacles.push({
            x: canvas.width,
            y: canvas.height - CONFIG.GROUND_HEIGHT - CONFIG.OBSTACLE_HEIGHT,
            width: CONFIG.OBSTACLE_WIDTH,
            height: CONFIG.OBSTACLE_HEIGHT,
            passed: false
        });
    }
}

// ========== UPDATE OBSTACLES ==========
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= CONFIG.GAME_SPEED;
        
        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

// ========== DRAW OBSTACLES (SPIKES) ==========
function drawObstacles() {
    ctx.fillStyle = CONFIG.OBSTACLE_COLOR;
    
    obstacles.forEach(obstacle => {
        // Draw spike as triangle
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y); // Top point
        ctx.lineTo(obstacle.x, obstacle.y + obstacle.height); // Bottom left
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height); // Bottom right
        ctx.closePath();
        ctx.fill();
        
        // Add shadow for depth
        ctx.strokeStyle = 'rgba(122, 57, 27, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// ========== DRAW GROUND ==========
function drawGround() {
    // Ground platform
    const groundGradient = ctx.createLinearGradient(
        0,
        canvas.height - CONFIG.GROUND_HEIGHT,
        0,
        canvas.height
    );
    groundGradient.addColorStop(0, '#7A391B');
    groundGradient.addColorStop(1, '#F3C4AC');
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - CONFIG.GROUND_HEIGHT, canvas.width, CONFIG.GROUND_HEIGHT);
    
    // Ground line decoration
    ctx.strokeStyle = '#F3C4AC';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - CONFIG.GROUND_HEIGHT);
    ctx.lineTo(canvas.width, canvas.height - CONFIG.GROUND_HEIGHT);
    ctx.stroke();
    
    // Animated ground pattern
    ctx.fillStyle = 'rgba(243, 196, 172, 0.2)';
    for (let i = 0; i < canvas.width; i += 40) {
        const offset = (frameCount * 2) % 40;
        ctx.fillRect(i - offset, canvas.height - CONFIG.GROUND_HEIGHT + 10, 20, 5);
    }
}

// ========== CHECK COLLISIONS ==========
function checkCollisions() {
    obstacles.forEach(obstacle => {
        // Simple AABB collision detection
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            gameOver();
        }
    });
}

// ========== UPDATE SCORE ==========
function updateScore() {
    obstacles.forEach(obstacle => {
        if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
            obstacle.passed = true;
            score++;
            scoreDisplay.textContent = score;
            
            // Update high score
            if (score > highScore) {
                highScore = score;
                highScoreDisplay.textContent = highScore;
                localStorage.setItem('lumeaHighScore', highScore);
            }
        }
    });
}

// ========== GAME OVER ==========
function gameOver() {
    gameState = 'gameOver';
    
    // Show game over screen
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = score;

    bestScoreDisplay.textContent = highScore;
}

// ========== START INITIALIZATION ==========
window.addEventListener('load', initGame);
