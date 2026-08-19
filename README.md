# Sujith K. Mandala — Portfolio

A minimalist **glassmorphism** portfolio built with plain HTML, CSS, and vanilla JavaScript. No build step, no dependencies — just open and deploy.

## ✨ Features

- Frosted-glass UI with an animated aurora background
- Light / dark theme toggle (remembers your choice)
- Typed role animation, scroll-reveal, animated stat counters
- Scroll progress bar + active-section nav highlighting
- Fully responsive with a mobile glass menu
- Respects `prefers-reduced-motion` and `prefers-color-scheme`

## 📁 Structure

```
portfolio/
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── js/main.js
│   └── SKM_Resume.pdf
├── .nojekyll
└── README.md
```

## 🚀 Deploy to GitHub Pages

1. Create a new repository (for a root URL, name it `<your-username>.github.io`).
2. Push the contents of this `portfolio/` folder to the repo root:

   ```bash
   cd portfolio
   git init
   git add .
   git commit -m "Portfolio"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

3. In the repo, go to **Settings → Pages**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`, and save.
4. Your site goes live at `https://<username>.github.io/<repo>/` (or `https://<username>.github.io/` for a user site).

> The included `.nojekyll` file tells GitHub Pages to serve the files as-is.

## 🖥️ Preview locally

```bash
cd portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

## 🎨 Customise

- Colours & glass tuning: CSS variables at the top of `assets/css/styles.css`.
- Typed roles: the `roles` array in `assets/js/main.js`.
- Content: everything lives in `index.html`.
