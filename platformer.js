// Simple JavaScript Platformer Game (No dependencies, runs in browser)
// To run: Save as platformer.js, create an index.html, and include via <script src="platformer.js"></script>

window.onload = function () {
  // Canvas setup
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 400;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Game constants
  const GRAVITY = 0.7;
  const FRICTION = 0.8;
  const PLAYER_SPEED = 4;
  const JUMP_POWER = 12;

  // Key states
  const keys = {};

  // Basic platform data
  const platforms = [
    { x: 0, y: 350, w: 800, h: 50 },
    { x: 150, y: 280, w: 100, h: 20 },
    { x: 300, y: 220, w: 120, h: 20 },
    { x: 500, y: 160, w: 100, h: 20 },
    { x: 700, y: 300, w: 80, h: 20 },
  ];

  // Player object
  const player = {
    x: 50,
    y: 300,
    w: 32,
    h: 32,
    color: "#3498db",
    dx: 0,
    dy: 0,
    jumping: false,
    grounded: false,
  };

  // Input handling
  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;
  });
  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  function rectCollide(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  // Game loop
  function update() {
    // Handle horizontal movement
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      player.dx = -PLAYER_SPEED;
    } else if (keys["ArrowRight"] || keys["KeyD"]) {
      player.dx = PLAYER_SPEED;
    } else {
      player.dx *= FRICTION;
    }

    // Jumping
    if ((keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) && player.grounded) {
      player.dy = -JUMP_POWER;
      player.jumping = true;
      player.grounded = false;
    }

    // Gravity
    player.dy += GRAVITY;

    // Move player
    player.x += player.dx;
    player.y += player.dy;

    // Collisions
    player.grounded = false;
    for (let plat of platforms) {
      let dir = "";
      if (rectCollide(player, plat)) {
        // Simple collision response
        if (player.dy > 0 && player.y + player.h <= plat.y + player.dy) {
          // Landed on top
          player.y = plat.y - player.h;
          player.dy = 0;
          player.jumping = false;
          player.grounded = true;
        } else if (player.dy < 0 && player.y >= plat.y + plat.h - player.dy) {
          // Hit bottom
          player.y = plat.y + plat.h;
          player.dy = 0;
        } else if (player.dx > 0) {
          // Hit left side
          player.x = plat.x - player.w;
          player.dx = 0;
        } else if (player.dx < 0) {
          // Hit right side
          player.x = plat.x + plat.w;
          player.dx = 0;
        }
      }
    }

    // Prevent going off screen
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    if (player.y + player.h > canvas.height) {
      player.y = canvas.height - player.h;
      player.dy = 0;
      player.grounded = true;
      player.jumping = false;
    }

    draw();
    requestAnimationFrame(update);
  }

  // Rendering
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = "#2ecc71";
    for (let plat of platforms) {
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Instructions
    ctx.fillStyle = "#333";
    ctx.font = "18px monospace";
    ctx.fillText("Arrow keys or WASD to move and jump!", 20, 30);
  }

  update();
};
