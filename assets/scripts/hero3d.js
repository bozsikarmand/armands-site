/* 3D hero réteg – az eredeti split dizájn felett.
 * A részecskék a fotó felett lebegnek (a canvas a kép és a tartalom panel között van).
 * Kikapcsolva marad, ha a felhasználó prefers-reduced-motion-t kér,
 * vagy a böngésző nem tud WebGL-t. Three.js: lokálisan, /assets/scripts/vendor. */

(function () {
  // Diagnosztika: a script LEGFELSŐ szintjén, azonnal
  function status(msg, color) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;font:12px monospace;color:' +
      (color || '#0f0') + ';background:#000;padding:2px 6px;';
    el.textContent = msg;
    document.body.appendChild(el);
  }
  window.addEventListener('error', function (e) {
    status('JS-HIBA: ' + e.message, '#f66');
  });

  status('hero3d: script fut', '#ff0');

  var canvas = document.getElementById('hero-canvas');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFallback() {
    document.body.classList.add('no-canvas');
  }

  if (!canvas || prefersReducedMotion) {
    showFallback();
    status(!canvas ? '3D: NINCS CANVAS elem' : '3D: KIKAPCSOLVA (reduced-motion)', '#f66');
    return;
  }

  init().catch(function (err) {
    showFallback();
    status('3D: INIT-HIBA: ' + (err && err.message ? err.message : err), '#f66');
  });

  async function init() {
    var THREE;
    try {
      THREE = await import('/assets/scripts/vendor/three.module.min.js');
    } catch (e) {
      throw new Error('three.js import sikertelen: ' + (e && e.message ? e.message : e));
    }
    status('hero3d: three.js betöltve', '#0f0');

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (e) {
      throw new Error('WebGL unavailable');
    }

    var isSmall = Math.min(window.innerWidth, window.innerHeight) < 720;
    var COUNT = isSmall ? 1400 : 2800;
    // A fotó felett: visszafogott, világos részecskék (teal/fehér + kevés meleg)
    var PALETTE = ['#78DCE8', '#FCFCFA', '#FCFCFA', '#FFD866'];

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
    camera.position.z = 62;

    var positions = new Float32Array(COUNT * 3);
    var base = new Float32Array(COUNT * 3);
    var colors = new Float32Array(COUNT * 3);
    var phases = new Float32Array(COUNT);
    var color = new THREE.Color();

    for (var i = 0; i < COUNT; i++) {
      var i3 = i * 3;
      base[i3] = positions[i3] = (Math.random() - 0.5) * 170;
      base[i3 + 1] = positions[i3 + 1] = (Math.random() - 0.5) * 95;
      base[i3 + 2] = positions[i3 + 2] = (Math.random() - 0.5) * 70 - 10;
      phases[i] = Math.random() * Math.PI * 2;
      color.set(PALETTE[(Math.random() * PALETTE.length) | 0]);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var material = new THREE.PointsMaterial({
      size: isSmall ? 2.0 : 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    var points = new THREE.Points(geometry, material);
    scene.add(points);

    var mouse = new THREE.Vector2(0, 0);
    var target = new THREE.Vector2(0, 0);
    window.addEventListener('pointermove', function (e) {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });

    function resize() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    var running = true;
    var t = 0;
    var fade = 0;

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });

    var viewHalfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    var REPEL_RADIUS = 15;
    var REPEL_FORCE = 0.32;

    function tick() {
      if (!running) return;
      requestAnimationFrame(tick);

      t += 0.011;
      fade = Math.min(1, fade + 0.01);
      material.opacity = fade * 0.95;

      mouse.lerp(target, 0.045);
      var mx = mouse.x * viewHalfH * camera.aspect;
      var my = mouse.y * viewHalfH;
      var r2 = REPEL_RADIUS * REPEL_RADIUS;

      var pos = geometry.attributes.position.array;
      for (var i = 0; i < COUNT; i++) {
        var i3 = i * 3;
        var ph = phases[i];
        var x = base[i3] + Math.sin(t * 0.6 + ph) * 1.6;
        var y = base[i3 + 1] + Math.cos(t * 0.5 + ph * 1.3) * 1.4;
        var z = base[i3 + 2] + Math.sin(t * 0.3 + ph) * 2;

        var dx = x - mx;
        var dy = y - my;
        var d2 = dx * dx + dy * dy;
        if (d2 < r2 && d2 > 0.0001) {
          var d = Math.sqrt(d2);
          var f = ((REPEL_RADIUS - d) / REPEL_RADIUS) * REPEL_FORCE;
          x += (dx / d) * f * REPEL_RADIUS * 0.4;
          y += (dy / d) * f * REPEL_RADIUS * 0.4;
        }

        pos[i3] = x;
        pos[i3 + 1] = y;
        pos[i3 + 2] = z;
      }
      geometry.attributes.position.needsUpdate = true;

      points.rotation.y = mouse.x * 0.05;
      points.rotation.x = -mouse.y * 0.035;

      renderer.render(scene, camera);
    }

    requestAnimationFrame(tick);
    status('3D: BE (renderer OK)');
  }
})();
