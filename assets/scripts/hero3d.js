/* 3D hero: a profilkép porrá/hommokká bontva (image-to-particles), v2.
 *
 * - Kétfelhős felépítés: a "tinta" (sötét körvonalak) nagyobb, közelebbi
 *   pontokból áll, a világos háttér finomabb por – így a rajz jól kivehető.
 * - Ambient por a teljes hero-n (a tartalmi panel mögött is, áttetsző panellel).
 * - Kamera-parallax: a nézet finoman dől/követ az egérrel.
 * - Bevezető: szétszórt porból összeállás; egér hatására kirepülés,
 *   rugó-fizikával visszaállás.
 * Fallback: prefers-reduced-motion / nincs WebGL / képhiba – az eredeti <img>. */

(function () {
  var canvas = document.getElementById('hero-canvas');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFallback() {
    document.body.classList.add('no-canvas');
  }

  if (!canvas || prefersReducedMotion) {
    showFallback();
    return;
  }

  init().catch(function (err) {
    showFallback();
    if (window.console) console.error('hero3d:', err);
  });

  async function init() {
    var THREE = await import('/assets/scripts/vendor/three.module.min.js');

    // ---- Kép betöltése és mintavételezés ----
    var img = new Image();
    img.src = '/assets/images/main.webp';
    await img.decode();

    var isSmall = Math.min(window.innerWidth, window.innerHeight) < 720;
    var SAMPLE_W = isSmall ? 120 : 220;
    var GAP = 3;
    var scale = SAMPLE_W / img.naturalWidth;
    var SAMPLE_H = Math.round(img.naturalHeight * scale);

    var off = document.createElement('canvas');
    off.width = SAMPLE_W;
    off.height = SAMPLE_H;
    var ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);
    var data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    var INK_MAX_LUM = 0.62;   // ennél sötétebb = körvonal

    var ink = { homes: [], colors: [], delays: [], jitter: [] };
    var fill = { homes: [], colors: [], delays: [], jitter: [] };

    for (var y = 0; y < SAMPLE_H; y += GAP) {
      for (var x = 0; x < SAMPLE_W; x += GAP) {
        var i = (y * SAMPLE_W + x) * 4;
        var a = data[i + 3] / 255;
        if (a < 0.4) continue;
        var u = x / SAMPLE_W;
        var v = y / SAMPLE_H;
        var r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        var lum = 0.299 * r + 0.587 * g + 0.114 * b;
        var bucket = lum < INK_MAX_LUM ? ink : fill;
        bucket.homes.push(u, 1 - v, 0);
        bucket.colors.push(r, g, b);
        bucket.delays.push(Math.random() * 0.5);
        bucket.jitter.push(Math.random() * Math.PI * 2);
      }
    }

    // ---- Renderer / jelenet / kamera ----
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) {
      throw new Error('WebGL unavailable');
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 1, 400);
    camera.position.z = 100;

    // Kerek, puha sprite
    var spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 32;
    var sctx = spriteCanvas.getContext('2d');
    var grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);
    var sprite = new THREE.CanvasTexture(spriteCanvas);

    var viewH, viewW, imgW, imgH, originX, originY, basePointSize, cloudCenter;

    function makeCloud(bucket, sizeMul, sizeOverride) {
      var count = bucket.delays.length;
      var pos = new Float32Array(count * 3);
      var homes = new Float32Array(count * 3);
      var scatter = new Float32Array(count * 3);
      var vel = new Float32Array(count * 3);

      for (var i = 0; i < count; i++) {
        var i3 = i * 3;
        homes[i3] = originX + bucket.homes[i3] * imgW;
        homes[i3 + 1] = originY + bucket.homes[i3 + 1] * imgH;
        var lum = 0.299 * bucket.colors[i3] + 0.587 * bucket.colors[i3 + 1] + 0.114 * bucket.colors[i3 + 2];
        // Dombormű: sötét körvonalak közelebb, erősebb relief
        var hz = (0.75 - lum) * 16 + (Math.random() - 0.5) * 1.6;
        if (lum < INK_MAX_LUM) hz -= 3; // tinta még előrébb ugrik
        homes[i3 + 2] = hz;

        scatter[i3] = homes[i3] + (Math.random() - 0.5) * viewW * 1.2;
        scatter[i3 + 1] = homes[i3 + 1] + (Math.random() - 0.5) * viewH * 1.6 + viewH * 0.4;
        scatter[i3 + 2] = hz + 60 + Math.random() * 80;
        pos[i3] = scatter[i3]; pos[i3 + 1] = scatter[i3 + 1]; pos[i3 + 2] = scatter[i3 + 2];
      }

      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bucket.colors), 3));

      var mat = new THREE.PointsMaterial({
        size: sizeOverride || basePointSize * sizeMul,
        map: sprite,
        vertexColors: true,
        transparent: true,
        alphaTest: 0.28,
        depthWrite: false,
        sizeAttenuation: true,
      });

      var pts = new THREE.Points(geo, mat);
      pts.userData = { homes: homes, scatter: scatter, vel: vel, delays: bucket.delays, jitter: bucket.jitter, count: count };
      scene.add(pts);
      return pts;
    }

    var inkCloud, fillCloud, ambientCloud;

    function layout() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      viewH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      viewW = viewH * camera.aspect;

      // Cover-méretezés: a kép töltse ki a bal felet széltől szélig,
      // középről körbevágva – pont mint az eredeti <img> a dizájnban
      var targetW = viewW * 0.5;
      var targetH = viewH;
      var scalePx = Math.max(targetW / SAMPLE_W, targetH / SAMPLE_H);
      imgW = SAMPLE_W * scalePx;
      imgH = SAMPLE_H * scalePx;
      originX = -viewW / 2 - (imgW - targetW) / 2;
      originY = -targetH / 2 - (imgH - targetH) / 2;
      cloudCenter = new THREE.Vector3(-viewW / 2 + targetW / 2, 0, 0);

      basePointSize = scalePx * GAP * 1.1;

      if (!inkCloud) {
        inkCloud = makeCloud(ink, 1.65);
        fillCloud = makeCloud(fill, 0.8);
        buildAmbient();
      } else {
        // újraméretezés: otthonpontok frissítése
        [inkCloud, fillCloud].forEach(function (pts, idx) {
          var bucket = idx === 0 ? ink : fill;
          var ud = pts.userData;
          for (var i = 0; i < ud.count; i++) {
            var i3 = i * 3;
            ud.homes[i3] = originX + bucket.homes[i3] * imgW;
            ud.homes[i3 + 1] = originY + bucket.homes[i3 + 1] * imgH;
          }
          pts.material.size = basePointSize * (idx === 0 ? 1.65 : 0.8);
        });
      }
    }

    // Ambient por: lassan sodródó halvány pontok a teljes hero-n
    function buildAmbient() {
      var N = 140;
      var pos = new Float32Array(N * 3);
      var seeds = new Float32Array(N * 2);
      var cols = new Float32Array(N * 3);
      var teal = [0.47, 0.86, 0.91], white = [0.99, 0.99, 0.98];
      for (var i = 0; i < N; i++) {
        var i3 = i * 3, i2 = i * 2;
        pos[i3] = (Math.random() - 0.5) * 200;
        pos[i3 + 1] = (Math.random() - 0.5) * 110;
        pos[i3 + 2] = -30 + Math.random() * 55;
        seeds[i2] = Math.random() * Math.PI * 2;
        seeds[i2 + 1] = 0.3 + Math.random() * 0.9;
        var c = Math.random() < 0.35 ? teal : white;
        cols[i3] = c[0]; cols[i3 + 1] = c[1]; cols[i3 + 2] = c[2];
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      var mat = new THREE.PointsMaterial({
        size: 0.9, map: sprite, vertexColors: true, transparent: true,
        opacity: 0, alphaTest: 0.2, depthWrite: false, sizeAttenuation: true,
      });
      ambientCloud = new THREE.Points(geo, mat);
      ambientCloud.userData = { seeds: seeds, count: N };
      scene.add(ambientCloud);
    }

    layout();
    window.addEventListener('resize', layout, { passive: true });

    // Siker: az eredeti kép helyett a point cloud lesz látható
    var photoImg = document.querySelector('.sp-landing .image img');
    var photoBox = document.querySelector('.sp-landing .image');
    if (photoImg) photoImg.style.visibility = 'hidden';
    if (photoBox) {
      // A kép eredeti kék háttere (sarokátlag színminta)
      photoBox.style.backgroundColor = '#798eb6';
      photoBox.style.backgroundImage = 'none';
    }

    // ---- Egér ----
    var mouse = new THREE.Vector2(0, 0);
    var target = new THREE.Vector2(0, 0);
    window.addEventListener('pointermove', function (e) {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });

    var running = true;
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });

    var t = 0;
    var introStart = performance.now();
    var INTRO_MS = 1700;

    function animateCloud(pts, now, p, introDone) {
      var ud = pts.userData;
      var arr = pts.geometry.attributes.position.array;
      var K = 0.045, DAMP = 0.86, FORCE = 2.6;
      var mx = mouse.x * (viewW / 2) * 0.5 + cloudCenter.x;
      var my = mouse.y * (viewH / 2);
      var R = imgW * 0.14;
      var R2 = R * R;

      for (var i = 0; i < ud.count; i++) {
        var i3 = i * 3;
        var hx = ud.homes[i3], hy = ud.homes[i3 + 1], hz = ud.homes[i3 + 2];

        if (!introDone) {
          var lp = Math.max(0, Math.min(1, p * 1.6 - ud.delays[i]));
          lp = 1 - Math.pow(1 - lp, 3);
          arr[i3] = ud.scatter[i3] + (hx - ud.scatter[i3]) * lp;
          arr[i3 + 1] = ud.scatter[i3 + 1] + (hy - ud.scatter[i3 + 1]) * lp;
          arr[i3 + 2] = ud.scatter[i3 + 2] + (hz - ud.scatter[i3 + 2]) * lp;
          continue;
        }

        var wave = Math.sin(t * 1.2 + ud.jitter[i]) * 0.5;
        ud.vel[i3] += (hx - arr[i3]) * K;
        ud.vel[i3 + 1] += (hy - arr[i3 + 1]) * K;
        ud.vel[i3 + 2] += (hz + wave - arr[i3 + 2]) * K;

        var dx = arr[i3] - mx;
        var dy = arr[i3 + 1] - my;
        var d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.0001) {
          var d = Math.sqrt(d2);
          var f = ((R - d) / R) * FORCE;
          ud.vel[i3] += (dx / d) * f;
          ud.vel[i3 + 1] += (dy / d) * f;
          ud.vel[i3 + 2] += f * 0.6;
        }

        ud.vel[i3] *= DAMP; ud.vel[i3 + 1] *= DAMP; ud.vel[i3 + 2] *= DAMP;
        arr[i3] += ud.vel[i3]; arr[i3 + 1] += ud.vel[i3 + 1]; arr[i3 + 2] += ud.vel[i3 + 2];
      }
      pts.geometry.attributes.position.needsUpdate = true;
    }

    function animateAmbient(now, p) {
      var ud = ambientCloud.userData;
      var arr = ambientCloud.geometry.attributes.position.array;
      ambientCloud.material.opacity = p * 0.22;
      for (var i = 0; i < ud.count; i++) {
        var i3 = i * 3, i2 = i * 2;
        arr[i3] += Math.sin(t * 0.2 + ud.seeds[i2]) * 0.012 * ud.seeds[i2 + 1];
        arr[i3 + 1] += Math.cos(t * 0.16 + ud.seeds[i2] * 1.7) * 0.01 * ud.seeds[i2 + 1];
      }
      ambientCloud.geometry.attributes.position.needsUpdate = true;
    }

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);

      t += 0.016;
      mouse.lerp(target, 0.06);

      var p = Math.min(1, (now - introStart) / INTRO_MS);
      var introDone = p >= 1;

      animateCloud(inkCloud, now, p, introDone);
      animateCloud(fillCloud, now, p, introDone);
      animateAmbient(now, p);

      // Kamera-parallax: finom eltolás, képtengely-rotation NÉLKÜL
      // (a lookAt elforgatná a nézetet és középre tolná a képet)
      camera.position.x = mouse.x * 2.4;
      camera.position.y = mouse.y * 1.6;

      renderer.render(scene, camera);
    }

    requestAnimationFrame(tick);
  }
})();
