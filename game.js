const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
  //
  // Player information
  //
  ether: 0,
  damage: 1,
  chainCount: 1,
  chainRange: 200,
  critChance: 0,
  enemySpeedMultiplier: 0,

  upgrades: {},
  //
  // Auto clicker
  //
  autoEnabled: false,
  autoDamage: 1,
  autoAttackSpeed: 1000,
  lastAutoAttack: 0,
  autoChainCount: 1,
  autoChainRange: 200,
  autoCritChance: 0,

};
// ========================
// ROOT GAME STATE 
// ========================
let game = {
  player,
  meta: {
    mana: 0,
    manaBreakpoints: 0,
    difficultyMultiplier: 1
  }
};


// ========================
// GAME STATE
// ========================
let gameState = "hub";
let currentMenu = null;
let runStartTime = Date.now();
let runStartTimeStats = 0;
let runElapsed = 0;

// ========================
// UI STORAGE
// ========================
let menuButtons = [];
let upgradeCards = [];
let backButton = null;
let startButton = null;
let gameOverButton = null;
let devResetButton = null;

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
// PLAYER 
// ========================


// ========================
// DEV SYSTEMS (MANA DUMP)
// ========================
const DEV_FEATURES = {
  manaDump: true
};

let isDumpingEther = false;


// tuning values
const MANA_DUMP_RATE = 1; // ether per frame tick (we will refine later)
const MANA_TARGET = 100;

// ========================
//Enemies
// ========================
let enemies = [];
let enemyId = 0;

let lastSpawn = 0;

// ========================
// Upgrades
// ========================
const UPGRADES = {
  damage: {
    name: "Additional Damage",
    category: "click",
    baseCost: 10,
    apply: (player, level) => {
      player.damage = 1 + level;
    }
  },

  chainCount: {
    name: "Lightning Chains",
    category: "click",
    baseCost: 50,
    apply: (player, level) => {
      player.chainCount = 1 + level;
    }
  },

  chainLength: {
    name: "Chain Range",
    category: "click",
    baseCost: 75,
    apply: (player, level) => {
      player.chainRange = 200 + level * 60;
    }
  },

  crit: {
    name: "Critical Clicks",
    category: "click",
    baseCost: 100,
    apply: (player, level) => {
      player.critChance = level * 0.05;
    }
  },

  enemySpeed: {
    name: "Enemy Speed Increase",
    category: "click",
    baseCost: 50,
    apply: (player, level) => {
      player.enemySpeedMultiplier = level * .1;
    }
  },

  //
  // Auto upgrades
  //
  autoClicker: {
  name: "Auto Clicker",
  category: "auto",
  baseCost: 20,
  apply: (player, level) => {

    // level 0 = disabled
    if (level <= 0) {
      player.autoEnabled = false;
      return;
    }

    player.autoEnabled = true;

    // attack speed improves per level
    // starts at 1/sec
    // lower = faster
    player.autoAttackSpeed = Math.max(
      1000,
      1000 - (level - 1) * 50
    );
  }
},
autoDamage: {
  name: "Auto Damage",
  category: "auto",
  baseCost: 25,
  apply: (player, level) => {
    player.autoDamage = 1 + level;
  }
},

autoChainCount: {
  name: "Auto Chains",
  category: "auto",
  baseCost: 50,
  apply: (player, level) => {
    player.autoChainCount = 1 + level;
  }
},

autoChainLength: {
  name: "Auto Chain Range",
  category: "auto",
  baseCost: 75,
  apply: (player, level) => {
    player.autoChainRange = 200 + level * 60;
  }
},

autoCrit: {
  name: "Auto Crit",
  category: "auto",
  baseCost: 100,
  apply: (player, level) => {
    player.autoCritChance = level * 0.05;
  }
},

};

let runStats = {
  circles: 0,
  squares: 0,
  pentagons: 0,
  ether: 0,
  time: 0
};

let globalStats = {
  circles: 0,
  squares: 0,
  pentagons: 0,
  totalEther: 0,
  runs: 0
  
};

// ========================
// ACHIEVEMENT TRACKING
// ========================
let achievements = {
  etherDumpTotal: 0,
  manaBreakpoints: 0,
  longestRun: 0,
  maxDifficulty: 1
};


//
// Functions begin
//
function spawnEnemy() {
  if (enemies.length >= 50) return;

  const allowed = getAllowedEnemyTypes();

  const type = allowed[Math.floor(Math.random() * allowed.length)];

  const edge = Math.floor(Math.random() * 4);
  let x, y;

  if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
  if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height; }
  if (edge === 3) { x = 0; y = Math.random() * canvas.height; }

  enemies.push({
    id: enemyId++,
    x,
    y,
    type,
    hp: getEnemyHP(type),
    radius: 15,
    flash: 0
  });
}

function updateEnemies() {
  for (let e of enemies) {

    const dx = orb.x - e.x;
    const dy = orb.y - e.y;
    const dist = Math.hypot(dx, dy);

    const speed = getEnemySpeed(e.type);

    e.x += (dx / dist) * speed;
    e.y += (dy / dist) * speed;

    if (dist < orb.radius + e.radius) {
    globalStats.circles += runStats.circles;
    globalStats.squares += runStats.squares;
    globalStats.pentagons += runStats.pentagons;
    globalStats.totalEther += runStats.ether;
    globalStats.runs++;
    
    saveGame();
    gameState = "summary";
  }

    if (e.flash > 0) e.flash--;
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

function cleanNumber(n) {
  return Math.round(n);
}

function damageEnemy(target, damage) {

  if (!target) return false;

  target.hp -= damage;
  target.flash = 5;

  if (target.hp <= 0) {

    enemies = enemies.filter(e => e.id !== target.id);

    player.ether += cleanNumber(1 * game.meta.difficultyMultiplier);
    runStats.ether += 1;

    if (target.type === "circle") runStats.circles++;
    if (target.type === "square") runStats.squares++;
    if (target.type === "pentagon") runStats.pentagons++;

    return true;
  }

  return false;
}

function castChainAttack(config) {
  if (enemies.length === 0) return;

  const {
    originX,
    originY,
    damage,
    chainCount,
    chainRange,
    critChance = 0,
    source = "manual"
  } = config;

  let current = null;
  let bestDist = Infinity;

  // Find first target
  for (let e of enemies) {
    const d = Math.hypot(e.x - originX, e.y - originY);
    if (d < bestDist) {
      bestDist = d;
      current = e;
    }
  }

  if (!current) return;

  const hitEnemies = [];

  for (let i = 0; i < chainCount; i++) {

    if (!current) break;

    hitEnemies.push(current);

    // Optional crit system (shared for both manual + auto)
    let finalDamage = damage;
    if (Math.random() < critChance) {
      finalDamage *= 2;
    }

    damageEnemy(current, finalDamage);

    // VISUAL
    zapEffects.push({
      points: createLightning(
        i === 0 ? originX : current.x,
        i === 0 ? originY : current.y,
        current.x,
        current.y
      ),
      life: 12
    });

    // SQUARE INTERRUPT RULE
    if (current.type === "square") break;

    // Find next target
    let next = null;
    let nextDist = Infinity;

    for (let e of enemies) {
      if (hitEnemies.includes(e)) continue;

      const d = Math.hypot(e.x - current.x, e.y - current.y);

      if (d < chainRange && d < nextDist) {
        next = e;
        nextDist = d;
      }
    }

    current = next;
  }
}

function autoZapAttack() {
  if (!player.autoEnabled) return;
  if (enemies.length === 0) return;

  const now = Date.now();

  if (now - player.autoLastAttack < player.autoAttackSpeed) return;

  player.autoLastAttack = now;

  castChainAttack({
    originX: orb.x,
    originY: orb.y,
    damage: player.autoDamage,
    chainCount: player.autoChainCount,
    chainRange: player.autoChainRange,
    critChance: player.autoCritChance,
    source: "auto"
  });
}

function createLightning(x1, y1, x2, y2) {
  const points = [];
  const segments = 8;
  const offset = 25;

  points.push({ x: x1, y: y1 });

  for (let i = 1; i < segments; i++) {
    const t = i / segments;

    let x = x1 + (x2 - x1) * t;
    let y = y1 + (y2 - y1) * t;

    const nx = y2 - y1;
    const ny = x2 - x1;
    const len = Math.hypot(nx, ny);

    const ox = (-ny / len) * (Math.random() * offset);
    const oy = (nx / len) * (Math.random() * offset);

    points.push({ x: x + ox, y: y + oy });
  }

  points.push({ x: x2, y: y2 });

  return points;
}

function applyUpgrades() {
  // reset derived stats
  player.damage = 1;
  player.chainCount = 1;
  player.chainRange = 200;
  player.critChance = 0;
  player.enemySpeedMultiplier = 0;
  player.autoEnabled = false;
  player.autoAttackSpeed = 1000;
  player.autoDamage = 1;
  player.autoChainCount = 1;
  player.autoChainRange = 200;
  player.autoCritChance = 0;

  for (let id in UPGRADES) {
    const level = getLevel(id);
    UPGRADES[id].apply(player, level);
  }
}

function getCost(id) {
  const level = getLevel(id);
  const base = UPGRADES[id].baseCost;
  return Math.floor(base * Math.pow(1.5, level));
}

function buyUpgrade(id) {
  const upg = UPGRADES[id];
  if (!upg) return;

  const cost = getCost(id);
  const level = getLevel(id);

  if (player.ether < cost) return;

  player.ether -= cost;
  player.upgrades[id] = level + 1;

  applyUpgrades();
  saveGame();
}

function getLevel(id) {
  if (!player.upgrades) return 0;
  return player.upgrades[id] || 0;
}

function getUpgradesByCategory(category) {
  return Object.entries(UPGRADES).filter(([id, upg]) => {
    return upg.category === category;
  });
}

function getRunTime() {
  return (Date.now() - runStartTime) / 1000;
}

function getAllowedEnemyTypes() {
  const t = getRunTime();

  if (t >= 120) return ["circle", "square", "pentagon"];
  if (t >= 60) return ["circle", "square"];
  return ["circle"];
}

function getEnemyHP(type) {
  const t = getRunTime();

  let base = 1;

  if (type === "square") base = 2;
  if (type === "pentagon") base = 4;

  // global scaling over time
  return Math.floor((base + t * 0.1) * game.meta.difficultyMultiplier);
}

function getEnemySpeed(type) {
  const t = getRunTime();

  let base = 1.0;

  if (type === "square") {
    base = 1.0;
    base += (t - 60) * 0.01 + player.enemySpeedMultiplier;
  }

  if (type === "pentagon") {
    base = 1.5;
    base += (t - 120) * 0.015 + player.enemySpeedMultiplier;
  }

  if (type === "circle") {
    base = 1.0 + t * 0.005 + player.enemySpeedMultiplier;
  }

  return base;
}

function getSpawnRate() {
  const t = getRunTime();

  // starts at 2000ms
  // decreases over time
  return Math.max(200, 1500 - t * 10);
}

//
// Drawing Functions
//
function drawHub() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";

  ctx.fillText("HUB", canvas.width / 2, 80);
  ctx.fillText("Ether: " + player.ether, canvas.width / 2, 120);


  ctx.textAlign = "left";

  menuButtons = [];

  const categories = [
  "click",
  "auto",
  "damage",
  "mana",
  "enemy",
  "achievements"
];

  const startX = canvas.width / 2 - 300;
  const startY = 200;

  categories.forEach((key, i) => {
    const x = startX + (i % 3) * 300;
    const y = startY + Math.floor(i / 3) * 120;

    menuButtons.push({ x, y, w: 220, h: 80, key });

    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, 220, 80);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, 220, 80);

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(key.toUpperCase(), x + 20, y + 45);
  });
  // ========================
// DEV RESET BUTTON (BOTTOM RIGHT)
// ========================
devResetButton = {
  x: canvas.width - 160,
  y: canvas.height - 70,
  w: 140,
  h: 50
};

ctx.fillStyle = "#aa0000";
ctx.fillRect(devResetButton.x, devResetButton.y, devResetButton.w, devResetButton.h);

ctx.strokeStyle = "white";
ctx.strokeRect(devResetButton.x, devResetButton.y, devResetButton.w, devResetButton.h);

ctx.fillStyle = "white";
ctx.font = "14px Arial";
ctx.textAlign = "center";
ctx.fillText("DEV RESET", devResetButton.x + 70, devResetButton.y + 30);

ctx.textAlign = "left";

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

  backButton = { x: 20, y: 20, w: 120, h: 50 };

  ctx.fillStyle = "#444";
  ctx.fillRect(backButton.x, backButton.y, backButton.w, backButton.h);

  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("Back", 60, 50);

  ctx.font = "28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(currentMenu.toUpperCase(), canvas.width / 2, 80);

  // ========================
// DEV: MANA MENU
// ========================
if (currentMenu === "mana") {

  ctx.textAlign = "center";

  ctx.fillStyle = "#00ffff";
  ctx.font = "22px Arial";

  ctx.fillText(
    `Mana: ${Math.floor(game.meta.mana)} / 100`,
    canvas.width / 2,
    160
  );

  ctx.fillText(
    `Difficulty Multiplier: x${game.meta.difficultyMultiplier.toFixed(1)}`,
    canvas.width / 2,
    190
  );

  // BAR BACKGROUND
  ctx.fillStyle = "#222";
  ctx.fillRect(canvas.width / 2 - 200, 220, 400, 20);

  // BAR FILL
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(
    canvas.width / 2 - 200,
    220,
    (game.meta.mana / 100) * 400,
    20
  );

  // HOLD BUTTON
  ctx.fillStyle = isDumpingEther ? "#ff4444" : "#00cccc";
  ctx.fillRect(canvas.width / 2 - 120, 280, 240, 60);

  ctx.fillStyle = "black";
  ctx.fillText(
    isDumpingEther ? "DUMPING..." : "HOLD TO DUMP ETHER",
    canvas.width / 2,
    318
  );

  ctx.textAlign = "left";
}

  // Ether display under title
  ctx.font = "18px Arial";
  ctx.fillStyle = "#00ffff";
  ctx.fillText(
    "Ether: " + player.ether,
    canvas.width / 2 - 50,
    120
  );

  ctx.textAlign = "left";
  ctx.fillStyle = "white";

  upgradeCards = [];

  const upgrades = getUpgradesByCategory(currentMenu);

  let i = 0;

  for (const [id, upg] of upgrades) {

    const level = getLevel(id);
    const cost = getCost(id);

    const x = 200 + (i % 2) * 320;
    const y = 150 + Math.floor(i / 2) * 120;

    upgradeCards.push({ x, y, w: 280, h: 90, id });

    ctx.fillStyle = player.ether >= cost ? "#222" : "#111";
    ctx.fillRect(x, y, 280, 90);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, 280, 90);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";

    ctx.fillText(upg.name, x + 10, y + 30);
    ctx.fillText("Level: " + level, x + 10, y + 55);
    ctx.fillText("Cost: " + cost, x + 10, y + 75);

    i++;
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

function drawSummary() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.font = "40px Arial";
  ctx.fillText("RUN COMPLETE", canvas.width / 2, 120);

  ctx.font = "20px Arial";

  ctx.fillText("Time: " + runStats.time.toFixed(1) + "s", canvas.width / 2, 200);
  ctx.fillText("Ether earned: " + runStats.ether, canvas.width / 2, 240);

  ctx.fillText(`Circles killed: ${runStats.circles}`, canvas.width / 2, 300);
  ctx.fillText(`Squares killed: ${runStats.squares}`, canvas.width / 2, 340);
  ctx.fillText(`Pentagons killed: ${runStats.pentagons}`, canvas.width / 2, 380);

  // BUTTON
  gameOverButton = {
    x: canvas.width / 2 - 120,
    y: 650,
    w: 240,
    h: 60
  };

  ctx.fillStyle = "#222";
  ctx.fillRect(gameOverButton.x, gameOverButton.y, gameOverButton.w, gameOverButton.h);

  ctx.strokeStyle = "white";
  ctx.strokeRect(gameOverButton.x, gameOverButton.y, gameOverButton.w, gameOverButton.h);

  ctx.fillStyle = "white";
  ctx.fillText("Return to Hub", canvas.width / 2, 688);

  ctx.textAlign = "left";
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";

  ctx.fillText("Ether: " + player.ether, 20, 30);

  // TIMER (top right)
  ctx.textAlign = "right";
  ctx.fillText(runElapsed.toFixed(1) + "s", canvas.width - 20, 30);
  ctx.textAlign = "left";
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
  for (let i = zapEffects.length - 1; i >= 0; i--) {
    const z = zapEffects[i];

    ctx.strokeStyle = "rgba(0,255,255,0.9)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(z.points[0].x, z.points[0].y);

    for (let p = 1; p < z.points.length; p++) {
      ctx.lineTo(z.points[p].x, z.points[p].y);
    }

    ctx.stroke();

    z.life--;
    if (z.life <= 0) zapEffects.splice(i, 1);
  }
}

function drawEnemies() {
  for (let e of enemies) {

    ctx.fillStyle = e.flash > 0 ? "purple" : "white";

    ctx.beginPath();

    if (e.type === "square") {
      ctx.rect(e.x - 15, e.y - 15, 30, 30);
    }

    else if (e.type === "pentagon") {
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const x = e.x + Math.cos(angle) * 15;
        const y = e.y + Math.sin(angle) * 15;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    else {
      // circle default
      ctx.arc(e.x, e.y, 15, 0, Math.PI * 2);
    }

    ctx.fill();
  }
}


//
// Clicker handler
//
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
    // DEV RESET BUTTON
if (
  devResetButton &&
  mx > devResetButton.x &&
  mx < devResetButton.x + devResetButton.w &&
  my > devResetButton.y &&
  my < devResetButton.y + devResetButton.h
) {
  const confirmReset = confirm("DEV RESET: wipe ALL progress?");
  if (confirmReset) {
    devResetGame();
  }
  return;
}
  for (let b of menuButtons) {
    if (
      mx > b.x && mx < b.x + b.w &&
      my > b.y && my < b.y + b.h
    ) {

      if (b.upgradeId) {
        buyUpgrade(b.upgradeId);
        return;
      }

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

  // BACK BUTTON
  if (
    backButton &&
    mx > backButton.x && mx < backButton.x + backButton.w &&
    my > backButton.y && my < backButton.y + backButton.h
  ) {
    gameState = "hub";
    return;
  }

  // UPGRADE CARDS
  for (let c of upgradeCards) {
    if (
      mx > c.x && mx < c.x + c.w &&
      my > c.y && my < c.y + c.h
    ) {

      buyUpgrade(c.id);   // ✅ THIS is the important fix
      return;
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

  castChainAttack({
  originX: orb.x,
  originY: orb.y,
  damage: player.damage,
  chainCount: player.chainCount,
  chainRange: player.chainRange,
  critChance: player.critChance,
  source: "manual"
});
}

if (gameState === "summary" && gameOverButton) {
  if (
    mx > gameOverButton.x &&
    mx < gameOverButton.x + gameOverButton.w &&
    my > gameOverButton.y &&
    my < gameOverButton.y + gameOverButton.h
  ) {
    gameState = "hub";
    enemies = [];
    enemyId = 0;
    return;
  }
}
});


// ========================
// MOUSE HOLD FOR MANA DUMP
// ========================
canvas.addEventListener("mousedown", (e) => {
  if (!DEV_FEATURES.manaDump) return;

  // only allow dumping in hub or menu (not gameplay unless you want later)
  if (gameState !== "menu") return;

  if (currentMenu !== "mana") return;

  isDumpingEther = true;
});

canvas.addEventListener("mouseup", (e) => {
  isDumpingEther = false;
});

canvas.addEventListener("mouseleave", () => {
  isDumpingEther = false;
});

// ========================
// RESET SYSTEM (REFACTOR STEP 1)
// ========================

function resetRun() {
  enemies = [];
  enemyId = 0;

  runStartTime = Date.now();
  lastSpawn = Date.now();
  runStartTimeStats = Date.now();

  runStats = {
    circles: 0,
    squares: 0,
    pentagons: 0,
    ether: 0,
    time: 0
  };
}

function resetPlayer() {
  player.ether = 0;
  player.upgrades = {};

  // reset derived stats (important)
  applyUpgrades();
}

function resetMeta() {
  game.meta.mana = 0;
  game.meta.manaBreakpoints = 0;
  game.meta.difficultyMultiplier = 1;

  globalStats = {
    circles: 0,
    squares: 0,
    pentagons: 0,
    totalEther: 0,
    runs: 0
  };
}
//
// Additional functions
//
function startRun() {
  resetRun();
  gameState = "playing";
}

function saveGame() {
  const saveData = {
    ether: player.ether,
    upgrades: player.upgrades,

    // ========================
    // MANA SYSTEM
    // ========================
    mana: game.meta.mana,
    manaBreakpoints: game.meta.manaBreakpoints,
    difficultyMultiplier: game.meta.difficultyMultiplier
  };

  localStorage.setItem("save", JSON.stringify(saveData));
}

function devResetGame() {
  localStorage.removeItem("save");

  resetPlayer();
  resetMeta();
  resetRun();

  gameState = "hub";
  currentMenu = null;

  location.reload();
}

function loadGame() {
  const data = localStorage.getItem("save");
  if (!data) return;

  const save = JSON.parse(data);

  player.ether = save.ether || 0;
  player.upgrades = save.upgrades ? save.upgrades : {};

  game.meta.mana = Number(save.mana) || 0;
  game.meta.manaBreakpoints = Number(save.manaBreakpoints) || 0;
  game.meta.difficultyMultiplier = Number(save.difficultyMultiplier) || 1;

  applyUpgrades(); // ✅ ADD THIS
}


function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ========================
// DEV: MANA DUMP UPDATE (GLOBAL)
// ========================
if (DEV_FEATURES.manaDump && isDumpingEther && currentMenu === "mana") {

  if (player.ether > 0) {
  player.ether -= 1;
  game.meta.mana += 1;
  saveGame();

  if (player.ether < 0) player.ether = 0;
}

  if (game.meta.mana >= 100) {
    game.meta.mana -= 100;
    game.meta.manaBreakpoints++;

    difficultyMultiplier = Math.pow(1.25, game.meta.manaBreakpoints);

    console.log("Mana breakpoint:", game.meta.manaBreakpoints);
  }
}

  if (gameState === "hub") drawHub();
  if (gameState === "menu") drawMenu();

  if (gameState === "playing") {
  
  const now = Date.now();
  runElapsed = (Date.now() - runStartTime) / 1000;
  runStats.time = runElapsed;

  if (lastSpawn === 0) lastSpawn = now;

  const spawnRate = getSpawnRate();

  if (now - lastSpawn >= spawnRate) {
    spawnEnemy();
    lastSpawn = now;
  }

  updateEnemies();
  
  //zapChainAttack();
  autoZapAttack();

  drawOrb();
  drawEnemies();
  drawZaps();
  drawUI();
}

  if (gameState === "summary") {
    drawSummary();
  }

  requestAnimationFrame(gameLoop);
}

loadGame();
gameLoop();
