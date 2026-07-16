/**
 * ייצוא — STL (בינארי/ASCII), OBJ+MTL, PLY בינארי, GLB, וקובץ פרויקט TSURA.
 * הגיאומטריה מיוצאת עם הטרנספורם העולמי אפוי, במילימטרים
 * (GLB מומר למטרים בהתאם לתקן glTF).
 */

import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/* ── עזרי הורדה ── */

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function sanitizeFilename(name) {
  return (name || 'model').trim().replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'model';
}

/**
 * בונה קבוצה זמנית לייצוא: שיבוט כל Mesh עם הטרנספורם העולמי אפוי
 * לגיאומטריה, ללא ילדי-עזר (קווי מתאר וכו').
 */
function buildExportGroup(sceneObjects, { scale = 1 } = {}) {
  const group = new THREE.Group();
  for (const obj of sceneObjects) {
    if (!obj.visible) continue;
    obj.mesh.updateWorldMatrix(true, false);
    const g = obj.mesh.geometry.clone();
    g.applyMatrix4(obj.mesh.matrixWorld);
    if (scale !== 1) g.scale(scale, scale, scale);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const m = obj.mesh.material.clone();
    m.side = THREE.FrontSide;
    const mesh = new THREE.Mesh(g, m);
    mesh.name = obj.name;
    group.add(mesh);
  }
  return group;
}

function disposeGroup(group) {
  group.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose?.();
  });
}

/* ── OBJ + MTL (מימוש מלא עם חומרים) ── */

function exportOBJWithMTL(group, baseName) {
  const mtlName = `${baseName}.mtl`;
  let obj = `# Tsura CAD — OBJ export\n# units: millimeters\nmtllib ${mtlName}\n`;
  let mtl = `# Tsura CAD — MTL material library\n`;

  let vOffset = 1;
  let vnOffset = 1;
  const v3 = new THREE.Vector3();

  group.children.forEach((mesh, idx) => {
    const g = mesh.geometry;
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    const index = g.index;
    const matName = `mat_${idx}`;
    const safe = mesh.name.replace(/\s+/g, '_').replace(/[^\w֐-׿_-]/g, '') || `object_${idx}`;

    obj += `\no ${safe}\nusemtl ${matName}\n`;

    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      obj += `v ${v3.x.toFixed(6)} ${v3.y.toFixed(6)} ${v3.z.toFixed(6)}\n`;
    }
    if (nrm) {
      for (let i = 0; i < nrm.count; i++) {
        v3.fromBufferAttribute(nrm, i);
        obj += `vn ${v3.x.toFixed(6)} ${v3.y.toFixed(6)} ${v3.z.toFixed(6)}\n`;
      }
    }
    const face = (a, b, c) => nrm
      ? `f ${a + vOffset}//${a + vnOffset} ${b + vOffset}//${b + vnOffset} ${c + vOffset}//${c + vnOffset}\n`
      : `f ${a + vOffset} ${b + vOffset} ${c + vOffset}\n`;

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        obj += face(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) obj += face(i, i + 1, i + 2);
    }
    vOffset += pos.count;
    if (nrm) vnOffset += nrm.count;

    // חומר: המרה מ-PBR לפרמטרי Phong של MTL
    const m = mesh.material;
    const c = m.color;
    const shininess = Math.round((1 - (m.roughness ?? 0.5)) * 900) + 10;
    mtl += `\nnewmtl ${matName}\n`;
    mtl += `Kd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}\n`;
    mtl += `Ka ${(c.r * 0.15).toFixed(4)} ${(c.g * 0.15).toFixed(4)} ${(c.b * 0.15).toFixed(4)}\n`;
    mtl += `Ks ${(0.04 + (m.metalness ?? 0) * 0.5).toFixed(4)} ${(0.04 + (m.metalness ?? 0) * 0.5).toFixed(4)} ${(0.04 + (m.metalness ?? 0) * 0.5).toFixed(4)}\n`;
    mtl += `Ns ${shininess}\n`;
    mtl += `d ${(m.opacity ?? 1).toFixed(3)}\nillum 2\n`;
  });

  return { obj, mtl };
}

/* ── מחלקת הייצוא ── */

export class Exporters {
  /**
   * @param {import('../core/SceneManager.js').SceneManager} scene
   */
  constructor(scene) {
    this.scene = scene;
  }

  _objects(scope) {
    const objs = scope === 'selection' && this.scene.selection.size
      ? this.scene.selectedObjects()
      : this.scene.all();
    return objs.filter((o) => o.visible);
  }

  /**
   * @param {string} format — 'stl-b' | 'stl-a' | 'obj' | 'ply' | 'glb' | 'tsura'
   * @param {string} scope — 'all' | 'selection'
   * @param {string} docName
   * @returns {Promise<number>} מספר הגופים שיוצאו
   */
  async export(format, scope, docName, projectSerializer = null) {
    const base = sanitizeFilename(docName);

    if (format === 'tsura') {
      if (!projectSerializer) throw new Error('אין סריאלייזר פרויקט');
      const json = projectSerializer();
      saveBlob(new Blob([json], { type: 'application/json' }), `${base}.tsura`);
      return this.scene.count;
    }

    const objs = this._objects(scope);
    if (objs.length === 0) throw new Error('אין גופים נראים לייצוא');

    switch (format) {
      case 'stl-b': {
        const group = buildExportGroup(objs);
        const data = new STLExporter().parse(group, { binary: true });
        saveBlob(new Blob([data], { type: 'model/stl' }), `${base}.stl`);
        disposeGroup(group);
        break;
      }
      case 'stl-a': {
        const group = buildExportGroup(objs);
        const data = new STLExporter().parse(group, { binary: false });
        saveBlob(new Blob([data], { type: 'model/stl' }), `${base}.stl`);
        disposeGroup(group);
        break;
      }
      case 'obj': {
        const group = buildExportGroup(objs);
        const { obj, mtl } = exportOBJWithMTL(group, base);
        saveBlob(new Blob([obj], { type: 'text/plain' }), `${base}.obj`);
        saveBlob(new Blob([mtl], { type: 'text/plain' }), `${base}.mtl`);
        disposeGroup(group);
        break;
      }
      case 'ply': {
        const group = buildExportGroup(objs);
        const data = await new Promise((resolve) => {
          new PLYExporter().parse(group, resolve, { binary: true, excludeAttributes: ['uv', 'color'] });
        });
        saveBlob(new Blob([data], { type: 'application/octet-stream' }), `${base}.ply`);
        disposeGroup(group);
        break;
      }
      case 'glb': {
        // glTF מוגדר במטרים — המרה ממ"מ
        const group = buildExportGroup(objs, { scale: 0.001 });
        const data = await new Promise((resolve, reject) => {
          new GLTFExporter().parse(group, resolve, reject, { binary: true });
        });
        saveBlob(new Blob([data], { type: 'model/gltf-binary' }), `${base}.glb`);
        disposeGroup(group);
        break;
      }
      default:
        throw new Error(`פורמט לא מוכר: ${format}`);
    }
    return objs.length;
  }
}
