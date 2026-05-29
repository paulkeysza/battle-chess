import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const canvas = document.getElementById('arena');
const statusElement = document.getElementById('status');
const turnPill = document.getElementById('turn-pill');
const resetButton = document.getElementById('reset-button');
const cameraButton = document.getElementById('camera-button');
const soundButton = document.getElementById('sound-button');
let modeOverlay = document.getElementById('mode-overlay');
let modeButtons = document.querySelectorAll('.pvp-button, .cpu-button');
let inlineModeActions = document.getElementById('inline-mode-actions');
const castList = document.getElementById('cast-list');
const whiteCapturedElement = document.getElementById('white-captured');
const blackCapturedElement = document.getElementById('black-captured');

const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const squareSize = 1.55;
const boardOffset = (7 * squareSize) / 2;

const pieceData = {
  king: { name: 'Thunder Sovereign', code: 'KS', move: 'Command aura, one square in any direction' },
  queen: { name: 'Lightning Regent', code: 'QR', move: 'Fastest striker across lines and diagonals' },
  rook: { name: 'Claw Bastion', code: 'CB', move: 'Armored straight-line guardian' },
  bishop: { name: 'Sky Oracle', code: 'SO', move: 'Diagonal storm caster' },
  knight: { name: 'Sabre Leaper', code: 'SL', move: 'Vaulting L-shaped hunter' },
  pawn: { name: 'Cub Scout', code: 'CS', move: 'Frontline cub warrior' }
};

const pieceAssetPaths = {
  white: {
    king: { idle: 'assets/piece-blue-king-clean.png', walk: 'assets/piece-blue-king-clean.png' },
    queen: { idle: 'assets/piece-blue-queen-clean.png', walk: 'assets/piece-blue-queen-clean.png' },
    rook: { idle: 'assets/piece-blue-rook-clean.png', walk: 'assets/piece-blue-rook-clean.png' },
    bishop: { idle: 'assets/piece-blue-bishop-clean.png', walk: 'assets/piece-blue-bishop-clean.png' },
    knight: { idle: 'assets/piece-blue-knight-clean.png', walk: 'assets/piece-blue-knight-clean.png' },
    pawn: { idle: 'assets/piece-blue-pawn-clean.png', walk: 'assets/piece-blue-pawn-clean.png' }
  },
  black: {
    king: { idle: 'assets/piece-red-king-clean.png', walk: 'assets/piece-red-king-clean.png' },
    queen: { idle: 'assets/piece-red-queen-clean.png', walk: 'assets/piece-red-queen-clean.png' },
    rook: { idle: 'assets/piece-red-rook-clean.png', walk: 'assets/piece-red-rook-clean.png' },
    bishop: { idle: 'assets/piece-red-bishop-clean.png', walk: 'assets/piece-red-bishop-clean.png' },
    knight: { idle: 'assets/piece-red-knight-clean.png', walk: 'assets/piece-red-knight-clean.png' },
    pawn: { idle: 'assets/piece-red-pawn-clean.png', walk: 'assets/piece-red-pawn-clean.png' }
  }
};

const pieceDisplaySizes = {
  king: { size: 2.24, y: 1.08 },
  queen: { size: 2.24, y: 1.08 },
  rook: { size: 2.12, y: 1.02 },
  bishop: { size: 2.18, y: 1.05 },
  knight: { size: 2.02, y: 0.98 },
  pawn: { size: 1.72, y: 0.82 }
};

const initialBoard = {
  a8: 'b-rook', b8: 'b-knight', c8: 'b-bishop', d8: 'b-queen', e8: 'b-king', f8: 'b-bishop', g8: 'b-knight', h8: 'b-rook',
  a7: 'b-pawn', b7: 'b-pawn', c7: 'b-pawn', d7: 'b-pawn', e7: 'b-pawn', f7: 'b-pawn', g7: 'b-pawn', h7: 'b-pawn',
  a2: 'w-pawn', b2: 'w-pawn', c2: 'w-pawn', d2: 'w-pawn', e2: 'w-pawn', f2: 'w-pawn', g2: 'w-pawn', h2: 'w-pawn',
  a1: 'w-rook', b1: 'w-knight', c1: 'w-bishop', d1: 'w-queen', e1: 'w-king', f1: 'w-bishop', g1: 'w-knight', h1: 'w-rook'
};

const materials = {};
const boardState = {};
const squares = new Map();
const pieces = new Map();
const captured = { white: [], black: [] };
const animations = [];
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const pieceSpriteMaterials = {};

let selectedSquare = null;
let currentPlayer = 'white';
let isAnimating = false;
let gameOver = false;
let cameraMode = 0;
let dragStart = null;
let orbitAngle = 0;
let audioContext = null;
let soundEnabled = true;
let gameMode = null;
let cpuMoveTimer = null;

const cpuColor = 'black';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a10);
scene.fog = new THREE.Fog(0x080a10, 14, 32);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const cameraTargets = [
  { position: new THREE.Vector3(0, 12.4, 12.9), lookAt: new THREE.Vector3(0, 0, 0) },
  { position: new THREE.Vector3(-9.8, 8.8, 9.8), lookAt: new THREE.Vector3(0, 0, 0) },
  { position: new THREE.Vector3(0, 15.2, 1.2), lookAt: new THREE.Vector3(0, 0, 0) }
];
camera.position.copy(cameraTargets[0].position);
camera.lookAt(cameraTargets[0].lookAt);

const boardGroup = new THREE.Group();
scene.add(boardGroup);

setupMaterials();
setupLights();
buildArena();
renderCast();
ensureModeControls();
resetGame();
resizeRenderer();
animate();

window.addEventListener('resize', resizeRenderer);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerup', handlePointerUp);
resetButton.addEventListener('click', () => {
  playSound('reset');
  resetGame();
});
cameraButton.addEventListener('click', cycleCamera);
soundButton.addEventListener('click', toggleSound);

function ensureModeControls() {
  if (!modeButtons.length) {
    const fallback = document.createElement('div');
    fallback.id = 'inline-mode-actions';
    fallback.className = 'mode-actions inline-mode-actions generated-mode-actions';
    fallback.style.display = 'grid';
    fallback.style.gridTemplateColumns = '1fr 1fr';
    fallback.style.gap = '10px';
    fallback.style.width = 'min(360px, calc(100vw - 44px))';
    fallback.innerHTML = `
      <button class="pvp-button" type="button">Player vs Player</button>
      <button class="cpu-button" type="button">Player vs CPU</button>
    `;
    fallback.querySelectorAll('button').forEach((button) => {
      button.style.minHeight = '42px';
      button.style.border = '1px solid rgba(255, 255, 255, 0.22)';
      button.style.borderRadius = '8px';
      button.style.background = 'rgba(9, 12, 18, 0.9)';
      button.style.color = '#f6f2e8';
      button.style.cursor = 'pointer';
      button.style.fontWeight = '800';
    });

    const statusGroup = statusElement.parentElement;
    statusGroup.appendChild(fallback);
    inlineModeActions = fallback;
    modeButtons = document.querySelectorAll('.pvp-button, .cpu-button');
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => startMode(button.classList.contains('cpu-button') ? 'cpu' : 'pvp'));
  });
}

function startMode(mode) {
  gameMode = mode;
  if (modeOverlay) modeOverlay.hidden = true;
  if (inlineModeActions) inlineModeActions.hidden = true;
  ensureAudio();
  playSound('reset');
  resetGame();
}

function setupMaterials() {
  materials.lightTile = new THREE.MeshStandardMaterial({ color: 0xd8c48a, roughness: 0.56, metalness: 0.12 });
  materials.darkTile = new THREE.MeshStandardMaterial({ color: 0x252a42, roughness: 0.63, metalness: 0.1 });
  materials.selected = new THREE.MeshStandardMaterial({ color: 0xf1b84a, roughness: 0.42, metalness: 0.2, emissive: 0x8a4a00, emissiveIntensity: 0.16 });
  materials.legal = new THREE.MeshStandardMaterial({ color: 0x38b98f, roughness: 0.45, metalness: 0.12, emissive: 0x0d5c46, emissiveIntensity: 0.14 });
  materials.capture = new THREE.MeshStandardMaterial({ color: 0xd8423d, roughness: 0.5, metalness: 0.14, emissive: 0x6d1111, emissiveIntensity: 0.2 });
  materials.whiteBody = new THREE.MeshStandardMaterial({ color: 0xe9dfbf, roughness: 0.5, metalness: 0.18 });
  materials.whiteArmor = new THREE.MeshStandardMaterial({ color: 0x2daec0, roughness: 0.38, metalness: 0.38 });
  materials.blackBody = new THREE.MeshStandardMaterial({ color: 0x222638, roughness: 0.55, metalness: 0.18 });
  materials.blackArmor = new THREE.MeshStandardMaterial({ color: 0xd4433f, roughness: 0.42, metalness: 0.36 });
  materials.gold = new THREE.MeshStandardMaterial({ color: 0xf1b84a, roughness: 0.32, metalness: 0.55 });
  materials.eye = new THREE.MeshStandardMaterial({ color: 0xf7f0be, roughness: 0.25, emissive: 0xf1b84a, emissiveIntensity: 0.45 });
  materials.shadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0xd8f8ff, 0x141019, 1.7);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe4a3, 3.1);
  key.position.set(4, 11, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 28;
  key.shadow.camera.left = -11;
  key.shadow.camera.right = 11;
  key.shadow.camera.top = 11;
  key.shadow.camera.bottom = -11;
  scene.add(key);

  const rim = new THREE.PointLight(0x35c8d8, 24, 18, 1.7);
  rim.position.set(-5, 5, -6);
  scene.add(rim);

  const red = new THREE.PointLight(0xdf4d48, 14, 15, 1.8);
  red.position.set(6, 3, 4);
  scene.add(red);
}

function buildArena() {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(13.25, 0.38, 13.25),
    new THREE.MeshStandardMaterial({ color: 0x121620, roughness: 0.72, metalness: 0.18 })
  );
  base.position.y = -0.24;
  base.receiveShadow = true;
  boardGroup.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(9.25, 0.045, 8, 180),
    new THREE.MeshBasicMaterial({ color: 0x35c8d8, transparent: true, opacity: 0.32 })
  );
  ring.position.y = 0.06;
  ring.rotation.x = Math.PI / 2;
  boardGroup.add(ring);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 96),
    new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.88, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.46;
  floor.receiveShadow = true;
  scene.add(floor);

  for (let rank = 1; rank <= 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${columns[file]}${rank}`;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(squareSize * 0.95, 0.14, squareSize * 0.95),
        (file + rank) % 2 === 0 ? materials.lightTile : materials.darkTile
      );
      tile.position.copy(squareToPosition(square));
      tile.position.y = 0;
      tile.castShadow = true;
      tile.receiveShadow = true;
      tile.userData.square = square;
      tile.userData.baseMaterial = tile.material;
      squares.set(square, tile);
      boardGroup.add(tile);
    }
  }
}

function resetGame() {
  if (cpuMoveTimer) {
    window.clearTimeout(cpuMoveTimer);
    cpuMoveTimer = null;
  }

  for (const piece of pieces.values()) {
    boardGroup.remove(piece.group);
  }
  pieces.clear();
  Object.keys(boardState).forEach((key) => delete boardState[key]);
  Object.assign(boardState, structuredClone(initialBoard));
  captured.white = [];
  captured.black = [];
  selectedSquare = null;
  currentPlayer = 'white';
  isAnimating = false;
  gameOver = false;
  animations.length = 0;
  clearHighlights();
  Object.entries(boardState).forEach(([square, tag]) => createPiece(square, tag));
  updateHud(gameMode ? 'Blue starts. Select a piece.' : 'Choose a mode to begin.');
  updateCaptured();
}

function renderCast() {
  castList.innerHTML = Object.entries(pieceData).map(([type, data]) => `
    <div class="cast-item">
      <div class="cast-mark">${data.code}</div>
      <div>
        <strong>${data.name}</strong>
        <span>${data.move}</span>
      </div>
    </div>
  `).join('');
}

function createPiece(square, tag) {
  const [side, type] = tag.split('-');
  const color = side === 'w' ? 'white' : 'black';
  const group = new THREE.Group();
  group.position.copy(squareToPosition(square));
  group.position.y = 0.18;
  group.userData.square = square;
  group.userData.tag = tag;
  group.userData.color = color;
  group.userData.type = type;
  group.userData.baseY = 0.18;
  group.userData.standParts = [];

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.44, 32), materials.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  shadow.renderOrder = -1;
  group.add(shadow);

  addCaricatureSprite(group, type, color);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = !child.userData.hitbox;
      child.receiveShadow = !child.userData.hitbox;
      child.userData.pieceGroup = group;
    }

    if (child.isSprite) {
      child.userData.pieceGroup = group;
    }
  });

  pieces.set(square, { group, tag, type, color });
  boardGroup.add(group);
}

function addPieceBase(group, type, color) {
  const radius = type === 'pawn' ? 0.42 : type === 'knight' ? 0.46 : 0.52;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.12, 0.2, 48),
    materials.gold
  );
  base.position.y = 0.1;
  group.userData.standParts.push(base);
  group.add(base);

  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.02, 0.025, 8, 64),
    color === 'white' ? materials.whiteArmor : materials.blackArmor
  );
  accent.position.y = 0.23;
  accent.rotation.x = Math.PI / 2;
  group.userData.standParts.push(accent);
  group.add(accent);
}

function addCaricatureSprite(group, type, color) {
  const display = pieceDisplaySizes[type];
  const sprite = new THREE.Sprite(getPieceSpriteMaterial(type, color, 'idle'));
  sprite.position.y = display.y;
  sprite.scale.set(display.size, display.size, 1);
  sprite.renderOrder = 2;
  sprite.userData.homeY = display.y;
  sprite.userData.homeScale = { x: display.size, y: display.size };
  sprite.userData.type = type;
  sprite.userData.color = color;
  group.userData.sprite = sprite;
  group.add(sprite);

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(display.size * 0.54, display.size * 0.74, 0.38),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitbox.position.y = display.y;
  hitbox.userData.hitbox = true;
  hitbox.userData.pieceGroup = group;
  group.add(hitbox);
}

function addWalkingLegs(group, type) {
  const legGroup = new THREE.Group();
  const furMaterial = new THREE.MeshStandardMaterial({
    color: getFurColor(type),
    roughness: 0.68,
    metalness: 0.05
  });
  const pawMaterial = new THREE.MeshStandardMaterial({
    color: type === 'rook' || type === 'knight' ? 0x1f2430 : 0xf2e3c6,
    roughness: 0.72,
    metalness: 0.02
  });
  const legHeight = type === 'pawn' ? 0.38 : 0.48;
  const legRadius = type === 'pawn' ? 0.055 : 0.068;

  [-1, 1].forEach((side) => {
    const leg = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(legRadius, legHeight, 5, 10), furMaterial);
    upper.position.y = legHeight * 0.46;
    leg.add(upper);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(legRadius * 1.35, 12, 8), pawMaterial);
    paw.position.y = 0.02;
    paw.scale.set(1.45, 0.62, 1.1);
    leg.add(paw);

    leg.position.set(side * (type === 'pawn' ? 0.12 : 0.16), 0.12, 0.16);
    leg.userData.homeX = leg.position.x;
    leg.userData.side = side;
    legGroup.add(leg);
  });

  legGroup.visible = true;
  legGroup.userData.homeY = legGroup.position.y;
  group.userData.legGroup = legGroup;
  group.add(legGroup);
}

function getFurColor(type) {
  if (type === 'rook') return 0x17191d;
  if (type === 'knight') return 0x6e8191;
  if (type === 'bishop') return 0xd38b38;
  return 0xd48a35;
}

function getPieceSpriteMaterial(type, color, pose = 'idle') {
  const key = `${color}-${type}-${pose}`;

  if (!pieceSpriteMaterials[key]) {
    const texture = textureLoader.load(pieceAssetPaths[color][type][pose]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    pieceSpriteMaterials[key] = new THREE.SpriteMaterial({
      map: texture,
      transparent: false,
      alphaTest: 0.18,
      depthWrite: true
    });
  }

  return pieceSpriteMaterials[key];
}

function addCoreBody(group, type, bodyMaterial, armorMaterial) {
  const height = type === 'pawn' ? 0.72 : type === 'king' || type === 'queen' ? 1.08 : 0.9;
  const radius = type === 'pawn' ? 0.28 : 0.34;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.12, radius * 1.34, 0.18, 24), armorMaterial);
  base.position.y = 0.12;
  group.add(base);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(radius, height, 6, 16), bodyMaterial);
  torso.position.y = 0.34 + height / 2;
  torso.scale.x = type === 'rook' ? 1.15 : 0.9;
  torso.scale.z = type === 'rook' ? 1.15 : 0.82;
  group.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 0.88, 0.18, 5), armorMaterial);
  chest.position.y = 0.62 + height * 0.42;
  chest.rotation.y = Math.PI / 5;
  group.add(chest);

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 5, 10), bodyMaterial);
  leftArm.position.set(-radius * 0.95, 0.7 + height * 0.25, 0.02);
  leftArm.rotation.z = 0.52;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x *= -1;
  rightArm.rotation.z *= -1;
  group.add(rightArm);
}

function addFelineHead(group, type, bodyMaterial, armorMaterial) {
  const headY = type === 'pawn' ? 1.12 : type === 'king' || type === 'queen' ? 1.56 : 1.36;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), bodyMaterial);
  head.position.y = headY;
  head.scale.set(1, 0.9, 0.88);
  group.add(head);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), bodyMaterial);
  muzzle.position.set(0, headY - 0.03, 0.22);
  muzzle.scale.set(1.35, 0.76, 0.72);
  group.add(muzzle);

  const earGeometry = new THREE.ConeGeometry(0.09, 0.18, 3);
  const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
  leftEar.position.set(-0.15, headY + 0.2, 0.02);
  leftEar.rotation.set(0.2, 0.15, -0.28);
  group.add(leftEar);

  const rightEar = leftEar.clone();
  rightEar.position.x *= -1;
  rightEar.rotation.z *= -1;
  group.add(rightEar);

  const eyeGeometry = new THREE.SphereGeometry(0.028, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeometry, materials.eye);
  leftEye.position.set(-0.075, headY + 0.02, 0.22);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x *= -1;
  group.add(rightEye);

  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 5), armorMaterial);
  crest.position.y = headY + 0.3;
  crest.rotation.y = Math.PI / 5;
  group.add(crest);
}

function addRoleDetails(group, type, armorMaterial) {
  if (type === 'king') {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 8, 28), materials.gold);
    crown.position.y = 1.82;
    crown.rotation.x = Math.PI / 2;
    group.add(crown);
    addWeapon(group, 'sword', armorMaterial, 0.54);
  }

  if (type === 'queen') {
    const aura = new THREE.Mesh(new THREE.TorusKnotGeometry(0.2, 0.025, 70, 8), materials.gold);
    aura.position.y = 1.82;
    group.add(aura);
    addWeapon(group, 'staff', armorMaterial, 0.62);
  }

  if (type === 'rook') {
    for (let i = 0; i < 4; i += 1) {
      const turret = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.13), armorMaterial);
      const angle = i * Math.PI / 2 + Math.PI / 4;
      turret.position.set(Math.cos(angle) * 0.3, 1.44, Math.sin(angle) * 0.3);
      group.add(turret);
    }
  }

  if (type === 'bishop') {
    addWeapon(group, 'staff', armorMaterial, 0.56);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, 30), materials.gold);
    halo.position.y = 1.58;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  }

  if (type === 'knight') {
    addWeapon(group, 'claws', armorMaterial, 0.5);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 6), materials.gold);
    plume.position.set(0, 1.68, -0.08);
    plume.rotation.x = -0.5;
    group.add(plume);
  }

  if (type === 'pawn') {
    addWeapon(group, 'claws', armorMaterial, 0.38);
  }
}

function addWeapon(group, kind, material, scale) {
  if (kind === 'sword') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 0.055), materials.gold);
    blade.position.set(0.42, 0.94, 0.12);
    blade.rotation.z = -0.28;
    group.add(blade);
  }

  if (kind === 'staff') {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.08, 12), material);
    staff.position.set(0.42, 0.9, 0.08);
    staff.rotation.z = -0.2;
    group.add(staff);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), materials.gold);
    orb.position.set(0.52, 1.42, 0.08);
    group.add(orb);
  }

  if (kind === 'claws') {
    [-1, 1].forEach((side) => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.035, scale, 8), materials.gold);
      claw.position.set(side * 0.36, 0.72, 0.24);
      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = side * 0.28;
      group.add(claw);
    });
  }
}

function squareToPosition(square) {
  const file = columns.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return new THREE.Vector3(file * squareSize - boardOffset, 0, rank * squareSize - boardOffset);
}

function getPiece(square) {
  return boardState[square] || null;
}

function getPieceColor(tag) {
  return tag?.startsWith('w-') ? 'white' : tag?.startsWith('b-') ? 'black' : null;
}

function getPieceType(tag) {
  return tag?.split('-')[1] || null;
}

function isOpponent(pieceColor, targetPiece) {
  return targetPiece && pieceColor !== getPieceColor(targetPiece);
}

function handlePointerDown(event) {
  dragStart = { x: event.clientX, y: event.clientY, angle: orbitAngle };
}

function handlePointerMove(event) {
  if (!dragStart || cameraMode === 2) return;
  const dx = event.clientX - dragStart.x;
  orbitAngle = dragStart.angle + dx * 0.006;
}

function handlePointerUp(event) {
  if (!dragStart) return;
  const moved = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);
  dragStart = null;
  if (moved < 8) {
    pickSquare(event);
  }
}

function pickSquare(event) {
  if (!gameMode || isAnimating || gameOver || isCpuTurn()) return;
  ensureAudio();
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(boardGroup.children, true);
  const hit = hits.find((item) => item.object.userData.square || item.object.userData.pieceGroup);
  if (!hit) return;
  const square = hit.object.userData.square || hit.object.userData.pieceGroup.userData.square;
  handleSquareSelection(square);
}

function handleSquareSelection(square) {
  if (isCpuTurn()) return;

  const piece = getPiece(square);
  const pieceColor = getPieceColor(piece);

  if (selectedSquare === square) {
    selectedSquare = null;
    clearHighlights();
    updateHud(`${sideLabel(currentPlayer)} moves. Select a piece.`);
    playSound('deselect');
    return;
  }

  if (selectedSquare && pieceColor !== currentPlayer) {
    const legalMoves = calculateLegalMoves(selectedSquare);
    if (legalMoves.includes(square)) {
      movePiece(selectedSquare, square);
      return;
    }
  }

  if (piece && pieceColor === currentPlayer) {
    selectedSquare = square;
    const typeName = pieceData[getPieceType(piece)].name;
    highlightMoves(square);
    updateHud(`${typeName} selected. Choose a highlighted square.`);
    playSelectionSound(getPieceType(piece));
  }
}

function highlightMoves(square) {
  clearHighlights();
  const selectedTile = squares.get(square);
  selectedTile.material = materials.selected;

  calculateLegalMoves(square).forEach((target) => {
    const targetTile = squares.get(target);
    targetTile.material = getPiece(target) ? materials.capture : materials.legal;
  });
}

function clearHighlights() {
  squares.forEach((tile) => {
    tile.material = tile.userData.baseMaterial;
  });
}

function movePiece(source, target) {
  const movingTag = getPiece(source);
  const destinationTag = getPiece(target);
  const movingPiece = pieces.get(source);
  const targetPiece = pieces.get(target);
  isAnimating = true;
  selectedSquare = null;
  clearHighlights();

  if (destinationTag && targetPiece) {
    updateHud(`${pieceData[getPieceType(movingTag)].name} challenges ${pieceData[getPieceType(destinationTag)].name}.`);
    playFightSoundtrack(getPieceType(movingTag), getPieceType(destinationTag));
    animateBattle(movingPiece.group, targetPiece.group, source, target, () => {
      captured[getPieceColor(destinationTag)].push(pieceData[getPieceType(destinationTag)].name);
      boardGroup.remove(targetPiece.group);
      pieces.delete(target);
      finalizeMove(source, target, movingTag, movingPiece, destinationTag);
    });
  } else {
    updateHud(`${pieceData[getPieceType(movingTag)].name} advances.`);
    playSound('move');
    animateTravel(movingPiece.group, squareToPosition(target), () => finalizeMove(source, target, movingTag, movingPiece, null));
  }
}

function finalizeMove(source, target, tag, movingPiece, capturedTag) {
  delete boardState[source];
  boardState[target] = tag;
  pieces.delete(source);
  pieces.set(target, movingPiece);
  movingPiece.group.userData.square = target;
  movingPiece.group.position.copy(squareToPosition(target));
  movingPiece.group.position.y = 0.18;
  if (getPieceType(capturedTag) === 'king') {
    gameOver = true;
    isAnimating = false;
    updateCaptured();
    updateHud(`${sideLabel(currentPlayer)} wins by capturing the sovereign.`);
    return;
  }
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  isAnimating = false;
  updateCaptured();
  updateHud(`${sideLabel(currentPlayer)} moves next.`);
  scheduleCpuMove();
}

function isCpuTurn() {
  return gameMode === 'cpu' && currentPlayer === cpuColor && !gameOver;
}

function scheduleCpuMove() {
  if (!isCpuTurn()) return;
  updateHud('Red is thinking...');
  cpuMoveTimer = window.setTimeout(makeCpuMove, 650);
}

function makeCpuMove() {
  cpuMoveTimer = null;
  if (!isCpuTurn() || isAnimating) return;

  const moves = getAllLegalMoves(cpuColor);
  if (!moves.length) {
    gameOver = true;
    updateHud('Blue wins. Red has no legal moves.');
    return;
  }

  const captures = moves.filter((move) => getPiece(move.target));
  const pool = captures.length ? captures : moves;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  movePiece(choice.source, choice.target);
}

function getAllLegalMoves(color) {
  const moves = [];

  Object.entries(boardState).forEach(([square, tag]) => {
    if (getPieceColor(tag) !== color) return;
    calculateLegalMoves(square).forEach((target) => {
      moves.push({ source: square, target });
    });
  });

  return moves;
}

function animateTravel(group, targetPosition, onDone) {
  const from = group.position.clone();
  const to = targetPosition.clone();
  to.y = 0.18;
  const distance = from.distanceTo(to);
  const duration = THREE.MathUtils.clamp(0.48 + distance * 0.16, 0.72, 1.55);
  const startRotation = group.rotation.clone();
  const moveType = group.userData.type;
  const strideCount = Math.max(2, Math.round(distance * (moveType === 'pawn' ? 1.4 : 1.65)));
  const facingAngle = Math.atan2(to.x - from.x, to.z - from.z);
  setWalkingMode(group, true);

  addAnimation(duration, (t) => {
    const eased = easeInOut(t);
    const landing = segment(t, 0.84, 1);
    group.position.lerpVectors(from, to, eased);
    group.rotation.y = THREE.MathUtils.lerp(startRotation.y, facingAngle, Math.min(t * 4, 1));
    applyWalkingPose(group, t, strideCount, moveType);

    if (landing > 0) {
      const settle = Math.sin(landing * Math.PI);
      group.position.y -= settle * 0.035;
      group.rotation.z *= 1 - landing;
      group.rotation.x *= 1 - landing;
    }
  }, () => {
    setWalkingMode(group, false);
    resetPiecePose(group, startRotation);
    onDone();
  });
}

function setWalkingMode(group, isWalking) {
  const sprite = group.userData.sprite;
  const color = group.userData.color;
  const type = group.userData.type;

  group.userData.standParts.forEach((part) => {
    part.visible = !isWalking;
  });

  if (sprite) {
    sprite.material = getPieceSpriteMaterial(type, color, 'idle');
  }

  if (group.userData.legGroup) {
    group.userData.legGroup.visible = isWalking;
  }
}

function applyWalkingPose(group, t, strideCount, moveType) {
  const sprite = group.userData.sprite;
  const legGroup = group.userData.legGroup;
  const phase = t * Math.PI * 2 * strideCount;
  const stride = Math.sin(phase);
  const footfall = Math.abs(stride);
  const lift = Math.max(0, Math.sin(phase + Math.PI / 2));
  const weight = moveType === 'rook' ? 0.55 : moveType === 'pawn' ? 0.82 : 1;
  const knightLift = moveType === 'knight' ? 0.055 : 0;

  group.position.y = group.userData.baseY + footfall * (0.055 * weight + knightLift);
  group.rotation.z = stride * 0.09 * weight;
  group.rotation.x = -lift * 0.045 * weight;
  group.scale.set(1 + footfall * 0.018, 1 - footfall * 0.014, 1);

  if (sprite) {
    const homeY = sprite.userData.homeY;
    const homeScale = sprite.userData.homeScale;
    sprite.position.x = stride * 0.045 * weight;
    sprite.position.y = homeY + footfall * 0.055 * weight;
    sprite.scale.set(
      homeScale.x * (1 - footfall * 0.018),
      homeScale.y * (1 + footfall * 0.026),
      1
    );
  }

  if (legGroup) {
    legGroup.children.forEach((leg) => {
      const legPhase = phase + (leg.userData.side > 0 ? 0 : Math.PI);
      const step = Math.sin(legPhase);
      const liftStep = Math.max(0, Math.cos(legPhase));
      leg.position.x = leg.userData.homeX + step * 0.065 * weight;
      leg.position.y = liftStep * 0.08 * weight;
      leg.rotation.z = -step * 0.42 * weight;
      leg.rotation.x = liftStep * 0.18 * weight;
    });
  }
}

function resetPiecePose(group, rotation) {
  const sprite = group.userData.sprite;
  group.rotation.copy(rotation);
  group.scale.set(1, 1, 1);
  group.position.y = group.userData.baseY;

  if (sprite) {
    sprite.position.x = 0;
    sprite.position.y = sprite.userData.homeY;
    sprite.scale.set(sprite.userData.homeScale.x, sprite.userData.homeScale.y, 1);
  }

  if (group.userData.legGroup) {
    group.userData.legGroup.children.forEach((leg) => {
      leg.position.x = leg.userData.homeX;
      leg.position.y = 0;
      leg.rotation.set(0, 0, 0);
    });
  }
}

function animateBattle(attacker, defender, source, target, onDone) {
  const attackStart = attacker.position.clone();
  const defendStart = defender.position.clone();
  const targetPos = squareToPosition(target);
  const sourcePos = squareToPosition(source);
  const attackFacing = targetPos.clone().sub(sourcePos);
  const retreatFacing = sourcePos.clone().sub(targetPos);
  const attackerStance = targetPos.clone().add(retreatFacing.normalize().multiplyScalar(0.58));
  const defenderStance = targetPos.clone().add(attackFacing.normalize().multiplyScalar(0.18));
  const attackerWindup = attackerStance.clone().add(retreatFacing.clone().multiplyScalar(0.24));
  const defenderWindup = defenderStance.clone().add(attackFacing.clone().multiplyScalar(0.18));
  attackerStance.y = 0.18;
  defenderStance.y = 0.18;
  attackerWindup.y = 0.18;
  defenderWindup.y = 0.18;
  const attackerStartRotation = attacker.rotation.clone();
  const defenderStartRotation = defender.rotation.clone();
  setWalkingMode(attacker, true);

  const flash = createFlash(targetPos);
  boardGroup.add(flash);
  const shockwave = createShockwave(targetPos);
  boardGroup.add(shockwave);
  const clashRing = createClashRing(targetPos);
  boardGroup.add(clashRing);

  addAnimation(3.1, (t) => {
    const approach = segment(t, 0, 0.22);
    const squareOff = segment(t, 0.2, 0.34);
    const firstStrike = segment(t, 0.34, 0.48);
    const counterStrike = segment(t, 0.48, 0.63);
    const finalStrike = segment(t, 0.64, 0.82);
    const vanish = segment(t, 0.8, 1);
    const clashPulse = Math.max(
      Math.sin(firstStrike * Math.PI),
      Math.sin(counterStrike * Math.PI),
      Math.sin(finalStrike * Math.PI)
    );

    attacker.position.lerpVectors(attackStart, attackerStance, easeInOut(approach));
    defender.position.lerpVectors(defendStart, defenderStance, easeInOut(squareOff) * 0.55);

    if (approach > 0 && approach < 1) {
      applyWalkingPose(attacker, approach, 3, attacker.userData.type);
    }

    if (squareOff > 0) {
      attacker.position.lerpVectors(attackerStance, attackerWindup, Math.sin(squareOff * Math.PI) * 0.35);
      defender.position.lerpVectors(defendStart, defenderStance, easeInOut(squareOff));
      attacker.rotation.z = attackerStartRotation.z - squareOff * 0.16;
      defender.rotation.z = defenderStartRotation.z + squareOff * 0.12;
    }

    if (firstStrike > 0) {
      const jab = Math.sin(firstStrike * Math.PI);
      attacker.position.lerpVectors(attackerWindup, defenderStance, easeOutBack(firstStrike) * 0.5);
      attacker.position.y = 0.18 + jab * 0.42;
      attacker.rotation.z = attackerStartRotation.z + jab * 0.34;
      defender.position.x = defenderStance.x + jab * 0.08;
      defender.rotation.z = defenderStartRotation.z - jab * 0.24;
    }

    if (counterStrike > 0) {
      const counter = Math.sin(counterStrike * Math.PI);
      defender.position.lerpVectors(defenderStance, defenderWindup, counter * 0.42);
      defender.position.y = 0.18 + counter * 0.28;
      defender.rotation.z = defenderStartRotation.z + counter * 0.36;
      attacker.position.x = attackerStance.x - counter * 0.08;
      attacker.rotation.z = attackerStartRotation.z - counter * 0.22;
    }

    if (finalStrike > 0) {
      const strike = easeOutBack(finalStrike);
      const hit = Math.sin(finalStrike * Math.PI);
      attacker.position.lerpVectors(attackerStance, targetPos, strike);
      attacker.position.y = 0.18 + hit * 0.68;
      attacker.rotation.z = attackerStartRotation.z + hit * 0.5;
      defender.position.x = defenderStance.x + Math.sin(finalStrike * Math.PI * 5) * 0.1;
      defender.position.z = defenderStance.z - finalStrike * 0.72;
      defender.position.y = 0.18 + hit * 0.32;
      defender.rotation.z = defenderStartRotation.z - finalStrike * 1.25;
      defender.rotation.x = defenderStartRotation.x + finalStrike * 0.82;
      defender.scale.setScalar(1 - vanish * 0.72);
    }

    flash.scale.setScalar(0.25 + clashPulse * 2.65);
    flash.material.opacity = Math.max(0, 0.58 * (1 - vanish));
    clashRing.scale.setScalar(0.45 + clashPulse * 1.4);
    clashRing.material.opacity = Math.max(0, 0.5 * clashPulse * (1 - vanish));
    shockwave.scale.setScalar(0.5 + finalStrike * 3.2 + vanish * 1.6);
    shockwave.material.opacity = Math.max(0, 0.34 * finalStrike * (1 - vanish));
  }, () => {
    boardGroup.remove(flash);
    boardGroup.remove(shockwave);
    boardGroup.remove(clashRing);
    setWalkingMode(attacker, false);
    defender.position.copy(defendStart);
    defender.rotation.copy(defenderStartRotation);
    defender.scale.set(1, 1, 1);
    resetPiecePose(attacker, attackerStartRotation);
    attacker.position.copy(targetPos);
    attacker.position.y = 0.18;
    onDone();
  });
}

function createFlash(position) {
  const flash = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.54, 48),
    new THREE.MeshBasicMaterial({ color: 0xf1b84a, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
  );
  flash.position.copy(position);
  flash.position.y = 0.28;
  flash.rotation.x = -Math.PI / 2;
  return flash;
}

function createShockwave(position) {
  const wave = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.38, 64),
    new THREE.MeshBasicMaterial({ color: 0x35c8d8, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
  );
  wave.position.copy(position);
  wave.position.y = 0.18;
  wave.rotation.x = -Math.PI / 2;
  return wave;
}

function createClashRing(position) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  ring.position.copy(position);
  ring.position.y = 0.42;
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function addAnimation(duration, update, done) {
  animations.push({ elapsed: 0, duration, update, done });
}

function segment(t, start, end) {
  return THREE.MathUtils.clamp((t - start) / (end - start), 0, 1);
}

function calculateLegalMoves(squareId) {
  const pieceTag = getPiece(squareId);
  if (!pieceTag) return [];
  const color = getPieceColor(pieceTag);
  const type = getPieceType(pieceTag);
  const file = columns.indexOf(squareId[0]);
  const rank = Number(squareId[1]);
  const destinations = [];

  if (type === 'pawn') {
    const direction = color === 'white' ? 1 : -1;
    const oneStepRank = rank + direction;
    const forwardSquare = `${columns[file]}${oneStepRank}`;
    if (oneStepRank >= 1 && oneStepRank <= 8 && !getPiece(forwardSquare)) {
      destinations.push(forwardSquare);
      const startRank = color === 'white' ? 2 : 7;
      const twoStepRank = rank + direction * 2;
      const twoStepSquare = `${columns[file]}${twoStepRank}`;
      if (rank === startRank && !getPiece(twoStepSquare)) destinations.push(twoStepSquare);
    }
    [-1, 1].forEach((offset) => {
      const captureFile = file + offset;
      if (captureFile < 0 || captureFile > 7) return;
      const captureSquare = `${columns[captureFile]}${oneStepRank}`;
      if (isOpponent(color, getPiece(captureSquare))) destinations.push(captureSquare);
    });
  }

  const rayDirections = {
    rook: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    queen: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
    king: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  };

  if (['rook', 'bishop', 'queen', 'king'].includes(type)) {
    const maxDistance = type === 'king' ? 1 : 7;
    rayDirections[type].forEach(([dx, dy]) => {
      for (let step = 1; step <= maxDistance; step += 1) {
        const nextFile = file + dx * step;
        const nextRank = rank + dy * step;
        if (nextFile < 0 || nextFile > 7 || nextRank < 1 || nextRank > 8) break;
        const destination = `${columns[nextFile]}${nextRank}`;
        const destinationPiece = getPiece(destination);
        if (!destinationPiece) {
          destinations.push(destination);
          continue;
        }
        if (isOpponent(color, destinationPiece)) destinations.push(destination);
        break;
      }
    });
  }

  if (type === 'knight') {
    [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]].forEach(([dx, dy]) => {
      const nextFile = file + dx;
      const nextRank = rank + dy;
      if (nextFile < 0 || nextFile > 7 || nextRank < 1 || nextRank > 8) return;
      const destination = `${columns[nextFile]}${nextRank}`;
      if (!getPiece(destination) || isOpponent(color, getPiece(destination))) destinations.push(destination);
    });
  }

  return destinations;
}

function updateHud(message) {
  statusElement.textContent = message;
  turnPill.textContent = sideLabel(currentPlayer);
  turnPill.style.color = currentPlayer === 'white' ? '#a9ecff' : '#ffb1ad';
}

function updateCaptured() {
  whiteCapturedElement.textContent = captured.white.length ? captured.white.join(', ') : 'None';
  blackCapturedElement.textContent = captured.black.length ? captured.black.join(', ') : 'None';
}

function sideLabel(color) {
  return color === 'white' ? 'Blue' : 'Red';
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? 'Sound On' : 'Sound Off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) {
    ensureAudio();
    playSelectionSound('pawn');
  }
}

function ensureAudio() {
  if (!soundEnabled) return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) {
    audioContext = new AudioCtor();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playSound(kind, delay = 0) {
  const context = ensureAudio();
  if (!context || !soundEnabled) return;
  const now = context.currentTime + delay;

  if (kind === 'select') {
    tone({ frequency: 620, endFrequency: 840, start: now, duration: 0.08, gain: 0.045, type: 'triangle' });
  }

  if (kind === 'deselect') {
    tone({ frequency: 360, endFrequency: 220, start: now, duration: 0.08, gain: 0.035, type: 'sine' });
  }

  if (kind === 'move') {
    noiseBurst({ start: now, duration: 0.07, gain: 0.08, filterFrequency: 180 });
    tone({ frequency: 150, endFrequency: 92, start: now, duration: 0.18, gain: 0.055, type: 'sine' });
    tone({ frequency: 420, endFrequency: 520, start: now + 0.06, duration: 0.12, gain: 0.025, type: 'triangle' });
  }

  if (kind === 'clash') {
    noiseBurst({ start: now, duration: 0.09, gain: 0.12, filterFrequency: 2100 });
    tone({ frequency: 980, endFrequency: 520, start: now, duration: 0.14, gain: 0.055, type: 'sawtooth' });
  }

  if (kind === 'counter') {
    noiseBurst({ start: now, duration: 0.08, gain: 0.1, filterFrequency: 1500 });
    tone({ frequency: 540, endFrequency: 760, start: now, duration: 0.1, gain: 0.045, type: 'square' });
  }

  if (kind === 'impact') {
    noiseBurst({ start: now, duration: 0.18, gain: 0.22, filterFrequency: 260 });
    tone({ frequency: 88, endFrequency: 48, start: now, duration: 0.34, gain: 0.14, type: 'sine' });
    tone({ frequency: 1340, endFrequency: 420, start: now, duration: 0.2, gain: 0.035, type: 'triangle' });
  }

  if (kind === 'reset') {
    tone({ frequency: 240, endFrequency: 360, start: now, duration: 0.1, gain: 0.025, type: 'sine' });
    tone({ frequency: 360, endFrequency: 520, start: now + 0.08, duration: 0.12, gain: 0.025, type: 'sine' });
  }
}

function playSelectionSound(type, delay = 0) {
  const context = ensureAudio();
  if (!context || !soundEnabled) return;
  const now = context.currentTime + delay;

  if (type === 'pawn') {
    felineCall({ start: now, base: 320, end: 210, duration: 0.18, gain: 0.045, noise: 0.025 });
    tone({ frequency: 720, endFrequency: 560, start: now + 0.04, duration: 0.08, gain: 0.014, type: 'triangle' });
    return;
  }

  if (type === 'king') {
    felineCall({ start: now, base: 150, end: 62, duration: 0.72, gain: 0.1, noise: 0.11 });
    tone({ frequency: 82, endFrequency: 48, start: now + 0.06, duration: 0.5, gain: 0.075, type: 'sawtooth' });
    return;
  }

  if (type === 'queen') {
    felineCall({ start: now, base: 220, end: 130, duration: 0.48, gain: 0.07, noise: 0.055 });
    tone({ frequency: 660, endFrequency: 420, start: now + 0.04, duration: 0.16, gain: 0.025, type: 'triangle' });
    return;
  }

  if (type === 'rook') {
    felineCall({ start: now, base: 180, end: 92, duration: 0.42, gain: 0.075, noise: 0.08 });
    return;
  }

  if (type === 'bishop') {
    felineCall({ start: now, base: 260, end: 150, duration: 0.34, gain: 0.055, noise: 0.04 });
    tone({ frequency: 520, endFrequency: 740, start: now + 0.08, duration: 0.14, gain: 0.016, type: 'sine' });
    return;
  }

  if (type === 'knight') {
    felineCall({ start: now, base: 300, end: 170, duration: 0.28, gain: 0.06, noise: 0.055 });
  }
}

function playFightSoundtrack(attackerType, defenderType) {
  playSelectionSound(attackerType, 0.08);
  playSound('clash', 0.72);
  playSelectionSound(defenderType, 1.02);
  playSound('counter', 1.26);
  playSound('clash', 1.68);
  playSound('impact', 2.05);
}

function felineCall({ start, base, end, duration, gain, noise }) {
  growlTone({ frequency: base, endFrequency: end, start, duration, gain, type: 'sawtooth' });
  growlTone({ frequency: base * 0.52, endFrequency: end * 0.55, start: start + 0.02, duration, gain: gain * 0.72, type: 'square' });
  noiseBurst({ start, duration: duration * 0.72, gain: noise, filterFrequency: Math.max(180, base * 4) });
}

function growlTone({ frequency, endFrequency, start, duration, gain, type }) {
  const context = audioContext;
  const oscillator = context.createOscillator();
  const tremolo = context.createOscillator();
  const tremoloGain = context.createGain();
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  tremolo.frequency.setValueAtTime(24, start);
  tremoloGain.gain.setValueAtTime(frequency * 0.045, start);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.max(360, frequency * 3), start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(160, endFrequency * 2), start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + duration * 0.12);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  tremolo.connect(tremoloGain);
  tremoloGain.connect(oscillator.frequency);
  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  tremolo.start(start);
  oscillator.start(start);
  tremolo.stop(start + duration + 0.02);
  oscillator.stop(start + duration + 0.02);
}

function tone({ frequency, endFrequency, start, duration, gain, type }) {
  const context = audioContext;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, start);
  filter.frequency.exponentialRampToValueAtTime(480, start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + duration * 0.15);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noiseBurst({ start, duration, gain, filterFrequency }) {
  const context = audioContext;
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFrequency, start);
  filter.Q.setValueAtTime(0.9, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + duration * 0.08);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(context.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function cycleCamera() {
  cameraMode = (cameraMode + 1) % cameraTargets.length;
}

function resizeRenderer() {
  const rect = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateAnimations(delta);
  updateIdle(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
}

function updateAnimations(delta) {
  for (let index = animations.length - 1; index >= 0; index -= 1) {
    const item = animations[index];
    item.elapsed += delta;
    const progress = Math.min(item.elapsed / item.duration, 1);
    item.update(progress);
    if (progress >= 1) {
      animations.splice(index, 1);
      item.done?.();
    }
  }
}

function updateIdle(delta) {
  if (isAnimating) return;
  const time = clock.elapsedTime;
  pieces.forEach(({ group, type }, square) => {
    const pulse = Math.sin(time * 2.2 + square.charCodeAt(0)) * 0.025;
    group.position.y = group.userData.baseY + pulse;
    if (type === 'queen' || type === 'king') {
      group.rotation.y += delta * 0.12 * (group.userData.color === 'white' ? 1 : -1);
    }
  });
}

function updateCamera(delta) {
  const target = cameraTargets[cameraMode];
  const desired = target.position.clone();
  if (cameraMode !== 2) {
    const radius = Math.hypot(desired.x, desired.z);
    const height = desired.y;
    desired.x = Math.sin(orbitAngle) * radius;
    desired.z = Math.cos(orbitAngle) * radius;
    desired.y = height;
  }
  camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
  camera.lookAt(target.lookAt);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
