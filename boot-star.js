/* ==========================================================================
   ASHLIGHT — Boot star hero visual (Three.js, ES module)

   Runs only on the boot screen for maximum first-impression impact, then
   gets torn down (destroy()) once the mission starts, so it never competes
   with the live game loop for GPU/CPU during actual play.

   Fails gracefully: if WebGL or ES module loading isn't available (e.g. the
   page is opened directly via file:// instead of served over http/https),
   init() simply returns false and the flat SVG fallback already in the DOM
   stays visible. Nothing else in the app depends on this succeeding.
   ========================================================================== */

import * as THREE from './vendor/three.module.min.js';

let renderer, scene, camera, coreMesh, glowGroup, particles, rafId;

function buildStar(container) {
  const width = container.clientWidth || 220;
  const height = container.clientHeight || 220;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 6;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // Faceted core — a dying star cracking apart, not a smooth sphere
  const coreGeo = new THREE.IcosahedronGeometry(1.15, 2);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcf7a });
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  // Layered additive glow shells
  glowGroup = new THREE.Group();
  const glowLayers = [
    { scale: 1.4, color: 0xff8c42, opacity: 0.16 },
    { scale: 1.75, color: 0xff8c42, opacity: 0.10 },
    { scale: 2.15, color: 0xa3410f, opacity: 0.07 },
  ];
  glowLayers.forEach(({ scale, color, opacity }) => {
    const geo = new THREE.IcosahedronGeometry(scale, 1);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
    });
    glowGroup.add(new THREE.Mesh(geo, mat));
  });
  scene.add(glowGroup);

  // Drifting ember particles — the star's last light, scattering
  const count = 220;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.4 + Math.random() * 1.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xffcf9e, size: 0.045, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
}

function animate(time) {
  rafId = requestAnimationFrame(animate);
  const t = time * 0.001;
  if (coreMesh) coreMesh.rotation.y = t * 0.25;
  if (glowGroup) {
    glowGroup.rotation.y = -t * 0.12;
    glowGroup.scale.setScalar(1 + Math.sin(t * 1.6) * 0.05);
  }
  if (particles) particles.rotation.y = t * 0.06;
  renderer.render(scene, camera);
}

function handleResize() {
  if (!renderer || !renderer.domElement.parentElement) return;
  const container = renderer.domElement.parentElement;
  const w = container.clientWidth, h = container.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function init(containerId) {
  try {
    if (!window.WebGLRenderingContext) return false;
    const container = document.getElementById(containerId);
    if (!container) return false;
    buildStar(container);
    animate(0);
    window.addEventListener('resize', handleResize);

    const fallback = document.getElementById('boot-star-fallback');
    if (fallback) fallback.style.display = 'none';
    container.style.display = 'block';
    return true;
  } catch (e) {
    console.warn('AshlightBootStar: falling back to 2D star.', e);
    return false;
  }
}

function destroy() {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('resize', handleResize);
  if (renderer) {
    const el = renderer.domElement;
    renderer.dispose();
    if (el && el.parentElement) el.parentElement.removeChild(el);
  }
  [coreMesh, particles, ...(glowGroup ? glowGroup.children : [])].forEach(obj => {
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  renderer = scene = camera = coreMesh = glowGroup = particles = null;
}

window.AshlightBootStar = { init, destroy };

// Auto-init as soon as this module runs (module scripts execute after the
// DOM has been parsed, so #boot-star-canvas is guaranteed to exist here).
init('boot-star-canvas');
