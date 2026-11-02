// Sign in (screens 01, 17, 18): email only, validated before the sign-in link is "sent".

import { sendSignInLink, completeSignIn, getSession } from '../data.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Common providers, for the "Did you mean …?" hint. Nothing is checked against real accounts,
// so the hint never reveals who has access.
const DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com',
  'aol.com', 'msn.com', 'protonmail.com', 'walla.co.il', 'walla.com',
  // Real domains close to the ones above, so they never get a hint.
  'mail.com', 'ymail.com', 'gmx.com', 'me.com', 'mac.com'];

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

// 'orly@gmial.com' → 'orly@gmail.com'; null when the domain is known or not close to one.
function suggestEmail(value) {
  const at = value.lastIndexOf('@');
  const domain = value.slice(at + 1).toLowerCase();
  if (DOMAINS.includes(domain)) return null;
  let best = null;
  // Short domains allow one typo, longer ones two.
  let bestDistance = domain.length > 7 ? 3 : 2;
  for (const d of DOMAINS) {
    const distance = editDistance(domain, d);
    if (distance < bestDistance) {
      best = d;
      bestDistance = distance;
    }
  }
  return best && `${value.slice(0, at)}@${best}`;
}

const form = document.getElementById('signin-form');
const field = document.getElementById('email-field');
const input = document.getElementById('email');
const error = document.getElementById('email-error');
const errorText = document.getElementById('email-error-text');
const sent = document.getElementById('signin-sent');
const sentEmail = document.getElementById('sent-email');
const sentTitle = document.getElementById('sent-title');
const hint = document.getElementById('email-hint');
const hintBtn = document.getElementById('email-hint-btn');

let email = '';
// The value the hint was last shown for: sending it again unchanged means "yes, I meant it".
let hintedFor = '';

// Already signed in: go straight to My Trips.
if (await getSession()) location.replace('index.html');

function showError(message) {
  errorText.textContent = message;
  error.hidden = false;
  field.classList.add('is-error');
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', 'email-error');
  input.focus();
}

function clearError() {
  if (error.hidden) return;
  error.hidden = true;
  field.classList.remove('is-error');
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}

function hideHint() {
  hint.hidden = true;
}

input.addEventListener('input', () => {
  clearError();
  hideHint();
});

hintBtn.addEventListener('click', () => {
  input.value = hintBtn.textContent;
  hideHint();
  input.focus();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return showError('Enter your email address.');
  if (!EMAIL.test(value)) return showError('Enter a valid email address, like you@example.com.');

  const suggestion = suggestEmail(value);
  if (suggestion && hintedFor !== value) {
    hintedFor = value;
    hintBtn.textContent = suggestion;
    hint.hidden = false;
    return;
  }
  hideHint();

  email = value;
  await sendSignInLink(email);
  sentEmail.textContent = email;
  form.hidden = true;
  sent.hidden = false;
  sentTitle.focus();
});

document.getElementById('different-email').addEventListener('click', () => {
  sent.hidden = true;
  form.hidden = false;
  input.focus();
  input.select();
});

document.getElementById('open-link').addEventListener('click', async () => {
  await completeSignIn(email);
  location.href = 'index.html';
});
