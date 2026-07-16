/**
 * הפקת וידאו מתוך הקנבס — MediaRecorder על captureStream.
 *
 * שני מצבים:
 *  • Turntable — סיבוב 360° מלא של המצלמה סביב המודל.
 *  • Build Replay — שחזור תהליך הבנייה: הגופים מופיעים בזה אחר זה
 *    לפי סדר יצירתם, עם אנימציית כניסה, ואופציונלית סיבוב מצלמה איטי.
 *
 * הפלט: קובץ WebM (VP9 כשנתמך) בקצב סיביות לבחירת המשתמש.
 */

import { saveBlob } from '../io/Exporters.js';

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.4;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class Recorder extends EventTarget {
  /**
   * @param {import('../core/Viewport.js').Viewport} viewport
   * @param {import('../core/SceneManager.js').SceneManager} scene
   */
  constructor(viewport, scene) {
    super();
    this.viewport = viewport;
    this.scene = scene;
    this.recording = false;
    this._cleanupFns = [];
  }

  get supported() {
    return typeof this.viewport.canvas.captureStream === 'function' && pickMimeType() !== null;
  }

  /**
   * @param {object} opts
   * @param {'turntable'|'replay'} opts.mode
   * @param {number} opts.duration — שניות
   * @param {number} opts.bitrateMbps
   * @param {'none'|'slow'|'full'} opts.orbit — סיבוב מצלמה במצב replay
   * @param {string} opts.docName
   */
  async start({ mode, duration, bitrateMbps, orbit, docName }) {
    if (this.recording) throw new Error('הקלטה כבר פעילה');
    if (!this.supported) throw new Error('הדפדפן אינו תומך בהקלטת וידאו מקנבס');
    if (this.scene.count === 0) throw new Error('הסצנה ריקה — אין מה להקליט');

    duration = Math.min(Math.max(duration, 3), 60);
    const mimeType = pickMimeType();
    const stream = this.viewport.canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrateMbps * 1_000_000,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const done = new Promise((resolve) => {
      recorder.onstop = () => {
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        saveBlob(blob, `${(docName || 'model').trim() || 'model'}-${mode}.${ext}`);
        resolve(blob);
      };
    });

    this.recording = true;
    this._recorder = recorder;
    this._startTime = performance.now();
    this._duration = duration;

    // הסתרת עזרים שאינם חלק מהמודל
    const gizmoWasVisible = this.viewport.gizmo.visible;
    this.viewport.gizmo.visible = false;
    const prevSelection = [...this.scene.selection];
    this.scene.setSelection([]);
    this._cleanupFns.push(() => {
      this.viewport.gizmo.visible = gizmoWasVisible;
      this.scene.setSelection(prevSelection);
    });

    // מסגור המודל
    const bounds = this.scene.computeSceneBounds();
    if (bounds) this.viewport.frameBox(bounds, 1.5);

    // המתנה קצרה שהמצלמה תתייצב לפני תחילת ההקלטה
    await new Promise((r) => setTimeout(r, 450));

    if (mode === 'turntable') {
      this._setupTurntable(duration);
    } else {
      this._setupReplay(duration, orbit);
    }

    recorder.start(200);

    // שעון התקדמות + עצירה אוטומטית
    this._timer = setInterval(() => {
      const elapsed = (performance.now() - this._startTime) / 1000;
      this.dispatchEvent(new CustomEvent('tick', { detail: { elapsed, duration } }));
      if (elapsed >= duration) this.stop();
    }, 100);

    this.dispatchEvent(new CustomEvent('started'));
    return done;
  }

  _setupTurntable(duration) {
    // סיבוב מלא אחד בדיוק לאורך ההקלטה
    this.viewport.startTurntable((Math.PI * 2) / duration);
    this._cleanupFns.push(() => this.viewport.stopTurntable());
  }

  _setupReplay(duration, orbit) {
    const objects = this.scene.all()
      .filter((o) => o.visible)
      .sort((a, b) => a.id - b.id);

    // לכידת מצב מקורי לשחזור מדויק
    const original = objects.map((o) => ({
      obj: o,
      scale: o.mesh.scale.clone(),
      visible: o.visible,
    }));
    this._cleanupFns.push(() => {
      original.forEach(({ obj, scale, visible }) => {
        obj.mesh.scale.copy(scale);
        obj.visible = visible;
        obj.mesh.updateMatrixWorld(true);
      });
    });

    objects.forEach((o) => { o.visible = false; });

    // חלוקת זמן: כניסות תופסות את 80% הראשונים, הסוף — מבט שלם
    const introTime = duration * 0.82;
    const per = introTime / objects.length;
    const popDur = Math.min(per * 0.9, 0.6);

    if (orbit !== 'none') {
      const rate = orbit === 'full' ? (Math.PI * 2) / duration : (Math.PI * 0.5) / duration;
      this.viewport.startTurntable(rate);
      this._cleanupFns.push(() => this.viewport.stopTurntable());
    }

    const onFrame = () => {
      const t = (performance.now() - this._startTime) / 1000;
      objects.forEach((o, i) => {
        const startAt = i * per;
        if (t < startAt) return;
        const k = Math.min((t - startAt) / popDur, 1);
        if (!o.visible) o.visible = true;
        const s = k >= 1 ? 1 : Math.max(easeOutBack(easeOutCubic(k)), 0.001);
        const base = original[i].scale;
        o.mesh.scale.set(base.x * s, base.y * s, base.z * s);
      });
    };
    this.viewport.addEventListener('frame', onFrame);
    this._cleanupFns.push(() => this.viewport.removeEventListener('frame', onFrame));
  }

  stop() {
    if (!this.recording) return;
    this.recording = false;
    clearInterval(this._timer);
    this._cleanupFns.forEach((fn) => { try { fn(); } catch { /* שחזור עמיד */ } });
    this._cleanupFns = [];
    if (this._recorder.state !== 'inactive') this._recorder.stop();
    this.dispatchEvent(new CustomEvent('stopped'));
  }
}
