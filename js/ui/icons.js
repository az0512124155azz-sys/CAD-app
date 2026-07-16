/**
 * ערכת אייקונים וקטורית — קו אחיד 1.6px, פינות מעוגלות.
 * כל אייקון מוזרק לאלמנטים עם data-icon.
 */

const S = (inner, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: S('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  frame: S('<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>'),
  focus: S('<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/>'),
  open: S('<path d="M4 20h13.4a2 2 0 0 0 1.94-1.5l1.4-5.5A1.6 1.6 0 0 0 19.2 11H7.3a2 2 0 0 0-1.94 1.5L4 18V6a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V11"/>'),
  save: S('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  import: S('<path d="M12 3v12m0 0-4.2-4.2M12 15l4.2-4.2"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  export: S('<path d="M12 15V3m0 0L7.8 7.2M12 3l4.2 4.2"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  record: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/>'),
  settings: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"/>'),
  cursor: S('<path d="M5 3.5 19 10l-6.2 1.8L11 18z"/><path d="m13 13 5 5"/>'),
  'cursor-lg': S('<path d="M5 3.5 19 10l-6.2 1.8L11 18z"/><path d="m13 13 5 5"/>'),
  move: S('<path d="M12 2v20M2 12h20"/><path d="m8.5 5.5 3.5-3.5 3.5 3.5M8.5 18.5 12 22l3.5-3.5M5.5 8.5 2 12l3.5 3.5M18.5 8.5 22 12l-3.5 3.5"/>'),
  rotate: S('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>'),
  scale: S('<path d="M21 3h-6m6 0v6m0-6-7 7"/><rect x="3" y="10" width="11" height="11" rx="1.5"/>'),
  shapes: S('<rect x="3" y="13" width="8" height="8" rx="1.5"/><circle cx="16.5" cy="16.5" r="4.5"/><path d="M12 2 7 10.5h10z"/>'),
  union: S('<path d="M9.5 4.5a5.5 5.5 0 0 0-5 5A5.5 5.5 0 0 0 9 20h5.5a5.5 5.5 0 0 0 5-5A5.5 5.5 0 0 0 15 4.5z" fill="currentColor" fill-opacity=".18"/>'),
  subtract: S('<circle cx="9" cy="9" r="5.6" fill="currentColor" fill-opacity=".18"/><circle cx="15" cy="15" r="5.6"/><path d="M12.6 4.9A5.6 5.6 0 0 1 9 14.6" stroke-dasharray="1.5 2.4"/>'),
  intersect: S('<circle cx="9" cy="9" r="5.6"/><circle cx="15" cy="15" r="5.6"/><path d="M12.6 9.4a5.6 5.6 0 0 1 2 2 5.6 5.6 0 0 1-3.2 3.2 5.6 5.6 0 0 1-2-2 5.6 5.6 0 0 1 3.2-3.2z" fill="currentColor" stroke="none"/>'),
  section: S('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9" opacity=".45"/><path d="M2.5 14.5h19" stroke-dasharray="2.6 2.2"/>'),
  ruler: S('<rect x="2.5" y="14" width="19" height="7" rx="1.4" transform="rotate(-38 12 17.5)"/><path d="m8.6 13.5 1.5 1.9M11.7 11l1.5 1.9M14.8 8.6l1.5 1.9"/>'),
  duplicate: S('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a2 2 0 0 1 2-2h11"/>'),
  trash: S('<path d="M3.5 6h17M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6m3 0-1 13.5a2 2 0 0 1-2 1.5H8a2 2 0 0 1-2-1.5L5 6"/><path d="M10 10.5v6M14 10.5v6"/>'),
  camera: S('<path d="m15.5 9.5 4.5-2.6v10.2l-4.5-2.6"/><rect x="2.5" y="6" width="13" height="12" rx="2.5"/>'),
  grid: S('<path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><rect x="3" y="3" width="18" height="18" rx="1.5"/>'),
  wire: S('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9M4 16.5 12 12M20 16.5 12 12" opacity=".55"/>'),
  shadow: S('<circle cx="12" cy="9" r="5.5"/><ellipse cx="12" cy="19" rx="7.5" ry="2" fill="currentColor" fill-opacity=".2" stroke-opacity=".5"/>'),
  flip: S('<path d="M12 3v18" stroke-dasharray="2.4 2.2"/><path d="M8 7 3.5 12 8 17M16 7l4.5 5L16 17"/>'),
  eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  'eye-off': S('<path d="M4 4l16 16M9.9 5.9A8.6 8.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.6M6.2 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a8.9 8.9 0 0 0 4.4-1.2"/><path d="M9.9 9.9a2.8 2.8 0 1 0 4 4"/>'),
  ground: S('<path d="M3 20h18"/><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M12 17v3" opacity=".5"/>'),
  center: S('<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  history: S('<path d="M3.5 12a8.5 8.5 0 1 1 2.5 6"/><path d="M3.5 12H1m2.5 0L6 9.5M12 7v5.2l3.5 2"/>'),
  panel: S('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>'),
  sketch: S('<path d="M4 20c4-1 3.5-4 6-6.5S15 10 17 8"/><path d="m14.5 4.5 5 5L9 20l-5.5 1L4.5 15z" opacity="0"/><path d="M15 4.8 19.2 9 8.6 19.6 3.5 20.5l.9-5.1z"/><path d="m13 7 4 4" opacity=".5"/>'),
  pattern: S('<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4" opacity=".55"/><rect x="3" y="14" width="7" height="7" rx="1.4" opacity=".55"/><rect x="14" y="14" width="7" height="7" rx="1.4" opacity=".3"/>'),
  mirror: S('<path d="M12 2.5v19" stroke-dasharray="2.6 2.4"/><path d="M8.5 6.5v11L2.5 12z"/><path d="M15.5 6.5v11l6-5.5z" opacity=".5"/>'),
  // גופים בסיסיים — איזומטריים
  'prim-box': S('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>'),
  'prim-cylinder': S('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6"/>'),
  'prim-sphere': S('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.6" opacity=".55"/><ellipse cx="12" cy="12" rx="3.6" ry="9" opacity=".35"/>'),
  'prim-cone': S('<path d="M12 3 5 18c0 1.66 3.13 3 7 3s7-1.34 7-3z"/><ellipse cx="12" cy="18" rx="7" ry="3" opacity=".55"/>'),
  'prim-torus': S('<ellipse cx="12" cy="12" rx="9" ry="5.6"/><ellipse cx="12" cy="11.4" rx="3.6" ry="1.9"/>'),
  'prim-wedge': S('<path d="M3 18.5 21 5.5v13z"/><path d="M3 18.5 12 21l9-2.5M21 5.5 12 21" opacity=".45"/>'),
  'prim-tube': S('<ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><ellipse cx="12" cy="5.5" rx="3.4" ry="1.4"/><path d="M5 5.5v13c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-13"/>'),
  'prim-capsule': S('<path d="M7 8a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0z"/><path d="M7 8.5c0 1.4 2.24 2.5 5 2.5s5-1.1 5-2.5" opacity=".5"/>'),
  'prim-prism': S('<path d="M12 3 3.5 8v8L12 21l8.5-5V8z"/><path d="M3.5 8 12 13l8.5-5M12 13v8" opacity=".5"/>'),
  'prim-pyramid': S('<path d="M12 3 3 17.5 12 21l9-3.5z"/><path d="M12 3v18M3 17.5 12 21" opacity=".45"/>'),
  'prim-ring': S('<ellipse cx="12" cy="12" rx="9" ry="4.5"/><ellipse cx="12" cy="12" rx="4" ry="2"/><path d="M3 12v2c0 2.5 4 4.5 9 4.5s9-2 9-4.5v-2" opacity=".5"/>'),
  'prim-gear': S('<circle cx="12" cy="12" r="3"/><path d="M12 4.5V2m0 20v-2.5m5.3-12.8 1.77-1.77M4.93 19.07l1.77-1.77m0-10.6L4.93 4.93m14.14 14.14-1.77-1.77M19.5 12H22M2 12h2.5"/><circle cx="12" cy="12" r="7"/>'),
};

/** מזריק אייקונים לכל האלמנטים המסומנים data-icon */
export function injectIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const icon = ICONS[el.dataset.icon];
    if (!icon) return;
    if (el.classList.contains('i') || el.tagName === 'SPAN' || el.tagName === 'DIV') {
      el.innerHTML = icon;
    } else {
      // כפתור — משמר טקסט קיים ומוסיף אייקון בתחילתו
      const label = el.querySelector('span');
      el.insertAdjacentHTML('afterbegin', icon);
      if (label) el.appendChild(label);
    }
  });
}
