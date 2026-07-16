/**
 * שמירה וטעינה של קובצי פרויקט TSURA (JSON).
 * גופים פרמטריים נשמרים לפי סוג ופרמטרים; גופים בוליאניים/מיובאים
 * נשמרים עם הגיאומטריה המלאה (Base64 של המערכים הבינאריים).
 */

import * as THREE from 'three';
import { buildPrimitive, PRIMITIVES } from '../geometry/Primitives.js';

const FORMAT_VERSION = 2;

/* ── Base64 ⇄ TypedArray ── */

function arrayToBase64(typed) {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToArray(b64, Type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Type(bytes.buffer);
}

function serializeGeometry(g) {
  const out = {
    position: arrayToBase64(g.getAttribute('position').array),
  };
  if (g.getAttribute('normal')) out.normal = arrayToBase64(g.getAttribute('normal').array);
  if (g.index) {
    out.index = arrayToBase64(g.index.array);
    out.indexType = g.index.array instanceof Uint16Array ? 'u16' : 'u32';
  }
  return out;
}

function deserializeGeometry(data) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(base64ToArray(data.position, Float32Array), 3));
  if (data.normal) g.setAttribute('normal', new THREE.BufferAttribute(base64ToArray(data.normal, Float32Array), 3));
  if (data.index) {
    const Type = data.indexType === 'u16' ? Uint16Array : Uint32Array;
    g.setIndex(new THREE.BufferAttribute(base64ToArray(data.index, Type), 1));
  }
  if (!data.normal) g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/* ── פרויקט ── */

/**
 * @param {import('../core/SceneManager.js').SceneManager} scene
 * @param {{docName: string, units: string, quality: string}} meta
 * @returns {string} JSON
 */
export function serializeProject(scene, meta) {
  const objects = scene.all().map((o) => {
    const m = o.mesh.material;
    const rec = {
      type: o.type,
      name: o.name,
      visible: o.visible,
      transform: {
        position: o.mesh.position.toArray(),
        quaternion: o.mesh.quaternion.toArray(),
        scale: o.mesh.scale.toArray(),
      },
      material: {
        color: `#${m.color.getHexString()}`,
        roughness: m.roughness,
        metalness: m.metalness,
        opacity: m.opacity,
      },
    };
    if (o.params && PRIMITIVES[o.type]) {
      rec.params = { ...o.params };
    } else {
      rec.geometry = serializeGeometry(o.mesh.geometry);
    }
    return rec;
  });

  return JSON.stringify({
    app: 'tsura-cad',
    version: FORMAT_VERSION,
    saved: new Date().toISOString(),
    meta,
    objects,
  });
}

/**
 * @param {string} json
 * @param {string} quality — הגדרת החלקות הנוכחית לבניית primitives
 * @returns {{meta: object, descriptors: Array}} מתארי גופים מוכנים לבנייה
 */
export function deserializeProject(json, quality = 'med') {
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('קובץ הפרויקט אינו JSON תקין'); }
  if (data.app !== 'tsura-cad' || !Array.isArray(data.objects)) {
    throw new Error('הקובץ אינו פרויקט צורה תקין');
  }

  const descriptors = data.objects.map((rec) => {
    let geometry, params = null;
    if (rec.params && PRIMITIVES[rec.type]) {
      const built = buildPrimitive(rec.type, rec.params, quality);
      geometry = built.geometry;
      params = built.params;
    } else if (rec.geometry) {
      geometry = deserializeGeometry(rec.geometry);
    } else {
      return null;
    }
    return {
      type: rec.type,
      name: rec.name,
      params,
      geometry,
      visible: rec.visible !== false,
      transform: rec.transform,
      material: rec.material,
    };
  }).filter(Boolean);

  return { meta: data.meta ?? {}, descriptors };
}
