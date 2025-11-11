document.addEventListener("DOMContentLoaded", async function () {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('browser-api.js');
  document.head.appendChild(script);
  await new Promise(resolve => { script.onload = resolve; });

  const debugSwitch = document.getElementById('debugSwitch');

  try {
    const data = await window.browserAPI.storage.get(["debug"]);
    debugSwitch.checked = data.debug ?? false;
  } catch (e) {
    console.error('Failed to read storage', e);
  }

  async function save() {
    const settings = { debug: debugSwitch.checked };
    try {
      await window.browserAPI.storage.set(settings);
      console.log('Debug setting saved to storage:', settings.debug);
      // Content scripts listen to storage.onChanged and will update instantly when active.
    } catch (e) {
      console.error('Failed to save settings:', e.message || e);
    }
  }

  debugSwitch.addEventListener('change', save);
});
