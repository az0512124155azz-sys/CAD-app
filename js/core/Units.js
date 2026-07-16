/**
 * מערכת יחידות — הפנימיות תמיד מילימטרים.
 * ההמרה מתבצעת אך ורק בשכבת התצוגה והקלט.
 */

const UNITS = {
  mm: { factor: 1,    label: 'מ"מ',  precision: 2 },
  cm: { factor: 10,   label: 'ס"מ',  precision: 3 },
  in: { factor: 25.4, label: 'אינץ׳', precision: 4 },
};

export class UnitSystem {
  constructor() {
    this.current = 'mm';
    this._listeners = new Set();
  }

  set(unit) {
    if (!UNITS[unit] || unit === this.current) return;
    this.current = unit;
    this._listeners.forEach((fn) => fn(unit));
  }

  onChange(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }

  get label() { return UNITS[this.current].label; }
  get factor() { return UNITS[this.current].factor; }

  /** מ"מ פנימי → ערך תצוגה */
  toDisplay(mm) { return mm / this.factor; }

  /** קלט משתמש → מ"מ פנימי */
  fromDisplay(v) { return v * this.factor; }

  /** עיצוב ערך מ"מ למחרוזת תצוגה */
  format(mm, precision = null) {
    const u = UNITS[this.current];
    const p = precision ?? u.precision;
    const v = mm / u.factor;
    // הסרת אפסים עודפים תוך שמירת דיוק
    let s = v.toFixed(p);
    if (s.includes('.')) s = s.replace(/\.?0+$/, '');
    if (s === '-0') s = '0';
    return s;
  }

  formatWithUnit(mm, precision = null) {
    return `${this.format(mm, precision)} ${this.label}`;
  }

  /**
   * פירוש קלט מספרי של המשתמש. תומך בפסיק עשרוני,
   * ובביטויים חשבוניים פשוטים (12+5, 30/2).
   * @returns {number|null} ערך במ"מ, או null אם לא תקין
   */
  parse(text) {
    if (typeof text !== 'string') return null;
    const cleaned = text.trim().replace(/,/g, '.').replace(/[^\d.+\-*/() ]/g, '');
    if (!cleaned || !/\d/.test(cleaned)) return null;
    if (!/^[\d.+\-*/() ]+$/.test(cleaned)) return null;
    let value;
    try {
      // ביטוי חשבוני מסונן לתווים בטוחים בלבד
      value = Function(`"use strict"; return (${cleaned});`)();
    } catch { return null; }
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return this.fromDisplay(value);
  }
}

export const unitDefs = UNITS;
