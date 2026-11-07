/* 3D hero: a profilkép porrá/hommokká bontva (image-to-particles).
 *
 * A képet offscreen canvasra rajzoljuk, pixelmintákat veszünk, és a
 * színek+pozíciók alapján point cloudot építünk. A részecskék:
 *  - bevezető animációban összeállnak a képpé (szétszóródott porból)
 *  - az egér hatására kirepülnek, rugó-fizikával visszaállnak
 *  - finom hullámzás + parallax az egérrel
 *
 * Fallback: prefers-reduced-motion, nincs WebGL, vagy a kép nem tölthető
 * be – ilyenkor az eredeti <img> marad látható. */

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
    var SAMPLE_W = isSmall ? 110 : 190;          // mintavételezési szélesség (px)
    var GAP = 3;                                  // mintavételi rács (px)
    var scale = SAMPLE_W / img.naturalWidth;
    var SAMPLE_H = Math.round(img.naturalHeight * scale);

    var off = document.createElement('canvas');
    off.width = SAMPLE_W;
    off.height = SAMPLE_H;
    var ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);
    var data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    var homes = [];       // [x, y, z] világkoordináták
    var colors = [];      // rgb
    var delays = [];      // bevezető késleltetés 0..0.5
    var jitter = [];      // por-jitter a hullámhoz

    for (var y = 0; y < SAMPLE_H; y += GAP) {
      for (var x = 0; x < SAMPLE_W; x += GAP) {
        var i = (y * SAMPLE_W + x) * 4;
        var a = data[i + 3] / 255;
        if (a < 0.4) continue;
        // Normált képpont-koordináták (0..1)
        var u = x / SAMPLE_W;
        var v = y / SAMPLE_H;
        homes.push(u, 1 - v, 0);
        colors.push(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
        delays.push(Math.random() * 0.5);
        jitter.push(Math.random() * Math.PI * 2);
      }
    }

    var COUNT = delays.length;

    // ---- Renderer, jelenet, kamera ----
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

    // Kerek, puha sprite a pontokhoz
    var spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 32;
    var sctx = spriteCanvas.getContext('2d');
    var grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);
    var sprite = new THREE.CanvasTexture(spriteCanvas);

    var positions = new Float32Array(COUNT * 3);
    var pos = new Float32Array(COUNT * 3);      // aktuális
    var vel = new Float32Array(COUNT * 3);      // sebesség (rugó)
    var scatter = new Float32Array(COUNT * 3);  // bevezető kezdőpont

    var viewH, viewW, imgW, imgH, originX, originY, pointSize;

    function layout() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Világméret a kamera z=0 síkján
      viewH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      viewW = viewH * camera.aspect;

      // A kép a BAL oldalra kerül: szélesség ~44%, középen, kis margóval
      var maxW = viewW * 0.44;
      var maxH = viewH * 0.9;
      var imgAspect = SAMPLE_W / SAMPLE_H;
      imgW = Math.min(maxW, maxH * imgAspect);
      imgH = imgW / imgAspect;
      originX = -viewW / 2 + (viewW * 0.5 - imgW) / 2 + viewW * 0.015;
      originY = -imgH / 2;

      pointSize = (imgW / (SAMPLE_W / GAP)) * 1.25;

      for (var i = 0; i < COUNT; i++) {
        var i3 = i * 3;
        var hx = originX + homes[i3] * imgW;
        var hy = originY + homes[i3 + 1] * imgH;
        // "Dombormű": sötét vonalak közelebb, világos háttér mélyebben –
        // a kép szinte tapinthatóvá válik
        var lum = 0.299 * colors[i3] + 0.587 * colors[i3 + 1] + 0.114 * colors[i3 + 2];
        var hz = (0.72 - lum) * 14 + (Math.random() - 0.5) * 1.6;
        homes[i3] = hx; homes[i3 + 1] = hy; homes[i3 + 2] = hz;

        scatter[i3] = hx + (Math.random() - 0.5) * viewW * 1.2;
        scatter[i3 + 1] = hy + (Math.random() - 0.5) * viewH * 1.6 + viewH * 0.4;
        scatter[i3 + 2] = hz + 60 + Math.random() * 80;

        pos[i3] = scatter[i3]; pos[i3 + 1] = scatter[i3 + 1]; pos[i3 + 2] = scatter[i3 + 2];
        vel[i3] = vel[i3 + 1] = vel[i3 + 2] = 0;
      }
    }

    layout();
    window.addEventListener('resize', layout, { passive: true });

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

    var material = new THREE.PointsMaterial({
      size: pointSize,
      map: sprite,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.28,
      depthWrite: false,
      sizeAttenuation: true,
    });

    var points = new THREE.Points(geometry, material);
    scene.add(points);

    // Siker: az eredeti kép helyett a point cloud lesz a látható
    var photoImg = document.querySelector('.sp-landing .image img');
    var photoBox = document.querySelector('.sp-landing .image');
    if (photoImg) photoImg.style.visibility = 'hidden';
    if (photoBox) {
      // A minta bal felső pixelének színe lesz a háttér
      photoBox.style.backgroundColor = 'rgb(' + Math.round(colors[0] * 255) + ',' +
        Math.round(colors[1] * 255) + ',' + Math.round(colors[2] * 255) + ')';
      photoBox.style.backgroundImage = 'none';
    }

    // ---- Egérkövetés ----
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
    var INTRO_MS = 1600;

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);

      t += 0.016;
      mouse.lerp(target, 0.06);

      var p = Math.min(1, (now - introStart) / INTRO_MS);
      var introDone = p >= 1;

      // Egér világkoordinátái a z=0 síkon
      var mx = mouse.x * (viewW / 2) * 0.5 + originX + imgW / 2;
      var my = mouse.y * (viewH / 2);
      var R = imgW * 0.14;
      var R2 = R * R;

      var K = 0.045;       // rugó-állandó
      var DAMP = 0.86;     // csillapítás
      var FORCE = 2.6;     // egér-taszítás

      var arr = geometry.attributes.position.array;
      for (var i = 0; i < COUNT; i++) {
        var i3 = i * 3;
        var hx = homes[i3], hy = homes[i3 + 1], hz = homes[i3 + 2];

        var px, py, pz;
        if (!introDone) {
          // Bevezető: szétszóródott porból összeállás, késleltetve
          var lp = Math.max(0, Math.min(1, p * 1.6 - delays[i]));
          lp = 1 - Math.pow(1 - lp, 3); // easeOutCubic
          px = scatter[i3] + (hx - scatter[i3]) * lp;
          py = scatter[i3 + 1] + (hy - scatter[i3 + 1]) * lp;
          pz = scatter[i3 + 2] + (hz - scatter[i3 + 2]) * lp;
          pos[i3] = px; pos[i3 + 1] = py; pos[i3 + 2] = pz;
          arr[i3] = px; arr[i3 + 1] = py; arr[i3 + 2] = pz;
          continue;
        }

        // Rugó az alappont felé (+ finom hullám)
        var wave = Math.sin(t * 1.2 + jitter[i]) * 0.5;
        vel[i3] += (hx - pos[i3]) * K;
        vel[i3 + 1] += (hy - pos[i3 + 1]) * K;
        vel[i3 + 2] += (hz + wave - pos[i3 + 2]) * K;

        // Egér taszítása
        var dx = pos[i3] - mx;
        var dy = pos[i3 + 1] - my;
        var d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.0001) {
          var d = Math.sqrt(d2);
          var f = ((R - d) / R) * FORCE;
          vel[i3] += (dx / d) * f;
          vel[i3 + 1] += (dy / d) * f;
          vel[i3 + 2] += f * 0.6;
        }

        vel[i3] *= DAMP; vel[i3 + 1] *= DAMP; vel[i3 + 2] *= DAMP;
        pos[i3] += vel[i3]; pos[i3 + 1] += vel[i3 + 1]; pos[i3 + 2] += vel[i3 + 2];

        arr[i3] = pos[i3]; arr[i3 + 1] = pos[i3 + 1]; arr[i3 + 2] = pos[i3 + 2];
      }
      geometry.attributes.position.needsUpdate = true;

      // Parallax: a felhő finoman követi az egeret
      points.rotation.y = mouse.x * 0.06;
      points.rotation.x = -mouse.y * 0.03;

      material.size = pointSize; // resize után

      renderer.render(scene, camera);
    }

    requestAnimationFrame(tick);
  }
})();
