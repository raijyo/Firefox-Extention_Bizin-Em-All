const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SCRIPT_SOURCE = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const STYLE_ID = "bizin-em-all-style";
const flush = () => Promise.resolve();

class FakeContainer {
  constructor(documentRef) {
    this.documentRef = documentRef;
    this.children = [];
  }

  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);

    if (node.id) {
      this.documentRef.idMap.set(node.id, node);
    }

    return node;
  }

  removeChild(node) {
    const index = this.children.indexOf(node);
    if (index >= 0) {
      this.children.splice(index, 1);
    }

    if (node.id && this.documentRef.idMap.get(node.id) === node) {
      this.documentRef.idMap.delete(node.id);
    }

    node.parentNode = null;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.id = "";
    this.textContent = "";
    this.parentNode = null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }
}

class FakeDocument {
  constructor({ withHead = true } = {}) {
    this.idMap = new Map();
    this.documentElement = new FakeContainer(this);
    this.head = withHead ? new FakeContainer(this) : null;
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  getElementById(id) {
    return this.idMap.get(id) || null;
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function createBrowserMock(initialEnabled) {
  let storedEnabled = initialEnabled;
  const listeners = [];

  const browser = {
    storage: {
      local: {
        get(defaults) {
          const defaultValue = defaults.enabled;
          const enabled = storedEnabled === undefined ? defaultValue : storedEnabled;
          return Promise.resolve({ enabled });
        },
        set(values) {
          if (Object.prototype.hasOwnProperty.call(values, "enabled")) {
            storedEnabled = values.enabled;
          }
          return Promise.resolve();
        }
      },
      onChanged: {
        addListener(listener) {
          listeners.push(listener);
        }
      }
    },
    runtime: {
      getURL(path) {
        return `moz-extension://example/${path}`;
      }
    }
  };

  function emitChange({ newValue, areaName = "local", key = "enabled" }) {
    const changes = { [key]: { newValue } };
    for (const listener of listeners) {
      listener(changes, areaName);
    }
  }

  return { browser, emitChange };
}

function runContentScript({ initialEnabled, withHead = true } = {}) {
  const document = new FakeDocument({ withHead });
  const { browser, emitChange } = createBrowserMock(initialEnabled);

  vm.runInNewContext(
    SCRIPT_SOURCE,
    { browser, document },
    { filename: "content.js" }
  );

  return { document, emitChange };
}

test("injects style on startup when enabled defaults to true", () => {
  return (async () => {
  const { document } = runContentScript();
  await flush();
  const style = document.getElementById(STYLE_ID);

  assert.ok(style, "style element should be injected");
  assert.match(style.textContent, /@font-face/);
  assert.match(style.textContent, /font-family:\s*"Bizin Gothic Embedded",\s*sans-serif !important;/);
  })();
});

test("does not inject style when enabled is false", () => {
  return (async () => {
  const { document } = runContentScript({ initialEnabled: false });
  await flush();

  assert.equal(document.getElementById(STYLE_ID), null);
  })();
});

test("toggles style with storage.onChanged events", () => {
  return (async () => {
  const { document, emitChange } = runContentScript({ initialEnabled: false });
  await flush();

  assert.equal(document.getElementById(STYLE_ID), null);

  emitChange({ newValue: true });
  await flush();
  assert.ok(document.getElementById(STYLE_ID));

  emitChange({ newValue: false });
  await flush();
  assert.equal(document.getElementById(STYLE_ID), null);
  })();
});

test("ignores unrelated storage events", () => {
  return (async () => {
  const { document, emitChange } = runContentScript({ initialEnabled: true });
  await flush();

  emitChange({ newValue: false, areaName: "sync" });
  assert.ok(document.getElementById(STYLE_ID));

  emitChange({ newValue: false, key: "otherKey" });
  assert.ok(document.getElementById(STYLE_ID));
  })();
});

test("does not duplicate style when enabled event repeats", () => {
  return (async () => {
  const { document, emitChange } = runContentScript({ initialEnabled: true });
  await flush();
  const target = document.head || document.documentElement;

  assert.equal(target.children.length, 1);

  emitChange({ newValue: true });
  assert.equal(target.children.length, 1);
  })();
});

test("falls back to documentElement when head is unavailable", () => {
  return (async () => {
  const { document } = runContentScript({ initialEnabled: true, withHead: false });
  await flush();

  assert.ok(document.getElementById(STYLE_ID));
  assert.equal(document.documentElement.children.length, 1);
  })();
});
