(function () {
  "use strict";
  document.documentElement.classList.add("js");

  // ---- Config -------------------------------------------------------------
  // Countdown target: Carnival Lunch, 27 Jan 2027, 1:00 PM IST.
  var TARGET = new Date("2027-01-27T13:00:00+05:30").getTime();

  // Who to call: names and roles only. Phone numbers are never in this public
  // file; the backend sends them (Script Property CONTACTS) only when the page
  // was opened with a valid invite key.
  var CONTACTS = [
    { name: "Sunil Kumar Saxena", role: "Groom’s father", phone: "" },
    { name: "Sarita Saxena", role: "Groom’s mother", phone: "" },
    { name: "Vedika", role: "RSVP co-ordinator", phone: "" }
  ];

  // RSVPs and ID proofs go to the Google Apps Script web app in
  // apps-script/Code.gs (bound to your Google Sheet). Paste its /exec URL here.
  // README.md has the setup steps. The endpoint is public by design; the
  // invite key (below) is what the backend checks before writing anything.
  var RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbzT3MY-dKOSyeDIjQYagQneUvLXE8ll748rphP5smxAO8LdLqg8IsRiVV9NG9fKwXGy/exec";
  var STORE_KEY = "sa-wedding-invite-rsvps";

  // The invite link carries a key (?k=...). The backend refuses any request
  // without it, so only people who received the invitation can reply. The key
  // is kept in this browser and removed from the address bar.
  var INVITE_KEY = (function () {
    var KEY_STORE = "sa-invite-key";
    var fromUrl = new URLSearchParams(location.search).get("k");
    if (fromUrl && /^[A-Za-z0-9_-]{16,64}$/.test(fromUrl)) {
      try { localStorage.setItem(KEY_STORE, fromUrl); } catch (e) {}
      try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
      return fromUrl;
    }
    try { return localStorage.getItem(KEY_STORE) || ""; } catch (e) { return ""; }
  })();

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Lite mode for very low-memory phones or Data Saver: same design, less GPU work.
  var lite = (function () {
    var c = navigator.connection;
    if (c && c.saveData) return true;
    // Only genuinely low-end devices: core counts are capped or rounded by many
    // browsers (iPhones included), so they are not used as a signal.
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
    return false;
  })();
  if (lite) document.documentElement.classList.add("lite");
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---- Floating lanterns --------------------------------------------------
  function lanterns(host, count) {
    if (!host || reduceMotion) return;
    for (var i = 0; i < count; i++) {
      var l = document.createElement("span");
      l.className = "lantern";
      var s = rnd(.6, 1.2);
      l.style.left = rnd(2, 96) + "%";
      l.style.width = (16 * s) + "px";
      l.style.height = (22 * s) + "px";
      l.style.opacity = rnd(.45, .9).toFixed(2);
      l.style.animationDuration = rnd(24, 44) + "s";
      l.style.animationDelay = (-rnd(0, 40)) + "s";
      host.appendChild(l);
    }
  }
  lanterns(document.getElementById("sky"), lite ? 0 : 12);
  lanterns(document.getElementById("sky-intro"), lite ? 6 : 12);

  // The page covers the background sky except on mid-width screens, so stop
  // its lanterns when nobody can see them.
  function trimSky() {
    var sky = document.getElementById("sky");
    var visible = window.innerWidth > 480 && window.innerWidth < 760;
    sky.style.display = visible ? "" : "none";
  }
  trimSky();
  window.addEventListener("resize", trimSky);

  // Pause scene animations while they are off-screen.
  if ("IntersectionObserver" in window) {
    var pauser = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("paused", !e.isIntersecting); });
    }, { rootMargin: "120px 0px" });
    document.querySelectorAll(".ev-art, .hero, .families, .countdown, .contacts, footer").forEach(function (el) { pauser.observe(el); });
  }

  // ---- Stars in the engagement scene -----------------------------------------
  (function () {
    var g = document.getElementById("stars-eng");
    if (!g) return;
    for (var i = 0; i < 28; i++) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", rnd(0, 400).toFixed(1));
      c.setAttribute("cy", rnd(155, 300).toFixed(1));
      c.setAttribute("r", rnd(.5, 1.5).toFixed(2));
      c.setAttribute("fill", "#FFFFFF");
      if (i % 2) { c.setAttribute("class", "tw"); c.style.animationDelay = (-rnd(0, 3)).toFixed(2) + "s"; }
      g.appendChild(c);
    }
  })();

  // ---- Envelope -----------------------------------------------------------
  var intro = document.getElementById("intro");
  function lock(on) { document.documentElement.style.overflow = on ? "hidden" : ""; document.body.style.overflow = on ? "hidden" : ""; }
  var SEEN_KEY = "sa-envelope-opened";
  var seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) {}
  if (seen || location.hash) {
    intro.hidden = true;
  } else {
    lock(true);
    var sealBtn = document.getElementById("open-invite");
    try { sealBtn.focus({ preventScroll: true }); } catch (e) {}
    var opened = false;
    var openEnvelope = function () {
      if (opened) return;
      opened = true;
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
      lock(false);
      window.scrollTo(0, 0);
      intro.classList.add("is-open");
      setTimeout(function () { intro.hidden = true; window.dispatchEvent(new Event("scroll")); }, reduceMotion ? 50 : 1600);
    };
    sealBtn.addEventListener("click", openEnvelope);
    document.querySelector("#intro .env").addEventListener("click", openEnvelope);
    document.addEventListener("keydown", function (e) {
      if (!opened && (e.key === "Enter" || e.key === " " || e.key === "Escape")) { e.preventDefault(); openEnvelope(); }
    });
  }

  // ---- Reveal on scroll ---------------------------------------------------
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("in"); });
  }

  // ---- Letter language toggle ----------------------------------------------
  var langBtns = document.querySelectorAll(".lang-toggle button");
  var langLens = document.querySelector(".lang-toggle .lens");
  function placeLangLens() {
    var on = document.querySelector('.lang-toggle button[aria-pressed="true"]');
    if (!on || !langLens) return;
    langLens.style.width = on.offsetWidth + "px";
    langLens.style.transform = "translateX(" + on.offsetLeft + "px)";
  }
  placeLangLens();
  window.addEventListener("resize", placeLangLens);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeLangLens);
  langBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var en = b.getAttribute("data-lang") === "en";
      langBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      placeLangLens();
      // Both versions stay in the layout (stacked), so the card keeps one height.
      [["letter-hi", !en], ["await-hi", !en], ["letter-en", en], ["await-en", en]].forEach(function (p) {
        var el = document.getElementById(p[0]);
        el.classList.toggle("is-off", !p[1]);
        el.setAttribute("aria-hidden", String(!p[1]));
      });
    });
  });

  // ---- Section nav: show after the hero, highlight the current section ----
  var glide = function (el) { el.scrollIntoView(); };
  var typing = false;
  (function () {
    var nav = document.getElementById("section-nav");
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var hero = document.querySelector(".hero");
    var footer = document.querySelector("footer");
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var lens = nav.querySelector(".lens");

    // Eased glide to a section. CSS smooth-scroll is near-instant over long
    // distances, so this animates it explicitly (a jump for reduced motion).
    var gliding = 0;
    glide = function (el) { glideTo(el); };
    function glideTo(el) {
      var start = window.scrollY;
      var end = Math.max(0, el.getBoundingClientRect().top + start - 8);
      var dist = end - start;
      if (reduceMotion || Math.abs(dist) < 4) { window.scrollTo(0, end); return; }
      var dur = Math.min(1400, 600 + Math.abs(dist) * 0.12);
      var t0 = null, id = ++gliding;
      var root = document.documentElement, prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function step(ts) {
        if (id !== gliding) return;
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        window.scrollTo(0, start + dist * ease(k));
        if (k < 1) requestAnimationFrame(step);
        else root.style.scrollBehavior = prev;
      }
      requestAnimationFrame(step);
    }
    function stopGlide() { gliding++; document.documentElement.style.scrollBehavior = ""; }
    window.addEventListener("wheel", stopGlide, { passive: true });
    window.addEventListener("touchstart", stopGlide, { passive: true });
    links.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        if (!targets[i]) return;
        e.preventDefault();
        glideTo(targets[i]);
      });
    });

    function update() {
      var y = window.scrollY, vh = window.innerHeight;
      var pastHero = y > hero.offsetHeight * 0.6;
      var atFooter = footer.getBoundingClientRect().top < vh * 0.55;
      nav.classList.toggle("show", pastHero && !atFooter && intro.hidden && !typing);
      var current = -1;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= vh * 0.4) current = i; });
      links.forEach(function (a, i) { if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });

      // Slide the glass lens under the current link.
      if (current >= 0) {
        var l = links[current];
        lens.style.width = l.offsetWidth + "px";
        lens.style.transform = "translateX(" + l.offsetLeft + "px)";
        lens.style.opacity = "1";
      } else {
        lens.style.opacity = "0";
      }

    }

    // ---- Parallax: photo drifts in its arch, art drifts in its panels ----
    var heroImg = document.getElementById("hero-img");
    var arts = Array.prototype.slice.call(document.querySelectorAll(".ev-art .px"));
    var rangolis = Array.prototype.slice.call(document.querySelectorAll(".rangoli"));
    var cdMandala = document.querySelector(".cd-mandala");
    var marigolds = Array.prototype.slice.call(document.querySelectorAll(".day .mg"));
    var floaters = Array.prototype.slice.call(document.querySelectorAll("[data-px]")).map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute("data-px")) || 0, base: el.getAttribute("data-px-base") || "" };
    });
    // Block-print textures drift slower than the content for a sense of depth.
    var textured = Array.prototype.slice.call(document.querySelectorAll(".hero, .letter-sec, .events, .rsvp, .gallery"));
    function parallax() {
      if (reduceMotion || lite) return;
      var y = window.scrollY, vh = window.innerHeight;
      if (heroImg) heroImg.setAttribute("transform", "translate(0 " + Math.min(24, y * 0.05).toFixed(2) + ")");
      arts.forEach(function (g) {
        var r = (g.ownerSVGElement || g.parentElement).getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;          // -1 (above) .. 1 (below)
        g.style.transform = "translateY(" + (p * -9).toFixed(2) + "px) scale(1.07)";
      });
      rangolis.forEach(function (el) { el.style.transform = "rotate(" + (y * 0.02).toFixed(2) + "deg)"; });
      if (cdMandala) {
        var cr = cdMandala.getBoundingClientRect();
        if (cr.bottom > 0 && cr.top < vh) cdMandala.style.transform = "translate(-50%, -50%) rotate(" + (y * 0.015).toFixed(2) + "deg)";
      }
      marigolds.forEach(function (el) { el.style.transform = "rotate(" + (y * 0.12).toFixed(1) + "deg)"; });
      floaters.forEach(function (f) {
        var r = f.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var d = (r.top + r.height / 2 - vh / 2);
        f.el.style.transform = (f.base ? f.base + " " : "") + "translateY(" + (d * f.speed).toFixed(1) + "px)";
      });
      textured.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        sec.style.backgroundPosition = "0 " + (r.top * -0.12).toFixed(1) + "px, 0 0";
      });
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); parallax(); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // On phones the keyboard pushes fixed elements up; keep the nav out of the way while typing.
    document.addEventListener("focusin", function (e) {
      if (e.target.matches && e.target.matches("input, select, textarea")) { typing = true; update(); }
    });
    document.addEventListener("focusout", function () { typing = false; setTimeout(update, 50); });
    window.addEventListener("resize", onScroll);

    onScroll();
  })();

  // ---- In-page links that glide (hero RSVP button, scroll cue) ------------
  document.querySelectorAll("[data-glide]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      glide(t);
    });
  });

  // ---- Add to calendar (.ics with all four events) -------------------------
  function icsFile() {
    var loc = "Evara Resort & Spa\\, Village Bhalon\\, Patkote\\, Ramnagar\\, Jim Corbett\\, Uttarakhand 263159";
    var events = [
      ["carnival", "Carnival Lunch · Arunav & Shambhavi", "20270127T073000Z", "20270127T103000Z", "Lunch\\, hi-tea by the pool\\, mehendi and carnival games. Restaurant & Pool Lawn."],
      ["engagement", "Engagement · Arunav & Shambhavi", "20270127T123000Z", "20270127T173000Z", "Tilak\\, lagan\\, godh bharai and the ring ceremony\\, followed by a cocktail sangeet. Banquet Hall & Small Lawn."],
      ["shaadi", "Shaadi · Arunav & Shambhavi", "20270128T043000Z", "20270128T120000Z", "Baraat\\, varmala and phere. Big Lawn & Poolside."],
      ["reception", "Reception · Arunav & Shambhavi", "20270128T143000Z", "20270128T180000Z", "Our first dance\\, performances by friends and dinner. Big Lawn & Banquet Hall."]
    ];
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Arunav and Shambhavi//Wedding//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    events.forEach(function (e) {
      lines.push("BEGIN:VEVENT", "UID:" + e[0] + "-2027@arunav-rsvp-invitation.arunav.work", "DTSTAMP:" + stamp,
        "DTSTART:" + e[2], "DTEND:" + e[3], "SUMMARY:" + e[1], "LOCATION:" + loc, "DESCRIPTION:" + e[4], "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  document.querySelectorAll("[data-ics]").forEach(function (b) {
    b.addEventListener("click", function () {
      var url = URL.createObjectURL(new Blob([icsFile()], { type: "text/calendar;charset=utf-8" }));
      var a = document.createElement("a");
      a.href = url;
      a.download = "Arunav-Shambhavi-wedding.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  });

  // ---- Countdown ----------------------------------------------------------
  var cd = { d: document.getElementById("cd-days"), h: document.getElementById("cd-hours"), m: document.getElementById("cd-minutes"), s: document.getElementById("cd-seconds") };
  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var d = Math.max(0, TARGET - Date.now());
    cd.d.textContent = pad(Math.floor(d / 86400000));
    cd.h.textContent = pad(Math.floor(d / 3600000) % 24);
    cd.m.textContent = pad(Math.floor(d / 60000) % 60);
    cd.s.textContent = pad(Math.floor(d / 1000) % 60);
  }
  tick();
  setInterval(tick, 1000);

  // ---- Contacts -----------------------------------------------------------
  var renderContacts;
  (function () {
    var phoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>';
    var waIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4L3 21Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.3-1.8-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-1.8L9 9.5Z"/></svg>';
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    renderContacts = function (list, note) {
    document.getElementById("contact-list").innerHTML = list.map(function (p) {
      var digits = (p.phone || "").replace(/[^\d+]/g, "");
      var acts = digits ? '<div class="acts"><a class="ic" href="tel:' + esc(digits) + '" aria-label="Call ' + esc(p.name) + '">' + phoneIcon + '</a>' +
        '<a class="ic" href="https://wa.me/' + esc(digits.replace(/^\+/, "")) + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(p.name) + '">' + waIcon + '</a></div>' : "";
      return '<div class="person"><div><div class="pn">' + esc(p.name) + '</div><div class="pr">' + esc(p.role) + '</div>' +
        (p.phone ? '<div class="ph">' + esc(p.phone) + '</div>' : "") + '</div>' + acts + '</div>';
    }).join("") + (note ? '<p class="contacts-note">' + esc(note) + '</p>' : "");
    };
    renderContacts(CONTACTS, INVITE_KEY ? "" : "Phone numbers appear when you open the link from your invitation.");
  })();

  // ---- RSVP ---------------------------------------------------------------
  var form = document.getElementById("rsvp-form");
  var thanks = document.getElementById("rsvp-thanks");
  var errorBox = document.getElementById("rsvp-error");
  var submitBtn = document.getElementById("rsvp-submit");
  var attendingOnly = document.getElementById("attending-only");
  var nameInput = document.getElementById("rsvp-name");
  var phoneInput = document.getElementById("rsvp-phone");
  var guestSel = document.getElementById("rsvp-guests");
  var idsHost = document.getElementById("guest-ids");

  var ID_TYPES = ["Aadhaar", "Driving licence", "Passport"];
  var OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
  var MAX_FILE = 5 * 1024 * 1024;
  var MAX_RAW_IMAGE = 25 * 1024 * 1024;
  var uploadIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>';

  function attending() { return (new FormData(form)).get("attending") !== "no"; }
  function syncAttending() { attendingOnly.hidden = !attending(); }
  form.querySelectorAll('input[name="attending"]').forEach(function (r) { r.addEventListener("change", syncAttending); });
  if (!INVITE_KEY) {
    form.hidden = true;
    document.getElementById("rsvp-locked").hidden = false;
  }
  function showError(msg) { errorBox.textContent = msg; errorBox.hidden = !msg; }

  // One ID row per guest, kept in step with the guest count.
  function guestRow(i) {
    var row = document.createElement("div");
    row.className = "trip guest-id";
    row.innerHTML =
      '<div class="g-title">Guest ' + (i + 1) + (i === 0 ? ' <span class="opt" style="font:400 14px var(--sans);color:var(--faint)">(you)</span>' : '') + '</div>' +
      '<div class="fld-wrap"><label class="sublbl" for="gid-name-' + i + '">Full name</label>' +
      '<input class="fld" id="gid-name-' + i + '" data-role="g-name" autocomplete="off" /></div>' +
      '<div class="fld-wrap"><label class="sublbl" for="gid-type-' + i + '">ID type</label>' +
      '<select class="fld" id="gid-type-' + i + '" data-role="g-type"><option value="">Select</option>' +
      ID_TYPES.map(function (t) { return "<option>" + t + "</option>"; }).join("") + '</select></div>' +
      '<div class="fld-wrap"><label class="sublbl" for="gid-file-' + i + '">ID proof <span class="opt">(optional)</span></label>' +
      '<label class="file-drop">' + uploadIcon + '<span class="fd-text">Choose photo or PDF</span>' +
      '<input type="file" id="gid-file-' + i + '" data-role="g-file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" /></label></div>';
    var file = row.querySelector('[data-role="g-file"]');
    var drop = row.querySelector(".file-drop");
    file.addEventListener("change", function () {
      var f = file.files[0];
      drop.querySelector(".fd-text").textContent = f ? f.name : "Choose photo or PDF";
      drop.classList.toggle("has-file", !!f);
    });
    if (i === 0) {
      var n = row.querySelector('[data-role="g-name"]');
      n.value = nameInput.value;
      n.dataset.auto = "1";
      n.addEventListener("input", function () { n.dataset.auto = ""; });
    }
    return row;
  }
  function syncGuests() {
    var n = Math.max(1, +guestSel.value || 1);
    while (idsHost.children.length < n) idsHost.appendChild(guestRow(idsHost.children.length));
    while (idsHost.children.length > n) idsHost.removeChild(idsHost.lastChild);
  }
  guestSel.addEventListener("change", syncGuests);
  nameInput.addEventListener("input", function () {
    var g = idsHost.querySelector('[data-role="g-name"]');
    if (g && g.dataset.auto) g.value = nameInput.value;
  });
  syncGuests();

  function fileType(f) {
    if (f.type) return f.type === "image/jpg" ? "image/jpeg" : f.type;
    var ext = (f.name.split(".").pop() || "").toLowerCase();
    return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" }[ext] || "";
  }

  // Phone photos are large: shrink them to a readable JPEG before upload.
  function shrinkImage(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1800, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b); }, "image/jpeg", .85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { reject(new Error("Could not read the file")); };
      r.readAsDataURL(blob);
    });
  }
  async function prepareFile(file) {
    var type = fileType(file);
    if (/^image\/(jpeg|png|webp)$/.test(type)) {
      var small = await shrinkImage(file);
      if (small && small.size <= MAX_FILE && (small.size < file.size || file.size > MAX_FILE)) return { blob: small, type: "image/jpeg" };
    }
    if (file.size > MAX_FILE) throw new Error(file.name + " is larger than 5 MB");
    return { blob: file, type: type };
  }

  function post(payload) {
    payload.key = INVITE_KEY;
    payload.website = form.elements.website.value;
    // text/plain keeps this a simple request, so Apps Script needs no CORS preflight.
    return fetch(RSVP_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "the server did not accept it"); return j; });
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function fmtTime(t) {
    if (!t) return "";
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return (h % 12 || 12) + ":" + m + (h < 12 ? " am" : " pm");
  }
  // A guest who already replied from this device sees that, so they don't send duplicates by accident.
  function showPrevNote() {
    var n = document.getElementById("rsvp-prev");
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      var last = saved[saved.length - 1];
      if (!last || !INVITE_KEY) { n.hidden = true; return; }
      var when = new Date(last.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      n.textContent = "You already replied from this device on " + when + ". Sending again adds an updated reply.";
      n.hidden = false;
    } catch (e) { n.hidden = true; }
  }
  showPrevNote();

  function clearFieldErrors() {
    form.querySelectorAll(".has-err").forEach(function (w) { w.classList.remove("has-err"); });
    form.querySelectorAll(".field-err").forEach(function (n) { n.remove(); });
    form.querySelectorAll("[aria-invalid]").forEach(function (n) { n.removeAttribute("aria-invalid"); });
  }
  // Shows the message right under the field it belongs to, as well as by the button.
  function invalid(msg, el) {
    clearFieldErrors();
    showError(msg);
    if (el) {
      var wrap = el.closest(".fld-wrap") || el.closest("fieldset") || el.parentNode;
      wrap.classList.add("has-err");
      el.setAttribute("aria-invalid", "true");
      var note = document.createElement("p");
      note.className = "field-err";
      note.id = "err-" + Math.random().toString(36).slice(2, 8);
      note.textContent = msg;
      wrap.appendChild(note);
      el.setAttribute("aria-describedby", note.id);
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
      wrap.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
    return null;
  }
  form.addEventListener("input", function (e) {
    var w = e.target.closest && (e.target.closest(".has-err"));
    if (w) { w.classList.remove("has-err"); var n = w.querySelector(".field-err"); if (n) n.remove(); e.target.removeAttribute("aria-invalid"); showError(""); }
  });
  form.addEventListener("change", function (e) {
    var w = e.target.closest && (e.target.closest(".has-err"));
    if (w) { w.classList.remove("has-err"); var n = w.querySelector(".field-err"); if (n) n.remove(); e.target.removeAttribute("aria-invalid"); showError(""); }
  });

  // Ask about a station pickup (arrival) or drop (departure) only for train travel.
  // A "Yes" also asks for the station and the train.
  [["arriveBy", "pickup-q", "pickup"], ["departBy", "drop-q", "drop"]].forEach(function (c) {
    var q = document.getElementById(c[1]);
    var details = document.getElementById(c[2] + "-details");
    function sync() {
      var train = (form.querySelector('input[name="' + c[0] + '"]:checked') || {}).value === "Train";
      q.hidden = !train;
      if (!train) form.querySelectorAll('input[name="' + c[2] + '"]').forEach(function (r) { r.checked = false; });
      details.hidden = !(train && (form.querySelector('input[name="' + c[2] + '"]:checked') || {}).value === "Yes");
    }
    form.querySelectorAll('input[name="' + c[0] + '"], input[name="' + c[2] + '"]').forEach(function (r) { r.addEventListener("change", sync); });
    sync();
  });

  function collect() {
    var fd = new FormData(form);
    var going = attending();
    var data = { name: (fd.get("name") || "").trim(), phone: (fd.get("phone") || "").trim(), attending: going ? "Yes" : "No" };
    if (!data.name) return invalid("Please tell us your name.", nameInput);
    if (data.phone.replace(/\D/g, "").length < 10) return invalid("Please add a phone number we can reach you on.", phoneInput);
    if (!going) return { data: data, guests: [] };

    data.guests = String(+guestSel.value || 1);
    var checks = [
      ["arriveBy", "Please tell us whether you are arriving by road or train.", form.querySelector('input[name="arriveBy"]')],
      ["arriveTime", "Please add your arrival time.", document.getElementById("rsvp-arrive-time")],
      ["pickup", "Please tell us whether you need a pickup from the railway station.", form.querySelector('input[name="pickup"]'), function () { return fd.get("arriveBy") === "Train"; }],
      ["departBy", "Please tell us whether you are leaving by road or train.", form.querySelector('input[name="departBy"]')],
      ["departTime", "Please add your departure time.", document.getElementById("rsvp-depart-time")],
      ["drop", "Please tell us whether you need a drop at the railway station.", form.querySelector('input[name="drop"]'), function () { return fd.get("departBy") === "Train"; }],
      ["pickupStation", "Please tell us which station to pick you up from.", document.getElementById("rsvp-pickup-station"), function () { return fd.get("arriveBy") === "Train" && fd.get("pickup") === "Yes"; }],
      ["pickupTrain", "Please add the train you are arriving on.", document.getElementById("rsvp-pickup-train"), function () { return fd.get("arriveBy") === "Train" && fd.get("pickup") === "Yes"; }],
      ["dropStation", "Please tell us which station to drop you at.", document.getElementById("rsvp-drop-station"), function () { return fd.get("departBy") === "Train" && fd.get("drop") === "Yes"; }],
      ["dropTrain", "Please add the train you are leaving on.", document.getElementById("rsvp-drop-train"), function () { return fd.get("departBy") === "Train" && fd.get("drop") === "Yes"; }],
      ["driver", "Please tell us whether a driver is travelling with you.", form.querySelector('input[name="driver"]')]
    ];
    for (var c = 0; c < checks.length; c++) {
      if (checks[c][3] && !checks[c][3]()) continue;
      if (!String(fd.get(checks[c][0]) || "").trim()) return invalid(checks[c][1], checks[c][2]);
    }
    data.arriveBy = fd.get("arriveBy"); data.arriveDate = fd.get("arriveDate"); data.arriveTime = fd.get("arriveTime");
    data.pickup = data.arriveBy === "Train" ? fd.get("pickup") : "";
    data.drop = fd.get("departBy") === "Train" ? fd.get("drop") : "";
    data.pickupStation = data.pickup === "Yes" ? fd.get("pickupStation").trim() : "";
    data.pickupTrain = data.pickup === "Yes" ? fd.get("pickupTrain").trim() : "";
    data.dropStation = data.drop === "Yes" ? fd.get("dropStation").trim() : "";
    data.dropTrain = data.drop === "Yes" ? fd.get("dropTrain").trim() : "";
    data.departBy = fd.get("departBy"); data.departDate = fd.get("departDate"); data.departTime = fd.get("departTime");
    data.driver = fd.get("driver");

    var guests = [];
    var rows = idsHost.querySelectorAll(".guest-id");
    for (var i = 0; i < rows.length; i++) {
      var nm = rows[i].querySelector('[data-role="g-name"]');
      var tp = rows[i].querySelector('[data-role="g-type"]');
      var fl = rows[i].querySelector('[data-role="g-file"]');
      var label = "guest " + (i + 1);
      if (!nm.value.trim()) return invalid("Please add the full name of " + label + ".", nm);
      // ID proofs are optional: an RSVP without them is better than no RSVP.
      var f = fl.files[0];
      if (!f) { guests.push({ name: nm.value.trim(), idType: "", file: null }); continue; }
      if (ID_TYPES.indexOf(tp.value) === -1) return invalid("Please choose the ID type for " + label + ".", tp);
      var t = fileType(f);
      if (OK_TYPES.indexOf(t) === -1) return invalid("The ID for " + label + " must be a photo or a PDF.", fl);
      var cap = (t === "application/pdf" || /heic|heif/.test(t)) ? MAX_FILE : MAX_RAW_IMAGE;
      if (f.size > cap) {
        return invalid("The ID for " + label + " is too large. Please use a file under 5 MB.", fl);
      }
      guests.push({ name: nm.value.trim(), idType: tp.value, file: f });
    }
    return { data: data, guests: guests };
  }

  function setBusy(text) {
    submitBtn.disabled = !!text;
    submitBtn.textContent = text || "Send RSVP";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var got = collect();
    if (!got) return;
    showError("");
    if (!RSVP_ENDPOINT.trim()) {
      showError("RSVPs are not connected yet. Please call or message us for now.");
      return;
    }

    var id = newId();
    var d = got.data;
    try {
      var withId = got.guests.filter(function (g) { return g.file; });
      for (var i = 0, done = 0; i < got.guests.length; i++) {
        var g = got.guests[i];
        if (!g.file) continue;
        setBusy("Uploading ID " + (++done) + " of " + withId.length + "…");
        var prepared = await prepareFile(g.file);
        await post({
          kind: "file", submissionId: id, primaryName: d.name, index: i,
          guestName: g.name, idType: g.idType, mimeType: prepared.type, data: await toBase64(prepared.blob)
        });
      }
      setBusy("Saving your RSVP…");
      var row = Object.assign({ kind: "rsvp", submissionId: id }, d, {
        ids: got.guests.map(function (g) { return { name: g.name, idType: g.idType, file: !!g.file }; })
      });
      await post(row);
    } catch (err) {
      setBusy("");
      showError("We could not send your RSVP (" + (err && err.message || "network error") + "). Please try again, or call us.");
      return;
    }

    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      saved.push(Object.assign({ submittedAt: new Date().toISOString(), submissionId: id }, d));
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch (err2) { /* storage unavailable */ }

    setBusy("");
    var going = d.attending === "Yes";
    document.getElementById("ty-title").textContent = going ? "Dhanyavaad" : "We will miss you";
    document.getElementById("ty-msg").textContent = going
      ? "Your reply is with us. We cannot wait to welcome you in Jim Corbett."
      : "Thank you for letting us know. Your blessings mean the world to us.";
    var sum = document.getElementById("ty-summary");
    sum.innerHTML = "";
    function li(label, text) { var n = document.createElement("li"); var b = document.createElement("b"); b.textContent = label + " "; n.appendChild(b); n.appendChild(document.createTextNode(text)); sum.appendChild(n); }
    if (going) {
      li("Guests:", d.guests + (d.guests === "1" ? " person" : " people"));
      li("Arriving:", d.arriveDate + ", " + fmtTime(d.arriveTime) + " by " + d.arriveBy.toLowerCase());
      if (d.pickup) li("Station pickup:", d.pickup === "Yes" ? d.pickupStation + ", " + d.pickupTrain : "No, thanks");
      li("Leaving:", d.departDate + ", " + fmtTime(d.departTime) + " by " + d.departBy.toLowerCase());
      if (d.drop) li("Station drop:", d.drop === "Yes" ? d.dropStation + ", " + d.dropTrain : "No, thanks");
      li("Driver:", d.driver);
      var up = got.guests.filter(function (g) { return g.file; }).length;
      li("ID proofs:", up === got.guests.length ? "all " + up + " uploaded" : up + " of " + got.guests.length + " uploaded");
    }
    showPrevNote();
    form.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  });

  // Phone numbers come from the backend, only for visitors holding the invite key.
  (function loadContactNumbers() {
    if (!INVITE_KEY || !RSVP_ENDPOINT.trim()) return;
    var CACHE = "sa-contacts";
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE) || "null");
      if (cached && cached.length) { renderContacts(cached, ""); return; }
    } catch (e) {}
    post({ kind: "contacts" }).then(function (j) {
      var list = Array.isArray(j.contacts) ? j.contacts.filter(function (c) { return c && c.name; }) : [];
      if (!list.length) return;
      renderContacts(list, "");
      try { sessionStorage.setItem(CACHE, JSON.stringify(list)); } catch (e) {}
    }).catch(function () { /* keep names without numbers */ });
  })();

  document.getElementById("rsvp-reset").addEventListener("click", function () {
    form.reset();
    idsHost.innerHTML = "";
    syncGuests();
    syncAttending();
    form.hidden = false;
    thanks.hidden = true;
    showError("");
    form.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  });

  // ---- Gallery strip + lightbox --------------------------------------------
  (function () {
    var track = document.getElementById("gal-track");
    if (!track) return;
    var files = track.getAttribute("data-full").split(",");
    var bar = document.getElementById("gal-bar");
    var prevB = document.querySelector(".gal-nav.prev"), nextB = document.querySelector(".gal-nav.next");

    function step() { var it = track.querySelector(".gal-item"); return it ? it.getBoundingClientRect().width + 22 : 260; }
    function syncStrip() {
      var max = track.scrollWidth - track.clientWidth;
      var p = max > 0 ? track.scrollLeft / max : 0;
      var share = max > 0 ? Math.max(.12, track.clientWidth / track.scrollWidth) : 1;
      bar.style.width = (share * 100) + "%";
      bar.style.transform = "translateX(" + (p * (1 / share - 1) * 100) + "%)";
      prevB.disabled = track.scrollLeft < 4;
      nextB.disabled = track.scrollLeft > max - 4;
    }
    track.addEventListener("scroll", syncStrip, { passive: true });
    window.addEventListener("resize", syncStrip);
    prevB.addEventListener("click", function () { track.scrollBy({ left: -step() * 2, behavior: reduceMotion ? "auto" : "smooth" }); });
    nextB.addEventListener("click", function () { track.scrollBy({ left: step() * 2, behavior: reduceMotion ? "auto" : "smooth" }); });
    syncStrip();

    var lb = document.getElementById("lightbox"), img = document.getElementById("lb-img"), count = document.getElementById("lb-count");
    var at = 0, lastFocus = null;
    function show(i) {
      at = (i + files.length) % files.length;
      img.src = "assets/gallery/" + files[at] + ".jpg";
      img.alt = "Arunav and Shambhavi at their roka, photo " + (at + 1);
      count.textContent = (at + 1) + " / " + files.length;
      [at + 1, at - 1].forEach(function (k) { var pre = new Image(); pre.src = "assets/gallery/" + files[(k + files.length) % files.length] + ".jpg"; });
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.hidden = false;
      lock(true);
      requestAnimationFrame(function () { lb.classList.add("open"); });
      document.getElementById("lb-close").focus();
    }
    function close() {
      lb.classList.remove("open");
      lock(false);
      setTimeout(function () { lb.hidden = true; img.removeAttribute("src"); }, reduceMotion ? 0 : 300);
      if (lastFocus) lastFocus.focus();
    }
    track.querySelectorAll(".gal-frame").forEach(function (b) {
      b.addEventListener("click", function () { open(+b.getAttribute("data-i")); });
    });
    document.getElementById("lb-close").addEventListener("click", close);
    document.getElementById("lb-prev").addEventListener("click", function () { show(at - 1); });
    document.getElementById("lb-next").addEventListener("click", function () { show(at + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(at - 1);
      else if (e.key === "ArrowRight") show(at + 1);
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) show(at + (dx < 0 ? 1 : -1));
    });
  })();
})();
