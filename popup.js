const enabledInput = document.getElementById("enabled");
const themesEl = document.getElementById("themes");
const fields = document.querySelectorAll("[data-key]");

let settings = structuredClone(AMZ_DEFAULTS);

function save() {
  chrome.storage.local.set(settings);
  render();
}

function themeButton(id, theme) {
  const btn = document.createElement("button");
  btn.className = "theme";
  btn.dataset.id = id;
  btn.style.background = theme.bg;
  btn.style.color = theme.text;
  btn.innerHTML = `<span class="bar"></span><span class="label"></span>`;
  btn.querySelector(".bar").style.background = theme.nav;
  btn.querySelector(".bar").style.borderBottom = `2px solid ${theme.accent ?? AMZ_THEMES.grigio.accent}`;
  btn.querySelector(".label").textContent = theme.name;
  btn.addEventListener("click", () => {
    settings.theme = id;
    save();
  });
  return btn;
}

function render() {
  enabledInput.checked = settings.enabled;

  themesEl.replaceChildren(
    ...Object.entries(AMZ_THEMES).map(([id, t]) => themeButton(id, t)),
    themeButton("custom", settings.custom),
  );
  for (const btn of themesEl.children) {
    btn.setAttribute("aria-pressed", String(btn.dataset.id === settings.theme));
  }

  const active = amzActiveTheme(settings);
  for (const input of fields) {
    if (document.activeElement !== input) input.value = active[input.dataset.key];
  }
}

enabledInput.addEventListener("change", () => {
  settings.enabled = enabledInput.checked;
  save();
});

for (const input of fields) {
  input.addEventListener("input", () => {
    // Partendo da un tema predefinito, il personalizzato ne eredita i valori.
    if (settings.theme !== "custom") {
      settings.custom = { ...amzActiveTheme(settings), name: "Personalizzato" };
      settings.theme = "custom";
    }
    const key = input.dataset.key;
    settings.custom[key] = key === "img" ? Number(input.value) : input.value;
    save();
  });
}

chrome.storage.local.get(AMZ_DEFAULTS, (stored) => {
  settings = stored;
  render();
});
