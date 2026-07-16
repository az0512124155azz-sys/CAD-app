/**
 * מבט חתך — מישור גזירה גלובלי לאורך ציר נבחר.
 * מנוהל ברמת הרנדרר (clippingPlanes) כך שכל הגופים נחתכים יחד,
 * עם מישור חיווי שקוף המסמן את מיקום החתך.
 */

import * as THREE from 'three';

const AXES = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

export class SectionTool extends EventTarget {
  /** @param {import('../core/Viewport.js').Viewport} viewport */
  constructor(viewport) {
    super();
    this.viewport = viewport;
    this.axis = 'z';
    this.offset = 0;   // מ"מ
    this.flipped = false;
    this.enabled = false;

    this.plane = new THREE.Plane(AXES.z.clone().negate(), 0);

    // מישור חיווי ויזואלי
    this.indicator = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x2563eb,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.indicator.raycast = () => {};
    this.indicator.visible = false;

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.indicator.geometry),
      new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.5 })
    );
    edge.raycast = () => {};
    this.indicator.add(edge);
    viewport.helpersGroup.add(this.indicator);
  }

  setEnabled(on) {
    this.enabled = on;
    this._apply();
  }

  setAxis(axis) {
    if (!AXES[axis]) return;
    this.axis = axis;
    this._apply();
  }

  setOffset(mm) {
    this.offset = mm;
    this._apply();
  }

  setFlipped(f) {
    this.flipped = f;
    this._apply();
  }

  /** גבולות ההיסט הרלוונטיים לגודל הסצנה הנוכחי */
  suggestedRange(sceneBounds) {
    if (!sceneBounds) return { min: -100, max: 100 };
    const axis = this.axis;
    const min = sceneBounds.min[axis];
    const max = sceneBounds.max[axis];
    const pad = Math.max((max - min) * 0.1, 5);
    return { min: Math.floor(min - pad), max: Math.ceil(max + pad) };
  }

  _apply() {
    const dir = AXES[this.axis].clone();
    if (!this.flipped) dir.negate();
    // מישור: dir·p + constant >= 0 נשמר. constant כך שהחיתוך בערך offset.
    this.plane.normal.copy(dir);
    this.plane.constant = this.flipped ? -this.offset : this.offset;

    this.viewport.renderer.clippingPlanes = this.enabled ? [this.plane] : [];
    this._updateIndicator();
    this.dispatchEvent(new CustomEvent('changed'));
  }

  _updateIndicator() {
    if (!this.enabled) { this.indicator.visible = false; return; }
    const bounds = this.viewport.modelGroup.children.length
      ? new THREE.Box3().setFromObject(this.viewport.modelGroup)
      : new THREE.Box3(new THREE.Vector3(-80, 0, -80), new THREE.Vector3(80, 80, 80));
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z, 40) * 1.25;

    this.indicator.visible = true;
    this.indicator.scale.set(extent, extent, 1);
    this.indicator.position.copy(center);
    this.indicator.position[this.axis] = this.offset;

    if (this.axis === 'x') this.indicator.rotation.set(0, Math.PI / 2, 0);
    else if (this.axis === 'y') this.indicator.rotation.set(Math.PI / 2, 0, 0);
    else this.indicator.rotation.set(0, 0, 0);
  }

  /** ריענון החיווי כשהסצנה משתנה */
  refresh() { if (this.enabled) this._updateIndicator(); }
}
