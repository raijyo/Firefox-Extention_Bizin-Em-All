(() => {
  const STORAGE_KEY = "enabled";
  const STORAGE_DEFAULTS = { [STORAGE_KEY]: true };
  const toggle = document.getElementById("toggle");
  const state = document.getElementById("state");
  const storage = typeof browser !== "undefined" ? browser.storage : null;

  if (!storage || !storage.local || !toggle || !state) {
    return;
  }

  function readState(callback) {
    storage.local
      .get(STORAGE_DEFAULTS)
      .then((result) => callback(result))
      .catch(() => callback(STORAGE_DEFAULTS));
  }

  function writeState(enabled) {
    const value = { [STORAGE_KEY]: enabled };
    return storage.local.set(value);
  }

  function updateView(enabled) {
    toggle.checked = enabled;
    state.textContent = `Status: ${enabled ? "ON" : "OFF"}`;
  }

  readState((result) => {
    updateView(Boolean(result[STORAGE_KEY]));
  });

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    writeState(enabled).catch(() => {
      state.textContent = "Failed to save.";
    });
    updateView(enabled);
  });

  storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }
    updateView(Boolean(changes[STORAGE_KEY].newValue));
  });
})();
