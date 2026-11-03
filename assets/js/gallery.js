/* ------------------------------------------------------------------
   Add your photographs here. Put the files in assets/photos/.
   - src:   the full-size image (shown in colour when opened)
   - thumb: optional smaller version for the grid (faster loading)
   - title: shown under the photo when opened
   - alt:   a short description for screen readers
------------------------------------------------------------------- */
const photos = [
  { src: "assets/photos/photo-01.jpg", thumb: "assets/photos/thumbs/photo-01.jpg", title: "Title one",   alt: "Describe photo one" },
  { src: "assets/photos/photo-02.jpg", thumb: "assets/photos/thumbs/photo-02.jpg", title: "Title two",   alt: "Describe photo two" },
  { src: "assets/photos/photo-03.jpg", thumb: "assets/photos/thumbs/photo-03.jpg", title: "Title three", alt: "Describe photo three" },
  { src: "assets/photos/photo-04.jpg", thumb: "assets/photos/thumbs/photo-04.jpg", title: "Title four",  alt: "Describe photo four" },
  { src: "assets/photos/photo-05.jpg", thumb: "assets/photos/thumbs/photo-05.jpg", title: "Title five",  alt: "Describe photo five" },
  { src: "assets/photos/photo-06.jpg", thumb: "assets/photos/thumbs/photo-06.jpg", title: "Title six",   alt: "Describe photo six" }
];

(function () {
  const grid = document.getElementById("grid");
  const viewer = document.getElementById("viewer");
  const img = document.getElementById("viewer-img");
  const cap = document.getElementById("viewer-cap");
  let current = 0;

  if (!photos.length) {
    grid.outerHTML = '<p class="empty">No photographs yet.</p>';
    return;
  }

  photos.forEach((p, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.setAttribute("aria-label", "Open " + (p.title || "photograph " + (i + 1)) + " in colour");
    const thumb = document.createElement("img");
    thumb.src = p.thumb || p.src;
    thumb.alt = p.alt || "";
    thumb.loading = "lazy";
    thumb.decoding = "async";
    btn.appendChild(thumb);
    btn.addEventListener("click", () => open(i));
    li.appendChild(btn);
    grid.appendChild(li);
  });

  function reveal() {
    requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("is-colour")));
  }

  function show(i) {
    current = (i + photos.length) % photos.length;
    const p = photos[current];
    img.classList.remove("is-colour");
    img.onload = reveal;
    img.alt = p.alt || "";
    img.src = p.src;
    cap.textContent = p.title || "";
    if (img.complete) reveal();
    // warm the cache for neighbours
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

  // click on the dark area (not the photo) closes
  viewer.addEventListener("click", (e) => { if (e.target === viewer) viewer.close(); });

  document.addEventListener("keydown", (e) => {
    if (!viewer.open) return;
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  // swipe on touch screens
  let startX = null;
  viewer.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();
