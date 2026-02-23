(() => {
  const STORAGE_KEY = "enabled";
  const STORAGE_DEFAULTS = { [STORAGE_KEY]: true };
  const STYLE_ID = "bizin-em-all-style";
  const FONT_STACK = '"Bizin Gothic Embedded", sans-serif';

  const browserApi = typeof browser !== "undefined" ? browser : null;
  const storage = browserApi?.storage;
  const runtime = browserApi?.runtime;

  if (!storage || !storage.local || !runtime || !runtime.getURL) {
    return;
  }

  function getFontUrl(path) {
    try {
      return runtime.getURL(path);
    } catch {
      return "";
    }
  }

  function readEnabled(callback) {
    storage.local
      .get(STORAGE_DEFAULTS)
      .then((result) => callback(result))
      .catch(() => callback(STORAGE_DEFAULTS));
  }

  function buildFontFaceCss() {
    const regularFontUrl = getFontUrl("fonts/BIZUDGothic-Regular.ttf");
    const boldFontUrl = getFontUrl("fonts/BIZUDGothic-Bold.ttf");
    const rules = [];

    if (regularFontUrl) {
      rules.push(`
        @font-face {
          font-family: "Bizin Gothic Embedded";
          src: url("${regularFontUrl}") format("truetype");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
      `);
    }

    if (boldFontUrl) {
      rules.push(`
        @font-face {
          font-family: "Bizin Gothic Embedded";
          src: url("${boldFontUrl}") format("truetype");
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
      `);
    }

    return rules.join("");
  }

  function getStyleElement(root) {
    if (root.getElementById) {
      const byId = root.getElementById(STYLE_ID);
      if (byId) {
        return byId;
      }
    }

    if (root.querySelector) {
      return root.querySelector(`#${STYLE_ID}`);
    }

    return null;
  }

  function applyToRoot(root) {
    if (!root || getStyleElement(root)) {
      return;
    }

    const ownerDocument = root.ownerDocument || document;
    const style = ownerDocument.createElement("style");
    style.id = STYLE_ID;
    const fontFaceCss = buildFontFaceCss();
    style.textContent = `
      ${fontFaceCss}

      :root,
      :root *,
      :root *::before,
      :root *::after,
      :host,
      :host *,
      :host *::before,
      :host *::after,
      * {
        font-family: ${FONT_STACK} !important;
      }
    `;

    const target = root.appendChild ? root : ownerDocument.head || ownerDocument.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  function removeFromRoot(root) {
    if (!root) {
      return;
    }

    const style = getStyleElement(root);
    if (style) {
      style.remove();
    }
  }

  function applyToAllShadows(rootDoc) {
    const nodeList = rootDoc.querySelectorAll ? rootDoc.querySelectorAll("*") : [];
    for (const node of nodeList) {
      if (node && node.shadowRoot) {
        applyToRoot(node.shadowRoot);
      }
    }
  }

  function applyForcedFont() {
    applyToRoot(document);
    applyToAllShadows(document);
  }

  function removeForcedFont() {
    removeFromRoot(document);
    const nodes = document.querySelectorAll ? document.querySelectorAll("*") : [];
    for (const node of nodes) {
      if (node && node.shadowRoot) {
        removeFromRoot(node.shadowRoot);
      }
    }
  }

  function setEnabled(enabled) {
    if (enabled) {
      applyForcedFont();
      return;
    }
    removeForcedFont();
  }

  function attachShadowMonitor() {
    if (typeof Element === "undefined" || typeof Element.prototype.attachShadow !== "function") {
      return;
    }

    const nativeAttachShadow = Element.prototype.attachShadow;
    if (nativeAttachShadow.__bizinEmPatched) {
      return;
    }

    Element.prototype.attachShadow = function (init) {
      const shadowRoot = nativeAttachShadow.call(this, init);
      if (init?.mode === "open") {
        Promise.resolve().then(() => {
          applyToRoot(shadowRoot);
        });
      }
      return shadowRoot;
    };
    Element.prototype.attachShadow.__bizinEmPatched = true;
  }

  function observeMutations() {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes || []) {
          if (node && node.shadowRoot) {
            applyToRoot(node.shadowRoot);
          }
        }
      }
    });

    observer.observe(document, {
      subtree: true,
      childList: true
    });
  }

  attachShadowMonitor();
  observeMutations();

  readEnabled((result) => {
    setEnabled(Boolean(result[STORAGE_KEY]));
  });

  storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }
    setEnabled(Boolean(changes[STORAGE_KEY].newValue));
  });
})();
