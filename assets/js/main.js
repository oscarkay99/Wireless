import { initMobileMenu }                                     from './menu.js';
import { initDeviceToggle, initIssueToggle, initBookingForm } from './form.js';
import { initChatbot }                                        from './chatbot.js';
import { initAuth }                                           from './auth.js';

function initParallax() {
  const heroBg = document.getElementById('hero-bg');
  window.addEventListener('scroll', () => {
    if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
  }, { passive: true });
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

function initCountUp() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);

      const target   = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0');
      const useComma = el.hasAttribute('data-comma');
      const suffix   = el.dataset.suffix || '';
      const valEl    = el.querySelector('.cu-val') || el;
      const duration = 1600;
      const startTs  = performance.now();

      function fmt(n) {
        if (decimals > 0) {
          const s = n.toFixed(decimals);
          return useComma
            ? parseFloat(s).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            : s;
        }
        const v = Math.floor(n);
        return useComma ? v.toLocaleString('en-US') : String(v);
      }

      function tick(now) {
        const p = Math.min((now - startTs) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        valEl.textContent = fmt(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else valEl.textContent = fmt(target) + suffix;
      }

      requestAnimationFrame(tick);
    });
  }, { threshold: 0.15 });

  els.forEach(el => io.observe(el));
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      if (hash.length < 2) return;
      const target = document.querySelector(hash);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initParallax();
  initMobileMenu();
  initDeviceToggle();
  initIssueToggle();
  initBookingForm();
  initScrollReveal();
  initSmoothScroll();
  initChatbot();
  initAuth();
  initCountUp();
});
