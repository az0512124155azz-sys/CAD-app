/**
 * צורה — Tsura CAD · נקודת הכניסה של האפליקציה.
 * מחבר את מנוע התצוגה, מודל הנתונים, מערכת הפקודות וכל שכבות ה-UI.
 */

import * as THREE from 'three';
import { Viewport } from './core/Viewport.js';
import { SceneManager, SceneObject } from './core/SceneManager.js';
import {
  History, AddObjectCommand, DeleteObjectsCommand, TransformCommand,
  BooleanCommand, VisibilityCommand, CompositeCommand,
} from './core/Commands.js';
import { mirrorGeometry } from './geometry/GeometryUtils.js';
import { SketchTool } from './tools/SketchTool.js';
import { UnitSystem } from './core/Units.js';
import { buildPrimitive, PRIMITIVES, defaultParams } from './geometry/Primitives.js';
import { booleanEngine, BOOLEAN_LABELS } from './geometry/BooleanEngine.js';
import { SectionTool } from './tools/SectionTool.js';
import { MeasureTool } from './tools/MeasureTool.js';
import { Exporters } from './io/Exporters.js';
import { importModelFile } from './io/Importers.js';
import { serializeProject, deserializeProject } from './io/Project.js';
import { Recorder } from './replay/Recorder.js';
import { injectIcons } from './ui/icons.js';
import { Toasts } from './ui/Toasts.js';
import { Inspector } from './ui/Inspector.js';
import { SceneTree } from './ui/SceneTree.js';
import { HistoryStrip } from './ui/HistoryStrip.js';

const $ = (id) => document.getElementById(id);

const AUTOSAVE_KEY = 'tsura-autosave-v2';
const BOOLEAN_ICONS = { union: 'union', subtract: 'subtract', intersect: 'intersect' };

class App {
  constructor() {
    injectIcons();

    /* ── ליבה ── */
    this.viewport = new Viewport($('viewport'), $('viewport-wrap'));
    this.scene = new SceneManager(this.viewport.modelGroup);
    this.history = new History();
    this.units = new UnitSystem();
    this.exporters = new Exporters(this.scene);
    this.recorder = new Recorder(this.viewport, this.scene);
    this.toasts = new Toasts($('toasts'));

    /* ── הגדרות ── */
    this.settings = {
      snapSize: 1,        // מ"מ
      angleSnap: 15,      // מעלות
      gridSize: 200,      // מ"מ
      quality: 'med',
      autosave: true,
      edges: true,
    };

    this.activeTool = 'select';
    this.wireframe = false;

    /* ── כלים ── */
    this.section = new SectionTool(this.viewport);
    this.measure = new MeasureTool(this.viewport, this.units, {
      layer: $('measure-layer'),
      svg: $('measure-svg'),
      label: $('measure-label'),
      hint: $('measure-hint'),
    });
    this.sketch = new SketchTool(this.viewport, this.units, {
      getSnap: () => ($('snap-grid').checked ? this.settings.snapSize : null),
    });

    /* ── UI ── */
    this.inspector = new Inspector({
      scene: this.scene,
      history: this.history,
      units: this.units,
      quality: () => this.settings.quality,
      onGeometryChanged: () => this.section.refresh(),
    });
    this.tree = new SceneTree({ scene: this.scene, history: this.history });
    this.strip = new HistoryStrip(this.history);

    this._bindViewportEvents();
    this._bindGizmo();
    this._bindToolbar();
    this._bindSketch();
    this._bindPatternAndMirror();
    this._bindAppbar();
    this._bindViewControls();
    this._bindViewCube();
    this._bindSectionPanel();
    this._bindStatusBar();
    this._bindDialogs();
    this._bindContextMenu();
    this._bindKeyboard();
    this._bindDragDrop();
    this._bindSceneEvents();

    this._applySnapSettings();
    this._restoreAutosave();
    this._updateSelectionUI();
    this._updateStats();
  }

  /* ═══════════════ אירועי סצנה ═══════════════ */

  _bindSceneEvents() {
    this.scene.addEventListener('selection-changed', () => this._updateSelectionUI());
    this.scene.addEventListener('objects-changed', () => {
      // גיזמו שמוצמד לגוף שהוסר — ניתוק
      const g = this.viewport.gizmo;
      if (g.object && !this.scene.byMesh(g.object)) g.detach();
      this._updateStats();
      this.section.refresh();
      this._markDirty();
    });
    this.scene.addEventListener('object-updated', () => {
      this._updateStats();
      this._markDirty();
    });
    this.history.addEventListener('changed', () => {
      $('btn-undo').disabled = !this.history.canUndo;
      $('btn-redo').disabled = !this.history.canRedo;
      this._markDirty();
      this._scheduleAutosave();
    });
  }

  _updateSelectionUI() {
    const sel = this.scene.selectedObjects();
    this.viewport.applySelectionHighlight(this.scene.all(), this.scene.selection);

    // הצמדת גיזמו
    const primary = this.scene.primarySelected();
    if (primary && this.activeTool !== 'select' && this.activeTool !== 'measure') {
      this.viewport.gizmo.attach(primary.mesh);
    } else {
      this.viewport.gizmo.detach();
    }

    // סטטוס
    const label = sel.length === 0 ? 'אין בחירה'
      : sel.length === 1 ? sel[0].name
      : `${sel.length} גופים נבחרו`;
    $('status-selection').textContent = label;

    // כפתורים בוליאניים פעילים רק עם 2+ גופים
    const boolEnabled = sel.length >= 2;
    $('op-union').disabled = !boolEnabled;
    $('op-subtract').disabled = !boolEnabled;
    $('op-intersect').disabled = !boolEnabled;
    $('btn-duplicate').disabled = sel.length === 0;
    $('btn-delete').disabled = sel.length === 0;
    $('tool-pattern').disabled = sel.length === 0;
    $('tool-mirror').disabled = sel.length === 0;
    $('export-scope-sel').disabled = sel.length === 0;

    this.inspector.refresh();
  }

  _updateStats() {
    const n = this.scene.count;
    const tris = this.scene.totalTriangles();
    $('status-stats').textContent =
      `${n === 1 ? 'גוף אחד' : `${n} גופים`} · ${tris.toLocaleString()} משולשים`;
  }

  _markDirty() {
    $('dirty-dot').hidden = false;
  }

  /* ═══════════════ Viewport ═══════════════ */

  _bindViewportEvents() {
    this.viewport.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.viewport.addEventListener('pick', (e) => {
      const { mesh, additive, button, clientX, clientY } = e.detail;

      if (this.sketch.active) return; // הסקיצה מטפלת בקלט בעצמה

      if (this.activeTool === 'measure') {
        this.measure.handlePick(e.detail);
        return;
      }

      this._hideContextMenu();
      const obj = mesh ? this.scene.byMesh(mesh) : null;

      if (button === 2) {
        if (obj) {
          if (!this.scene.selection.has(obj.id)) this.scene.setSelection([obj.id]);
          this._showContextMenu(clientX, clientY);
        }
        return;
      }

      if (!obj) {
        if (!additive) this.scene.clearSelection();
        return;
      }
      if (additive) this.scene.toggleSelection(obj.id);
      else this.scene.setSelection([obj.id]);
    });

    this.viewport.addEventListener('cursor-move', (e) => {
      const p = e.detail.point;
      $('status-coords').textContent = p
        ? `X ${this.units.format(p.x, 1)} · Y ${this.units.format(p.y, 1)} · Z ${this.units.format(p.z, 1)}`
        : '—';
    });

    this.viewport.addEventListener('camera-mode', (e) => {
      $('cam-mode-label').textContent = e.detail.ortho ? 'אורתוגרפי' : 'פרספקטיבה';
      $('btn-cam-mode').classList.toggle('is-on', e.detail.ortho);
    });
  }

  _bindGizmo() {
    const gizmo = this.viewport.gizmo;
    let before = null;

    gizmo.addEventListener('mouseDown', () => {
      const obj = this.scene.byMesh(gizmo.object);
      before = obj ? obj.snapshotTransform() : null;
    });

    gizmo.addEventListener('objectChange', () => {
      const obj = this.scene.byMesh(gizmo.object);
      if (obj) this.inspector.refresh();
    });

    gizmo.addEventListener('mouseUp', () => {
      const obj = this.scene.byMesh(gizmo.object);
      if (!obj || !before) return;
      const after = obj.snapshotTransform();
      const changed =
        !before.position.equals(after.position) ||
        !before.quaternion.equals(after.quaternion) ||
        !before.scale.equals(after.scale);
      if (changed) {
        const labels = { translate: 'הזזת', rotate: 'סיבוב', scale: 'קנה מידה של' };
        const icons = { translate: 'move', rotate: 'rotate', scale: 'scale' };
        this.history.execute(new TransformCommand(
          this.scene, [{ obj, before, after }],
          `${labels[gizmo.mode]} ${obj.name}`, icons[gizmo.mode]
        ));
      }
      before = null;
    });
  }

  _applySnapSettings() {
    const g = this.viewport.gizmo;
    g.setTranslationSnap($('snap-grid').checked ? this.settings.snapSize : null);
    g.setRotationSnap($('snap-angle').checked ? THREE.MathUtils.degToRad(this.settings.angleSnap) : null);
    g.setScaleSnap($('snap-grid').checked ? 0.05 : null);
    $('snap-grid-val').textContent = this.units.format(this.settings.snapSize);
  }

  /* ═══════════════ כלים ═══════════════ */

  setTool(tool) {
    if (this.activeTool === 'measure' && tool !== 'measure') this.measure.stop();
    this.activeTool = tool;

    document.querySelectorAll('.toolrail [data-tool]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.tool === tool);
    });
    $('tool-measure').classList.toggle('is-active', tool === 'measure');

    const gizmoModes = { move: 'translate', rotate: 'rotate', scale: 'scale' };
    if (gizmoModes[tool]) {
      this.viewport.gizmo.setMode(gizmoModes[tool]);
      const primary = this.scene.primarySelected();
      if (primary) this.viewport.gizmo.attach(primary.mesh);
    } else {
      this.viewport.gizmo.detach();
    }

    if (tool === 'measure') this.measure.start();
  }

  _bindToolbar() {
    for (const tool of ['select', 'move', 'rotate', 'scale']) {
      $(`tool-${tool}`).addEventListener('click', () => this.setTool(tool));
    }
    $('tool-measure').addEventListener('click', () => {
      this.setTool(this.activeTool === 'measure' ? 'select' : 'measure');
    });

    /* גופים בסיסיים */
    const flyout = $('primitives-flyout');
    const primBtn = $('tool-primitives');
    const closeFlyout = () => { flyout.hidden = true; primBtn.classList.remove('is-active'); };
    primBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      flyout.hidden = !flyout.hidden;
      primBtn.classList.toggle('is-active', !flyout.hidden);
      if (!flyout.hidden) {
        flyout.style.top = `${Math.min(primBtn.getBoundingClientRect().top - 60, window.innerHeight - flyout.offsetHeight - 60)}px`;
      }
    });
    document.addEventListener('click', (e) => {
      if (!flyout.hidden && !flyout.contains(e.target)) closeFlyout();
    });
    flyout.querySelectorAll('[data-prim]').forEach((b) => {
      b.addEventListener('click', () => {
        this.addPrimitive(b.dataset.prim);
        closeFlyout();
      });
    });

    /* בוליאניים */
    $('op-union').addEventListener('click', () => this.runBoolean('union'));
    $('op-subtract').addEventListener('click', () => this.runBoolean('subtract'));
    $('op-intersect').addEventListener('click', () => this.runBoolean('intersect'));

    /* חתך */
    $('tool-section').addEventListener('click', () => {
      const panel = $('section-panel');
      panel.hidden = !panel.hidden;
      $('tool-section').classList.toggle('is-active', !panel.hidden);
      if (panel.hidden && this.section.enabled) {
        $('section-enable').checked = false;
        this.section.setEnabled(false);
      }
    });

    $('btn-duplicate').addEventListener('click', () => this.duplicateSelection());
    $('btn-delete').addEventListener('click', () => this.deleteSelection());
  }

  /* ═══════════════ סקיצה ואקסטרוזיה ═══════════════ */

  _bindSketch() {
    const panel = $('sketch-panel');
    const hints = {
      polygon: 'לחץ על הקנבס להוספת נקודות; סגור בלחיצה על הנקודה הראשונה או בכפתור "סיים ומשוך"',
      rect: 'לחץ לקביעת פינה ראשונה, ואז לחץ לקביעת הפינה הנגדית',
      circle: 'לחץ לקביעת מרכז המעגל, ואז לחץ לקביעת הרדיוס',
    };

    const open = () => {
      this.setTool('select');
      this.scene.clearSelection();
      panel.hidden = false;
      $('tool-sketch').classList.add('is-active');
      this._syncSketchHeight();
      this.sketch.start(panel.querySelector('#sketch-mode .is-active').dataset.mode);
    };
    const close = () => {
      panel.hidden = true;
      $('tool-sketch').classList.remove('is-active');
      this.sketch.stop();
    };

    $('tool-sketch').addEventListener('click', () => (this.sketch.active ? close() : open()));
    $('sketch-close').addEventListener('click', close);
    $('sketch-cancel').addEventListener('click', close);

    $('sketch-mode').querySelectorAll('[data-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        $('sketch-mode').querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        $('sketch-hint').textContent = hints[b.dataset.mode];
        this.sketch.setMode(b.dataset.mode);
      });
    });

    $('sketch-height').addEventListener('change', () => this._syncSketchHeight());
    $('sketch-finish').addEventListener('click', () => {
      this._syncSketchHeight();
      this.sketch.finish();
    });

    this.sketch.addEventListener('state', (e) => {
      $('sketch-finish').disabled = !e.detail.canFinish;
    });
    this.sketch.addEventListener('invalid', (e) => this.toasts.error(e.detail.reason));
    this.sketch.addEventListener('commit', (e) => {
      const { geometry, position, mode } = e.detail;
      const names = { polygon: 'אקסטרוזיה', rect: 'לוח', circle: 'דיסק' };
      const obj = new SceneObject({
        type: 'sketch',
        geometry,
        name: this._uniqueName(names[mode] ?? 'אקסטרוזיה'),
      });
      obj.mesh.position.copy(position);
      obj.setEdgesVisible(this.settings.edges && !this.wireframe);
      this._applyWireframe(obj);
      this.history.execute(new AddObjectCommand(this.scene, obj, `סקיצה → ${obj.name}`, 'sketch'));
      close();
      this.scene.setSelection([obj.id]);
    });

    // Esc בזמן סקיצה — ביטול
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sketch.active) close();
    });
  }

  _syncSketchHeight() {
    const mm = this.units.parse($('sketch-height').value);
    if (mm !== null && mm > 0) this.sketch.setHeight(mm);
    else $('sketch-height').value = this.units.format(20);
  }

  /* ═══════════════ מערך ושיקוף ═══════════════ */

  _bindPatternAndMirror() {
    /* מערך */
    const dlgPat = $('dlg-pattern');
    $('tool-pattern').addEventListener('click', () => {
      if (!this.scene.selection.size) {
        this.toasts.info('בחר גוף אחד לפחות ליצירת מערך');
        return;
      }
      dlgPat.showModal();
    });
    dlgPat.querySelectorAll('input[name="pattype"]').forEach((r) => {
      r.addEventListener('change', () => {
        $('pat-linear-fields').hidden = r.value !== 'linear';
        $('pat-circular-fields').hidden = r.value !== 'circular';
      });
    });
    dlgPat.addEventListener('close', () => {
      if (dlgPat.returnValue !== 'ok') return;
      const type = dlgPat.querySelector('input[name="pattype"]:checked').value;
      this.runPattern(type);
    });

    /* שיקוף */
    const dlgMir = $('dlg-mirror');
    $('tool-mirror').addEventListener('click', () => {
      if (!this.scene.selection.size) {
        this.toasts.info('בחר גוף לשיקוף');
        return;
      }
      dlgMir.showModal();
    });
    $('mirror-axis').querySelectorAll('[data-axis]').forEach((b) => {
      b.addEventListener('click', () => {
        $('mirror-axis').querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
      });
    });
    dlgMir.addEventListener('close', () => {
      if (dlgMir.returnValue !== 'ok') return;
      this.runMirror(
        $('mirror-axis').querySelector('.is-active').dataset.axis,
        $('mirror-plane').value,
        $('mirror-keep').checked
      );
    });
  }

  /** שכפול עמוק של גוף — גיאומטריה, חומר ופרמטרים */
  _cloneObject(src) {
    const clone = new SceneObject({
      type: src.type,
      geometry: src.mesh.geometry.clone(),
      params: src.params ? { ...src.params } : null,
      name: this._uniqueName(src.name),
      color: `#${src.mesh.material.color.getHexString()}`,
    });
    const m = src.mesh.material;
    clone.mesh.material.roughness = m.roughness;
    clone.mesh.material.metalness = m.metalness;
    clone.mesh.material.opacity = m.opacity;
    clone.mesh.material.transparent = m.transparent;
    clone.applyTransform(src.snapshotTransform());
    clone.setEdgesVisible(this.settings.edges && !this.wireframe);
    this._applyWireframe(clone);
    return clone;
  }

  runPattern(type) {
    const sel = this.scene.selectedObjects();
    if (!sel.length) return;

    const count = Math.min(Math.max(parseInt($('pat-count').value, 10) || 2, 2), 60);
    const clones = [];

    if (type === 'linear') {
      const dx = this.units.parse($('pat-dx').value) ?? 0;
      const dy = this.units.parse($('pat-dy').value) ?? 0;
      const dz = this.units.parse($('pat-dz').value) ?? 0;
      if (dx === 0 && dy === 0 && dz === 0) {
        this.toasts.error('קבע מרווח שונה מאפס לפחות בציר אחד');
        return;
      }
      for (let k = 1; k < count; k++) {
        for (const src of sel) {
          const c = this._cloneObject(src);
          c.mesh.position.x += dx * k;
          c.mesh.position.y += dy * k;
          c.mesh.position.z += dz * k;
          clones.push(c);
        }
      }
    } else {
      const totalDeg = Math.min(Math.max(parseFloat($('pat-angle').value) || 360, 1), 360);
      const rotateCopies = $('pat-rotate').checked;
      const full = Math.abs(totalDeg - 360) < 1e-6;
      // ב-360° המרווח הוא total/count (אחרת העותק האחרון נופל על הראשון)
      const step = THREE.MathUtils.degToRad(full ? totalDeg / count : totalDeg / (count - 1));
      const yAxis = new THREE.Vector3(0, 1, 0);
      for (let k = 1; k < count; k++) {
        const q = new THREE.Quaternion().setFromAxisAngle(yAxis, step * k);
        for (const src of sel) {
          const c = this._cloneObject(src);
          c.mesh.position.applyQuaternion(q);
          if (rotateCopies) c.mesh.quaternion.premultiply(q);
          clones.push(c);
        }
      }
    }

    const scene = this.scene;
    const label = type === 'linear' ? `מערך ליניארי ×${count}` : `מערך מעגלי ×${count}`;
    this.history.execute(new CompositeCommand(
      label, 'pattern',
      clones.map((c) => new AddObjectCommand(scene, c))
    ));
    this.scene.setSelection([...sel, ...clones].map((o) => o.id));
    this.toasts.success(`${label} נוצר — ${clones.length} עותקים`);
  }

  runMirror(axis, planeMode, keepOriginal) {
    const sel = this.scene.selectedObjects();
    if (!sel.length) return;

    const commands = [];
    const newIds = [];
    try {
      for (const src of sel) {
        // אפיית הטרנספורם העולמי — שיקוף נכון בכל כיוון גוף
        src.mesh.updateWorldMatrix(true, false);
        const baked = src.mesh.geometry.clone().applyMatrix4(src.mesh.matrixWorld);
        baked.computeBoundingBox();
        const center = baked.boundingBox.getCenter(new THREE.Vector3());
        const planeCoord = planeMode === 'center' ? center[axis] : 0;

        const mirrored = mirrorGeometry(baked, axis, planeCoord);
        baked.dispose();

        // מרכוז הגיאומטריה והצבת ה-mesh במיקום העולמי החדש
        mirrored.computeBoundingBox();
        const newCenter = mirrored.boundingBox.getCenter(new THREE.Vector3());
        mirrored.translate(-newCenter.x, -newCenter.y, -newCenter.z);
        mirrored.computeBoundingBox();
        mirrored.computeBoundingSphere();

        const obj = new SceneObject({
          type: 'mirrored',
          geometry: mirrored,
          name: this._uniqueName(`${src.name} משוקף`),
          color: `#${src.mesh.material.color.getHexString()}`,
        });
        obj.mesh.material.roughness = src.mesh.material.roughness;
        obj.mesh.material.metalness = src.mesh.material.metalness;
        obj.mesh.position.copy(newCenter);
        obj.setEdgesVisible(this.settings.edges && !this.wireframe);
        this._applyWireframe(obj);

        commands.push(new AddObjectCommand(this.scene, obj));
        newIds.push(obj.id);
      }
      if (!keepOriginal) commands.push(new DeleteObjectsCommand(this.scene, sel));
    } catch (err) {
      this.toasts.error(`השיקוף נכשל: ${err.message}`);
      return;
    }

    this.history.execute(new CompositeCommand(
      sel.length === 1 ? `שיקוף ${sel[0].name}` : `שיקוף ${sel.length} גופים`,
      'mirror', commands
    ));
    this.scene.setSelection(newIds);
  }

  /* ═══════════════ פעולות על גופים ═══════════════ */

  addPrimitive(type) {
    let built;
    try {
      built = buildPrimitive(type, defaultParams(type), this.settings.quality);
    } catch (err) {
      this.toasts.error(`יצירת הגוף נכשלה: ${err.message}`);
      return;
    }
    const obj = new SceneObject({
      type,
      geometry: built.geometry,
      params: built.params,
      name: this._uniqueName(PRIMITIVES[type].label),
    });
    obj.setEdgesVisible(this.settings.edges && !this.wireframe);
    this._applyWireframe(obj);

    // מיקום חכם — לצד הגופים הקיימים ולא בתוכם
    const bounds = this.scene.computeSceneBounds();
    if (bounds) {
      obj.mesh.geometry.computeBoundingBox();
      const half = obj.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).x / 2;
      obj.mesh.position.x = bounds.max.x + half + 12;
    }

    this.history.execute(new AddObjectCommand(this.scene, obj, `הוספת ${obj.name}`, `prim-${type}`));
    this.scene.setSelection([obj.id]);
  }

  _uniqueName(base) {
    const names = new Set(this.scene.all().map((o) => o.name));
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  }

  runBoolean(operation) {
    const sel = this.scene.selectedObjects();
    if (sel.length < 2) {
      this.toasts.info('בחר לפחות שני גופים (Shift+קליק לבחירה מרובה)');
      return;
    }
    const label = BOOLEAN_LABELS[operation];
    const busy = this.toasts.info(`מבצע ${label}…`, 10000);

    // מפנה פריים לציור הטוסט לפני חישוב סינכרוני כבד
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const { geometry, position } = booleanEngine.execute(operation, sel.map((o) => o.mesh));
        const obj = new SceneObject({
          type: 'boolean',
          geometry,
          name: this._uniqueName(`${label} ${sel.map((o) => o.name).join(' + ')}`.slice(0, 40)),
          color: `#${sel[0].mesh.material.color.getHexString()}`,
        });
        obj.mesh.position.copy(position);
        obj.mesh.material.roughness = sel[0].mesh.material.roughness;
        obj.mesh.material.metalness = sel[0].mesh.material.metalness;
        obj.setEdgesVisible(this.settings.edges && !this.wireframe);
        this._applyWireframe(obj);

        this.history.execute(new BooleanCommand(
          this.scene, `${label} (${sel.length} גופים)`, BOOLEAN_ICONS[operation], sel, obj
        ));
        const ms = Math.round(performance.now() - t0);
        busy.remove();
        this.toasts.success(`${label} הושלם ב-${ms} אלפיות שנייה`);
      } catch (err) {
        busy.remove();
        this.toasts.error(err.message || `פעולת ה${label} נכשלה`);
      }
    }, 30);
  }

  duplicateSelection() {
    const sel = this.scene.selectedObjects();
    if (!sel.length) return;
    const clones = sel.map((o) => {
      const clone = this._cloneObject(o);
      clone.mesh.position.x += 15;
      clone.mesh.position.z += 15;
      return clone;
    });
    this.history.execute(new CompositeCommand(
      clones.length === 1 ? `שכפול ${clones[0].name}` : `שכפול ${clones.length} גופים`,
      'duplicate',
      clones.map((c) => new AddObjectCommand(this.scene, c))
    ));
    this.scene.setSelection(clones.map((c) => c.id));
  }

  deleteSelection() {
    const sel = this.scene.selectedObjects();
    if (!sel.length) return;
    this.history.execute(new DeleteObjectsCommand(this.scene, sel));
  }

  /* ═══════════════ סרגל עליון ═══════════════ */

  _bindAppbar() {
    $('btn-undo').addEventListener('click', () => this.history.undo());
    $('btn-redo').addEventListener('click', () => this.history.redo());
    $('btn-frame-all').addEventListener('click', () => this.frameAll());
    $('btn-focus-sel').addEventListener('click', () => this.focusSelection());

    $('btn-save').addEventListener('click', () => this.saveProject());
    $('btn-open').addEventListener('click', () => $('project-input').click());
    $('btn-import').addEventListener('click', () => $('file-input').click());
    $('btn-export').addEventListener('click', () => this._openExportDialog());
    $('btn-record').addEventListener('click', () => this._openRecordDialog());
    $('btn-settings').addEventListener('click', () => $('dlg-settings').showModal());

    $('doc-name').addEventListener('change', () => this._markDirty());

    $('file-input').addEventListener('change', async (e) => {
      await this.importFiles([...e.target.files]);
      e.target.value = '';
    });
    $('project-input').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f) await this.openProjectFile(f);
      e.target.value = '';
    });
  }

  frameAll() {
    this.viewport.frameBox(this.scene.computeSceneBounds());
  }

  focusSelection() {
    const sel = this.scene.selectedObjects();
    if (!sel.length) { this.frameAll(); return; }
    const box = new THREE.Box3();
    sel.forEach((o) => box.union(new THREE.Box3().setFromObject(o.mesh)));
    this.viewport.frameBox(box);
  }

  /* ═══════════════ בקרי תצוגה ═══════════════ */

  _bindViewControls() {
    $('btn-cam-mode').addEventListener('click', () => {
      this.viewport.setOrthographic(!this.viewport.isOrtho);
    });
    $('btn-view-iso').addEventListener('click', () => {
      this.viewport.setView('iso', this.scene.computeSceneBounds());
    });
    $('btn-grid').addEventListener('click', () => {
      const v = !this.viewport.gridVisible;
      this.viewport.setGridVisible(v);
      $('btn-grid').classList.toggle('is-on', v);
    });
    $('btn-wireframe').addEventListener('click', () => this.toggleWireframe());
    $('btn-shadows').addEventListener('click', () => {
      const on = !$('btn-shadows').classList.contains('is-on');
      this.viewport.setShadowsEnabled(on);
      $('btn-shadows').classList.toggle('is-on', on);
    });
  }

  toggleWireframe() {
    this.wireframe = !this.wireframe;
    $('btn-wireframe').classList.toggle('is-on', this.wireframe);
    for (const o of this.scene.all()) this._applyWireframe(o);
  }

  _applyWireframe(obj) {
    obj.mesh.material.wireframe = this.wireframe;
    obj.setEdgesVisible(this.settings.edges && !this.wireframe);
  }

  /* ═══════════════ קוביית ניווט ═══════════════ */

  _bindViewCube() {
    const cube = $('viewcube');
    const m = new THREE.Matrix4();
    let lastQ = new THREE.Quaternion();

    this.viewport.addEventListener('frame', (e) => {
      const q = e.detail.camera.quaternion;
      if (q.angleTo(lastQ) < 0.001) return;
      lastQ.copy(q);
      m.makeRotationFromQuaternion(q).invert();
      const el = m.elements;
      cube.style.transform =
        `matrix3d(${el[0]},${-el[1]},${el[2]},0,` +
        `${-el[4]},${el[5]},${-el[6]},0,` +
        `${el[8]},${-el[9]},${el[10]},0,0,0,0,1)`;
    });

    cube.querySelectorAll('.vc-face').forEach((face) => {
      face.addEventListener('click', () => {
        this.viewport.setView(face.dataset.view, this.scene.computeSceneBounds());
      });
    });
  }

  /* ═══════════════ פאנל חתך ═══════════════ */

  _bindSectionPanel() {
    const slider = $('section-offset');
    const num = $('section-offset-num');

    const syncRange = () => {
      const range = this.section.suggestedRange(this.scene.computeSceneBounds());
      slider.min = range.min;
      slider.max = range.max;
    };

    $('section-close').addEventListener('click', () => {
      $('section-panel').hidden = true;
      $('tool-section').classList.remove('is-active');
      $('section-enable').checked = false;
      this.section.setEnabled(false);
    });

    $('section-enable').addEventListener('change', (e) => {
      syncRange();
      this.section.setEnabled(e.target.checked);
    });

    $('section-axis').querySelectorAll('[data-axis]').forEach((b) => {
      b.addEventListener('click', () => {
        $('section-axis').querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        this.section.setAxis(b.dataset.axis);
        syncRange();
      });
    });

    $('section-flip').addEventListener('click', () => {
      this.section.setFlipped(!this.section.flipped);
    });

    slider.addEventListener('input', () => {
      const mm = parseFloat(slider.value);
      num.value = this.units.format(mm);
      this.section.setOffset(mm);
    });
    num.addEventListener('change', () => {
      const mm = this.units.parse(num.value);
      if (mm === null) { num.value = this.units.format(this.section.offset); return; }
      slider.value = mm;
      this.section.setOffset(mm);
    });
  }

  /* ═══════════════ שורת סטטוס ═══════════════ */

  _bindStatusBar() {
    $('unit-select').addEventListener('change', (e) => {
      this.units.set(e.target.value);
    });
    this.units.onChange(() => {
      document.querySelectorAll('[data-unit-label]').forEach((el) => {
        el.textContent = this.units.label;
      });
      this._applySnapSettings();
      this.inspector.refresh();
    });

    $('snap-grid').addEventListener('change', () => this._applySnapSettings());
    $('snap-angle').addEventListener('change', () => this._applySnapSettings());

    /* פאנל מתקפל */
    $('btn-collapse-inspector').addEventListener('click', () => {
      $('inspector').classList.add('is-collapsed');
      $('btn-expand-inspector').hidden = false;
    });
    $('btn-expand-inspector').addEventListener('click', () => {
      $('inspector').classList.remove('is-collapsed');
      $('btn-expand-inspector').hidden = true;
    });

    /* לשוניות */
    $('tab-props').addEventListener('click', () => this._switchTab('props'));
    $('tab-tree').addEventListener('click', () => this._switchTab('tree'));
  }

  _switchTab(tab) {
    $('tab-props').classList.toggle('is-active', tab === 'props');
    $('tab-tree').classList.toggle('is-active', tab === 'tree');
    $('props-panel').hidden = tab !== 'props';
    $('tree-panel').hidden = tab !== 'tree';
  }

  /* ═══════════════ דיאלוגים ═══════════════ */

  _bindDialogs() {
    /* ייצוא */
    const dlgExport = $('dlg-export');
    const notes = {
      'stl-b': 'STL בינארי — הפורמט המקובל להדפסת תלת־ממד. היחידות נשמרות במילימטרים.',
      'stl-a': 'STL טקסטואלי — קריא אך גדול פי כמה מהבינארי. מתאים לדיבוג ולכלים ישנים.',
      obj: 'OBJ + MTL — שני קבצים: גיאומטריה וספריית חומרים עם צבעים. נתמך בכל תוכנה.',
      ply: 'PLY בינארי — פורמט מחקרי נפוץ לסריקות וענני נקודות.',
      glb: 'GLB — קובץ glTF בינארי יחיד כולל חומרי PBR. מומר אוטומטית למטרים לפי התקן.',
      tsura: 'קובץ הפרויקט המלא של צורה — כולל פרמטרים, חומרים והיסטוריית עבודה ניתנת להמשך.',
      png: 'תמונת רינדור של המבט הנוכחי ברזולוציה כפולה — מוכנה למצגות ולתיעוד.',
    };
    dlgExport.querySelectorAll('input[name="fmt"]').forEach((r) => {
      r.addEventListener('change', () => { $('export-note').textContent = notes[r.value]; });
    });
    dlgExport.addEventListener('close', async () => {
      if (dlgExport.returnValue !== 'ok') return;
      const fmt = dlgExport.querySelector('input[name="fmt"]:checked').value;
      const scope = dlgExport.querySelector('input[name="scope"]:checked').value;
      if (fmt === 'png') {
        try {
          const blob = await this.viewport.captureImage(2);
          const { saveBlob } = await import('./io/Exporters.js');
          saveBlob(blob, `${($('doc-name').value || 'model').trim()}.png`);
          this.toasts.success('תמונת הרינדור ירדה למחשב');
        } catch (err) {
          this.toasts.error(err.message);
        }
        return;
      }
      try {
        const n = await this.exporters.export(fmt, scope, $('doc-name').value,
          () => serializeProject(this.scene, this._projectMeta()));
        this.toasts.success(fmt === 'tsura' ? 'הפרויקט נשמר' : `${n === 1 ? 'גוף אחד יוצא' : `${n} גופים יוצאו`} בהצלחה`);
      } catch (err) {
        this.toasts.error(err.message);
      }
    });

    /* הקלטה */
    const dlgRecord = $('dlg-record');
    dlgRecord.addEventListener('close', () => {
      if (dlgRecord.returnValue !== 'ok') return;
      this.startRecording({
        mode: dlgRecord.querySelector('input[name="recmode"]:checked').value,
        duration: parseFloat($('rec-duration').value) || 8,
        bitrateMbps: parseInt($('rec-quality').value, 10),
        orbit: $('rec-orbit').value,
      });
    });

    /* הגדרות */
    const dlgSettings = $('dlg-settings');
    dlgSettings.addEventListener('close', () => {
      const snapDisplay = parseFloat($('set-snap-size').value);
      if (Number.isFinite(snapDisplay) && snapDisplay > 0) {
        this.settings.snapSize = this.units.fromDisplay(snapDisplay);
      }
      const gridDisplay = parseFloat($('set-grid-size').value);
      if (Number.isFinite(gridDisplay) && gridDisplay >= 10) {
        const mm = this.units.fromDisplay(gridDisplay);
        if (mm !== this.settings.gridSize) {
          this.settings.gridSize = mm;
          this.viewport.setGridSize(mm);
        }
      }
      this.settings.quality = $('set-quality').value;
      this.settings.autosave = $('set-autosave').checked;
      this.settings.edges = $('set-edges').checked;
      for (const o of this.scene.all()) this._applyWireframe(o);
      this._applySnapSettings();
    });
  }

  _openExportDialog() {
    if (this.scene.count === 0) {
      this.toasts.info('הסצנה ריקה — הוסף גופים לפני ייצוא');
      return;
    }
    $('dlg-export').showModal();
  }

  _openRecordDialog() {
    if (this.scene.count === 0) {
      this.toasts.info('הסצנה ריקה — אין מה להקליט');
      return;
    }
    if (!this.recorder.supported) {
      this.toasts.error('הדפדפן אינו תומך בהקלטת וידאו מקנבס');
      return;
    }
    $('dlg-record').showModal();
  }

  async startRecording(opts) {
    const indicator = $('rec-indicator');
    const timeEl = $('rec-time');
    indicator.hidden = false;

    const onTick = (e) => {
      const { elapsed, duration } = e.detail;
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
      timeEl.textContent = `${mm}:${ss} / ${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;
    };
    this.recorder.addEventListener('tick', onTick);

    const stopBtn = $('rec-stop');
    const onStop = () => this.recorder.stop();
    stopBtn.addEventListener('click', onStop);

    try {
      await this.recorder.start({ ...opts, docName: $('doc-name').value });
      this.toasts.success('הסרטון ירד למחשב שלך');
    } catch (err) {
      this.toasts.error(err.message);
    } finally {
      indicator.hidden = true;
      this.recorder.removeEventListener('tick', onTick);
      stopBtn.removeEventListener('click', onStop);
    }
  }

  /* ═══════════════ תפריט הקשר ═══════════════ */

  _bindContextMenu() {
    const menu = $('context-menu');
    menu.querySelectorAll('[data-action]').forEach((b) => {
      b.addEventListener('click', () => {
        this._hideContextMenu();
        this._contextAction(b.dataset.action);
      });
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target)) this._hideContextMenu();
    });
  }

  _showContextMenu(x, y) {
    const menu = $('context-menu');
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  }

  _hideContextMenu() { $('context-menu').hidden = true; }

  _contextAction(action) {
    const sel = this.scene.selectedObjects();
    if (!sel.length) return;
    switch (action) {
      case 'duplicate': this.duplicateSelection(); break;
      case 'delete': this.deleteSelection(); break;
      case 'focus': this.focusSelection(); break;
      case 'hide':
        sel.forEach((o) => this.history.execute(new VisibilityCommand(this.scene, o, false)));
        break;
      case 'ground': {
        const entries = sel.map((obj) => {
          const before = obj.snapshotTransform();
          const box = new THREE.Box3().setFromObject(obj.mesh);
          const after = obj.snapshotTransform();
          after.position.y -= box.min.y;
          return { obj, before, after };
        }).filter((e) => Math.abs(e.after.position.y - e.before.position.y) > 1e-9);
        if (entries.length) {
          this.history.execute(new TransformCommand(this.scene, entries, 'הצמדה לרצפה', 'ground'));
        }
        break;
      }
      case 'center': {
        const entries = sel.map((obj) => {
          const before = obj.snapshotTransform();
          const after = obj.snapshotTransform();
          after.position.x = 0;
          after.position.z = 0;
          return { obj, before, after };
        }).filter((e) => !e.before.position.equals(e.after.position));
        if (entries.length) {
          this.history.execute(new TransformCommand(this.scene, entries, 'מרכוז בראשית', 'center'));
        }
        break;
      }
    }
  }

  /* ═══════════════ מקלדת ═══════════════ */

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // לא בזמן הקלדה בשדות או בדיאלוג פתוח
      const t = e.target;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (document.querySelector('dialog[open]')) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        switch (e.key.toLowerCase()) {
          case 'z': e.preventDefault(); e.shiftKey ? this.history.redo() : this.history.undo(); return;
          case 'y': e.preventDefault(); this.history.redo(); return;
          case 'd': e.preventDefault(); this.duplicateSelection(); return;
          case 's': e.preventDefault(); this.saveProject(); return;
          case 'o': e.preventDefault(); $('project-input').click(); return;
          case 'a': e.preventDefault(); this.scene.setSelection(this.scene.all().map((o) => o.id)); return;
        }
        return;
      }

      switch (e.key) {
        case 'q': case 'Q': this.setTool('select'); break;
        case 'w': case 'W': this.setTool('move'); break;
        case 'e': case 'E': this.setTool('rotate'); break;
        case 'r': case 'R': this.setTool('scale'); break;
        case 'a': case 'A': $('tool-primitives').click(); break;
        case 's': case 'S': $('tool-sketch').click(); break;
        case 'm': case 'M': $('tool-measure').click(); break;
        case 'x': case 'X': $('tool-section').click(); break;
        case 'g': case 'G': $('btn-grid').click(); break;
        case 'z': case 'Z': this.toggleWireframe(); break;
        case 'f': this.focusSelection(); break;
        case 'F': this.frameAll(); break;
        case 'h': case 'H': {
          const sel = this.scene.selectedObjects();
          sel.forEach((o) => this.history.execute(new VisibilityCommand(this.scene, o, false)));
          break;
        }
        case 'Delete': case 'Backspace': this.deleteSelection(); break;
        case 'Escape':
          this._hideContextMenu();
          if (this.activeTool === 'measure') this.setTool('select');
          else this.scene.clearSelection();
          break;
        case 'Home': this.viewport.goHome(); break;
        case '5': if (e.code === 'Numpad5') this.viewport.setOrthographic(!this.viewport.isOrtho); break;
      }
    });
  }

  /* ═══════════════ ייבוא / פרויקט ═══════════════ */

  async importFiles(files) {
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'tsura' || ext === 'json') {
        await this.openProjectFile(file);
        continue;
      }
      try {
        const results = await importModelFile(file);
        const objs = results.map(({ geometry, name }) => {
          const obj = new SceneObject({ type: 'imported', geometry, name: this._uniqueName(name) });
          obj.setEdgesVisible(this.settings.edges && !this.wireframe);
          this._applyWireframe(obj);
          return obj;
        });
        const scene = this.scene;
        this.history.execute(new (class extends AddObjectCommand {
          constructor() { super(scene, objs[0], `ייבוא ${file.name}`, 'import'); }
          execute() { objs.forEach((o) => scene.add(o)); }
          undo() { objs.forEach((o) => scene.remove(o)); }
        })());
        this.scene.setSelection(objs.map((o) => o.id));
        this.frameAll();
        this.toasts.success(`${file.name} יובא בהצלחה`);
      } catch (err) {
        this.toasts.error(err.message);
      }
    }
  }

  _bindDragDrop() {
    const overlay = $('drop-overlay');
    const wrap = $('viewport-wrap');
    let depth = 0;

    wrap.addEventListener('dragenter', (e) => {
      e.preventDefault();
      depth++;
      overlay.hidden = false;
    });
    wrap.addEventListener('dragover', (e) => e.preventDefault());
    wrap.addEventListener('dragleave', () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) overlay.hidden = true;
    });
    wrap.addEventListener('drop', async (e) => {
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const files = [...e.dataTransfer.files];
      if (files.length) await this.importFiles(files);
    });
  }

  _projectMeta() {
    return {
      docName: $('doc-name').value,
      units: this.units.current,
      quality: this.settings.quality,
    };
  }

  saveProject() {
    try {
      const json = serializeProject(this.scene, this._projectMeta());
      const name = ($('doc-name').value || 'model').trim();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.tsura`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      $('dirty-dot').hidden = true;
      this.toasts.success('הפרויקט נשמר');
    } catch (err) {
      this.toasts.error(`השמירה נכשלה: ${err.message}`);
    }
  }

  async openProjectFile(file) {
    try {
      const text = await file.text();
      this._loadProjectJson(text);
      $('doc-name').value = file.name.replace(/\.(tsura|json)$/i, '');
      this.toasts.success('הפרויקט נטען');
    } catch (err) {
      this.toasts.error(err.message);
    }
  }

  _loadProjectJson(json) {
    const { meta, descriptors } = deserializeProject(json, this.settings.quality);

    // ניקוי הסצנה הקיימת
    for (const o of this.scene.all()) {
      this.scene.remove(o);
      o.dispose();
    }
    this.history.clear();

    for (const d of descriptors) {
      const obj = new SceneObject({
        type: d.type,
        geometry: d.geometry,
        params: d.params,
        name: d.name,
        color: d.material?.color,
      });
      if (d.material) {
        obj.mesh.material.roughness = d.material.roughness ?? 0.45;
        obj.mesh.material.metalness = d.material.metalness ?? 0.1;
        obj.mesh.material.opacity = d.material.opacity ?? 1;
        obj.mesh.material.transparent = obj.mesh.material.opacity < 1;
      }
      if (d.transform) {
        obj.mesh.position.fromArray(d.transform.position);
        obj.mesh.quaternion.fromArray(d.transform.quaternion);
        obj.mesh.scale.fromArray(d.transform.scale);
      }
      obj.visible = d.visible;
      obj.setEdgesVisible(this.settings.edges && !this.wireframe);
      this._applyWireframe(obj);
      this.scene.add(obj);
    }

    if (meta.docName) $('doc-name').value = meta.docName;
    if (meta.units) {
      this.units.set(meta.units);
      $('unit-select').value = meta.units;
    }
    this.frameAll();
    $('dirty-dot').hidden = true;
  }

  /* ═══════════════ שמירה אוטומטית ═══════════════ */

  _scheduleAutosave() {
    if (!this.settings.autosave) return;
    clearTimeout(this._autosaveTimer);
    this._autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, serializeProject(this.scene, this._projectMeta()));
      } catch {
        // חריגת מכסה — משחררים את השמירה הישנה וממשיכים בשקט
        try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* noop */ }
      }
    }, 1200);
  }

  _restoreAutosave() {
    let saved = null;
    try { saved = localStorage.getItem(AUTOSAVE_KEY); } catch { /* noop */ }
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.objects?.length) return;
      this._loadProjectJson(saved);
      this.toasts.info('העבודה האחרונה שוחזרה משמירה אוטומטית');
    } catch {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* noop */ }
    }
  }
}

/* ── הפעלה ── */
window.addEventListener('DOMContentLoaded', () => {
  window.tsura = new App();
});
