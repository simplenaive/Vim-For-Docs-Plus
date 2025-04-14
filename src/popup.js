document.addEventListener("DOMContentLoaded", async function () {
  // Load the browser API manager
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('browser-api.js');
  document.head.appendChild(script);

  const enableExtensionCheckbox = document.getElementById("switch1");
  const enableDebugCheckbox = document.getElementById("switch2");
  const lineNumbersCheckbox = document.getElementById("lineNumbersSwitch");
  const themeDropdown = document.getElementById("dropdown");

  // List of available themes (could be extended later)
  const themes = [
    { value: "default", name: "Default" },
    { value: "vim", name: "Vim" },
  ];

  // Populate theme dropdown dynamically
  function populateThemeDropdown() {
    themeDropdown.innerHTML = "";
    themes.forEach((theme) => {
      let option = document.createElement("option");
      option.value = theme.value;
      option.textContent = theme.name;
      themeDropdown.appendChild(option);
    });
  }
  populateThemeDropdown();

  // Wait for browser API script to load
  await new Promise(resolve => {
    script.onload = resolve;
  });

  // Load stored settings from browser storage
  try {
    const data = await window.browserAPI.storage.get(["enabled", "debug", "theme", "lineNumbersEnabled"]);
    enableExtensionCheckbox.checked = data.enabled ?? true;
    enableDebugCheckbox.checked = data.debug ?? false;
    lineNumbersCheckbox.checked = data.lineNumbersEnabled ?? true;
    themeDropdown.value = data.theme ?? "default";
  } catch (error) {
    console.error("Error loading settings:", error);
  }

  // Save settings to browser storage when changed
  async function saveSettings() {
    const settings = {
      enabled: enableExtensionCheckbox.checked,
      debug: enableDebugCheckbox.checked,
      lineNumbersEnabled: lineNumbersCheckbox.checked,
      theme: themeDropdown.value,
    };

    try {
      await window.browserAPI.storage.set(settings);
      console.log("Settings saved:", settings);
      updateContentScript(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  enableExtensionCheckbox.addEventListener("change", saveSettings);
  enableDebugCheckbox.addEventListener("change", saveSettings);
  lineNumbersCheckbox.addEventListener("change", saveSettings);
  themeDropdown.addEventListener("change", saveSettings);

  // Send updated settings to the content script
  async function updateContentScript(settings) {
    try {
      const tabs = await window.browserAPI.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await window.browserAPI.tabs.sendMessage(tabs[0].id, { action: "updateSettings", settings });
      }
    } catch (error) {
      console.log("Please open Google Docs to use this extension:", error);
    }
  }
});
