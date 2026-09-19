import Phaser from 'phaser';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from './firebase-config.js';

const CANDIES = [
  { emoji: '🔫', color: 0x8b3a1a },
  { emoji: '💣', color: 0x6b1f1f },
  { emoji: '🗡️', color: 0x5c4a2e },
  { emoji: '🛡️', color: 0x3d3226 },
  { emoji: '⭐', color: 0xb3540e },
  { emoji: '💎', color: 0x4a3728 }
];

const THEME = {
  bg: '#0a0806',
  panel: '#1a140e',
  accent: '#c1440e',
  accentBright: '#ff8c42',
  text: '#f0e6d8',
  textDim: '#8a7a68',
  danger: '#8b0000'
};

const BOARD_SIZE = 560;
const TOP_OFFSET = 70;
const TILE_GAP = 6;

const LEVELS = [
  { id: 1, gridSize: 5, moves: 15, star1: 200, star2: 400, star3: 600 },
  { id: 2, gridSize: 5, moves: 15, star1: 250, star2: 500, star3: 750 },
  { id: 3, gridSize: 6, moves: 18, star1: 300, star2: 600, star3: 900 },
  { id: 4, gridSize: 6, moves: 18, star1: 350, star2: 700, star3: 1050 },
  { id: 5, gridSize: 6, moves: 20, star1: 400, star2: 800, star3: 1200 },
  { id: 6, gridSize: 7, moves: 20, star1: 450, star2: 900, star3: 1350 },
  { id: 7, gridSize: 7, moves: 22, star1: 500, star2: 1000, star3: 1500 },
  { id: 8, gridSize: 7, moves: 22, star1: 550, star2: 1100, star3: 1650 },
  { id: 9, gridSize: 8, moves: 25, star1: 600, star2: 1200, star3: 1800 },
  { id: 10, gridSize: 8, moves: 25, star1: 700, star2: 1400, star3: 2100 }
];

function getStars(level, score) {
  if (score >= level.star3) return 3;
  if (score >= level.star2) return 2;
  if (score >= level.star1) return 1;
  return 0;
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('rageAssistProgress') || '{}'); } catch { return {}; }
}

function saveProgress(levelId, stars) {
  const progress = loadProgress();
  if (!progress[levelId] || progress[levelId] < stars) {
    progress[levelId] = stars;
    localStorage.setItem('rageAssistProgress', JSON.stringify(progress));
  }
}

function nameToEmail(name) {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean + '@rageassist.local';
}

let currentUser = null;
let authMode = 'signup';

function setupAuthModal(onAuthChange) {
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-title');
  const nameInput = document.getElementById('auth-name');
  const passInput = document.getElementById('auth-password');
  const message = document.getElementById('auth-message');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleBtn = document.getElementById('auth-toggle-btn');
  const closeBtn = document.getElementById('auth-close-btn');

  window.openAuthModal = () => {
    modal.style.display = 'flex';
    message.textContent = '';
    nameInput.value = '';
    passInput.value = '';
  };

  closeBtn.onclick = () => { modal.style.display = 'none'; };

  toggleBtn.onclick = () => {
    authMode = authMode === 'signup' ? 'login' : 'signup';
    title.textContent = authMode === 'signup' ? 'Create Guest Account' : 'Login';
    submitBtn.textContent = authMode === 'signup' ? 'Sign Up' : 'Login';
    toggleBtn.textContent = authMode === 'signup' ? 'Already have an account? Login' : 'New here? Sign Up';
    message.textContent = '';
  };

  submitBtn.onclick = async () => {
    const name = nameInput.value.trim();
    const password = passInput.value;

    if (!name || password.length < 6) {
      message.textContent = 'Name required, password min 6 chars';
      return;
    }

    const email = nameToEmail(name);
    message.textContent = 'Please wait...';

    try {
      let userCred;
      if (authMode === 'signup') {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        currentUser = { name };
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
        currentUser = { name: userCred.user.displayName || name };
      }

      localStorage.setItem('rageAssistUser', JSON.stringify(currentUser));
      modal.style.display = 'none';
      onAuthChange();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') message.textContent = 'Name already taken, try login';
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') message.textContent = 'Wrong password';
      else if (err.code === 'auth/user-not-found') message.textContent = 'No account found, sign up first';
      else message.textContent = 'Error: ' + err.code;
    }
  };
}

// Ambient smoke + embers ek scene ke background mein — koi bhi scene ye call kar sakta hai
function addBattlefieldAmbience(scene) {
  const { width, height } = scene.scale;

  // Smoke puffs — dhundhla grey circles jo slowly upar drift karte hain
  for (let i = 0; i < 5; i++) {
    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(height * 0.5, height);
    const smoke = scene.add.circle(x, y, Phaser.Math.Between(60, 110), 0x3a3028, 0.06);
    scene.tweens.add({
      targets: smoke,
      y: y - Phaser.Math.Between(150, 300),
      x: x + Phaser.Math.Between(-40, 40),
      alpha: 0,
      duration: Phaser.Math.Between(6000, 10000),
      repeat: -1,
      delay: Phaser.Math.Between(0, 3000)
    });
  }

  // Embers — chhote orange particles jo upar udte hain
  for (let i = 0; i < 10; i++) {
    const x = Phaser.Math.Between(0, width);
    const ember = scene.add.circle(x, height + 10, Phaser.Math.Between(2, 4), 0xff8c42, 0.7);
    const rise = () => {
      ember.y = height + 10;
      ember.x = Phaser.Math.Between(0, width);
      ember.alpha = 0.7;
      scene.tweens.add({
        targets: ember,
        y: -20,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        onComplete: rise
      });
    };
    scene.time.delayedCall(Phaser.Math.Between(0, 4000), rise);
  }
}

// Rugged battlefield-style button banata hai (border ke saath)
function makeButton(scene, x, y, text, bgColor, textColor, fontSize) {
  const padX = 24, padY = 10;
  const label = scene.add.text(0, 0, text, {
    fontSize: fontSize || '22px', color: textColor || THEME.text, fontStyle: 'bold', fontFamily: 'Georgia'
  }).setOrigin(0.5);

  const w = label.width + padX * 2;
  const h = label.height + padY * 2;

  const bg = scene.add.graphics();
  bg.fillStyle(bgColor, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
  bg.lineStyle(2, 0xc1440e, 0.8);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);

  const container = scene.add.container(x, y, [bg, label]);
  const hitZone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  container.add(hitZone);

  container.hitZone = hitZone;
  return container;
}

// Match size ke hisab se popup message
function matchMessage(count) {
  if (count >= 5) return { text: 'OVERPOWERED!', color: '#ff2222', size: 34 };
  if (count === 4) return { text: 'DAMN!', color: '#ff8c42', size: 28 };
  return { text: 'GOOD!', color: '#ffd93d', size: 22 };
}

// ===================== MENU SCENE =====================
class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width, height } = this.scale;
    addBattlefieldAmbience(this);

    this.add.text(width / 2, height / 2 - 130, 'RAGE ASSIST', {
      fontSize: '46px', color: THEME.accentBright, fontStyle: 'bold', fontFamily: 'Georgia'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 80, '🔫💣🗡️⭐💎', { fontSize: '30px' }).setOrigin(0.5);

    const startBtn = makeButton(this, width / 2, height / 2 + 30, '▶ START', 0xc1440e, '#fff', '30px');
    const settingsBtn = makeButton(this, width / 2, height / 2 + 100, '⚙ SETTINGS', 0x3d3226, THEME.text, '22px');

    startBtn.hitZone.on('pointerdown', () => this.scene.start('LevelSelectScene'));
    settingsBtn.hitZone.on('pointerdown', () => this.scene.start('SettingsScene'));
  }
}

// ===================== SETTINGS SCENE =====================
class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    const { width, height } = this.scale;
    addBattlefieldAmbience(this);

    this.add.text(width / 2, height / 2 - 120, 'SETTINGS', {
      fontSize: '34px', color: THEME.accentBright, fontStyle: 'bold', fontFamily: 'Georgia'
    }).setOrigin(0.5);

    const saved = localStorage.getItem('rageAssistUser');
    const user = saved ? JSON.parse(saved) : null;

    if (user) {
      this.add.text(width / 2, height / 2 - 50, 'Logged in as: ' + user.name, {
        fontSize: '17px', color: '#8fc97a'
      }).setOrigin(0.5);

      const logoutBtn = makeButton(this, width / 2, height / 2 + 10, 'LOGOUT', 0x6b1f1f, '#fff', '18px');
      logoutBtn.hitZone.on('pointerdown', () => {
        localStorage.removeItem('rageAssistUser');
        currentUser = null;
        this.scene.restart();
      });
    } else {
      this.add.text(width / 2, height / 2 - 50, 'Not logged in', { fontSize: '15px', color: THEME.textDim }).setOrigin(0.5);

      const accountBtn = makeButton(this, width / 2, height / 2 + 20, '👤 SIGN UP / LOGIN', 0x3d3226, THEME.text, '18px');
      accountBtn.hitZone.on('pointerdown', () => window.openAuthModal());
    }

    const backBtn = makeButton(this, width / 2, height / 2 + 100, '⬅ BACK', 0x2b2118, THEME.textDim, '18px');
    backBtn.hitZone.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}

// ===================== LEVEL SELECT SCENE =====================
class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    const { width } = this.scale;
    addBattlefieldAmbience(this);
    const progress = loadProgress();

    this.add.text(width / 2, 40, 'SELECT LEVEL', {
      fontSize: '28px', color: THEME.accentBright, fontStyle: 'bold', fontFamily: 'Georgia'
    }).setOrigin(0.5);

    const cols = 5;
    const spacing = 100;
    const startX = width / 2 - ((cols - 1) * spacing) / 2;
    const startY = 130;

    LEVELS.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacing;
      const y = startY + row * 130;

      const stars = progress[level.id] || 0;

      const bg = this.add.graphics();
      bg.fillStyle(0x3d3226, 1);
      bg.fillCircle(x, y, 34);
      bg.lineStyle(2, 0xc1440e, 0.8);
      bg.strokeCircle(x, y, 34);

      const hitZone = this.add.zone(x, y, 68, 68).setInteractive({ useHandCursor: true });
      this.add.text(x, y, String(level.id), { fontSize: '22px', color: THEME.text, fontStyle: 'bold' }).setOrigin(0.5);

      const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      this.add.text(x, y + 42, starDisplay, { fontSize: '14px' }).setOrigin(0.5);

      hitZone.on('pointerdown', () => this.scene.start('GameScene', { level }));
    });

    const backBtn = makeButton(this, width / 2, startY + Math.ceil(LEVELS.length / cols) * 130 + 20, '⬅ MENU', 0x2b2118, THEME.textDim, '18px');
    backBtn.hitZone.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}

// ===================== GAME SCENE =====================
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.level = data.level;
    this.gridSize = this.level.gridSize;
    this.tileSize = (BOARD_SIZE - TILE_GAP * (this.gridSize + 1)) / this.gridSize;
    this.movesLeft = this.level.moves;
    this.score = 0;
    this.selectedTile = null;
    this.inputLocked = false;
    this.grid = [];
  }

  getX(col) { return col * (this.tileSize + TILE_GAP) + this.tileSize / 2 + TILE_GAP; }
  getY(row) { return row * (this.tileSize + TILE_GAP) + this.tileSize / 2 + TILE_GAP + TOP_OFFSET; }

  drawTile(row, col, candyIndex) {
    const x = this.getX(col);
    const y = this.getY(row);

    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const icon = this.add.text(0, 0, '', { fontSize: Math.floor(this.tileSize * 0.5) + 'px' }).setOrigin(0.5);

    container.add([bg, icon]);
    const hitZone = this.add.zone(0, 0, this.tileSize, this.tileSize).setInteractive();
    container.add(hitZone);

    const tileData = { candyIndex, container, bg, icon, hitZone, row, col };
    hitZone.on('pointerdown', () => this.onTileClick(tileData));

    this.paintTile(tileData);
    return tileData;
  }

  paintTile(tileData) {
    const candy = CANDIES[tileData.candyIndex];
    const s = this.tileSize;
    tileData.bg.clear();
    tileData.bg.fillStyle(candy.color, 1);
    tileData.bg.fillRoundedRect(-s / 2, -s / 2, s, s, 10);
    tileData.bg.lineStyle(2, 0xc1440e, 0.5);
    tileData.bg.strokeRoundedRect(-s / 2, -s / 2, s, s, 10);
    tileData.icon.setText(candy.emoji);
  }

  highlightTile(tileData, on) { tileData.container.setScale(on ? 1.1 : 1); }

  swapData(a, b) { const t = a.candyIndex; a.candyIndex = b.candyIndex; b.candyIndex = t; this.paintTile(a); this.paintTile(b); }
  swapDataOnly(a, b) { const t = a.candyIndex; a.candyIndex = b.candyIndex; b.candyIndex = t; }

  spawnEffect(type, x, y) {
    const s = this;
    switch (type) {
      case 0: {
        const flash = s.add.circle(x, y, 8, 0xffff66, 0.9);
        s.tweens.add({ targets: flash, scale: 2.5, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
        break;
      }
      case 1: {
        s.cameras.main.shake(150, 0.006);
        const boom = s.add.text(x, y, '💥', { fontSize: '44px' }).setOrigin(0.5).setScale(0.4);
        s.tweens.add({ targets: boom, scale: 1.4, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
        break;
      }
      case 2: {
        const clash = s.add.text(x, y, '⚔️', { fontSize: '32px' }).setOrigin(0.5).setAngle(-30).setScale(0.6);
        s.tweens.add({ targets: clash, angle: 30, scale: 1.2, alpha: 0, duration: 280, onComplete: () => clash.destroy() });
        break;
      }
      case 4: {
        const bigStar = s.add.text(x, y, '⭐', { fontSize: '32px' }).setOrigin(0.5);
        s.tweens.add({ targets: bigStar, scale: 2.6, alpha: 0, duration: 350, onComplete: () => bigStar.destroy() });
        break;
      }
      case 5: {
        for (let i = 0; i < 3; i++) {
          const gemX = x + Phaser.Math.Between(-25, 25);
          const gem = s.add.text(gemX, -10, '💎', { fontSize: '20px' }).setOrigin(0.5);
          s.tweens.add({ targets: gem, y: TOP_OFFSET + BOARD_SIZE + 20, duration: 600, delay: i * 50, onComplete: () => gem.destroy() });
        }
        break;
      }
      default: {
        const spark = s.add.text(x, y, '✨', { fontSize: '24px' }).setOrigin(0.5).setScale(0.5);
        s.tweens.add({ targets: spark, scale: 1.2, alpha: 0, duration: 250, onComplete: () => spark.destroy() });
      }
    }
  }

  showMatchPopup(count, x, y) {
    const msg = matchMessage(count);
    const popup = this.add.text(x, y, msg.text, {
      fontSize: msg.size + 'px', color: msg.color, fontStyle: 'bold', fontFamily: 'Georgia',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setScale(0.3).setAngle(-6);

    this.tweens.add({
      targets: popup,
      scale: 1,
      angle: 0,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: popup,
          y: y - 30,
          alpha: 0,
          duration: 500,
          delay: 300,
          onComplete: () => popup.destroy()
        });
      }
    });
  }

  findMatches() {
    const matched = new Set();
    const gs = this.gridSize;

    for (let row = 0; row < gs; row++) {
      let count = 1;
      for (let col = 1; col <= gs; col++) {
        const same = col < gs && this.grid[row][col].candyIndex === this.grid[row][col - 1].candyIndex;
        if (same) count++;
        else { if (count >= 3) for (let k = col - count; k < col; k++) matched.add(this.grid[row][k]); count = 1; }
      }
    }
    for (let col = 0; col < gs; col++) {
      let count = 1;
      for (let row = 1; row <= gs; row++) {
        const same = row < gs && this.grid[row][col].candyIndex === this.grid[row - 1][col].candyIndex;
        if (same) count++;
        else { if (count >= 3) for (let k = row - count; k < row; k++) matched.add(this.grid[k][col]); count = 1; }
      }
    }
    return matched;
  }

  hasPossibleMoves() {
    const gs = this.gridSize;
    for (let row = 0; row < gs; row++) {
      for (let col = 0; col < gs; col++) {
        if (col < gs - 1) {
          this.swapDataOnly(this.grid[row][col], this.grid[row][col + 1]);
          const found = this.findMatches().size > 0;
          this.swapDataOnly(this.grid[row][col], this.grid[row][col + 1]);
          if (found) return true;
        }
        if (row < gs - 1) {
          this.swapDataOnly(this.grid[row][col], this.grid[row + 1][col]);
          const found = this.findMatches().size > 0;
          this.swapDataOnly(this.grid[row][col], this.grid[row + 1][col]);
          if (found) return true;
        }
      }
    }
    return false;
  }

  checkDeadlockAndReshuffle() {
    if (this.hasPossibleMoves()) return;
    this.triggerStormReshuffle();
  }

  triggerStormReshuffle() {
    this.inputLocked = true;
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    const msg = this.add.text(width / 2, height / 2 - 20, '⛈ NO MOVES LEFT ⛈', { fontSize: '26px', color: THEME.accentBright, fontStyle: 'bold' }).setOrigin(0.5);
    const subMsg = this.add.text(width / 2, height / 2 + 20, 'Reshuffling...', { fontSize: '16px', color: THEME.text }).setOrigin(0.5);

    this.tweens.add({ targets: msg, scale: 1.15, yoyo: true, repeat: 3, duration: 250 });

    const drops = [];
    for (let i = 0; i < 18; i++) {
      const dropX = Phaser.Math.Between(0, width);
      const drop = this.add.rectangle(dropX, -20, 2, 20, 0x666666, 0.7);
      drops.push(drop);
      this.tweens.add({ targets: drop, y: height + 20, duration: Phaser.Math.Between(500, 900), repeat: 2, delay: Phaser.Math.Between(0, 400) });
    }

    this.time.delayedCall(1800, () => {
      const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.9);
      this.cameras.main.shake(200, 0.01);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    });

    this.time.delayedCall(2000, () => {
      overlay.destroy(); msg.destroy(); subMsg.destroy();
      drops.forEach((d) => d.destroy());
      this.reshuffleBoard();
    });
  }

  reshuffleBoard() {
    const gs = this.gridSize;
    let allValues = [];
    for (let row = 0; row < gs; row++) for (let col = 0; col < gs; col++) allValues.push(this.grid[row][col].candyIndex);

    let attempts = 0, valid = false;
    while (!valid && attempts < 50) {
      for (let i = allValues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allValues[i], allValues[j]] = [allValues[j], allValues[i]];
      }
      let idx = 0;
      for (let row = 0; row < gs; row++) for (let col = 0; col < gs; col++) this.grid[row][col].candyIndex = allValues[idx++];
      valid = this.findMatches().size === 0 && this.hasPossibleMoves();
      attempts++;
    }

    for (let row = 0; row < gs; row++) {
      for (let col = 0; col < gs; col++) {
        const tile = this.grid[row][col];
        this.paintTile(tile);
        tile.container.setScale(0.5);
        this.tweens.add({ targets: tile.container, scale: 1, duration: 200, delay: (row + col) * 15 });
      }
    }
    this.inputLocked = false;
  }

  processMatches() {
    const matched = this.findMatches();
    if (matched.size === 0) {
      this.inputLocked = false;
      if (this.movesLeft <= 0) this.endLevel();
      else this.checkDeadlockAndReshuffle();
      return;
    }

    this.inputLocked = true;
    this.score += matched.size * 10;
    this.scoreText.setText('Score: ' + this.score);

    // Popup message ek baar, matched group ke center pe
    let sumX = 0, sumY = 0;
    matched.forEach((tile) => { sumX += tile.container.x; sumY += tile.container.y; });
    this.showMatchPopup(matched.size, sumX / matched.size, sumY / matched.size);

    matched.forEach((tile) => {
      this.spawnEffect(tile.candyIndex, tile.container.x, tile.container.y);
      tile.container.setScale(0);
      tile.candyIndex = null;
    });

    this.applyGravity();
  }

  applyGravity() {
    const gs = this.gridSize;
    for (let col = 0; col < gs; col++) {
      let emptyRow = gs - 1;
      for (let row = gs - 1; row >= 0; row--) {
        if (this.grid[row][col].candyIndex !== null) {
          if (row !== emptyRow) {
            const target = this.grid[emptyRow][col];
            target.candyIndex = this.grid[row][col].candyIndex;
            this.grid[row][col].candyIndex = null;
            this.paintTile(target);
            target.container.setScale(1);
            target.container.y = this.getY(row);
            this.tweens.add({ targets: target.container, y: this.getY(emptyRow), duration: 220, ease: 'Bounce.easeOut' });
          }
          emptyRow--;
        }
      }
      for (let row = emptyRow; row >= 0; row--) {
        const newIndex = Math.floor(Math.random() * CANDIES.length);
        const target = this.grid[row][col];
        target.candyIndex = newIndex;
        this.paintTile(target);
        target.container.setScale(1);
        target.container.y = this.getY(row - gs);
        this.tweens.add({ targets: target.container, y: this.getY(row), duration: 260, ease: 'Bounce.easeOut' });
      }
    }
    this.time.delayedCall(280, () => this.processMatches());
  }

  onTileClick(tileData) {
    if (this.inputLocked || this.movesLeft <= 0) return;

    if (!this.selectedTile) { this.selectedTile = tileData; this.highlightTile(tileData, true); return; }
    if (this.selectedTile === tileData) { this.highlightTile(tileData, false); this.selectedTile = null; return; }

    const rowDiff = Math.abs(this.selectedTile.row - tileData.row);
    const colDiff = Math.abs(this.selectedTile.col - tileData.col);
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

    if (isAdjacent) {
      const prev = this.selectedTile;
      this.highlightTile(prev, false);
      this.selectedTile = null;
      this.swapData(prev, tileData);
      const matched = this.findMatches();
      if (matched.size > 0) {
        this.movesLeft--;
        this.movesText.setText('Moves: ' + this.movesLeft);
        this.processMatches();
      } else {
        this.swapData(prev, tileData);
      }
    } else {
      this.highlightTile(this.selectedTile, false);
      this.selectedTile = tileData;
      this.highlightTile(tileData, true);
    }
  }

  endLevel() {
    this.inputLocked = true;
    const stars = getStars(this.level, this.score);
    saveProgress(this.level.id, stars);

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    this.add.text(width / 2, height / 2 - 100, 'LEVEL COMPLETE', { fontSize: '28px', color: THEME.accentBright, fontStyle: 'bold' }).setOrigin(0.5);

    const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    this.add.text(width / 2, height / 2 - 50, starDisplay, { fontSize: '40px' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2, 'Score: ' + this.score, { fontSize: '22px', color: THEME.text }).setOrigin(0.5);

    const retryBtn = makeButton(this, width / 2, height / 2 + 70, '🔁 RETRY', 0xc1440e, '#fff', '20px');
    const menuBtn = makeButton(this, width / 2, height / 2 + 130, '☰ LEVELS', 0x3d3226, THEME.text, '20px');

    retryBtn.hitZone.on('pointerdown', () => this.scene.restart({ level: this.level }));
    menuBtn.hitZone.on('pointerdown', () => this.scene.start('LevelSelectScene'));
  }

  create() {
    addBattlefieldAmbience(this);

    this.scoreText = this.add.text(10, 15, 'Score: 0', { fontSize: '20px', color: THEME.text, fontFamily: 'Georgia' });
    this.movesText = this.add.text(10, 42, 'Moves: ' + this.movesLeft, { fontSize: '17px', color: THEME.accentBright, fontFamily: 'Georgia' });
    this.add.text(BOARD_SIZE - 10, 15, 'Level ' + this.level.id, { fontSize: '16px', color: THEME.textDim }).setOrigin(1, 0);

    this.grid = [];
    const gs = this.gridSize;

    for (let row = 0; row < gs; row++) {
      this.grid[row] = [];
      for (let col = 0; col < gs; col++) {
        let candyIndex;
        do {
          candyIndex = Math.floor(Math.random() * CANDIES.length);
        } while (
          (col >= 2 && this.grid[row][col - 1].candyIndex === candyIndex && this.grid[row][col - 2].candyIndex === candyIndex) ||
          (row >= 2 && this.grid[row - 1][col].candyIndex === candyIndex && this.grid[row - 2][col].candyIndex === candyIndex)
        );
        this.grid[row][col] = this.drawTile(row, col, candyIndex);
      }
    }

    this.checkDeadlockAndReshuffle();
  }
}

const config = {
  type: Phaser.AUTO,
  width: BOARD_SIZE,
  height: BOARD_SIZE + TOP_OFFSET,
  parent: 'game-container',
  backgroundColor: THEME.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, SettingsScene, LevelSelectScene, GameScene]
};

const game = new Phaser.Game(config);

setupAuthModal(() => {
  game.scene.getScene('SettingsScene').scene.restart();
});