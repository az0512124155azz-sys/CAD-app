/**
 * גופים בסיסיים פרמטריים.
 * כל גוף מוגדר בסכמה: פרמטרים, ברירות מחדל, ופונקציית בנייה.
 * המידות במ"מ. הציר Y הוא "למעלה", וכל גוף נבנה כשתחתיתו על מישור Y=0.
 */

import * as THREE from 'three';

/** רזולוציית עיגולים לפי הגדרת איכות */
const SEGMENTS = { low: 24, med: 48, high: 96 };

function radial(quality, cap = Infinity) {
  return Math.min(SEGMENTS[quality] ?? SEGMENTS.med, cap);
}

/** מרים גיאומטריה כך שתחתיתה על Y=0 */
function restOnGround(g) {
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** מנסרה משוכללת סביב ציר Y עם פאות שטוחות */
function prismGeometry(sides, radius, height) {
  const g = new THREE.CylinderGeometry(radius, radius, height, sides, 1, false);
  return g;
}

/** גלגל שיניים — פרופיל שן טרפזי מוקצה (מודל תצוגתי־הנדסי) */
function gearGeometry({ teeth, outerRadius, thickness, boreRadius }, quality) {
  const shape = new THREE.Shape();
  const t = Math.max(6, Math.round(teeth));
  const rOut = outerRadius;
  const rRoot = rOut * 0.8;
  const toothWidthTip = (Math.PI * 2 * rOut) / t * 0.25;
  const toothWidthBase = (Math.PI * 2 * rRoot) / t * 0.45;

  for (let i = 0; i < t; i++) {
    const a0 = (i / t) * Math.PI * 2;
    const a1 = ((i + 1) / t) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const halfTip = toothWidthTip / 2 / rOut;
    const halfBase = toothWidthBase / 2 / rRoot;

    const p = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
    if (i === 0) shape.moveTo(...p(rRoot, a0));
    else shape.lineTo(...p(rRoot, a0));
    shape.lineTo(...p(rRoot, mid - halfBase));
    shape.lineTo(...p(rOut, mid - halfTip));
    shape.lineTo(...p(rOut, mid + halfTip));
    shape.lineTo(...p(rRoot, mid + halfBase));
    shape.lineTo(...p(rRoot, a1));
  }
  shape.closePath();

  if (boreRadius > 0.1) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, Math.min(boreRadius, rRoot * 0.8), 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.04,
    bevelSize: thickness * 0.04,
    bevelSegments: 1,
    curveSegments: radial(quality, 48),
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** טריז — משולש ישר־זווית מוקצה */
function wedgeGeometry({ width, height, depth }) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** צינור — גליל עם קדח מרכזי, נבנה כפרופיל טבעת מוקצה */
function tubeGeometry({ outerRadius, innerRadius, height }, quality) {
  const inner = Math.min(innerRadius, outerRadius - 0.05);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, Math.max(inner, 0.05), 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: radial(quality),
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * סכמת הגופים. לכל פרמטר: label, min, max, step.
 * kind: 'len' — אורך (עובר המרת יחידות), 'int' — מספר שלם.
 */
export const PRIMITIVES = {
  box: {
    label: 'תיבה',
    params: {
      width:  { label: 'אורך',  kind: 'len', def: 40, min: 0.1, max: 2000 },
      height: { label: 'גובה',  kind: 'len', def: 40, min: 0.1, max: 2000 },
      depth:  { label: 'רוחב',  kind: 'len', def: 40, min: 0.1, max: 2000 },
    },
    build: (p) => new THREE.BoxGeometry(p.width, p.height, p.depth),
  },
  cylinder: {
    label: 'גליל',
    params: {
      radius: { label: 'רדיוס', kind: 'len', def: 20, min: 0.1, max: 1000 },
      height: { label: 'גובה',  kind: 'len', def: 40, min: 0.1, max: 2000 },
    },
    build: (p, q) => new THREE.CylinderGeometry(p.radius, p.radius, p.height, radial(q)),
  },
  sphere: {
    label: 'כדור',
    params: {
      radius: { label: 'רדיוס', kind: 'len', def: 22, min: 0.1, max: 1000 },
    },
    build: (p, q) => new THREE.SphereGeometry(p.radius, radial(q), Math.ceil(radial(q) * 0.6)),
  },
  cone: {
    label: 'חרוט',
    params: {
      radius: { label: 'רדיוס', kind: 'len', def: 22, min: 0.1, max: 1000 },
      height: { label: 'גובה',  kind: 'len', def: 44, min: 0.1, max: 2000 },
    },
    build: (p, q) => new THREE.ConeGeometry(p.radius, p.height, radial(q)),
  },
  torus: {
    label: 'טבעת',
    params: {
      radius: { label: 'רדיוס',    kind: 'len', def: 20, min: 0.5, max: 1000 },
      tube:   { label: 'עובי צינור', kind: 'len', def: 7,  min: 0.1, max: 500 },
    },
    build: (p, q) => {
      const g = new THREE.TorusGeometry(p.radius, Math.min(p.tube, p.radius * 0.96), Math.ceil(radial(q) * 0.5), radial(q));
      g.rotateX(-Math.PI / 2);
      return g;
    },
  },
  wedge: {
    label: 'טריז',
    params: {
      width:  { label: 'אורך', kind: 'len', def: 40, min: 0.1, max: 2000 },
      height: { label: 'גובה', kind: 'len', def: 30, min: 0.1, max: 2000 },
      depth:  { label: 'רוחב', kind: 'len', def: 40, min: 0.1, max: 2000 },
    },
    build: (p) => wedgeGeometry(p),
  },
  tube: {
    label: 'צינור',
    params: {
      outerRadius: { label: 'רדיוס חיצוני', kind: 'len', def: 20, min: 0.2, max: 1000 },
      innerRadius: { label: 'רדיוס פנימי',  kind: 'len', def: 13, min: 0.1, max: 999 },
      height:      { label: 'גובה',         kind: 'len', def: 40, min: 0.1, max: 2000 },
    },
    build: (p, q) => tubeGeometry(p, q),
  },
  capsule: {
    label: 'קפסולה',
    params: {
      radius: { label: 'רדיוס',      kind: 'len', def: 14, min: 0.1, max: 1000 },
      height: { label: 'גובה מרכזי', kind: 'len', def: 26, min: 0.1, max: 2000 },
    },
    build: (p, q) => new THREE.CapsuleGeometry(p.radius, p.height, Math.ceil(radial(q) * 0.4), radial(q)),
  },
  prism: {
    label: 'מנסרה',
    params: {
      sides:  { label: 'פאות',  kind: 'int', def: 6,  min: 3,   max: 24 },
      radius: { label: 'רדיוס', kind: 'len', def: 22, min: 0.1, max: 1000 },
      height: { label: 'גובה',  kind: 'len', def: 40, min: 0.1, max: 2000 },
    },
    build: (p) => prismGeometry(Math.round(p.sides), p.radius, p.height),
  },
  pyramid: {
    label: 'פירמידה',
    params: {
      sides:  { label: 'פאות',  kind: 'int', def: 4,  min: 3,   max: 24 },
      radius: { label: 'רדיוס', kind: 'len', def: 24, min: 0.1, max: 1000 },
      height: { label: 'גובה',  kind: 'len', def: 36, min: 0.1, max: 2000 },
    },
    build: (p) => new THREE.ConeGeometry(p.radius, p.height, Math.round(p.sides)),
  },
  ring: {
    label: 'דיסקה',
    params: {
      outerRadius: { label: 'רדיוס חיצוני', kind: 'len', def: 24, min: 0.2, max: 1000 },
      innerRadius: { label: 'רדיוס פנימי',  kind: 'len', def: 10, min: 0.1, max: 999 },
      height:      { label: 'עובי',         kind: 'len', def: 6,  min: 0.1, max: 500 },
    },
    build: (p, q) => tubeGeometry({ outerRadius: p.outerRadius, innerRadius: p.innerRadius, height: p.height }, q),
  },
  gear: {
    label: 'גלגל שיניים',
    params: {
      teeth:       { label: 'שיניים',      kind: 'int', def: 12, min: 6,   max: 60 },
      outerRadius: { label: 'רדיוס',       kind: 'len', def: 22, min: 1,   max: 500 },
      thickness:   { label: 'עובי',        kind: 'len', def: 8,  min: 0.5, max: 200 },
      boreRadius:  { label: 'קדח מרכזי',   kind: 'len', def: 5,  min: 0,   max: 400 },
    },
    build: (p, q) => gearGeometry(p, q),
  },
};

/** בונה גיאומטריה לפי סוג ופרמטרים, מונחתת על מישור העבודה */
export function buildPrimitive(type, params, quality = 'med') {
  const def = PRIMITIVES[type];
  if (!def) throw new Error(`primitive לא מוכר: ${type}`);
  const merged = {};
  for (const [key, spec] of Object.entries(def.params)) {
    let v = params?.[key] ?? spec.def;
    v = THREE.MathUtils.clamp(v, spec.min, spec.max);
    if (spec.kind === 'int') v = Math.round(v);
    merged[key] = v;
  }
  const g = def.build(merged, quality);
  restOnGround(g);
  return { geometry: g, params: merged };
}

export function defaultParams(type) {
  const def = PRIMITIVES[type];
  const out = {};
  for (const [key, spec] of Object.entries(def.params)) out[key] = spec.def;
  return out;
}
