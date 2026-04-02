/* --- SYSTEM SETUP --- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const pCtx = previewCanvas.getContext('2d');

// Auto-Resize
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

/* --- GAME CONFIG --- */
const GRAVITY = 0.7;
const JUMP_FORCE = -11;
const SPEED = 6;
let floorY = 0; // Calculated per frame based on height

/* --- STATE MANAGEMENT --- */
let gameState = 'MENU'; // MENU, PLAYING, DEAD
let currentLevel = [];
let camX = 0;

// Icon Settings
let userIcon = {
    col1: '#FFFF00',
    col2: '#0000FF',
    form: 0 // 0=Cube, 1=Creeper, 2=Gradient
};

/* --- ASSETS (Colors) --- */
const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#FFFFFF', '#333333'];

// Initialize Color Pickers
function initColorPickers() {
    const c1 = document.getElementById('col1-swatches');
    const c2 = document.getElementById('col2-swatches');
    
    COLORS.forEach(c => {
        let s1 = document.createElement('div');
        s1.className = 'swatch'; s1.style.backgroundColor = c;
        s1.onclick = () => { userIcon.col1 = c; drawPreview(); };
        c1.appendChild(s1);

        let s2 = document.createElement('div');
        s2.className = 'swatch'; s2.style.backgroundColor = c;
        s2.onclick = () => { userIcon.col2 = c; drawPreview(); };
        c2.appendChild(s2);
    });
    drawPreview();
}

// Procedural Icon Drawer (Used by Game and Kit)
function renderIcon(context, x, y, size, angle, c1, c2) {
    context.save();
    context.translate(x, y);
    context.rotate(angle * Math.PI / 180);
    context.translate(-size/2, -size/2);

    // Base Base
    context.fillStyle = c1;
    context.fillRect(0, 0, size, size);
    context.lineWidth = size/10;
    context.strokeStyle = '#000';
    context.strokeRect(0, 0, size, size);

    // Inner Detail (Standard Face)
    context.fillStyle = c2;
    context.fillRect(size*0.2, size*0.2, size*0.3, size*0.3); // Left Eye
    context.fillRect(size*0.6, size*0.2, size*0.2, size*0.6); // Right Stripe
    
    context.restore();
}

function drawPreview() {
    pCtx.clearRect(0,0,100,100);
    renderIcon(pCtx, 50, 50, 60, 0, userIcon.col1, userIcon.col2);
}

/* --- GAMEPLAY VARIABLES --- */
let player = { x: 0, y: 0, dy: 0, angle: 0, grounded: false };

/* --- LEVEL DATA --- */
// 0=Air, 1=Block, 2=Spike
const LEVELS = [
    // Level 1 (Easy)
    [0,0,0,0,0,1,0,0,2,0,0,1,1,0,0,2,2,0,0,0,0,1,0,0,1,0,0,2,0,0,0,0,1,1,1,0,2,0,0,1],
    // Level 2 (Med)
    [0,0,0,1,0,2,0,1,0,2,0,1,2,1,0,0,0,0,2,2,2,0,1,0,1,0,1,2,0,0,1,2,1,2,0,0,0,0],
    // Level 3 (Hard)
    [0,0,0,0,2,0,2,0,1,2,1,2,0,0,0,2,2,0,0,1,1,2,0,2,0,1,0,2,2,2,1,0,0,0,0,1]
];

/* --- ENGINE LOOPS --- */

function showScreen(id) {
    // UI Logic
    document.querySelectorAll('.menu-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if(id === 'menu-icons') initColorPickers();
    
    gameState = 'MENU';
    document.getElementById('hud').classList.add('hidden');
}

function loadLevel(index) {
    currentLevel = LEVELS[index];
    // Pad level with floor
    while(currentLevel.length < 100) currentLevel.push(0);
    
    startGame();
}

function startGame() {
    document.querySelectorAll('.menu-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('hud').classList.remove('hidden');
    
    // Reset Physics
    floorY = canvas.height - 150;
    player.x = 200;
    player.y = floorY - 50;
    player.dy = 0;
    player.angle = 0;
    player.grounded = false;
    camX = 0;
    
    gameState = 'PLAYING';
    loop();
}

function quitGame() {
    gameState = 'MENU';
    showScreen('menu-main');
}

/* --- INPUT --- */
window.addEventListener('mousedown', jump);
window.addEventListener('keydown', (e) => { if(e.code === 'Space' || e.code === 'ArrowUp') jump(); });

function jump() {
    if (gameState === 'PLAYING' && player.grounded) {
        player.dy = JUMP_FORCE;
        player.grounded = false;
    }
}

/* --- MAIN LOOP --- */
function loop() {
    if (gameState !== 'PLAYING') return;

    // 1. Logic
    player.dy += GRAVITY;
    player.y += player.dy;
    
    // Floor
    if (player.y > floorY - 50) {
        player.y = floorY - 50;
        player.dy = 0;
        player.grounded = true;
        player.angle = Math.round(player.angle/90)*90;
    } else {
        player.grounded = false;
        player.angle += 6;
    }

    player.x += SPEED;
    camX = player.x - 300;

    // Progress Bar
    let pct = Math.min(100, (player.x / (currentLevel.length * 60)) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';

    // Collision
    let playerRect = {x: player.x - 20, y: player.y - 20, w: 40, h: 40};
    let startCol = Math.floor(camX / 60);
    let endCol = startCol + (canvas.width / 60) + 1;

    for(let i=startCol; i<endCol; i++) {
        let tile = currentLevel[i];
        if(!tile) continue;

        let tx = i * 60;
        let ty = floorY - 60;

        // Block
        if(tile === 1) {
            if (player.x + 20 > tx && player.x - 20 < tx + 60 && player.y + 20 > ty && player.y - 20 < ty + 60) {
               // Basic die on impact
               die();
            }
        }
        // Spike
        if(tile === 2) {
            if (player.x + 10 > tx + 20 && player.x - 10 < tx + 40 && player.y + 20 > ty + 30) {
                die();
            }
        }
    }

    // 2. Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#1a2a6c');
    bg.addColorStop(1, '#b21f1f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor
    ctx.fillStyle = '#111';
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width, floorY); ctx.stroke();

    // Level
    for(let i=startCol; i<endCol; i++) {
        let tile = currentLevel[i];
        if(!tile) continue;
        let tx = (i * 60) - camX;
        let ty = floorY - 60;

        if(tile === 1) { // Block
            ctx.fillStyle = '#000'; ctx.fillRect(tx, ty, 60, 60);
            ctx.strokeStyle = '#0ff'; ctx.strokeRect(tx, ty, 60, 60);
        } 
        else if(tile === 2) { // Spike
            ctx.beginPath();
            ctx.moveTo(tx, ty + 60);
            ctx.lineTo(tx + 30, ty);
            ctx.lineTo(tx + 60, ty + 60);
            ctx.fillStyle = '#111'; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.stroke();
        }
    }

    // Player
    renderIcon(ctx, player.x - camX, player.y + 25, 50, player.angle, userIcon.col1, userIcon.col2);

    requestAnimationFrame(loop);
}

function die() {
    gameState = 'DEAD';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    setTimeout(() => {
        player.x = 200;
        player.y = floorY - 50;
        camX = 0;
        player.dy = 0;
        gameState = 'PLAYING';
        loop();
    }, 500);
}

// Start on Main Menu
initColorPickers();
