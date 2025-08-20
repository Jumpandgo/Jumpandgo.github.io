window.onload = function () {
  // Canvas setup (pixel style, scaled up)
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

  // Pause button
  let paused = false;
  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "⏸";
  pauseBtn.style.position = "absolute";
  pauseBtn.style.right = "16px";
  pauseBtn.style.top = "16px";
  pauseBtn.style.zIndex = "20";
  pauseBtn.style.background = "#ffe066";
  pauseBtn.style.border = "2px solid #333";
  pauseBtn.style.borderRadius = "8px";
  pauseBtn.style.fontSize = "24px";
  pauseBtn.style.cursor = "pointer";
  pauseBtn.style.width = "48px";
  pauseBtn.style.height = "48px";
  pauseBtn.style.fontFamily = "'VT323', monospace";
  pauseBtn.onclick = () => { paused = !paused; };
  uiLayer.appendChild(pauseBtn);

  // Game constants and mechanics
  const PLAYER_MAX_HEALTH = 100;
  const PLAYER_MAX_STAMINA = 100;
  const STAMINA_REGEN = 0.18; // slower drain, as requested
  const STAMINA_USE = 0.25; // much slower drain
  const ENEMY_DAMAGE = 8;
  const JUMP_POWER = 9; // Increased from 7 to 9 for higher jump
  const PLAYER_SIZE = 16; // Cube is bigger
  const SLASH_RANGE = 26;
  const SLASH_COOLDOWN = 35;
  const PLAYER_NORMAL_SPEED = 2.5;
  const PLAYER_SLOW_SPEED = 1.1;

  // Key states
  const keys = {};

  // Level data (5 levels as requested)
  // ... [levels definition unchanged] ...

  let currentLevel = 0;
  let platforms, player, enemies, goal, checkpoints;
  let activeCheckpoint = null;

  function loadLevel(n) {
    // ... [unchanged] ...
  }
  loadLevel(currentLevel);

  document.addEventListener("keydown", (e) => { keys[e.code] = true; });
  document.addEventListener("keyup", (e) => { keys[e.code] = false; });

  // Start screen logic
  const startScreen = document.getElementById("start-screen");
  const startBtn = document.getElementById("start-btn");
  let gameStarted = false;

  function startGame() {
    if (!gameStarted) {
      startScreen.setAttribute("hidden", "hidden");
      gameStarted = true;
    }
  }

  // Start by button click
  startBtn.onclick = startGame;

  // Start by Enter key
  document.addEventListener("keydown", function(e) {
    if (!gameStarted && (e.code === "Enter" || e.key === "Enter")) {
      startGame();
    }
  });

  // Game state
  let win = false, death = false, levelTimer = 0;

  function update() {
    if (!gameStarted) {
      drawMenu();
      requestAnimationFrame(update);
      return;
    }
    if (paused) {
      drawPause();
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
            player.dx = 0; player.dy = 0;
            player.grounded = false; player.jumping = false;
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

    // Movement
    let moved = false;
    let speed = player.slow ? PLAYER_SLOW_SPEED : PLAYER_NORMAL_SPEED;
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      player.dx = -speed;
      player.facing = -1;
      moved = true;
    } else if (keys["ArrowRight"] || keys["KeyD"]) {
      player.dx = speed;
      player.facing = 1;
      moved = true;
    } else {
      player.dx *= 0.8;
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
    player.slow = player.stamina <= 0;

    // Jumping
    if ((keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) && player.grounded && player.stamina > 1) {
      player.dy = -JUMP_POWER;
      player.jumping = true;
      player.grounded = false;
      player.stamina -= 5;
      if (player.stamina < 0) player.stamina = 0;
    }

    // Gravity
    player.dy += 0.7;

    // Slash
    if (player.slashCooldown > 0) player.slashCooldown--;
    if (keys["KeyF"] && player.slashCooldown <= 0) {
      player.slashCooldown = SLASH_COOLDOWN;
      // Hit any enemy in range
      for (let enemy of enemies) {
        let dist = Math.hypot(enemy.x + enemy.w/2 - (player.x+player.w/2), enemy.y + enemy.h/2 - (player.y+player.h/2));
        if (dist <= SLASH_RANGE) {
          enemy.hit = true;
          enemy.hp = (enemy.hp || 1) - 1;
        }
      }
    }

    // Horizontal movement & collision
    player.x += player.dx;
    for (let plat of platforms) {
      if (rectCollide(player, plat)) {
        if (player.dx > 0) player.x = plat.x - player.w;
        else if (player.dx < 0) player.x = plat.x + plat.w;
        player.dx = 0;
      }
    }
    // Vertical movement & collision
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

    // Prevent off screen
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > pixelWidth) player.x = pixelWidth - player.w;
    if (player.y + player.h > pixelHeight) {
      player.y = pixelHeight - player.h;
      player.dy = 0;
      player.grounded = true;
      player.jumping = false;
    }

    // Checkpoints
    for (let cp of checkpoints) {
      if (rectCollide(player, cp)) {
        activeCheckpoint = { x: cp.x, y: cp.y };
      }
    }

    // Enemy logic
    // ... [unchanged] ...

    // Check win
    if (rectCollide(player, goal)) {
      win = true;
      levelTimer = 0;
    }

    // Check death by contact enemies
    for (let enemy of enemies) {
      if (enemy.type === "triangle" || enemy.type === "circle") {
        if (rectCollide(player, enemy)) {
          player.health -= ENEMY_DAMAGE;
          if (player.health <= 0) { death = true; levelTimer = 0; }
        }
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  // Drawing Helpers
  function draw() {
    // Clear the canvas each frame to prevent after images
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    // ... rest of your drawing code ...
    // (background, platforms, entities, etc)
    let lvl = levels[currentLevel];
    if (lvl.bg === "mountains") drawPixelMountain(0, 130, pixelWidth, 60, "#a1c4fd","#c2e9fb");
    else if (lvl.bg === "beach") drawBeachBG();
    else if (lvl.bg === "cave") drawCaveBG();
    else if (lvl.bg === "lava") drawFireBG();
    else if (lvl.bg === "heaven") drawHeavenBG();
    else ctx.fillStyle = "#222", ctx.fillRect(0,0,pixelWidth,pixelHeight);

    for (let plat of platforms) {
      let grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y+plat.h);
      grad.addColorStop(0, "#7e6a52");
      grad.addColorStop(1, "#bdb094");
      ctx.fillStyle = grad;
      roundRect(ctx, plat.x, plat.y, plat.w, plat.h, 4, true, true);
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#fff";
      ctx.fillRect(plat.x, plat.y, plat.w, 4);
      ctx.globalAlpha = 1;
    }
    drawGoal(goal);
    for (let cp of checkpoints) drawCheckpoint(cp, activeCheckpoint && cp.x === activeCheckpoint.x && cp.y === activeCheckpoint.y);
    drawPixelBlock(Math.round(player.x), Math.round(player.y), PLAYER_SIZE, playerArt());
    for (let enemy of enemies) drawEnemy(Math.round(enemy.x), Math.round(enemy.y), enemy);
    ctx.fillStyle = "#fff";
    ctx.font = "10px VT323, monospace";
    ctx.fillText("Level: " + (currentLevel + 1) + "/" + levels.length, 320, 18);
    if (activeCheckpoint) {
      ctx.fillStyle = "#00ff00";
      ctx.font = "10px VT323, monospace";
      ctx.fillText("Checkpoint!", 5, 42);
    }
    if (win) {
      ctx.fillStyle = "#ffe066";
      ctx.font = "20px VT323, monospace";
      ctx.fillText("LEVEL COMPLETE!", 120, 90);
    }
    if (death) {
      ctx.fillStyle = "#e74c3c";
      ctx.font = "20px VT323, monospace";
      ctx.fillText("TRY AGAIN!", 145, 90);
    }
    drawBars();
  }

  // ... [rest of your drawing helpers and game code unchanged] ...

  update();
};
