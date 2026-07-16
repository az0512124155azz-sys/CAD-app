/**
 * מערכת פקודות — Undo/Redo מלא בתבנית Command.
 * ההיסטוריה היא מחסנית אחת עם מצביע, כך שרצועת ההיסטוריה
 * יכולה לקפוץ לכל נקודה (jumpTo) קדימה ואחורה.
 */

export class Command {
  /**
   * @param {string} label — תיאור קצר לתצוגה
   * @param {string} icon — שם אייקון לרצועת ההיסטוריה
   */
  constructor(label, icon = 'history') {
    this.label = label;
    this.icon = icon;
  }
  execute() {}
  undo() {}
}

/* ── פקודות קונקרטיות ── */

export class AddObjectCommand extends Command {
  constructor(scene, obj, label = null, icon = 'shapes') {
    super(label ?? `הוספת ${obj.name}`, icon);
    this.scene = scene;
    this.obj = obj;
  }
  execute() { this.scene.add(this.obj); }
  undo() { this.scene.remove(this.obj); }
}

export class DeleteObjectsCommand extends Command {
  constructor(scene, objs) {
    super(objs.length === 1 ? `מחיקת ${objs[0].name}` : `מחיקת ${objs.length} גופים`, 'trash');
    this.scene = scene;
    this.objs = [...objs];
  }
  execute() { this.objs.forEach((o) => this.scene.remove(o)); }
  undo() { this.objs.forEach((o) => this.scene.add(o)); }
}

export class TransformCommand extends Command {
  /**
   * @param {Array<{obj, before, after}>} entries — לכל גוף לכידת לפני/אחרי
   */
  constructor(scene, entries, label = 'שינוי מיקום', icon = 'move') {
    super(label, icon);
    this.scene = scene;
    this.entries = entries;
  }
  execute() {
    this.entries.forEach(({ obj, after }) => {
      obj.applyTransform(after);
      this.scene.notifyObjectChanged(obj);
    });
  }
  undo() {
    this.entries.forEach(({ obj, before }) => {
      obj.applyTransform(before);
      this.scene.notifyObjectChanged(obj);
    });
  }
}

export class BooleanCommand extends Command {
  constructor(scene, label, icon, inputs, result) {
    super(label, icon);
    this.scene = scene;
    this.inputs = [...inputs];
    this.result = result;
    // לכידת מצב נראות של הקלטים לצורך שחזור מדויק
    this._vis = this.inputs.map((o) => o.visible);
  }
  execute() {
    this.inputs.forEach((o) => this.scene.remove(o));
    this.scene.add(this.result);
    this.scene.setSelection([this.result.id]);
  }
  undo() {
    this.scene.remove(this.result);
    this.inputs.forEach((o, i) => { this.scene.add(o); o.visible = this._vis[i]; });
    this.scene.setSelection(this.inputs.map((o) => o.id));
  }
}

export class MaterialCommand extends Command {
  constructor(scene, obj, before, after) {
    super(`שינוי חומר · ${obj.name}`, 'shapes');
    this.scene = scene;
    this.obj = obj;
    this.before = { ...before };
    this.after = { ...after };
  }
  _apply(state) {
    const m = this.obj.mesh.material;
    if (state.color != null) m.color.set(state.color);
    if (state.roughness != null) m.roughness = state.roughness;
    if (state.metalness != null) m.metalness = state.metalness;
    if (state.opacity != null) {
      m.opacity = state.opacity;
      m.transparent = state.opacity < 1;
    }
    m.needsUpdate = true;
    this.scene.notifyObjectChanged(this.obj);
  }
  execute() { this._apply(this.after); }
  undo() { this._apply(this.before); }
}

export class GeometryCommand extends Command {
  /** החלפת גיאומטריה (עריכת פרמטרים של primitive) */
  constructor(scene, obj, beforeGeom, beforeParams, afterGeom, afterParams, label = null) {
    super(label ?? `עריכת ${obj.name}`, 'settings');
    this.scene = scene;
    this.obj = obj;
    this.beforeGeom = beforeGeom;
    this.beforeParams = beforeParams ? { ...beforeParams } : null;
    this.afterGeom = afterGeom;
    this.afterParams = afterParams ? { ...afterParams } : null;
  }
  execute() {
    this.obj.setGeometry(this.afterGeom);
    this.obj.params = this.afterParams;
    this.scene.notifyObjectChanged(this.obj);
  }
  undo() {
    this.obj.setGeometry(this.beforeGeom);
    this.obj.params = this.beforeParams;
    this.scene.notifyObjectChanged(this.obj);
  }
}

export class RenameCommand extends Command {
  constructor(scene, obj, before, after) {
    super(`שינוי שם ל"${after}"`, 'settings');
    this.scene = scene;
    this.obj = obj;
    this.before = before;
    this.after = after;
  }
  execute() { this.obj.name = this.after; this.scene.notifyObjectChanged(this.obj); }
  undo() { this.obj.name = this.before; this.scene.notifyObjectChanged(this.obj); }
}

export class VisibilityCommand extends Command {
  constructor(scene, obj, visible) {
    super(`${visible ? 'הצגת' : 'הסתרת'} ${obj.name}`, visible ? 'eye' : 'eye-off');
    this.scene = scene;
    this.obj = obj;
    this.visible = visible;
  }
  execute() { this.obj.visible = this.visible; this.scene.notifyObjectChanged(this.obj); }
  undo() { this.obj.visible = !this.visible; this.scene.notifyObjectChanged(this.obj); }
}

/* ── היסטוריה ── */

export class History extends EventTarget {
  constructor(limit = 200) {
    super();
    /** @type {Command[]} */
    this.commands = [];
    this.index = -1; // מצביע על הפקודה האחרונה שבוצעה
    this.limit = limit;
  }

  _emit() { this.dispatchEvent(new CustomEvent('changed')); }

  /** מבצע פקודה חדשה וגוזם כל עתיד (redo) קיים */
  execute(cmd) {
    cmd.execute();
    this.commands.splice(this.index + 1);
    this.commands.push(cmd);
    if (this.commands.length > this.limit) {
      this.commands.shift();
    }
    this.index = this.commands.length - 1;
    this._emit();
  }

  get canUndo() { return this.index >= 0; }
  get canRedo() { return this.index < this.commands.length - 1; }

  undo() {
    if (!this.canUndo) return null;
    const cmd = this.commands[this.index--];
    cmd.undo();
    this._emit();
    return cmd;
  }

  redo() {
    if (!this.canRedo) return null;
    const cmd = this.commands[++this.index];
    cmd.execute();
    this._emit();
    return cmd;
  }

  /** קפיצה לנקודה ברצועת ההיסטוריה (-1 = מסמך ריק) */
  jumpTo(target) {
    target = Math.max(-1, Math.min(target, this.commands.length - 1));
    while (this.index > target) this.commands[this.index--].undo();
    while (this.index < target) this.commands[++this.index].execute();
    this._emit();
  }

  clear() {
    this.commands = [];
    this.index = -1;
    this._emit();
  }
}
