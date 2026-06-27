import * as THREE from "three";

const COLS = 10;
const ROWS = 20;
const CELL = 1;

const canvas = document.getElementById("tetris-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);

const boardWidth = COLS * CELL;
const boardHeight = ROWS * CELL;
const camera = new THREE.OrthographicCamera(
    -boardWidth / 2 - 0.5, boardWidth / 2 + 0.5,
    boardHeight / 2 + 0.5, -boardHeight / 2 - 0.5,
    0.1, 100
);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x9b8cff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(3, 6, 10);
scene.add(keyLight);

// Static board outline (one thin frame around the play field)
const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(boardWidth, boardHeight, 0.1));
const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x9b8cff, transparent: true, opacity: 0.5 });
scene.add(new THREE.LineSegments(outlineGeometry, outlineMaterial));

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
}
window.addEventListener("resize", resize);
resize();

const SHAPES = {
    I: { color: 0x00f0f0, cells: [[1, 1, 1, 1]] },
    O: { color: 0xf0f000, cells: [[1, 1], [1, 1]] },
    T: { color: 0xa000f0, cells: [[0, 1, 0], [1, 1, 1]] },
    S: { color: 0x00f000, cells: [[0, 1, 1], [1, 1, 0]] },
    Z: { color: 0xf00000, cells: [[1, 1, 0], [0, 1, 1]] },
    J: { color: 0x0000f0, cells: [[1, 0, 0], [1, 1, 1]] },
    L: { color: 0xf0a000, cells: [[0, 0, 1], [1, 1, 1]] }
};
const SHAPE_KEYS = Object.keys(SHAPES);

const board = [];
for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));

let current = null;

function randomShapeKey() {
    return SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
}

function collides(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const br = row + r, bc = col + c;
            if (bc < 0 || bc >= COLS || br >= ROWS) return true;
            if (br >= 0 && board[br][bc]) return true;
        }
    }
    return false;
}

function spawnPiece() {
    const key = randomShapeKey();
    const def = SHAPES[key];
    const shape = def.cells;
    const col = Math.floor((COLS - shape[0].length) / 2);
    current = { shape: shape, color: def.color, row: 0, col: col };
    if (collides(shape, 0, col)) {
        current = null; // game over, handled in Task 8
    }
}

function lockPiece() {
    if (!current) return;
    for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
            if (!current.shape[r][c]) continue;
            const br = current.row + r, bc = current.col + c;
            if (br >= 0 && br < ROWS) board[br][bc] = current.color;
        }
    }
    current = null;
}

const cellMeshes = [];
for (let r = 0; r < ROWS; r++) {
    const rowMeshes = [];
    for (let c = 0; c < COLS; c++) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.92),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        mesh.position.set(
            (c - COLS / 2 + 0.5) * CELL,
            (ROWS / 2 - r - 0.5) * CELL,
            0
        );
        mesh.visible = false;
        scene.add(mesh);
        rowMeshes.push(mesh);
    }
    cellMeshes.push(rowMeshes);
}

function render() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const mesh = cellMeshes[r][c];
            const locked = board[r][c];
            mesh.visible = !!locked;
            if (locked) mesh.material.color.setHex(locked);
        }
    }
    if (current) {
        for (let r = 0; r < current.shape.length; r++) {
            for (let c = 0; c < current.shape[r].length; c++) {
                if (!current.shape[r][c]) continue;
                const br = current.row + r, bc = current.col + c;
                if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) continue;
                const mesh = cellMeshes[br][bc];
                mesh.visible = true;
                mesh.material.color.setHex(current.color);
            }
        }
    }
}

let lastDrop = 0;
const DROP_INTERVAL_MS = 800;

spawnPiece();

function tick(now) {
    if (current && now - lastDrop > DROP_INTERVAL_MS) {
        lastDrop = now;
        if (!collides(current.shape, current.row + 1, current.col)) {
            current.row += 1;
        } else {
            lockPiece();
            spawnPiece();
        }
    }
    render();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
