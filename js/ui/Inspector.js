/**
 * פאנל המאפיינים — עריכה מספרית מדויקת של הגוף הנבחר.
 * כל שדה מציג ערכים ביחידות התצוגה וכותב חזרה למ"מ פנימי,
 * עם commit יחיד להיסטוריה בכל שינוי.
 */

import * as THREE from 'three';
import { PRIMITIVES, buildPrimitive } from '../geometry/Primitives.js';
import { computeVolume, computeSurfaceArea, triangleCount } from '../geometry/GeometryUtils.js';
import { COLOR_SWATCHES } from '../core/SceneManager.js';
import { TransformCommand, MaterialCommand, GeometryCommand, RenameCommand } from '../core/Commands.js';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

export class Inspector {
  /**
   * @param {object} deps — scene, history, units, quality:()=>string, onGeometryChanged
   */
  constructor(deps) {
    this.scene = deps.scene;
    this.history = deps.history;
    this.units = deps.units;
    this.getQuality = deps.quality;
    this.onGeometryChanged = deps.onGeometryChanged ?? (() => {});
    this._updating = false;

    this.els = {
      empty: document.getElementById('props-empty'),
      content: document.getElementById('props-content'),
      name: document.getElementById('prop-name'),
      color: document.getElementById('prop-color'),
      swatches: document.getElementById('color-swatches'),
      roughness: document.getElementById('prop-roughness'),
      roughnessVal: document.getElementById('prop-roughness-val'),
      metalness: document.getElementById('prop-metalness'),
      metalnessVal: document.getElementById('prop-metalness-val'),
      opacity: document.getElementById('prop-opacity'),
      opacityVal: document.getElementById('prop-opacity-val'),
      pos: ['pos-x', 'pos-y', 'pos-z'].map((id) => document.getElementById(id)),
      rot: ['rot-x', 'rot-y', 'rot-z'].map((id) => document.getElementById(id)),
      dim: ['dim-x', 'dim-y', 'dim-z'].map((id) => document.getElementById(id)),
      dimUniform: document.getElementById('dim-uniform'),
      paramGroup: document.getElementById('param-group'),
      paramFields: document.getElementById('param-fields'),
      info: document.getElementById('prop-info'),
    };

    this._buildSwatches();
    this._bind();

    this.scene.addEventListener('selection-changed', () => this.refresh());
    this.scene.addEventListener('object-updated', () => this.refresh());
    this.units.onChange(() => this.refresh());
  }

  get target() { return this.scene.primarySelected(); }

  /* ── בנייה ── */

  _buildSwatches() {
    for (const color of COLOR_SWATCHES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = color;
      b.title = color;
      b.addEventListener('click', () => this._commitMaterial({ color }));
      this.els.swatches.appendChild(b);
    }
  }

  _bind() {
    const { els } = this;

    els.name.addEventListener('change', () => {
      const obj = this.target;
      const val = els.name.value.trim();
      if (!obj || !val || val === obj.name) return;
      this.history.execute(new RenameCommand(this.scene, obj, obj.name, val));
    });

    els.color.addEventListener('input', () => {
      // תצוגה חיה בזמן בחירת צבע — ללא היסטוריה
      const obj = this.target;
      if (obj) { obj.mesh.material.color.set(els.color.value); }
    });
    els.color.addEventListener('change', () => this._commitMaterial({ color: els.color.value }, true));

    const bindRange = (input, valEl, key) => {
      input.addEventListener('input', () => {
        const obj = this.target;
        valEl.textContent = Number(input.value).toFixed(2);
        if (!obj) return;
        const m = obj.mesh.material;
        if (key === 'opacity') { m.opacity = +input.value; m.transparent = m.opacity < 1; }
        else m[key] = +input.value;
      });
      input.addEventListener('change', () => this._commitMaterial({ [key]: +input.value }, true));
    };
    bindRange(els.roughness, els.roughnessVal, 'roughness');
    bindRange(els.metalness, els.metalnessVal, 'metalness');
    bindRange(els.opacity, els.opacityVal, 'opacity');

    // מיקום / סיבוב / מידות — commit ב-Enter או blur
    const bindNum = (input, apply) => {
      const commit = () => { if (!this._updating) apply(input.value); };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { input.blur(); }
        if (e.key === 'Escape') { this.refresh(); input.blur(); }
      });
      input.addEventListener('focus', () => input.select());
    };

    ['x', 'y', 'z'].forEach((axis, i) => {
      bindNum(els.pos[i], (text) => this._applyPosition(axis, text));
      bindNum(els.rot[i], (text) => this._applyRotation(axis, text));
      bindNum(els.dim[i], (text) => this._applyDimension(i, text));
    });
  }

  /* ── כתיבה ── */

  _commitMaterial(after, alreadyApplied = false) {
    const obj = this.target;
    if (!obj) return;
    const m = obj.mesh.material;
    const before = {
      color: `#${m.color.getHexString()}`,
      roughness: m.roughness,
      metalness: m.metalness,
      opacity: m.opacity,
    };
    const full = { ...before, ...after };
    if (alreadyApplied) {
      // הערך כבר על החומר (עריכה חיה) — לפני יילקח מהמצב ההפוך
      for (const k of Object.keys(after)) before[k] = this._preEditMaterial?.[k] ?? before[k];
    }
    const cmd = new MaterialCommand(this.scene, obj, before, full);
    this.history.execute(cmd);
    this._preEditMaterial = null;
  }

  _applyPosition(axis, text) {
    const obj = this.target;
    if (!obj) return;
    const mm = this.units.parse(text);
    if (mm === null) { this.refresh(); return; }
    const before = obj.snapshotTransform();
    const after = obj.snapshotTransform();
    after.position[axis] = mm;
    if (before.position.equals(after.position)) return;
    this.history.execute(new TransformCommand(this.scene, [{ obj, before, after }], `מיקום ${obj.name}`, 'move'));
  }

  _applyRotation(axis, text) {
    const obj = this.target;
    if (!obj) return;
    const deg = parseFloat(String(text).replace(',', '.'));
    if (!Number.isFinite(deg)) { this.refresh(); return; }
    const before = obj.snapshotTransform();
    const euler = new THREE.Euler().setFromQuaternion(obj.mesh.quaternion, 'XYZ');
    euler[axis] = deg * DEG2RAD;
    const after = obj.snapshotTransform();
    after.quaternion = new THREE.Quaternion().setFromEuler(euler);
    if (before.quaternion.equals(after.quaternion)) return;
    this.history.execute(new TransformCommand(this.scene, [{ obj, before, after }], `סיבוב ${obj.name}`, 'rotate'));
  }

  /** שינוי מידה כוללת — עדכון scale בציר המתאים (או בכולם אם נעול יחס) */
  _applyDimension(axisIndex, text) {
    const obj = this.target;
    if (!obj) return;
    const mm = this.units.parse(text);
    if (mm === null || mm <= 0) { this.refresh(); return; }

    obj.mesh.geometry.computeBoundingBox();
    const size = obj.mesh.geometry.boundingBox.getSize(new THREE.Vector3());
    const axes = ['x', 'y', 'z'];
    const axis = axes[axisIndex];
    const baseSize = size[axis];
    if (baseSize < 1e-9) { this.refresh(); return; }

    const currentScale = obj.mesh.scale[axis];
    const newScale = mm / baseSize;
    if (Math.abs(newScale - currentScale) < 1e-9) return;

    const before = obj.snapshotTransform();
    const after = obj.snapshotTransform();
    if (this.els.dimUniform.checked) {
      const ratio = newScale / currentScale;
      after.scale.multiplyScalar(ratio);
    } else {
      after.scale[axis] = newScale;
    }
    this.history.execute(new TransformCommand(this.scene, [{ obj, before, after }], `מידות ${obj.name}`, 'scale'));
  }

  _applyParam(key, text) {
    const obj = this.target;
    if (!obj || !obj.params || !PRIMITIVES[obj.type]) return;
    const spec = PRIMITIVES[obj.type].params[key];
    if (!spec) return;

    let value;
    if (spec.kind === 'int') {
      value = Math.round(parseFloat(String(text).replace(',', '.')));
      if (!Number.isFinite(value)) { this.refresh(); return; }
    } else {
      const mm = this.units.parse(text);
      if (mm === null) { this.refresh(); return; }
      value = mm;
    }
    value = THREE.MathUtils.clamp(value, spec.min, spec.max);
    if (value === obj.params[key]) { this.refresh(); return; }

    const newParams = { ...obj.params, [key]: value };
    let built;
    try {
      built = buildPrimitive(obj.type, newParams, this.getQuality());
    } catch {
      this.refresh();
      return;
    }
    this.history.execute(new GeometryCommand(
      this.scene, obj,
      obj.mesh.geometry, obj.params,
      built.geometry, built.params,
      `${PRIMITIVES[obj.type].label} · ${spec.label}`
    ));
    this.onGeometryChanged(obj);
  }

  /* ── קריאה / רענון ── */

  refresh() {
    const obj = this.target;
    const { els } = this;
    this._updating = true;

    if (!obj) {
      els.empty.hidden = false;
      els.content.hidden = true;
      this._updating = false;
      return;
    }
    els.empty.hidden = true;
    els.content.hidden = false;

    if (document.activeElement !== els.name) els.name.value = obj.name;

    const m = obj.mesh.material;
    els.color.value = `#${m.color.getHexString()}`;
    els.roughness.value = m.roughness; els.roughnessVal.textContent = m.roughness.toFixed(2);
    els.metalness.value = m.metalness; els.metalnessVal.textContent = m.metalness.toFixed(2);
    els.opacity.value = m.opacity; els.opacityVal.textContent = m.opacity.toFixed(2);

    const setIfIdle = (input, val) => {
      if (document.activeElement !== input) input.value = val;
    };

    ['x', 'y', 'z'].forEach((axis, i) => {
      setIfIdle(els.pos[i], this.units.format(obj.mesh.position[axis]));
    });

    const euler = new THREE.Euler().setFromQuaternion(obj.mesh.quaternion, 'XYZ');
    ['x', 'y', 'z'].forEach((axis, i) => {
      setIfIdle(els.rot[i], (euler[axis] * RAD2DEG).toFixed(1).replace(/\.0$/, ''));
    });

    obj.mesh.geometry.computeBoundingBox();
    const size = obj.mesh.geometry.boundingBox.getSize(new THREE.Vector3());
    ['x', 'y', 'z'].forEach((axis, i) => {
      setIfIdle(els.dim[i], this.units.format(size[axis] * obj.mesh.scale[axis]));
    });

    this._refreshParams(obj);
    this._refreshInfo(obj);
    this._updating = false;
  }

  _refreshParams(obj) {
    const { els } = this;
    const def = obj.params ? PRIMITIVES[obj.type] : null;
    if (!def) {
      els.paramGroup.hidden = true;
      els.paramFields.innerHTML = '';
      return;
    }
    els.paramGroup.hidden = false;

    // בנייה חד-פעמית של שדות לפי סוג הגוף
    if (els.paramFields.dataset.type !== obj.type) {
      els.paramFields.innerHTML = '';
      els.paramFields.dataset.type = obj.type;
      for (const [key, spec] of Object.entries(def.params)) {
        const row = document.createElement('div');
        row.className = 'prop-row';
        const label = document.createElement('label');
        label.textContent = spec.label;
        const input = document.createElement('input');
        input.className = 'num-input';
        input.dataset.param = key;
        input.inputMode = 'decimal';
        input.addEventListener('change', () => this._applyParam(key, input.value));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') { this.refresh(); input.blur(); }
        });
        input.addEventListener('focus', () => input.select());
        row.append(label, input);
        els.paramFields.appendChild(row);
      }
    }

    for (const input of els.paramFields.querySelectorAll('input')) {
      if (document.activeElement === input) continue;
      const key = input.dataset.param;
      const spec = def.params[key];
      const v = obj.params[key];
      input.value = spec.kind === 'int' ? String(v) : this.units.format(v);
    }
  }

  _refreshInfo(obj) {
    const g = obj.mesh.geometry;
    const s = obj.mesh.scale;
    const factor = this.units.factor;
    const volumeMm3 = computeVolume(g) * s.x * s.y * s.z;
    const areaScale = ((s.x * s.y + s.y * s.z
      + s.x * s.z) / 3); // קירוב לשטח בסקאלה לא אחידה
    const areaMm2 = computeSurfaceArea(g) * areaScale;
    const u = this.units.label;

    const rows = [
      ['משולשים', triangleCount(g).toLocaleString()],
      [`נפח (${u}³)`, (volumeMm3 / factor ** 3).toLocaleString(undefined, { maximumFractionDigits: 2 })],
      [`שטח פנים (${u}²)`, (areaMm2 / factor ** 2).toLocaleString(undefined, { maximumFractionDigits: 2 })],
      ['סוג', obj.params ? PRIMITIVES[obj.type]?.label ?? obj.type : (obj.type === 'boolean' ? 'תוצאה בוליאנית' : 'מיובא')],
    ];
    this.els.info.innerHTML = rows
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
      .join('');
  }
}
