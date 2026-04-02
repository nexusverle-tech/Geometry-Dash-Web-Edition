const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('main-menu');
const scoreEl = document.getElementById('score-display');

// --- CONFIGURATION ---
const GRAVITY = 0.6;
const JUMP_FORCE = -9.5;
const SPEED = 5;
const ROTATION_SPEED = 5;
const GROUND_Y = 330;

// --- STATE ---
let gameActive = false;
let frame = 0;
let score = 0;
let attempts = 1;

let player = {
    x: 200, y: 200, w: 30, h: 30,
    dy: 0, angle: 0, grounded: false, dead: false
};

// Camera Offset (Follows player)
let cameraX = 0;

// Level Data: 0=Air, 1=Block, 2=Spike, 3=Orb(Jump)
// This array is the "map". You can extend it to make the level longer.
const levelMap = [
    0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,2,0,0,
    0,0,1,1,0,0,2,2,0,0,1,0,0,0,0,2,2,2,0,0,
    0,0,0,0,1,1,1,0,0,0,2,0,1,0,2,0,1,0,0,0,
    0,0,0,1,1,1,1,1,0,0,2,2,2,2,0,0,0,0,0,0,
    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0 // End Wall
];
const TILE_SIZE = 40;

function startGame() {
    menu.style.display = 'none';
    canvas.style.display = 'block';
    resetPlayer();
    gameActive = true;
    requestAnimationFrame(gameLoop);
}

function resetPlayer() {
    player.x = 200;
    player.y = GROUND_Y - 40;
    player.dy = 0;
    player.angle = 0;
    player.dead = false;
    player.grounded = false;
    cameraX = 0;
    score = 0;
    frame = 0;
}

function die() {
    player.dead = true;
    attempts++;
    
    // Explosion Effect (Simple Flash)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setTimeout(() => {
        resetPlayer();
    }, 500);
}

// --- CONTROLS ---
window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && gameActive) {
        if (player.grounded) {
            player.dy = JUMP_FORCE;
            player.grounded = false;
        }
    }
});
canvas.addEventListener('mousedown', () => {
    if (gameActive && player.grounded) {
        player.dy = JUMP_FORCE;
        player.grounded = false;
    }
});

// --- PHYSICS & COLLISION ---
function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y);
}

function update() {
    if (!gameActive || player.dead) return;

    // 1. Apply Gravity
    player.dy += GRAVITY;
    player.y += player.dy;

    // 2. Floor Logic
    if (player.y >= GROUND_Y - player.h) {
        player.y = GROUND_Y - player.h;
        player.dy = 0;
        player.grounded = true;
        // Snap rotation
        player.angle = Math.round(player.angle / 90) * 90; 
    } else {
        player.grounded = false;
        player.angle += ROTATION_SPEED;
    }

    // 3. Move Camera & Player
    player.x += SPEED;
    cameraX = player.x - 200; // Keep player at x=200 relative to screen
    score = Math.floor(player.x / 100);
    scoreEl.innerText = `Score: ${score} | Attempt: ${attempts}`;

    // 4. Object Collision
    // Only check tiles near the player to save performance
    let startCol = Math.floor(cameraX / TILE_SIZE);
    let endCol = startCol + (canvas.width / TILE_SIZE) + 2;

    for (let i = startCol; i < endCol; i++) {
        let tile = levelMap[i];
        if (!tile) continue;

        let tileX = i * TILE_SIZE;
        let tileY = GROUND_Y - TILE_SIZE; 
        
        // Hitbox Logic
        let hitBox = { x: tileX + 10, y: tileY + 10, w: 20, h: 20 }; // Generous hitboxes

        if (tile === 1) { // Block
             // Simple block collision (Death on impact for this demo, or ride top)
            if (checkCollision(player, {x: tileX, y: tileY, w: TILE_SIZE, h: TILE_SIZE})) {
                // If falling onto it, land. If hitting side, die.
                if (player.y + player.h < tileY + 15 && player.dy > 0) {
                    player.y = tileY - player.h;
                    player.dy = 0;
                    player.grounded = true;
                    player.angle = Math.round(player.angle / 90) * 90;
                } else {
                    die();
                }
            }
        }
        
        if (tile === 2) { // Spike
            // Triangle Hitbox is smaller than visual
            if (checkCollision(player, {x: tileX + 10, y: tileY + 15, w: 20, h: 25})) {
                die();
            }
        }
    }
}

// --- RENDERING ---
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x - cameraX + player.w/2, player.y + player.h/2);
    ctx.rotate(player.angle * Math.PI / 180);
    
    // Embedded Texture: The Classic Icon
    ctx.fillStyle = '#FFEB3B'; // Yellow Body
    ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(-player.w/2, -player.h/2, player.w, player.h);

    // The Face
    ctx.fillStyle = '#000'; // Eye
    ctx.fillRect(2, -5, 8, 8);
    ctx.restore();
}

function drawEnvironment() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient (Procedural)
    let bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#1E88E5');
    bgGradient.addColorStop(1, '#1565C0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor Line
    ctx.fillStyle = '#0D47A1';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Draw Level
    let startCol = Math.floor(cameraX / TILE_SIZE);
    let endCol = startCol + (canvas.width / TILE_SIZE) + 1;

    for (let i = startCol; i < endCol; i++) {
        let tile = levelMap[i];
        if (!tile) continue;

        let x = (i * TILE_SIZE) - cameraX;
        let y = GROUND_Y - TILE_SIZE;

        if (tile === 1) { // Block Texture
            ctx.fillStyle = '#000';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#2196F3'; // Inner Color
            ctx.fillRect(x+2, y+2, TILE_SIZE-4, TILE_SIZE-4);
        }
        if (tile === 2) { // Spike Texture
            ctx.beginPath();
            ctx.moveTo(x, y + TILE_SIZE);
            ctx.lineTo(x + TILE_SIZE/2, y);
            ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
            ctx.fillStyle = '#212121';
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

function gameLoop() {
    update();
    drawEnvironment();
    drawPlayer();
    if (gameActive) requestAnimationFrame(gameLoop);
}
