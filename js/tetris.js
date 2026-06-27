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

function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
tick();
