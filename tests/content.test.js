const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SCRIPT_SOURCE = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const STYLE_ID = "bizin-em-all-style";

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
}

function createChromeMock(initialEnabled) {
  let storedEnabled = initialEnabled;
  const listeners = [];

  const chrome = {
    storage: {
      local: {
        get(defaults, callback) {
          const defaultValue = defaults.enabled;
          const enabled = storedEnabled === undefined ? defaultValue : storedEnabled;
          callback({ enabled });
        },
        set(values) {
          if (Object.prototype.hasOwnProperty.call(values, "enabled")) {
            storedEnabled = values.enabled;
          }
        }
      },
      onChanged: {
        addListener(listener) {
          listeners.push(listener);
        }
      }
    }
  };

  function emitChange({ newValue, areaName = "local", key = "enabled" }) {
    const changes = { [key]: { newValue } };
    for (const listener of listeners) {
      listener(changes, areaName);
    }
  }

  return { chrome, emitChange };
}

function runContentScript({ initialEnabled, withHead = true } = {}) {
  const document = new FakeDocument({ withHead });
  const { chrome, emitChange } = createChromeMock(initialEnabled);

  vm.runInNewContext(SCRIPT_SOURCE, { chrome, document }, { filename: "content.js" });

  return { document, emitChange };
}

test("injects style on startup when enabled defaults to true", () => {
  const { document } = runContentScript();
  const style = document.getElementById(STYLE_ID);

  assert.ok(style, "style element should be injected");
  assert.match(style.textContent, /:not\(\.material-icons\)/);
  assert.match(style.textContent, /font-family: "Material Icons" !important;/);
});

test("does not inject style when enabled is false", () => {
  const { document } = runContentScript({ initialEnabled: false });

  assert.equal(document.getElementById(STYLE_ID), null);
});

test("toggles style with chrome.storage.onChanged events", () => {
  const { document, emitChange } = runContentScript({ initialEnabled: false });

  assert.equal(document.getElementById(STYLE_ID), null);

  emitChange({ newValue: true });
  assert.ok(document.getElementById(STYLE_ID));

  emitChange({ newValue: false });
  assert.equal(document.getElementById(STYLE_ID), null);
});

test("ignores unrelated storage events", () => {
  const { document, emitChange } = runContentScript({ initialEnabled: true });

  emitChange({ newValue: false, areaName: "sync" });
  assert.ok(document.getElementById(STYLE_ID));

  emitChange({ newValue: false, key: "otherKey" });
  assert.ok(document.getElementById(STYLE_ID));
});

test("does not duplicate style when enabled event repeats", () => {
  const { document, emitChange } = runContentScript({ initialEnabled: true });
  const target = document.head || document.documentElement;

  assert.equal(target.children.length, 1);

  emitChange({ newValue: true });
  assert.equal(target.children.length, 1);
});

test("falls back to documentElement when head is unavailable", () => {
  const { document } = runContentScript({ initialEnabled: true, withHead: false });

  assert.ok(document.getElementById(STYLE_ID));
  assert.equal(document.documentElement.children.length, 1);
});
