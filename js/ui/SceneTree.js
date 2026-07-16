/**
 * עץ הסצנה — רשימת הגופים עם בחירה, שינוי שם ומתגי נראות.
 */

import { ICONS } from './icons.js';
import { RenameCommand, VisibilityCommand } from '../core/Commands.js';
import { triangleCount } from '../geometry/GeometryUtils.js';

export class SceneTree {
  /** @param {{scene, history}} deps */
  constructor(deps) {
    this.scene = deps.scene;
    this.history = deps.history;
    this.list = document.getElementById('scene-tree');
    this.countEl = document.getElementById('tree-count');

    document.getElementById('tree-show-all').addEventListener('click', () => {
      for (const o of this.scene.all()) {
        if (!o.visible) this.history.execute(new VisibilityCommand(this.scene, o, true));
      }
    });

    this.scene.addEventListener('objects-changed', () => this.render());
    this.scene.addEventListener('selection-changed', () => this.render());
    this.scene.addEventListener('object-updated', () => this.render());
  }

  render() {
    const objects = this.scene.all().sort((a, b) => a.id - b.id);
    this.countEl.textContent = objects.length === 1 ? 'גוף אחד' : `${objects.length} גופים`;
    this.list.innerHTML = '';

    for (const obj of objects) {
      const li = document.createElement('li');
      li.className = 'tree-item';
      if (this.scene.selection.has(obj.id)) li.classList.add('is-selected');
      if (!obj.visible) li.classList.add('is-hidden');

      const swatch = document.createElement('span');
      swatch.className = 'tree-swatch';
      swatch.style.background = `#${obj.mesh.material.color.getHexString()}`;

      const name = document.createElement('span');
      name.className = 'tree-name';
      name.textContent = obj.name;

      const tris = document.createElement('span');
      tris.className = 'tree-tri';
      tris.textContent = triangleCount(obj.mesh.geometry).toLocaleString();

      const vis = document.createElement('button');
      vis.className = 'tree-vis';
      vis.title = obj.visible ? 'הסתר' : 'הצג';
      vis.innerHTML = obj.visible ? ICONS.eye : ICONS['eye-off'];
      vis.addEventListener('click', (e) => {
        e.stopPropagation();
        this.history.execute(new VisibilityCommand(this.scene, obj, !obj.visible));
      });

      li.append(swatch, name, tris, vis);

      li.addEventListener('click', (e) => {
        if (e.shiftKey || e.ctrlKey) this.scene.toggleSelection(obj.id);
        else this.scene.setSelection([obj.id]);
      });

      li.addEventListener('dblclick', () => this._startRename(li, name, obj));
      this.list.appendChild(li);
    }
  }

  _startRename(li, nameEl, obj) {
    const input = document.createElement('input');
    input.className = 'tree-name-input';
    input.value = obj.name;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = (commit) => {
      const val = input.value.trim();
      if (commit && val && val !== obj.name) {
        this.history.execute(new RenameCommand(this.scene, obj, obj.name, val));
      } else {
        this.render();
      }
    };
    input.addEventListener('blur', () => finish(true), { once: true });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.removeEventListener('blur', finish); finish(false); }
      e.stopPropagation();
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  }
}
