/**
 * כלי עזר גיאומטריים — ניקוי, אימות ומדידה של BufferGeometry.
 * כל תוצאה בוליאנית עוברת כאן לפני שהיא חוזרת לסצנה.
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();

/**
 * מסיר משולשים מנוונים (sliver) מגיאומטריה לא-אינדקסית.
 * הקריטריון הוא גובה המשולש ביחס לצלעו הארוכה: משולש שגובהו קטן
 * מרעש הקוונטיזציה של float32 בסקאלת הגוף מייצר נורמל לא יציב
 * וקצוות מדומים — ומוסר. פרטים קטנים לגיטימיים (משולשים קטנים
 * אך מאוזנים) נשמרים.
 */
export function removeDegenerateTriangles(geometry) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = nonIndexed.getAttribute('position');
  if (!pos) return nonIndexed;

  nonIndexed.computeBoundingSphere();
  const scale = Math.max(nonIndexed.boundingSphere?.radius ?? 1, 1e-6);
  // רזולוציית float32 יחסית ~6e-8; מקדם ביטחון 20
  const minHeight = scale * 1.2e-6;

  const triCount = pos.count / 3;
  const keep = [];
  for (let i = 0; i < triCount; i++) {
    _a.fromBufferAttribute(pos, i * 3);
    _b.fromBufferAttribute(pos, i * 3 + 1);
    _c.fromBufferAttribute(pos, i * 3 + 2);
    _ab.subVectors(_b, _a);
    _ac.subVectors(_c, _a);
    const area = _ab.cross(_ac).length() * 0.5;
    if (!Number.isFinite(area) || area <= 0) continue;
    const longestEdge = Math.max(
      _ab.length(),
      _ac.length(),
      _b.distanceTo(_c)
    );
    const height = (2 * area) / longestEdge;
    if (height > minHeight) keep.push(i);
  }

  if (keep.length === triCount) return nonIndexed;

  const attrs = {};
  for (const name of Object.keys(nonIndexed.attributes)) {
    const src = nonIndexed.getAttribute(name);
    const itemSize = src.itemSize;
    const dst = new Float32Array(keep.length * 3 * itemSize);
    for (let k = 0; k < keep.length; k++) {
      for (let v = 0; v < 3; v++) {
        const si = (keep[k] * 3 + v) * itemSize;
        const di = (k * 3 + v) * itemSize;
        for (let j = 0; j < itemSize; j++) dst[di + j] = src.array[si + j];
      }
    }
    attrs[name] = new THREE.BufferAttribute(dst, itemSize);
  }

  const clean = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(attrs)) clean.setAttribute(name, attr);
  return clean;
}

/** בודק שאין ערכי NaN/Infinity במערך המיקומים */
export function isGeometryFinite(geometry) {
  const pos = geometry.getAttribute('position');
  if (!pos || pos.count === 0) return false;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) return false;
  }
  return true;
}

/**
 * ניקוי מלא לתוצאה בוליאנית:
 * 1. הסרת משולשי sliver (נורמלים לא יציבים, קצוות מדומים)
 * 2. איחוי קודקודים לפי מיקום — סוגר תפרים שנוצרו בפיצול המשולשים
 * 3. חישוב נורמלים מחדש עם זווית קיפול: פאות שטוחות מקבלות הצללה
 *    אחידה מושלמת, ומשטחים עגולים נשארים חלקים
 * 4. אימות סופיות ערכים
 * מחזיר גיאומטריה חדשה או זורק שגיאה אם התוצאה פסולה.
 */
export function sanitizeGeometry(geometry, creaseAngleDeg = 30) {
  let g = removeDegenerateTriangles(geometry);

  const pos = g.getAttribute('position');
  if (!pos || pos.count < 3) {
    throw new Error('empty-result');
  }
  if (!isGeometryFinite(g)) {
    throw new Error('invalid-geometry');
  }

  // איחוי לפי מיקום בלבד — הנורמלים מחושבים מחדש בשלב הבא,
  // כך שרעש אינטרפולציה מה-CSG לא מפצל קודקודים לשווא
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.computeBoundingSphere();
  const tolerance = Math.max((g.boundingSphere?.radius ?? 1) * 1e-7, 1e-8);
  let merged = BufferGeometryUtils.mergeVertices(g, tolerance);

  // נורמלים עם זווית קיפול — הצללה הנדסית נכונה
  let creased = BufferGeometryUtils.toCreasedNormals(
    merged,
    THREE.MathUtils.degToRad(creaseAngleDeg)
  );

  // איחוי סופי (position+normal זהים) לקבלת גיאומטריה אינדקסית קומפקטית
  const compact = BufferGeometryUtils.mergeVertices(creased, 0);
  compact.computeBoundingBox();
  compact.computeBoundingSphere();
  return compact;
}

/** מרכז את הגיאומטריה סביב מרכז תיבת התיחום ומחזיר את ההיסט שבוצע */
export function centerGeometry(geometry) {
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return center;
}

/** נפח סגור לפי משפט הדיברגנץ (מ"מ מעוקב) */
export function computeVolume(geometry) {
  const pos = geometry.getAttribute('position');
  if (!pos) return 0;
  const index = geometry.index;
  let volume = 0;
  const triCount = index ? index.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const i0 = index ? index.getX(i * 3) : i * 3;
    const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    _a.fromBufferAttribute(pos, i0);
    _b.fromBufferAttribute(pos, i1);
    _c.fromBufferAttribute(pos, i2);
    volume += _a.dot(_ab.crossVectors(_b, _c)) / 6;
  }
  return Math.abs(volume);
}

/** שטח פנים כולל (מ"מ רבוע) */
export function computeSurfaceArea(geometry) {
  const pos = geometry.getAttribute('position');
  if (!pos) return 0;
  const index = geometry.index;
  let area = 0;
  const triCount = index ? index.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const i0 = index ? index.getX(i * 3) : i * 3;
    const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    _a.fromBufferAttribute(pos, i0);
    _b.fromBufferAttribute(pos, i1);
    _c.fromBufferAttribute(pos, i2);
    _ab.subVectors(_b, _a);
    _ac.subVectors(_c, _a);
    area += _ab.cross(_ac).length() * 0.5;
  }
  return area;
}

/**
 * חילוץ קצוות-מאפיין (feature edges) לתצוגת מתאר הנדסית.
 *
 * בשונה מ-THREE.EdgesGeometry, שמצייר גם כל קצה לא-מזווג — ותוצאות
 * בוליאניות מכילות צמתי-T רבים שנראים כקווים אלכסוניים מדומים —
 * כאן קצה מצויר רק כאשר שני משולשים חולקים אותו בפועל והזווית
 * הדיהדרלית ביניהם עולה על הסף. קצוות בודדים (T-junctions) מדולגים.
 *
 * @returns {THREE.BufferGeometry} גיאומטריית קטעי קו
 */
export function buildFeatureEdges(geometry, thresholdDeg = 25) {
  const pos = geometry.getAttribute('position');
  const index = geometry.index;
  const triCount = index ? index.count / 3 : pos.count / 3;
  const thresholdDot = Math.cos(THREE.MathUtils.degToRad(thresholdDeg));

  geometry.computeBoundingSphere();
  const scale = Math.max(geometry.boundingSphere?.radius ?? 1, 1e-6);
  const q = scale * 1e-6; // קוונטיזציית איחוי מיקומים

  // מיפוי מיקום מקוונטז → מזהה קודקוד מאוחה
  const vertIds = new Map();
  const vertOf = (i) => {
    const idx3 = index ? index.getX(i) : i;
    const x = pos.getX(idx3), y = pos.getY(idx3), z = pos.getZ(idx3);
    const key = `${Math.round(x / q)},${Math.round(y / q)},${Math.round(z / q)}`;
    let id = vertIds.get(key);
    if (id === undefined) {
      id = vertIds.size;
      vertIds.set(key, id);
    }
    return id;
  };

  const normals = [];
  const positions = [];
  const edges = new Map(); // "a|b" → [triIndex...]

  const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    na.fromBufferAttribute(pos, i0);
    nb.fromBufferAttribute(pos, i1);
    nc.fromBufferAttribute(pos, i2);

    const n = new THREE.Vector3().subVectors(nb, na)
      .cross(_ac.subVectors(nc, na));
    if (n.lengthSq() < 1e-20) { normals.push(null); }
    else normals.push(n.normalize());
    positions.push([na.clone(), nb.clone(), nc.clone()]);

    const v0 = vertOf(t * 3), v1 = vertOf(t * 3 + 1), v2 = vertOf(t * 3 + 2);
    const localEdges = [[v0, v1, 0, 1], [v1, v2, 1, 2], [v2, v0, 2, 0]];
    for (const [a, b, la, lb] of localEdges) {
      if (a === b) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      let list = edges.get(key);
      if (!list) { list = []; edges.set(key, list); }
      list.push({ tri: t, la, lb });
    }
  }

  const out = [];
  for (const list of edges.values()) {
    if (list.length < 2) continue; // T-junction / קצה פתוח — לא feature edge
    let isFeature = false;
    outer:
    for (let i = 0; i < list.length - 1; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const n1 = normals[list[i].tri];
        const n2 = normals[list[j].tri];
        if (!n1 || !n2) continue;
        if (Math.abs(n1.dot(n2)) < thresholdDot) { isFeature = true; break outer; }
      }
    }
    if (!isFeature) continue;
    const { tri, la, lb } = list[0];
    const pa = positions[tri][la], pb = positions[tri][lb];
    out.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3));
  return g;
}

export function triangleCount(geometry) {
  return Math.floor((geometry.index ? geometry.index.count : geometry.getAttribute('position')?.count ?? 0) / 3);
}

/**
 * שיקוף גיאומטריה על מישור שנורמלו הוא הציר הנתון, דרך planeCoord.
 * הליפוף (winding) מתהפך כדי לשמור על פאות כלפי חוץ, והנורמלים
 * מחושבים מחדש עם זווית קיפול — תוצאה תקינה לכל גוף, בכל כיוון.
 */
export function mirrorGeometry(geometry, axis = 'x', planeCoord = 0) {
  const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone());
  const pos = g.getAttribute('position');
  const ai = { x: 0, y: 1, z: 2 }[axis] ?? 0;

  const arr = pos.array;
  for (let i = 0; i < pos.count; i++) {
    arr[i * 3 + ai] = 2 * planeCoord - arr[i * 3 + ai];
  }

  // היפוך סדר קודקודים בכל משולש — משמר כיווניות פאות
  const tmp = new Float32Array(3);
  for (let t = 0; t < pos.count; t += 3) {
    for (let j = 0; j < 3; j++) {
      tmp[j] = arr[(t + 1) * 3 + j];
      arr[(t + 1) * 3 + j] = arr[(t + 2) * 3 + j];
      arr[(t + 2) * 3 + j] = tmp[j];
    }
  }
  pos.needsUpdate = true;

  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.computeBoundingSphere();
  const tol = Math.max((g.boundingSphere?.radius ?? 1) * 1e-7, 1e-8);
  const merged = BufferGeometryUtils.mergeVertices(g, tol);
  const creased = BufferGeometryUtils.toCreasedNormals(merged, THREE.MathUtils.degToRad(30));
  const compact = BufferGeometryUtils.mergeVertices(creased, 0);
  compact.computeBoundingBox();
  compact.computeBoundingSphere();
  return compact;
}

/** מוודא שלגיאומטריה יש תכונות position+normal בלבד באותו פורמט (לקלט CSG) */
export function normalizeForCSG(geometry) {
  const g = geometry.clone();
  // מסיר תכונות שאינן נחוצות ל-CSG וגורמות לאי-התאמה בין קלטים
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  g.clearGroups();
  return g;
}
