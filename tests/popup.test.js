const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SCRIPT_SOURCE = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");
const flush = () => Promise.resolve();

class FakeElement {
  constructor(id) {
    this.id = id;
    this.textContent = "";
    this.checked = false;
    this.listeners = {};
  }

  addEventListener(type, listener) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  dispatch(type) {
    const handlers = this.listeners[type] || [];
    for (const handler of handlers) {
      handler({ type, target: this });
    }
  }
}

class FakeDocument {
  constructor() {
    this.toggle = new FakeElement("toggle");
    this.state = new FakeElement("state");
    this.map = {
      toggle: this.toggle,
      state: this.state
    };
  }

  getElementById(id) {
    return this.map[id] || null;
  }
}

function createBrowserMock(initialEnabled) {
  let storedEnabled = initialEnabled;
  const setCalls = [];
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
          setCalls.push(values);
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
    }
  };

  function emitChange({ newValue, areaName = "local", key = "enabled" }) {
    const changes = { [key]: { newValue } };
    for (const listener of listeners) {
      listener(changes, areaName);
    }
  }

  return { browser, setCalls, emitChange };
}

function runPopupScript(initialEnabled) {
  const document = new FakeDocument();
  const { browser, setCalls, emitChange } = createBrowserMock(initialEnabled);

  vm.runInNewContext(
    SCRIPT_SOURCE,
    { browser, document },
    { filename: "popup.js" }
  );

  return { toggle: document.toggle, state: document.state, setCalls, emitChange };
}

test("renders ON state by default", () => {
  return (async () => {
  const { toggle, state } = runPopupScript(undefined);
  await flush();

  assert.equal(toggle.checked, true);
  assert.match(state.textContent, /ON$/);
  })();
});

test("renders OFF state when storage has enabled=false", () => {
  return (async () => {
  const { toggle, state } = runPopupScript(false);
  await flush();

  assert.equal(toggle.checked, false);
  assert.match(state.textContent, /OFF$/);
  })();
});

test("writes storage and updates view when toggle changes", () => {
  return (async () => {
  const { toggle, state, setCalls } = runPopupScript(false);
  await flush();

  toggle.checked = true;
  toggle.dispatch("change");

  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].enabled, true);
  assert.match(state.textContent, /ON$/);
  })();
});

test("updates view on local enabled storage change", () => {
  return (async () => {
  const { toggle, state, emitChange } = runPopupScript(true);
  await flush();

  emitChange({ newValue: false });

  assert.equal(toggle.checked, false);
  assert.match(state.textContent, /OFF$/);
  })();
});

test("ignores unrelated storage events", () => {
  return (async () => {
  const { toggle, state, emitChange } = runPopupScript(true);
  await flush();

  emitChange({ newValue: false, areaName: "sync" });
  assert.equal(toggle.checked, true);
  assert.match(state.textContent, /ON$/);

  emitChange({ newValue: false, key: "otherKey" });
  assert.equal(toggle.checked, true);
  assert.match(state.textContent, /ON$/);
  })();
});
