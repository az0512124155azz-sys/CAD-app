/**
 * הודעות טוסט לא-חוסמות מעל הקנבס.
 */

export class Toasts {
  constructor(container) {
    this.container = container;
  }

  show(message, type = 'info', duration = 2800) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    this.container.appendChild(el);

    // מגביל לשלוש הודעות בו-זמנית
    while (this.container.children.length > 3) {
      this.container.firstChild.remove();
    }

    setTimeout(() => {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
    return el;
  }

  success(msg, d) { return this.show(msg, 'success', d); }
  error(msg, d = 4200) { return this.show(msg, 'error', d); }
  info(msg, d) { return this.show(msg, 'info', d); }
}
