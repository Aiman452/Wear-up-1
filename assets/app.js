(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  var btn = document.querySelector('.menu-btn');
  var list = document.getElementById('primary-nav');
  if (btn && list) {
    btn.addEventListener('click', function () {
      var open = list.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---------- Cookie consent + analytics (loaded only after Accept) ---------- */
  var CONSENT_NAME = 'wearup_consent';
  function getConsent() { try { return localStorage.getItem(CONSENT_NAME); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_NAME, v); } catch (e) {} }

  function loadAnalytics() {
    if (document.getElementById('va-script')) return;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    var s = document.createElement('script');
    s.id = 'va-script'; s.defer = true; s.src = '/_vercel/insights/script.js';
    document.head.appendChild(s);
  }

  var banner = document.getElementById('cookie-banner');
  var consent = getConsent();
  if (consent === 'accepted') loadAnalytics();
  if (!consent && banner) banner.classList.add('show');
  if (banner) {
    banner.querySelector('[data-accept]').addEventListener('click', function () {
      setConsent('accepted'); banner.classList.remove('show'); loadAnalytics();
    });
    banner.querySelector('[data-decline]').addEventListener('click', function () {
      setConsent('declined'); banner.classList.remove('show');
    });
  }
  var manage = document.querySelectorAll('[data-cookie-settings]');
  Array.prototype.forEach.call(manage, function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); if (banner) banner.classList.add('show'); });
  });

  /* ---------- Contact form: validation + spam protection ---------- */
  var waHome = document.getElementById('wa-home');
  var waNum = (window.WEARUP_CONFIG || {}).whatsapp || '';
  if (waHome && /^\d{8,15}$/.test(waNum)) {
    waHome.href = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('Hello WearUp by Aiman, I would like to order a winter suit.');
    waHome.target = '_blank'; waHome.rel = 'noopener'; waHome.hidden = false;
  }

  var form = document.getElementById('contact-form');
  if (!form) return;
  var started = Date.now();
  var status = document.getElementById('form-status');

  function setErr(id, msg) {
    var f = document.getElementById(id), e = document.getElementById(id + '-err');
    if (e) e.textContent = msg || '';
    if (f) f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  function validate() {
    var name = form.elements.namedItem('name').value.trim(), email = form.elements.namedItem('email').value.trim(),
        phone = form.elements.namedItem('phone').value.trim(), msg = form.elements.namedItem('message').value.trim();
    var ok = true;
    ok = setErr('name', name.length < 2 ? 'Please enter your name.' : '') && ok;
    ok = setErr('email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? 'Please enter a valid email address.' : '') && ok;
    ok = setErr('phone', phone && !/^[+0-9\s\-()]{7,18}$/.test(phone) ? 'Enter a valid phone number or leave it blank.' : '') && ok;
    ok = setErr('message', msg.length < 10 ? 'Please write at least 10 characters.' : (msg.length > 1500 ? 'Message is too long (max 1500).' : '')) && ok;
    return ok;
  }
  ['name', 'email', 'phone', 'message'].forEach(function (id) {
    document.getElementById(id).addEventListener('blur', validate);
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    status.className = 'status'; status.textContent = '';
    if (!validate()) { var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    // Bot checks: honeypot must be empty, and humans take more than 3 seconds
    if (form.elements.namedItem('website').value || Date.now() - started < 3000) {
      status.className = 'status bad'; status.textContent = 'Please wait a moment and try again.'; return;
    }
    var submit = form.querySelector('button[type=submit]');
    submit.disabled = true; submit.textContent = 'Sending…';
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.elements.namedItem('name').value.trim(), email: form.elements.namedItem('email').value.trim(),
        phone: form.elements.namedItem('phone').value.trim(), message: form.elements.namedItem('message').value.trim(),
        website: form.elements.namedItem('website').value, elapsed: Date.now() - started
      })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { status.className = 'status ok'; status.textContent = 'Thank you! We will reply to you soon.'; form.reset(); started = Date.now(); }
        else { status.className = 'status bad'; status.textContent = res.j.error || 'Something went wrong. Please try again.'; }
      })
      .catch(function () { status.className = 'status bad'; status.textContent = 'Network error. Please try again.'; })
      .finally(function () { submit.disabled = false; submit.textContent = 'Send message'; });
  });
})();
