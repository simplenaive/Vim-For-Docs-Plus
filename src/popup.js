document.addEventListener("DOMContentLoaded", async function () {
  const enableExtensionCheckbox = document.getElementById("switch1");
  const enableDebugCheckbox = document.getElementById("switch2");
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

  // Load stored settings from Chrome storage
  chrome.storage.sync.get(["enabled", "debug", "theme"], function (data) {
    enableExtensionCheckbox.checked = data.enabled ?? true;
    enableDebugCheckbox.checked = data.debug ?? false;
    themeDropdown.value = data.theme ?? "default";
  });

  // Save settings to Chrome storage when changed
  function saveSettings() {
    const settings = {
      enabled: enableExtensionCheckbox.checked,
      debug: enableDebugCheckbox.checked,
      theme: themeDropdown.value,
    };

    chrome.storage.sync.set(settings, function () {
      console.log("Settings saved:", settings);
      updateContentScript(settings);
    });
  }

  enableExtensionCheckbox.addEventListener("change", saveSettings);
  enableDebugCheckbox.addEventListener("change", saveSettings);
  themeDropdown.addEventListener("change", saveSettings);

  // Send updated settings to the content script
  function updateContentScript(settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updateSettings", settings })
          .catch(error => {
            console.log("Please open Google Docs to use this extension:", error);
          });
      }
    });
  }
});
