/* Three.js background: floating 3D balloons (latex, metallic, heart, number,
 * transparent-with-confetti), sparkle particles, soft lighting and a
 * mouse / scroll parallax camera.  Falls back to CSS balloons without WebGL.
 */
(function () {
  const isMobile = matchMedia("(max-width: 720px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function webglAvailable() {
    try {
      if (!window.THREE) return false;
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) {
      return false;
    }
  }

  /* A soft pastel "studio" used to generate reflections for metallic balloons. */
  function buildEnvScene() {
    const s = new THREE.Scene();
    const geo = new THREE.SphereGeometry(50, 32, 16);
    const pos = geo.attributes.position;
    const top = new THREE.Color(0xfff3fa), mid = new THREE.Color(0xe6d8ff), bot = new THREE.Color(0xbcd4ff);
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 50;
      const c = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(bot, -y);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const panel = (hex, k, x, y, z, w, h) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      s.add(m);
    };
    panel(0xffffff, 5, 0, 32, 8, 34, 12);
    panel(0xffd3ea, 2.5, -32, 6, 10, 14, 22);
    panel(0xfff0c4, 2.5, 30, 2, 6, 14, 22);
    panel(0xd9ccff, 1.6, 0, -6, -34, 40, 14);
    return s;
  }

  function makeEnvironment(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(buildEnvScene(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }

  function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.45)"));
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const PASTEL = [0xf7a8c8, 0xc9b3ff, 0xa9d6ff, 0xffd59e, 0xffc0d6, 0xbdebd8, 0xe4b4ff, 0xfff1f6];
  const METAL = [0xe6b85c, 0xeaa79b, 0xdfe3ee, 0xf08ab8, 0xb9a3f5];
  const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.149.0";

  class BalloonScene {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.opts = opts;
      this.items = [];
      this.speedMul = 1;
      this.boostUntil = 0;
      this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      this.scrollY = 0;
      this.camZ = 22;
      this.clock = new THREE.Clock();

      const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" }));
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75));
      r.setSize(innerWidth, innerHeight, false);
      r.outputEncoding = THREE.sRGBEncoding;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;

      const scene = (this.scene = new THREE.Scene());
      scene.fog = new THREE.Fog(0xeadcff, 20, 46);
      scene.environment = makeEnvironment(r);

      this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
      this.camera.position.set(0, 0, this.camZ);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xf0c6ff, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(6, 10, 10);
      scene.add(key);
      const pink = new THREE.PointLight(0xff9ed0, 1.2, 50); pink.position.set(-10, -4, 8); scene.add(pink);
      const gold = new THREE.PointLight(0xffd27a, 1.0, 50); gold.position.set(10, 6, 6); scene.add(gold);

      this.buildShared();
      this.spawnBalloons(isMobile ? 12 : 24);
      this.buildParticles(isMobile ? 160 : 420);
      if (opts.numbers) this.addNumberBalloons(String(opts.numbers));

      this.onResize = this.onResize.bind(this);
      this.loop = this.loop.bind(this);
      addEventListener("resize", this.onResize);
      addEventListener("pointermove", (e) => {
        this.mouse.tx = (e.clientX / innerWidth) * 2 - 1;
        this.mouse.ty = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
      addEventListener("scroll", () => { this.scrollY = scrollY; }, { passive: true });
      requestAnimationFrame(this.loop);
    }

    buildShared() {
      // Teardrop balloon body
      const g = new THREE.SphereGeometry(1, isMobile ? 24 : 40, isMobile ? 18 : 30);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y < 0) {
          const k = 1 + y * 0.22;
          p.setX(i, p.getX(i) * k);
          p.setZ(i, p.getZ(i) * k);
        }
        p.setY(i, y * 1.18);
      }
      g.computeVertexNormals();
      this.balloonGeo = g;
      this.knotGeo = new THREE.ConeGeometry(0.13, 0.22, 12);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.18, -1.1, 0),
        new THREE.Vector3(-0.12, -2.2, 0.05), new THREE.Vector3(0.08, -3.4, 0),
      ]);
      this.stringGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
      this.stringMat = new THREE.LineBasicMaterial({ color: 0xa88cc9, transparent: true, opacity: 0.55 });

      const hs = new THREE.Shape();
      hs.moveTo(0, -1.0);
      hs.bezierCurveTo(-0.3, -0.72, -1.2, -0.22, -1.2, 0.38);
      hs.bezierCurveTo(-1.2, 0.98, -0.52, 1.18, 0, 0.72);
      hs.bezierCurveTo(0.52, 1.18, 1.2, 0.98, 1.2, 0.38);
      hs.bezierCurveTo(1.2, -0.22, 0.3, -0.72, 0, -1.0);
      const hg = new THREE.ExtrudeGeometry(hs, {
        depth: 0.45, bevelEnabled: true, bevelThickness: 0.38, bevelSize: 0.32,
        bevelSegments: isMobile ? 4 : 8, curveSegments: isMobile ? 16 : 28,
      });
      hg.center();
      hg.computeVertexNormals();
      this.heartGeo = hg;

      this.sparkTex = glowTexture();
    }

    latexMat(color) {
      return isMobile
        ? new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.05, envMapIntensity: 0.9 })
        : new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.22, envMapIntensity: 0.9 });
    }

    metalMat(color) {
      return new THREE.MeshStandardMaterial({ color, roughness: 0.16, metalness: 1, envMapIntensity: 1.35 });
    }

    makeBalloon(type) {
      const group = new THREE.Group();
      let body, knotY = -1.32, knotColor;
      if (type === "heart") {
        const c = pick([0xff6f9f, 0xf7a8c8, 0xe2669c, 0xff8fab]);
        body = new THREE.Mesh(this.heartGeo, Math.random() < 0.5 ? this.metalMat(c) : this.latexMat(c));
        body.scale.setScalar(0.85);
        knotY = -1.18; knotColor = c;
      } else if (type === "metal") {
        const c = pick(METAL);
        body = new THREE.Mesh(this.balloonGeo, this.metalMat(c));
        knotColor = c;
      } else if (type === "clear") {
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0,
          clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, envMapIntensity: 1.4,
        });
        body = new THREE.Mesh(this.balloonGeo, mat);
        // confetti inside the transparent balloon
        const n = 40, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const a = rand(0, 6.28), rr = rand(0, 0.75), h = rand(-0.9, 0.6);
          pos.set([Math.cos(a) * rr, h, Math.sin(a) * rr], i * 3);
          const cc = new THREE.Color(pick([0xe8c46a, 0xf5a9cb, 0xb9a3f5, 0xffffff]));
          col.set([cc.r, cc.g, cc.b], i * 3);
        }
        const cg = new THREE.BufferGeometry();
        cg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        cg.setAttribute("color", new THREE.BufferAttribute(col, 3));
        const dots = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.12, vertexColors: true }));
        group.add(dots);
        knotColor = 0xffffff;
      } else {
        const c = pick(PASTEL);
        body = new THREE.Mesh(this.balloonGeo, this.latexMat(c));
        knotColor = c;
      }
      group.add(body);
      const knot = new THREE.Mesh(this.knotGeo, new THREE.MeshStandardMaterial({ color: knotColor, roughness: 0.4 }));
      knot.position.y = knotY;
      group.add(knot);
      const str = new THREE.Line(this.stringGeo, this.stringMat);
      str.position.y = knotY - 0.1;
      group.add(str);
      return group;
    }

    halfHeightAt(z) {
      return Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * (this.camera.position.z - z);
    }

    place(it, initial) {
      const z = it.obj.position.z;
      const hh = this.halfHeightAt(z);
      const hw = hh * this.camera.aspect;
      it.baseX = rand(-hw * 0.95, hw * 0.95);
      it.obj.position.y = initial ? rand(-hh, hh) : -hh - rand(3, 8);
      it.top = hh + 4;
    }

    addItem(obj, opts = {}) {
      const z = opts.z ?? rand(-16, 3);
      obj.position.z = z;
      const s = opts.scale ?? rand(0.75, 1.35) * (isMobile ? 0.85 : 1);
      obj.scale.multiplyScalar(s);
      const it = {
        obj, speed: opts.speed ?? rand(0.7, 1.5), swayA: rand(0.3, 0.9), swayF: rand(0.25, 0.6),
        phase: rand(0, 6.28), rotS: rand(-0.35, 0.35), tilt: rand(-0.15, 0.15),
      };
      this.place(it, true);
      this.scene.add(obj);
      this.items.push(it);
      return it;
    }

    spawnBalloons(n) {
      for (let i = 0; i < n; i++) {
        const r = Math.random();
        const type = r < 0.5 ? "latex" : r < 0.7 ? "metal" : r < 0.87 ? "heart" : "clear";
        this.addItem(this.makeBalloon(type));
      }
    }

    async addNumberBalloons(digits) {
      try {
        if (!THREE.FontLoader) await loadScript(`${THREE_CDN}/examples/js/loaders/FontLoader.js`);
        if (!THREE.TextGeometry) await loadScript(`${THREE_CDN}/examples/js/geometries/TextGeometry.js`);
        const font = await new Promise((res, rej) =>
          new THREE.FontLoader().load(`${THREE_CDN}/examples/fonts/helvetiker_bold.typeface.json`, res, undefined, rej));
        const chars = digits.replace(/\s/g, "").slice(0, 4).split("");
        const copies = isMobile ? 1 : 2;
        for (let c = 0; c < copies; c++) {
          chars.forEach((ch, idx) => {
            const geo = new THREE.TextGeometry(ch, {
              font, size: 2.2, height: 0.55, curveSegments: isMobile ? 6 : 10,
              bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.16, bevelSegments: isMobile ? 3 : 6,
            });
            geo.center();
            const g = new THREE.Group();
            g.add(new THREE.Mesh(geo, this.metalMat(c === 0 ? 0xe6b85c : 0xeaa79b)));
            const str = new THREE.Line(this.stringGeo, this.stringMat);
            str.position.y = -1.5;
            g.add(str);
            const it = this.addItem(g, { z: rand(-10, -4), scale: 0.9, speed: rand(0.55, 0.8) });
            it.swayA = 0.35; it.rotS = rand(-0.12, 0.12);
            it.baseX += idx * 2.2;
          });
        }
      } catch (e) {
        console.info("Number balloons skipped:", e && e.message);
      }
    }

    buildParticles(n) {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const palette = [0xffffff, 0xfff1c4, 0xffc6e3, 0xd8c8ff, 0xf7e3a3];
      for (let i = 0; i < n; i++) {
        pos.set([rand(-30, 30), rand(-18, 18), rand(-22, 10)], i * 3);
        const c = new THREE.Color(pick(palette));
        col.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      this.particleMat = new THREE.PointsMaterial({
        size: 0.42, map: this.sparkTex, vertexColors: true, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.9,
      });
      this.particles = new THREE.Points(geo, this.particleMat);
      this.scene.add(this.particles);
    }

    /* ---------- Public API ---------- */
    boost(mult = 4, ms = 2500) {
      this.speedMul = mult;
      this.boostUntil = performance.now() + ms;
    }

    burst() {
      // Smooth burst without popping visible balloons out of thin air:
      this.items.forEach((it) => {
        const hh = this.halfHeightAt(it.obj.position.z);
        // Only recycle balloons that are already out of view above the top
        if (it.obj.position.y > hh) {
          it.obj.position.y = -hh - rand(1, 6);
        }
      });
      this.boost(4.5, 3000);
    }

    zoomTo(z, duration = 3) {
      if (window.gsap) gsap.to(this, { camZ: z, duration, ease: "power3.inOut" });
      else this.camZ = z;
    }

    onResize() {
      const newW = innerWidth;
      const newH = innerHeight;
      if (this.lastW && Math.abs(this.lastW - newW) < 2 && Math.abs(this.lastH - newH) < 80) {
        return;
      }
      this.lastW = newW;
      this.lastH = newH;
      this.renderer.setSize(newW, newH, false);
      this.camera.aspect = newW / newH;
      this.camera.updateProjectionMatrix();
    }

    loop() {
      requestAnimationFrame(this.loop);
      if (document.hidden) { this.clock.getDelta(); return; }
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.elapsedTime;

      if (this.boostUntil && performance.now() > this.boostUntil) {
        this.speedMul += (1 - this.speedMul) * Math.min(1, dt * 1.5);
        if (Math.abs(this.speedMul - 1) < 0.01) { this.speedMul = 1; this.boostUntil = 0; }
      }

      for (const it of this.items) {
        const o = it.obj;
        o.position.y += it.speed * this.speedMul * dt;
        o.position.x = it.baseX + Math.sin(t * it.swayF + it.phase) * it.swayA;
        o.rotation.y += it.rotS * dt;
        o.rotation.z = it.tilt + Math.sin(t * it.swayF * 1.3 + it.phase) * 0.08;
        if (o.position.y > it.top) this.place(it, false);
      }

      const pp = this.particles.geometry.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        let y = pp.getY(i) + dt * 0.35 * this.speedMul;
        if (y > 18) y = -18;
        pp.setY(i, y);
      }
      pp.needsUpdate = true;
      this.particleMat.opacity = 0.7 + Math.sin(t * 2) * 0.2;

      // parallax camera
      const m = this.mouse;
      m.x += (m.tx - m.x) * 0.04;
      m.y += (m.ty - m.y) * 0.04;
      const cam = this.camera;
      cam.position.x = m.x * 1.4;
      cam.position.y = -m.y * 0.9 - this.scrollY * 0.0025;
      cam.position.z = this.camZ;
      cam.lookAt(0, cam.position.y * 0.6, 0);

      this.renderer.render(this.scene, cam);
    }
  }

  window.Three3D = { isMobile, webglAvailable, makeEnvironment, glowTexture, loadScript, THREE_CDN, BalloonScene };
})();
