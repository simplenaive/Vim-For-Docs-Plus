// --- IMPORTANT: This code intercepts key events in Google Docs and remaps them to Vim-like motions --- 

(() => {
  // Cache frequently used DOM elements
  const iframe = document.getElementsByTagName('iframe')[0];
  const cursorTop = document.getElementsByClassName("kix-cursor-top")[0];
  
  // Modes: normal, insert, visual, visualLine, waitForFirstInput, waitForSecondInput, waitForCharMotion, etc.
  let mode = 'normal';
  let tempnormal = false;
  let pendingKey = "";
  let pendingKeyTimer = null;
  let pendingCharMotionCommand = "";
  let longStringOp = "";

  // Inject the page_script for simulating keypresses
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page_script.js");
  document.documentElement.appendChild(script);

  // Key code mapping
  const keyCodes = {
    backspace: 8, tab: 9, enter: 13, esc: 27,
    end: 35, home: 36, left: 37, up: 38,
    right: 39, down: 40, "delete": 46, pageUp: 33, pageDown: 34,
  };

  function sendKeyEvent(key, mods = { shift: false, control: false }) {
    const keyCode = keyCodes[key];
    window.dispatchEvent(new CustomEvent("doc-keys-simulate-keypress", {
      detail: { keyCode, mods }
    }));
  }

  // --- Mode Indicator UI ---
  const modeIndicator = document.createElement('div');
  Object.assign(modeIndicator.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '8px 16px',
    borderRadius: '4px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '9999'
  });
  document.body.appendChild(modeIndicator);

  function updateModeIndicator(currentMode) {
    modeIndicator.textContent = currentMode.toUpperCase();
    if (currentMode === 'normal') {
      modeIndicator.style.backgroundColor = '#1a73e8';
      modeIndicator.style.color = 'white';
    } else if (currentMode === 'insert') {
      modeIndicator.style.backgroundColor = '#34a853';
      modeIndicator.style.color = 'white';
    } else if (currentMode === 'visual' || currentMode === 'visualLine') {
      modeIndicator.style.backgroundColor = '#fbbc04';
      modeIndicator.style.color = 'black';
    } else {
      modeIndicator.style.backgroundColor = '#ea4335';
      modeIndicator.style.color = 'white';
    }
  }

  // --- Mode Switching ---
  function switchModeToNormal() {
    if (mode === "visualLine") sendKeyEvent("left");
    mode = 'normal';
    updateModeIndicator(mode);
    cursorTop.style.opacity = 1;
    cursorTop.style.display = "block";
    cursorTop.style.backgroundColor = "black";
  }

  function switchModeToInsert() {
    mode = 'insert';
    updateModeIndicator(mode);
    cursorTop.style.opacity = 0;
  }

  function switchModeToVisual() {
    mode = 'visual';
    updateModeIndicator(mode);
    sendKeyEvent('right', { shift: true });
  }

  function switchModeToVisualLine() {
    mode = 'visualLine';
    updateModeIndicator(mode);
    sendKeyEvent('home');
    sendKeyEvent('end', { shift: true });
  }

  function switchModeToWait() {
    mode = "waitForFirstInput";
    updateModeIndicator(mode);
  }

  function switchModeToWait2() {
    mode = "waitForSecondInput";
    updateModeIndicator(mode);
  }

  function switchModeToWaitForCharMotion() {
    mode = "waitForCharMotion";
    updateModeIndicator(mode);
  }

  // --- Basic Motions ---
  function goToStartOfLine() { sendKeyEvent("home"); }
  function goToEndOfLine() { sendKeyEvent("end"); }
  function selectToEndOfLine() { sendKeyEvent("end", { shift: true }); }
  function selectToEndOfWord() { sendKeyEvent("right", { shift: true, control: true }); }
  function goToStartOfWord() { sendKeyEvent("left", { shift: false, control: true }); }
  function goToTop() { sendKeyEvent("home", { control: true, shift: false }); longStringOp = ""; }
  function selectToEndOfPara() { sendKeyEvent("down", { control: true, shift: true }); }
  function goToEndOfPara(shift = false) { 
    sendKeyEvent("down", { control: true, shift });
    sendKeyEvent("right", { shift });
  }
  function goToStartOfPara(shift = false) { sendKeyEvent("up", { control: true, shift }); }
  function addLineTop() {
    goToStartOfLine();
    sendKeyEvent("enter", { shift: true });
    sendKeyEvent("up");
    switchModeToInsert();
  }
  function addLineBottom() {
    goToEndOfLine();
    sendKeyEvent("enter", { shift: true });
    switchModeToInsert();
  }
  function goToEndOfWord() { sendKeyEvent("right", { control: true }); }

  // --- Backward Word Motion ---
  function goToBackwardEndOfWord() {
    sendKeyEvent("left", { control: true, shift: true });
    sendKeyEvent("right", { shift: false });
  }

  // --- g-Motions ---
  function goToScreenLineStart() { sendKeyEvent("home"); }
  function goToScreenLineEnd() { sendKeyEvent("end"); }
  function goToVisualLineDown() { sendKeyEvent("down", { control: true }); }
  function goToVisualLineUp() { sendKeyEvent("up", { control: true }); }

  // --- Character Motion and Operations ---
  function waitForCharMotion(key) {
    pendingCharMotionCommand = "";
    switchModeToNormal();
  }

  function runLongStringOp(operation = longStringOp) {
    switch (operation) {
      case "c":
        clickMenu(menuItems.cut);
        switchModeToInsert();
        break;
      case "d":
        clickMenu(menuItems.cut);
        sendKeyEvent('backspace');
        mode = 'normal';
        switchModeToNormal();
        break;
      case "y":
        clickMenu(menuItems.copy);
        switchModeToNormal();
        break;
      case "p":
        clickMenu(menuItems.paste);
        switchModeToNormal();
        break;
      case "g":
        goToTop();
        break;
      default:
        break;
    }
  }

  // --- Input Waiting ---
  function waitForSecondInput(key) {
    if (key === "w") {
      goToStartOfWord();
      waitForFirstInput(key);
    } else if (key === "p") {
      goToStartOfPara();
      waitForFirstInput(key);
    } else {
      switchModeToNormal();
    }
  }

  function waitForFirstInput(key) {
    switch (key) {
      case "i":
      case "a":
        switchModeToWait2();
        break;
      case "w":
        selectToEndOfWord();
        runLongStringOp();
        break;
      case "p":
        selectToEndOfPara();
        runLongStringOp();
        break;
      case longStringOp:
        goToStartOfLine();
        selectToEndOfLine();
        runLongStringOp();
        break;
      default:
        switchModeToNormal();
    }
  }

  function waitForVisualInput(key) {
    if (key === "w") {
      sendKeyEvent("left", { control: true });
      goToStartOfWord();
      selectToEndOfWord();
    } else if (key === "p") {
      goToStartOfPara();
      goToEndOfPara(true);
    }
    mode = "visualLine";
  }

  // --- Arrow Keys Remapping ---
  function handleArrowKeys(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    let mappedKey = "";
    switch (e.key) {
      case "ArrowLeft": mappedKey = e.ctrlKey ? "b" : "h"; break;
      case "ArrowDown": mappedKey = e.ctrlKey ? "}" : "j"; break;
      case "ArrowUp": mappedKey = e.ctrlKey ? "{" : "k"; break;
      case "ArrowRight": mappedKey = e.ctrlKey ? "w" : "l"; break;
      default: return false;
    }
    if (mode === "visual" || mode === "visualLine") {
      handleKeyEventVisualLine(mappedKey);
    } else {
      handleKeyEventNormal(mappedKey);
    }
    return true;
  }

  // --- Main Event Handler ---
  function eventHandler(e) {
    if (mode !== 'insert' && (e.key === 'Tab' || e.key === 'Backspace' || e.key === 'Enter')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    
    if (e.key.startsWith("Arrow") && handleArrowKeys(e)) return;
    
    if (e.ctrlKey && mode === 'insert' && e.key === 'o') {
      e.preventDefault();
      e.stopImmediatePropagation();
      switchModeToNormal();
      tempnormal = true;
      return;
    }
    
    if (mode === 'insert' && (e.altKey || e.ctrlKey || e.metaKey)) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      if (mode === 'visual' || mode === 'visualLine') {
        sendKeyEvent("right");
        sendKeyEvent("left");
      }
      switchModeToNormal();
      return;
    }
    
    if (mode === 'normal' && e.key === 'Backspace') {
      e.preventDefault();
      sendKeyEvent("delete");
      return;
    }
    
    if (mode !== 'insert') {
      e.preventDefault();
      
      // Handle pending "g" motions
      if (pendingKey) {
        const sequence = pendingKey + e.key;
        if (sequence === "gg") {
          goToTop();
          pendingKey = "";
          clearTimeout(pendingKeyTimer);
          pendingKeyTimer = null;
          return;
        } else if (sequence === "ge") {
          goToBackwardEndOfWord();
          pendingKey = "";
          clearTimeout(pendingKeyTimer);
          pendingKeyTimer = null;
          return;
        } else if (sequence === "g0") {
          goToScreenLineStart();
          pendingKey = "";
          clearTimeout(pendingKeyTimer);
          pendingKeyTimer = null;
          return;
        } else if (sequence === "g_") {
          goToScreenLineEnd();
          pendingKey = "";
          clearTimeout(pendingKeyTimer);
          pendingKeyTimer = null;
          return;
        } else if (sequence === "gj") {
          goToVisualLineDown();
          pendingKey = "";
          clearTimeout(pendingKeyTimer);
          pendingKeyTimer = null;
          return;
        } else if (sequence === "gk") {
          goToVisualLineUp();
          pendingKey = "";
          clearTimeout(pendingKeyTimer);
          pendingKeyTimer = null;
          return;
        }
        pendingKey = "";
      }
      
      // Dispatch based on current mode
      switch (mode) {
        case "normal":  handleKeyEventNormal(e.key); break;
        case "visual":
        case "visualLine":  handleKeyEventVisualLine(e.key); break;
        case "waitForFirstInput":  waitForFirstInput(e.key); break;
        case "waitForSecondInput":  waitForSecondInput(e.key); break;
        case "waitForVisualInput":  waitForVisualInput(e.key); break;
        case "waitForCharMotion":  waitForCharMotion(e.key); break;
        default: break;
      }
    }
  }

  // --- Key Event Handlers for Normal and Visual Modes ---
  function handleKeyEventNormal(key) {
    switch (key) {
      case "h": sendKeyEvent("left"); break;
      case "j": sendKeyEvent("down"); break;
      case "k": sendKeyEvent("up"); break;
      case "l": sendKeyEvent("right"); break;
      case "e": goToEndOfWord(); break;
      case "}": goToEndOfPara(); break;
      case "{": goToStartOfPara(); break;
      case "b": sendKeyEvent("left", { control: true }); break;
      case "w": sendKeyEvent("right", { control: true }); break;
      case "g":
        pendingKey = "g";
        pendingKeyTimer = setTimeout(() => { pendingKey = ""; }, 500);
        break;
      case "c":
      case "d":
      case "y":
        longStringOp = key;
        mode = "waitForFirstInput";
        updateModeIndicator(mode);
        break;
      case "p": clickMenu(menuItems.paste); break;
      case "a": sendKeyEvent("right"); switchModeToInsert(); break;
      case "i": switchModeToInsert(); break;
      case "^":
      case "_":
      case "0": goToStartOfLine(); break;
      case "$": goToEndOfLine(); break;
      case "I": goToStartOfLine(); switchModeToInsert(); break;
      case "A": goToEndOfLine(); switchModeToInsert(); break;
      case "v": switchModeToVisual(); break;
      case "V": switchModeToVisualLine(); break;
      case "o": addLineBottom(); break;
      case "O": addLineTop(); break;
      case "u": clickMenu(menuItems.undo); break;
      case "r": clickMenu(menuItems.redo); break;
      default: return;
    }
    if (tempnormal && mode !== 'visual' && mode !== 'visualLine') {
      tempnormal = false;
      switchModeToInsert();
    }
  }

  function handleKeyEventVisualLine(key) {
    switch (key) {
      case "h": sendKeyEvent("left", { shift: true }); break;
      case "j": sendKeyEvent("down", { shift: true }); break;
      case "k": sendKeyEvent("up", { shift: true }); break;
      case "l": sendKeyEvent("right", { shift: true }); break;
      case "p": clickMenu(menuItems.paste); switchModeToNormal(); break;
      case "}": goToEndOfPara(true); break;
      case "{": goToStartOfPara(true); break;
      case "b": sendKeyEvent("left", { control: true, shift: true }); break;
      case "w": sendKeyEvent("right", { control: true, shift: true }); break;
      case "g":
        pendingKey = "g";
        pendingKeyTimer = setTimeout(() => { pendingKey = ""; }, 500);
        break;
      case "i":
      case "a":
        mode = "waitForVisualInput";
        break;
      default: break;
    }
  }

  // --- Menu Click Helpers ---
  const menuItemElements = {};
  const menuItems = {
    copy: { parent: "Edit", caption: "Copy" },
    cut: { parent: "Edit", caption: "Cut" },
    paste: { parent: "Edit", caption: "Paste" },
    redo: { parent: "Edit", caption: "Redo" },
    undo: { parent: "Edit", caption: "Undo" },
  };

  function clickMenu(itemCaption) {
    simulateClick(getMenuItem(itemCaption));
  }

  function clickToolbarButton(captions) {
    for (const caption of captions) {
      const els = document.querySelectorAll(`*[aria-label='${caption}']`);
      if (els.length === 0) return;
      simulateClick(els[0]);
    }
  }

  function getMenuItem(menuItem, silenceWarning = false) {
    const caption = menuItem.caption;
    let el = menuItemElements[caption];
    if (el) return el;
    el = findMenuItem(menuItem);
    if (!el) return null;
    return menuItemElements[caption] = el;
  }

  function findMenuItem(menuItem) {
    activateTopLevelMenu(menuItem.parent);
    const menuItemEls = document.querySelectorAll(".goog-menuitem");
    const caption = menuItem.caption;
    const isRegexp = caption instanceof RegExp;
    for (const el of Array.from(menuItemEls)) {
      const label = el.innerText;
      if (!label) continue;
      if (isRegexp) {
        if (caption.test(label)) return el;
      } else {
        if (label.startsWith(caption)) return el;
      }
    }
    return null;
  }

  function simulateClick(el, x = 0, y = 0) {
    const eventSequence = ["mouseover", "mousedown", "mouseup", "click"];
    for (const eventName of eventSequence) {
      const event = document.createEvent("MouseEvents");
      event.initMouseEvent(
        eventName, true, true, window, 1, x, y, x, y,
        false, false, false, false, 0, null
      );
      el.dispatchEvent(event);
    }
  }

  function activateTopLevelMenu(menuCaption) {
    const buttons = Array.from(document.querySelectorAll(".menu-button"));
    const button = buttons.find(el => el.innerText.trim() === menuCaption);
    if (!button) throw new Error(`Couldn't find top-level button with caption ${menuCaption}`);
    simulateClick(button);
    simulateClick(button);
  }

  // --- Listen to key events on the iframe document ---
  iframe.contentDocument.addEventListener('keydown', eventHandler, true);

  // Set initial mode
  switchModeToNormal();
})();
