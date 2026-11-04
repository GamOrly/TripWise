// Shared UI behaviour: Toast and Bottom sheet, built on the design system's tw- classes.

import { icon } from './icons.js';

// ---------- Toast ----------

let toastTimer = null;

// showToast('Trip saved to My Trips', { action: { text: 'Open', href: 'trip.html?id=…' } })
// An action with `onClick` instead of `href` is a button (for example Undo); it closes the Toast.
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
  if (action?.onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tw-toast__action';
    button.textContent = action.text;
    button.addEventListener('click', () => {
      clearTimeout(toastTimer);
      toast.remove();
      action.onClick();
    });
    toast.appendChild(button);
  } else if (action) {
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

// ---------- Fit a portrait screen to the window ----------
// The screen keeps its phone layout and shrinks to the window's height instead of scrolling.
// The page's CSS applies it with `zoom: var(--fit, 1)`. `computerOnly`: on touch devices it stays full size.
// `observe`: elements whose size changes with the content (fields, messages), so the screen refits.

export function fitToWindow(page, { computerOnly = false, observe = [] } = {}) {
  const computer = matchMedia('(hover: hover) and (pointer: fine)');
  // The height the screen takes on the window at a given scale, without stretching to fill it.
  const heightAt = (scale) => {
    page.style.setProperty('--fit', String(scale));
    return page.getBoundingClientRect().height;
  };
  const fit = () => {
    page.style.minHeight = '0';
    // One pixel of slack, so rounding never adds a scrollbar.
    const room = window.innerHeight - 1;
    let scale = 1;
    const fitting = !(computerOnly && !computer.matches);
    // The screen always fits, so no scrollbar: one showing up mid-measure would narrow the page and change the wrapping.
    document.documentElement.style.overflowY = fitting ? 'hidden' : '';
    if (fitting) {
      scale = Math.min(1, room / heightAt(1));
      // A smaller screen is also wider, so text wraps less and it gets shorter:
      // search for the largest scale that still fits (text wrapping makes the height jump, so no formula).
      let lo = scale;
      let hi = Math.min(1, (scale * room) / heightAt(scale));
      for (let i = 0; i < 7 && hi - lo > 0.005; i++) {
        const mid = (lo + hi) / 2;
        if (heightAt(mid) <= room) lo = mid;
        else hi = mid;
      }
      scale = heightAt(hi) <= room ? hi : lo;
    }
    page.style.setProperty('--fit', String(scale));
    page.style.minHeight = `${Math.floor(room / scale)}px`;
  };
  fit();
  const sizes = new ResizeObserver(() => fit());
  observe.forEach((el) => sizes.observe(el));
  window.addEventListener('resize', fit);
  computer.addEventListener('change', fit);
}

// ---------- Bottom sheet ----------
// Markup in the page: <div class="tw-scrim" hidden></div><section class="tw-sheet" role="dialog" aria-modal="true" hidden>…</section>
// A close button inside the sheet carries data-sheet-close.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// returnFocus: what gets focus when the sheet closes (default: whatever had it when the sheet opened).
// beforeClose: called when the owner closes the sheet (Esc, the scrim, a close button); returning false keeps it open.
// The function returned closes the sheet without asking.
export function openSheet(sheet, { returnFocus, beforeClose } = {}) {
  const scrim = sheet.previousElementSibling?.classList.contains('tw-scrim') ? sheet.previousElementSibling : null;
  const opener = returnFocus || document.activeElement;

  const close = () => {
    if (sheet.hidden) return;
    sheet.hidden = true;
    if (scrim) scrim.hidden = true;
    document.removeEventListener('keydown', onKey);
    scrim?.removeEventListener('click', tryClose);
    sheet.querySelectorAll('[data-sheet-close]').forEach((b) => b.removeEventListener('click', tryClose));
    document.body.style.overflow = '';
    if (opener instanceof HTMLElement) opener.focus();
  };
  const tryClose = () => {
    if (beforeClose?.() === false) return;
    close();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      tryClose();
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

  // On a computer the sheet opens in the middle of the window, where it was designed to start.
  sheet.style.removeProperty('--dx');
  sheet.style.removeProperty('--dy');
  if (scrim) scrim.hidden = false;
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  scrim?.addEventListener('click', tryClose);
  sheet.querySelectorAll('[data-sheet-close]').forEach((b) => b.addEventListener('click', tryClose));
  (sheet.querySelector('input, select, textarea') || sheet.querySelector(FOCUSABLE))?.focus();
  return close;
}

// ---------- Moving a sheet (computer) ----------
// On a wide window a sheet is a dialog in the middle of the screen (app.css). Its head is a handle: dragging it
// moves the dialog anywhere in the window. The buttons in the head (Close) still work as buttons.

const wide = matchMedia('(min-width: 900px)');

document.addEventListener('pointerdown', (e) => {
  const head = e.target.closest('.tw-sheet__head');
  if (!head || !wide.matches || e.button !== 0 || e.target.closest('button, a, input')) return;
  const sheet = head.closest('.tw-sheet');
  const start = { x: e.clientX, y: e.clientY };
  const from = {
    x: parseFloat(sheet.style.getPropertyValue('--dx')) || 0,
    y: parseFloat(sheet.style.getPropertyValue('--dy')) || 0,
  };
  const box = sheet.getBoundingClientRect();
  // How far it may go: the whole title stays inside the window.
  const room = {
    left: -box.left + from.x, right: innerWidth - box.right + from.x,
    up: -box.top + from.y, down: innerHeight - box.top - head.offsetHeight - 16 + from.y,
  };
  head.setPointerCapture(e.pointerId);
  sheet.classList.add('is-dragging');
  const move = (ev) => {
    const x = Math.min(room.right, Math.max(room.left, from.x + ev.clientX - start.x));
    const y = Math.min(room.down, Math.max(room.up, from.y + ev.clientY - start.y));
    sheet.style.setProperty('--dx', `${x}px`);
    sheet.style.setProperty('--dy', `${y}px`);
  };
  const stop = () => {
    sheet.classList.remove('is-dragging');
    head.removeEventListener('pointermove', move);
    head.removeEventListener('pointerup', stop);
    head.removeEventListener('pointercancel', stop);
  };
  head.addEventListener('pointermove', move);
  head.addEventListener('pointerup', stop);
  head.addEventListener('pointercancel', stop);
  e.preventDefault();
});
