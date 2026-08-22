/* ============================================================
   Portfolio interactions
   ============================================================ */
(() => {
  "use strict";

  const doc = document;
  const root = doc.documentElement;

  /* ---------- Preloader ---------- */
  const preloader = doc.getElementById("preloader");
  const preloaderMark = doc.getElementById("preloaderMark");
  const body = doc.body;

  function revealSite() {
    preloader?.classList.add("hide");
    body.classList.remove("preloading");
    preloader?.addEventListener("transitionend", () => preloader.remove(), { once: true });
  }

  if (preloader && preloaderMark) {
    const word = "SKM";
    let i = 0;
    const typePreloader = () => {
      preloaderMark.textContent = word.slice(0, i);
      i++;
      if (i <= word.length) {
        setTimeout(typePreloader, 160);
      } else {
        setTimeout(revealSite, 450);
      }
    };
    typePreloader();
  } else {
    body.classList.remove("preloading");
  }

  /* ---------- Theme ---------- */
  const themeToggle = doc.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  root.setAttribute("data-theme", savedTheme || (prefersLight ? "light" : "dark"));

  themeToggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  /* ---------- Year ---------- */
  const yearEl = doc.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Typed roles ---------- */
  const typedEl = doc.getElementById("typed");
  const roles = [
    "Associate Data Scientist @ CommBank",
    "Agentic AI Engineer",
    "LLM & VLM Researcher",
    "Kaggle Grandmaster",
  ];
  let rIdx = 0, cIdx = 0, deleting = false;

  function typeLoop() {
    if (!typedEl) return;
    const word = roles[rIdx];
    typedEl.textContent = word.slice(0, cIdx);

    if (!deleting && cIdx < word.length) {
      cIdx++;
    } else if (deleting && cIdx > 0) {
      cIdx--;
    } else if (!deleting && cIdx === word.length) {
      deleting = true;
      return setTimeout(typeLoop, 1600);
    } else {
      deleting = false;
      rIdx = (rIdx + 1) % roles.length;
    }
    setTimeout(typeLoop, deleting ? 45 : 85);
  }
  typeLoop();

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  doc.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
    io.observe(el);
  });

  /* ---------- Stat counters ---------- */
  const fmt = (n) =>
    n >= 1000 ? Math.round(n / 1000) + "k" : String(n);

  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = +el.dataset.target;
        const suffix = el.dataset.suffix || "";
        const dur = 1400;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(Math.floor(eased * target)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = fmt(target) + suffix;
        };
        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  doc.querySelectorAll(".stat-num[data-target]").forEach((el) =>
    countObserver.observe(el)
  );

  /* ---------- Navbar shrink + active link + progress ---------- */
  const nav = doc.getElementById("navbar");
  const progress = doc.getElementById("scrollProgress");
  const navAnchors = [...doc.querySelectorAll(".nav-links a")];
  const sections = navAnchors
    .map((a) => doc.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  function onScroll() {
    const y = window.scrollY;
    nav?.classList.toggle("shrink", y > 40);

    const h = doc.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (y / h) * 100 + "%";

    let current = "";
    sections.forEach((sec) => {
      if (y >= sec.offsetTop - 140) current = "#" + sec.id;
    });
    navAnchors.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === current)
    );
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuBtn = doc.getElementById("menuBtn");
  const navLinks = doc.getElementById("navLinks");
  menuBtn?.addEventListener("click", () => {
    menuBtn.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  navLinks?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      menuBtn.classList.remove("open");
      navLinks.classList.remove("open");
    })
  );
})();
