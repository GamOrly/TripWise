// Shared UI behaviour: Toast and Bottom sheet, built on the design system's tw- classes.

import { icon } from './icons.js';

// ---------- Toast ----------

let toastTimer = null;

// showToast('Trip saved to My Trips', { action: { text: 'Open', href: 'trip.html?id=…' } })
export function showToast(text, { action, duration = 4000 } = {}) {
  document.querySelector('.tw-toast')?.remove();
  clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = 'tw-toast';
  toast.setAttribute('role', 'status');

  const check = document.createElement('span');
  check.className = 'tw-toast__check';
  check.appendChild(icon('check'));

  const label = document.createElement('p');
  label.className = 'tw-toast__text';
  label.textContent = text;

  toast.append(check, label);
  if (action) {
    const link = document.createElement('a');
    link.className = 'tw-toast__action';
    link.href = action.href;
    link.textContent = action.text;
    toast.appendChild(link);
  }
  document.body.appendChild(toast);
  toastTimer = setTimeout(() => toast.remove(), duration);
  return toast;
}

// ---------- Bottom sheet ----------
// Markup in the page: <div class="tw-scrim" hidden></div><section class="tw-sheet" role="dialog" aria-modal="true" hidden>…</section>
// A close button inside the sheet carries data-sheet-close.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function openSheet(sheet) {
  const scrim = sheet.previousElementSibling?.classList.contains('tw-scrim') ? sheet.previousElementSibling : null;
  const opener = document.activeElement;

  const close = () => {
    sheet.hidden = true;
    if (scrim) scrim.hidden = true;
    document.removeEventListener('keydown', onKey);
    scrim?.removeEventListener('click', close);
    sheet.querySelectorAll('[data-sheet-close]').forEach((b) => b.removeEventListener('click', close));
    document.body.style.overflow = '';
    if (opener instanceof HTMLElement) opener.focus();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...sheet.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (scrim) scrim.hidden = false;
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  scrim?.addEventListener('click', close);
  sheet.querySelectorAll('[data-sheet-close]').forEach((b) => b.addEventListener('click', close));
  (sheet.querySelector('input, select, textarea') || sheet.querySelector(FOCUSABLE))?.focus();
  return close;
}
