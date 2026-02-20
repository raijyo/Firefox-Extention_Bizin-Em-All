(() => {
  const STORAGE_KEY = "enabled";
  const STYLE_ID = "bizin-em-all-style";
  const FONT_STACK = '"Bizin Gothic", "BIZ UDGothic", "BIZ UDPGothic", "Yu Gothic UI", "Yu Gothic", sans-serif';
  const ICON_CLASS_EXCLUSION = [
    ":not(.material-icons)",
    ":not(.material-icons-outlined)",
    ":not(.material-icons-round)",
    ":not(.material-icons-rounded)",
    ":not(.material-icons-sharp)",
    ":not(.material-icons-two-tone)",
    ":not(.material-symbols-outlined)",
    ":not(.material-symbols-rounded)",
    ":not(.material-symbols-sharp)"
  ].join("");

  function getStyleElement() {
    return document.getElementById(STYLE_ID);
  }

  function applyForcedFont() {
    if (getStyleElement()) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      :root,
      :root *${ICON_CLASS_EXCLUSION},
      :root *${ICON_CLASS_EXCLUSION}::before,
      :root *${ICON_CLASS_EXCLUSION}::after {
        font-family: ${FONT_STACK} !important;
      }

      .material-icons {
        font-family: "Material Icons" !important;
      }

      .material-icons-outlined {
        font-family: "Material Icons Outlined" !important;
      }

      .material-icons-round,
      .material-icons-rounded {
        font-family: "Material Icons Round" !important;
      }

      .material-icons-sharp {
        font-family: "Material Icons Sharp" !important;
      }

      .material-icons-two-tone {
        font-family: "Material Icons Two Tone" !important;
      }

      .material-symbols-outlined {
        font-family: "Material Symbols Outlined" !important;
      }

      .material-symbols-rounded {
        font-family: "Material Symbols Rounded" !important;
      }

      .material-symbols-sharp {
        font-family: "Material Symbols Sharp" !important;
      }
    `;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  function removeForcedFont() {
    const style = getStyleElement();
    if (style) {
      style.remove();
    }
  }

  function setEnabled(enabled) {
    if (enabled) {
      applyForcedFont();
      return;
    }
    removeForcedFont();
  }

  chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
    setEnabled(Boolean(result[STORAGE_KEY]));
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }

    setEnabled(Boolean(changes[STORAGE_KEY].newValue));
  });
})();
