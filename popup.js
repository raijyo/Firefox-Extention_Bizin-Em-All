(() => {
  const STORAGE_KEY = "enabled";
  const toggle = document.getElementById("toggle");
  const state = document.getElementById("state");

  function updateView(enabled) {
    toggle.checked = enabled;
    state.textContent = `状態: ${enabled ? "ON" : "OFF"}`;
  }

  chrome.storage.local.get({ [STORAGE_KEY]: true }, (result) => {
    updateView(Boolean(result[STORAGE_KEY]));
  });

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ [STORAGE_KEY]: enabled });
    updateView(enabled);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }

    updateView(Boolean(changes[STORAGE_KEY].newValue));
  });
})();
