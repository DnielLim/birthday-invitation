/* Minimal Streamlit component bridge (no build step / npm needed).
 * Implements the same postMessage protocol as streamlit-component-lib.
 */
(function () {
  const listeners = [];
  let connected = false;
  let lastArgs = null;

  function send(type, data) {
    if (window.parent === window) return;
    window.parent.postMessage(Object.assign({ isStreamlitMessage: true, type }, data || {}), "*");
  }

  window.addEventListener("message", (ev) => {
    const msg = ev.data;
    if (!msg) return;

    // Direct scroll events forwarded from Streamlit outer window
    if (msg.isScrollMessage) {
      if (msg.type === "scroll_next") {
        if (typeof window.scrollNextSection === "function") window.scrollNextSection();
        else window.scrollBy({ top: 300, behavior: "smooth" });
      } else if (msg.type === "scroll_prev") {
        if (typeof window.scrollPrevSection === "function") window.scrollPrevSection();
        else window.scrollBy({ top: -300, behavior: "smooth" });
      } else if (msg.type === "scroll_by") {
        window.scrollBy({ top: msg.dy, behavior: msg.smooth ? "smooth" : "auto" });
      } else if (msg.type === "scroll_to") {
        window.scrollTo({ top: msg.y, behavior: msg.smooth ? "smooth" : "auto" });
      }
      return;
    }

    if (msg.type !== "streamlit:render") return;
    connected = true;
    lastArgs = msg.args || {};
    listeners.forEach((fn) => {
      try { fn(lastArgs); } catch (e) { console.error(e); }
    });
  });

  window.StreamlitBridge = {
    get connected() { return connected; },
    get args() { return lastArgs; },
    onRender(fn) {
      listeners.push(fn);
      if (lastArgs) fn(lastArgs);
    },
    setValue(value) { send("streamlit:setComponentValue", { value, dataType: "json" }); },
    setHeight(h) { send("streamlit:setFrameHeight", { height: h }); },
    ready() { send("streamlit:componentReady", { apiVersion: 1 }); },
  };

  // Make the component iframe fill the whole browser viewport (backup for the
  // CSS injected by app.py) and ensure scrolling is unlocked.
  try {
    const fe = window.frameElement;
    if (fe) {
      fe.removeAttribute("scrolling");
      fe.setAttribute("scrolling", "yes");
      fe.style.overflow = "auto";
      Object.assign(fe.style, {
        position: "fixed", inset: "0", width: "100vw", height: "100vh",
        border: "0", zIndex: "999990",
      });
      fe.setAttribute("allow", (fe.getAttribute("allow") || "") + "; autoplay; fullscreen");
    }
  } catch (e) { /* cross-origin: rely on app.py CSS */ }

  // =========================================================================
  // Buttery-smooth wheel physics based on user preferences:
  // - Gerakan normal: ~200 px (rekomendasi)
  // - Gerakan pelan: 100–150 px
  // - Gerakan cepat: 300–500 px
  // - Smooth duration: ~400 ms (ease-out curve)
  // =========================================================================
  let targetScrollY = window.scrollY;
  let animStartScrollY = window.scrollY;
  let animStartTime = 0;
  let animDuration = 400;
  let isScrollAnimating = false;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothScrollTo(target, duration = 400) {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    targetScrollY = Math.max(0, Math.min(target, maxScroll));
    animStartScrollY = window.scrollY;
    animStartTime = performance.now();
    animDuration = duration;

    if (!isScrollAnimating) {
      isScrollAnimating = true;
      function step(now) {
        const elapsed = now - animStartTime;
        const progress = Math.min(1, elapsed / animDuration);
        const ease = easeOutCubic(progress);
        const currentY = animStartScrollY + (targetScrollY - animStartScrollY) * ease;
        window.scrollTo(0, currentY);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          isScrollAnimating = false;
        }
      }
      requestAnimationFrame(step);
    }
  }
  window.smoothScrollTo = smoothScrollTo;

  function handleCustomWheel(e) {
    // Let internally scrollable elements scroll natively
    let el = e.target;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        return;
      }
      el = el.parentElement;
    }

    if (e.cancelable) e.preventDefault();

    const sign = Math.sign(e.deltaY) || 1;
    const abs = Math.abs(e.deltaY);
    let distance = 200; // Rekomendasi: 200 px

    if (abs < 60) {
      // Scroll pelan: 100–150 px
      distance = 100 + (abs / 60) * 50;
    } else if (abs > 160) {
      // Scroll cepat: 300–500 px
      distance = Math.min(500, 200 + ((abs - 160) / 200) * 300);
    }

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    if (!isScrollAnimating) {
      targetScrollY = window.scrollY;
    }

    targetScrollY = Math.max(0, Math.min(targetScrollY + sign * distance, maxScroll));
    animStartScrollY = window.scrollY;
    animStartTime = performance.now();
    animDuration = Math.min(500, Math.max(350, 400));

    if (!isScrollAnimating) {
      isScrollAnimating = true;
      function step(now) {
        const elapsed = now - animStartTime;
        const progress = Math.min(1, elapsed / animDuration);
        const ease = easeOutCubic(progress);
        const currentY = animStartScrollY + (targetScrollY - animStartScrollY) * ease;
        window.scrollTo(0, currentY);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          isScrollAnimating = false;
        }
      }
      requestAnimationFrame(step);
    }
  }

  window.addEventListener("scroll", () => {
    if (!isScrollAnimating) {
      targetScrollY = window.scrollY;
    }
  }, { passive: true });

  window.addEventListener("wheel", handleCustomWheel, { passive: false });
  window.addEventListener("touchstart", () => {
    isScrollAnimating = false;
  }, { passive: true });

  window.StreamlitBridge.ready();
  window.StreamlitBridge.setHeight(window.innerHeight || 800);

  // Directly attach wheel, keydown, and touch listeners to window.parent (Streamlit host)
  // so mouse wheel and keyboard scrolling work seamlessly without needing a prior click!
  try {
    if (window.parent && window.parent !== window) {
      window.focus();

      window.parent.addEventListener("wheel", handleCustomWheel, { passive: false });

      window.parent.addEventListener("keydown", (e) => {
        const tag = (window.parent.document.activeElement && window.parent.document.activeElement.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        if (e.key === "ArrowDown") {
          window.scrollBy({ top: 180, behavior: "smooth" });
          e.preventDefault();
        } else if (e.key === "ArrowUp") {
          window.scrollBy({ top: -180, behavior: "smooth" });
          e.preventDefault();
        } else if (e.key === "PageDown" || (e.code === "Space" && !e.shiftKey)) {
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
          e.preventDefault();
        } else if (e.key === "PageUp" || (e.code === "Space" && e.shiftKey)) {
          window.scrollBy({ top: -window.innerHeight * 0.85, behavior: "smooth" });
          e.preventDefault();
        } else if (e.key === "Home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          e.preventDefault();
        } else if (e.key === "End") {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
          e.preventDefault();
        }
      });

      let ty = 0;
      window.parent.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) ty = e.touches[0].clientY;
      }, { passive: true });
      window.parent.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches[0]) {
          const dy = ty - e.touches[0].clientY;
          ty = e.touches[0].clientY;
          window.scrollBy({ top: dy, behavior: "auto" });
        }
      }, { passive: true });

      // Automatically capture focus on mouse hover over parent
      window.parent.addEventListener("mousemove", () => {
        if (document.activeElement !== document.body) {
          window.focus();
        }
      }, { passive: true });
    }
  } catch (e) {
    // Cross-origin fallback handled via postMessage
  }
})();
