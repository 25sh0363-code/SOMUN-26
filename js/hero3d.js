/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — Hero FX · the placard (r14)
   A floating delegate tent-card under a volumetric spotlight, dust
   drifting through the beam. Three.js is vendored locally
   (js/vendor/three.module.js) — no CDN dependency at runtime.

   Desktop only (>=860px, no reduced-motion — the CSS hides .hero-fx
   otherwise, and main.js skips the import entirely).
   ———————————————————————————————————————————————————————————————— */

import * as THREE from "./vendor/three.module.js";

const PAPER = "#f1e6d0";
const INK = "#171210";
const CRIMSON = "#c8102e";

/* ————— canvas-drawn textures ————— */

function makePaperTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 656;
  const x = c.getContext("2d");
  /* paper */
  x.fillStyle = PAPER;
  x.fillRect(0, 0, 1024, 656);
  const edge = x.createRadialGradient(512, 328, 300, 512, 328, 760);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(84, 62, 40, 0.18)");
  x.fillStyle = edge;
  x.fillRect(0, 0, 1024, 656);
  /* faint grain */
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(23, 18, 16, ${Math.random() * 0.05})`;
    x.fillRect(Math.random() * 1024, Math.random() * 656, 1.4, 1.4);
  }
  /* crimson top band */
  x.fillStyle = CRIMSON;
  x.fillRect(0, 0, 1024, 14);
  x.fillStyle = "rgba(23, 18, 16, 0.85)";
  /* institution line */
  x.textAlign = "center";
  x.font = '600 27px Inter, system-ui, sans-serif';
  drawSpaced(x, "SILVER OAKS MODEL UNITED NATIONS", 512, 106, 7);
  /* rule */
  x.fillStyle = CRIMSON;
  x.fillRect(412, 150, 200, 3);
  /* wordmark */
  x.fillStyle = INK;
  x.font = '700 168px "Playfair Display", Georgia, serif';
  x.fillText("SOMUN", 512, 330);
  x.font = 'italic 700 92px "Playfair Display", Georgia, serif';
  x.fillStyle = CRIMSON;
  x.fillText("\u201926", 512, 432);
  /* delegate line */
  x.fillStyle = "rgba(23, 18, 16, 0.72)";
  x.font = '600 30px Inter, system-ui, sans-serif';
  drawSpaced(x, "DELEGATE \u00b7 EIGHTH SESSION", 512, 530, 8);
  /* bottom diamond */
  x.save();
  x.translate(512, 596);
  x.rotate(Math.PI / 4);
  x.fillStyle = CRIMSON;
  x.fillRect(-9, -9, 18, 18);
  x.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawSpaced(x, text, cx, y, gap) {
  /* letterspaced line centred on cx (canvas letterSpacing isn't universal) */
  const widths = [...text].map((ch) => x.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let cur = cx - total / 2;
  [...text].forEach((ch, i) => {
    x.fillText(ch, cur + widths[i] / 2, y);
    cur += widths[i] + gap;
  });
}

function makeBeamTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, "rgba(255,244,220,0)");
  g.addColorStop(0.45, "rgba(255,244,220,0.36)");
  g.addColorStop(0.78, "rgba(255,244,220,0.3)");
  g.addColorStop(0.95, "rgba(255,244,220,0.08)");
  g.addColorStop(1, "rgba(255,244,220,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function makeSoftDot() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(255,248,230,1)");
  g.addColorStop(0.4, "rgba(255,248,230,0.5)");
  g.addColorStop(1, "rgba(255,248,230,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 12, 128, 128, 124);
  g.addColorStop(0, "rgba(0,0,0,0.62)");
  g.addColorStop(0.6, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ————— scene ————— */

export async function initHero3D(heroEl) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const test = document.createElement("canvas");
  if (!(test.getContext("webgl2") || test.getContext("webgl"))) return null;

  const host = document.createElement("div");
  host.className = "hero-fx";
  host.setAttribute("aria-hidden", "true");
  heroEl.prepend(host);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 1.5, 7.6);
  camera.lookAt(0, 1.15, 0);

  /* lights */
  scene.add(new THREE.HemisphereLight(0xfff2dd, 0x0d0a08, 0.5));
  const key = new THREE.DirectionalLight(0xffe9c9, 1.9);
  key.position.set(3.4, 5, 4);
  scene.add(key);

  const spot = new THREE.SpotLight(0xfff0d2, 0, 14, 0.42, 0.65, 1.6);
  spot.position.set(0.4, 6.2, 1.4);
  spot.target.position.set(0, 1.1, 0);
  scene.add(spot, spot.target);
  const SPOT_MAX = 260;

  /* placard — tent card: two panels hinged at the ridge */
  const placard = new THREE.Group();
  const BASE_Y = 1.32;
  placard.position.set(0, BASE_Y - 0.5, 0); /* starts low; reveal() lifts it */

  const panelGeo = new THREE.PlaneGeometry(2.5, 1.6);
  panelGeo.translate(0, -0.8, 0); /* origin at the top edge */
  const panelMat = new THREE.MeshStandardMaterial({
    map: makePaperTexture(),
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const front = new THREE.Mesh(panelGeo, panelMat);
  front.rotation.x = -0.3;
  const back = new THREE.Mesh(panelGeo, panelMat);
  back.rotation.x = 0.3;
  back.rotation.y = Math.PI;
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 2.56, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a1f16, roughness: 0.6 })
  );
  ridge.rotation.z = Math.PI / 2;
  ridge.position.y = 0.02;
  placard.add(front, back, ridge);
  scene.add(placard);

  /* light shaft */
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1.55, 4.6, 40, 1, true),
    new THREE.MeshBasicMaterial({
      map: makeBeamTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beam.position.set(0.25, 3.85, 0.65);
  scene.add(beam);

  /* dust motes inside the shaft */
  const N = 170;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    respawn(i, true);
  }
  function respawn(i, anywhere) {
    const t = anywhere ? Math.random() : 1; /* 0 = top of shaft */
    const y = 5.9 - t * 4.4;
    const spread = 0.18 + (5.9 - y) * 0.3;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * spread;
    pos[i * 3] = 0.25 + Math.cos(a) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = 0.65 + Math.sin(a) * r * 0.6;
    vel[i] = 0.08 + Math.random() * 0.16;
    seed[i] = Math.random() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      map: makeSoftDot(),
      size: 0.045,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  scene.add(dust);

  /* contact shadow */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.6),
    new THREE.MeshBasicMaterial({
      map: makeShadowTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.02;
  scene.add(shadow);

  /* ————— state ————— */
  let revealed = false;
  let revealT = 0;
  let running = false;
  let raf = 0;
  let W = 1, H = 1;
  let tiltX = 0, tiltY = 0, tgtX = 0, tgtY = 0;
  let active = true;
  const clock = new THREE.Clock();

  function resize() {
    W = host.clientWidth || 1;
    H = host.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  window.addEventListener(
    "mousemove",
    (e) => {
      const r = host.getBoundingClientRect();
      tgtY = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width || 1))) * 0.26;
      tgtX = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height || 1))) * 0.1;
    },
    { passive: true }
  );

  function tick() {
    raf = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* reveal ramp — light comes up, placard rises */
    if (revealed && revealT < 1) {
      revealT = Math.min(1, revealT + dt / 1.5);
      const k = 1 - Math.pow(1 - revealT, 3); /* ease-out cubic */
      spot.intensity = SPOT_MAX * k;
      beam.material.opacity = 0.17 * k;
      dust.material.opacity = 0.5 * k;
      shadow.material.opacity = 0.55 * k;
      placard.position.y = BASE_Y - 0.5 + 0.5 * k;
    }

    /* idle life */
    tiltX += (tgtX - tiltX) * 0.055;
    tiltY += (tgtY - tiltY) * 0.055;
    placard.rotation.y = tiltY + Math.sin(t * 0.42) * 0.07;
    placard.rotation.x = tiltX;
    placard.rotation.z = Math.sin(t * 0.3) * 0.015;
    if (revealed) placard.position.y = BASE_Y + Math.sin(t * 0.85) * 0.05 - (1 - easeReveal()) * 0.5;
    beam.rotation.z = Math.sin(t * 0.23) * 0.02;
    if (revealed) beam.material.opacity = 0.17 * (0.92 + 0.08 * Math.sin(t * 8.2)) * easeReveal();

    /* dust drift */
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1] -= vel[i] * dt;
      pos[i * 3] += Math.sin(t * 0.7 + seed[i]) * 0.0006;
      if (pos[i * 3 + 1] < 1.2) respawn(i, false);
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  function easeReveal() {
    return 1 - Math.pow(1 - revealT, 3);
  }

  function start() {
    if (running || document.hidden) return;
    running = true;
    clock.getDelta();
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const io = new IntersectionObserver(
    (en) => (en[0].isIntersecting && active ? start() : stop()),
    { threshold: 0.05 }
  );
  io.observe(host);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : active && start()));

  window.addEventListener("resize", resize);

  await document.fonts.ready; /* Playfair before painting the card */

  return {
    reveal() {
      revealed = true;
      host.classList.add("on");
    },
    onShow() {
      active = true;
      start();
    },
    onHide() {
      active = false;
      stop();
    },
  };
}
