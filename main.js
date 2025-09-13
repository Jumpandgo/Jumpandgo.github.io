// Phaser.js Modern Platformer Demo
const LEVELS = [
  {
    platforms: [
      { x: 50, y: 550, width: 700, height: 40 },
      { x: 200, y: 450, width: 120, height: 20 },
      { x: 400, y: 350, width: 120, height: 20 },
      { x: 600, y: 250, width: 120, height: 20 }
    ],
    coins: [
      { x: 230, y: 410 }, { x: 430, y: 310 }, { x: 630, y: 210 }
    ],
    goal: { x: 700, y: 180 }
  },
  {
    platforms: [
      { x: 50, y: 550, width: 700, height: 40 },
      { x: 120, y: 420, width: 120, height: 20 },
      { x: 500, y: 480, width: 120, height: 20 },
      { x: 350, y: 350, width: 120, height: 20 },
      { x: 600, y: 220, width: 120, height: 20 }
    ],
    coins: [
      { x: 150, y: 380 }, { x: 530, y: 440 }, { x: 380, y: 310 }, { x: 630, y: 180 }
    ],
    goal: { x: 720, y: 170 }
  }
];

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: [StartScreen, PlatformerLevel, LevelComplete]
};

let currentLevel = 0;
let totalScore = 0;

function StartScreen() {
  Phaser.Scene.call(this, { key: 'StartScreen' });
}
StartScreen.prototype = Object.create(Phaser.Scene.prototype);
StartScreen.prototype.constructor = StartScreen;
StartScreen.prototype.preload = function() {
  this.load.image('bg', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/skies/space3.png');
  this.load.image('button', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/ui/button.png');
};
StartScreen.prototype.create = function() {
  this.add.image(400, 300, 'bg').setScale(1.1);
  this.add.text(400, 180, 'Modern Platformer', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
  this.add.text(400, 250, 'Press PLAY to Start', { fontSize: '28px', fill: '#fff' }).setOrigin(0.5);
  const playBtn = this.add.sprite(400, 350, 'button').setInteractive().setScale(0.7);
  this.add.text(400, 350, 'PLAY', { fontSize: '32px', fill: '#222' }).setOrigin(0.5);

  playBtn.on('pointerdown', () => {
    this.scene.start('PlatformerLevel', { level: 0, score: 0 });
  });
};

function PlatformerLevel() {
  Phaser.Scene.call(this, { key: 'PlatformerLevel' });
}
PlatformerLevel.prototype = Object.create(Phaser.Scene.prototype);
PlatformerLevel.prototype.constructor = PlatformerLevel;
PlatformerLevel.prototype.init = function(data) {
  this.levelIndex = data.level;
  this.score = data.score || 0;
}
PlatformerLevel.prototype.preload = function() {
  this.load.image('bg', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/skies/space3.png');
  this.load.image('ground', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/sprites/platform.png');
  this.load.spritesheet('player', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/sprites/phaser-dude.png', { frameWidth: 32, frameHeight: 48 });
  this.load.image('coin', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/sprites/coin.png');
  this.load.image('goal', 'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples/public/assets/sprites/star.png');
};
PlatformerLevel.prototype.create = function() {
  this.add.image(400, 300, 'bg').setScale(1.1);
  this.platforms = this.physics.add.staticGroup();
  LEVELS[this.levelIndex].platforms.forEach(p => {
    this.platforms.create(p.x + p.width/2, p.y, 'ground').setScale(p.width/400, p.height/32).refreshBody();
  });

  this.player = this.physics.add.sprite(80, 500, 'player');
  this.player.setBounce(0.15);
  this.player.setCollideWorldBounds(true);

  this.anims.create({
    key: 'left', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
    frameRate: 10, repeat: -1
  });
  this.anims.create({
    key: 'turn', frames: [ { key: 'player', frame: 4 } ],
    frameRate: 20
  });
  this.anims.create({
    key: 'right', frames: this.anims.generateFrameNumbers('player', { start: 5, end: 8 }),
    frameRate: 10, repeat: -1
  });

  this.physics.add.collider(this.player, this.platforms);

  this.cursors = this.input.keyboard.createCursorKeys();

  // Coins
  this.coins = this.physics.add.group();
  LEVELS[this.levelIndex].coins.forEach(c => {
    let coin = this.coins.create(c.x, c.y, 'coin');
    coin.body.setAllowGravity(false);
  });
  this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

  // Goal
  this.goal = this.physics.add.sprite(LEVELS[this.levelIndex].goal.x, LEVELS[this.levelIndex].goal.y, 'goal').setScale(1.3);
  this.goal.body.setAllowGravity(false);
  this.physics.add.overlap(this.player, this.goal, this.reachGoal, null, this);

  // UI
  this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, { fontSize: '24px', fill: '#fff' });
  this.levelText = this.add.text(650, 16, `Level ${this.levelIndex+1}`, { fontSize: '24px', fill: '#fff' });

  this.gameOver = false;
};

PlatformerLevel.prototype.update = function() {
  if (this.gameOver) return;
  if (this.cursors.left.isDown) {
    this.player.setVelocityX(-200);
    this.player.anims.play('left', true);
  } else if (this.cursors.right.isDown) {
    this.player.setVelocityX(200);
    this.player.anims.play('right', true);
  } else {
    this.player.setVelocityX(0);
    this.player.anims.play('turn');
  }
  if (this.cursors.up.isDown && this.player.body.touching.down) {
    this.player.setVelocityY(-400);
  }
};

PlatformerLevel.prototype.collectCoin = function(player, coin) {
  coin.disableBody(true, true);
  this.score += 10;
  this.scoreText.setText(`Score: ${this.score}`);
};

PlatformerLevel.prototype.reachGoal = function(player, goal) {
  this.gameOver = true;
  totalScore += this.score;
  if (this.levelIndex + 1 < LEVELS.length) {
    this.scene.start('LevelComplete', { nextLevel: this.levelIndex + 1, score: totalScore });
  } else {
    this.scene.start('LevelComplete', { nextLevel: null, score: totalScore });
  }
};

function LevelComplete() {
  Phaser.Scene.call(this, { key: 'LevelComplete' });
}
LevelComplete.prototype = Object.create(Phaser.Scene.prototype);
LevelComplete.prototype.constructor = LevelComplete;
LevelComplete.prototype.init = function(data) {
  this.nextLevel = data.nextLevel;
  this.score = data.score;
}
LevelComplete.prototype.create = function() {
  this.add.rectangle(400, 300, 800, 600, 0x222244, 0.8);
  if (this.nextLevel !== null) {
    this.add.text(400, 220, 'Level Complete!', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
    this.add.text(400, 300, `Score: ${this.score}`, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    const nextBtn = this.add.text(400, 380, 'Next Level', { fontSize: '32px', fill: '#88f' }).setOrigin(0.5).setInteractive();
    nextBtn.on('pointerdown', () => {
      this.scene.start('PlatformerLevel', { level: this.nextLevel, score: 0 });
    });
  } else {
    this.add.text(400, 220, 'You Win!', { fontSize: '48px', fill: '#fff' }).setOrigin(0.5);
    this.add.text(400, 300, `Total Score: ${this.score}`, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
    const restartBtn = this.add.text(400, 380, 'Restart Game', { fontSize: '32px', fill: '#88f' }).setOrigin(0.5).setInteractive();
    restartBtn.on('pointerdown', () => {
      totalScore = 0;
      this.scene.start('StartScreen');
    });
  }
};

new Phaser.Game(config);
