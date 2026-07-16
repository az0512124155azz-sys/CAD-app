/**
 * Viewport — מנוע התצוגה.
 * רנדרר, תאורה סטודיו, רשת עבודה, מצלמה כפולה (פרספקטיבה/אורתוגרפית)
 * עם מעבר חלק, בקרות מסלול, בחירה בעכבר ומעברי מצלמה מונפשים.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const SELECT_EDGE_COLOR = 0x2563eb;
const NORMAL_EDGE_COLOR = 0x2a3644;

/** רקע גרדיאנט עדין שנצרב לקנבס (נכלל גם בהקלטות וידאו) */
function makeBackgroundTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#f2f4f7');
  grad.addColorStop(0.55, '#e4e8ee');
  grad.addColorStop(1, '#ccd3dc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Viewport extends EventTarget {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} wrapper
   */
  constructor(canvas, wrapper) {
    super();
    this.canvas = canvas;
    this.wrapper = wrapper;

    /* ── רנדרר ── */
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.localClippingEnabled = true;

    /* ── סצנה ── */
    this.scene = new THREE.Scene();
    this.scene.background = makeBackgroundTexture();

    this.modelGroup = new THREE.Group();
    this.modelGroup.name = 'model-root';
    this.scene.add(this.modelGroup);

    this.helpersGroup = new THREE.Group();
    this.helpersGroup.name = 'helpers';
    this.scene.add(this.helpersGroup);

    this._setupLights();
    this._setupGrid(200);

    /* ── מצלמות ── */
    const aspect = 1;
    this.perspCamera = new THREE.PerspectiveCamera(50, aspect, 1, 20000);
    this.orthoCamera = new THREE.OrthographicCamera(-100, 100, 100, -100, -20000, 20000);
    this.camera = this.perspCamera;
    this.isOrtho = false;

    const HOME_POS = new THREE.Vector3(170, 150, 190);
    const HOME_TARGET = new THREE.Vector3(0, 25, 0);
    this._home = { pos: HOME_POS.clone(), target: HOME_TARGET.clone() };
    this.perspCamera.position.copy(HOME_POS);

    /* ── בקרות ── */
    this.controls = new OrbitControls(this.perspCamera, canvas);
    this.controls.target.copy(HOME_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 5000;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.update();

    /* ── גיזמו ── */
    this.gizmo = new TransformControls(this.perspCamera, canvas);
    this.gizmo.setSize(0.9);
    this.gizmo.addEventListener('dragging-changed', (e) => {
      this.controls.enabled = !e.value;
    });
    this.scene.add(this.gizmo);

    /* ── בחירה ── */
    this.raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._downPos = null;
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
    canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));

    /* ── שינוי גודל ── */
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(wrapper);
    this._resize();

    /* ── אנימציית מצלמה ── */
    this._camAnim = null;
    this._turntable = null;

    this._clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this._tick());
  }

  /* ═══════════ תאורה ורשת ═══════════ */

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xf4f7fb, 0xb8bec8, 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(160, 260, 120);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -260;
    key.shadow.camera.right = 260;
    key.shadow.camera.top = 260;
    key.shadow.camera.bottom = -260;
    key.shadow.camera.near = 10;
    key.shadow.camera.far = 900;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.35;
    this.scene.add(key);
    this._keyLight = key;

    const fill = new THREE.DirectionalLight(0xdfe8f5, 0.5);
    fill.position.set(-180, 120, -140);
    this.scene.add(fill);
  }

  _setupGrid(size) {
    if (this._gridRoot) {
      this.helpersGroup.remove(this._gridRoot);
      this._gridRoot.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    }
    const root = new THREE.Group();

    const minor = new THREE.GridHelper(size * 2, (size * 2) / 5, 0xb7bfc9, 0xcfd5dd);
    minor.material.transparent = true;
    minor.material.opacity = 0.45;
    root.add(minor);

    const major = new THREE.GridHelper(size * 2, (size * 2) / 50, 0x9aa4b0, 0x9aa4b0);
    major.material.transparent = true;
    major.material.opacity = 0.5;
    root.add(major);

    // צירי X/Z דרך הראשית
    const axisMat = (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 });
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-size, 0.02, 0), new THREE.Vector3(size, 0.02, 0),
    ]);
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.02, -size), new THREE.Vector3(0, 0.02, size),
    ]);
    root.add(new THREE.Line(xGeo, axisMat(0xd64560)));
    root.add(new THREE.Line(zGeo, axisMat(0x3771c8)));

    // מישור קליטת צללים
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 4, size * 4),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    shadowPlane.raycast = () => {};
    root.add(shadowPlane);

    root.traverse((o) => { o.raycast = o.raycast || (() => {}); });
    minor.raycast = () => {};
    major.raycast = () => {};

    this._gridRoot = root;
    this.helpersGroup.add(root);
  }

  setGridSize(size) { this._setupGrid(size); }
  setGridVisible(v) { this._gridRoot.visible = v; }
  get gridVisible() { return this._gridRoot.visible; }

  setShadowsEnabled(v) {
    this.renderer.shadowMap.enabled = v;
    this._keyLight.castShadow = v;
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  /* ═══════════ לולאת רינדור ═══════════ */

  _tick() {
    const dt = this._clock.getDelta();

    if (this._turntable) this._turntable(dt);
    if (this._camAnim) this._camAnim(dt);
    this.controls.update();

    if (this.isOrtho) this._syncOrthoFrustum();

    this.renderer.render(this.scene, this.camera);
    this.dispatchEvent(new CustomEvent('frame', { detail: { camera: this.camera } }));
  }

  _resize() {
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.perspCamera.aspect = w / h;
    this.perspCamera.updateProjectionMatrix();
    this._syncOrthoFrustum();
  }

  _syncOrthoFrustum() {
    const w = this.wrapper.clientWidth || 1;
    const h = this.wrapper.clientHeight || 1;
    const dist = this.orthoCamera.position.distanceTo(this.controls.target);
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2)) * dist;
    const halfW = halfH * (w / h);
    this.orthoCamera.left = -halfW;
    this.orthoCamera.right = halfW;
    this.orthoCamera.top = halfH;
    this.orthoCamera.bottom = -halfH;
    this.orthoCamera.updateProjectionMatrix();
  }

  /* ═══════════ מצלמה ═══════════ */

  /** מעבר פרספקטיבה ↔ אורתוגרפי תוך שמירת המסגור המדויק */
  setOrthographic(on) {
    if (on === this.isOrtho) return;
    this.isOrtho = on;
    const from = on ? this.perspCamera : this.orthoCamera;
    const to = on ? this.orthoCamera : this.perspCamera;
    to.position.copy(from.position);
    to.quaternion.copy(from.quaternion);
    if (on) {
      this.orthoCamera.zoom = 1;
      this._syncOrthoFrustum();
    }
    this.camera = to;
    this.controls.object = to;
    this.gizmo.camera = to;
    this.controls.update();
    this.dispatchEvent(new CustomEvent('camera-mode', { detail: { ortho: on } }));
  }

  /** אנימציית מעבר מצלמה חלקה */
  animateCameraTo(position, target, duration = 0.38) {
    const cam = this.camera;
    const p0 = cam.position.clone();
    const t0 = this.controls.target.clone();
    const p1 = position.clone();
    const t1 = target.clone();
    let elapsed = 0;
    this._camAnim = (dt) => {
      elapsed += dt;
      const k = Math.min(elapsed / duration, 1);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      cam.position.lerpVectors(p0, p1, e);
      this.controls.target.lerpVectors(t0, t1, e);
      if (k >= 1) this._camAnim = null;
    };
  }

  /** מבטים סטנדרטיים */
  setView(name, bounds = null) {
    const box = bounds ?? new THREE.Box3(
      new THREE.Vector3(-60, 0, -60), new THREE.Vector3(60, 60, 60)
    );
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = Math.max(sphere.radius * 2.4, 60);

    const dirs = {
      front:  new THREE.Vector3(0, 0.001, 1),
      back:   new THREE.Vector3(0, 0.001, -1),
      right:  new THREE.Vector3(1, 0.001, 0),
      left:   new THREE.Vector3(-1, 0.001, 0),
      top:    new THREE.Vector3(0.0001, 1, 0.0001),
      bottom: new THREE.Vector3(0.0001, -1, 0.0001),
      iso:    new THREE.Vector3(1, 0.82, 1.1).normalize(),
    };
    const dir = dirs[name] ?? dirs.iso;
    const pos = center.clone().addScaledVector(dir.clone().normalize(), dist);
    if (this.isOrtho) this.orthoCamera.zoom = 1;
    this.animateCameraTo(pos, center);
  }

  /** מסגור תיבת תיחום במרכז המסך */
  frameBox(box, pad = 1.35) {
    if (!box) { this.setView('iso'); return; }
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = sphere.center;
    const fov = THREE.MathUtils.degToRad(this.perspCamera.fov);
    const dist = Math.max((sphere.radius * pad) / Math.sin(fov / 2), 20);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (dir.lengthSq() < 1e-6) dir.set(1, 0.8, 1).normalize();
    if (this.isOrtho) this.orthoCamera.zoom = 1;
    this.animateCameraTo(center.clone().addScaledVector(dir, dist), center);
  }

  goHome() {
    this.animateCameraTo(this._home.pos, this._home.target);
  }

  /** סיבוב Turntable סביב היעד — משמש להקלטות */
  startTurntable(radPerSec) {
    const axis = new THREE.Vector3(0, 1, 0);
    this._turntable = (dt) => {
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(axis, radPerSec * dt);
      this.camera.position.copy(this.controls.target).add(offset);
      this.camera.lookAt(this.controls.target);
    };
  }
  stopTurntable() { this._turntable = null; }

  /* ═══════════ בחירה בעכבר ═══════════ */

  _setPointerFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onPointerDown(e) {
    if (e.button !== 0 && e.button !== 2) return;
    this._downPos = { x: e.clientX, y: e.clientY, button: e.button };
  }

  _onPointerUp(e) {
    const down = this._downPos;
    this._downPos = null;
    if (!down || down.button !== e.button) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > 5) return; // גרירה של מצלמה — לא קליק
    if (this.gizmo.dragging) return;

    this._setPointerFromEvent(e);
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.modelGroup.children, false);
    const mesh = hits.find((h) => h.object.visible)?.object ?? null;

    this.dispatchEvent(new CustomEvent('pick', {
      detail: {
        mesh,
        point: hits[0]?.point ?? null,
        normal: hits[0]?.face?.normal ?? null,
        additive: e.shiftKey || e.ctrlKey,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
      },
    }));
  }

  _onPointerMove(e) {
    // קואורדינטות סמן על מישור העבודה — לשורת הסטטוס
    if (this._coordThrottle) return;
    this._coordThrottle = true;
    requestAnimationFrame(() => { this._coordThrottle = false; });

    this._setPointerFromEvent(e);
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const pt = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this._groundPlane, pt);
    this.dispatchEvent(new CustomEvent('cursor-move', {
      detail: { point: hit ? pt : null, event: e },
    }));
  }

  /** הטלת קרן לגופים — לכלי מדידה */
  raycastMeshes(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.modelGroup.children, false);
    return hits.find((h) => h.object.visible) ?? null;
  }

  /** המרת נקודת עולם לקואורדינטות מסך (פיקסלים) */
  worldToScreen(v) {
    const p = v.clone().project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((p.x + 1) / 2) * rect.width,
      y: ((1 - p.y) / 2) * rect.height,
      behind: p.z > 1,
    };
  }

  /* ═══════════ הדגשת בחירה ═══════════ */

  applySelectionHighlight(objects, selectedIds) {
    for (const o of objects) {
      const selected = selectedIds.has(o.id);
      o.edges.material.color.setHex(selected ? SELECT_EDGE_COLOR : NORMAL_EDGE_COLOR);
      o.edges.material.opacity = selected ? 0.95 : 0.32;
      o.mesh.material.emissive.setHex(selected ? 0x16357a : 0x000000);
      o.mesh.material.emissiveIntensity = selected ? 0.14 : 0;
    }
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this._resizeObserver.disconnect();
    this.renderer.dispose();
  }
}
