/* Shivaliva site behaviour, shared by every page. Plain JS, no dependencies.
   Everything here is an enhancement: with scripts off the page still reads top to bottom,
   every link works and every video has its own controls or poster. */
(function () {
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---- top bar: a hairline once the page moves ---- */
  var bar = document.querySelector(".topbar");
  if (bar) {
    var onScroll = function () { bar.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- the phone menu ---- */
  var menuBtn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (menuBtn && nav) {
    var setOpen = function (on) {
      menuBtn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) nav.setAttribute("data-open", ""); else nav.removeAttribute("data-open");
    };
    menuBtn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(menuBtn.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", function (e) { if (!nav.contains(e.target) && !menuBtn.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setOpen(false); menuBtn.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth >= 960) setOpen(false); });
  }

  /* ---- the gem marks the section you are reading ---- */
  if (nav && hasIO) {
    var links = {}, ids = [];
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { var id = a.getAttribute("href").slice(1); links[id] = a; ids.push(id); });
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestR = 0;
      ids.forEach(function (id) { if ((visible[id] || 0) > bestR) { bestR = visible[id]; best = id; } });
      ids.forEach(function (id) { if (id === best) links[id].setAttribute("aria-current", "true"); else links[id].removeAttribute("aria-current"); });
    }, { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] });
    ids.forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---- reveal on scroll: children of [data-stagger] arrive one after another ---- */
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (el, i) { el.classList.add("reveal"); el.style.setProperty("--i", Math.min(i, 8)); });
  });
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !hasIO) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  /* ---- clips: a tile's clip loads on first use and plays on hover (mouse) or while in view (touch) ---- */
  function prime(v) { if (!v.src && v.dataset.src) { v.src = v.dataset.src; } }
  function playClip(tile, v) { prime(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); tile.classList.add("playing"); }
  function stopClip(tile, v, rewind) { v.pause(); if (rewind) { try { v.currentTime = 0; } catch (e) {} } tile.classList.remove("playing"); }
  if (!reduce) {
    var tiles = document.querySelectorAll(".tile[data-clip]");
    if (canHover) {
      tiles.forEach(function (t) {
        var v = t.querySelector("video");
        t.addEventListener("mouseenter", function () { playClip(t, v); });
        t.addEventListener("mouseleave", function () { stopClip(t, v, true); });
        t.addEventListener("focusin", function () { playClip(t, v); });
        t.addEventListener("focusout", function () { stopClip(t, v, true); });
      });
    } else if (hasIO) {
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { var v = en.target.querySelector("video"); if (en.intersectionRatio >= 0.6) playClip(en.target, v); else stopClip(en.target, v, false); });
      }, { threshold: [0, 0.6, 1] });
      tiles.forEach(function (t) { tio.observe(t); });
    }
  }

  /* ---- ambient loops (the hero, the walk into the tavern): play only while on screen ---- */
  var loops = document.querySelectorAll("video[data-loop]");
  if (reduce) {
    loops.forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  } else if (hasIO) {
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { var v = en.target; if (en.isIntersecting) { prime(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { rootMargin: "120px 0px" });
    loops.forEach(function (v) { lio.observe(v); });
  }

  /* ---- the trailer: opens in a player over the page, with sound. A self-hosted <video> or a YouTube <iframe>;
         either way nothing loads until someone asks for it, and closing the player stops it. ---- */
  var tDlg = document.getElementById("trailer");
  if (tDlg && tDlg.showModal) {
    var tVid = tDlg.querySelector("video"), tFrame = tDlg.querySelector("iframe");
    var startT = function () {
      if (tVid) { prime(tVid); var p = tVid.play(); if (p && p.catch) p.catch(function () {}); }
      if (tFrame && tFrame.dataset.src) tFrame.src = tFrame.dataset.src;
    };
    var stopT = function () {
      if (tVid) tVid.pause();
      if (tFrame) tFrame.removeAttribute("src");
    };
    document.querySelectorAll("[data-trailer]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); tDlg.showModal(); document.body.classList.add("locked"); startT(); });
    });
    var closeT = function () { stopT(); if (tDlg.open) tDlg.close(); };
    tDlg.addEventListener("close", function () { stopT(); document.body.classList.remove("locked"); });
    tDlg.addEventListener("click", function (e) { if (e.target === tDlg) closeT(); });
    var tx = tDlg.querySelector(".x"); if (tx) tx.addEventListener("click", closeT);
  }

  /* ---- screenshots: a lightbox with arrows, swipe-free, keyboard-ready ---- */
  var lb = document.getElementById("lightbox");
  var shots = document.querySelectorAll("a.shot");
  if (lb && lb.showModal && shots.length) {
    var img = lb.querySelector("img"), cap = lb.querySelector("figcaption"), cur = 0;
    var show = function (i, animate) {
      cur = (i + shots.length) % shots.length;
      var a = shots[cur], alt = a.querySelector("img").alt;
      var set = function () { img.src = a.getAttribute("href"); img.alt = alt; cap.textContent = alt + " (" + (cur + 1) + " of " + shots.length + ")"; };
      if (animate && !reduce) { img.classList.add("swap"); setTimeout(function () { set(); img.onload = function () { img.classList.remove("swap"); }; }, 180); }
      else set();
    };
    shots.forEach(function (a, i) {
      a.addEventListener("click", function (e) { e.preventDefault(); show(i, false); lb.showModal(); lb.classList.add("open"); document.body.classList.add("locked"); });
    });
    var closeL = function () { lb.classList.remove("open"); if (lb.open) lb.close(); };
    lb.addEventListener("close", function () { lb.classList.remove("open"); document.body.classList.remove("locked"); img.removeAttribute("src"); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "FIGURE") closeL(); });
    lb.querySelector(".x").addEventListener("click", closeL);
    lb.querySelector(".prev").addEventListener("click", function () { show(cur - 1, true); });
    lb.querySelector(".next").addEventListener("click", function () { show(cur + 1, true); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1, true); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1, true); }
    });
  }

  /* ---- copy link ---- */
  document.querySelectorAll("button[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var url = b.getAttribute("data-copy"), label = b.textContent;
      var done = function (ok) { b.textContent = ok ? "Copied" : "Copy failed"; setTimeout(function () { b.textContent = label; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else window.prompt("Copy this link", url);
    });
  });
})();
