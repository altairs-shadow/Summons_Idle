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

let gameState = "upgrades"; 
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

let damageTypes = {
  lightning: { unlocked: true, cost: 0 },
  fire: { unlocked: false, cost: 100 },
  ice: { unlocked: false, cost: 1000 },
  rock: { unlocked: false, cost: 10000 }
};

let currentType = "lightning";


function getDamageMultiplier(enemy) {
  if (enemy.type === "triangle" && currentType === "fire") return 2;
  if (enemy.type === "square" && currentType === "rock") return 2;
  if (enemy.type === "pentagon" && currentType === "ice") return 2;

  return 1;
}

function spawnEnemy() {
  if (ghosts.length >= 50) return;

  const elapsed = (Date.now() - startTime) / 1000;

  let type = "ghost";

  if (elapsed > 120) {
    type = "pentagon";
  } else if (elapsed > 60) {
    type = Math.random() < 0.5 ? "square" : "ghost";
  } else if (elapsed > 30) {
    type = Math.random() < 0.5 ? "triangle" : "ghost";
  }

  // limits
  const squareCount = ghosts.filter(g => g.type === "square").length;
  const pentagonCount = ghosts.filter(g => g.type === "pentagon").length;

  if (type === "square") {
    const maxSquares = 1 + Math.floor(elapsed / 60);
    if (squareCount >= maxSquares) type = "ghost";
  }

  if (type === "pentagon" && pentagonCount >= 20) return;

  const edge = Math.floor(Math.random() * 4);

  let x, y;

  if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
  else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height; }
  else { x = 0; y = Math.random() * canvas.height; }

  let hp = getGhostHP();

  if (type === "triangle") hp = Math.floor(hp * 0.6);
  if (type === "pentagon") hp = Math.floor(hp * 3);

  ghosts.push({
    x,
    y,
    hp,
    type,
    hitFlash: 0
  });
}

function updateGhosts() {
  ghosts.forEach((ghost, index) => {

    let speed = ghostSpeed;
    if (ghost.type === "triangle") speed *= 1.8;
    const dx = center.x - ghost.x;
    const dy = center.y - ghost.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    ghost.x += vx;
    ghost.y += vy;

    // collision with orb → game over
    if (dist < center.radius) {
      gameState = "gameover";
      saveGame();
    }
  });
}

function getGhostHP() {
  const elapsed = (Date.now() - startTime) / 1000;

  // increase over time, capped at 15
  return Math.min(15, Math.floor(3 + elapsed * 0.5));
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

  // ✅ ONLY run logic if the card was clicked
  if (
    mx > card.x &&
    mx < card.x + card.w &&
    my > card.y &&
    my < card.y + card.h
  ) {

    // =========================
    // NORMAL UPGRADES
    // =========================
    if (card.key) {
      let upg = upgrades[card.key];

      if (upg && ether >= upg.cost) {
        ether -= upg.cost;
        upg.level++;
        upg.cost = Math.floor(upg.cost * 1.5);
      }
    }

    // =========================
    // DAMAGE TYPES
    // =========================
    if (card.type) {
      let t = damageTypes[card.type];

      if (!t.unlocked && ether >= t.cost) {
        ether -= t.cost;
        t.unlocked = true;
      }

      if (t.unlocked) {
        currentType = card.type;
      }
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
      spawnEnemy();
      lastSpawn = now;
    }

    updateGhosts();
    
    drawOrb();
    drawGhosts();
    drawUI();
    drawTimer();
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
  ghosts.forEach(g => {

    let baseColor = "white";

    if (g.type === "triangle") baseColor = "green";
    else if (g.type === "square") baseColor = "blue";
    else if (g.type === "pentagon") baseColor = "maroon";

    ctx.fillStyle = g.hitFlash > 0 ? "purple" : baseColor;

    // ✅ APPLY GLOW BEFORE DRAWING
    if (g.hitFlash > 0) {
      ctx.shadowColor = "purple";
      ctx.shadowBlur = 10;
      g.hitFlash--;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();

    if (g.type === "triangle") {
      ctx.moveTo(g.x, g.y - 15);
      ctx.lineTo(g.x - 15, g.y + 15);
      ctx.lineTo(g.x + 15, g.y + 15);
      ctx.closePath();
    }

    else if (g.type === "square") {
      ctx.rect(g.x - 15, g.y - 15, 30, 30);
    }

    else if (g.type === "pentagon") {
      for (let i = 0; i < 5; i++) {
        let angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        let x = g.x + Math.cos(angle) * 15;
        let y = g.y + Math.sin(angle) * 15;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    else {
      ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
    }

    // ✅ FILL FIRST
    ctx.fill();

    // ✅ OUTLINE AFTER FILL
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ✅ RESET SHADOW (VERY IMPORTANT)
    ctx.shadowBlur = 0;
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

  let hits = 1 + upgrades.chain.level;

  // ❗ if ANY square exists → disable chain
  if (ghosts.some(g => g.type === "square")) {
    hits = 1;
  }

  let lastX = center.x;
  let lastY = center.y;

  for (let i = 0; i < hits && i < targets.length; i++) {
    let g = targets[i];

    const mult = getDamageMultiplier(g);
    const dmg = upgrades.damage.level * mult;

    zapEffects.push({
      points: createLightning(lastX, lastY, g.x, g.y),
      life: 12
    });

    g.hp -= dmg;
    g.hitFlash = 5;

    lastX = g.x;
    lastY = g.y;

    if (g.hp <= 0) {
      const index = ghosts.indexOf(g);
      if (index !== -1) {
        ghosts.splice(index, 1);
        ether++;
      }
    }
  }

  screenFlash = 5;
  screenShake = 6;
}

function drawTimer() {
  if (gameState !== "playing") return;

  const elapsed = (Date.now() - startTime) / 1000;

  // format to 1 decimal place
  const timeText = elapsed.toFixed(1) + "s";

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";

  // align to top-right
  ctx.textAlign = "right";
  ctx.fillText(timeText, canvas.width - 20, 30);

  // reset alignment so it doesn't break other text
  ctx.textAlign = "left";
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

    let typeY = y + Object.keys(upgrades).length * 120 + 40;

Object.keys(damageTypes).forEach((type, i) => {
  let t = damageTypes[type];

  let card = {
    x: startX,
    y: typeY + i * 80,
    w: 300,
    h: 60,
    type: type
  };

  upgradeCards.push(card);

  ctx.fillStyle = currentType === type ? "cyan" : "#333";
  ctx.fillRect(card.x, card.y, card.w, card.h);

  ctx.fillStyle = "white";
  ctx.fillText(
    type.toUpperCase() +
    (t.unlocked ? " (Owned)" : " Cost: " + t.cost),
    card.x + 10,
    card.y + 35
  );
});

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
    x: canvas.width - 600,
    y: canvas.height - 725,
    w: 200,
    h: 60
  };

  ctx.fillStyle = "cyan";
  ctx.fillRect(startButton.x, startButton.y, startButton.w, startButton.h);

  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Start Run", startButton.x + 40, startButton.y + 35);
}

function saveGame() {
  const saveData = {
    ether: ether,
    upgrades: upgrades
  };

  localStorage.setItem("orbGameSave", JSON.stringify(saveData));
}

function loadGame() {
  const data = localStorage.getItem("orbGameSave");

  if (!data) return;

  const saveData = JSON.parse(data);

  ether = saveData.ether || 0;
  upgrades = saveData.upgrades || upgrades;
}

loadGame();
gameLoop();