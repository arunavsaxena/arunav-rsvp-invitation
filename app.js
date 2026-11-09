(function () {
  "use strict";
  document.documentElement.classList.add("js");

  // ---- Config -------------------------------------------------------------
  // Countdown target: Carnival Lunch, 27 Jan 2027, 1:00 PM IST.
  var TARGET = new Date("2027-01-27T13:00:00+05:30").getTime();

  // Who to call. Add numbers in international format ("+91 98xxx xxxxx").
  // A person with no number is listed by name only, without call buttons.
  var CONTACTS = [
    { name: "Sunil Kumar Saxena", role: "Groom’s father", phone: "" },
    { name: "Sarita Saxena", role: "Groom’s mother", phone: "" },
    { name: "Arunav", role: "Groom", phone: "" }
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
  lanterns(document.getElementById("sky"), 12);
  lanterns(document.getElementById("sky-intro"), 12);

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
  lock(true);
  document.getElementById("open-invite").addEventListener("click", function () {
    lock(false);
    window.scrollTo(0, 0);
    intro.classList.add("is-open");
    setTimeout(function () { intro.hidden = true; }, reduceMotion ? 50 : 1600);
  });

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
  langBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var en = b.getAttribute("data-lang") === "en";
      langBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      // Both versions stay in the layout (stacked), so the card keeps one height.
      [["letter-hi", !en], ["await-hi", !en], ["letter-en", en], ["await-en", en]].forEach(function (p) {
        var el = document.getElementById(p[0]);
        el.classList.toggle("is-off", !p[1]);
        el.setAttribute("aria-hidden", String(!p[1]));
      });
    });
  });

  // ---- Section nav: show after the hero, highlight the current section ----
  (function () {
    var nav = document.getElementById("section-nav");
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var hero = document.querySelector(".hero");
    var footer = document.querySelector("footer");
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });

    // Eased glide to a section. CSS smooth-scroll is near-instant over long
    // distances, so this animates it explicitly (a jump for reduced motion).
    var gliding = 0;
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
        if (k < 1) requestAnimationFrame(step); else root.style.scrollBehavior = prev;
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
      nav.classList.toggle("show", pastHero && !atFooter && intro.hidden);
      var current = -1;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= vh * 0.4) current = i; });
      links.forEach(function (a, i) { if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    }

    // ---- Parallax: photo drifts in its arch, art drifts in its panels ----
    var heroImg = document.getElementById("hero-img");
    var arts = Array.prototype.slice.call(document.querySelectorAll(".ev-art .px"));
    var rangolis = Array.prototype.slice.call(document.querySelectorAll(".rangoli"));
    function parallax() {
      if (reduceMotion) return;
      var y = window.scrollY, vh = window.innerHeight;
      if (heroImg) heroImg.setAttribute("transform", "translate(0 " + Math.min(24, y * 0.05).toFixed(2) + ")");
      arts.forEach(function (g) {
        var r = g.ownerSVGElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;          // -1 (above) .. 1 (below)
        g.style.transform = "translateY(" + (p * -9).toFixed(2) + "px) scale(1.07)";
      });
      rangolis.forEach(function (el) { el.style.transform = "rotate(" + (y * 0.02).toFixed(2) + "deg)"; });
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); parallax(); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.getElementById("open-invite").addEventListener("click", function () { setTimeout(onScroll, 1700); });
    onScroll();
  })();

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
  (function () {
    var phoneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>';
    var waIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4L3 21Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.3-1.8-1-1 .8a4 4 0 0 1-2.2-2.2l.8-1-1-1.8L9 9.5Z"/></svg>';
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    document.getElementById("contact-list").innerHTML = CONTACTS.map(function (p) {
      var digits = (p.phone || "").replace(/[^\d+]/g, "");
      var acts = digits ? '<div class="acts"><a class="ic" href="tel:' + esc(digits) + '" aria-label="Call ' + esc(p.name) + '">' + phoneIcon + '</a>' +
        '<a class="ic" href="https://wa.me/' + esc(digits.replace(/^\+/, "")) + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(p.name) + '">' + waIcon + '</a></div>' : "";
      return '<div class="person"><div><div class="pn">' + esc(p.name) + '</div><div class="pr">' + esc(p.role) + '</div>' +
        (p.phone ? '<div class="ph">' + esc(p.phone) + '</div>' : "") + '</div>' + acts + '</div>';
    }).join("");
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
      '<div class="fld-wrap"><label class="sublbl" for="gid-name-' + i + '">Full name as on ID</label>' +
      '<input class="fld" id="gid-name-' + i + '" data-role="g-name" autocomplete="off" /></div>' +
      '<div class="fld-wrap"><label class="sublbl" for="gid-type-' + i + '">ID type</label>' +
      '<select class="fld" id="gid-type-' + i + '" data-role="g-type"><option value="">Select</option>' +
      ID_TYPES.map(function (t) { return "<option>" + t + "</option>"; }).join("") + '</select></div>' +
      '<div class="fld-wrap"><label class="sublbl" for="gid-file-' + i + '">ID proof</label>' +
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

  function invalid(msg, el) {
    showError(msg);
    if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); }
    return null;
  }

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
      ["departBy", "Please tell us whether you are leaving by road or train.", form.querySelector('input[name="departBy"]')],
      ["departTime", "Please add your departure time.", document.getElementById("rsvp-depart-time")],
      ["driver", "Please tell us whether a driver is travelling with you.", form.querySelector('input[name="driver"]')]
    ];
    for (var c = 0; c < checks.length; c++) {
      if (!fd.get(checks[c][0])) return invalid(checks[c][1], checks[c][2]);
    }
    data.arriveBy = fd.get("arriveBy"); data.arriveDate = fd.get("arriveDate"); data.arriveTime = fd.get("arriveTime");
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
      if (ID_TYPES.indexOf(tp.value) === -1) return invalid("Please choose the ID type for " + label + ".", tp);
      var f = fl.files[0];
      if (!f) return invalid("Please upload an ID proof for " + label + ".", fl);
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
      for (var i = 0; i < got.guests.length; i++) {
        var g = got.guests[i];
        setBusy("Uploading ID " + (i + 1) + " of " + got.guests.length + "…");
        var prepared = await prepareFile(g.file);
        await post({
          kind: "file", submissionId: id, primaryName: d.name, index: i,
          guestName: g.name, idType: g.idType, mimeType: prepared.type, data: await toBase64(prepared.blob)
        });
      }
      setBusy("Saving your RSVP…");
      var row = Object.assign({ kind: "rsvp", submissionId: id }, d, {
        ids: got.guests.map(function (g) { return { name: g.name, idType: g.idType }; })
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
      ? "Your reply and ID proofs are with us. We cannot wait to welcome you in Jim Corbett."
      : "Thank you for letting us know. Your blessings mean the world to us.";
    form.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  });

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
})();
