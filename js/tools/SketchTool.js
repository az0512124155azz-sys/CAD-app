/**
 * כלי סקיצה ואקסטרוזיה — שרטוט דו־ממדי על מישור העבודה ומשיכה לגוף.
 *
 * שלושה מצבי שרטוט: מצולע חופשי (קליק-קליק, סגירה בנקודה הראשונה),
 * מלבן (שתי פינות) ומעגל (מרכז + רדיוס). המצלמה עוברת אוטומטית
 * למבט-על אורתוגרפי בזמן השרטוט וחוזרת למצבה בסיום. נקודות מוצמדות
 * לרשת, מצולע נבדק לחיתוך-עצמי לפני האקסטרוזיה.
 */

import * as THREE from 'three';

const CLOSE_RADIUS_PX = 14;      // רדיוס סגירת מצולע במסך
const MIN_EDGE = 0.25;           // מ"מ — צלע קצרה מדי נדחית

/** בדיקת חיתוך בין שני קטעים במישור XZ (לא כולל קצוות משותפים) */
function segmentsIntersect(a1, a2, b1, b2) {
  const d = (p, q, r) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const d1 = d(b1, b2, a1);
  const d2 = d(b1, b2, a2);
  const d3 = d(a1, a2, b1);
  const d4 = d(a1, a2, b2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export class SketchTool extends EventTarget {
  /**
   * @param {import('../core/Viewport.js').Viewport} viewport
   * @param {import('../core/Units.js').UnitSystem} units
   * @param {{getSnap: () => number|null}} opts
   */
  constructor(viewport, units, opts) {
    super();
    this.viewport = viewport;
    this.units = units;
    this.getSnap = opts.getSnap;
    this.active = false;
    this.mode = 'polygon';   // 'polygon' | 'rect' | 'circle'
    this.points = [];        // THREE.Vector3 על מישור Y=0
    this._cursor = null;

    /* חיווי ויזואלי */
    const mkLine = (color, width = 1) => {
      const line = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, linewidth: width })
      );
      line.raycast = () => {};
      line.visible = false;
      line.renderOrder = 998;
      viewport.helpersGroup.add(line);
      return line;
    };
    this._outline = mkLine(0x2563eb);
    this._rubber = mkLine(0x2563eb);
    this._rubber.material.opacity = 0.45;

    this._firstMarker = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x2563eb, depthTest: false })
    );
    this._firstMarker.renderOrder = 999;
    this._firstMarker.raycast = () => {};
    this._firstMarker.visible = false;
    viewport.helpersGroup.add(this._firstMarker);

    this._fill = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0x2563eb, transparent: true, opacity: 0.08,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    this._fill.raycast = () => {};
    this._fill.visible = false;
    viewport.helpersGroup.add(this._fill);

    this._onDown = (e) => this._pointerDown(e);
    this._onUp = (e) => this._pointerUp(e);
    this._onMove = (e) => this._pointerMove(e);
  }

  /* ═══════════ מחזור חיים ═══════════ */

  start(mode = 'polygon') {
    if (this.active) this._reset();
    this.active = true;
    this.mode = mode;
    this.points = [];

    // שמירת מצב מצלמה ומעבר למבט-על אורתוגרפי
    this._savedCam = {
      pos: this.viewport.camera.position.clone(),
      target: this.viewport.controls.target.clone(),
      ortho: this.viewport.isOrtho,
    };
    this.viewport.setOrthographic(true);
    this.viewport.setView('top');
    this.viewport.controls.enableRotate = false;

    const c = this.viewport.canvas;
    c.classList.add('is-picking');
    c.addEventListener('pointerdown', this._onDown, true);
    c.addEventListener('pointerup', this._onUp, true);
    c.addEventListener('pointermove', this._onMove, true);

    this._emitState();
  }

  setMode(mode) {
    if (!this.active) return;
    this.mode = mode;
    this.points = [];
    this._refreshVisuals();
    this._emitState();
  }

  stop(restoreCamera = true) {
    if (!this.active) return;
    this.active = false;
    const c = this.viewport.canvas;
    c.classList.remove('is-picking');
    c.removeEventListener('pointerdown', this._onDown, true);
    c.removeEventListener('pointerup', this._onUp, true);
    c.removeEventListener('pointermove', this._onMove, true);
    this.viewport.controls.enableRotate = true;
    this._reset();

    if (restoreCamera && this._savedCam) {
      this.viewport.setOrthographic(this._savedCam.ortho);
      this.viewport.animateCameraTo(this._savedCam.pos, this._savedCam.target);
    }
    this._savedCam = null;
  }

  _reset() {
    this.points = [];
    this._outline.visible = false;
    this._rubber.visible = false;
    this._fill.visible = false;
    this._firstMarker.visible = false;
  }

  _emitState() {
    this.dispatchEvent(new CustomEvent('state', {
      detail: { mode: this.mode, points: this.points.length, canFinish: this._canFinish() },
    }));
  }

  _canFinish() {
    if (this.mode === 'polygon') return this.points.length >= 3;
    return false; // מלבן ומעגל נסגרים אוטומטית בקליק השני
  }

  /* ═══════════ קלט עכבר ═══════════ */

  _snap(p) {
    const s = this.getSnap();
    if (!s) return p;
    p.x = Math.round(p.x / s) * s;
    p.z = Math.round(p.z / s) * s;
    return p;
  }

  _pointerDown(e) {
    if (e.button !== 0) return;
    this._down = { x: e.clientX, y: e.clientY };
  }

  _pointerUp(e) {
    if (e.button !== 0 || !this._down) return;
    const moved = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y);
    this._down = null;
    if (moved > 5) return; // גרירת מצלמה (pan)

    const p = this.viewport.raycastGround(e.clientX, e.clientY);
    if (!p) return;
    this._snap(p);
    p.y = 0;

    e.stopPropagation();

    if (this.mode === 'polygon') this._addPolygonPoint(p, e);
    else if (this.points.length === 0) { this.points.push(p); this._refreshVisuals(); }
    else this._finishTwoPoint(p);

    this._emitState();
  }

  _pointerMove(e) {
    if (!this.active || this.points.length === 0) return;
    const p = this.viewport.raycastGround(e.clientX, e.clientY);
    if (!p) return;
    this._snap(p);
    p.y = 0;
    this._cursor = p;
    this._refreshVisuals(p);
  }

  _addPolygonPoint(p, e) {
    // סגירה בלחיצה ליד הנקודה הראשונה
    if (this.points.length >= 3) {
      const first = this.viewport.worldToScreen(this.points[0]);
      if (Math.hypot(first.x - (e.clientX - this.viewport.canvas.getBoundingClientRect().left),
                     first.y - (e.clientY - this.viewport.canvas.getBoundingClientRect().top)) < CLOSE_RADIUS_PX) {
        this.finish();
        return;
      }
    }
    const last = this.points[this.points.length - 1];
    if (last && last.distanceTo(p) < MIN_EDGE) return;
    this.points.push(p);
    this._refreshVisuals();
  }

  /* ═══════════ חיווי ═══════════ */

  _outlinePoints(cursor = null) {
    if (this.mode === 'polygon') {
      return cursor ? [...this.points, cursor] : [...this.points];
    }
    if (this.points.length === 0) return [];
    const a = this.points[0];
    const b = cursor ?? this.points[1];
    if (!b) return [a];
    if (this.mode === 'rect') {
      return [
        a,
        new THREE.Vector3(b.x, 0, a.z),
        b,
        new THREE.Vector3(a.x, 0, b.z),
        a,
      ];
    }
    // מעגל
    const r = Math.max(a.distanceTo(b), 0.01);
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(a.x + Math.cos(t) * r, 0, a.z + Math.sin(t) * r));
    }
    return pts;
  }

  _refreshVisuals(cursor = null) {
    const pts = this._outlinePoints(cursor);
    if (pts.length >= 2) {
      this._outline.geometry.dispose();
      this._outline.geometry = new THREE.BufferGeometry().setFromPoints(
        pts.map((p) => new THREE.Vector3(p.x, 0.05, p.z))
      );
      this._outline.visible = true;
    } else {
      this._outline.visible = false;
    }
    this._rubber.visible = false;
    this._firstMarker.visible = this.mode === 'polygon' && this.points.length > 0;
    if (this._firstMarker.visible) this._firstMarker.position.copy(this.points[0]).setY(0.05);
  }

  /* ═══════════ סיום ובנייה ═══════════ */

  _finishTwoPoint(p) {
    this.points.push(p);
    this.finish();
  }

  /** בונה את הגוף ומדווח החוצה. מחזיר false אם הסקיצה פסולה. */
  finish(heightMm = null) {
    const h = Math.max(heightMm ?? this._height ?? 20, 0.1);
    let outline;

    if (this.mode === 'polygon') {
      if (this.points.length < 3) return false;
      outline = [...this.points];
      // בדיקת חיתוך-עצמי
      const n = outline.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue; // צלעות שכנות בסגירה
          if (segmentsIntersect(outline[i], outline[(i + 1) % n], outline[j], outline[(j + 1) % n])) {
            this.dispatchEvent(new CustomEvent('invalid', { detail: { reason: 'המצולע חותך את עצמו — תקן את הסקיצה' } }));
            return false;
          }
        }
      }
    } else if (this.mode === 'rect') {
      const [a, b] = this.points;
      if (!b || Math.abs(a.x - b.x) < MIN_EDGE || Math.abs(a.z - b.z) < MIN_EDGE) {
        this._reset(); this._emitState();
        return false;
      }
      outline = [a, new THREE.Vector3(b.x, 0, a.z), b, new THREE.Vector3(a.x, 0, b.z)];
    } else {
      const [a, b] = this.points;
      const r = b ? a.distanceTo(b) : 0;
      if (r < MIN_EDGE) { this._reset(); this._emitState(); return false; }
      outline = [];
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        outline.push(new THREE.Vector3(a.x + Math.cos(t) * r, 0, a.z + Math.sin(t) * r));
      }
    }

    // בניית Shape במישור XY (‏y_shape = ‑z כדי שהסיבוב יחזיר ל+Z)
    const shape = new THREE.Shape();
    outline.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, -p.z);
      else shape.lineTo(p.x, -p.z);
    });
    shape.closePath();

    let geometry;
    try {
      geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    } catch {
      this.dispatchEvent(new CustomEvent('invalid', { detail: { reason: 'בניית הגוף מהסקיצה נכשלה' } }));
      return false;
    }
    geometry.rotateX(-Math.PI / 2);

    // מרכוז XZ + תחתית על הרשת; המיקום שומר את מקום השרטוט
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    geometry.translate(-cx, -bb.min.y, -cz);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    if (!geometry.getAttribute('position') || geometry.getAttribute('position').count < 3) {
      this.dispatchEvent(new CustomEvent('invalid', { detail: { reason: 'הסקיצה ריקה' } }));
      return false;
    }

    this.dispatchEvent(new CustomEvent('commit', {
      detail: { geometry, position: new THREE.Vector3(cx, 0, cz), mode: this.mode },
    }));
    this._reset();
    this._emitState();
    return true;
  }

  setHeight(mm) { this._height = mm; }
}
