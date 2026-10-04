/* Procedural 3D birthday cake (Three.js) with two named candles, frosting,
 * drips, pearls, berries, sprinkles, sparkles and a soft glow.
 * Optionally loads assets/3d/cake.glb instead of the procedural tiers.
 */
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function textTexture(text, { w = 2048, h = 256, font = "Great Vibes", size = 150, repeat = 2, stroke = true } = {}) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.font = `${size}px "${font}", "Brush Script MT", cursive`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i < repeat; i++) {
      const x = (w / repeat) * (i + 0.5);
      const grd = g.createLinearGradient(x - 400, 0, x + 400, 0);
      grd.addColorStop(0, "#fff4c8"); grd.addColorStop(0.45, "#e8c46a"); grd.addColorStop(0.7, "#b8862c"); grd.addColorStop(1, "#f7dc8f");
      if (stroke) {
        g.lineWidth = 10; g.strokeStyle = "rgba(255,255,255,0.95)"; g.strokeText(text, x, h / 2 + 8);
      }
      g.fillStyle = grd;
      g.fillText(text, x, h / 2 + 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
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
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    scene.environment = makeEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const camBase = { y: 3.6, z: opts.startZ || 12.5 };
    camera.position.set(0, camBase.y, camBase.z);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xf3d0ff, 0.75));
    const key = new THREE.DirectionalLight(0xfff2e0, 1.25); key.position.set(5, 9, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb6dc, 0.9); rim.position.set(-6, 4, -6); scene.add(rim);

    const floatG = new THREE.Group();   // floats up & down
    const spinG = new THREE.Group();    // slowly rotates
    floatG.add(spinG);
    scene.add(floatG);

    const M = {
      plate: new THREE.MeshStandardMaterial({ color: 0xfff6ea, metalness: 0.35, roughness: 0.25 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe6b85c, metalness: 1, roughness: 0.2, envMapIntensity: 1.4 }),
      tier1: new THREE.MeshPhysicalMaterial({ color: 0xf9b9d3, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xffe3f0) }),
      tier2: new THREE.MeshPhysicalMaterial({ color: 0xdccbff, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 1, sheenColor: new THREE.Color(0xf3ecff) }),
      cream: new THREE.MeshPhysicalMaterial({ color: 0xfffaf3, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      berry: new THREE.MeshPhysicalMaterial({ color: 0xe23a5c, roughness: 0.25, clearcoat: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x4f9a5a, roughness: 0.6 }),
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

    // Name band around the bottom tier
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(T1.r + 0.015, T1.r + 0.015, 0.75, seg, 1, true),
      new THREE.MeshStandardMaterial({ map: textTexture(names), transparent: true, metalness: 0.55, roughness: 0.3, alphaTest: 0.04 })
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
    const glowTex = glowTexture("rgba(255,214,140,1)", "rgba(255,170,80,0)");
    const candleTop = T2.y0 + T2.h;
    [[-0.48, "#f5a9cb"], [0.48, "#b9a3f5"]].forEach(([x, color]) => {
      const cg = new THREE.Group();
      cg.position.set(x, candleTop, 0);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.25, 24),
        new THREE.MeshStandardMaterial({ map: stripeTexture(color), roughness: 0.45 })
      );
      body.position.y = 0.62; cg.add(body);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
      wick.position.y = 1.32; cg.add(wick);

      const flame = new THREE.Group();
      flame.position.y = 1.52;
      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffb340, transparent: true, opacity: 0.9 }));
      outer.scale.set(1, 2.1, 1);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfffbe6 }));
      inner.scale.set(1, 1.8, 1); inner.position.y = -0.04;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(1.3, 1.3, 1);
      flame.add(outer, inner, glow);
      cg.add(flame);
      const light = new THREE.PointLight(0xffb347, 1.1, 7, 2);
      light.position.y = 1.6; cg.add(light);
      flames.push({ flame, light, on: true, k: 1 });
      spinG.add(cg);
    });

    // "Happy Birthday" topper — stays facing the camera
    const topper = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.85),
      new THREE.MeshStandardMaterial({ map: textTexture("Happy Birthday", { w: 1024, h: 256, size: 150, repeat: 1 }), transparent: true, metalness: 0.6, roughness: 0.25, alphaTest: 0.04, side: THREE.DoubleSide })
    );
    topper.position.set(0, candleTop + 2.25, -0.2);
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
