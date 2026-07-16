/**
 * ניהול אובייקטי הסצנה — מודל הנתונים המרכזי של המסמך.
 * כל גוף עטוף ב-SceneObject עם זהות, פרמטרים וחומר משלו.
 */

import * as THREE from 'three';
import { buildFeatureEdges } from '../geometry/GeometryUtils.js';

let nextId = 1;

export const DEFAULT_COLOR = '#8fa3bf';

export const COLOR_SWATCHES = [
  '#8fa3bf', '#4a6da7', '#2563eb', '#38a3a5',
  '#4fa14f', '#c9a227', '#d97941', '#d64560',
  '#9b59b6', '#5d6d7e', '#aab4bf', '#e8e2d6',
];

export function createStandardMaterial(color = DEFAULT_COLOR) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.1,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

export class SceneObject {
  /**
   * @param {object} opts
   * @param {string} opts.type — סוג primitive, 'boolean' או 'imported'
   * @param {THREE.BufferGeometry} opts.geometry
   * @param {string} [opts.name]
   * @param {object} [opts.params]
   * @param {string} [opts.color]
   */
  constructor({ type, geometry, name, params = null, color = DEFAULT_COLOR }) {
    this.id = nextId++;
    this.type = type;
    this.params = params;
    this.name = name || `גוף ${this.id}`;

    const material = createStandardMaterial(color);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.sceneObjectId = this.id;

    // קווי מתאר לקצוות חדים — מודגשים כמו בכלי CAD
    this.edges = new THREE.LineSegments(
      buildFeatureEdges(geometry),
      new THREE.LineBasicMaterial({ color: 0x2a3644, transparent: true, opacity: 0.32 })
    );
    this.edges.raycast = () => {};
    this.mesh.add(this.edges);
  }

  get visible() { return this.mesh.visible; }
  set visible(v) { this.mesh.visible = v; }

  /** החלפת גיאומטריה (עריכת פרמטרים / פעולה בוליאנית) */
  setGeometry(geometry) {
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.edges.geometry.dispose();
    this.edges.geometry = buildFeatureEdges(geometry);
  }

  setEdgesVisible(v) { this.edges.visible = v; }

  snapshotTransform() {
    return {
      position: this.mesh.position.clone(),
      quaternion: this.mesh.quaternion.clone(),
      scale: this.mesh.scale.clone(),
    };
  }

  applyTransform(t) {
    this.mesh.position.copy(t.position);
    this.mesh.quaternion.copy(t.quaternion);
    this.mesh.scale.copy(t.scale);
    this.mesh.updateMatrixWorld(true);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.edges.geometry.dispose();
    this.edges.material.dispose();
  }
}

export class SceneManager extends EventTarget {
  /** @param {THREE.Group} rootGroup — הקבוצה בסצנת ה-three שאליה נכנסים גופים */
  constructor(rootGroup) {
    super();
    this.root = rootGroup;
    /** @type {Map<number, SceneObject>} */
    this.objects = new Map();
    /** @type {Set<number>} */
    this.selection = new Set();
  }

  _emit(type, detail = {}) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  add(obj) {
    this.objects.set(obj.id, obj);
    this.root.add(obj.mesh);
    this._emit('objects-changed');
    return obj;
  }

  remove(obj) {
    if (!this.objects.has(obj.id)) return;
    this.objects.delete(obj.id);
    this.root.remove(obj.mesh);
    if (this.selection.delete(obj.id)) this._emit('selection-changed');
    this._emit('objects-changed');
  }

  get(id) { return this.objects.get(id); }

  byMesh(mesh) {
    const id = mesh?.userData?.sceneObjectId;
    return id != null ? this.objects.get(id) : null;
  }

  all() { return [...this.objects.values()]; }

  get count() { return this.objects.size; }

  /* ── בחירה ── */

  setSelection(ids) {
    this.selection = new Set(ids.filter((id) => this.objects.has(id)));
    this._emit('selection-changed');
  }

  toggleSelection(id) {
    if (this.selection.has(id)) this.selection.delete(id);
    else if (this.objects.has(id)) this.selection.add(id);
    this._emit('selection-changed');
  }

  clearSelection() {
    if (this.selection.size === 0) return;
    this.selection.clear();
    this._emit('selection-changed');
  }

  selectedObjects() {
    return [...this.selection].map((id) => this.objects.get(id)).filter(Boolean);
  }

  /** הבחירה הראשית — האובייקט האחרון שנבחר */
  primarySelected() {
    const objs = this.selectedObjects();
    return objs[objs.length - 1] ?? null;
  }

  notifyObjectChanged(obj) { this._emit('object-updated', { object: obj }); }

  totalTriangles() {
    let sum = 0;
    for (const o of this.objects.values()) {
      const g = o.mesh.geometry;
      sum += Math.floor((g.index ? g.index.count : g.getAttribute('position')?.count ?? 0) / 3);
    }
    return sum;
  }

  /** תיבת תיחום עולמית של כל הגופים הנראים */
  computeSceneBounds() {
    const box = new THREE.Box3();
    let any = false;
    for (const o of this.objects.values()) {
      if (!o.visible) continue;
      o.mesh.updateWorldMatrix(true, false);
      const b = new THREE.Box3().setFromObject(o.mesh);
      if (!b.isEmpty()) { box.union(b); any = true; }
    }
    return any ? box : null;
  }
}
