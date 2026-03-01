const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Disable antialiasing for pixel-perfect rendering
ctx.imageSmoothingEnabled = false;

// Game state
let gameRunning = false;
let gameStarted = false;
let isPaused = false;

let isMuted = false;
let roundStartDelay = false;
// Game objects - adjusted for TV console feel
const sidelineHeight = 4;
const scoreYPosition = 60;

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 10,
    height: 10,
    speedX: 3,
    speedY: 2,
    maxSpeed: 6
};

const paddle1 = {
    x: 30,
    y: canvas.height / 2 - 40,
    width: 8,
    height: 80,
    speed: 4
};

const paddle2 = {
    x: canvas.width - 38,
    y: canvas.height / 2 - 40,
    width: 8,
    height: 80,
    speed: 4
};

// Score
let player1Score = 0;
let player2Score = 0;
const winningScore = 10;

// Controls
const keys = {};

// Sound simulation (visual feedback)
let flashScreen = false;

// Web Audio API for sound effects
let audioCtx = null;

// Event listeners
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Toggle pause
    if (key === 'p' && gameStarted) {
        isPaused = !isPaused;
    }

    // Toggle sound
    if (key === 's') {
        isMuted = !isMuted;
    }

    // Toggle Frame
    if (key === 'f') {
        document.body.classList.toggle('no-frame');
    }

    // Restart game
    if (key === 'r') {
        resetGame();
    }

    if (key === ' ') {
        if (!gameStarted) {
            startGame();
        }
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function startGame() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    gameRunning = true;
    isPaused = false;
    gameStarted = true;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('instructionsPopup').style.display = 'none';
    flashScreen = true;
    setTimeout(() => flashScreen = false, 100);
}

function resetGame() {
    player1Score = 0;
    player2Score = 0;
    resetBall();
    gameRunning = false;
    gameStarted = false;
    roundStartDelay = false;
    isPaused = false;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('instructionsPopup').style.display = 'block';
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = (Math.random() > 0.5 ? 1 : -1) * 3;
    ball.speedY = (Math.random() - 0.5) * 4;
}

function playTone(freq, duration, type = 'square') {
    if (!audioCtx || isMuted) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function updatePaddles() {
    if (!gameRunning || isPaused) return;

    // Player 1 controls (A/Z - classic TV console style)
    if (keys['a']) {
        paddle1.y = Math.max(0, paddle1.y - paddle1.speed);
    }
    if (keys['z']) {
        paddle1.y = Math.min(canvas.height - paddle1.height, paddle1.y + paddle1.speed);
    }

    // Player 2 controls (K/M)
    if (keys['k']) {
        paddle2.y = Math.max(0, paddle2.y - paddle2.speed);
    }
    if (keys['m']) {
        paddle2.y = Math.min(canvas.height - paddle2.height, paddle2.y + paddle2.speed);
    }
}

function updateBall() {
    if (!gameRunning || isPaused) return;

    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Ball collision with top and bottom walls
    if (ball.y <= sidelineHeight || ball.y + ball.height >= canvas.height - sidelineHeight) {
        ball.speedY = -ball.speedY;
        // Clamp ball position to prevent it from getting stuck in the line
        if (ball.y <= sidelineHeight) {
            ball.y = sidelineHeight;
        } else {
            ball.y = canvas.height - sidelineHeight - ball.height;
        }
        flashScreen = true;
        playTone(200, 0.05, 'triangle'); // Wall hit sound
        setTimeout(() => flashScreen = false, 50);
    }

    // Ball collision with paddles
    if (ball.speedX < 0 &&
        ball.x <= paddle1.x + paddle1.width &&
        ball.x + ball.width >= paddle1.x &&
        ball.y + ball.height >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height) {

        ball.speedX = -ball.speedX;
        ball.x = paddle1.x + paddle1.width;

        // Simple angle change based on paddle hit position
        const hitPos = ((ball.y + ball.height/2) - (paddle1.y + paddle1.height/2)) / (paddle1.height/2);
        ball.speedY = hitPos * 3;

        flashScreen = true;
        playTone(440, 0.05, 'square'); // Paddle hit sound
        setTimeout(() => flashScreen = false, 50);
    }

    if (ball.speedX > 0 &&
        ball.x + ball.width >= paddle2.x &&
        ball.x <= paddle2.x + paddle2.width &&
        ball.y + ball.height >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height) {

        ball.speedX = -ball.speedX;
        ball.x = paddle2.x - ball.width;

        const hitPos = ((ball.y + ball.height/2) - (paddle2.y + paddle2.height/2)) / (paddle2.height/2);
        ball.speedY = hitPos * 3;

        flashScreen = true;
        playTone(440, 0.05, 'square'); // Paddle hit sound
        setTimeout(() => flashScreen = false, 50);
    }

    // Scoring
    if (ball.x < 0) {
        player2Score++;
        if (player2Score >= winningScore) {
            endGame('PLAYER 2 WINS!');
            playTone(150, 0.5, 'sawtooth'); // Game over sound
        } else {
            roundStartDelay = true;
            resetBall();
            gameRunning = false;
            setTimeout(() => { gameRunning = true; roundStartDelay = false; }, 1500);
        }
    }

    if (ball.x > canvas.width) {
        player1Score++;
        if (player1Score >= winningScore) {
            endGame('PLAYER 1 WINS!');
            playTone(150, 0.5, 'sawtooth'); // Game over sound
        } else {
            roundStartDelay = true;
            resetBall();
            gameRunning = false;
            setTimeout(() => { gameRunning = true; roundStartDelay = false; }, 1500);
        }
    }
}

function endGame(winner) {
    gameRunning = false;
    gameStarted = false;
    isPaused = false;
    roundStartDelay = false;
    document.getElementById('winnerText').textContent = winner;
    document.getElementById('instructionsPopup').style.display = 'none';
    document.getElementById('gameOver').style.display = 'block';
}

function draw() {
    // Clear canvas with green tint and flash effect
    ctx.fillStyle = flashScreen ? '#333333' : '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line (dotted, old TV style)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < canvas.height; i += 20) {
        ctx.fillRect(canvas.width / 2 - 2, i, 4, 10);
    }

    // Draw top and bottom sidelines
    ctx.fillRect(0, 0, canvas.width, sidelineHeight); // Top line
    ctx.fillRect(0, canvas.height - sidelineHeight, canvas.width, sidelineHeight); // Bottom line

    // Draw paddles (simple rectangles)
    ctx.fillStyle = '#ffffff';

    // Draw score
    ctx.font = '72px VT323';
    ctx.textAlign = 'center';
    ctx.fillText(player1Score.toString().padStart(2, '0'), canvas.width * 0.25, scoreYPosition);
    ctx.fillText(player2Score.toString().padStart(2, '0'), canvas.width * 0.75, scoreYPosition);

    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);

    // Draw ball (square, old school style)
    ctx.fillRect(ball.x, ball.y, ball.width, ball.height);

    // Draw get ready message
    if (roundStartDelay) {
        ctx.font = '40px VT323';
        ctx.textAlign = 'center';
        ctx.fillText('GET READY', canvas.width / 2, canvas.height / 2 + 40);
    }

    // Draw paused message
    if (isPaused) {
        ctx.font = '48px VT323';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }

    // Draw mute status
    if (isMuted) {
        ctx.font = '24px VT323';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('SOUND OFF', canvas.width / 2 - 20, canvas.height - 15);
    }
}

function gameLoop() {
    updatePaddles();
    updateBall();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

// Touch Controls Logic
function setupTouchControls() {
    const btnMap = {
        'p1-up': 'a',
        'p1-down': 'z',
        'p2-up': 'k',
        'p2-down': 'm'
    };

    Object.keys(btnMap).forEach(id => {
        const btn = document.getElementById(id);
        const key = btnMap[id];
        
        const startHandler = (e) => {
            if (e.cancelable) e.preventDefault(); // Prevent scrolling
            keys[key] = true;
        };
        
        const endHandler = (e) => {
            if (e.cancelable) e.preventDefault();
            keys[key] = false;
        };

        btn.addEventListener('touchstart', startHandler, { passive: false });
        btn.addEventListener('touchend', endHandler, { passive: false });
        // Mouse events for testing on desktop
        btn.addEventListener('mousedown', startHandler);
        btn.addEventListener('mouseup', endHandler);
        btn.addEventListener('mouseleave', endHandler);
    });
}
setupTouchControls();
