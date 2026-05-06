const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ========================
// GAME STATE
// ========================
let gameState = "hub";
let currentMenu = null;

// ========================
// UI STORAGE
// ========================
let menuButtons = [];
let upgradeCards = [];
let backButton = null;
let startButton = null;
let gameOverButton = null;

// ========================
// GAME OBJECTS
// ========================
const orb = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 30
};
let particles = [];
let zapEffects = [];

// ========================
// PLAYER (placeholder only)
// ========================
let player = {
  ether: 0,
  damage: 1
};

// ========================
//Enemies
// ========================
let enemies = [];
let enemyId = 0;

let lastSpawn = 0;
let spawnRate = 2000;

// ========================
//Enemies
// ========================
const UPGRADES = [
  {
    id: "damage",
    name: "Additional Damage",
    baseCost: 10,
    level: 0,
    apply: (player) => {
      player.damage = 1 + UPGRADES[0].level;
    }
  },

  {
    id: "chainCount",
    name: "Lightning Chaining",
    baseCost: 50,
    level: 0,
    apply: () => {}
  },

  {
    id: "chainLength",
    name: "Chain Length",
    baseCost: 100,
    level: 0,
    apply: () => {}
  },

  {
    id: "crit",
    name: "Critical Clicks",
    baseCost: 75,
    level: 0,
    apply: () => {}
  }
];

function spawnEnemy() {
  if (enemies.length > 50) return;

  const edge = Math.floor(Math.random() * 4);
  let x, y;

  if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
  if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height; }
  if (edge === 3) { x = 0; y = Math.random() * canvas.height; }

  const types = ["ghost", "triangle", "square", "pentagon"];
  const type = types[Math.floor(Math.random() * types.length)];

  enemies.push({
    id: enemyId++,
    x,
    y,
    type,
    hp: 3,
    radius: 15,
    flash: 0
  });
}

function updateEnemies() {
  for (let e of enemies) {

    const dx = orb.x - e.x;
    const dy = orb.y - e.y;
    const dist = Math.hypot(dx, dy);

    const speed = 1.2;

    e.x += (dx / dist) * speed;
    e.y += (dy / dist) * speed;

    // collision with orb
    if (dist < orb.radius + e.radius) {
      gameState = "gameover";
      saveGame();
    }

    if (e.flash > 0) e.flash--;
  }
}

function drawEnemies() {
  for (let e of enemies) {

    ctx.fillStyle = e.flash > 0 ? "purple" : "white";

    ctx.beginPath();

    if (e.type === "triangle") {
      ctx.moveTo(e.x, e.y - 15);
      ctx.lineTo(e.x - 15, e.y + 15);
      ctx.lineTo(e.x + 15, e.y + 15);
      ctx.closePath();
    }

    else if (e.type === "square") {
      ctx.rect(e.x - 15, e.y - 15, 30, 30);
    }

    else {
      ctx.arc(e.x, e.y, 15, 0, Math.PI * 2);
    }

    ctx.fill();
  }
}

function getClickedEnemy(x, y) {
  let closest = null;
  let bestDist = Infinity;

  for (let e of enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < e.radius && d < bestDist) {
      closest = e;
      bestDist = d;
    }
  }

  return closest;
}

function zapChainAttack() {

  let closest = null;
  let closestDist = Infinity;

  for (let e of enemies) {
    const d = Math.hypot(e.x - orb.x, e.y - orb.y);
    if (d < closestDist) {
      closest = e;
      closestDist = d;
    }
  }

  if (!closest) return;

  // damage (placeholder system)
  closest.hp -= player.damage;
  closest.flash = 5;

  // visuals
  zapEffects.push({
    x1: orb.x,
    y1: orb.y,
    x2: closest.x,
    y2: closest.y,
    life: 10
  });

  if (closest.hp <= 0) {
    enemies = enemies.filter(e => e.id !== closest.id);
    player.ether += 1;
  }
}

function drawHub() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";

  ctx.fillText("GAME OVER / HUB", canvas.width / 2, 80);
  ctx.fillText("Ether: " + player.ether, canvas.width / 2, 120);

  ctx.textAlign = "left";

  menuButtons = [];

  const buttons = [
    { name: "Click Upgrades", key: "click" },
    { name: "Auto Upgrades", key: "auto" },
    { name: "Damage Types", key: "damage" },
    { name: "Mana", key: "mana" },
    { name: "Enemy Upgrades", key: "enemy" },
    { name: "Achievements", key: "achievements" }
  ];

  const startX = canvas.width / 2 - 300;
  const startY = 200;

  buttons.forEach((b, i) => {
    let x = startX + (i % 3) * 300;
    let y = startY + Math.floor(i / 3) * 120;

    menuButtons.push({ x, y, w: 220, h: 80, key: b.key });

    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, 220, 80);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, 220, 80);

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(b.name, x + 20, y + 45);
  });

  drawStartButton();
}

function drawStartButton() {
  startButton = {
    x: canvas.width - 220,
    y: 20,
    w: 180,
    h: 50
  };

  ctx.fillStyle = "#00cccc";
  ctx.fillRect(startButton.x, startButton.y, startButton.w, startButton.h);

  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("START RUN", startButton.x + 90, startButton.y + 32);
  ctx.textAlign = "left";
}

function drawMenu() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  upgradeCards = [];

  // BACK BUTTON
  backButton = { x: 20, y: 20, w: 120, h: 50 };

  ctx.fillStyle = "#444";
  ctx.fillRect(20, 20, 120, 50);

  ctx.fillStyle = "white";
  ctx.fillText("Back", 60, 50);

  // TITLE
  ctx.font = "28px Arial";
  ctx.fillText("MENU: " + currentMenu, canvas.width / 2 - 100, 80);

  // PLACEHOLDER CARDS
  for (let i = 0; i < 6; i++) {
    let x = 200 + (i % 2) * 300;
    let y = 150 + Math.floor(i / 2) * 120;

    upgradeCards.push({ x, y, w: 250, h: 80, id: i });

    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, 250, 80);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, 250, 80);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("Upgrade " + i, x + 20, y + 45);
  }

  drawStartButton();
}

function drawGame() {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";

  ctx.fillText("PLAYING...", 50, 50);
}

function drawGameOver() {
  ctx.fillStyle = "red";
  ctx.font = "50px Arial";
  ctx.textAlign = "center";

  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);

  // BUTTON
  gameOverButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2,
    w: 200,
    h: 60
  };

  ctx.fillStyle = "#222";
  ctx.fillRect(gameOverButton.x, gameOverButton.y, gameOverButton.w, gameOverButton.h);

  ctx.strokeStyle = "white";
  ctx.strokeRect(gameOverButton.x, gameOverButton.y, gameOverButton.w, gameOverButton.h);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Back to Hub", canvas.width / 2, canvas.height / 2 + 38);

  ctx.textAlign = "left";
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "25px Arial";

  ctx.fillText("Ether: " + player.ether, canvas.width / 2 - 50, canvas.height / 4 - 125)
}

function drawOrb() {
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
  ctx.fillStyle = "cyan";
  ctx.fill();

  ctx.strokeStyle = "white";
  ctx.stroke();
}

function drawZaps() {
  for (let z of zapEffects) {

    ctx.strokeStyle = "rgba(0,255,255,0.9)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(z.x1, z.y1);
    ctx.lineTo(z.x2, z.y2);
    ctx.stroke();

    z.life--;
  }

  zapEffects = zapEffects.filter(z => z.life > 0);
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // ======================
  // START BUTTON
  // ======================
  if (startButton &&
      mx > startButton.x &&
      mx < startButton.x + startButton.w &&
      my > startButton.y &&
      my < startButton.y + startButton.h) {

    startRun();
    return;
  }

  // ======================
  // HUB CLICK
  // ======================
  if (gameState === "hub") {
    for (let b of menuButtons) {
      if (mx > b.x && mx < b.x + b.w &&
          my > b.y && my < b.y + b.h) {
        currentMenu = b.key;
        gameState = "menu";
        return;
      }
    }
  }

  // ======================
  // MENU CLICK
  // ======================
  if (gameState === "menu") {

    if (mx > backButton.x && mx < backButton.x + backButton.w &&
        my > backButton.y && my < backButton.y + backButton.h) {
      gameState = "hub";
      return;
    }

    for (let c of upgradeCards) {
      if (mx > c.x && mx < c.x + c.w &&
          my > c.y && my < c.y + c.h) {
        console.log("clicked upgrade:", c.id);
      }
    }
    return;
  }

  // ======================
  // GAME CLICK (ORB ATTACK)
  // ======================
  if (gameState === "playing") {

  const dx = mx - orb.x;
  const dy = my - orb.y;

  if (Math.hypot(dx, dy) > orb.radius) return;

  if (enemies.length === 0) return;

  zapChainAttack();
}

if (gameState === "gameover" && gameOverButton) {
  if (
    mx > gameOverButton.x &&
    mx < gameOverButton.x + gameOverButton.w &&
    my > gameOverButton.y &&
    my < gameOverButton.y + gameOverButton.h
  ) {
    gameState = "hub";

    // reset run state safely
    enemies = [];
    enemyId = 0;

    return;
  }
}
});

function startRun() {
  enemies = [];
  enemyId = 0;

  lastSpawn = Date.now(); // important
  gameState = "playing";  // safer than setting in click handler
}

function saveGame() {
  localStorage.setItem("save", JSON.stringify(player));
}

function loadGame() {
  const data = localStorage.getItem("save");
  if (!data) return;
  player = JSON.parse(data);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "hub") drawHub();
  if (gameState === "menu") drawMenu();

if (gameState === "playing") {

  const now = Date.now();

  // ✅ SPAWN LOGIC (ADD THIS)
  if (now - lastSpawn > spawnRate) {
    spawnEnemy();
    lastSpawn = now;
  }

  updateEnemies();

  drawOrb();
  drawEnemies();
  drawZaps();
  drawUI();
}

  if (gameState === "gameover") {
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

loadGame();
gameLoop();
