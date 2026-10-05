/* 2D canvas effects engine: confetti, fireworks and sparkles.
 * The loop only runs while particles are alive (zero cost when idle).
 */
(function () {
  const PALETTE = ["#f5a9cb", "#e2669c", "#b9a3f5", "#7d5bd6", "#f7e3a3", "#e8c46a", "#9fd8ff", "#ffffff", "#ffb4a2"];
  const FIREWORK = ["#ff7eb6", "#ffd166", "#a78bfa", "#7dd3fc", "#fca5a5", "#fde68a", "#f0abfc", "#ffffff"];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const isMobile = matchMedia("(max-width: 720px)").matches;

  class FX {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.parts = [];
      this.rockets = [];
      this.running = false;
      this.max = opts.max || (isMobile ? 450 : 1100);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.fixed = opts.fixed !== false;
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      window.addEventListener("resize", this.resize);
      this.resize();
    }

    resize() {
      const r = this.fixed ? { width: innerWidth, height: innerHeight } : this.canvas.getBoundingClientRect();
      const newW = Math.max(1, Math.round(r.width));
      const newH = Math.max(1, Math.round(r.height));
      // Avoid clearing canvas and causing mobile scroll flicker if size hasn't meaningfully changed
      if (this.w && Math.abs(this.w - newW) < 2 && Math.abs(this.h - newH) < 80) {
        return;
      }
      this.w = newW;
      this.h = newH;
      this.canvas.width = this.w * this.dpr;
      this.canvas.height = this.h * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    start() {
      if (!this.running) {
        this.running = true;
        this.last = performance.now();
        requestAnimationFrame(this.tick);
      }
    }

    add(p) {
      if (this.parts.length < this.max) this.parts.push(p);
    }

    /* ---------- Confetti ---------- */
    confetti({ x = this.w / 2, y = this.h / 2, count = 120, spread = 70, angle = -90, power = 14, gravity = 0.32 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = ((angle + rand(-spread, spread)) * Math.PI) / 180;
        const v = rand(power * 0.45, power);
        this.add({
          kind: "confetti", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: gravity, drag: 0.985, life: 1, decay: rand(0.004, 0.009),
          size: rand(6, 11), color: pick(PALETTE), rot: rand(0, 6.28), vr: rand(-0.25, 0.25),
          wob: rand(0, 6.28), vw: rand(0.05, 0.15), shape: Math.random() < 0.2 ? "circle" : Math.random() < 0.15 ? "heart" : "rect",
        });
      }
      this.start();
    }

    confettiCannons() {
      const n = isMobile ? 70 : 140;
      this.confetti({ x: 0, y: this.h * 0.75, angle: -55, spread: 22, count: n, power: 22 });
      this.confetti({ x: this.w, y: this.h * 0.75, angle: -125, spread: 22, count: n, power: 22 });
    }

    confettiRain(duration = 3000) {
      const end = performance.now() + duration;
      const drop = () => {
        for (let i = 0; i < (isMobile ? 3 : 6); i++) {
          this.add({
            kind: "confetti", x: rand(0, this.w), y: -20, vx: rand(-1, 1), vy: rand(2, 4),
            g: 0.05, drag: 0.995, life: 1, decay: 0.003, size: rand(6, 10), color: pick(PALETTE),
            rot: rand(0, 6.28), vr: rand(-0.2, 0.2), wob: rand(0, 6.28), vw: rand(0.05, 0.12), shape: "rect",
          });
        }
        this.start();
        if (performance.now() < end) requestAnimationFrame(drop);
      };
      drop();
    }

    /* ---------- Sparkles ---------- */
    sparkles(count = 40, area) {
      const a = area || { x: 0, y: 0, w: this.w, h: this.h };
      for (let i = 0; i < count; i++) {
        this.add({
          kind: "sparkle", x: a.x + rand(0, a.w), y: a.y + rand(0, a.h), vx: 0, vy: rand(-0.4, -0.1),
          g: 0, drag: 1, life: 1, decay: rand(0.008, 0.02), size: rand(6, 16), color: pick(["#fff", "#fff3c4", "#ffd6ec", "#e8deff"]),
          rot: rand(0, 6.28), vr: rand(-0.05, 0.05), delay: rand(0, 40),
        });
      }
      this.start();
    }

    /* ---------- Fireworks ---------- */
    firework(x, y) {
      const tx = x ?? rand(this.w * 0.15, this.w * 0.85);
      const ty = y ?? rand(this.h * 0.12, this.h * 0.45);
      this.rockets.push({ x: tx + rand(-40, 40), y: this.h + 10, tx, ty, color: pick(FIREWORK), trail: [] });
      this.start();
    }

    explode(x, y, color) {
      const n = isMobile ? 55 : 95;
      const second = pick(FIREWORK);
      const ring = Math.random() < 0.35;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
        const v = ring ? 5.2 : rand(1.5, 6.5);
        this.add({
          kind: "spark", x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: 0.06, drag: 0.975, life: 1, decay: rand(0.010, 0.018), size: rand(1.6, 2.8),
          color: Math.random() < 0.7 ? color : second, twinkle: Math.random() < 0.3,
        });
      }
      this.add({ kind: "flash", x, y, life: 1, decay: 0.06, size: 70, color, vx: 0, vy: 0, g: 0, drag: 1 });
    }

    fireworksShow(duration = 4000, rate = 360) {
      const end = performance.now() + duration;
      const launch = () => {
        this.firework();
        if (Math.random() < 0.5) setTimeout(() => this.firework(), 120);
        if (performance.now() < end) setTimeout(launch, rate + rand(-120, 160));
      };
      launch();
    }

    /* ---------- Loop ---------- */
    tick(now) {
      const dt = Math.min(2.5, (now - this.last) / 16.67);
      this.last = now;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      // rockets
      for (let i = this.rockets.length - 1; i >= 0; i--) {
        const r = this.rockets[i];
        r.trail.push([r.x, r.y]);
        if (r.trail.length > 10) r.trail.shift();
        r.x += (r.tx - r.x) * 0.06 * dt;
        r.y += (r.ty - r.y) * 0.075 * dt - 2 * dt;
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        r.trail.forEach(([tx, ty], k) => (k ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)));
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
        if (r.y <= r.ty + 6) {
          this.explode(r.x, r.y, r.color);
          this.rockets.splice(i, 1);
        }
      }

      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.px = p.x; p.py = p.y;
        p.vx *= Math.pow(p.drag, dt);
        p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0 || p.y > this.h + 40) { this.parts.splice(i, 1); continue; }

        const alpha = Math.max(0, Math.min(1, p.life * 1.4));
        if (p.kind === "confetti") {
          ctx.globalCompositeOperation = "source-over";
          p.rot += p.vr * dt; p.wob += p.vw * dt;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x + Math.sin(p.wob) * 2, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.wob * 2));
          ctx.fillStyle = p.color;
          if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.4, 0, 6.283); ctx.fill(); }
          else if (p.shape === "heart") { drawHeart(ctx, p.size * 0.9); }
          else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else if (p.kind === "spark") {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = p.twinkle ? alpha * (0.4 + Math.random() * 0.6) : alpha;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else if (p.kind === "flash") {
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, hexA(p.color, 0.55 * p.life));
          g.addColorStop(1, hexA(p.color, 0));
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill();
        } else if (p.kind === "sparkle") {
          ctx.globalCompositeOperation = "lighter";
          p.rot += p.vr * dt;
          const s = p.size * Math.sin(Math.PI * p.life);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          drawStar(ctx, s, p.color);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (this.parts.length || this.rockets.length) requestAnimationFrame(this.tick);
      else { this.running = false; ctx.clearRect(0, 0, this.w, this.h); }
    }
  }

  function drawStar(ctx, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(0, 0, s, 0);
    ctx.quadraticCurveTo(0, 0, 0, s);
    ctx.quadraticCurveTo(0, 0, -s, 0);
    ctx.quadraticCurveTo(0, 0, 0, -s);
    ctx.fill();
  }

  function drawHeart(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.6, -s * 0.2, -s * 0.3, -s * 0.7, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.3, -s * 0.7, s * 0.6, -s * 0.2, 0, s * 0.3);
    ctx.fill();
  }

  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  window.FX = FX;
})();
