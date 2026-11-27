// Photo-style renders of our own monument signs, made with three.js in headless Chromium by
// scripts/render-photos.js. Runs offline at build time; the site only ever loads the finished
// WebP images. Deterministic: every random choice comes from a seeded generator.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { geometry, lineWidthEm, shade } from '/src/js/builder/draw.js';

const IN = 0.0254;                                     // one inch in metres
const RISE = { flat: 0, arch: 0.075, peak: 0.1, shoulder: 0.06 };

function rng(seed) {                                    // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mix = (a, b, t) => a + (b - a) * t;
function hexToRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function vary(hex, r, amt) { const c = hexToRgb(hex); const k = 1 + (r() - 0.5) * amt; return `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`; }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noise(ctx, w, h, r, alpha, size = 1, dark = true) {
  for (let i = 0; i < (w * h) / (size * size * 6); i++) {
    ctx.fillStyle = `rgba(${dark ? '0,0,0' : '255,255,255'},${r() * alpha})`;
    ctx.fillRect(r() * w, r() * h, size, size);
  }
}

// ---------- materials ----------
const cache = new Map();
function stoneTextures(seed, base = '#C8C6BB') {
  const key = 'stone' + seed + base;
  if (cache.has(key)) return cache.get(key);
  const W = 1024, H = 512, r = rng(seed);          // covers 48 in × 24 in
  const col = canvas(W, H), bump = canvas(W, H);
  const c = col.getContext('2d'), b = bump.getContext('2d');
  c.fillStyle = '#8d897e'; c.fillRect(0, 0, W, H);  // mortar
  b.fillStyle = '#202020'; b.fillRect(0, 0, W, H);
  let y = 0;
  while (y < H) {
    const ch = mix(70, 130, r());
    let x = -r() * 120;
    while (x < W) {
      const cw = mix(110, 260, r());
      const g = 5;
      c.fillStyle = vary(base, r, 0.22);
      c.beginPath(); c.roundRect(x + g, y + g, cw - g * 2, ch - g * 2, 10); c.fill();
      const tint = r(); c.fillStyle = tint < 0.33 ? 'rgba(140,110,80,0.10)' : tint < 0.66 ? 'rgba(90,100,110,0.08)' : 'rgba(255,250,235,0.08)';
      c.fill();
      const v = Math.round(mix(170, 235, r())); b.fillStyle = `rgb(${v},${v},${v})`;
      b.beginPath(); b.roundRect(x + g, y + g, cw - g * 2, ch - g * 2, 14); b.fill();
      x += cw;
    }
    y += ch;
  }
  noise(c, W, H, r, 0.18, 2); noise(c, W, H, r, 0.12, 2, false);
  b.filter = 'blur(3px)'; b.drawImage(bump, 0, 0); b.filter = 'none';
  noise(b, W, H, r, 0.25, 2);
  const out = { col, bump, inchesW: 48, inchesH: 24 };
  cache.set(key, out);
  return out;
}
function stoneMaterial(seed, faceW, faceH, base) {
  const s = stoneTextures(seed, base);
  const rep = [faceW / (s.inchesW * IN), faceH / (s.inchesH * IN)];
  return new THREE.MeshStandardMaterial({ map: tex(s.col, { repeat: rep }), bumpMap: tex(s.bump, { repeat: rep, srgb: false }), bumpScale: 2.2, roughness: 0.92 });
}
function boxWithFaces(w, h, d, matFor) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mats = [matFor(d, h), matFor(d, h), matFor(w, d), matFor(w, d), matFor(w, h), matFor(w, h)];
  const m = new THREE.Mesh(g, mats);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function paintMaterial(hex, roughness = 0.62) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).convertSRGBToLinear ? new THREE.Color(hex) : hex, roughness });
}
function stuccoMaterial(hex, seed) {
  const W = 256, r = rng(seed), b = canvas(W, W), x = b.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, W, W); noise(x, W, W, r, 0.5, 2); noise(x, W, W, r, 0.5, 2, false);
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, bumpMap: tex(b, { repeat: [6, 6], srgb: false }), bumpScale: 0.6 });
}

// ---------- the sign ----------
function outline(w, h, rise, shape) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h);
  if (shape === 'arch') s.quadraticCurveTo(w / 2, h + rise * 2, 0, h);
  else if (shape === 'peak') { s.lineTo(w / 2, h + rise); s.lineTo(0, h); }
  else if (shape === 'shoulder') { const q = w * 0.2; s.lineTo(w - q, h); s.lineTo(w - q - rise, h + rise); s.lineTo(q + rise, h + rise); s.lineTo(q, h); s.lineTo(0, h); }
  else s.lineTo(0, h);
  s.lineTo(0, 0);
  return s;
}
function tracePath(ctx, x, y, w, h, rise, shape) {   // canvas coordinates, y down; top-left of box at (x,y), bottom at y+h+rise
  const top = y + rise, bot = y + rise + h;
  ctx.beginPath(); ctx.moveTo(x, bot); ctx.lineTo(x + w, bot); ctx.lineTo(x + w, top);
  if (shape === 'arch') ctx.quadraticCurveTo(x + w / 2, top - rise * 2, x, top);
  else if (shape === 'peak') { ctx.lineTo(x + w / 2, y); ctx.lineTo(x, top); }
  else if (shape === 'shoulder') { const q = w * 0.2; ctx.lineTo(x + w - q, top); ctx.lineTo(x + w - q - rise, y); ctx.lineTo(x + q + rise, y); ctx.lineTo(x + q, top); }
  ctx.lineTo(x, top); ctx.closePath();
}

// The face artwork: colour, relief (bump) and glow, drawn to the face's bounding box.
function faceArt(spec, g) {
  const { w, h, b } = g, rise = g.rise;
  const ppi = Math.min(28, 2400 / w);
  const W = Math.round(w * ppi), H = Math.round((h + rise) * ppi);
  const col = canvas(W, H), bump = canvas(W, H), glow = canvas(W, H);
  const c = col.getContext('2d'), bb = bump.getContext('2d'), gl = glow.getContext('2d');
  const fr = rise * (1 - (2 * b) / w);
  const field = (ctx) => tracePath(ctx, b * ppi, (b + (rise - fr)) * ppi, (w - 2 * b) * ppi, (h - 2 * b) * ppi, fr * ppi, spec.shape);
  // border and field
  c.fillStyle = spec.raised; c.fillRect(0, 0, W, H);
  bb.fillStyle = '#fff'; bb.fillRect(0, 0, W, H);
  gl.fillStyle = '#000'; gl.fillRect(0, 0, W, H);
  c.save(); field(c); c.clip();
  c.fillStyle = spec.field; c.fillRect(0, 0, W, H);
  // the border's cast shadow along the top and left of the recess, softened
  c.filter = `blur(${ppi * 0.35}px)`; c.strokeStyle = 'rgba(0,0,0,0.42)'; c.lineWidth = ppi * 1.4; field(c); c.stroke(); c.filter = 'none';
  c.restore();
  bb.fillStyle = '#000'; field(bb); bb.fill();
  // lettering, fitted as draw.js does
  const lines = spec.lines.filter(Boolean);
  if (lines.length) {
    const sans = spec.style === 'sans';
    const fw = w - 2 * b, fh = h - 2 * b;
    const widest = Math.max(...lines.map((l) => lineWidthEm(l, sans)));
    const size = Math.min(fh / (lines.length * 1.5), (fw * 0.86) / widest);
    const lead = size * 1.24;
    const cy = (rise + b) + fh / 2 - fr * 0.1;
    const y0 = cy - (lead * (lines.length - 1)) / 2 + size * 0.36;
    const font = `${sans ? 600 : 640} ${size * ppi}px ${sans ? '"R Franklin"' : '"R Besley"'}`;
    const cut = spec.lettering === 'metal' || spec.lettering === 'acrylic';
    const draw = (ctx, fill, dx = 0, dy = 0) => {
      ctx.font = font; ctx.textAlign = 'center'; ctx.letterSpacing = `${-0.012 * size * ppi}px`; ctx.fillStyle = fill;
      lines.forEach((l, i) => ctx.fillText(l, (w / 2) * ppi + dx, (y0 + i * lead) * ppi + dy));
    };
    if (!cut) {
      c.save(); field(c); c.clip();
      c.filter = `blur(${ppi * 0.25}px)`; draw(c, 'rgba(0,0,0,0.5)', ppi * 0.55, ppi * 0.6); c.filter = 'none';
      c.restore();
      draw(c, spec.raised);
      draw(bb, '#fff');
      if (spec.lit) draw(gl, '#fff');
    }
    spec._letters = { lines, font, y0, lead, ppi, W, H, size };
  }
  bb.filter = `blur(${ppi * 0.12}px)`; bb.drawImage(bump, 0, 0); bb.filter = 'none';
  return { col, bump, glow, W, H, ppi };
}

function buildSign(spec, config) {
  const st = { size: spec.size, shape: spec.shape, base: spec.base, pillars: spec.pillars, lettering: spec.lettering, lines: spec.lines };
  const g = geometry(st, config, 0);
  const group = new THREE.Group();
  const T = (spec.thickness || 4) * IN;                // panel thickness
  const panelBottom = -g.T - g.h;                      // inches above grade
  const W = g.w * IN, H = g.h * IN, R = g.rise * IN;
  const raised = new THREE.Color(spec.raised);
  const trim = new THREE.Color(spec.trim || '#EDEBE3');
  // panel body
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outline(W, H, R, spec.shape), { depth: T, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 48 }),
    new THREE.MeshStandardMaterial({ color: raised, roughness: 0.58 }));
  body.position.set(-W / 2, panelBottom * IN, -T / 2);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  // faces
  const art = faceArt(spec, g);
  const faceGeo = new THREE.ShapeGeometry(outline(W, H, R, spec.shape), 48);
  const uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / W, pos.getY(i) / (H + R));
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex(art.col), bumpMap: tex(art.bump, { srgb: false }), bumpScale: 9, roughness: 0.6,
    emissiveMap: spec.lit ? tex(art.glow) : null, emissive: spec.lit ? new THREE.Color('#fff4dc') : new THREE.Color(0), emissiveIntensity: spec.lit ? 5 : 0,
  });
  for (const side of spec.sides === 2 ? [1, -1] : [1]) {
    const f = new THREE.Mesh(faceGeo, faceMat);
    f.position.set(side === 1 ? -W / 2 : W / 2, panelBottom * IN, side * (T / 2 + 0.0045));
    if (side === -1) f.rotation.y = Math.PI;
    f.receiveShadow = true;
    group.add(f);
  }
  // cut letters standing off the face
  if ((spec.lettering === 'metal' || spec.lettering === 'acrylic') && art && spec._letters) {
    const L = spec._letters, lc = canvas(L.W, L.H), lx = lc.getContext('2d');
    lx.font = L.font; lx.textAlign = 'center'; lx.letterSpacing = `${-0.012 * L.size * L.ppi}px`; lx.fillStyle = '#fff';
    L.lines.forEach((l, i) => lx.fillText(l, (g.w / 2) * L.ppi, (L.y0 + i * L.lead) * L.ppi));
    const alpha = tex(lc, { srgb: false });
    const metal = spec.lettering === 'metal';
    const plane = new THREE.PlaneGeometry(W, H + R);
    const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alpha, alphaTest: 0.5 });
    const layers = 7;
    for (let k = 0; k < layers; k++) {
      const top = k === layers - 1;
      const m = new THREE.MeshStandardMaterial({
        color: metal ? (top ? '#eef0ec' : '#9a9d98') : (top ? spec.raised : new THREE.Color(spec.raised).multiplyScalar(0.72)),
        metalness: metal ? 0.55 : 0, roughness: metal ? 0.3 : 0.16, envMapIntensity: metal ? 1.6 : 1, alphaMap: alpha, alphaTest: 0.5, transparent: false,
      });
      const p = new THREE.Mesh(plane, m);
      p.position.set(0, panelBottom * IN + (H + R) / 2, T / 2 + 0.006 + (k / (layers - 1)) * 1.25 * IN);
      p.castShadow = true; p.customDepthMaterial = depthMat;
      group.add(p);
    }
  }
  // base, posts, pillars
  const stoneBase = spec.base === 'stone';
  const D = T + 8 * IN;
  if (spec.base === 'posts') {
    for (const sx of [-1, 1]) {
      const pw = g.pw * IN, top = -g.postTop * IN;
      const post = new THREE.Mesh(new THREE.BoxGeometry(pw, top, pw), stuccoMaterial(spec.trim || '#EDEBE3', 3));
      post.position.set(sx * (W / 2 + pw / 2), top / 2, 0); post.castShadow = post.receiveShadow = true; group.add(post);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(pw + 2 * IN, 1.2 * IN, pw + 2 * IN), new THREE.MeshStandardMaterial({ color: trim, roughness: 0.6 }));
      cap.position.set(post.position.x, top + 0.6 * IN, 0); cap.castShadow = true; group.add(cap);
    }
  } else {
    const bw = (g.pillars ? g.w : g.w + 8) * IN, bh = g.baseH * IN;
    const wall = stoneBase ? boxWithFaces(bw, bh, D, (a, b2) => stoneMaterial(11, a, b2, spec.stone || '#C8C6BB'))
      : new THREE.Mesh(new THREE.BoxGeometry(bw, bh, D), stuccoMaterial(spec.trim || '#EDEBE3', 5));
    wall.position.set(0, bh / 2, 0); wall.castShadow = wall.receiveShadow = true; group.add(wall);
    const cw = (g.pillars ? g.w : g.w + 12) * IN;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(cw, 2.6 * IN, D + 3 * IN), new THREE.MeshStandardMaterial({ color: trim, roughness: 0.55 }));
    cap.position.set(0, bh + 1.3 * IN, 0); cap.castShadow = cap.receiveShadow = true; group.add(cap);
    if (g.pillars) {
      const pw = g.pw * IN, ph = -g.pillarTop * IN, pd = D + 4 * IN;
      for (const sx of [-1, 1]) {
        const pil = stoneBase ? boxWithFaces(pw, ph, pd, (a, b2) => stoneMaterial(23, a, b2, spec.stone || '#C8C6BB'))
          : new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), stuccoMaterial(spec.trim || '#EDEBE3', 7));
        pil.position.set(sx * (W / 2 + pw / 2), ph / 2, 0); pil.castShadow = pil.receiveShadow = true; group.add(pil);
        const capMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.55 });
        if (g.pillars === 'peak') {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(pw + 2 * IN, 1.5 * IN, pd + 2 * IN), capMat);
          slab.position.set(pil.position.x, ph + 0.75 * IN, 0); slab.castShadow = true; group.add(slab);
          const roof = new THREE.Mesh(new THREE.ConeGeometry((pw + 2 * IN) * 0.7071, pw * 0.34, 4, 1), capMat);
          roof.rotation.y = Math.PI / 4; roof.position.set(pil.position.x, ph + 1.5 * IN + pw * 0.17, 0); roof.scale.set(1, 1, (pd + 2 * IN) / (pw + 2 * IN)); roof.castShadow = true; group.add(roof);
        } else {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(pw + 4 * IN, 2.6 * IN, pd + 4 * IN), capMat);
          slab.position.set(pil.position.x, ph + 1.3 * IN, 0); slab.castShadow = true; group.add(slab);
        }
      }
    }
  }
  group.userData = { width: (g.right - g.left) * IN, height: -g.top * IN, depth: D };
  return group;
}

// ---------- landscape ----------
function grassMaterial(seed, dry = false) {
  const W = 512, r = rng(seed), c = canvas(W, W), x = c.getContext('2d');
  x.fillStyle = dry ? '#6f7a45' : '#4f6b33'; x.fillRect(0, 0, W, W);
  for (let i = 0; i < 26000; i++) {
    const v = r(); x.fillStyle = v < 0.5 ? `rgba(36,58,22,${r() * 0.5})` : v < 0.85 ? `rgba(120,150,70,${r() * 0.45})` : `rgba(170,180,100,${r() * 0.35})`;
    x.fillRect(r() * W, r() * W, 1 + r() * 2, 2 + r() * 5);
  }
  const t = tex(c, { repeat: [300, 300] });
  return new THREE.MeshStandardMaterial({ map: t, roughness: 1 });
}
function plainNoiseMaterial(hex, seed, repeat, rough = 0.95, amt = 0.35) {
  const W = 256, r = rng(seed), c = canvas(W, W), x = c.getContext('2d');
  x.fillStyle = hex; x.fillRect(0, 0, W, W); noise(x, W, W, r, amt, 2); noise(x, W, W, r, amt * 0.6, 2, false);
  return new THREE.MeshStandardMaterial({ map: tex(c, { repeat }), roughness: rough });
}
// A smooth foliage mass: merged vertices (no cracks), displacement from position only, and
// vertex colours in clumps so it reads as leaves rather than a ball.
function blob(r, detail, seed, squash = 1, hue = '#3f5f2c', spread = 0.45) {
  let geo = new THREE.IcosahedronGeometry(r, detail);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  const p = geo.attributes.position, v = new THREE.Vector3(), base = new THREE.Color(hue);
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n1 = Math.sin(v.x * 7.1 + seed) * Math.sin(v.y * 6.3 + seed * 0.7) * Math.sin(v.z * 8.7 + seed * 1.3);
    const n2 = Math.sin(v.x * 23 + seed * 2) * Math.sin(v.y * 19) * Math.sin(v.z * 21 + seed);
    const k = 1 + n1 * 0.16 + n2 * 0.05;
    p.setXYZ(i, v.x * r * k, v.y * r * k * squash, v.z * r * k);
    const light = 0.78 + (n1 * 0.5 + n2 * 0.5) * spread + (v.y > 0 ? v.y * 0.18 : v.y * 0.25);
    const c = base.clone().multiplyScalar(Math.max(0.35, light));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
const leafMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
function shrub(x, z, s, seed, hue = '#3f5f2c') {
  const g = new THREE.Group(), r = rng(seed);
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(blob(s * mix(0.38, 0.62, r()), 4, seed + i * 3.1, 0.78, vary(hue, r, 0.25).replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, a, b2, c) => '#' + [a, b2, c].map((q) => (+q).toString(16).padStart(2, '0')).join(''))), leafMat());
    m.position.set(x + (r() - 0.5) * s * 1.3, s * mix(0.22, 0.42, r()), z + (r() - 0.5) * s * 0.9);
    m.castShadow = m.receiveShadow = true; g.add(m);
  }
  return g;
}
// Low groundcover along the front of the bed, in two foliage colours.
function groundcover(x, z, w, seed, hues) {
  const g = new THREE.Group(), r = rng(seed);
  const n = Math.max(5, Math.round(w / 0.24));
  for (let i = 0; i < n; i++) {
    const hue = hues.length > 1 && ((i * 7 + seed) % 9 === 0 || (i * 7 + seed) % 9 === 4) ? hues[1] : vary(hues[0], r, 0.25).replace(/rgb\((\d+),(\d+),(\d+)\)/, (_, a, b2, c) => '#' + [a, b2, c].map((q) => (+q).toString(16).padStart(2, '0')).join(''));
    const m = new THREE.Mesh(blob(mix(0.14, 0.21, r()), 4, seed + i * 1.7, 0.7, hue, 0.4), leafMat());
    m.position.set(x - w / 2 + (w * (i + 0.5)) / n + (r() - 0.5) * 0.12, 0.06, z + (r() - 0.5) * 0.2);
    m.castShadow = m.receiveShadow = true; g.add(m);
  }
  return g;
}
function tree(x, z, h, seed, hue = '#3c5a2a') {
  const g = new THREE.Group(), r = rng(seed);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.016, h * 0.026, h * 0.55, 10), new THREE.MeshStandardMaterial({ color: '#4d4033', roughness: 1 }));
  trunk.position.set(x, h * 0.27, z); trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(blob(h * mix(0.12, 0.19, r()), 4, seed * 7 + i * 2.3, 0.88, hue, 0.5), leafMat());
    const a = r() * Math.PI * 2, rad = h * mix(0.05, 0.24, r());
    m.position.set(x + Math.cos(a) * rad, h * mix(0.58, 0.9, r()), z + Math.sin(a) * rad * 0.8);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  return g;
}
function evergreen(x, z, h, seed) {
  const g = new THREE.Group(), r = rng(seed);
  // a tall, narrow conifer: overlapping elongated masses, widest low, tapering up
  for (let i = 0; i < 5; i++) {
    const t = i / 4, rad = h * mix(0.2, 0.07, t);
    const m = new THREE.Mesh(blob(rad, 4, seed + i * 5.3, mix(1.5, 2.1, t), '#2e4a2e', 0.45), leafMat());
    m.position.set(x + (r() - 0.5) * 0.08, h * mix(0.22, 0.86, t), z); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  return g;
}
function skyTexture(top, horizon) {
  const c = canvas(8, 512), x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(0.72, horizon); gr.addColorStop(1, horizon);
  x.fillStyle = gr; x.fillRect(0, 0, 8, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const LIGHT = {
  day: { sky: ['#5f93d3', '#cfe0ec'], sun: ['#fff4e2', 3.2], hemi: ['#cfe0f2', '#5f6b3f', 1.15], sunDir: [-6, 9, 7], exposure: 0.92, fog: '#dfe7ea' },
  golden: { sky: ['#6f93c6', '#e9d6bd'], sun: ['#ffd7a3', 3.6], hemi: ['#d6dcea', '#6b5b3a', 1.0], sunDir: [-9, 4.2, 6], exposure: 1.05, fog: '#ead9c0' },
  dusk: { sky: ['#1c2847', '#6d6f8f'], sun: ['#9fb0d8', 0.35], hemi: ['#5a6a92', '#1e2414', 0.55], sunDir: [-5, 6, 5], exposure: 1.15, fog: '#545a74' },
};

let renderer;
export async function renderShot(shot, config) {
  const L = LIGHT[shot.light || 'day'];
  const scene = new THREE.Scene();
  scene.background = skyTexture(L.sky[0], L.sky[1]);
  scene.fog = new THREE.Fog(L.sky[1], 40, 190);
  const sign = buildSign(shot.sign, config);
  scene.add(sign);
  // ground, sidewalk, planting bed
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), grassMaterial(5));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.6), plainNoiseMaterial('#b9b6ad', 9, [40, 1], 0.9, 0.25));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.004, 4.4); walk.receiveShadow = true; scene.add(walk);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 7), plainNoiseMaterial('#3d4042', 13, [30, 2], 0.95, 0.4));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.003, 8.8); road.receiveShadow = true; scene.add(road);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(120, 0.12, 0.18), plainNoiseMaterial('#c9c6bd', 17, [60, 1]));
  curb.position.set(0, 0.06, 5.29); curb.receiveShadow = true; curb.castShadow = true; scene.add(curb);
  const sw = sign.userData.width;
  const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 64), plainNoiseMaterial('#3e2c21', 21, [10, 10], 1, 0.55));
  bed.rotation.x = -Math.PI / 2; bed.scale.set(sw / 2 + 1.3, 1.45, 1); bed.position.set(0, 0.006, 0.3); bed.receiveShadow = true; scene.add(bed);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshStandardMaterial({ color: '#2b2b28', roughness: 0.6 }));
  edge.rotation.x = -Math.PI / 2; edge.scale.copy(bed.scale); edge.position.set(0, 0.012, 0.3); scene.add(edge);
  // planting
  const r = rng(shot.seed || 3);
  const half = sw / 2;
  for (const sx of [-1, 1]) {
    scene.add(shrub(sx * (half + 0.5), 0.3, 0.62, 40 + sx * 3));
    scene.add(shrub(sx * (half + 1.15), 0.55, 0.46, 50 + sx * 5, '#4a6b38'));
    scene.add(groundcover(sx * (half * 0.5 + 0.1), 1.0, half * 0.95, 60 + sx, shot.groundcover || ['#55743c', '#6b3b45']));
  }
  if (shot.trees !== false) {
    scene.add(tree(-half - 5.5, -9, 7, 81));
    scene.add(tree(half + 7, -12, 8, 82, '#41602d'));
    scene.add(evergreen(half + 3.6, -6, 4.6, 83));
    scene.add(evergreen(-half - 3, -5, 3.8, 84));
    for (let i = 0; i < 26; i++) scene.add(tree(-70 + i * 5.6 + r() * 2.5, -42 - r() * 10, mix(8, 13, r()), 100 + i, '#4a6438'));
  }
  // light
  scene.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
  const sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
  sun.position.set(...L.sunDir); sun.target.position.set(0, 0.8, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  scene.add(sun); scene.add(sun.target);
  if (shot.sign.lit) {
    for (const sx of [-1, 1]) {
      const s = new THREE.SpotLight('#ffe3b0', 9, 6, 0.5, 0.75, 1.6);
      s.position.set(sx * half * 0.55, 0.15, 1.25); s.target.position.set(sx * half * 0.3, sign.userData.height * 0.65, 0);
      s.castShadow = true; scene.add(s); scene.add(s.target);
    }
  }
  // camera
  const { width, height } = shot;
  const ss = shot.supersample || 2;
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.append(renderer.domElement);
  }
  renderer.toneMappingExposure = L.exposure;
  renderer.setPixelRatio(1);
  renderer.setSize(width * ss, height * ss, false);
  const cam = new THREE.PerspectiveCamera(shot.fov || 30, width / height, 0.1, 400);
  const c = shot.camera || {};
  const dist = c.distance || Math.max(5.2, sw * 2.6);
  const ang = (c.angle ?? -14) * Math.PI / 180;
  cam.position.set(Math.sin(ang) * dist + (c.x || 0), c.height ?? 1.35, Math.cos(ang) * dist);
  cam.lookAt(c.targetX || 0, c.targetY ?? sign.userData.height * 0.48, 0);
  if (c.shiftY) cam.position.y += c.shiftY;
  // pan: an off-axis shift of the frame that puts the sign right of centre, leaving room for a headline
  if (c.pan) cam.setViewOffset(width, height, -Math.round(width * c.pan), 0, width, height);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = shot.light === 'dusk' ? 0.12 : 0.45;
  const W2 = width * ss, H2 = height * ss;
  const composer = new EffectComposer(renderer);
  composer.setSize(W2, H2);
  composer.addPass(new RenderPass(scene, cam));
  const ao = new GTAOPass(scene, cam, W2, H2);
  ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.2, thickness: 1, scale: 1 });
  composer.addPass(ao);
  const focus = cam.position.distanceTo(new THREE.Vector3(0, sign.userData.height * 0.5, 0));
  composer.addPass(new BokehPass(scene, cam, { focus, aperture: shot.aperture ?? 0.0022, maxblur: 0.009 }));
  composer.addPass(new OutputPass());
  composer.render();
  pmrem.dispose();
  // downsample for clean edges, then encode WebP at each requested width
  const out = {};
  for (const w of shot.widths || [width]) {
    const h = Math.round((w * height) / width);
    const cv = canvas(w, h), x = cv.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(renderer.domElement, 0, 0, w, h);
    out[w] = cv.toDataURL('image/webp', shot.quality || 0.84);
  }
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { Object.values(m).forEach((v) => v && v.isTexture && v.dispose()); m.dispose(); }); });
  return out;
}

export async function loadFonts() {
  for (const [name, file, w] of [['R Besley', 'besley-latin-wght-normal.woff2', '400 900'], ['R Franklin', 'libre-franklin-latin-wght-normal.woff2', '100 900']]) {
    const f = new FontFace(name, `url(/src/fonts/${file})`, { weight: w });
    document.fonts.add(await f.load());
  }
  await document.fonts.load('640 40px "R Besley"');
}
