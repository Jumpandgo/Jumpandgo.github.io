// ... [Setup code is unchanged above this point]

// Game loop
function update() {
  // Handle horizontal movement
  if (keys["ArrowLeft"] || keys["KeyA"]) {
    player.dx = -PLAYER_SPEED;
  } else if (keys["ArrowRight"] || keys["KeyD"]) {
    player.dx = PLAYER_SPEED;
  } else {
    player.dx *= FRICTION;
    if (Math.abs(player.dx) < 0.1) player.dx = 0;
  }

  // Jumping
  if ((keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) && player.grounded) {
    player.dy = -JUMP_POWER;
    player.jumping = true;
    player.grounded = false;
  }

  // Gravity
  player.dy += GRAVITY;

  // ---- Separate axis movement and collision ----

  // Horizontal movement and collision
  player.x += player.dx;
  for (let plat of platforms) {
    if (rectCollide(player, plat)) {
      if (player.dx > 0) {
        player.x = plat.x - player.w;
      } else if (player.dx < 0) {
        player.x = plat.x + plat.w;
      }
      player.dx = 0;
    }
  }

  // Vertical movement and collision
  player.y += player.dy;
  player.grounded = false;
  for (let plat of platforms) {
    if (rectCollide(player, plat)) {
      if (player.dy > 0) {
        // Falling down, landed on top
        player.y = plat.y - player.h;
        player.dy = 0;
        player.jumping = false;
        player.grounded = true;
      } else if (player.dy < 0) {
        // Moving up, hit bottom
        player.y = plat.y + plat.h;
        player.dy = 0;
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

// ... [draw and other code unchanged]
