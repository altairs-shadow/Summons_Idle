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
//let gameOver = false;

let orbPushTime = 0;
let zapEffects = [];

let gameState = "playing"; 
// "playing" | "gameover" | "upgrades"


// progression variables
let spawnRate = 2000; // ms
let ghostSpeed = 1;
let lastSpawn = 0;
let startTime = Date.now();

let upgradeCards = [];

let upgrades = {
  damage: {
    level: 1,
    cost: 10,
    name: "Zap Power",
    desc: "+1 damage",
  },
  chain: {
    level: 0,
    cost: 25,
    name: "Chain Lightning",
    desc: "Hits +1 extra target",
  }
};

let damage = upgrades.damage.level;
let screenShake = 0;
let screenFlash = 0;



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
      gameState = "gameover";
    }
  });
}

canvas.addEventListener("click", (e) => {

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // =========================
  // UPGRADES SCREEN
  // =========================
  if (gameState === "upgrades") {

    upgradeCards.forEach(card => {
      if (
        mx > card.x &&
        mx < card.x + card.w &&
        my > card.y &&
        my < card.y + card.h
      ) {
        let upg = upgrades[card.key];

        if (ether >= upg.cost) {
          ether -= upg.cost;
          upg.level++;
          upg.cost = Math.floor(upg.cost * 1.5);
        }
      }
    });

    // start run button
    if (
      mx > startButton.x &&
      mx < startButton.x + startButton.w &&
      my > startButton.y &&
      my < startButton.y + startButton.h
    ) {
      startNewRun();
    }

    return;
  }

  // =========================
  // GAME OVER SCREEN
  // =========================
  if (gameState === "gameover") {
    gameState = "upgrades";
    return;
  }

  // =========================
  // PLAYING STATE
  // =========================
  if (gameState !== "playing") return;

  const dx = mx - center.x;
  const dy = my - center.y;

  // must click orb
  if (Math.sqrt(dx * dx + dy * dy) >= center.radius) return;

  if (ghosts.length === 0) return;

  orbPushTime = 10;

  zapGhosts();
});

function updateDifficulty() {
  const elapsed = (Date.now() - startTime) / 1000;

  // increase spawn rate
  spawnRate = Math.max(50, 2000 - elapsed * 50);

  // increase speed
  ghostSpeed = 1 + elapsed * 0.05;
}

function gameLoop() {


  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "playing") {
    updateDifficulty();

    const now = Date.now();
    if (now - lastSpawn > spawnRate) {
      spawnGhost();
      lastSpawn = now;
    }

    updateGhosts();

    drawOrb();
    drawGhosts();
    drawUI();
  }

  else if (gameState === "gameover") {
    drawGameOverScreen();
  }

  else if (gameState === "upgrades") {
    drawUpgradeScreen();
  }
  drawZap();
  
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

function drawGameOverScreen() {
  ctx.fillStyle = "red";
  ctx.font = "50px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 120, canvas.height / 2);
}

function drawZap() {
  for (let i = zapEffects.length - 1; i >= 0; i--) {
    let z = zapEffects[i];

    ctx.strokeStyle = "rgba(255,255,150,0.9)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(z.points[0].x, z.points[0].y);

    for (let p = 1; p < z.points.length; p++) {
      ctx.lineTo(z.points[p].x, z.points[p].y);
    }

    ctx.stroke();

    z.life--;

    if (z.life <= 0) {
      zapEffects.splice(i, 1);
    }
  }
}

function createLightning(x1, y1, x2, y2) {
  const segments = 8;
  const amplitude = 78;

  let points = [{ x: x1, y: y1 }];

  for (let i = 1; i < segments; i++) {
    let t = i / segments;

    let x = x1 + (x2 - x1) * t;
    let y = y1 + (y2 - y1) * t;

    // perpendicular offset
    let dx = x2 - x1;
    let dy = y2 - y1;
    let len = Math.hypot(dx, dy);

    let nx = -dy / len;
    let ny = dx / len;

    let offset = (Math.random() - 0.5) * amplitude;

    x += nx * offset;
    y += ny * offset;

    points.push({ x, y });
  }

  points.push({ x: x2, y: y2 });

  return points;
}

function startNewRun() {
  ghosts = [];
  gameState = "playing";
  startTime = Date.now();
  lastSpawn = 0;
}

function zapGhosts() {
  let targets = [...ghosts];

  targets.sort((a, b) => {
    const da = Math.hypot(a.x - center.x, a.y - center.y);
    const db = Math.hypot(b.x - center.x, b.y - center.y);
    return da - db;
  });

  const hits = 1 + upgrades.chain.level;

  let lastX = center.x;
  let lastY = center.y;

  for (let i = 0; i < hits && i < targets.length; i++) {
    let g = targets[i];

    // ⚡ create arc from previous target
    zapEffects.push({
      points: createLightning(lastX, lastY, g.x, g.y),
      life: 12
    });

    // update chain origin
    lastX = g.x;
    lastY = g.y;

    // damage
    g.hp -= upgrades.damage.level;

    if (g.hp <= 0) {
      const index = ghosts.indexOf(g);
      if (index !== -1) {
        ghosts.splice(index, 1);
        ether++;
      }
    }
  }

  // 💥 trigger feedback
  screenFlash = 5;
  screenShake = 6;
}

function drawUpgradeScreen() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.fillText("Game Over", canvas.width/2 - 120, 80);

  ctx.font = "20px Arial";
  ctx.fillText("Ether: " + ether, canvas.width/2 - 60, 120);

  upgradeCards = [];

  let startX = canvas.width / 2 - 150;
  let y = 180;

  Object.keys(upgrades).forEach((key, i) => {
    let upg = upgrades[key];

    let card = {
      x: startX,
      y: y + i * 120,
      w: 300,
      h: 100,
      key: key
    };

    upgradeCards.push(card);

    // Draw card
    ctx.fillStyle = "#222";
    ctx.fillRect(card.x, card.y, card.w, card.h);

    ctx.strokeStyle = "white";
    ctx.strokeRect(card.x, card.y, card.w, card.h);

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(upg.name, card.x + 10, card.y + 25);
    ctx.fillText(upg.desc, card.x + 10, card.y + 50);
    ctx.fillText("Cost: " + upg.cost, card.x + 10, card.y + 75);
  });

  // Start button
  startButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height - 120,
    w: 200,
    h: 60
  };

  ctx.fillStyle = "cyan";
  ctx.fillRect(startButton.x, startButton.y, startButton.w, startButton.h);

  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Start Run", startButton.x + 40, startButton.y + 35);
}

gameLoop();