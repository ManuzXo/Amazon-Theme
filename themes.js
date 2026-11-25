// Condiviso tra content script e popup.

// nav è sempre ben più chiaro di bg e accent è la linea sotto la barra: così la barra in
// alto si distingue dalla pagina con qualunque tema.
const AMZ_THEMES = {
  grigio:   { name: "Grigio",    bg: "#222222", text: "#e3e3e3", nav: "#3a3a3a", accent: "#e89a3c", img: 95 },
  nero:     { name: "Nero",      bg: "#000000", text: "#ffffff", nav: "#232323", accent: "#e89a3c", img: 90 },
  notte:    { name: "Blu notte", bg: "#18202c", text: "#dde3ec", nav: "#2c3a50", accent: "#5aa9e6", img: 95 },
  ardesia:  { name: "Ardesia",   bg: "#2b2d36", text: "#e6e6ee", nav: "#41455a", accent: "#a99cf0", img: 95 },
  seppia:   { name: "Seppia",    bg: "#2a2420", text: "#ecdfcc", nav: "#4a3d32", accent: "#e0a060", img: 90 },
  bosco:    { name: "Bosco",     bg: "#1b2420", text: "#dce8e0", nav: "#2e4037", accent: "#7fc79a", img: 95 },
};

const AMZ_DEFAULTS = {
  enabled: true,
  theme: "grigio",
  custom: { ...AMZ_THEMES.grigio, name: "Personalizzato" },
};

function amzActiveTheme(settings) {
  // Il merge copre temi personalizzati salvati prima che esistessero nuovi campi.
  if (settings.theme === "custom") return { ...AMZ_THEMES.grigio, ...settings.custom };
  return AMZ_THEMES[settings.theme] ?? AMZ_THEMES.grigio;
}

// --- Conversione colori -------------------------------------------------------------
// La pagina viene resa con F(x) = hue-rotate(180deg)(invert(x)). Per ottenere un colore
// finale Y bisogna disegnare, prima del filtro, F⁻¹(Y) = 1 - H⁻¹·Y.

const AMZ_H180 = (() => {
  const c = -1, s = 0;
  return [
    [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
    [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
    [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
  ];
})();

const AMZ_H180_INV = (([[a, b, c], [d, e, f], [g, h, i]]) => {
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
})(AMZ_H180);

function amzHexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

function amzPreFilter(hex) {
  const y = amzHexToRgb(hex);
  const pre = AMZ_H180_INV.map((row) => 1 - row.reduce((sum, k, j) => sum + k * y[j], 0));
  const [r, g, b] = pre.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
  return `rgb(${r}, ${g}, ${b})`;
}

function amzThemeVars(t) {
  return {
    "--amz-cap": amzPreFilter(t.bg),     // i bianchi della pagina diventano lo sfondo
    "--amz-lift": amzPreFilter(t.text),  // i neri della pagina diventano il testo
    "--amz-nav": t.nav,                  // barra in alto (non invertita)
    "--amz-nav-pre": amzPreFilter(t.nav),// barra delle categorie (invertita)
    "--amz-accent-pre": amzPreFilter(t.accent), // linea sotto la barra (invertita)
    "--amz-img": String(t.img / 100),    // luminosità di immagini e video
  };
}
