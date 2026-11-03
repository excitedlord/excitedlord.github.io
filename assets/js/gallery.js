/* The photo list comes from assets/photos.json, which a GitHub Action
   rebuilds whenever you add images to assets/photos/ (newest first). */
(function () {
  /* ---- shared site behaviour (same as main.js): theme, mobile menu, year ---- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  menuBtn?.addEventListener("click", () => { menuBtn.classList.toggle("open"); navLinks.classList.toggle("open"); });
  navLinks?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    menuBtn.classList.remove("open"); navLinks.classList.remove("open");
  }));

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- gallery ---- */
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const viewer = document.getElementById("viewer");
  const img = document.getElementById("viewer-img");
  let photos = [];
  let current = 0;

  fetch("assets/photos.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((list) => {
      photos = list;
      if (!photos.length) { status.textContent = "No photographs yet."; return; }
      render();
    })
    .catch(() => { status.textContent = "The photographs could not be loaded. Try again later."; });

  function render() {
    photos.forEach((p, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile";
      btn.setAttribute("aria-label", "Open photograph " + (i + 1) + " in colour");
      const thumb = document.createElement("img");
      thumb.src = p.thumb || p.src;
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.decoding = "async";
      btn.appendChild(thumb);
      btn.addEventListener("click", () => open(i));
      li.appendChild(btn);
      grid.appendChild(li);
    });
  }

  function reveal() {
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("is-colour")));
  }

  function show(i) {
    current = (i + photos.length) % photos.length;
    img.classList.remove("is-colour");
    img.onload = reveal;
    img.alt = "Photograph " + (current + 1) + " of " + photos.length;
    img.src = photos[current].src;
    if (img.complete) reveal();
    [current - 1, current + 1].forEach((n) => {
      new Image().src = photos[(n + photos.length) % photos.length].src;
    });
  }

  function open(i) {
    show(i);
    if (!viewer.open) viewer.showModal();
  }

  viewer.querySelector(".close").addEventListener("click", () => viewer.close());
  viewer.querySelector(".prev").addEventListener("click", () => show(current - 1));
  viewer.querySelector(".next").addEventListener("click", () => show(current + 1));
  viewer.addEventListener("click", (e) => { if (e.target === viewer) viewer.close(); });

  document.addEventListener("keydown", (e) => {
    if (!viewer.open) return;
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  let startX = null;
  viewer.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();
