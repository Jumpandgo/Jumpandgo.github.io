// === Blocky Platformer — Pure JavaScript Only ===
// NOTE: Put <canvas id="game"></canvas> in your HTML. This script builds everything else.
// Desktop: Arrow keys = move/jump, F = attack, Shift = sprint, Enter/Click = start
// Mobile: On-canvas buttons for left/right/jump/attack/sprint

(() => {
  // --------- Boot ---------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  function resize() {
    canvas.width = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
  }
  resize();
  window.addEventListener("resize", resize);

  // --------- Input ---------
  const keys = Object.create(null);
  window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (state.mode === "menu" && (e.key === "Enter" || e.key === " ")) startGame();
  });
  window.addEventListener("keyup", e => keys[e.key] = false);

  // Touch helpers
  const touches = new Map();
  canvas.addEventListener("touchstart", e => {
    for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX * DPR, y: t.clientY * DPR });
    handleTouchButtons("down", e);
  }, { passive: true });
  canvas.addEventListener("touchmove", e => {
    for (const t of e.changedTouches) touches.set(t.identifier, { x: t.clientX * DPR, y: t.clientY * DPR });
  }, { passive: true });
  canvas.addEventListener("touchend", e => {
    for (const t of e.changedTouches) touches.delete(t.identifier);
    handleTouchButtons("up", e);
  }, { passive: true });

  // Mouse for start button and mobile buttons
  canvas.addEventListener("mousedown", e => handlePointerButtons("down", e));
  canvas.addEventListener("mouseup", e => handlePointerButtons("up", e));
  canvas.addEventListener("click", e => {
    const { x, y } = pointerXY(e);
    if (state.mode === "menu" && pointInRect(x, y, ui.startBtn)) startGame();
  });

  function pointerXY(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * DPR, y: (e.clientY - rect.top) * DPR };
  }

  // --------- Game State ---------
  const state = {
    mode: "menu", // "menu" | "play" | "win" | "dead"
    level: 0,
    theme: 0,
    coins: 0,
    totalCoins: 0,
    t: 0,
  };

  // Themes change every 10 levels
  const themes = [
    { bg1: "#0b1024", bg2: "#111a3c", plat: "#1f2a44", platTop: "rgba(255,255,255,.08)", hero: "#7CFF5B", enemy: "#FF5252", coin: "#FFC745", spike: "#ff5151", ui: "#e2e8f0" },
    { bg1: "#0f0f0f", bg2: "#1a1a1a", plat: "#2b2b2b", platTop: "rgba(255,255,255,.06)", hero: "#62e6ff", enemy: "#ff7bd9", coin: "#ffd95e", spike: "#ff6e6e", ui: "#f5f5f5" },
    { bg1: "#031b1b", bg2: "#093a3a", plat: "#0d4d4d", platTop: "rgba(255,255,255,.08)", hero: "#7affc6", enemy: "#ff8f73", coin: "#ffe27a", spike: "#ff6e6e", ui: "#e0fffa" },
  ];

  // Physics
  const GRAV = 0.6 * DPR;
  const MAX_VX = 6 * DPR;
  const MAX_VY = 18 * DPR;
  const JUMP_V = -12 * DPR;

  // Hero
  const hero = {
    x: 60, y: 0, w: 24 * DPR, h: 28 * DPR,
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    attacking: false,
    attackTimer: 0,
    health: 100,
    stamina: 100,
    sprinting: false,
    alive: true,
    invuln: 0,
  };

  // World
  let platforms = [], spikes = [], enemies = [], coins = [], powerups = [], checkpoints = [], goal = null, startPoint = { x: 60, y: 0 };
  let respawn = { x: 60, y: 0 };

  // UI and Buttons (drawn on canvas)
  const ui = {
    startBtn: { x: 0, y: 0, w: 0, h: 0 },
    buttons: {
      left: { x: 64, y: 0, w: 92, h: 92, pressed: false },
      right: { x: 170, y: 0, w: 92, h: 92, pressed: false },
      jump: { x: 0, y: 0, w: 92, h: 92, pressed: false },
      attack: { x: 0, y: 0, w: 92, h: 92, pressed: false },
      sprint: { x: 0, y: 0, w: 92, h: 92, pressed: false },
    }
  };
  function positionButtons() {
    const pad = 28 * DPR;
    const b = ui.buttons;
    const baseY = canvas.height - (108 * DPR);
    b.left.y = baseY; b.right.y = baseY;
    b.jump.x = canvas.width - (108 * DPR) * 2 - pad; b.jump.y = baseY;
    b.attack.x = canvas.width - (108 * DPR) - pad; b.attack.y = baseY - (108 * DPR);
    b.sprint.x = canvas.width - (108 * DPR) - pad; b.sprint.y = baseY;
    b.left.x = pad; b.right.x = pad + 108 * DPR;
  }
  positionButtons();

  // --------- Entities ---------
  class Rect { constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; } }
  class Platform extends Rect { }
  class Spike extends Rect { }
  class Checkpoint extends Rect { constructor(x, y) { super(x, y, 20 * DPR, 40 * DPR); this.active = false; } }
  class Goal extends Rect { constructor(x, y) { super(x, y, 40 * DPR, 80 * DPR); this.open = false; } }
  class Coin { constructor(x, y) { this.x = x; this.y = y; this.r = 8 * DPR; this.taken = false; this.vy = 0; } }
  class Powerup { // type: "health" or "stamina"
    constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.r = 9 * DPR; this.vy = -6 * DPR; }
  }
  class Enemy {
    constructor(x, y, minX, maxX, speed) {
      this.x = x; this.y = y; this.w = 22 * DPR; this.h = 24 * DPR;
      this.vx = speed || 1.5 * DPR; this.minX = minX; this.maxX = maxX;
      this.vy = 0; this.onGround = false; this.alive = true;
    }
  }

  // --------- Utils ---------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const AABB = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pointInRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function collideMove(box, solids) {
    // X
    box.x += box.vx;
    for (const s of solids) if (AABB(box, s)) {
      if (box.vx > 0) box.x = s.x - box.w; else box.x = s.x + s.w;
      box.vx = 0;
    }
    // Y
    box.y += box.vy; box.onGround = false;
    for (const s of solids) if (AABB(box, s)) {
      if (box.vy > 0) { box.y = s.y - box.h; box.onGround = true; }
      else box.y = s.y + s.h;
      box.vy = 0;
    }
  }

  // --------- Level Gen ---------
  function generateLevel(i) {
    const W = canvas.width, H = canvas.height;
    const groundY = H - 40 * DPR;
    const L = { platforms: [], spikes: [], coins: [], enemies: [], checkpoints: [], goal: null, start: { x: 60 * DPR, y: groundY - 80 * DPR } };

    // Base ground
    L.platforms.push(new Platform(0, groundY, W, 40 * DPR));

    // Steps and gaps vary by i
    const stepCount = 6 + (i % 5);
    let x = 140 * DPR;
    for (let s = 0; s < stepCount; s++) {
      const pw = 120 * DPR;
      const py = groundY - (60 + (s % 3) * 40 + (i % 3) * 10) * DPR;
      L.platforms.push(new Platform(x, py, pw, 16 * DPR));
      // coins trail
      if (s % 2 === 0) L.coins.push(new Coin(x + pw / 2, py - 20 * DPR));
      // spikes in ground
      if (s % 3 === 1) L.spikes.push(new Spike(x + pw + 20 * DPR, groundY - 24 * DPR, 48 * DPR, 24 * DPR));
      // enemy patrol on some platforms
      if (s % 2 === 1) L.enemies.push(new Enemy(x + 12 * DPR, py - 24 * DPR, x, x + pw, 1.2 * DPR + (i % 3) * 0.4 * DPR));
      x += (pw + 80 * DPR);
    }

    // Late section
    const lateX = x + 40 * DPR;
    L.platforms.push(new Platform(lateX, groundY - 100 * DPR, 150 * DPR, 16 * DPR));
    L.coins.push(new Coin(lateX + 40 * DPR, groundY - 130 * DPR), new Coin(lateX + 80 * DPR, groundY - 130 * DPR));
    L.enemies.push(new Enemy(lateX + 20 * DPR, groundY - 124 * DPR, lateX, lateX + 150 * DPR, 1.8 * DPR));
    L.goal = new Goal(lateX + 240 * DPR, groundY - 80 * DPR);

    // Checkpoints
    L.checkpoints.push(new Checkpoint(280 * DPR, groundY), new Checkpoint(lateX - 60 * DPR, groundY));

    return L;
  }

  function loadLevel(idx) {
    const themeIndex = Math.floor(idx / 10) % themes.length;
    state.theme = themeIndex;
    const L = generateLevel(idx);
    platforms = L.platforms; spikes = L.spikes; coins = L.coins; enemies = L.enemies; checkpoints = L.checkpoints; goal = L.goal; startPoint = L.start;
    state.totalCoins = coins.length;
    Object.assign(hero, { x: startPoint.x, y: startPoint.y, vx: 0, vy: 0, health: 100, stamina: 100, alive: true, attacking: false, attackTimer: 0, invuln: 0 });
    respawn = { x: startPoint.x, y: startPoint.y };
    for (const c of checkpoints) c.active = false;
  }

  // --------- UI + Start ---------
  function startGame() {
    state.mode = "play";
    state.level = 0;
    loadLevel(state.level);
  }

  // --------- Update ---------
  function update() {
    state.t++;

    if (state.mode !== "play") return;

    const theme = themes[state.theme];

    // Input → hero motion
    const left = keys["ArrowLeft"] || keys["a"] || ui.buttons.left.pressed;
    const right = keys["ArrowRight"] || keys["d"] || ui.buttons.right.pressed;
    const jumpKey = keys["ArrowUp"] || keys["w"] || keys[" "] || ui.buttons.jump.pressed;
    const sprintKey = keys["Shift"] || ui.buttons.sprint.pressed;

    hero.sprinting = sprintKey && hero.stamina > 0.5;
    const speed = hero.sprinting ? 5.2 * DPR : 3.4 * DPR;

    hero.vx = 0;
    if (left) { hero.vx -= speed; hero.facing = -1; }
    if (right) { hero.vx += speed; hero.facing = 1; }
    hero.vx = clamp(hero.vx, -MAX_VX, MAX_VX);

    if (jumpKey && hero.onGround) hero.vy = JUMP_V;

    // Gravity
    hero.vy = clamp(hero.vy + GRAV, -MAX_VY, MAX_VY);

    // Stamina drain/regeneration (drain/reg by 8 per second target)
    // Assuming ~60 FPS → per frame ~ 8/60 ≈ 0.133
    const perFrame = 8 / 60;
    if (hero.sprinting) hero.stamina = clamp(hero.stamina - perFrame, 0, 100);
    else hero.stamina = clamp(hero.stamina + perFrame * 0.7, 0, 100);

    // Attack
    if ((keys["f"] || ui.buttons.attack.pressed) && !hero.attacking) {
      hero.attacking = true; hero.attackTimer = Math.floor(10);
    }
    if (hero.attacking) {
      hero.attackTimer--;
      if (hero.attackTimer <= 0) hero.attacking = false;
    }

    // Collide with world
    collideMove(hero, platforms);

    // Fall death
    if (hero.y > canvas.height + 200 * DPR) takeDamageOrDie(9999);

    // Spikes damage
    for (const s of spikes) {
      const sh = { x: s.x + 4 * DPR, y: s.y + 4 * DPR, w: s.w - 8 * DPR, h: s.h - 4 * DPR };
      if (AABB(hero, sh)) takeDamageOrDie(8); // health goes down by 8
    }

    // Coins gravity + pickup
    for (const coin of coins) {
      if (coin.taken) continue;
      coin.vy = clamp(coin.vy + GRAV * 0.6, -MAX_VY, MAX_VY);
      coin.y += coin.vy;
      // stop at platforms
      for (const p of platforms) {
        if (coin.y + coin.r > p.y && coin.y - coin.r < p.y + p.h && coin.x > p.x && coin.x < p.x + p.w) {
          coin.y = p.y - coin.r; coin.vy = 0;
        }
      }
      if (circleHitsRect(coin.x, coin.y, coin.r, hero)) {
        coin.taken = true; state.coins++;
      }
    }

    // Powerups gravity + pickup
    for (const pu of powerups) {
      pu.vy = clamp(pu.vy + GRAV * 0.5, -MAX_VY, MAX_VY);
      pu.y += pu.vy;
      for (const p of platforms) {
        if (pu.y + pu.r > p.y && pu.y - pu.r < p.y + p.h && pu.x > p.x && pu.x < p.x + p.w) {
          pu.y = p.y - pu.r; pu.vy = 0;
        }
      }
      if (circleHitsRect(pu.x, pu.y, pu.r, hero)) {
        if (pu.type === "health") hero.health = clamp(hero.health + 20, 0, 100);
        else hero.stamina = clamp(hero.stamina + 25, 0, 100);
        pu.collected = true;
      }
    }
    // cleanup collected powerups
    for (let i = powerups.length - 1; i >= 0; i--) if (powerups[i].collected) powerups.splice(i, 1);

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      e.vy = clamp(e.vy + GRAV, -MAX_VY, MAX_VY);
      // patrol
      e.x += e.vx;
      if (e.x < e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
      if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.vx); }
      collideMove(e, platforms);

      // Check sword hit
      if (hero.attacking) {
        const sword = swordHitbox();
        if (AABB(sword, e)) {
          e.alive = false;
          // drop coins 1-3
          const drops = 1 + (state.level % 3);
          for (let k = 0; k < drops; k++) coins.push(spawnCoin(e.x + e.w / 2 + (k - drops / 2) * 8 * DPR, e.y));
          // 30% chance powerup
          if (Math.random() < 0.3) powerups.push(new Powerup(e.x + e.w / 2, e.y, Math.random() < 0.5 ? "health" : "stamina"));
        }
      }

      // Touch damage
      if (AABB(hero, e) && hero.invuln <= 0) takeDamageOrDie(8); // health down by 8 on hit
    }

    if (hero.invuln > 0) hero.invuln--;

    // Checkpoints
    for (const cp of checkpoints) {
      if (AABB(hero, cp)) { cp.active = true; respawn = { x: cp.x, y: cp.y - hero.h }; }
    }

    // Goal open when all coins collected
    if (goal) {
      goal.open = (state.coins >= state.totalCoins);
      if (goal.open && AABB(hero, goal)) {
        // Next level
        state.level++;
        loadLevel(state.level);
        // change theme every 10 levels happens in loadLevel via Math.floor(level/10)
      }
    }
  }

  function takeDamageOrDie(amount) {
    if (!hero.alive) return;
    if (hero.invuln > 0) return;
    hero.health -= amount; // down by 8 (or more)
    if (hero.health <= 0) {
      // die and respawn
      hero.alive = false;
      setTimeout(() => {
        // reset level section
        loadLevel(state.level);
      }, 400);
    } else {
      hero.invuln = 40;
    }
  }

  function spawnCoin(x, y) {
    const c = new Coin(x, y);
    c.vy = -8 * DPR;
    return c;
  }

  function circleHitsRect(cx, cy, r, rect) {
    const rx = clamp(cx, rect.x, rect.x + rect.w);
    const ry = clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - rx, dy = cy - ry;
    return dx * dx + dy * dy <= r * r;
  }

  function swordHitbox() {
    const len = 24 * DPR;
    if (hero.facing > 0) return { x: hero.x + hero.w, y: hero.y + 6 * DPR, w: len, h: 12 * DPR };
    else return { x: hero.x - len, y: hero.y + 6 * DPR, w: len, h: 12 * DPR };
  }

  // --------- Draw ---------
  function draw() {
    const theme = themes[state.theme];
    // background
    // gradient
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, theme.bg1);
    g.addColorStop(1, theme.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // parallax bands
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + i * 0.02})`;
      ctx.beginPath();
      const baseY = canvas.height * 0.6 + i * 20 * DPR;
      ctx.moveTo(0, canvas.height);
      const t = (state.t * 0.6 + i * 200) * 0.01;
      for (let x = 0; x <= canvas.width; x += 24 * DPR) {
        const y = baseY + Math.sin((x + t) * 0.01) * 14 * (i + 1);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();
    }

    // platforms
    for (const p of platforms) {
      ctx.fillStyle = theme.plat; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = theme.platTop; ctx.fillRect(p.x, p.y, p.w, 3 * DPR);
    }

    // spikes
    ctx.fillStyle = theme.spike;
    for (const s of spikes) {
      const n = Math.max(2, Math.floor(s.w / (12 * DPR)));
      for (let i = 0; i < n; i++) {
        const x = s.x + (i + 0.5) * (s.w / n) - 6 * DPR;
        ctx.beginPath();
        ctx.moveTo(x, s.y + s.h);
        ctx.lineTo(x + 6 * DPR, s.y);
        ctx.lineTo(x + 12 * DPR, s.y + s.h);
        ctx.closePath();
        ctx.fill();
      }
    }

    // coins
    for (const coin of coins) {
      if (coin.taken) continue;
      ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
      ctx.fillStyle = theme.coin; ctx.fill();
      ctx.lineWidth = 2 * DPR; ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.stroke();
      ctx.beginPath(); ctx.arc(coin.x - 3 * DPR, coin.y - 3 * DPR, coin.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill();
    }

    // powerups
    for (const pu of powerups) {
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
      ctx.fillStyle = pu.type === "health" ? "#7CFF5B" : "#62e6ff";
      ctx.fill();
      pixelText(pu.type === "health" ? "H" : "S", pu.x - 5 * DPR, pu.y + 4 * DPR, 10 * DPR, themes[state.theme].bg2);
    }

    // checkpoints
    for (const cp of checkpoints) {
      ctx.fillStyle = cp.active ? "#00f5ff" : "#ff00f7";
      ctx.fillRect(cp.x, cp.y - cp.h, cp.w, cp.h);
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(cp.x, cp.y - cp.h, cp.w, 4 * DPR);
    }

    // goal
    if (goal) {
      ctx.save();
      ctx.translate(goal.x + goal.w / 2, goal.y + goal.h);
      ctx.fillStyle = goal.open ? "#22c55e" : "#6b7280";
      ctx.fillRect(-goal.w / 2, -goal.h, goal.w, goal.h);
      ctx.beginPath(); ctx.arc(0, -goal.h, 6 * DPR, 0, Math.PI * 2); ctx.fillStyle = "#bfc6cf"; ctx.fill();
      ctx.fillStyle = goal.open ? "#22c55e" : "#bfc6cf";
      ctx.beginPath(); ctx.moveTo(0, -goal.h + 6 * DPR); ctx.lineTo(34 * DPR, -goal.h + 16 * DPR); ctx.lineTo(0, -goal.h + 26 * DPR); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // hero
    if (hero.alive) {
      if (hero.invuln > 0 && Math.floor(hero.invuln / 6) % 2 === 0) ctx.globalAlpha = 0.4;
      ctx.fillStyle = themes[state.theme].hero;
      roundedRect(hero.x, hero.y, hero.w, hero.h, 4 * DPR);
      ctx.fill();
      ctx.globalAlpha = 1;

      // sword
      if (hero.attacking) {
        const s = swordHitbox();
        ctx.fillStyle = "#ffd166";
        roundedRect(s.x, s.y, s.w, s.h, 2 * DPR);
        ctx.fill();
      }

      // eyes
      ctx.fillStyle = "#0b1024";
      const eo = hero.facing > 0 ? 5 * DPR : -5 * DPR;
      ctx.beginPath(); ctx.arc(hero.x + hero.w / 2 - 6 * DPR + eo, hero.y + 8 * DPR, 2.5 * DPR, 0, Math.PI * 2);
      ctx.arc(hero.x + hero.w / 2 + 6 * DPR + eo, hero.y + 8 * DPR, 2.5 * DPR, 0, Math.PI * 2); ctx.fill();
    }

    // enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = themes[state.theme].enemy;
      roundedRect(e.x, e.y, e.w, e.h, 3 * DPR);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.fillRect(e.x, e.y + e.h - 4 * DPR, e.w, 4 * DPR);
    }

    // HUD (health, stamina, coins, level)
    drawBarsAndHUD();

    // Mobile buttons
    drawMobileButtons();

    // Menu overlay
    if (state.mode === "menu") drawStartScreen();
  }

  function drawBarsAndHUD() {
    const theme = themes[state.theme];
    const x = 16 * DPR, y = 16 * DPR, w = 240 * DPR, h = 16 * DPR, gap = 10 * DPR;

    // Health bar
    bar(x, y, w, h, "#1f2937", "#ef4444", hero.health / 100);
    pixelText("HEALTH", x, y - 4 * DPR, 10 * DPR, theme.ui);

    // Stamina bar
    bar(x, y + h + gap, w, h, "#1f2937", "#22d3ee", hero.stamina / 100);
    pixelText("STAMINA (Shift)", x, y + h + gap - 4 * DPR, 10 * DPR, theme.ui);

    // Coins & level
    pixelText(`COINS: ${state.coins}/${state.totalCoins}`, x, y + (h + gap) * 2 + 18 * DPR, 12 * DPR, theme.ui);
    pixelText(`LEVEL: ${state.level + 1}`, x, y + (h + gap) * 2 + 34 * DPR, 12 * DPR, theme.ui);
  }

  function bar(x, y, w, h, bg, fg, pct) {
    ctx.fillStyle = bg; roundedRect(x, y, w, h, 3 * DPR); ctx.fill();
    ctx.fillStyle = fg; roundedRect(x, y, w * clamp(pct, 0, 1), h, 3 * DPR); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 2 * DPR; roundedRect(x, y, w, h, 3 * DPR); ctx.stroke();
  }

  function roundedRect(x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function pixelText(text, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = `${size}px monospace`;
    ctx.imageSmoothingEnabled = false;
    ctx.fillText(text, x, y);
  }

  function drawStartScreen() {
    const theme = themes[Math.floor(state.level / 10) % themes.length] || themes[0];
    // Dim background
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    const title = "BLOCKY PLATFORMER";
    pixelText(title, canvas.width / 2 - measureText(title, 28 * DPR) / 2, canvas.height * 0.35, 28 * DPR, theme.ui);

    // Start button (pixely)
    const w = 220 * DPR, h = 64 * DPR;
    const x = canvas.width / 2 - w / 2, y = canvas.height * 0.5;
    ui.startBtn = { x, y, w, h };
    ctx.fillStyle = "#2b2b2b"; roundedRect(x, y, w, h, 6 * DPR); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 3 * DPR; roundedRect(x, y, w, h, 6 * DPR); ctx.stroke();
    const label = "START";
    pixelText(label, canvas.width / 2 - measureText(label, 20 * DPR) / 2, y + h / 2 + 7 * DPR, 20 * DPR, "#ffffff");
    pixelText("Keyboard: ← → / ↑, F=attack, Shift=sprint", canvas.width / 2 - measureText("Keyboard: ← → / ↑, F=attack, Shift=sprint", 10 * DPR) / 2, y + h + 30 * DPR, 10 * DPR, theme.ui);
    pixelText("Touch: use on-screen buttons", canvas.width / 2 - measureText("Touch: use on-screen buttons", 10 * DPR) / 2, y + h + 46 * DPR, 10 * DPR, theme.ui);
  }

  function measureText(text, size) {
    ctx.font = `${size}px monospace`;
    return ctx.measureText(text).width;
  }

  function drawMobileButtons() {
    positionButtons();
    const b = ui.buttons;
    const pad = 6 * DPR;

    // Only draw on small screens (or always for simplicity)
    const setStyle = (pressed) => {
      ctx.globalAlpha = pressed ? 0.8 : 0.5;
      ctx.fillStyle = "#222";
      ctx.strokeStyle = "rgba(255,255,255,.25)";
      ctx.lineWidth = 3 * DPR;
    };

    for (const k of Object.keys(b)) {
      const btn = b[k];
      setStyle(btn.pressed);
      roundedRect(btn.x, btn.y, btn.w, btn.h, 12 * DPR); ctx.fill(); ctx.stroke();
      const icon = k === "left" ? "◀" : k === "right" ? "▶" : k === "jump" ? "⤴" : k === "attack" ? "⚔" : "🏃";
      pixelText(icon, btn.x + btn.w / 2 - measureText(icon, 20 * DPR) / 2, btn.y + btn.h / 2 + 8 * DPR, 20 * DPR, "#fff");
    }
    ctx.globalAlpha = 1;
  }

  function handleTouchButtons(type, e) {
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const x = (t.clientX - rect.left) * DPR, y = (t.clientY - rect.top) * DPR;
      toggleButtonsByPoint(type, x, y);
    }
  }
  function handlePointerButtons(type, e) {
    const { x, y } = pointerXY(e);
    toggleButtonsByPoint(type, x, y);
  }
  function toggleButtonsByPoint(type, x, y) {
    const b = ui.buttons;
    for (const k of Object.keys(b)) {
      const btn = b[k];
      if (pointInRect(x, y, btn)) {
        if (type === "down") {
          btn.pressed = true;
          if (k === "attack") hero.attacking = true, hero.attackTimer = 10;
        } else btn.pressed = false;
      } else if (type === "up") btn.pressed = false;
    }
  }

  // --------- Loop ---------
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  loadLevel(0);
  loop();
})();






Ask ChatGPT
