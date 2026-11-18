const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const modals = {
  welcome: $('#welcomeModal'),
  preview: $('#previewModal'),
  gift: $('#giftModal'),
  message: $('#messageModal')
};
let toastTimer;
let lastFocused = null;

function openModal(name) {
  const modal = modals[name];
  if (!modal) return;
  lastFocused = document.activeElement;
  Object.values(modals).forEach(item => item.classList.remove('active'));
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  const focusTarget = $('button, input, a', modal);
  if (focusTarget) setTimeout(() => focusTarget.focus(), 80);
  $('#floatMenu').classList.remove('open');
  $('#floatMenu').setAttribute('aria-hidden', 'true');
}

function closeModals() {
  Object.values(modals).forEach(item => {
    item.classList.remove('active');
    item.setAttribute('aria-hidden', 'true');
  });
  document.body.classList.remove('modal-open');
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

function showToast(message) {
  $('#toastText').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3200);
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-open-preview], [data-open-gift], [data-open-message]');
  if (trigger) {
    if (trigger.hasAttribute('data-open-preview')) openModal('preview');
    if (trigger.hasAttribute('data-open-gift')) openModal('gift');
    if (trigger.hasAttribute('data-open-message')) openModal('message');
  }
  if (event.target.closest('[data-close-modal]')) closeModals();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModals();
});

$('#floatLauncher').addEventListener('click', () => {
  const menu = $('#floatMenu');
  const isOpen = menu.classList.toggle('open');
  menu.setAttribute('aria-hidden', String(!isOpen));
  $('#floatLauncher .launcher-plus').textContent = isOpen ? '×' : '+';
});

$('#mobileMenu').addEventListener('click', () => $('.main-nav').classList.toggle('open'));
$$('.main-nav a').forEach(link => link.addEventListener('click', () => $('.main-nav').classList.remove('open')));

// Reveal content progressively as it enters the viewport.
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach(element => revealObserver.observe(element));

// A welcome invitation, shown once per browser session.
if (!sessionStorage.getItem('047-welcome-seen')) {
  setTimeout(() => {
    if (!document.body.classList.contains('modal-open')) openModal('welcome');
    sessionStorage.setItem('047-welcome-seen', '1');
  }, 2600);
}

// Keep the year current without a manual edit.
$('#year').textContent = new Date().getFullYear();

// Redeem a private gift code. The code list and the full PDF address stay server-side.
$('#giftForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#giftCode');
  const message = $('#giftMessage');
  const button = $('#giftSubmit');
  const code = input.value.trim();
  if (!code) return;

  button.disabled = true;
  button.textContent = 'جارٍ التحقق...';
  message.textContent = '';

  try {
    const response = await fetch('/.netlify/functions/redeem-gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.redirect) {
      message.textContent = data.message || 'تعذر قبول الرمز. تحقق منه أو تواصل مع المؤلف.';
      return;
    }
    message.textContent = 'تم قبول الرمز. سيتم فتح النسخة الكاملة الآن...';
    showToast('تم تفعيل رمز الدعوة بنجاح.');
    setTimeout(() => { window.location.href = data.redirect; }, 700);
  } catch (error) {
    message.textContent = 'تعذر الاتصال بالخادم. جرّب مرة أخرى بعد قليل.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'تحقق من الرمز <span>↗</span>';
  }
});
