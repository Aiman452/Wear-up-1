(function () {
  'use strict';
  var dataEl = document.getElementById('design-data');
  if (!dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  var cfg = window.WEARUP_CONFIG || {};
  var mainImg = document.getElementById('main-img');
  var thumbs = document.getElementById('thumbs');
  var colourName = document.getElementById('colour-name');
  var summary = document.getElementById('order-summary');
  var current = D.colours[0];
  var photoIndex = 0;

  function colourByKey(k) { for (var i = 0; i < D.colours.length; i++) if (D.colours[i].key === k) return D.colours[i]; return null; }

  function showPhoto(i) {
    photoIndex = i;
    var p = current.photos[i];
    mainImg.src = p.full; mainImg.alt = p.alt;
    var note = document.getElementById('photo-note');
    if (note) { note.textContent = p.note || ''; note.hidden = !p.note; }
    var w = p.ratio.split('x'); mainImg.width = +w[0]; mainImg.height = +w[1];
    Array.prototype.forEach.call(thumbs.children, function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
  }

  function buildThumbs() {
    thumbs.textContent = '';
    thumbs.hidden = current.photos.length < 2;
    current.photos.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'thumb'; b.setAttribute('aria-label', 'Show photo ' + (i + 1));
      var im = document.createElement('img'); im.src = p.thumb; im.alt = ''; im.width = 100; im.height = 125;
      b.appendChild(im); b.addEventListener('click', function () { showPhoto(i); });
      thumbs.appendChild(b);
    });
  }

  function updateSummary() {
    var q = document.getElementById('o-qty').value || '1';
    summary.textContent = D.name + ', ' + current.name + ', ' + q + (q === '1' ? ' suit' : ' suits');
    var wa = document.getElementById('wa-link');
    if (cfg.whatsapp && /^\d{8,15}$/.test(cfg.whatsapp)) {
      wa.hidden = false;
      wa.href = 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent('Hello WearUp by Aiman, I want to order: ' + summary.textContent + '. ' + location.origin + location.pathname + '?colour=' + current.key);
      wa.target = '_blank'; wa.rel = 'noopener';
    }
  }

  function setColour(key, push) {
    var c = colourByKey(key); if (!c) return;
    current = c; colourName.textContent = c.name;
    Array.prototype.forEach.call(document.querySelectorAll('.swatch'), function (s) { s.setAttribute('aria-pressed', s.getAttribute('data-colour') === key ? 'true' : 'false'); });
    buildThumbs(); showPhoto(0); updateSummary();
    if (push) { try { history.replaceState(null, '', '?colour=' + key); } catch (e) {} }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.swatch'), function (s) {
    s.addEventListener('click', function () { setColour(s.getAttribute('data-colour'), true); });
  });
  Array.prototype.forEach.call(thumbs.children, function (b, i) { b.addEventListener('click', function () { showPhoto(i); }); });

  var q = new URLSearchParams(location.search).get('colour');
  if (q && colourByKey(q)) setColour(q, false); else updateSummary();

  /* ---------- Order form ---------- */
  var openBtn = document.getElementById('order-open');
  var form = document.getElementById('order-form');
  var status = document.getElementById('order-status');
  var started = Date.now();
  openBtn.addEventListener('click', function () {
    form.hidden = false; openBtn.setAttribute('aria-expanded', 'true');
    updateSummary(); started = Date.now();
    document.getElementById('order-panel').focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('o-qty').addEventListener('input', updateSummary);

  function setErr(id, msg) {
    var f = document.getElementById(id), e = document.getElementById(id + '-err');
    if (e) e.textContent = msg || '';
    if (f) f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  function validate() {
    var ok = true, v = function (id) { return document.getElementById(id).value.trim(); };
    var qty = parseInt(v('o-qty'), 10);
    ok = setErr('o-name', v('o-name').length < 2 ? 'Please enter your name.' : '') && ok;
    ok = setErr('o-phone', !/^[+0-9\s\-()]{7,18}$/.test(v('o-phone')) ? 'Enter a valid phone number, for example 0300 1234567.' : '') && ok;
    ok = setErr('o-city', v('o-city').length < 2 ? 'Please enter your city.' : '') && ok;
    ok = setErr('o-address', v('o-address').length < 8 ? 'Please enter your full delivery address.' : '') && ok;
    ok = setErr('o-qty', !(qty >= 1 && qty <= 10) ? 'Choose a number from 1 to 10.' : '') && ok;
    return ok;
  }
  ['o-name', 'o-phone', 'o-city', 'o-address', 'o-qty'].forEach(function (id) { document.getElementById(id).addEventListener('blur', validate); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    status.className = 'status'; status.textContent = '';
    if (!validate()) { var bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    if (form.elements.namedItem('website').value || Date.now() - started < 3000) { status.className = 'status bad'; status.textContent = 'Please wait a moment and try again.'; return; }
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    var g = function (id) { return document.getElementById(id).value.trim(); };
    fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'order', design: D.name, colour: current.name, qty: parseInt(g('o-qty'), 10),
        name: g('o-name'), phone: g('o-phone'), city: g('o-city'), address: g('o-address'), notes: g('o-notes'),
        website: form.elements.namedItem('website').value, elapsed: Date.now() - started })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { status.className = 'status ok'; status.textContent = 'Thank you! We received your order request and will contact you soon to confirm price and delivery.'; form.reset(); document.getElementById('o-qty').value = 1; updateSummary(); started = Date.now(); }
        else { status.className = 'status bad'; status.textContent = res.j.error || 'Something went wrong. Please try again.'; }
      })
      .catch(function () { status.className = 'status bad'; status.textContent = 'Network error. Please try again.'; })
      .finally(function () { btn.disabled = false; btn.textContent = 'Place order request'; });
  });
})();
