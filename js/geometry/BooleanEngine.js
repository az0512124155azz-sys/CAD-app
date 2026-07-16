/**
 * מנוע פעולות בוליאניות — איחוד, חיסור וחיתוך.
 *
 * מבוסס three-bvh-csg (חלוקת משולשים מדויקת בעזרת עצי BVH) ולא על
 * BSP נאיבי — מה שמונע עיוותי נורמלים ופיצול משולשים מיותר.
 * כל תוצאה עוברת צנרת ניקוי: הסרת משולשים מנוונים, איחוי קודקודים
 * ואימות ספרתי, כך שלא יוחזרו לעולם sliver edges או גיאומטריה פגומה.
 */

import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { normalizeForCSG, sanitizeGeometry, centerGeometry } from './GeometryUtils.js';

const OPS = {
  union: ADDITION,
  subtract: SUBTRACTION,
  intersect: INTERSECTION,
};

export const BOOLEAN_LABELS = {
  union: 'איחוד',
  subtract: 'חיסור',
  intersect: 'חיתוך',
};

export class BooleanEngine {
  constructor() {
    this.evaluator = new Evaluator();
    this.evaluator.useGroups = false;
    this.evaluator.attributes = ['position', 'normal'];
    this.evaluator.consolidateGroups = true;
  }

  /**
   * בונה Brush מ-Mesh: הגיאומטריה מנורמלת (position+normal בלבד)
   * והטרנספורם העולמי נאפה לתוך ה-Brush.
   */
  _toBrush(mesh) {
    const geometry = normalizeForCSG(mesh.geometry);
    const brush = new Brush(geometry);
    mesh.updateWorldMatrix(true, false);
    brush.applyMatrix4(mesh.matrixWorld);
    brush.updateMatrixWorld(true);
    return brush;
  }

  /**
   * מבצע פעולה בוליאנית על רשימת Meshים (לפי סדר).
   * union — כל הגופים מאוחדים; subtract — כל הבאים מוחסרים מהראשון;
   * intersect — הנפח המשותף לכולם.
   *
   * @returns {{ geometry: THREE.BufferGeometry, position: THREE.Vector3 }}
   *   גיאומטריה ממורכזת סביב מרכזה + המיקום העולמי שבו יש להציבה.
   * @throws Error עם message קריא כאשר התוצאה ריקה או פסולה.
   */
  execute(operation, meshes) {
    const op = OPS[operation];
    if (op === undefined) throw new Error(`פעולה לא מוכרת: ${operation}`);
    if (!meshes || meshes.length < 2) throw new Error('נדרשים לפחות שני גופים');

    let result = this._toBrush(meshes[0]);
    for (let i = 1; i < meshes.length; i++) {
      const next = this._toBrush(meshes[i]);
      const evaluated = this.evaluator.evaluate(result, next, op);
      result.geometry.dispose();
      next.geometry.dispose();
      result = evaluated;
      result.updateMatrixWorld(true);
    }

    let clean;
    try {
      clean = sanitizeGeometry(result.geometry);
    } catch (err) {
      result.geometry.dispose();
      if (err.message === 'empty-result') {
        throw new Error(
          operation === 'intersect'
            ? 'אין נפח משותף בין הגופים — התוצאה ריקה'
            : 'הפעולה הפיקה תוצאה ריקה — ודא שהגופים חופפים'
        );
      }
      throw new Error('הפעולה נכשלה — הגיאומטריה שנוצרה אינה תקינה');
    }
    result.geometry.dispose();

    // מרכוז הציר סביב מרכז הגוף החדש — מיקום עולמי נשמר
    const center = centerGeometry(clean);
    return { geometry: clean, position: center };
  }
}

export const booleanEngine = new BooleanEngine();
