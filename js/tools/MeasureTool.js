/**
 * כלי מדידה — מרחק בין שתי נקודות על גופים.
 * הנקודות מוצמדות לפני השטח שנלחץ; התוצאה מצוירת בשכבת SVG
 * מעל הקנבס ומתעדכנת בכל פריים עם תנועת המצלמה.
 */

import * as THREE from 'three';

export class MeasureTool extends EventTarget {
  /**
   * @param {import('../core/Viewport.js').Viewport} viewport
   * @param {import('../core/Units.js').UnitSystem} units
   * @param {object} els — layer, svg, label, hint
   */
  constructor(viewport, units, els) {
    super();
    this.viewport = viewport;
    this.units = units;
    this.els = els;
    this.active = false;
    this.points = [];

    this._marker1 = this._makeMarker();
    this._marker2 = this._makeMarker();

    viewport.addEventListener('frame', () => this._redraw());
  }

  _makeMarker() {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xe03e3e, depthTest: false, transparent: true, opacity: 0.95 })
    );
    m.renderOrder = 999;
    m.raycast = () => {};
    m.visible = false;
    this.viewport.helpersGroup.add(m);
    return m;
  }

  start() {
    this.active = true;
    this.points = [];
    this.els.layer.hidden = false;
    this.els.hint.hidden = false;
    this.els.hint.textContent = 'בחר נקודה ראשונה על גוף…';
    this.els.label.hidden = true;
    this.viewport.canvas.classList.add('is-picking');
    this._clearSvg();
    this._marker1.visible = false;
    this._marker2.visible = false;
  }

  stop() {
    this.active = false;
    this.points = [];
    this.els.layer.hidden = true;
    this.viewport.canvas.classList.remove('is-picking');
    this._marker1.visible = false;
    this._marker2.visible = false;
    this._clearSvg();
  }

  /** נקרא מ-pick של ה-viewport כשהכלי פעיל */
  handlePick(detail) {
    if (!this.active) return;
    if (!detail.mesh || !detail.point) return;

    if (this.points.length >= 2) this.points = [];
    this.points.push(detail.point.clone());

    if (this.points.length === 1) {
      this._marker1.position.copy(this.points[0]);
      this._marker1.visible = true;
      this._marker2.visible = false;
      this.els.hint.textContent = 'בחר נקודה שנייה…';
      this.els.label.hidden = true;
      this._clearSvg();
    } else {
      this._marker2.position.copy(this.points[1]);
      this._marker2.visible = true;
      this.els.hint.hidden = true;
      this._redraw();
      const d = this.points[0].distanceTo(this.points[1]);
      this.dispatchEvent(new CustomEvent('measured', { detail: { distance: d } }));
    }
  }

  _clearSvg() {
    while (this.els.svg.firstChild) this.els.svg.firstChild.remove();
  }

  _redraw() {
    if (!this.active || this.points.length !== 2) return;
    const [a, b] = this.points;
    const pa = this.viewport.worldToScreen(a);
    const pb = this.viewport.worldToScreen(b);

    this._clearSvg();
    if (pa.behind || pb.behind) { this.els.label.hidden = true; return; }

    const ns = 'http://www.w3.org/2000/svg';
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', pa.x); line.setAttribute('y1', pa.y);
    line.setAttribute('x2', pb.x); line.setAttribute('y2', pb.y);
    line.setAttribute('stroke', '#e03e3e');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6 4');
    this.els.svg.appendChild(line);

    for (const p of [pa, pb]) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
      c.setAttribute('r', '4');
      c.setAttribute('fill', '#e03e3e');
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', '1.5');
      this.els.svg.appendChild(c);
    }

    const dist = a.distanceTo(b);
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const dz = Math.abs(b.z - a.z);
    this.els.label.hidden = false;
    this.els.label.style.left = `${(pa.x + pb.x) / 2}px`;
    this.els.label.style.top = `${(pa.y + pb.y) / 2}px`;
    this.els.label.innerHTML =
      `${this.units.formatWithUnit(dist)} · ` +
      `<small>ΔX ${this.units.format(dx)} · ΔY ${this.units.format(dy)} · ΔZ ${this.units.format(dz)}</small>`;
  }
}
