const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const center = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 30
};

let ghosts = [];
let ether = 0;
let gameOver = false;

let orbPushTime = 0;
let zapEffect = null;


// progression variables
let spawnRate = 2000; // ms
let ghostSpeed = 1;
let lastSpawn = 0;
let startTime = Date.now();

function spawnGhost() {
  const edge = Math.floor(Math.random() * 4);

  let x, y;

  if (edge === 0) { // top
    x = Math.random() * canvas.width;
    y = 0;
  } else if (edge === 1) { // right
    x = canvas.width;
    y = Math.random() * canvas.height;
  } else if (edge === 2) { // bottom
    x = Math.random() * canvas.width;
    y = canvas.height;
  } else { // left
    x = 0;
    y = Math.random() * canvas.height;
  }

  ghosts.push({
    x,
    y,
    hp: 3,
  });
}

function updateGhosts() {
  ghosts.forEach((ghost, index) => {
    const dx = center.x - ghost.x;
    const dy = center.y - ghost.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const vx = (dx / dist) * ghostSpeed;
    const vy = (dy / dist) * ghostSpeed;

    ghost.x += vx;
    ghost.y += vy;

    // collision with orb → game over
    if (dist < center.radius) {
      gameOver = true;
    }
  });
}

canvas.addEventListener("click", (e) => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const dx = mx - center.x;
  const dy = my - center.y;

  // Check click inside orb
  if (Math.sqrt(dx * dx + dy * dy) >= center.radius) return;

  if (ghosts.length === 0) return;

  let closestIndex = -1;
  let closestDist = Infinity;

  for (let i = 0; i < ghosts.length; i++) {
    const ghost = ghosts[i];

    const dx = ghost.x - center.x;
    const dy = ghost.y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < closestDist) {
      closestDist = dist;
      closestIndex = i;
    }
  }
    orbPushTime = 10; // frames of "push" animation

    zapEffect = {
    x1: center.x,
    y1: center.y,
    x2: ghosts[closestIndex].x,
    y2: ghosts[closestIndex].y,
    life: 10
};

  // Safety check
  if (closestIndex === -1) return;

  ghosts[closestIndex].hp--;

  if (ghosts[closestIndex].hp <= 0) {
    ghosts.splice(closestIndex, 1);
    ether++;
  }
});

function updateDifficulty() {
  const elapsed = (Date.now() - startTime) / 1000;

  // increase spawn rate
  spawnRate = Math.max(500, 2000 - elapsed * 50);

  // increase speed
  ghostSpeed = 1 + elapsed * 0.05;
}

function gameLoop() {
  if (gameOver) {
    drawGameOver();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateDifficulty();

  const now = Date.now();
  if (now - lastSpawn > spawnRate) {
    spawnGhost();
    lastSpawn = now;
  }

  updateGhosts();

  drawOrb();
  drawGhosts();
  drawZap();
  drawUI();

  requestAnimationFrame(gameLoop);
}

function drawOrb() {
  let radius = center.radius;

  if (orbPushTime > 0) {
    radius *= 0.85; // shrink effect
    orbPushTime--;
  }

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "cyan";
  ctx.fill();
}

function drawGhosts() {
  ghosts.forEach(ghost => {
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  });
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Ether: " + ether, 20, 30);
}

function drawGameOver() {
  ctx.fillStyle = "red";
  ctx.font = "50px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 120, canvas.height / 2);
}

function drawZap() {
  if (!zapEffect) return;

  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(zapEffect.x1, zapEffect.y1);
  ctx.lineTo(zapEffect.x2, zapEffect.y2);
  ctx.stroke();

  zapEffect.life--;

  if (zapEffect.life <= 0) {
    zapEffect = null;
  }
}

gameLoop();