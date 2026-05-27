import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const canvas = document.getElementById('arena');
const statusElement = document.getElementById('status');
const turnPill = document.getElementById('turn-pill');
const resetButton = document.getElementById('reset-button');
const cameraButton = document.getElementById('camera-button');
const soundButton = document.getElementById('sound-button');
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
  pawn: { name: 'Pride Scout', code: 'PS', move: 'Frontline cub warrior' }
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

let selectedSquare = null;
let currentPlayer = 'white';
let isAnimating = false;
let gameOver = false;
let cameraMode = 0;
let dragStart = null;
let orbitAngle = 0;
let audioContext = null;
let soundEnabled = true;

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
  updateHud('White Pride starts. Select a piece.');
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
  group.rotation.y = color === 'white' ? 0 : Math.PI;
  group.userData.square = square;
  group.userData.tag = tag;
  group.userData.color = color;
  group.userData.type = type;
  group.userData.baseY = 0.18;

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.44, 32), materials.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  shadow.renderOrder = -1;
  group.add(shadow);

  const bodyMaterial = color === 'white' ? materials.whiteBody : materials.blackBody;
  const armorMaterial = color === 'white' ? materials.whiteArmor : materials.blackArmor;

  addCoreBody(group, type, bodyMaterial, armorMaterial);
  addFelineHead(group, type, bodyMaterial, armorMaterial);
  addRoleDetails(group, type, armorMaterial);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.pieceGroup = group;
    }
  });

  pieces.set(square, { group, tag, type, color });
  boardGroup.add(group);
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
  if (isAnimating || gameOver) return;
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
    playSound('select');
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
    playFightSoundtrack();
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
}

function animateTravel(group, targetPosition, onDone) {
  const from = group.position.clone();
  const to = targetPosition.clone();
  to.y = 0.18;
  const distance = from.distanceTo(to);
  const duration = THREE.MathUtils.clamp(0.46 + distance * 0.09, 0.58, 1.18);
  const startRotation = group.rotation.clone();
  const moveType = group.userData.type;
  addAnimation(duration, (t) => {
    const eased = easeInOut(t);
    const stride = Math.sin(t * Math.PI * Math.max(2, Math.round(distance * 1.45)));
    const hopHeight = moveType === 'knight' ? 1.35 : 0.46;
    group.position.lerpVectors(from, to, eased);
    group.position.y = 0.18 + Math.sin(t * Math.PI) * hopHeight;
    group.rotation.z = startRotation.z + stride * (moveType === 'rook' ? 0.045 : 0.12);
    group.rotation.x = startRotation.x + Math.sin(t * Math.PI * 2) * (moveType === 'knight' ? 0.2 : 0.08);
    group.scale.y = 1 + Math.abs(stride) * 0.035;
  }, () => {
    group.rotation.copy(startRotation);
    group.scale.set(1, 1, 1);
    onDone();
  });
}

function animateBattle(attacker, defender, source, target, onDone) {
  const attackStart = attacker.position.clone();
  const defendStart = defender.position.clone();
  const targetPos = squareToPosition(target);
  const sourcePos = squareToPosition(source);
  const attackFacing = targetPos.clone().sub(sourcePos);
  const retreatFacing = sourcePos.clone().sub(targetPos);
  const attackerStance = targetPos.clone().add(retreatFacing.normalize().multiplyScalar(0.5));
  const defenderStance = targetPos.clone().add(attackFacing.normalize().multiplyScalar(0.25));
  attackerStance.y = 0.18;
  defenderStance.y = 0.18;
  const attackerStartRotation = attacker.rotation.clone();
  const defenderStartRotation = defender.rotation.clone();

  const flash = createFlash(targetPos);
  boardGroup.add(flash);
  const shockwave = createShockwave(targetPos);
  boardGroup.add(shockwave);

  addAnimation(2.35, (t) => {
    const approach = segment(t, 0, 0.28);
    const clashOne = segment(t, 0.26, 0.44);
    const counter = segment(t, 0.43, 0.62);
    const finalHit = segment(t, 0.62, 0.82);
    const vanish = segment(t, 0.78, 1);

    attacker.position.lerpVectors(attackStart, attackerStance, easeInOut(approach));
    defender.position.lerpVectors(defendStart, defenderStance, easeInOut(counter) * 0.16);

    if (t > 0.2 && t < 0.58) {
      attacker.position.y = 0.18 + Math.sin((clashOne + counter) * Math.PI) * 0.34;
      defender.position.y = 0.18 + Math.sin(counter * Math.PI) * 0.18;
      attacker.rotation.z = attackerStartRotation.z + Math.sin(t * Math.PI * 12) * 0.18;
      defender.rotation.z = defenderStartRotation.z - Math.sin(t * Math.PI * 10) * 0.14;
      attacker.rotation.x = attackerStartRotation.x - clashOne * 0.32 + counter * 0.18;
      defender.rotation.x = defenderStartRotation.x + counter * 0.28;
    }

    if (t >= 0.58) {
      const strike = easeOutBack(finalHit);
      attacker.position.lerpVectors(attackerStance, targetPos, strike);
      attacker.position.y = 0.18 + Math.sin(finalHit * Math.PI) * 0.72;
      attacker.rotation.z = attackerStartRotation.z + Math.sin(finalHit * Math.PI) * 0.42;
      defender.position.x = defenderStance.x + Math.sin(finalHit * Math.PI * 5) * 0.08;
      defender.position.z = defenderStance.z - finalHit * 0.58;
      defender.position.y = 0.18 + Math.sin(finalHit * Math.PI) * 0.26;
      defender.rotation.z = defenderStartRotation.z - finalHit * 1.15;
      defender.rotation.x = defenderStartRotation.x + finalHit * 0.75;
      defender.scale.setScalar(1 - vanish * 0.72);
    }

    flash.scale.setScalar(0.25 + Math.max(clashOne, counter, finalHit) * 2.45);
    flash.material.opacity = Math.max(0, 0.58 * (1 - vanish));
    shockwave.scale.setScalar(0.5 + finalHit * 3.2 + vanish * 1.6);
    shockwave.material.opacity = Math.max(0, 0.34 * finalHit * (1 - vanish));
  }, () => {
    boardGroup.remove(flash);
    boardGroup.remove(shockwave);
    defender.position.copy(defendStart);
    defender.rotation.copy(defenderStartRotation);
    defender.scale.set(1, 1, 1);
    attacker.rotation.copy(attackerStartRotation);
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
  turnPill.style.color = currentPlayer === 'white' ? '#fff4cf' : '#ffdfdc';
}

function updateCaptured() {
  whiteCapturedElement.textContent = captured.white.length ? captured.white.join(', ') : 'None';
  blackCapturedElement.textContent = captured.black.length ? captured.black.join(', ') : 'None';
}

function sideLabel(color) {
  return color === 'white' ? 'White Pride' : 'Black Pride';
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? 'Sound On' : 'Sound Off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) {
    ensureAudio();
    playSound('select');
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

function playFightSoundtrack() {
  playSound('clash', 0.38);
  playSound('counter', 0.82);
  playSound('clash', 1.16);
  playSound('impact', 1.48);
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
