const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SCRIPT_SOURCE = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");

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

function createChromeMock(initialEnabled) {
  let storedEnabled = initialEnabled;
  const setCalls = [];
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
          setCalls.push(values);
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

  return { chrome, setCalls, emitChange };
}

function runPopupScript(initialEnabled) {
  const document = new FakeDocument();
  const { chrome, setCalls, emitChange } = createChromeMock(initialEnabled);

  vm.runInNewContext(SCRIPT_SOURCE, { chrome, document }, { filename: "popup.js" });

  return {
    toggle: document.toggle,
    state: document.state,
    setCalls,
    emitChange
  };
}

test("renders ON state by default", () => {
  const { toggle, state } = runPopupScript(undefined);

  assert.equal(toggle.checked, true);
  assert.match(state.textContent, /ON$/);
});

test("renders OFF state when storage has enabled=false", () => {
  const { toggle, state } = runPopupScript(false);

  assert.equal(toggle.checked, false);
  assert.match(state.textContent, /OFF$/);
});

test("writes storage and updates view when toggle changes", () => {
  const { toggle, state, setCalls } = runPopupScript(false);

  toggle.checked = true;
  toggle.dispatch("change");

  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].enabled, true);
  assert.match(state.textContent, /ON$/);
});

test("updates view on local enabled storage change", () => {
  const { toggle, state, emitChange } = runPopupScript(true);

  emitChange({ newValue: false });

  assert.equal(toggle.checked, false);
  assert.match(state.textContent, /OFF$/);
});

test("ignores unrelated storage events", () => {
  const { toggle, state, emitChange } = runPopupScript(true);

  emitChange({ newValue: false, areaName: "sync" });
  assert.equal(toggle.checked, true);
  assert.match(state.textContent, /ON$/);

  emitChange({ newValue: false, key: "otherKey" });
  assert.equal(toggle.checked, true);
  assert.match(state.textContent, /ON$/);
});

