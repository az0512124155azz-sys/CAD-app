/**
 * רצועת ההיסטוריה — ציר זמן אופקי של פעולות.
 * לחיצה על כרטיס קופצת לאותה נקודה (undo/redo מרובה),
 * כולל כרטיס "התחלה" שמחזיר למסמך ריק.
 */

import { ICONS } from './icons.js';

export class HistoryStrip {
  /** @param {import('../core/Commands.js').History} history */
  constructor(history) {
    this.history = history;
    this.strip = document.getElementById('history-strip');
    this.cards = document.getElementById('history-cards');
    this.countEl = document.getElementById('history-count');
    this.toggleBtn = document.getElementById('history-toggle');

    this.toggleBtn.addEventListener('click', () => {
      this.strip.classList.toggle('is-collapsed');
    });

    history.addEventListener('changed', () => this.render());
    this.render();
  }

  render() {
    const { commands, index } = this.history;
    this.countEl.textContent = String(commands.length);
    this.cards.innerHTML = '';

    const start = document.createElement('button');
    start.className = 'history-card';
    if (index === -1) start.classList.add('is-current');
    start.innerHTML = `${ICONS.history}<span>התחלה</span>`;
    start.title = 'חזרה למסמך ריק';
    start.addEventListener('click', () => this.history.jumpTo(-1));
    this.cards.appendChild(start);

    commands.forEach((cmd, i) => {
      const card = document.createElement('button');
      card.className = 'history-card';
      if (i === index) card.classList.add('is-current');
      if (i > index) card.classList.add('is-future');
      card.innerHTML = `${ICONS[cmd.icon] ?? ICONS.history}<span>${cmd.label}</span><span class="history-idx">${i + 1}</span>`;
      card.title = i === index ? 'המצב הנוכחי' : (i < index ? 'חזור לנקודה זו' : 'התקדם לנקודה זו');
      card.addEventListener('click', () => this.history.jumpTo(i));
      this.cards.appendChild(card);
    });

    // גלילה אוטומטית אל הכרטיס הנוכחי
    const current = this.cards.querySelector('.is-current');
    current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
