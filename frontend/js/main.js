/* =========================================================================
   Alvien & Vinella — 3D Birthday Celebration · Main Script
   ========================================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // App state
  let config = {
    person1: "Alvien",
    person2: "Vinella",
    title: "Birthday Celebration 🎂",
    subtitle: "Two Birthdays, One Special Celebration ✨",
    date: "10 October 2026",
    time: "18:00 - 22:00",
    venue: "The Glasshouse Garden",
    address: "Jl. Senopati No. 10, Kebayoran Baru, Jakarta Selatan",
    dressCode: "Smart Casual — Pastel & Gold",
    start: "2026-10-10T18:00",
    end: "2026-10-10T22:00",
    timezone: "Asia/Jakarta",
    mapsQuery: "The Glasshouse Garden, Jl. Senopati No. 10, Kebayoran Baru, Jakarta Selatan",
    message: "Join us as we celebrate another beautiful year of life, laughter, and memories. Two birthdays, one unforgettable night.",
    numberBalloons: "26",
    googleFormUrl: "",
    portraits: { person1: "assets/images/alvien.jpg", person2: "assets/images/vinella.jpg" },
    gallery: [
      { src: "assets/images/photo1.jpg", alt: "Golden Moments ✨" },
      { src: "assets/images/photo2.jpg", alt: "Sweet Celebrations 🎂" },
      { src: "assets/images/photo3.jpg", alt: "Toast to Joy 🥂" },
      { src: "assets/images/photo4.jpg", alt: "Sunset Wishes 🎈" },
      { src: "assets/images/photo5.jpg", alt: "Gifts of Love 🎁" },
      { src: "assets/images/photo6.jpg", alt: "Night Sparkles 🎆" }
    ],
    tracks: [
      { title: "Selamat Ulang Tahun · Jamrud 🎸🎂", src: "assets/music/birthday_song.m4a" },
      { title: "Celebration Mood ✨", src: "assets/music/song_2.mp3" },
      { title: "Party All Night 🎉", src: "assets/music/song_3.mp3" }
    ],
    cake_model: null,
  };

  let fx = null;
  let bgScene = null;
  let mainCake = null;
  let revealCake = null;
  let player = null;
  let hasOpened = false;

  /* =========================================================================
     1. Initialization & Bridge Sync
     ========================================================================= */
  function initApp() {
    // 1. Audio player initialized immediately with defaults
    if (window.Player && !player) {
      player = new window.Player(config.tracks);
    }

    initVisualEffects();
    initCountdown();
    init3DTilt();
    initRSVP();
    initCalendarActions();
    initMemoriesLightbox();
    initCelebrateButton();
    initScrollNavigation();
    initGoogleFormSetup();
    initKeyboardNavigation();
    setupIntersectionObserver();

    // Listen to Streamlit config if running inside Streamlit
    if (window.StreamlitBridge) {
      window.StreamlitBridge.onRender((args) => {
        if (args && args.config) {
          applyConfig(args.config);
        }
        if (args && args.ack) {
          handleRsvpAck(args.ack);
        }
      });
    }

    // Run opening animation
    runIntroAnimation();
  }

  // Ensure initApp runs even if DOMContentLoaded already fired before script execution
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

  /* Apply runtime config sent from Python or fallback defaults */
  function applyConfig(cfg) {
    config = Object.assign({}, config, cfg);

    // Replace text elements
    $$("[data-p1]").forEach((el) => (el.textContent = config.person1));
    $$("[data-p2]").forEach((el) => (el.textContent = config.person2));
    $$("[data-possessive]").forEach((el) => (el.textContent = `${config.person1} & ${config.person2}'s`));
    $$("[data-title]").forEach((el) => (el.textContent = config.title));
    $$("[data-subtitle]").forEach((el) => (el.textContent = config.subtitle));
    $$("[data-date]").forEach((el) => (el.textContent = config.date));
    $$("[data-time]").forEach((el) => (el.textContent = config.time));
    $$("[data-venue]").forEach((el) => (el.textContent = config.venue));
    $$("[data-address]").forEach((el) => (el.textContent = config.address));
    $$("[data-dress]").forEach((el) => (el.textContent = config.dressCode));
    $$("[data-message]").forEach((el) => (el.textContent = `“${config.message}”`));

    // Monograms
    const init1 = (config.person1 || "A").charAt(0).toUpperCase();
    const init2 = (config.person2 || "V").charAt(0).toUpperCase();
    const m1 = $("person1Card")?.querySelector("[data-initial1]");
    const m2 = $("person2Card")?.querySelector("[data-initial2]");
    if (m1) m1.textContent = init1;
    if (m2) m2.textContent = init2;

    // Photos
    if (config.portraits) {
      if (config.portraits.person1) {
        setPortrait("person1Photo", config.portraits.person1, config.person1);
      }
      if (config.portraits.person2) {
        setPortrait("person2Photo", config.portraits.person2, config.person2);
      }
    }

    // Gallery
    if (Array.isArray(config.gallery) && config.gallery.length > 0) {
      renderGallery(config.gallery);
    } else {
      setupDefaultGallery();
    }

    // Map links
    const q = encodeURIComponent(config.mapsQuery || `${config.venue}, ${config.address}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    if ($("mapsBtn")) $("mapsBtn").href = mapsUrl;
    if ($("directionsBtn")) $("directionsBtn").href = dirUrl;

    // Google Form setup
    initGoogleFormSetup();

    // Sync player tracks if provided
    if (player && Array.isArray(config.tracks) && config.tracks.length > 0) {
      player.updateTracks(config.tracks);
    } else if (!player && window.Player) {
      player = new window.Player(config.tracks || []);
    }
  }

  function setPortrait(containerId, src, name) {
    const box = $(containerId);
    if (!box) return;
    box.innerHTML = `<img src="${src}" alt="${name}" loading="lazy" />`;
  }

  /* =========================================================================
     2. Visual Effects & 3D Setup
     ========================================================================= */
  function initVisualEffects() {
    const fxCanvas = $("fx");
    if (fxCanvas) {
      fx = new window.FX(fxCanvas);
    }

    // Background bokeh particles
    createBokehLights();

    // Check WebGL availability
    const webgl = window.Three3D && window.Three3D.webglAvailable();
    if (!webgl) {
      document.body.classList.add("no-webgl");
      setupCssBalloons();
      return;
    }

    // 3D Background scene
    const bgCanvas = $("bg3d");
    if (bgCanvas) {
      bgScene = new window.Three3D.BalloonScene(bgCanvas, {
        numbers: config.numberBalloons || "26",
      });
    }

    // 3D Cake in Section #cake
    const cakeCanvas = $("cake3d");
    if (cakeCanvas) {
      mainCake = window.createCake(cakeCanvas, {
        names: `${config.person1} & ${config.person2}`,
        modelUrl: config.cake_model,
      });

      // Tap cake to blow candle / make a wish
      const stage = $("cakeStage");
      if (stage) {
        stage.addEventListener("click", () => {
          mainCake.spinFast(2000);
          const blown = mainCake.blow();
          if (blown && fx) {
            const r = stage.getBoundingClientRect();
            fx.sparkles(50, { x: r.left, y: r.top, w: r.width, h: r.height * 0.6 });
            fx.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 60, power: 12 });
          }
        });
      }
    }
  }

  function createBokehLights() {
    const container = $("bokeh");
    if (!container) return;
    const count = window.innerWidth < 768 ? 12 : 24;
    for (let i = 0; i < count; i++) {
      const b = document.createElement("i");
      const size = 30 + Math.random() * 90;
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.style.left = `${Math.random() * 100}%`;
      b.style.top = `${Math.random() * 100}%`;
      b.style.setProperty("--d", `${12 + Math.random() * 16}s`);
      b.style.setProperty("--x", `${(Math.random() - 0.5) * 80}px`);
      b.style.setProperty("--y", `${(Math.random() - 0.5) * 120}px`);
      b.style.animationDelay = `${-Math.random() * 15}s`;
      container.appendChild(b);
    }
  }

  function setupCssBalloons() {
    const c = $("cssBalloons");
    if (!c) return;
    const colors = ["#f5a9cb", "#b9a3f5", "#f7e3a3", "#a9d6ff", "#ffd59e", "#ff8fab"];
    const count = window.innerWidth < 768 ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const b = document.createElement("div");
      b.className = "cb" + (i % 4 === 0 ? " heart" : i % 5 === 0 ? " clear" : "");
      if (b.classList.contains("heart")) b.innerHTML = "<span>❤️</span>";
      b.style.left = `${Math.random() * 95}%`;
      b.style.setProperty("--s", `${50 + Math.random() * 45}px`);
      b.style.setProperty("--c", colors[i % colors.length]);
      b.style.setProperty("--t", `${14 + Math.random() * 10}s`);
      b.style.setProperty("--delay", `${Math.random() * 12}s`);
      b.style.setProperty("--r", `${(Math.random() - 0.5) * 16}deg`);
      c.appendChild(b);
    }
  }

  /* =========================================================================
     3. Opening Animation Sequence
     ========================================================================= */
  function runIntroAnimation() {
    const openBtn = $("openBtn");
    const introEyebrow = $("introEyebrow");
    const introNames = $("introNames");
    const introSub = $("introSub");
    const introHint = $("introHint");

    // Robust click and pointerup handling without preventDefault delay
    const handleOpen = (e) => {
      triggerOpenInvitation(e);
    };

    if (openBtn) {
      openBtn.addEventListener("click", handleOpen);
      openBtn.addEventListener("pointerup", (e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          handleOpen(e);
        }
      });
    }

    // Scroll down cue on opening screen
    const scrollCue = $("introScrollCue");
    scrollCue?.addEventListener("click", handleOpen);

    // Auto-boost balloons & play audio on first user scroll interaction
    let scrollTriggered = false;
    window.addEventListener("scroll", () => {
      if (!scrollTriggered && (window.scrollY || document.documentElement.scrollTop) > 40) {
        scrollTriggered = true;
        try {
          if (player && !player.playing) player.start();
        } catch (_) {}
        try {
          if (bgScene) bgScene.burst();
        } catch (_) {}
      }
    }, { passive: true });

    if (!window.gsap) {
      document.body.classList.add("no-gsap");
      return;
    }

    const tl = gsap.timeline();

    // Soft reveal of opening text
    tl.fromTo(
      introEyebrow,
      { opacity: 0, y: -20, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power2.out" }
    )
    .fromTo(
      introNames,
      { opacity: 0, scale: 0.88, filter: "blur(12px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.8, ease: "elastic.out(1, 0.75)" },
      "-=0.6"
    )
    .fromTo(
      introSub,
      { opacity: 0, y: 15, letterSpacing: "0.25em" },
      { opacity: 1, y: 0, letterSpacing: "0.12em", duration: 1.2, ease: "power2.out" },
      "-=0.8"
    )
    .to(
      openBtn,
      { opacity: 1, scale: 1, duration: 1, ease: "back.out(1.7)" },
      "+=0.2"
    )
    .to(
      introHint,
      { opacity: 0.85, duration: 0.8 },
      "-=0.4"
    );
  }

  let lastOpenTrigger = 0;
  /* When "Open Invitation ✨" or scroll cue is clicked */
  function triggerOpenInvitation(e) {
    if (e) {
      try { e.stopPropagation(); } catch (_) {}
    }
    const now = Date.now();
    if (now - lastOpenTrigger < 800) return;
    lastOpenTrigger = now;

    // 1. Start background playlist on click gesture with safety
    try {
      if (player && typeof player.start === "function") {
        player.start();
      }
    } catch (err) {
      console.warn("Audio playback gesture warning:", err);
    }

    // 2. Celebratory 3D visual FX with safety
    try {
      if (bgScene && typeof bgScene.burst === "function") {
        bgScene.burst();
      }
    } catch (err) {
      console.warn("3D scene burst warning:", err);
    }
    try {
      if (fx) {
        if (typeof fx.confettiCannons === "function") fx.confettiCannons();
        if (typeof fx.sparkles === "function") fx.sparkles(70);
        if (typeof fx.confettiRain === "function") fx.confettiRain(3500);
      }
    } catch (err) {
      console.warn("Confetti visual warning:", err);
    }

    // 3. Smooth scroll down to main invitation card #invitation
    const target = $("invitation");
    if (target) {
      try {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const targetY = rect.top + scrollTop;

        if (typeof window.smoothScrollTo === "function") {
          window.smoothScrollTo(targetY, 550);
        } else {
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      } catch (err) {
        console.warn("Smooth scroll fallback:", err);
        try {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (_) {
          window.scrollTo(0, target.offsetTop || 600);
        }
      }
    }
  }
  // Expose globally so inline onclick on #openBtn works immediately without delay
  window.triggerOpenInvitation = triggerOpenInvitation;

  /* =========================================================================
     4. 3D Tilt for Cards (Invitation, Celebrants, Memories)
     ========================================================================= */
  function init3DTilt() {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return; // keep natural on mobile touch

    const cards = $$(".tilt");
    cards.forEach((card) => {
      const maxTilt = parseFloat(card.dataset.tiltMax) || 10;
      const shine = card.querySelector(".invite-card__shine");

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const rotX = ((y - cy) / cy) * -maxTilt;
        const rotY = ((x - cx) / cx) * maxTilt;

        card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(10px)`;

        if (shine) {
          card.style.setProperty("--mx", `${x}px`);
          card.style.setProperty("--my", `${y}px`);
        }
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
      });
    });
  }

  /* =========================================================================
     5. Save The Date Countdown & Calendar (ICS + Google Calendar)
     ========================================================================= */
  function initCountdown() {
    const daysEl = $("cdDays");
    const hoursEl = $("cdHours");
    const minsEl = $("cdMins");
    const secsEl = $("cdSecs");

    function update() {
      const target = new Date(config.start || "2026-10-10T18:00:00").getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      if (daysEl) daysEl.textContent = String(d).padStart(2, "0");
      if (hoursEl) hoursEl.textContent = String(h).padStart(2, "0");
      if (minsEl) minsEl.textContent = String(m).padStart(2, "0");
      if (secsEl) secsEl.textContent = String(s).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
  }

  function initCalendarActions() {
    const icsBtn = $("icsBtn");
    const gcalBtn = $("gcalBtn");

    const title = `${config.person1} & ${config.person2}'s Birthday Celebration 🎂`;
    const details = `${config.subtitle}\nDress Code: ${config.dressCode}\n\nVenue: ${config.venue}\n${config.address}`;
    const location = `${config.venue}, ${config.address}`;

    // Google Calendar Link
    if (gcalBtn) {
      const fmtDate = (iso) => (iso ? iso.replace(/[-:]/g, "").slice(0, 15) : "20261010T180000");
      const s = fmtDate(config.start);
      const e = fmtDate(config.end);
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${s}/${e}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
      gcalBtn.href = gcalUrl;
    }

    // Downloadable .ICS File
    if (icsBtn) {
      icsBtn.addEventListener("click", () => {
        const fmtICS = (iso) => (iso ? iso.replace(/[-:]/g, "").slice(0, 15) : "20261010T180000");
        const icsContent = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Birthday Celebration//Alvien & Vinella//EN",
          "CALSCALE:GREGORIAN",
          "BEGIN:VEVENT",
          `SUMMARY:${title}`,
          `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
          `LOCATION:${location}`,
          `DTSTART:${fmtICS(config.start)}`,
          `DTEND:${fmtICS(config.end)}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Birthday_Celebration_${config.person1}_and_${config.person2}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Map embed trigger
    const mapLoad = $("mapLoad");
    const mapBox = $("mapBox");
    if (mapLoad && mapBox) {
      mapLoad.addEventListener("click", () => {
        const q = encodeURIComponent(config.mapsQuery || `${config.venue}, ${config.address}`);
        mapBox.innerHTML = `<iframe src="https://maps.google.com/maps?q=${q}&t=&z=15&ie=UTF8&iwloc=&output=embed" loading="lazy" allowfullscreen></iframe>`;
      });
    }
  }

  /* =========================================================================
     6. Memories Gallery & Lightbox
     ========================================================================= */
  function setupDefaultGallery() {
    const galleryEl = $("gallery");
    if (!galleryEl) return;

    // Use default photos if none supplied
    const defaultPhotos = [
      { src: "assets/images/photo1.jpg", alt: "Golden Moments ✨" },
      { src: "assets/images/photo2.jpg", alt: "Sweet Celebrations 🎂" },
      { src: "assets/images/photo3.jpg", alt: "Toast to Joy 🥂" },
      { src: "assets/images/photo4.jpg", alt: "Sunset Wishes 🎈" },
      { src: "assets/images/photo5.jpg", alt: "Gifts of Love 🎁" },
      { src: "assets/images/photo6.jpg", alt: "Night Sparkles 🎆" },
    ];
    renderGallery(defaultPhotos);
  }

  function renderGallery(photos) {
    const galleryEl = $("gallery");
    if (!galleryEl) return;
    galleryEl.innerHTML = "";

    photos.forEach((item, idx) => {
      const card = document.createElement("figure");
      card.className = "memory reveal-up";

      // Slight random rotation for polaroid effect
      const rot = ((idx % 3) - 1) * 2.2 + (Math.random() - 0.5) * 1.5;
      const py = (idx % 2) * -10;
      card.style.setProperty("--rot", `${rot}deg`);
      card.style.setProperty("--py", `${py}px`);
      card.style.setProperty("--fd", `${6 + Math.random() * 4}s`);
      card.style.setProperty("--fdel", `${-Math.random() * 5}s`);

      card.innerHTML = `
        <div class="tilt-inner">
          <div class="memory__img">
            <img src="${item.src}" alt="${item.alt || "Memory"}" loading="lazy" onerror="this.src='assets/images/photo1.jpg'" />
          </div>
          <figcaption>${item.alt || `Memory #${idx + 1}`}</figcaption>
        </div>
      `;

      const img = card.querySelector("img");
      img.onload = () => img.classList.add("loaded");
      if (img.complete) img.classList.add("loaded");

      card.addEventListener("click", () => openLightbox(item.src, item.alt));
      galleryEl.appendChild(card);
    });

    setupIntersectionObserver();
  }

  function initMemoriesLightbox() {
    const lb = $("lightbox");
    const closeBtn = $("lightboxClose");
    if (!lb) return;

    closeBtn?.addEventListener("click", closeLightbox);
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLightbox();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("is-open")) closeLightbox();
    });
  }

  function openLightbox(src, alt) {
    const lb = $("lightbox");
    const img = $("lightboxImg");
    if (!lb || !img) return;
    img.src = src;
    img.alt = alt || "";
    lb.classList.add("is-open");
  }

  function closeLightbox() {
    const lb = $("lightbox");
    if (lb) lb.classList.remove("is-open");
  }

  /* =========================================================================
     7. Interactive RSVP Section
     ========================================================================= */
  function initRSVP() {
    // Tab switching: Form Internal vs Google Form
    const tabInternal = $("tabInternalForm");
    const tabGoogle = $("tabGoogleForm");
    const paneInternal = $("paneInternalForm");
    const paneGoogle = $("paneGoogleForm");

    tabInternal?.addEventListener("click", () => {
      tabInternal.classList.add("active");
      tabInternal.setAttribute("aria-selected", "true");
      tabGoogle.classList.remove("active");
      tabGoogle.setAttribute("aria-selected", "false");
      paneInternal.classList.add("active");
      paneGoogle.classList.remove("active");
    });

    tabGoogle?.addEventListener("click", () => {
      tabGoogle.classList.add("active");
      tabGoogle.setAttribute("aria-selected", "true");
      tabInternal.classList.remove("active");
      tabInternal.setAttribute("aria-selected", "false");
      paneGoogle.classList.add("active");
      paneInternal.classList.remove("active");
      loadGoogleFormIframe();
    });

    const yesBtn = $("rsvpYes");
    const noBtn = $("rsvpNo");
    const form = $("rsvpForm");
    const nameInput = $("rsvpName");
    const guestsInput = $("rsvpGuests");
    const guestMinus = $("guestMinus");
    const guestPlus = $("guestPlus");
    const msgInput = $("rsvpMessage");
    const msgLabel = $("msgLabel");
    const errEl = $("rsvpError");
    const submitBtn = $("rsvpSubmit");
    const thanksBox = $("rsvpThanks");
    const thanksText = $("rsvpThanksText");
    const againBtn = $("rsvpAgain");

    let attending = null;

    yesBtn?.addEventListener("click", () => {
      attending = true;
      yesBtn.setAttribute("aria-checked", "true");
      noBtn.setAttribute("aria-checked", "false");
      form.classList.remove("no-guests");
      form.classList.add("is-visible");
      msgLabel.textContent = "Birthday Wish";
      msgInput.placeholder = `Write a sweet birthday wish for ${config.person1} & ${config.person2}...`;
      errEl.textContent = "";
    });

    noBtn?.addEventListener("click", () => {
      attending = false;
      noBtn.setAttribute("aria-checked", "true");
      yesBtn.setAttribute("aria-checked", "false");
      form.classList.add("no-guests");
      form.classList.add("is-visible");
      msgLabel.textContent = "Send a Note";
      msgInput.placeholder = `Wish ${config.person1} & ${config.person2} a wonderful celebration...`;
      errEl.textContent = "";
    });

    guestMinus?.addEventListener("click", () => {
      const v = Math.max(1, parseInt(guestsInput.value || "1", 10) - 1);
      guestsInput.value = v;
    });

    guestPlus?.addEventListener("click", () => {
      const v = Math.min(10, parseInt(guestsInput.value || "1", 10) + 1);
      guestsInput.value = v;
    });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (nameInput.value || "").trim();
      if (!name) {
        errEl.textContent = "Please enter your name.";
        nameInput.focus();
        return;
      }
      errEl.textContent = "";

      const rsvpData = {
        type: "rsvp",
        id: "rsvp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        attending,
        name,
        guests: attending ? parseInt(guestsInput.value || "1", 10) : 0,
        message: (msgInput.value || "").trim(),
      };

      // Send to Python via StreamlitBridge
      if (window.StreamlitBridge) {
        window.StreamlitBridge.setValue(rsvpData);
      }

      // UI Feedback
      form.classList.remove("is-visible");
      thanksBox.classList.add("is-visible");
      if (attending) {
        thanksText.textContent = "Thank you! We can't wait to celebrate with you! 🎉";
        if (fx) {
          fx.confetti({ count: 120, power: 16 });
          fx.sparkles(40);
        }
      } else {
        thanksText.textContent = "Thank you for letting us know. You will be missed! ❤️";
      }
    });

    againBtn?.addEventListener("click", () => {
      thanksBox.classList.remove("is-visible");
      form.classList.add("is-visible");
    });
  }

  function initGoogleFormSetup() {
    const iframe = $("gformIframe");
    const popout = $("gformPopout");
    const setupCard = $("gformSetupCard");
    const wrapper = $("gformWrapper");
    const customInput = $("gformCustomInput");
    const saveBtn = $("gformSaveBtn");
    const editBtn = $("gformEditBtn");

    const getValidUrl = () => {
      let stored = "";
      try {
        stored = (localStorage.getItem("birthday_gform_url") || "").trim();
      } catch (e) {}
      if (stored && !stored.includes("-example")) return stored;

      const cfgUrl = (config.googleFormUrl || "").trim();
      if (cfgUrl && !cfgUrl.includes("-example")) return cfgUrl;

      return "";
    };

    const renderUrl = (rawUrl) => {
      let url = (rawUrl || "").trim();
      if (!url || url.includes("-example")) {
        if (setupCard) setupCard.style.display = "block";
        if (wrapper) wrapper.style.display = "none";
        if (popout) popout.style.display = "none";
        return;
      }

      if (!url.includes("embedded=true")) {
        url += (url.includes("?") ? "&" : "?") + "embedded=true";
      }

      if (iframe && iframe.getAttribute("src") !== url) {
        iframe.src = url;
      }
      const cleanUrl = url.replace("?embedded=true", "").replace("&embedded=true", "");
      if (popout) {
        popout.href = cleanUrl;
        popout.style.display = "inline-block";
      }
      if (setupCard) setupCard.style.display = "none";
      if (wrapper) wrapper.style.display = "block";
    };

    const activeUrl = getValidUrl();
    if (customInput && activeUrl) customInput.value = activeUrl;
    renderUrl(activeUrl);

    if (saveBtn && !saveBtn._bound) {
      saveBtn._bound = true;
      saveBtn.addEventListener("click", () => {
        const val = (customInput?.value || "").trim();
        if (!val || !val.includes("docs.google.com/forms")) {
          alert("Silakan masukkan tautan Google Form yang valid (contoh: https://docs.google.com/forms/d/e/.../viewform)");
          return;
        }
        try {
          localStorage.setItem("birthday_gform_url", val);
        } catch (e) {}
        renderUrl(val);
      });
    }

    if (editBtn && !editBtn._bound) {
      editBtn._bound = true;
      editBtn.addEventListener("click", () => {
        if (setupCard) {
          setupCard.style.display = setupCard.style.display === "none" ? "block" : "none";
        }
      });
    }
  }

  function handleRsvpAck(ack) {
    const statusEl = $("rsvpStatus");
    if (!statusEl || !ack) return;
    if (ack.ok) {
      statusEl.textContent = ack.where === "sheets" ? "✓ Synced with Google Sheets" : "✓ Saved in guest list";
    }
  }

  /* =========================================================================
     8. "Celebrate With Us 🎉" Grand Climax Button
     ========================================================================= */
  function initCelebrateButton() {
    const btn = $("celebrateBtn");
    const msg = $("celebrateMsg");
    if (!btn) return;

    let lastCelebrateTrigger = 0;
    function triggerCelebrate(e) {
      if (e) {
        try { e.stopPropagation(); } catch (_) {}
      }
      const now = Date.now();
      if (now - lastCelebrateTrigger < 800) return;
      lastCelebrateTrigger = now;

      // Smoothly stop pulse without jarring visual jump
      btn.style.animation = "none";
      btn.classList.remove("btn--pulse");

      // 1. Confetti Cannons + Fireworks Show + Balloon Boost
      if (fx) {
        if (typeof fx.confettiCannons === "function") fx.confettiCannons();
        if (typeof fx.confettiRain === "function") fx.confettiRain(4000);
        if (typeof fx.fireworksShow === "function") fx.fireworksShow(4500, 300);
        if (typeof fx.sparkles === "function") fx.sparkles(70);
      }

      if (bgScene && typeof bgScene.burst === "function") {
        bgScene.burst();
      }

      // 2. Play music if not playing
      try {
        if (player && !player.playing && typeof player.play === "function") {
          player.play();
        }
      } catch (err) {
        console.warn("Audio play warning:", err);
      }

      // 3. Reveal message smoothly with GPU hardware acceleration
      if (window.gsap && msg) {
        gsap.to(msg, {
          opacity: 1,
          scale: 1,
          duration: 1.1,
          ease: "back.out(1.4)",
        });
      } else if (msg) {
        msg.style.opacity = "1";
        msg.style.transform = "scale(1)";
      }
    }

    btn.addEventListener("click", triggerCelebrate);
    btn.addEventListener("pointerup", (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        triggerCelebrate(e);
      }
    });

    window.triggerCelebrate = triggerCelebrate;

    // Final section ambient fireworks
    const finalSection = $("final");
    const finalFxCanvas = $("finalFx");
    if (finalFxCanvas && window.FX) {
      const finalFx = new window.FX(finalFxCanvas, { fixed: false, max: 400 });
      let finalFired = false;
      const fObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !finalFired) {
            finalFired = true;
            finalFx.fireworksShow(7000, 500);
          }
        },
        { threshold: 0.3 }
      );
      if (finalSection) fObserver.observe(finalSection);
    }
  }

  /* =========================================================================
     9. Manual Section Navigation & Active State (IntersectionObserver)
     ========================================================================= */
  const sectionList = ["intro", "invitation", "celebrants", "cake", "details", "location", "memories", "rsvp", "final"];
  const sectionIcons = {
    intro: "🏠",
    invitation: "💌",
    celebrants: "👥",
    cake: "🎂",
    details: "📅",
    location: "📍",
    memories: "📸",
    rsvp: "✉️",
    final: "❤️"
  };

  function scrollToSectionElement(el) {
    if (!el) return;
    try {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const targetY = rect.top + scrollTop;

      if (typeof window.smoothScrollTo === "function") {
        window.smoothScrollTo(targetY, 450);
      } else {
        window.scrollTo({ top: targetY, behavior: "smooth" });
      }
    } catch (_) {}

    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (_) {}
  }

  function scrollNextSection() {
    const curY = (window.pageYOffset || document.documentElement.scrollTop || 0) + window.innerHeight * 0.2;
    let nextEl = null;

    for (const id of sectionList) {
      const el = $(id);
      if (el && el.offsetTop > curY + 15) {
        nextEl = el;
        break;
      }
    }

    if (nextEl) {
      scrollToSectionElement(nextEl);
    } else {
      if (typeof window.smoothScrollTo === "function") {
        window.smoothScrollTo(0, 450);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }
  window.scrollNextSection = scrollNextSection;

  function scrollPrevSection() {
    const curY = (window.pageYOffset || document.documentElement.scrollTop || 0) - 80;
    let prevEl = null;

    for (let i = sectionList.length - 1; i >= 0; i--) {
      const el = $(sectionList[i]);
      if (el && el.offsetTop < curY) {
        prevEl = el;
        break;
      }
    }

    if (prevEl) {
      scrollToSectionElement(prevEl);
    } else {
      const lastEl = $(sectionList[sectionList.length - 1]);
      if (lastEl) scrollToSectionElement(lastEl);
    }
  }
  window.scrollPrevSection = scrollPrevSection;

  function initScrollNavigation() {
    const quickNav = $("quickNav");
    const arrowBtn = $("quickNavArrowBtn");
    const arrowIcon = $("quickNavArrowIcon");
    const topBtn = $("scrollTopBtn");
    const bottomBtn = $("scrollBottomBtn");
    const finalBackTop = $("finalBackTopBtn");
    const heroScrollCue = document.querySelector(".scroll-cue");
    const navDots = $$(".quick-nav__dot");

    function setCollapsed(collapsed) {
      if (!quickNav) return;
      if (collapsed) {
        quickNav.classList.add("is-collapsed");
        if (arrowIcon) arrowIcon.textContent = "▶";
        arrowBtn?.setAttribute("title", "Buka Navigasi ke Samping (▶)");
      } else {
        quickNav.classList.remove("is-collapsed");
        if (arrowIcon) arrowIcon.textContent = "◀";
        arrowBtn?.setAttribute("title", "Tutup Navigasi ke Samping (◀)");
      }
    }

    // Toggle navigation drawer sideways
    arrowBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isCurrentlyCollapsed = quickNav?.classList.contains("is-collapsed");
      setCollapsed(!isCurrentlyCollapsed);
    });

    // Start open on desktop, or collapsed on narrow mobile screens
    if (window.innerWidth <= 600) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }

    // Nav dots click (Manual shortcut to section)
    navDots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = dot.getAttribute("href");
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          scrollToSectionElement(targetEl);
        }
        // Auto-close on mobile after selecting a section
        if (window.innerWidth <= 768) {
          setCollapsed(true);
        }
      });
    });

    // Close on Escape key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && quickNav && !quickNav.classList.contains("is-collapsed")) {
        setCollapsed(true);
      }
    });

    // Top button (▲) -> Scroll to previous section
    topBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      scrollPrevSection();
    });

    finalBackTop?.addEventListener("click", () => {
      if (typeof window.smoothScrollTo === "function") {
        window.smoothScrollTo(0, 450);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    // Bottom button (▼) -> Scroll to next section
    bottomBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      scrollNextSection();
    });

    // Hero cue click
    heroScrollCue?.addEventListener("click", (e) => {
      e.preventDefault();
      const cel = $("celebrants");
      scrollToSectionElement(cel);
    });

    // Active Navigation indicator using IntersectionObserver
    setupNavIntersectionObserver();
  }

  function setupNavIntersectionObserver() {
    const navDots = $$(".quick-nav__dot");
    const toggleIcon = $("quickNavToggleIcon");
    const sectionEls = sectionList.map((id) => $(id)).filter(Boolean);

    if (!sectionEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navDots.forEach((dot) => {
              const href = dot.getAttribute("href");
              dot.classList.toggle("active", href === `#${id}`);
            });
            // Update toggle button icon to reflect current active section
            if (toggleIcon && sectionIcons[id]) {
              toggleIcon.textContent = sectionIcons[id];
            }
          }
        });
      },
      { threshold: 0.25 }
    );

    sectionEls.forEach((el) => observer.observe(el));
  }

  /* =========================================================================
     10. Native Keyboard Navigation (Focus helper without hijacking wheel)
     ========================================================================= */
  function initKeyboardNavigation() {
    // Automatically focus window when mouse moves inside
    window.addEventListener("mouseenter", () => {
      try { window.focus(); } catch (e) {}
    });
    window.addEventListener("pointerdown", () => {
      try { window.focus(); } catch (e) {}
    });
  }

  /* =========================================================================
     11. Scroll Reveal Animations
     ========================================================================= */
  function setupIntersectionObserver() {
    const items = $$(".reveal-up:not(.in)");
    if (!items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    items.forEach((it) => observer.observe(it));
  }
})();
