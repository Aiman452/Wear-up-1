// Drag-to-turn rack of suits on the home page.
// Works by mouse drag, finger swipe, arrow buttons and the left/right arrow keys.
// Without JavaScript the suits show as a simple scrolling row of links.
(function () {
  'use strict';
  var rack = document.getElementById('rack');
  if (!rack) return;

  var items = Array.prototype.slice.call(rack.querySelectorAll('.rack-item'));
  var links = items.map(function (li) { return li.querySelector('a'); });
  var ring = rack.querySelector('.rack-ring');
  var n = items.length;
  if (!n) return;
  var step = 360 / n;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var nameEl = document.getElementById('rack-name');
  var colourEl = document.getElementById('rack-colour');
  var idxEl = document.getElementById('rack-index');
  var viewEl = document.getElementById('rack-view');
  var waEl = document.getElementById('rack-wa');
  var dotEl = document.getElementById('rack-dot');
  var waNum = String((window.WEARUP_CONFIG || {}).whatsapp || '');

  var cur = 0, target = 0;            // rotation in degrees (current, wanted)
  var W = 0, R = 0, iw = 0, ringY = 34, ry = 16;
  var selected = -1, raf = 0;
  var dragging = false, moved = 0, startX = 0, startTarget = 0, lastX = 0, lastT = 0, vel = 0;
  var userActed = false, paused = false, visible = true;

  function layout() {
    W = rack.clientWidth || 600;
    iw = Math.max(140, Math.min(250, W * 0.34));
    R = Math.min(W * 0.36, 260);
    ry = Math.max(14, iw * 0.085);
    rack.style.setProperty('--iw', iw + 'px');
    rack.style.height = Math.round(ringY + ry + iw * 1.667 + 56) + 'px';
    if (ring) {
      ring.style.width = Math.round(2 * R) + 'px';
      ring.style.height = Math.round(2 * ry) + 'px';
      ring.style.left = Math.round(W / 2 - R) + 'px';
      ring.style.top = Math.round(ringY - ry) + 'px';
    }
  }

  function render() {
    for (var i = 0; i < n; i++) {
      var a = (i * step + cur) * Math.PI / 180;
      var s = Math.sin(a), c = Math.cos(a);
      var t = (c + 1) / 2;                        // 1 = front, 0 = back
      var el = items[i];
      el.style.transform = 'translate3d(' + (s * R).toFixed(1) + 'px,' + (ringY + c * ry).toFixed(1) + 'px,0) scale(' + (0.6 + 0.4 * t).toFixed(3) + ')';
      el.style.opacity = (0.3 + 0.7 * Math.pow(t, 0.7)).toFixed(3);
      el.style.zIndex = String(Math.round(t * 100));
      el.style.pointerEvents = c > -0.25 ? 'auto' : 'none';
    }
  }

  function currentIndex() {
    return ((Math.round(-target / step) % n) + n) % n;
  }

  function updatePanel() {
    var i = currentIndex();
    if (i === selected) return;
    selected = i;
    var a = links[i];
    var name = a.getAttribute('data-name'), colour = a.getAttribute('data-colour');
    nameEl.textContent = name;
    colourEl.textContent = colour + ' · Unstitched 3-piece suit';
    idxEl.textContent = String(i + 1);
    viewEl.setAttribute('href', a.getAttribute('href'));
    dotEl.className = 'dot sw-' + a.getAttribute('data-key');
    if (waEl && /^\d{8,15}$/.test(waNum)) {
      waEl.setAttribute('href', 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('Hello WearUp by Aiman, I am interested in the ' + name + ' suit in ' + colour + '.'));
      waEl.setAttribute('target', '_blank');
      waEl.setAttribute('rel', 'noopener');
      waEl.hidden = false;
    }
    links.forEach(function (l, k) { l.tabIndex = k === i ? 0 : -1; });
  }

  function tick() {
    raf = 0;
    if (reduce) cur = target; else cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.02) cur = target;
    render();
    updatePanel();
    if (cur !== target || dragging) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  function snap(v) { return Math.round(v / step) * step; }
  function go(delta) { target = snap(target) + delta * step; kick(); }
  function goTo(idx) {
    var base = -idx * step;
    target = base + Math.round((target - base) / 360) * 360;
    kick();
  }

  // ----- drag / swipe -----
  rack.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest && e.target.closest('.rack-btn')) return;
    dragging = true; moved = 0; startX = lastX = e.clientX; startTarget = target; lastT = e.timeStamp; vel = 0;
    userActed = true;
    rack.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    var prev = target;
    target = startTarget + dx * (200 / W);
    var dt = Math.max(e.timeStamp - lastT, 1);
    vel = 0.8 * vel + 0.2 * ((target - prev) / dt);   // degrees per millisecond
    lastT = e.timeStamp; lastX = e.clientX;
    kick();
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    rack.classList.remove('dragging');
    var extra = Math.max(-2 * step, Math.min(2 * step, vel * 160));
    target = snap(target + extra);
    kick();
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // click: a drag never opens a suit; clicking a side suit turns it to the front; clicking the front suit opens it
  rack.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.rack-item a');
    if (!a) return;
    if (moved > 6) { e.preventDefault(); moved = 0; return; }
    var i = links.indexOf(a);
    if (i !== currentIndex()) { e.preventDefault(); userActed = true; goTo(i); }
  });

  // ----- buttons and keyboard -----
  rack.querySelector('.rack-btn.prev').addEventListener('click', function () { userActed = true; go(1); });
  rack.querySelector('.rack-btn.next').addEventListener('click', function () { userActed = true; go(-1); });
  rack.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); userActed = true; go(1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); userActed = true; go(-1); }
  });

  // ----- gentle auto-turn until the visitor interacts -----
  rack.addEventListener('mouseenter', function () { paused = true; });
  rack.addEventListener('mouseleave', function () { paused = false; });
  rack.addEventListener('focusin', function () { paused = true; });
  rack.addEventListener('focusout', function () { paused = false; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.3 }).observe(rack);
  }
  if (!reduce) {
    setInterval(function () {
      if (userActed || paused || !visible || document.hidden || dragging) return;
      go(-1);
    }, 3800);
  }

  window.addEventListener('resize', function () { layout(); render(); });

  rack.classList.add('rack--on');
  layout();
  render();
  updatePanel();
})();
