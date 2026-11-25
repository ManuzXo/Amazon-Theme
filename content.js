const CLASS = "amz-dark";
const root = document.documentElement;

let theme = amzActiveTheme(AMZ_DEFAULTS);

function apply(settings) {
  theme = amzActiveTheme(settings);
  root.classList.toggle(CLASS, settings.enabled);
  for (const [name, value] of Object.entries(amzThemeVars(theme))) {
    root.style.setProperty(name, value);
  }
  schedule({ reset: true });
}

function load() {
  chrome.storage.local.get(AMZ_DEFAULTS, apply);
}

function isOn() {
  return root.classList.contains(CLASS);
}

// --- Leggibilità delle scritte nella barra in alto --------------------------------------
// Amazon a volte (es. Black Friday) usa testo scuro nella barra perché la colora di
// arancione; con lo sfondo del tema diventa illeggibile. La barra non è invertita, quindi
// i colori calcolati sono quelli reali: dove il contrasto è basso usiamo il testo del tema.

const NAV_TEXT = ":is(#nav-belt, #nav-main) :is(a, span, div, button, b, strong, label)";
const NAV_FIXED = "data-amz-dark-fixed";
const MIN_CONTRAST = 3.5;

function parseColor(str) {
  const m = str.match(/[\d.]+/g);
  if (!m) return null;
  const [r, g, b, a = 1] = m.map(Number);
  return { rgb: [r, g, b], a };
}

function luminance([r, g, b]) {
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function backgroundOf(el) {
  for (let node = el; node && node !== root; node = node.parentElement) {
    const bg = parseColor(getComputedStyle(node).backgroundColor);
    if (bg && bg.a > 0.5) return bg.rgb;
  }
  return amzHexToRgb(theme.nav).map((v) => v * 255);
}

function hasOwnText(el) {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return true;
  }
  return false;
}

function fixNavText() {
  // Prima tutte le letture, poi tutte le scritture, per non forzare ricalcoli di stile.
  const toFix = [];
  for (const el of document.querySelectorAll(NAV_TEXT)) {
    if (el.hasAttribute(NAV_FIXED) || !hasOwnText(el)) continue;
    const color = parseColor(getComputedStyle(el).color);
    if (color && contrast(color.rgb, backgroundOf(el)) < MIN_CONTRAST) toFix.push(el);
  }
  for (const el of toFix) {
    el.style.setProperty("color", theme.text, "important");
    el.setAttribute(NAV_FIXED, "");
  }
}

// --- Immagini: garantire che siano mostrate con i colori originali ----------------------
// dark.css re-inverte i media, ma alcune pagine (es. risultati di ricerca) annidano o
// sovrascrivono i filtri e l'immagine finisce invertita un numero pari di volte, cioè in
// negativo: un prodotto bianco su fondo bianco sparisce. Qui contiamo le inversioni reali
// (sull'elemento e sui suoi antenati) e correggiamo quelle sbagliate.

// Niente <picture>: vedi dark.css, il filtro va sull'<img> che contiene.
const MEDIA = "img, video, canvas, iframe, embed, object, [style*='background-image']";
const MEDIA_FIXED = "data-amz-dark-media";
const checkedMedia = new WeakSet();

function isInverting(el) {
  return getComputedStyle(el).filter.includes("invert(");
}

// true se l'elemento è visualizzato invertito (numero dispari di inversioni fino alla radice).
function invertedParity(el, cache) {
  if (!el) return false;
  if (cache.has(el)) return cache.get(el);
  const v = invertedParity(el.parentElement, cache) !== isInverting(el);
  cache.set(el, v);
  return v;
}

function fixMedia(elements) {
  const cache = new Map();
  for (const el of elements) {
    if (checkedMedia.has(el)) continue;
    checkedMedia.add(el);
    if (!invertedParity(el, cache)) continue;
    // Invertito: aggiungo o tolgo l'inversione sull'elemento stesso per tornare in pari.
    const filter = isInverting(el)
      ? "brightness(var(--amz-img, 1))"
      : "brightness(var(--amz-img, 1)) invert(1) hue-rotate(180deg)";
    el.style.setProperty("filter", filter, "important");
    el.setAttribute(MEDIA_FIXED, "");
    cache.clear(); // i discendenti già in cache ora hanno parità diversa
  }
}

function collectMedia(node, out) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches(MEDIA)) out.push(node);
  out.push(...node.querySelectorAll(MEDIA));
}

// --- Pianificazione ---------------------------------------------------------------------

let pending = false;
let needsReset = false;
let navDirty = false;
const addedNodes = [];

function resetFixes() {
  for (const el of document.querySelectorAll(`[${NAV_FIXED}]`)) {
    el.style.removeProperty("color");
    el.removeAttribute(NAV_FIXED);
  }
  for (const el of document.querySelectorAll(`[${MEDIA_FIXED}]`)) {
    el.style.removeProperty("filter");
    el.removeAttribute(MEDIA_FIXED);
  }
}

function run() {
  pending = false;
  if (!document.body) return;

  let media = [];
  if (needsReset) {
    resetFixes();
    media = [...document.querySelectorAll(MEDIA)];
    navDirty = true;
  } else {
    for (const node of addedNodes) collectMedia(node, media);
  }
  const reset = needsReset;
  needsReset = false;
  addedNodes.length = 0;

  if (!isOn()) return;
  if (reset) media.forEach((el) => checkedMedia.delete(el));
  fixMedia(media);
  if (navDirty) fixNavText();
  navDirty = false;
}

function schedule({ reset = false, nav = false } = {}) {
  needsReset ||= reset;
  navDirty ||= nav;
  if (pending) return;
  pending = true;
  requestAnimationFrame(run);
}

const NAV_ROOTS = "#navbar-main, #navbar, #nav-belt, #nav-main";
new MutationObserver((records) => {
  for (const r of records) addedNodes.push(...r.addedNodes);
  const nav = records.some((r) => r.target === document.body || r.target.closest?.(NAV_ROOTS));
  schedule({ nav });
}).observe(root, { childList: true, subtree: true });

document.addEventListener("DOMContentLoaded", () => schedule({ reset: true }));
window.addEventListener("load", () => schedule({ reset: true }));

// Attivo subito con il tema di default per evitare il "flash" bianco, poi carico quello salvato.
apply(AMZ_DEFAULTS);
load();

chrome.storage.onChanged.addListener((_, area) => {
  if (area === "local") load();
});
