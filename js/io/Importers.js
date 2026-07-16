/**
 * ייבוא קבצי STL / OBJ אל הקנבס.
 * הגיאומטריה ממורכזת, מונחתת על מישור העבודה ועוברת אימות בסיסי.
 */

import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { isGeometryFinite } from '../geometry/GeometryUtils.js';

function readFile(file, as) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`קריאת הקובץ ${file.name} נכשלה`));
    if (as === 'text') r.readAsText(file);
    else r.readAsArrayBuffer(file);
  });
}

/** הכנה סטנדרטית של גיאומטריה מיובאת */
function prepareImported(geometry) {
  if (!isGeometryFinite(geometry)) {
    throw new Error('הקובץ מכיל גיאומטריה פגומה (ערכים לא סופיים)');
  }
  let g = geometry;
  // איחוי קודקודים לקבלת קווי מתאר וקצוות נכונים (STL תמיד מפורק)
  if (!g.index) {
    try { g = BufferGeometryUtils.mergeVertices(g, 1e-5); } catch { /* נשאר מפורק */ }
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals();

  // מרכוז והנחתה על הרשת
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox.getCenter(c);
  g.translate(-c.x, -g.boundingBox.min.y, -c.z);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * @param {File} file
 * @returns {Promise<Array<{geometry, name}>>} — OBJ יכול להכיל כמה אובייקטים
 */
export async function importModelFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const baseName = file.name.replace(/\.[^.]+$/, '');

  if (ext === 'stl') {
    const buffer = await readFile(file, 'buffer');
    let geometry;
    try {
      geometry = new STLLoader().parse(buffer);
    } catch (err) {
      throw new Error(`פענוח STL נכשל: ${err.message}`);
    }
    return [{ geometry: prepareImported(geometry), name: baseName }];
  }

  if (ext === 'obj') {
    const text = await readFile(file, 'text');
    let root;
    try {
      root = new OBJLoader().parse(text);
    } catch (err) {
      throw new Error(`פענוח OBJ נכשל: ${err.message}`);
    }
    const out = [];
    root.traverse((o) => {
      if (o.isMesh && o.geometry?.getAttribute('position')?.count >= 3) {
        const g = o.geometry.clone();
        for (const name of Object.keys(g.attributes)) {
          if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        }
        out.push({
          geometry: prepareImported(g),
          name: o.name && o.name !== '' ? o.name : baseName,
        });
      }
    });
    if (out.length === 0) throw new Error('קובץ ה-OBJ אינו מכיל גיאומטריה');
    return out;
  }

  throw new Error(`פורמט ${ext.toUpperCase()} אינו נתמך לייבוא — השתמש ב-STL או OBJ`);
}
