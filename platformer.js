// Pixel Platformer - Modern Retro Edition
// Features: 5 themed levels, start screen (starts on Enter or Start), pause button, health and stamina bars, sword attack, multiple enemy types, boss fight, checkpoints, modern retro visuals

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
  const JUMP_POWER = 7; // Set back to 7 as requested
  const PLAYER_SIZE = 16; // Cube is bigger
  const SLASH_RANGE = 26;
  const SLASH_COOLDOWN = 35;
  const PLAYER_NORMAL_SPEED = 2.5;
  const PLAYER_SLOW_SPEED = 1.1;

  // Key states
  const keys = {};

  // Level data (5 levels as requested)
  const levels = [
    // 1. Classic pixel land
    {
      theme: "retro",
      bg: "mountains",
      platforms: [
        { x: 0, y: 190, w: 400, h: 10 },
        { x: 40, y: 160, w: 50, h: 10 },
        { x: 110, y: 120, w: 60, h: 10 },
        { x: 210, y: 100, w: 50, h: 10 },
        { x: 320, y: 70, w: 60, h: 10 },
      ],
      playerStart: { x: 30, y: 145 },
      enemies: [
        { type: "triangle", x: 120, y: 112, w: 16, h: 16, dx: 1.3, dir: 1 },
        { type: "triangle", x: 280, y: 82, w: 16, h: 16, dx: -1.3, dir: -1 }
      ],
      goal: { x: 370, y: 60, w: 20, h: 20 },
      checkpoints: [
        { x: 105, y: 110, w: 12, h: 12 },
        { x: 325, y: 62, w: 12, h: 12 }
      ]
    },
    // 2. Sunny Beach
    {
      theme: "beach",
      bg: "beach",
      platforms: [
        { x: 0, y: 188, w: 400, h: 12 },
        { x: 60, y: 150, w: 64, h: 10 },
        { x: 140, y: 120, w: 72, h: 10 },
        { x: 240, y: 100, w: 56, h: 10 },
        { x: 322, y: 70, w: 70, h: 10 },
      ],
      playerStart: { x: 20, y: 130 },
      enemies: [
        { type: "circle", x: 170, y: 112, w: 17, h: 17, dx: 1.1, dir: 1, follow: true },
        { type: "circle", x: 295, y: 62, w: 17, h: 17, dx: 1.1, dir: 1, follow: true }
      ],
      goal: { x: 380, y: 55, w: 20, h: 20 },
      checkpoints: [
        { x: 155, y: 115, w: 12, h: 12 },
        { x: 350, y: 62, w: 12, h: 12 }
      ]
    },
    // 3. Underground Cave
    {
      theme: "cave",
      bg: "cave",
      platforms: [
        { x: 0, y: 190, w: 400, h: 10 },
        { x: 30, y: 160, w: 60, h: 10 },
        { x: 110, y: 140, w: 70, h: 10 },
        { x: 220, y: 120, w: 60, h: 10 },
        { x: 320, y: 90, w: 60, h: 10 },
      ],
      playerStart: { x: 15, y: 140 },
      enemies: [
        { type: "shooter", x: 120, y: 132, w: 16, h: 16, dx: 1.0, dir: 1, shoot: true, cooldown: 0, balls: [] },
        { type: "shooter", x: 250, y: 112, w: 16, h: 16, dx: 1.0, dir: -1, shoot: true, cooldown: 0, balls: [] }
      ],
      goal: { x: 385, y: 80, w: 20, h: 20 },
      checkpoints: [
        { x: 82, y: 135, w: 12, h: 12 },
        { x: 310, y: 85, w: 12, h: 12 }
      ]
    },
    // 4. Firey Place
    {
      theme: "fire",
      bg: "lava",
      platforms: [
        { x: 0, y: 195, w: 400, h: 8 },
        { x: 50, y: 170, w: 50, h: 10 },
        { x: 130, y: 140, w: 70, h: 10 },
        { x: 240, y: 120, w: 50, h: 10 },
        { x: 320, y: 100, w: 70, h: 10 },
      ],
      playerStart: { x: 10, y: 160 },
      enemies: [
        { type: "thrower", x: 120, y: 132, w: 16, h: 16, dx: 1.0, dir: 1, throw: true, cooldown: 0, triangles: [] },
        { type: "thrower", x: 250, y: 112, w: 16, h: 16, dx: 1.0, dir: -1, throw: true, cooldown: 0, triangles: [] }
      ],
      goal: { x: 380, y: 90, w: 20, h: 20 },
      checkpoints: [
        { x: 82, y: 135, w: 12, h: 12 },
        { x: 310, y: 95, w: 12, h: 12 }
      ]
    },
    // 5. Heaven/Boss Level
    {
      theme: "heaven",
      bg: "heaven",
      platforms: [
        { x: 0, y: 195, w: 400, h: 8 },
        { x: 60, y: 160, w: 80, h: 10 },
        { x: 180, y: 130, w: 100, h: 10 },
        { x: 310, y: 105, w: 70, h: 10 },
      ],
      playerStart: { x: 10, y: 150 },
      enemies: [
        { type: "boss", x: 275, y: 60, w: 40, h: 32, gunCooldown: 0, gunBullets: [] }
      ],
      goal: { x: 370, y: 80, w: 20, h: 20 },
      checkpoints: [
        { x: 80, y: 150, w: 12, h: 12 },
        { x: 320, y: 100, w: 12, h: 12 }
      ]
    },
  ];

  let currentLevel = 0;
  let platforms, player, enemies, goal, checkpoints;
  let activeCheckpoint = null;

  function loadLevel(n) {
    const lvl = levels[n];
    platforms = JSON.parse(JSON.stringify(lvl.platforms));
    player = {
      x: lvl.playerStart.x, y: lvl.playerStart.y,
      w: PLAYER_SIZE, h: PLAYER_SIZE, dx: 0, dy: 0,
      grounded: false, jumping: false,
      health: PLAYER_MAX_HEALTH, stamina: PLAYER_MAX_STAMINA,
      slashCooldown: 0, facing: 1, slow: false
    };
    enemies = lvl.enemies.map(e => ({...e, balls: e.balls ? [] : undefined, gunBullets: e.gunBullets ? [] : undefined, triangles: e.triangles ? [] : undefined}));
    goal = JSON.parse(JSON.stringify(lvl.goal));
    checkpoints = JSON.parse(JSON.stringify(lvl.checkpoints));
    activeCheckpoint = null;
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
    for (let i = enemies.length-1; i>=0; i--) {
      let enemy = enemies[i];
      if (enemy.hit && (!enemy.hp || enemy.hp <= 0)) { enemies.splice(i,1); continue; }
      if (enemy.type === "circle" && enemy.follow) {
        let px = player.x + player.w/2, py = player.y + player.h/2;
        let ex = enemy.x + enemy.w/2, ey = enemy.y + enemy.h/2;
        let dx = px-ex, dy = py-ey;
        let dist = Math.hypot(dx,dy);
        if (dist > 1) {
          enemy.x += dx/dist * enemy.dx * 0.7;
          enemy.y += dy/dist * enemy.dx * 0.7;
        }
      } else if (enemy.type === "triangle") {
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
      } else if (enemy.type === "shooter") {
        enemy.x += enemy.dx * enemy.dir;
        if (enemy.x < 0) { enemy.x = 0; enemy.dir *= -1; }
        if (enemy.x + enemy.w > pixelWidth) { enemy.x = pixelWidth - enemy.w; enemy.dir *= -1; }
        if (!enemy.cooldown || enemy.cooldown <= 0) {
          let angle = Math.atan2(player.y+player.h/2-enemy.y-enemy.h/2, player.x+player.w/2-enemy.x-enemy.w/2);
          enemy.balls.push({x: enemy.x+enemy.w/2, y: enemy.y+enemy.h/2, dx: Math.cos(angle)*2.8, dy: Math.sin(angle)*2.8, radius: 5});
          enemy.cooldown = 55;
        } else enemy.cooldown--;
        for (let j=enemy.balls.length-1;j>=0;j--) {
          let ball = enemy.balls[j];
          ball.x += ball.dx; ball.y += ball.dy;
          if (rectCollide({x: ball.x-ball.radius, y: ball.y-ball.radius, w: ball.radius*2, h: ball.radius*2}, player)) {
            player.health -= ENEMY_DAMAGE;
            if (player.health <= 0) { death = true; levelTimer = 0; }
            enemy.balls.splice(j,1);
            continue;
          }
          if (ball.x < 0 || ball.x > pixelWidth || ball.y < 0 || ball.y > pixelHeight)
            enemy.balls.splice(j,1);
        }
      } else if (enemy.type === "thrower") {
        enemy.x += enemy.dx * enemy.dir;
        if (enemy.x < 0) { enemy.x = 0; enemy.dir *= -1; }
        if (enemy.x + enemy.w > pixelWidth) { enemy.x = pixelWidth - enemy.w; enemy.dir *= -1; }
        if (!enemy.cooldown || enemy.cooldown <= 0) {
          let angle = Math.atan2(player.y+player.h/2-enemy.y-enemy.h/2, player.x+player.w/2-enemy.x-enemy.w/2);
          enemy.triangles.push({x: enemy.x+enemy.w/2, y: enemy.y+enemy.h/2, dx: Math.cos(angle)*3.1, dy: Math.sin(angle)*3.1, size: 10});
          enemy.cooldown = 65;
        } else enemy.cooldown--;
        for (let j=enemy.triangles.length-1;j>=0;j--) {
          let tri = enemy.triangles[j];
          tri.x += tri.dx; tri.y += tri.dy;
          if (rectCollide({x:tri.x-tri.size/2, y:tri.y-tri.size/2, w:tri.size, h:tri.size}, player)) {
            player.health -= ENEMY_DAMAGE;
            if (player.health <= 0) { death = true; levelTimer = 0; }
            enemy.triangles.splice(j,1);
            continue;
          }
          if (tri.x < 0 || tri.x > pixelWidth || tri.y < 0 || tri.y > pixelHeight)
            enemy.triangles.splice(j,1);
        }
      } else if (enemy.type === "boss") {
        if (!enemy.gunCooldown || enemy.gunCooldown <= 0) {
          let angle = Math.atan2(player.y+player.h/2-enemy.y-enemy.h/2, player.x+player.w/2-enemy.x-enemy.w/2);
          enemy.gunBullets.push({x: enemy.x+enemy.w/2, y: enemy.y+enemy.h/2, dx: Math.cos(angle)*3.5, dy: Math.sin(angle)*3.5, radius: 7});
          enemy.gunCooldown = 40;
        } else enemy.gunCooldown--;
        for (let j=enemy.gunBullets.length-1;j>=0;j--) {
          let bullet = enemy.gunBullets[j];
          bullet.x += bullet.dx; bullet.y += bullet.dy;
          if (rectCollide({x: bullet.x-bullet.radius, y: bullet.y-bullet.radius, w: bullet.radius*2, h: bullet.radius*2}, player)) {
            player.health -= ENEMY_DAMAGE;
            if (player.health <= 0) { death = true; levelTimer = 0; }
            enemy.gunBullets.splice(j,1);
            continue;
          }
          if (bullet.x < 0 || bullet.x > pixelWidth || bullet.y < 0 || bullet.y > pixelHeight)
            enemy.gunBullets.splice(j,1);
        }
      }
    }

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
  function drawPixelBlock(x, y, size, colors) {
    // Modern retro: fat border, gradient, shadow
    ctx.save();
    ctx.shadowColor = "#222";
    ctx.shadowBlur = 3;
    for (let py = 0; py < 16; py++) {
      for (let px = 0; px < 16; px++) {
        ctx.fillStyle = colors[py][px];
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
    ctx.restore();
    // Border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 16, 16);
    // Sword (retro pixel blade)
    ctx.save();
    ctx.translate(x + (size/2), y + 8);
    ctx.rotate(Math.PI/8 * player.facing);
    ctx.fillStyle = "#fff";
    ctx.fillRect(5, -2, 9, 4);
    ctx.fillStyle = "#8ecae6";
    ctx.fillRect(5, -1, 8, 2);
    ctx.restore();
  }

  function playerArt() {
    // 16x16 retro gradient block with eyes
    const gradient = [
      "#f7e9c3","#e3c787","#e6a552","#da8f3a","#d7772c","#b45d1d","#7e3a16","#4e1c0d",
      "#d8e8f7","#b2cde3","#7bb5d6","#589ecf","#437fb7","#2b649b","#225384","#163b65"
    ];
    const o = "#222", w = "#fff";
    let arr = [];
    for (let y=0;y<16;y++) {
      arr[y]=[];
      for (let x=0;x<16;x++) {
        // Border
        if (y===0||y===15||x===0||x===15) arr[y][x]=o;
        // Eyes
        else if ((y===5 && (x===5||x===10)) || (y===6 && (x===5||x===10))) arr[y][x]=w;
        // Gradient fill
        else arr[y][x]=gradient[Math.floor(y/2)];
      }
    }
    return arr;
  }

  function drawEnemy(x, y, enemy) {
    if (enemy.type === "triangle") {
      let grad = ctx.createLinearGradient(x, y, x+enemy.w, y+enemy.h);
      grad.addColorStop(0, "#ff6f61");
      grad.addColorStop(1, "#b71c1c");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x + enemy.w/2, y);
      ctx.lineTo(x, y + enemy.h);
      ctx.lineTo(x + enemy.w, y + enemy.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#222";
      ctx.fillRect(x + enemy.w/2 - 4, y + 6, 2, 3);
      ctx.fillRect(x + enemy.w/2 + 2, y + 6, 2, 3);
      ctx.fillRect(x + enemy.w/2 - 3, y + 12, 6, 2);
    } else if (enemy.type === "circle") {
      ctx.save();
      ctx.shadowColor = "#222";
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(x + enemy.w/2, y + enemy.h/2, enemy.w/2, 0, Math.PI*2);
      ctx.closePath();
      ctx.fillStyle = "#ffd166";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#222";
      ctx.fillRect(x + enemy.w/2 - 4, y + enemy.h/2 - 2, 2, 2);
      ctx.fillRect(x + enemy.w/2 + 2, y + enemy.h/2 - 2, 2, 2);
      ctx.restore();
    } else if (enemy.type === "shooter") {
      drawEnemy(x, y, {type:"triangle",w:enemy.w,h:enemy.h});
      for (let ball of enemy.balls) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
        ctx.fillStyle = "#ffe066";
        ctx.fill();
        ctx.strokeStyle = "#b71c1c";
        ctx.stroke();
      }
    } else if (enemy.type === "thrower") {
      drawEnemy(x, y, {type:"triangle",w:enemy.w,h:enemy.h});
      for (let tri of enemy.triangles) {
        ctx.save();
        ctx.translate(tri.x, tri.y);
        ctx.rotate(Math.atan2(tri.dy,tri.dx));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-tri.size, tri.size);
        ctx.lineTo(tri.size, tri.size);
        ctx.closePath();
        ctx.fillStyle = "#ff9100";
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.stroke();
        ctx.restore();
      }
    } else if (enemy.type === "boss") {
      ctx.save();
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(x, y, enemy.w, enemy.h);
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, enemy.w, enemy.h);
      ctx.fillStyle = "#222";
      ctx.fillRect(x + enemy.w/2 - 8, y + 12, 4, 4);
      ctx.fillRect(x + enemy.w/2 + 4, y + 12, 4, 4);
      ctx.beginPath();
      ctx.moveTo(x-10, y+8);
      ctx.lineTo(x-20, y+enemy.h/2);
      ctx.lineTo(x-10, y+enemy.h-8);
      ctx.closePath();
      ctx.fillStyle = "#e3f2fd";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x+enemy.w+10, y+8);
      ctx.lineTo(x+enemy.w+20, y+enemy.h/2);
      ctx.lineTo(x+enemy.w+10, y+enemy.h-8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.fillRect(x+enemy.w/2-4, y+enemy.h-4, 8, 8);
      ctx.restore();
      for (let bullet of enemy.gunBullets) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI*2);
        ctx.fillStyle = "#90caf9";
        ctx.fill();
        ctx.strokeStyle = "#222";
        ctx.stroke();
      }
    }
  }

  function drawPixelMountain(x, y, w, h, color1, color2) {
    let grad = ctx.createLinearGradient(x, y, x, y+h);
    grad.addColorStop(0, color1); grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    let step = 16;
    for (let i = 0; i < w; i += step) {
      let height = h - Math.floor(Math.random() * (h / 2));
      ctx.fillRect(x + i, y + h - height, step, height);
      if (Math.random() < 0.2) {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x + i, y + h - height, step, 4);
        ctx.fillStyle = grad;
      }
    }
  }

  function drawBeachBG() {
    ctx.fillStyle = "#90e0ef";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    ctx.fillStyle = "#48cae4";
    ctx.fillRect(0, pixelHeight-60, pixelWidth, 40);
    ctx.fillStyle = "#ffecb3";
    ctx.fillRect(0, pixelHeight-20, pixelWidth, 20);
  }

  function drawCaveBG() {
    ctx.fillStyle = "#23272a";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    drawPixelMountain(0, 130, pixelWidth, 60, "#454545","#23272a");
    drawPixelMountain(0, 160, pixelWidth, 30, "#666","#23272a");
  }

  function drawFireBG() {
    ctx.fillStyle = "#ff7043";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    drawPixelMountain(0, 150, pixelWidth, 40, "#ffcc80","#ff7043");
    drawPixelMountain(0, 170, pixelWidth, 20, "#ffd54f","#ff7043");
    for (let i=0;i<12;i++) {
      ctx.strokeStyle = "#b71c1c";
      ctx.beginPath();
      ctx.moveTo(Math.random()*pixelWidth, pixelHeight-10);
      ctx.lineTo(Math.random()*pixelWidth, pixelHeight-40);
      ctx.stroke();
    }
  }

  function drawHeavenBG() {
    ctx.fillStyle = "#e3f2fd";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    drawPixelMountain(0, 130, pixelWidth, 60, "#fff","#e3f2fd");
    drawPixelMountain(0, 160, pixelWidth, 30, "#e1bee7","#e3f2fd");
    for (let i=0;i<7;i++) {
      ctx.beginPath();
      ctx.arc(50+40*i, 40+10*(i%3), 18, 0, Math.PI*2);
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawGoal(goal) {
    let grad = ctx.createLinearGradient(goal.x, goal.y, goal.x, goal.y+goal.h);
    grad.addColorStop(0, "#ffe066");
    grad.addColorStop(1, "#d9af37");
    ctx.fillStyle = grad;
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.strokeStyle = "#b8892d";
    ctx.lineWidth = 2;
    ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
    ctx.globalAlpha = 0.23;
    ctx.fillStyle = "#fff";
    ctx.fillRect(goal.x+3, goal.y+2, goal.w-6, 3);
    ctx.globalAlpha = 1;
  }

  function drawCheckpoint(cp, active) {
    ctx.fillStyle = active ? "#00ff00" : "#aaa";
    ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
    ctx.fillStyle = "#222";
    ctx.fillRect(cp.x + 2, cp.y + cp.h - 2, 2, 2);
    ctx.fillStyle = active ? "#00ff00" : "#fff";
    ctx.beginPath();
    ctx.moveTo(cp.x + 4, cp.y + 2);
    ctx.lineTo(cp.x + 8, cp.y + 4);
    ctx.lineTo(cp.x + 4, cp.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#fff";
    ctx.fillRect(cp.x+2, cp.y+2, 6, 2);
    ctx.globalAlpha = 1;
  }

  function drawBars() {
    uiLayer.innerHTML = "";
    let barW = 180, barH = 22, px = 20, py = 20;
    let healthRatio = player.health / PLAYER_MAX_HEALTH;
    let staminaRatio = player.stamina / PLAYER_MAX_STAMINA;
    let percentHealth = Math.floor(healthRatio*100);
    let percentStamina = Math.floor(staminaRatio*100);

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
    healthBar.innerHTML = `<div style="width:${Math.floor(barW*healthRatio)}px;height:${barH-6}px;background:linear-gradient(90deg,#e74c3c,#e53935);border-radius:5px;margin:3px;transition:width 0.2s;"></div>
      <div style="position:absolute;left:0;top:0;width:100%;height:100%;color:#fff;font-family:'VT323',monospace;font-size:18px;line-height:${barH}px;text-align:center;pointer-events:none;">HEALTH - ${percentHealth}%</div>`;
    uiLayer.appendChild(healthBar);

    let staminaBar = document.createElement("div");
    staminaBar.style.position = "absolute";
    staminaBar.style.left = px + "px";
    staminaBar.style.top = (py+barH+8) + "px";
    staminaBar.style.width = barW + "px";
    staminaBar.style.height = barH + "px";
    staminaBar.style.background = "#222";
    staminaBar.style.border = "3px solid #1565c0";
    staminaBar.style.borderRadius = "8px";
    staminaBar.style.boxShadow = "0 2px 0 #0d47a1";
    staminaBar.innerHTML = `<div style="width:${Math.floor(barW*staminaRatio)}px;height:${barH-6}px;background:linear-gradient(90deg,#2196f3,#8ecae6);border-radius:5px;margin:3px;transition:width 0.2s;"></div>
      <div style="position:absolute;left:0;top:0;width:100%;height:100%;color:#fff;font-family:'VT323',monospace;font-size:18px;line-height:${barH}px;text-align:center;pointer-events:none;">STAMINA - ${percentStamina}%</div>`;
    uiLayer.appendChild(staminaBar);
  }

  function draw() {
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

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawMenu() {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
    ctx.fillStyle = "#ffe066";
    ctx.font = "38px VT323, monospace";
    ctx.fillText("PIXEL PLATFORMER", 45, 80);
    ctx.font = "15px VT323, monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Press START or ENTER to play", 100, 120);
    ctx.fillText("Move: Arrow keys/WASD | Jump: Up/Space", 65, 140);
    ctx.fillText("Slash: F | Pause: Top right", 120, 160);
  }

  function drawPause() {
    draw();
    ctx.save();
    ctx.globalAlpha = 0.76;
    ctx.fillStyle = "#222";
    ctx.fillRect(0,0,pixelWidth,pixelHeight);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffe066";
    ctx.font = "30px VT323, monospace";
    ctx.fillText("PAUSED", 150, 100);
    ctx.restore();
  }

  function rectCollide(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  update();
};
