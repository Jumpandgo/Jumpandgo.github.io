window.onload = function () {
  // Canvas setup (low-res for pixel style, scaled up)
  const pixelWidth = 400, pixelHeight = 200, scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  canvas.style.width = (pixelWidth * scale) + "px";
  canvas.style.height = (pixelHeight * scale) + "px";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // UI Layer
  const uiLayer = document.getElementById("ui-layer");
  uiLayer.style.width = (pixelWidth * scale) + "px";
  uiLayer.style.height = (pixelHeight * scale) + "px";
  uiLayer.style.position = "absolute";
  uiLayer.style.left = canvas.offsetLeft + "px";
  uiLayer.style.top = canvas.offsetTop + "px";
  
  // Health & stamina constants
  const PLAYER_MAX_HEALTH = 32;
  const PLAYER_MAX_STAMINA = 32;
  const STAMINA_REGEN = 0.12;
  const STAMINA_USE = 0.5;
  const ENEMY_DAMAGE = 8;

  // Game constants
  const GRAVITY = 0.7;
  const FRICTION = 0.8;
  const PLAYER_SPEED = 2.5;
  const JUMP_POWER = 10;

  // Key states
  const keys = {};

  // LEVELS!
  const levels = [
    {
      platforms: [
        { x: 0, y: 180, w: 400, h: 20 },
        { x: 40, y: 140, w: 40, h: 8 },
        { x: 100, y: 100, w: 50, h: 8 },
        { x: 220, y: 120, w: 40, h: 8 },
        { x: 320, y: 80, w: 40, h: 8 },
      ],
      playerStart: { x: 30, y: 120 },
      enemies: [
        { x: 120, y: 92, w: 12, h: 12, dx: 1.2, dir: 1 },
        { x: 280, y: 68, w: 12, h: 12, dx: -1.2, dir: -1 }
      ],
      goal: { x: 370, y: 70, w: 16, h: 16 },
      checkpoints: [
        { x: 105, y: 92, w: 10, h: 10 },
        { x: 325, y: 72, w: 10, h: 10 }
      ]
    },
    // ... More levels can be added here ...
  ];

  let currentLevel = 0;

  // Game state
  let platforms, player, enemies, goal, checkpoints;
  let activeCheckpoint = null;

  function loadLevel(n) {
    const lvl = levels[n];
    platforms = JSON.parse(JSON.stringify(lvl.platforms));
    player = {
      x: lvl.playerStart.x,
      y: lvl.playerStart.y,
      w: 8, h: 8, dx: 0, dy: 0, grounded: false, jumping: false,
      health: PLAYER_MAX_HEALTH,
      stamina: PLAYER_MAX_STAMINA
    };
    enemies = JSON.parse(JSON.stringify(lvl.enemies));
    goal = JSON.parse(JSON.stringify(lvl.goal));
    checkpoints = JSON.parse(JSON.stringify(lvl.checkpoints));
    activeCheckpoint = null;
  }
  loadLevel(currentLevel);

  document.addEventListener("keydown", (e) => { keys[e.code] = true; });
  document.addEventListener("keyup", (e) => { keys[e.code] = false; });

  function rectCollide(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  // Start Menu logic
  let gameStarted = false;
  const startScreen = document.getElementById("start-screen");
  const startBtn = document.getElementById("start-btn");
  startBtn.onclick = function() {
    startScreen.style.display = "none";
    gameStarted = true;
  };

  // Game loop state
  let win = false, death = false, levelTimer = 0;

  function update() {
    if (!gameStarted) {
      drawMenu();
      requestAnimationFrame(update);
      return;
    }

    if (win || death) {
      levelTimer++;
      if (levelTimer > 60) {
        if (win) {
          currentLevel++;
          if (currentLevel >= levels.length) currentLevel = 0;
          loadLevel(currentLevel);
        }
        if (death) {
          if (activeCheckpoint) {
            player.x = activeCheckpoint.x;
            player.y = activeCheckpoint.y;
            player.dx = 0;
            player.dy = 0;
            player.grounded = false;
            player.jumping = false;
            player.health = PLAYER_MAX_HEALTH;
            player.stamina = PLAYER_MAX_STAMINA;
            death = false;
            levelTimer = 0;
          } else {
            loadLevel(currentLevel);
          }
        }
        win = false;
        death = false;
        levelTimer = 0;
      }
      draw();
      requestAnimationFrame(update);
      return;
    }

    // Handle horizontal movement
    let moved = false;
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      player.dx = -PLAYER_SPEED;
      moved = true;
    } else if (keys["ArrowRight"] || keys["KeyD"]) {
      player.dx = PLAYER_SPEED;
      moved = true;
    } else {
      player.dx *= FRICTION;
      if (Math.abs(player.dx) < 0.1) player.dx = 0;
    }

    // Stamina usage for moving
    if (moved && player.grounded) {
      player.stamina -= STAMINA_USE;
      if (player.stamina < 0) player.stamina = 0;
    } else if (player.stamina < PLAYER_MAX_STAMINA) {
      player.stamina += STAMINA_REGEN;
      if (player.stamina > PLAYER_MAX_STAMINA) player.stamina = PLAYER_MAX_STAMINA;
    }

    // Jumping
    if ((keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) && player.grounded && player.stamina > 1) {
      player.dy = -JUMP_POWER;
      player.jumping = true;
      player.grounded = false;
      player.stamina -= 3; // cost for jump
      if (player.stamina < 0) player.stamina = 0;
    }

    // Gravity
    player.dy += GRAVITY;

    // ---- Separate axis movement and collision ----
    // Horizontal
    player.x += player.dx;
    for (let plat of platforms) {
      if (rectCollide(player, plat)) {
        if (player.dx > 0) player.x = plat.x - player.w;
        else if (player.dx < 0) player.x = plat.x + plat.w;
        player.dx = 0;
      }
    }
    // Vertical
    player.y += player.dy;
    player.grounded = false;
    for (let plat of platforms) {
      if (rectCollide(player, plat)) {
        if (player.dy > 0) {
          player.y = plat.y - player.h;
          player.dy = 0;
          player.grounded = true;
          player.jumping = false;
        } else if (player.dy < 0) {
          player.y = plat.y + plat.h;
          player.dy = 0;
        }
      }
    }

    // Prevent going off screen
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > pixelWidth) player.x = pixelWidth - player.w;
    if (player.y + player.h > pixelHeight) {
      player.y = pixelHeight - player.h;
      player.dy = 0;
      player.grounded = true;
      player.jumping = false;
    }

    // Move enemies
    for (let enemy of enemies) {
      enemy.x += enemy.dx * enemy.dir;
      if (enemy.x < 0) { enemy.x = 0; enemy.dir *= -1; }
      if (enemy.x + enemy.w > pixelWidth) { enemy.x = pixelWidth - enemy.w; enemy.dir *= -1; }
      let onPlat = platforms.find(p => (
        enemy.x + enemy.w/2 > p.x && enemy.x + enemy.w/2 < p.x + p.w &&
        enemy.y + enemy.h === p.y
      ));
      if (!onPlat) {
        for (let plat of platforms) {
          if (enemy.x + enemy.w/2 > plat.x && enemy.x + enemy.w/2 < plat.x + plat.w) {
            enemy.y = plat.y - enemy.h; break;
          }
        }
      }
    }

    // Checkpoints
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      if (rectCollide(player, cp)) {
        activeCheckpoint = { x: cp.x, y: cp.y };
      }
    }

    // Check win
    if (rectCollide(player, goal)) {
      win = true;
      levelTimer = 0;
    }

    // Check death, health loss
    for (let enemy of enemies) {
      if (rectCollide(player, enemy)) {
        if (player.health > 0) {
          player.health -= ENEMY_DAMAGE;
          if (player.health <= 0) {
            death = true;
            levelTimer = 0;
          }
        }
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  // --- Pixel Art Drawing Helpers ---
  function drawPixelBlock(x, y, size, colors) {
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        ctx.fillStyle = colors[py][px];
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
  }

  function playerArt() {
    const c = "#3498db", o = "#222", w = "#fff";
    return [
      [o,o,o,o,o,o,o,o],
      [o,c,c,c,c,c,c,o],
      [o,c,w,o,o,w,c,o],
      [o,c,o,o,o,o,c,o],
      [o,c,c,c,c,c,c,o],
      [o,c,c,c,c,c,c,o],
      [o,c,c,c,c,c,c,o],
      [o,o,o,o,o,o,o,o],
    ];
  }

  function drawEnemy(x, y) {
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(x + 6, y); // top
    ctx.lineTo(x, y + 12); // bottom left
    ctx.lineTo(x + 12, y + 12); // bottom right
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 4, y + 5, 1, 2); // left eye
    ctx.fillRect(x + 7, y + 5, 1, 2); // right eye
    ctx.fillRect(x + 4, y + 9, 5, 1); // mouth
    ctx.fillRect(x + 4, y + 8, 1, 1); // mouth left
    ctx.fillRect(x + 8, y + 8, 1, 1); // mouth right
  }

  function drawPixelMountain(x, y, w, h, color) {
    ctx.fillStyle = color;
    let step = 8;
    for (let i = 0; i < w; i += step) {
      let height = h - Math.floor(Math.random() * (h / 3));
      ctx.fillRect(x + i, y + h - height, step, height);
    }
  }

  function drawGoal(goal) {
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.fillStyle = "#d9af37";
    ctx.fillRect(goal.x + 6, goal.y + 4, 4, 1);
    ctx.fillRect(goal.x + 7, goal.y + 5, 2, 2);
    ctx.fillRect(goal.x + 7, goal.y + 8, 2, 2);
  }

  function drawCheckpoint(cp, active) {
    ctx.fillStyle = active ? "#00ff00" : "#999";
    ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
    ctx.fillStyle = "#222";
    ctx.fillRect(cp.x + 2, cp.y + cp.h - 2, 2, 2); // pole
    ctx.fillStyle = active ? "#00ff00" : "#fff";
    ctx.beginPath();
    ctx.moveTo(cp.x + 4, cp.y + 2);
    ctx.lineTo(cp.x + 8, cp.y + 4);
    ctx.lineTo(cp.x + 4, cp.y + 6);
    ctx.closePath();
    ctx.fill();
  }

  // Draw the UI bars (health, stamina)
  function drawBars() {
    uiLayer.innerHTML = "";
    // Health bar
    let barW = 150, barH = 20, px = 20, py = 20;
    let healthRatio = player.health / PLAYER_MAX_HEALTH;
    let staminaRatio = player.stamina / PLAYER_MAX_STAMINA;

    // Health
    let healthBar = document.createElement("div");
    healthBar.style.position = "absolute";
    healthBar.style.left = px + "px";
    healthBar.style.top = py + "px";
    healthBar.style.width = barW + "px";
    healthBar.style.height = barH + "px";
    healthBar.style.background = "#222";
    healthBar.style.border = "3px solid #c62828";
    healthBar.style.borderRadius = "8px";
    healthBar.style.boxShadow = "0 2px 0 #a31515";
    healthBar.innerHTML = `<div style="width:${Math.floor(barW*healthRatio)}px;height:${barH-6}px;background:#e74c3c;border-radius:5px;margin:3px;"></div>
      <div style="position:absolute;left:0;top:0;width:100%;height:100%;color:#fff;font-family:'VT323',monospace;font-size:18px;line-height:${barH}px;text-align:center;pointer-events:none;">HEALTH</div>`;
    uiLayer.appendChild(healthBar);

    // Stamina
    let staminaBar = document.createElement("div");
    staminaBar.style.position = "absolute";
    staminaBar.style.left = px + "px";
    staminaBar.style.top = (py+barH+8) + "px";
    staminaBar.style.width = barW + "px";
    staminaBar.style.height = barH + "px";
    staminaBar.style.background = "#222";
    staminaBar.style.border = "3px solid #2e7d32";
    staminaBar.style.borderRadius = "8px";
    staminaBar.style.boxShadow = "0 2px 0 #1c4a1c";
    staminaBar.innerHTML = `<div style="width:${Math.floor(barW*staminaRatio)}px;height:${barH-6}px;background:#66bb6a;border-radius:5px;margin:3px;"></div>
      <div style="position:absolute;left:0;top:0;width:100%;height:100%;color:#fff;font-family:'VT323',monospace;font-size:18px;line-height:${barH}px;text-align:center;pointer-events:none;">STAMINA</div>`;
    uiLayer.appendChild(staminaBar);
  }

  // Rendering
  function draw() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);

    drawPixelMountain(0, 120, pixelWidth, 60, "#8e8686");
    drawPixelMountain(0, 140, pixelWidth, 40, "#c7b7a6");
    drawPixelMountain(0, 170, pixelWidth, 25, "#e4ddcb");

    ctx.fillStyle = "#5d4037";
    for (let plat of platforms) {
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }

    drawGoal(goal);

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      drawCheckpoint(cp, activeCheckpoint && cp.x === activeCheckpoint.x && cp.y === activeCheckpoint.y);
    }

    drawPixelBlock(Math.round(player.x), Math.round(player.y), 8, playerArt());

    for (let enemy of enemies) {
      drawEnemy(Math.round(enemy.x), Math.round(enemy.y));
    }

    ctx.fillStyle = "#fff";
    ctx.font = "7px monospace";
    ctx.fillText("Level: " + (currentLevel + 1) + "/" + levels.length, 320, 10);

    if (activeCheckpoint) {
      ctx.fillStyle = "#00ff00";
      ctx.font = "7px monospace";
      ctx.fillText("Checkpoint!", 5, 35);
    }

    if (win) {
      ctx.fillStyle = "#ffe066";
      ctx.font = "15px monospace";
      ctx.fillText("LEVEL COMPLETE!", 120, 90);
    }
    if (death) {
      ctx.fillStyle = "#e74c3c";
      ctx.font = "15px monospace";
      ctx.fillText("TRY AGAIN!", 145, 90);
    }

    drawBars();
  }

  // Draw menu
  function drawMenu() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    ctx.fillStyle = "#ffe066";
    ctx.font = "32px VT323, monospace";
    ctx.fillText("PIXEL PLATFORMER", 45, 80);
    ctx.font = "15px VT323, monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Press START to play", 120, 110);
  }

  update();
};
