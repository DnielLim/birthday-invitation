/* Procedural 3D birthday cake (Three.js) with two named candles, frosting,
 * drips, pearls, berries, sprinkles, sparkles and a soft glow.
 * Optionally loads assets/3d/cake.glb instead of the procedural tiers.
 */
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function cleanNameText(str) {
    if (!str) return "Alvien & Vinella";
    let clean = String(str).replace(/<[^>]*>/g, "");
    clean = clean.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    clean = clean.replace(/\b2th\b/gi, "2nd").replace(/\b1th\b/gi, "1st").replace(/\b3th\b/gi, "3rd");
    clean = clean.replace(/\s+/g, " ").trim();
    return clean || "Alvien & Vinella";
  }

  function ribbonTexture(text, { w = 2048, h = 256, repeat = 2 } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    // Satin ivory ribbon background with subtle vertical shimmer
    const ribbonGrad = g.createLinearGradient(0, 0, 0, h);
    ribbonGrad.addColorStop(0, "rgba(255, 252, 245, 0.95)");
    ribbonGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.98)");
    ribbonGrad.addColorStop(1, "rgba(255, 248, 240, 0.95)");
    g.fillStyle = ribbonGrad;
    g.fillRect(0, 0, w, h);

    // Elegant gold piping border lines (top & bottom)
    const goldGrad = g.createLinearGradient(0, 0, w, 0);
    goldGrad.addColorStop(0, "#c99a38");
    goldGrad.addColorStop(0.25, "#f5de8a");
    goldGrad.addColorStop(0.5, "#d4af37");
    goldGrad.addColorStop(0.75, "#faeb9e");
    goldGrad.addColorStop(1, "#c99a38");

    g.fillStyle = goldGrad;
    g.fillRect(0, 4, w, 6);
    g.fillRect(0, 16, w, 2.5);
    g.fillRect(0, h - 18.5, w, 2.5);
    g.fillRect(0, h - 10, w, 6);

    // Text configuration
    const displayStr = `✦  ${text}  ✦`;
    const secW = w / repeat;
    g.textAlign = "center";
    g.textBaseline = "middle";

    for (let i = 0; i < repeat; i++) {
      const cx = secW * (i + 0.5);
      const cy = h / 2 + 1;

      g.font = `bold 78px "Outfit", "Cormorant Garamond", Georgia, sans-serif`;
      const textW = g.measureText(displayStr).width;
      const maxW = secW * 0.92;
      let scale = 1;
      if (textW > maxW) scale = maxW / textW;

      g.save();
      g.translate(cx, cy);
      if (scale < 1) g.scale(scale, scale);

      // Deep rich royal plum/burgundy wine text for maximum contrast and elegance
      g.shadowColor = "rgba(70, 20, 40, 0.25)";
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
      g.fillStyle = "#381122";
      g.fillText(displayStr, 0, 0);

      // Gold accent stroke
      g.shadowColor = "transparent";
      g.lineWidth = 1.6;
      g.strokeStyle = "#c89a38";
      g.strokeText(displayStr, 0, 0);

      g.restore();
    }

    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function topperTexture(text = "Happy Birthday", { w = 2048, h = 512 } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    const cx = w / 2;
    const cy = h / 2;

    // Frosted acrylic plaque with soft translucent fill
    const pillW = w * 0.92;
    const pillH = h * 0.72;
    const px = (w - pillW) / 2;
    const py = (h - pillH) / 2;
    const r = pillH / 2;

    g.save();
    g.beginPath();
    if (typeof g.roundRect === "function") {
      g.roundRect(px, py, pillW, pillH, r);
    } else {
      g.arc(px + r, py + r, r, Math.PI * 0.5, Math.PI * 1.5);
      g.lineTo(px + pillW - r, py);
      g.arc(px + pillW - r, py + r, r, Math.PI * 1.5, Math.PI * 0.5);
      g.closePath();
    }
    // Elegant warm pearl ivory acrylic plaque
    const bgGrad = g.createLinearGradient(0, py, 0, py + pillH);
    bgGrad.addColorStop(0, "rgba(255, 253, 248, 0.96)");
    bgGrad.addColorStop(1, "rgba(255, 246, 238, 0.94)");
    g.fillStyle = bgGrad;
    g.fill();

    // 24K Gold luxury double border
    const goldGrad = g.createLinearGradient(px, py, px + pillW, py + pillH);
    goldGrad.addColorStop(0, "#c49232");
    goldGrad.addColorStop(0.3, "#fbe396");
    goldGrad.addColorStop(0.5, "#d4af37");
    goldGrad.addColorStop(0.7, "#faeaad");
    goldGrad.addColorStop(1, "#c49232");

    g.lineWidth = 10;
    g.strokeStyle = goldGrad;
    g.stroke();

    // Side star sparkles
    g.fillStyle = "#b8862c";
    g.font = `bold 64px "Outfit", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("✨", px + 80, cy);
    g.fillText("✨", px + pillW - 80, cy);

    // "Happy Birthday" lettering - high contrast & luxurious
    g.font = `bold 160px "Great Vibes", "Cormorant Garamond", cursive, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";

    // Text: Deep Royal Burgundy Plum for effortless readability
    g.shadowColor = "rgba(70, 20, 40, 0.3)";
    g.shadowBlur = 8;
    g.shadowOffsetY = 3;
    g.fillStyle = "#381122";
    g.fillText(text, cx, cy + 6);

    // Fine gold outline accent
    g.shadowColor = "transparent";
    g.lineWidth = 2;
    g.strokeStyle = "#c89a38";
    g.strokeText(text, cx, cy + 6);

    g.restore();

    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function textTexture(text, opts = {}) {
    return ribbonTexture(text, opts);
  }

  function stripeTexture(color) {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#fffaf3"; g.fillRect(0, 0, 64, 256);
    g.fillStyle = color;
    for (let y = -64; y < 320; y += 40) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 30); g.lineTo(64, y + 48); g.lineTo(0, y + 18); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function createCake(canvas, opts = {}) {
    const { isMobile, makeEnvironment, glowTexture, loadScript, THREE_CDN } = window.Three3D;
    const names = opts.names || "Alvien & Vinella";
    const lite = !!opts.lite || isMobile;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.environment = makeEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const camBase = { y: 3.6, z: opts.startZ || 12.5 };
    camera.position.set(0, camBase.y, camBase.z);

    // Warm, pleasing ambient & directional lighting (avoids blinding white glare)
    scene.add(new THREE.HemisphereLight(0xfff8f4, 0xe2d6ec, 0.55));
    const key = new THREE.DirectionalLight(0xfff3e5, 0.95); key.position.set(5, 8, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd5e8, 0.65); rim.position.set(-6, 4, -6); scene.add(rim);

    const floatG = new THREE.Group();   // floats up & down
    const spinG = new THREE.Group();    // slowly rotates
    floatG.add(spinG);
    scene.add(floatG);

    // Tasteful, comfortable color palette (velvet rose + pastel lilac + warm ivory cream)
    const M = {
      plate: new THREE.MeshStandardMaterial({ color: 0xf5ece0, metalness: 0.1, roughness: 0.35, envMapIntensity: 0.25 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xdca832, metalness: 0.88, roughness: 0.2, envMapIntensity: 1.2 }),
      tier1: new THREE.MeshStandardMaterial({
        color: 0xd97098, // Warm velvety Parisian strawberry rose
        roughness: 0.62,
        metalness: 0.04,
        envMapIntensity: 0.12
      }),
      tier2: new THREE.MeshStandardMaterial({
        color: 0xa890e6, // Dreamy royal pastel lilac
        roughness: 0.62,
        metalness: 0.04,
        envMapIntensity: 0.12
      }),
      cream: new THREE.MeshPhysicalMaterial({
        color: 0xfffdf7, // Luscious fresh whipped cream
        roughness: 0.32,
        clearcoat: 0.3,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.35
      }),
      berry: new THREE.MeshPhysicalMaterial({
        color: 0xb51838, // Glossy ripe raspberry ruby
        roughness: 0.18,
        clearcoat: 1.0,
        envMapIntensity: 0.5
      }),
      leaf: new THREE.MeshStandardMaterial({
        color: 0x367c42, // Fresh natural green leaf
        roughness: 0.5,
        envMapIntensity: 0.2
      }),
    };

    const procedural = new THREE.Group();
    spinG.add(procedural);
    const seg = lite ? 48 : 96;

    // Plate + gold rim
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.15, 0.2, seg), M.plate);
    plate.position.y = 0.1; procedural.add(plate);
    const plateRim = new THREE.Mesh(new THREE.TorusGeometry(3.08, 0.06, 12, seg), M.gold);
    plateRim.rotation.x = Math.PI / 2; plateRim.position.y = 0.2; procedural.add(plateRim);

    // Tiers
    const T1 = { r: 2.3, h: 1.5, y0: 0.2 }, T2 = { r: 1.55, h: 1.2 };
    T2.y0 = T1.y0 + T1.h;
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(T1.r, T1.r, T1.h, seg), M.tier1);
    tier1.position.y = T1.y0 + T1.h / 2; procedural.add(tier1);
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(T2.r, T2.r, T2.h, seg), M.tier2);
    tier2.position.y = T2.y0 + T2.h / 2; procedural.add(tier2);

    // Name band around the bottom tier with dedicated ribbon sash texture
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(T1.r + 0.018, T1.r + 0.018, 0.72, seg, 1, true),
      new THREE.MeshStandardMaterial({
        map: ribbonTexture(cleanNameText(names)),
        roughness: 0.38,
        metalness: 0.08,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide
      })
    );
    band.position.y = T1.y0 + T1.h * 0.42; procedural.add(band);

    // Cream tops + frosting rolls
    [[T1, 0], [T2, 0]].forEach(([T]) => {
      const top = T.y0 + T.h;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(T.r - 0.02, T.r - 0.02, 0.08, seg), M.cream);
      disc.position.y = top + 0.02; procedural.add(disc);
      const roll = new THREE.Mesh(new THREE.TorusGeometry(T.r - 0.06, 0.13, 14, seg), M.cream);
      roll.rotation.x = Math.PI / 2; roll.position.y = top + 0.06; procedural.add(roll);
    });

    // Drips (instanced capsules)
    const dripGeo = new THREE.CapsuleGeometry(0.085, 1, 4, 10);
    const dummy = new THREE.Object3D();
    [[T1, lite ? 22 : 34], [T2, lite ? 16 : 24]].forEach(([T, n]) => {
      const inst = new THREE.InstancedMesh(dripGeo, M.cream, n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
        const len = rand(0.12, T.h * 0.42);
        dummy.position.set(Math.cos(a) * (T.r + 0.01), T.y0 + T.h - len / 2 - 0.02, Math.sin(a) * (T.r + 0.01));
        dummy.scale.set(1, len, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      procedural.add(inst);
    });

    // Gold pearls along the bottom of each tier
    const pearlGeo = new THREE.SphereGeometry(0.09, 12, 10);
    [[T1, lite ? 50 : 80], [T2, lite ? 36 : 56]].forEach(([T, n]) => {
      const inst = new THREE.InstancedMesh(pearlGeo, M.gold, n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * (T.r + 0.04), T.y0 + 0.09, Math.sin(a) * (T.r + 0.04));
        dummy.scale.setScalar(1); dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      procedural.add(inst);
    });

    // Berries + meringue kisses on the bottom tier ledge
    const berryGeo = new THREE.SphereGeometry(0.2, 16, 12);
    const leafGeo = new THREE.ConeGeometry(0.12, 0.1, 6);
    const kissGeo = new THREE.ConeGeometry(0.14, 0.28, 16);
    const ledgeR = (T1.r + T2.r) / 2 + 0.05, ledgeY = T1.y0 + T1.h + 0.2;
    const nLedge = lite ? 10 : 14;
    for (let i = 0; i < nLedge; i++) {
      const a = (i / nLedge) * Math.PI * 2;
      if (i % 2 === 0) {
        const b = new THREE.Mesh(berryGeo, M.berry);
        b.scale.set(1, 1.25, 1);
        b.position.set(Math.cos(a) * ledgeR, ledgeY, Math.sin(a) * ledgeR);
        const l = new THREE.Mesh(leafGeo, M.leaf);
        l.position.set(0, 0.22, 0); l.rotation.x = Math.PI;
        b.add(l);
        procedural.add(b);
      } else {
        const k = new THREE.Mesh(kissGeo, i % 4 === 1 ? M.cream : M.gold);
        k.position.set(Math.cos(a) * ledgeR, ledgeY - 0.04, Math.sin(a) * ledgeR);
        procedural.add(k);
      }
    }

    // Sprinkles on top tier
    const sprGeo = new THREE.CapsuleGeometry(0.022, 0.1, 2, 6);
    const nSpr = lite ? 70 : 140;
    const spr = new THREE.InstancedMesh(sprGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), nSpr);
    const sprColors = [0xff7eb6, 0xffd166, 0xa78bfa, 0x7dd3fc, 0xffffff, 0xe8c46a];
    for (let i = 0; i < nSpr; i++) {
      const a = rand(0, 6.28), rr = Math.sqrt(Math.random()) * (T2.r - 0.25);
      dummy.position.set(Math.cos(a) * rr, T2.y0 + T2.h + 0.08, Math.sin(a) * rr);
      dummy.rotation.set(Math.PI / 2, 0, rand(0, 6.28));
      dummy.scale.setScalar(1); dummy.updateMatrix();
      spr.setMatrixAt(i, dummy.matrix);
      spr.setColorAt(i, new THREE.Color(pick(sprColors)));
    }
    procedural.add(spr);

    // Two main candles (one per celebrant)
    const flames = [];
    const glowTex = glowTexture("rgba(255,214,140,0.9)", "rgba(255,170,80,0)");
    const candleTop = T2.y0 + T2.h;
    [[-0.52, "#e2669c"], [0.52, "#7d5bd6"]].forEach(([x, color]) => {
      const cg = new THREE.Group();
      cg.position.set(x, candleTop, 0);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.25, 24),
        new THREE.MeshStandardMaterial({ map: stripeTexture(color), roughness: 0.35 })
      );
      body.position.y = 0.62; cg.add(body);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
      wick.position.y = 1.32; cg.add(wick);

      const flame = new THREE.Group();
      flame.position.y = 1.52;
      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff9e1b, transparent: true, opacity: 0.9 }));
      outer.scale.set(1, 2.1, 1);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
      inner.scale.set(1, 1.8, 1); inner.position.y = -0.04;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(1.05, 1.05, 1);
      flame.add(outer, inner, glow);
      cg.add(flame);
      const light = new THREE.PointLight(0xffa834, 0.85, 6, 2);
      light.position.y = 1.6; cg.add(light);
      flames.push({ flame, light, on: true, k: 1 });
      spinG.add(cg);
    });

    // "Happy Birthday" topper — high-contrast, crystal clear and stays facing camera
    const topperGeo = new THREE.PlaneGeometry(3.6, 0.9);
    const topperMat = new THREE.MeshBasicMaterial({
      map: topperTexture("Happy Birthday"),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const topper = new THREE.Mesh(topperGeo, topperMat);
    topper.position.set(0, candleTop + 2.35, -0.05);
    floatG.add(topper);

    // Sparkles around the cake
    const nS = lite ? 60 : 120;
    const sPos = new Float32Array(nS * 3);
    for (let i = 0; i < nS; i++) {
      const a = rand(0, 6.28), rr = rand(2.6, 4.2);
      sPos.set([Math.cos(a) * rr, rand(0.2, 5.6), Math.sin(a) * rr], i * 3);
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    const sMat = new THREE.PointsMaterial({ size: 0.35, map: glowTexture("rgba(255,244,210,1)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const sparkles = new THREE.Points(sGeo, sMat);
    floatG.add(sparkles);

    // Optional GLB model replaces the procedural tiers
    if (opts.modelUrl) {
      (async () => {
        try {
          if (!THREE.GLTFLoader) await loadScript(`${THREE_CDN}/examples/js/loaders/GLTFLoader.js`);
          new THREE.GLTFLoader().load(opts.modelUrl, (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const s = 4.6 / Math.max(size.x, size.y, size.z);
            model.scale.setScalar(s);
            box.setFromObject(model);
            model.position.y -= box.min.y;
            model.position.x -= (box.min.x + box.max.x) / 2;
            model.position.z -= (box.min.z + box.max.z) / 2;
            procedural.visible = false;
            spinG.add(model);
          });
        } catch (e) { console.info("GLB not loaded, using procedural cake", e); }
      })();
    }

    // Sizing
    function resize() {
      const w = canvas.clientWidth || 600, h = canvas.clientHeight || 500;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Interaction
    const pointer = { x: 0, y: 0 };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    canvas.addEventListener("pointermove", onMove, { passive: true });

    let visible = true, raf = 0, disposed = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(canvas);

    const clock = new THREE.Clock();
    const state = { camZ: camBase.z, spin: 0.25 };
    function loop() {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      floatG.position.y = Math.sin(t * 1.1) * 0.14;
      spinG.rotation.y += dt * state.spin;
      floatG.rotation.x += ((pointer.y * 0.08) - floatG.rotation.x) * 0.05;
      floatG.rotation.z += ((-pointer.x * 0.05) - floatG.rotation.z) * 0.05;
      flames.forEach((f, i) => {
        const target = f.on ? 1 : 0;
        f.k += (target - f.k) * Math.min(1, dt * 8);
        const flick = 1 + Math.sin(t * 22 + i * 3) * 0.06 + Math.random() * 0.05;
        f.flame.scale.set(f.k * flick, f.k * (1 + Math.sin(t * 15 + i) * 0.1), f.k * flick);
        f.light.intensity = f.k * (1 + Math.random() * 0.25);
      });
      sMat.opacity = 0.55 + Math.sin(t * 3) * 0.35;
      sparkles.rotation.y = t * 0.12;
      camera.position.set(pointer.x * 0.6, camBase.y + pointer.y * -0.3, state.camZ);
      camera.lookAt(0, 2.2, 0);
      renderer.render(scene, camera);
    }
    loop();

    return {
      zoomTo(z, duration = 2.4, ease = "power3.out") {
        if (window.gsap) gsap.to(state, { camZ: z, duration, ease });
        else state.camZ = z;
      },
      spinFast(ms = 1500) {
        state.spin = 3;
        if (window.gsap) gsap.to(state, { spin: 0.25, duration: ms / 1000, ease: "power2.out" });
        else setTimeout(() => (state.spin = 0.25), ms);
      },
      blow() {
        if (!flames[0].on) return false;
        flames.forEach((f) => (f.on = false));
        setTimeout(() => flames.forEach((f) => (f.on = true)), 3200);
        return true;
      },
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect(); io.disconnect();
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
      },
    };
  }

  window.createCake = createCake;
})();
