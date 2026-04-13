import * as THREE from 'three';

// ---- SCENE SETUP ----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 100, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---- TEXTURE LOADER ----
const loader = new THREE.TextureLoader();
loader.load('./textures/sun.jpg', (tex) => { console.log('✅ sun texture loaded!', tex); }, undefined, (err) => { console.error('❌ sun texture FAILED:', err); });

// ---- STARFIELD ----
const starGeometry = new THREE.BufferGeometry();
const starCount = 8000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  starPositions[i] = (Math.random() - 0.5) * 8000;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
scene.add(new THREE.Points(starGeometry, starMaterial));

// ---- SKYBOX ----
const skyGeo = new THREE.SphereGeometry(4000, 64, 64);
const skyTex = loader.load('./textures/starmap.jpg');
const skyMat = new THREE.MeshBasicMaterial({
  map: skyTex,
  side: THREE.BackSide,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// ---- NEBULA CLOUDS ----
function makeNebula(x, y, z, size, color, opacity) {
  // Each nebula is made of multiple overlapping layers for a wispy look
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.SphereGeometry(
      size * (0.4 + Math.random() * 0.8), 8, 8
    );
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity * (0.2 + Math.random() * 0.5),
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      x + (Math.random() - 0.5) * size,
      y + (Math.random() - 0.5) * size * 0.5,
      z + (Math.random() - 0.5) * size
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    scene.add(mesh);
  }
}

// Push them far back near the stars
makeNebula(-1500,  300, -2000, 800, 0x6600cc, 0.04);
makeNebula( 2000, -200, -1500, 700, 0x0022cc, 0.035);
makeNebula(-1000, -500,  2000, 900, 0xcc0044, 0.03);
makeNebula( 1800,  600, -1000, 600, 0x002299, 0.04);
makeNebula( -500,  800, -2500, 750, 0x440099, 0.035);
makeNebula(  800, -800,  1800, 850, 0x993300, 0.03);

// ---- SUN ----
const sunTexture = loader.load('./textures/sun.jpg');
const sunGeo = new THREE.SphereGeometry(30, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ map: sunTexture });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Inner corona
const corona1Geo = new THREE.SphereGeometry(33, 64, 64);
const corona1Mat = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 0.2,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(corona1Geo, corona1Mat));

// Middle corona
const corona2Geo = new THREE.SphereGeometry(40, 64, 64);
const corona2Mat = new THREE.MeshBasicMaterial({
  color: 0xff6600,
  transparent: true,
  opacity: 0.1,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(corona2Geo, corona2Mat));

// Outer corona
const corona3Geo = new THREE.SphereGeometry(55, 64, 64);
const corona3Mat = new THREE.MeshBasicMaterial({
  color: 0xff3300,
  transparent: true,
  opacity: 0.04,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(corona3Geo, corona3Mat));

// Sun glow (point light)
const sunLight = new THREE.PointLight(0xffffff, 3, 3000);
scene.add(sunLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

// Sun label
const sunLabel = makeLabel('WUMARA');
sunLabel.style.transform = 'translateX(-50%)';
document.body.appendChild(sunLabel);

// ---- PLANETS ----
function makePlanet(texturePath, size, orbitRadius, orbitSpeed, tilt = 0, glowColor = 0x4444ff) {
  const texture = loader.load(texturePath);
  const geo = new THREE.SphereGeometry(size, 64, 64);
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = tilt;

  // Atmosphere glow
  const glowGeo = new THREE.SphereGeometry(size * 1.15, 64, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: 0.32,
    side: THREE.BackSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  mesh.add(glow);

  // Orbit pivot
  const pivot = new THREE.Object3D();
  pivot.add(mesh);
  scene.add(pivot);
  mesh.position.x = orbitRadius;

  return { mesh, pivot, orbitRadius, orbitSpeed };
}

// Mars - Photography
const mars    = makePlanet('./textures/planet1.jpg', 8,  80,  0.003,  0, 0xff4422);

// Saturn - Videos
const saturn  = makePlanet('./textures/planet2.jpg', 12, 150, 0.0018, 0, 0xffe599);

// Saturn ring
const ringGeo = new THREE.RingGeometry(15, 24, 64);
const ringTexture = loader.load('./textures/saturn_ring.png');
const ringMat = new THREE.MeshBasicMaterial({
  map: ringTexture,
  side: THREE.DoubleSide,
  transparent: true,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2.5;
saturn.mesh.add(ring);

// Neptune - Projects
const neptune = makePlanet('./textures/planet3.jpg', 10, 230, 0.001,  0, 0x4466ff);

const planets = [
  { ...mars,    name: 'Photography', page: 'photography.html', color: '#ff6b6b' },
  { ...saturn,  name: 'Videos',      page: 'videos.html',      color: '#ffe599' },
  { ...neptune, name: 'Projects',    page: 'projects.html',    color: '#64b5f6' },
];

// ---- ORBIT LINES ----
function makeOrbitLine(radius) {
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
  return new THREE.Line(geo, mat);
}

scene.add(makeOrbitLine(80));
scene.add(makeOrbitLine(150));
scene.add(makeOrbitLine(230));

// ---- LABELS ----
function makeLabel(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: white;
    text-shadow: 0 0 8px white;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
    white-space: nowrap;
  `;
  return el;
}

const planetLabels = planets.map(p => {
  const label = makeLabel(p.name);
  label.style.color = p.color;
  label.style.textShadow = `0 0 8px ${p.color}`;
  document.body.appendChild(label);
  return label;
});

// ---- MOUSE / DRAG / ZOOM ----
let isDragging = false;
let dragMoved = false;
let prevMouse = { x: 0, y: 0 };
let spherical = { theta: 0, phi: Math.PI / 3, radius: 300 };
let targetSpherical = { theta: 0, phi: Math.PI / 3, radius: 300 };
let mousePos = { x: 0, y: 0 };

document.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragMoved = false;
  prevMouse = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mousemove', (e) => {
  mousePos = { x: e.clientX, y: e.clientY };
  if (!isDragging) return;
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  if (Math.hypot(dx, dy) > 3) dragMoved = true;
  targetSpherical.theta -= dx * 0.005;
  targetSpherical.phi   -= dy * 0.005;
  targetSpherical.phi = Math.max(0.2, Math.min(Math.PI / 2, targetSpherical.phi));
  prevMouse = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mouseup', () => { isDragging = false; });

document.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetSpherical.radius += e.deltaY * 0.3;
  targetSpherical.radius = Math.max(60, Math.min(800, targetSpherical.radius));
}, { passive: false });

// ---- CLICK TO NAVIGATE ----
const raycaster = new THREE.Raycaster();
const mouse2D = new THREE.Vector2();

document.addEventListener('click', (e) => {
  if (dragMoved) { dragMoved = false; return; }

  // Check if sun was clicked
  const sunPos = toScreen(new THREE.Vector3(0, 0, 0));
  const sunDist = Math.hypot(e.clientX - sunPos.x, e.clientY - sunPos.y);
  if (sunDist < 50) {
    window.location.href = 'secret.html';
    return;
  }

  mouse2D.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse2D, camera);
  const meshes = planets.map(p => p.mesh);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    const hit = hits[0].object;
    const planet = planets.find(p => p.mesh === hit);
    if (planet) {
      spawnRipple(e.clientX, e.clientY, planet.color);
      setTimeout(() => { window.location.href = planet.page; }, 400);
    }
  }
});

// ---- RIPPLE ----
function spawnRipple(x, y, color) {
  const r = document.createElement('div');
  r.style.cssText = `
    position: fixed; border-radius: 50%; pointer-events: none;
    width: 60px; height: 60px;
    border: 2px solid ${color};
    left: ${x}px; top: ${y}px;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple-out 0.6s ease-out forwards;
    z-index: 200;
  `;
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ---- RESIZE ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- PROJECT TO SCREEN ----
function toScreen(position) {
  const vec = position.clone().project(camera);
  return {
    x: ( vec.x + 1) / 2 * window.innerWidth,
    y: (-vec.y + 1) / 2 * window.innerHeight,
  };
}

// ---- ANIMATE ----
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Rotate sun
  sun.rotation.y = t * 0.1;

  // Orbit planets
  planets.forEach(p => {
    p.pivot.rotation.y += p.orbitSpeed;
    p.mesh.rotation.y  += 0.005;
  });

// Smooth easing towards target
  const ease = 0.08;
  spherical.theta  += (targetSpherical.theta  - spherical.theta)  * ease;
  spherical.phi    += (targetSpherical.phi    - spherical.phi)    * ease;
  spherical.radius += (targetSpherical.radius - spherical.radius) * ease;

  // Move camera in spherical coords
  camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
  camera.position.y = spherical.radius * Math.cos(spherical.phi);
  camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
  camera.lookAt(0, 0, 0);

  // Update planet labels
  planets.forEach((p, i) => {
    const screenPos = toScreen(p.mesh.getWorldPosition(new THREE.Vector3()));
    const label = planetLabels[i];
    label.style.left = screenPos.x + 'px';
    label.style.top  = (screenPos.y + 20) + 'px';
    label.style.transform = 'translateX(-50%)';

    const dx = mousePos.x - screenPos.x;
    const dy = mousePos.y - screenPos.y;
    label.style.opacity = Math.hypot(dx, dy) < 80 ? '1' : '0';
  });

  // Update sun label
  const sunScreen = toScreen(new THREE.Vector3(0, 0, 0));
  sunLabel.style.left = sunScreen.x + 'px';
  sunLabel.style.top  = (sunScreen.y + 38) + 'px';
  sunLabel.style.opacity = '0.8';

  renderer.render(scene, camera);
}

animate();