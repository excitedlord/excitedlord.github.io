(() => {
  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const isMobile = window.innerWidth <= 820;

  /* ============================================================
     1. LOADING SCREEN
     ============================================================ */
  const loader = doc.getElementById("loader");
  const loaderChars = doc.querySelectorAll("#loaderText span");

  doc.body.classList.add("loading");

  let charIdx = 0;
  function typeLoader() {
    if (charIdx < loaderChars.length) {
      loaderChars[charIdx].classList.add("show");
      charIdx++;
      setTimeout(typeLoader, 200);
    } else {
      setTimeout(() => {
        loader.classList.add("done");
        doc.body.classList.remove("loading");
        setTimeout(() => { loader.style.display = "none"; }, 900);
      }, 600);
    }
  }

  doc.fonts.ready.then(() => setTimeout(typeLoader, 300));

  /* ============================================================
     2. THEME
     ============================================================ */
  const themeToggle = doc.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  root.setAttribute("data-theme", savedTheme || (prefersLight ? "light" : "dark"));

  function isDark() { return root.getAttribute("data-theme") !== "light"; }

  themeToggle?.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    if (particleSystem) particleSystem.updateColor();
  });

  /* ============================================================
     3. DOT-MATRIX PORTRAIT (image-sampled, floating)
     ============================================================ */
  const pCanvas = doc.getElementById("particleCanvas");
  const pCtx = pCanvas ? pCanvas.getContext("2d") : null;
  let particleSystem = null;

  const SAMPLE_GAP = 3;
  const MOUSE_RADIUS = 90;
  const SPRING = 0.018;
  const FRICTION = 0.88;

  class ParticleImage {
    constructor(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.particles = [];
      this.mouse = { x: -9999, y: -9999 };
      this.color = isDark() ? "255,255,255" : "0,0,0";
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.running = true;
      this.img = null;
      this.w = 0;
      this.h = 0;
      this.animate = this.animate.bind(this);
      this.loadImage();
    }

    loadImage() {
      const img = new Image();
      img.src = "assets/portrait.png";
      img.onload = () => {
        this.img = img;
        this.initCanvas();
        this.buildParticles();
        requestAnimationFrame(this.animate);
      };
    }

    initCanvas() {
      const wrap = this.canvas.parentElement;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      this.canvas.width = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.w = w;
      this.h = h;
    }

    buildParticles() {
      if (!this.img) return;

      const off = doc.createElement("canvas");
      off.width = this.w;
      off.height = this.h;
      const offCtx = off.getContext("2d");

      // Scale image to fit canvas, centered
      const scale = Math.min(this.w / this.img.width, this.h / this.img.height);
      const dw = this.img.width * scale;
      const dh = this.img.height * scale;
      const dx = (this.w - dw) / 2;
      const dy = (this.h - dh) / 2;
      offCtx.drawImage(this.img, dx, dy, dw, dh);

      const data = offCtx.getImageData(0, 0, this.w, this.h).data;
      this.particles = [];

      for (let y = Math.ceil(dy); y < dy + dh; y += SAMPLE_GAP) {
        for (let x = Math.ceil(dx); x < dx + dw; x += SAMPLE_GAP) {
          const i = (y * this.w + x) * 4;
          const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (brightness < 200) {
            this.particles.push({
              homeX: x,
              homeY: y,
              x: x + (Math.random() - 0.5) * this.w * 0.6,
              y: y + (Math.random() - 0.5) * this.h * 0.6,
              vx: 0,
              vy: 0,
              r: (Math.random() * 0.5 + 0.5) + (1 - brightness / 255) * 0.5,
              phase: Math.random() * Math.PI * 2,
              ampX: Math.random() * 2.0 + 0.5,
              ampY: Math.random() * 1.5 + 0.4,
              speed: Math.random() * 0.0012 + 0.0006,
              baseBright: brightness,
            });
          }
        }
      }
    }

    updateColor() { this.color = isDark() ? "255,255,255" : "0,0,0"; }

    animate(now) {
      if (!this.running) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      const mx = this.mouse.x;
      const my = this.mouse.y;
      const col = this.color;
      const t = now || 0;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        // Breathing drift
        const breathX = Math.sin(t * p.speed + p.phase) * p.ampX;
        const breathY = Math.cos(t * p.speed * 0.7 + p.phase + 1.3) * p.ampY;
        const targetX = p.homeX + breathX;
        const targetY = p.homeY + breathY;

        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.vx += (dx / dist) * force * 3;
          p.vy += (dy / dist) * force * 3;
        }

        p.vx += (targetX - p.x) * SPRING;
        p.vy += (targetY - p.y) * SPRING;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // Darker source pixels → more opaque particles
        const baseAlpha = 0.3 + (1 - p.baseBright / 255) * 0.5;
        const flicker = Math.sin(t * p.speed * 2 + p.phase) * 0.08;
        const alpha = dist < MOUSE_RADIUS
          ? baseAlpha + (1 - dist / MOUSE_RADIUS) * 0.3
          : baseAlpha + flicker;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col}, ${alpha})`;
        ctx.fill();
      }

      requestAnimationFrame(this.animate);
    }

    onMouseMove(x, y) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = x - rect.left;
      this.mouse.y = y - rect.top;
    }

    onMouseLeave() { this.mouse.x = -9999; this.mouse.y = -9999; }

    resize() {
      if (!this.img) return;
      this.initCanvas();
      this.buildParticles();
    }

    destroy() { this.running = false; }
  }

  function initParticleImage() {
    if (!pCanvas || !pCtx) return;
    doc.fonts.ready.then(() => {
      if (particleSystem) particleSystem.destroy();
      particleSystem = new ParticleImage(pCanvas, pCtx);

      pCanvas.addEventListener("mousemove", (e) => particleSystem.onMouseMove(e.clientX, e.clientY));
      pCanvas.addEventListener("mouseleave", () => particleSystem.onMouseLeave());
      pCanvas.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        particleSystem.onMouseMove(t.clientX, t.clientY);
      }, { passive: true });
      pCanvas.addEventListener("touchend", () => particleSystem.onMouseLeave());
    });
  }

  initParticleImage();
  window.addEventListener("resize", () => { if (particleSystem) particleSystem.resize(); });

  /* ============================================================
     4. CUSTOM CURSOR
     ============================================================ */
  const cursorDot = doc.getElementById("cursorDot");
  const cursorRing = doc.getElementById("cursorRing");
  let ringX = -100, ringY = -100;

  if (!isMobile && cursorDot && cursorRing) {
    cursorDot.style.left = "-100px";
    cursorDot.style.top = "-100px";
    window.addEventListener("mousemove", (e) => {
      cursorDot.style.left = e.clientX + "px";
      cursorDot.style.top = e.clientY + "px";
    });

    function animateRing() {
      ringX += (parseFloat(cursorDot.style.left) - ringX) * 0.12;
      ringY += (parseFloat(cursorDot.style.top) - ringY) * 0.12;
      cursorRing.style.left = ringX + "px";
      cursorRing.style.top = ringY + "px";
      requestAnimationFrame(animateRing);
    }
    animateRing();

    doc.querySelectorAll("a, button, .exp-item, .research-item, .award-row, .pub-row, .edu-row").forEach((el) => {
      el.addEventListener("mouseenter", () => cursorRing.classList.add("hover"));
      el.addEventListener("mouseleave", () => cursorRing.classList.remove("hover"));
    });
  }

  /* ============================================================
     5. SPLIT TEXT ANIMATION
     ============================================================ */
  doc.querySelectorAll(".split-text").forEach((el) => {
    const text = el.textContent;
    el.innerHTML = "";
    text.split(/(\s+)/).forEach((word) => {
      if (/^\s+$/.test(word)) {
        const s = doc.createElement("span");
        s.className = "char space";
        s.innerHTML = "&nbsp;";
        el.appendChild(s);
        return;
      }
      const w = doc.createElement("span");
      w.className = "word";
      word.split("").forEach((ch, i) => {
        const c = doc.createElement("span");
        c.className = "char";
        c.textContent = ch;
        c.style.transitionDelay = `${i * 30}ms`;
        w.appendChild(c);
      });
      el.appendChild(w);
    });
  });

  const splitObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); splitObs.unobserve(e.target); } }),
    { threshold: 0.15 }
  );
  doc.querySelectorAll(".split-text").forEach((el) => splitObs.observe(el));

  /* ============================================================
     6. SCROLL REVEAL
     ============================================================ */
  const revealObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); revealObs.unobserve(e.target); } }),
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  doc.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 5, 4) * 60}ms`;
    revealObs.observe(el);
  });

  /* ============================================================
     7. STAT COUNTERS
     ============================================================ */
  const fmt = (n) => (n >= 1000 ? Math.round(n / 1000) + "k" : String(n));

  const countObs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.target, suffix = el.dataset.suffix || "";
      const dur = 1200, start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = fmt(Math.floor((1 - Math.pow(1 - p, 3)) * target)) + suffix;
        if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(target) + suffix;
      };
      requestAnimationFrame(tick);
      countObs.unobserve(el);
    }),
    { threshold: 0.5 }
  );
  doc.querySelectorAll(".stat-num[data-target]").forEach((el) => countObs.observe(el));

  /* ============================================================
     8. TYPED ROLES
     ============================================================ */
  const typedEl = doc.getElementById("typed");
  const roles = ["Associate Data Scientist @ CommBank", "Agentic AI Engineer", "LLM & VLM Researcher", "Kaggle Grandmaster"];
  let rIdx = 0, cIdx = 0, deleting = false;

  function typeLoop() {
    if (!typedEl) return;
    const word = roles[rIdx];
    typedEl.textContent = word.slice(0, cIdx);
    if (!deleting && cIdx < word.length) cIdx++;
    else if (deleting && cIdx > 0) cIdx--;
    else if (!deleting) { deleting = true; return setTimeout(typeLoop, 1800); }
    else { deleting = false; rIdx = (rIdx + 1) % roles.length; }
    setTimeout(typeLoop, deleting ? 35 : 70);
  }
  typeLoop();

  /* ============================================================
     9. NAVBAR
     ============================================================ */
  const nav = doc.getElementById("navbar");
  const navAnchors = [...doc.querySelectorAll(".nav-links a")];
  const sections = navAnchors.map((a) => doc.querySelector(a.getAttribute("href"))).filter(Boolean);

  function onScroll() {
    const y = window.scrollY;
    let current = "";
    sections.forEach((sec) => { if (y >= sec.offsetTop - 180) current = "#" + sec.id; });
    navAnchors.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === current));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ============================================================
     10. MOBILE MENU
     ============================================================ */
  const menuBtn = doc.getElementById("menuBtn");
  const navLinks = doc.getElementById("navLinks");
  menuBtn?.addEventListener("click", () => { menuBtn.classList.toggle("open"); navLinks.classList.toggle("open"); });
  navLinks?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { menuBtn.classList.remove("open"); navLinks.classList.remove("open"); }));

  /* ============================================================
     11. YEAR
     ============================================================ */
  const yearEl = doc.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
