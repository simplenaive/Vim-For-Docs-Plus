(() => {
  // Default preferences (default theme now defaults to "vim")
  let enabled = true;
  let debug = false;
  let modeIndicatorStyle = "vim";

  // Load stored enabled, debug, and theme settings from Chrome storage.
  chrome.storage.sync.get(["enabled", "debug", "theme"], (data) => {
    enabled = data.enabled ?? true;
    debug = data.debug ?? false;
    modeIndicatorStyle = data.theme ?? "vim";
    updateModeIndicator();
  });

  function setModeIndicatorStyle(newStyle) {
    modeIndicatorStyle = newStyle;
    updateModeIndicator();
  }

  // Log messages if debug is enabled.
  function print(...args) {
    if (debug) {
      console.log(...args);
    }
  }

  // Mode state and buffers.
  let mode = 'normal';
  let tempNormal = false; // temporary normal mode from Ctrl-o
  let normalMotionBuffer = ""; // accumulates keystrokes in normal mode
  let visualMotionBuffer = ""; // accumulates keystrokes in visual mode

  // --- Inject the page script ---
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page_script.js");
  document.documentElement.appendChild(script);

  // --- Mode Indicator UI ---
  const modeIndicator = document.createElement('div');
  document.body.appendChild(modeIndicator);

  // updateModeIndicator applies different styling based on the theme preference.
  // When in "vim" mode, it creates two sections: the far left displays the current mode,
  // and the far right displays the pending command (motion buffer) in normal/visual modes.
  function updateModeIndicator() {
    // If the extension is disabled, hide the overlay.
    if (!enabled) {
      modeIndicator.style.display = "none";
      return;
    }
    modeIndicator.style.display = "flex";
    
    if (modeIndicatorStyle === "vim") {
      // Vim style: full-width bar along the bottom.
      Object.assign(modeIndicator.style, {
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: '#2e2e2e',
        color: 'white',
        padding: '4px 10px',
        fontFamily: 'monospace',
        fontSize: '14px',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: '9999'
      });
      // Create (or reuse) left and right sections.
      let modeText = modeIndicator.querySelector('.mode-text');
      let commandText = modeIndicator.querySelector('.command-text');
      if (!modeText) {
        modeText = document.createElement('div');
        modeText.className = 'mode-text';
        modeIndicator.appendChild(modeText);
      }
      if (!commandText) {
        commandText = document.createElement('div');
        commandText.className = 'command-text';
        modeIndicator.appendChild(commandText);
      }
      // Left side: display the current mode.
      let displayMode = mode === 'visualLine' ? 'visual line' : mode;
      if (tempNormal && mode === 'normal') {
        modeText.textContent = "-- (Insert) --";
      } else {
        modeText.textContent = `-- ${displayMode.toUpperCase()} --`;
      }

      // Right side: display the accumulated motion command.
      if (mode === 'normal') {
        commandText.textContent = normalMotionBuffer;
      } else if (mode === 'visual' || mode === 'visualLine') {
        commandText.textContent = visualMotionBuffer;
      } else {
        commandText.textContent = "";
      }
    } else {
          // Reset styles that might have been applied in Vim mode.
      modeIndicator.style.left = '';
      modeIndicator.style.right = '';
    
      // Default style: a single indicator at bottom-right.
      Object.assign(modeIndicator.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '8px 16px',
        borderRadius: '4px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '9999',
        display: 'block'
      });
      modeIndicator.innerHTML = "";
      if (mode === 'normal') {
        modeIndicator.textContent = mode.toUpperCase();
        modeIndicator.style.backgroundColor = '#1a73e8';
        modeIndicator.style.color = 'white';
      } else if (mode === 'insert') {
        modeIndicator.textContent = mode.toUpperCase();
        modeIndicator.style.backgroundColor = '#34a853';
        modeIndicator.style.color = 'white';
      } else if (mode === 'visual') {
        modeIndicator.textContent = mode.toUpperCase();
        modeIndicator.style.backgroundColor = '#fbbc04';
        modeIndicator.style.color = 'black';
      } else if (mode === 'visualLine') {
        modeIndicator.textContent = 'VISUAL LINE';
        modeIndicator.style.backgroundColor = '#fbbc04';
        modeIndicator.style.color = 'black';
      }
      // Additional theme overrides.
      if (modeIndicatorStyle === "dark") {
        modeIndicator.style.backgroundColor = "#222";
        modeIndicator.style.color = "#ddd";
      } else if (modeIndicatorStyle === "light") {
        modeIndicator.style.backgroundColor = "#f8f9fa";
        modeIndicator.style.color = "#000";
      }
    }
  }
  updateModeIndicator();

  // --- Key Codes Mapping ---
  const keyCodes = {
    backspace: 8, tab: 9, enter: 13, esc: 27,
    end: 35, home: 36, left: 37, up: 38,
    right: 39, down: 40, "delete": 46, pageUp: 33, pageDown: 34,
  };

  // --- Cursor Style ---
  const cursorCaret = document.querySelector('.kix-cursor-caret');
  function updateCursorStyle() {
    if (!cursorCaret) return;
    
    if (mode === 'insert') {
      cursorCaret.style.borderWidth = '2px';
    } else {
      try {
        if (cursorCaret.style && cursorCaret.style.height) {
          const height = parseFloat(cursorCaret.style.height.slice(0, -2));
          if (!isNaN(height)) {
            const width = 0.416 * height;
            cursorCaret.style.borderWidth = width + 'px';
          }
        }
      } catch (error) {
        print("Error updating cursor style:", error);
      }
    }
  }
  updateCursorStyle();

  // --- Mode Switching Helper ---
  function switchMode(newMode) {
    mode = newMode;
    updateModeIndicator();
    updateCursorStyle();
    if (newMode === 'normal') {
      normalMotionBuffer = "";
    } else if (newMode === 'visual' || newMode === 'visualLine') {
      visualMotionBuffer = "";
    }
  }

  // --- Helper Functions for New Line and Visual Line ---
  function openNewLineBelow() {
    sendKeyEvent("end");
    sendKeyEvent("enter");
  }
  function openNewLineAbove() {
    sendKeyEvent("home");
    sendKeyEvent("enter");
    sendKeyEvent("up");
  }
  function enterVisualLineMode() {
    sendKeyEvent("home");
    sendKeyEvent("end", { shift: true });
    sendKeyEvent("right", { shift: true });
    switchMode('visualLine');
  }

  // --- Line operations for dd and yy ---
  function deleteLine() {
    sendKeyEvent("home");
    sendKeyEvent("end", { shift: true });
    sendKeyEvent("right", { shift: true });
    clickMenu(menuItems.cut);
  }
  
  function yankLine() {
    sendKeyEvent("home");
    sendKeyEvent("end", { shift: true });
    sendKeyEvent("right", { shift: true });
    clickMenu(menuItems.copy);
    // Unselect the text
    sendKeyEvent("right");
    sendKeyEvent("left");
  }

  // --- Normal Mode Motion Parser with Operator Support ---
  const validMotions = ["h", "j", "k", "l", "w", "gg", "G", "e", "b", "ge", "0", "^", "$", "g_", "{", "}", "x", "iw", "aw"];
  const normalOperators = ["d", "y", "c"];
  function isDigit(ch) {
    return /\d/.test(ch);
  }
  
  function parseNormalMotion(buffer) {
    // Special cases for dd, yy, and cc with number prefixes
    const lineOperatorPattern = /^(\d*)(dd|yy|cc)$/;
    const match = buffer.match(lineOperatorPattern);
    
    if (match) {
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const operator = match[2]; // "dd", "yy", or "cc"
      return { special: operator, count: count };
    }
    
    // Special case for C, D, Y commands (shorthand for c$, d$, y$)
    const shorthandPattern = /^(\d*)(C|D|Y)$/;
    const shorthandMatch = buffer.match(shorthandPattern);
    
    if (shorthandMatch) {
      const count = shorthandMatch[1] ? parseInt(shorthandMatch[1], 10) : 1;
      const cmd = shorthandMatch[2];
      // Map C->c$, D->d$, Y->y$
      const operator = cmd.toLowerCase();
      return { count, operator, motion: "$", shorthand: true };
    }
    
    // Special case for x with number prefixes
    const xPattern = /^(\d*)x$/;
    const xMatch = buffer.match(xPattern);
    
    if (xMatch) {
      const count = xMatch[1] ? parseInt(xMatch[1], 10) : 1;
      return { count, motion: "x" };
    }

    // Special case for P (paste before cursor)
    if (buffer === "P") {
      return { special: "P" };
    }

    // More complex parsing for operator-count-motion patterns
    let i = 0;
    let count = 1;
    let countStr = "";
    let operator = null;
    let motion = "";
    
    // Check if buffer starts with a digit (count-first case like "3dl")
    if (buffer.length > 0 && buffer[0] !== '0' && isDigit(buffer[0])) {
      while (i < buffer.length && isDigit(buffer[i])) {
        countStr += buffer[i];
        i++;
      }
      if (countStr !== "") {
        count = parseInt(countStr, 10);
      }
    }
    
    // Check for operator
    if (i < buffer.length && normalOperators.includes(buffer[i])) {
      operator = buffer[i];
      i++;
      
      // Check for a count after the operator (operator-count-motion case like "d3l")
      if (i < buffer.length && isDigit(buffer[i])) {
        countStr = "";
        while (i < buffer.length && isDigit(buffer[i])) {
          countStr += buffer[i];
          i++;
        }
        if (countStr !== "") {
          count = parseInt(countStr, 10);
        }
      }
    }
    
    // Get the motion part
    motion = buffer.slice(i);
    
    if (motion === "") return null;
    
    const matches = validMotions.filter(cmd => cmd.startsWith(motion));
    
    if (matches.length === 0) return { error: "Invalid motion command" };
    if (motion[0] === 'g' && motion.length < 2) return null;
    if (matches.includes(motion)) return { count, operator, motion };
    
    return null;
  }

  function selectLines(count) {
    // Start selection from the beginning of the current line
    sendKeyEvent("home");
    // Select to the end of the current line
    sendKeyEvent("end", { shift: true });
    // For multiple lines, keep selecting additional lines
    for (let i = 1; i < count; i++) {
      // Select to the end of the next line
      sendKeyEvent("down", { shift: true });
      sendKeyEvent("end", { shift: true });
    }
    // Include the line break at the end
    sendKeyEvent("right", { shift: true });
  }

  function isValidMotionPrefix(buffer) {
    // Reject "caw" as it's not a valid command
    if (buffer === "ca" || buffer === "caw") {
      return false;
    }
    
    // Special cases for dd, yy, and cc with number prefixes
    if (/^\d*d?d?$/.test(buffer) || /^\d*y?y?$/.test(buffer) || /^\d*c?c?$/.test(buffer)) {
      return true;
    }

    // Special case for C, D, Y commands
    if (/^\d*[CDY]?$/.test(buffer)) {
      return true;
    }

    if (/^\d*x?$/.test(buffer) || buffer === "P") {
      return true;
    }
    
    // More permissive validation logic
    // Check for any valid command structure:
    // - count + operator + partial motion
    // - operator + count + partial motion
    // - operator + partial motion
    
    let i = 0;
    let hasDigits = false;
    let hasOperator = false;
    
    // Check for leading count
    if (i < buffer.length && buffer[i] !== '0' && isDigit(buffer[i])) {
      hasDigits = true;
      while (i < buffer.length && isDigit(buffer[i])) {
        i++;
      }
    }
    
    // Check for operator
    if (i < buffer.length && normalOperators.includes(buffer[i])) {
      hasOperator = true;
      i++;
      
      // Check for count after operator
      if (i < buffer.length && isDigit(buffer[i])) {
        hasDigits = true;
        while (i < buffer.length && isDigit(buffer[i])) {
          i++;
        }
      }
    }
    
    // If we have a remaining part, check if it's a valid motion prefix
    if (i < buffer.length) {
      const motionPart = buffer.slice(i);
      const matches = validMotions.filter(cmd => cmd.startsWith(motionPart));
      return matches.length > 0;
    }
    
    // If we've consumed the whole buffer and it had valid structure, it's a valid prefix
    return hasOperator || hasDigits;
  }

  // --- Visual Mode Motion Parser (operators "d" and "y") ---
  const visualOperators = ["d"];
  function parseVisualMotion(buffer) {
    let count = 1;
    let i = 0;
    if (buffer.length > 0 && buffer[0] !== '0' && isDigit(buffer[0])) {
      let countStr = "";
      while (i < buffer.length && isDigit(buffer[i])) {
        countStr += buffer[i];
        i++;
      }
      if (countStr !== "") {
        count = parseInt(countStr, 10);
      }
    }
    let operator = null;
    if (i < buffer.length && visualOperators.includes(buffer[i])) {
      operator = buffer[i];
      i++;
    }
    let motion = buffer.slice(i);
    if (motion === "") return null;
    const matches = validMotions.filter(cmd => cmd.startsWith(motion));
    if (matches.length === 0) return { error: "Invalid motion command" };
    if (motion[0] === 'g' && motion.length < 2) return null;
    if (matches.includes(motion)) return { count, operator, motion };
    return null;
  }
  function isValidVisualMotionPrefix(buffer) {
    let i = 0;
    if (buffer.length > 0 && buffer[0] !== '0' && isDigit(buffer[0])) {
      while (i < buffer.length && isDigit(buffer[i])) { i++; }
    }
    if (i < buffer.length && visualOperators.includes(buffer[i])) { i++; }
    let motionPart = buffer.slice(i);
    if (motionPart === "") return true;
    const matches = validMotions.filter(cmd => cmd.startsWith(motionPart));
    return matches.length > 0;
  }

  // --- Helper Functions to Move the Cursor (with optional shift) ---
  function moveLeft(shift = false) { sendKeyEvent("left", { shift }); }
  function moveRight(shift = false) { sendKeyEvent("right", { shift }); }
  function moveUp(shift = false) { sendKeyEvent("up", { shift }); }
  function moveDown(shift = false) { sendKeyEvent("down", { shift }); }
  function moveWordForward(shift = false) { sendKeyEvent("right", { control: true, shift }); }
  function moveWordBackward(shift = false) { sendKeyEvent("left", { control: true, shift }); }
  function goToTop(shift = false) { sendKeyEvent("home", { control: true, shift }); }
  function goToBottom(shift = false) { sendKeyEvent("end", { control: true, shift }); }
  function goToEndOfWord(shift = false) { sendKeyEvent("right", { control: true, shift }); }
  function goToStartOfLine(shift = false) { sendKeyEvent("home", { shift }); }
  function goToEndOfLine(shift = false) { sendKeyEvent("end", { shift }); }
  function goToBackwardEndOfWord(shift = false) { 
    sendKeyEvent("left", { control: true, shift });
    sendKeyEvent("left", { shift });
  }
  function goToPrevPara(shift = false) { sendKeyEvent("up", { control: true, shift }); }
  function goToNextPara(shift = false) { sendKeyEvent("down", { control: true, shift }); }
  
  // --- Text Object Selection Functions ---
  function selectInnerWord(count = 1) {
    moveRight(false);
    moveWordBackward(false);
    // For count > 1, select multiple words
    for (let i = 0; i < count; i++) {
      moveWordForward(true);
    }
    // add fix when i figure out how
  }
  
  function selectAWord(count = 1) {
    moveRight(false);
    moveWordBackward(false);
    // For count > 1, select multiple words
    for (let i = 0; i < count; i++) {
      moveWordForward(true);
    }
    // add fix when i figure out how
  }

  // --- Functions to Execute Motions ---
  function doMoveMotion(parsed, shift = false) {
    const count = Math.min(parsed.count, 100);

    if (parsed.motion === "x") {
      for (let i = 0; i < count; i++) {
        sendKeyEvent("right", { shift: true });
      }

      if (!shift && !parsed.operator) {
        clickMenu(menuItems.cut);
      }
      return;
    }
    
    // Handle all other motions
    for (let i = 0; i < count; i++) {
      switch (parsed.motion) {
        case "h": moveLeft(shift); break;
        case "j": moveDown(shift); break;
        case "k": moveUp(shift); break;
        case "l": moveRight(shift); break;
        case "w": moveWordForward(shift); break;
        case "gg": goToTop(shift); break;
        case "G": goToBottom(shift); break;
        case "e": goToEndOfWord(shift); break;
        case "b": moveWordBackward(shift); break;
        case "ge": goToBackwardEndOfWord(shift); break;
        case "0": goToStartOfLine(shift); break;
        case "^": goToStartOfLine(shift); moveLeft(shift); moveWordForward(shift); break;
        case "$": goToEndOfLine(shift); break;
        case "g_": goToEndOfLine(shift); break;
        case "{": goToPrevPara(shift); break;
        case "}": goToNextPara(shift); break;
        case "iw": selectInnerWord(); break;
        case "aw": selectAWord(); break;
        default:
          print("No motion defined for", parsed.motion);
      }
    }
  }

  // --- Operator Motions in Normal Mode ---
  function doOperatorMotion(operator, parsed) {
    // Special handling for text objects
    if (parsed.motion === "iw" || parsed.motion === "aw") {
      // Use the count from parsed for text objects
      const count = parsed.count || 1;
      
      if (operator === "d") {
        print(`Delete operator with text object '${parsed.motion}' count ${count}`);
        if (parsed.motion === "iw") selectInnerWord(count);
        else selectAWord(count);
        clickMenu(menuItems.cut);
      } else if (operator === "y") {
        print(`Yank operator with text object '${parsed.motion}' count ${count}`);
        if (parsed.motion === "iw") selectInnerWord(count);
        else selectAWord(count);
        clickMenu(menuItems.copy);
        // Unselect the text
        sendKeyEvent("right");
        sendKeyEvent("left");
      } else if (operator === "c" && parsed.motion === "iw") {
        print(`Change operator with text object 'iw' count ${count}`);
        selectInnerWord(count);
        clickMenu(menuItems.cut);
        switchMode('insert');
      }
      // No handling for caw as it's not supported
      return;
    }
    
    // Original handling for other motions
    if (operator === "d") {
      print(`Delete operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
      doMoveMotion(parsed, true);
      clickMenu(menuItems.cut);
    } else if (operator === "y") {
      print(`Yank operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
      doMoveMotion(parsed, true);
      clickMenu(menuItems.copy);
    } else if (operator === "c") {
      print(`Change operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
      doMoveMotion(parsed, true);
      clickMenu(menuItems.cut);
      switchMode('insert');
    }
  }

  // --- Function to Handle Parsed Motions in Normal Mode ---
// Update the handleParsedMotion function to handle line operations with count
  // --- Function to Handle Parsed Motions in Normal Mode ---
function handleParsedMotion(parsed) {
  if (parsed.special) {
    const count = parsed.count || 1;
    
    if (parsed.special === "dd") {
      print(`Deleting ${count} line(s)`);
      // Select and delete the specified number of lines
      selectLines(count);
      clickMenu(menuItems.cut);
    } else if (parsed.special === "yy") {
      print(`Yanking ${count} line(s)`);
      // Select and copy the specified number of lines
      selectLines(count);
      clickMenu(menuItems.copy);
      // Unselect the text
      sendKeyEvent("right");
      sendKeyEvent("left");
    } else if (parsed.special === "cc") {
      print(`Changing ${count} line(s)`);
      // Select and cut the specified number of lines, then enter insert mode
      selectLines(count);
      clickMenu(menuItems.cut);
      switchMode('insert');
    } else if (parsed.special === "P") {
      // Paste before cursor
      clickMenu(menuItems.paste);
    }
  } else if (parsed.operator) {
    // Special handling for the shorthand commands (C, D, Y) and explicit end-of-line operations (c$, d$, y$)
    if (parsed.motion === "$" || parsed.shorthand) {
      print(`End-of-line operation with operator '${parsed.operator}', count ${parsed.count}`);
      
      if (parsed.count > 1) {
        // For operations like 2D or 2d$ that should work on multiple lines
        // First go to the start of the current line
        sendKeyEvent("home");
        // Then select to the end of the target line
        for (let i = 0; i < parsed.count - 1; i++) {
          sendKeyEvent("down", { shift: true });
        }
        sendKeyEvent("end", { shift: true });
      } else {
        // Regular end-of-line operation
        goToEndOfLine(true); // Select to end of line
      }
      
      // Perform the operation
      if (parsed.operator === "d") {
        clickMenu(menuItems.cut);
      } else if (parsed.operator === "y") {
        clickMenu(menuItems.copy);
        // Unselect the text
        sendKeyEvent("right");
        sendKeyEvent("left");
      } else if (parsed.operator === "c") {
        clickMenu(menuItems.cut);
        switchMode('insert');
      }
    } else {
      // Regular operator handling
      doOperatorMotion(parsed.operator, parsed);
    }
  } else {
    print(`Handling motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
    doMoveMotion(parsed, false);
  }
}

  // --- Function to Handle Parsed Motions in Visual Mode ---
  function handleVisualParsedMotion(parsed) {
    if (parsed.operator) {
      if (parsed.operator === "d") {
        print(`Visual Delete operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
        doMoveMotion(parsed, true);
        clickMenu(menuItems.cut);
        switchMode('normal');
      } else if (parsed.operator === "y") {
        print(`Visual Yank operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
        doMoveMotion(parsed, true);
        clickMenu(menuItems.copy);
        switchMode('normal');
      }
      visualMotionBuffer = "";
    } else {
      print(`Handling visual motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
      doMoveMotion(parsed, true);
      visualMotionBuffer = "";
    }
  }

  // --- Menu Items & Helpers (Undo, Redo, Paste, Cut, Copy) ---
  const menuItemElements = {};
  const menuItems = {
    cut: { parent: "Edit", caption: "Cut" },
    paste: { parent: "Edit", caption: "Paste" },
    undo: { parent: "Edit", caption: "Undo" },
    redo: { parent: "Edit", caption: "Redo" },
    copy: { parent: "Edit", caption: "Copy" },
  };

  function clickMenu(item) {
    simulateClick(getMenuItem(item));
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
    for (const el of Array.from(menuItemEls)) {
      const label = el.innerText;
      if (!label) continue;
      if (label.startsWith(caption)) return el;
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

  // --- Consolidated Helper for Arrow Key Handling ---
  function handleArrowKeys(e, alwaysShift = false) {
    const shift = alwaysShift ? true : e.shiftKey;
    if (e.key === "ArrowLeft") {
      if (e.ctrlKey) {
        moveWordBackward(shift);
      } else {
        moveLeft(shift);
      }
      return true;
    }
    if (e.key === "ArrowRight") {
      if (e.ctrlKey) {
        moveWordForward(shift);
      } else {
        moveRight(shift);
      }
      return true;
    }
    if (e.key === "ArrowUp") {
      if (e.ctrlKey) {
        goToPrevPara(shift);
      } else {
        moveUp(shift);
      }
      return true;
    }
    if (e.key === "ArrowDown") {
      if (e.ctrlKey) {
        goToNextPara(shift);
      } else {
        moveDown(shift);
      }
      return true;
    }
    return false;
  }

  // --- Consolidated Motion Buffer Processing for Unified Error Handling ---
  function processMotionBuffer(buffer, parseFn, isValidFn, handleFn, resetFn, modeLabel, tempNormalCallback) {
    const result = parseFn(buffer);
    if (result) {
      if (!result.error) {
        handleFn(result);
        resetFn();
        if (tempNormalCallback && tempNormal) {
          tempNormalCallback();
        }
      } else {
        print(`${modeLabel} motion parsing error:`, result.error);
        resetFn();
        if (tempNormalCallback && tempNormal) {
          tempNormalCallback();
        }
      }
    } else if (!isValidFn(buffer)) {
      resetFn();
    }
  }

  // --- Mode-specific Handlers ---
  function handleNormalMode(e) {
    // If disabled, do nothing.
    if (!enabled) return;
    
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    
    print("[NORMAL MODE] Key pressed:", e.key);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (handleArrowKeys(e, false)) return;

    if (e.ctrlKey && e.key === 'b') {
      sendKeyEvent("pageUp");
      return;
    }
    if (e.ctrlKey && e.key === 'f') {
      sendKeyEvent("pageDown");
      return;
    }
    if (e.key === "p") {
      sendKeyEvent("right");
      clickMenu(menuItems.paste);
      return;
    }
    if (e.key === "P") {
      // Only handle P directly if there's nothing in the buffer
      // otherwise add it to the buffer for parsing with any count
      if (normalMotionBuffer === "") {
        clickMenu(menuItems.paste);
        return;
      }
    }
    if (e.key === "u") {
      clickMenu(menuItems.undo);
      return;
    }
    if (e.key === "r") {
      clickMenu(menuItems.redo);
      return;
    }
    if (e.key === "X") {
      // Delete character before cursor
      moveLeft();
      sendKeyEvent("delete");
      return;
    }
    
    // Don't handle D, C, Y directly so they can be properly parsed with counts
    // Instead, add them to the motion buffer like any other character
    
    if (e.key === 'i') {
      // Check if there's an operator in the buffer (d, c, y) before handling 'i'
      if (normalMotionBuffer.length > 0 && normalOperators.includes(normalMotionBuffer[normalMotionBuffer.length - 1])) {
        // 'i' might be part of a text object (diw, ciw, yiw), so add it to the buffer
        normalMotionBuffer += e.key;
        updateModeIndicator();
        return;
      } else {
        // Otherwise treat 'i' as the insert mode command
        switchMode('insert');
        normalMotionBuffer = "";
        return;
      }
    } else if (e.key === 'a') {
      // Check if there's an operator in the buffer (d, c, y) before handling 'a'
      if (normalMotionBuffer.length > 0 && normalOperators.includes(normalMotionBuffer[normalMotionBuffer.length - 1])) {
        // 'a' might be part of a text object (daw, caw, yaw), so add it to the buffer
        normalMotionBuffer += e.key;
        updateModeIndicator();
        return;
      } else {
        // Otherwise treat 'a' as the append command
        sendKeyEvent("right");
        switchMode('insert');
        return;
      }
    } else if (e.key === 'v') {
      sendKeyEvent("right", { shift: true });
      switchMode('visual');
      normalMotionBuffer = "";
      return;
    } else if (e.key === 'A') {
      sendKeyEvent("end");
      switchMode('insert');
      return;
    } else if (e.key === 'I') {
      sendKeyEvent("home");
      switchMode('insert');
      return;
    } else if (e.key === 'o') {
      openNewLineBelow();
      switchMode('insert');
      return;
    } else if (e.key === 'O') {
      openNewLineAbove();
      switchMode('insert');
      return;
    } else if (e.key === 'V') {
      enterVisualLineMode();
      return;
    }

    normalMotionBuffer += e.key;
    processMotionBuffer(
      normalMotionBuffer,
      parseNormalMotion,
      isValidMotionPrefix,
      handleParsedMotion,
      () => { normalMotionBuffer = ""; },
      "Normal",
      () => { setTimeout(() => { switchMode('insert'); tempNormal = false; }, 0); }
    );
  }

  function handleVisualMode(e) {
    // If disabled, do nothing.
    if (!enabled) return;

    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    print("[VISUAL MODE] Key pressed:", e.key);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (handleArrowKeys(e, true)) return;

    if (e.key === 'Escape') {
      sendKeyEvent("left");
      sendKeyEvent("right");
      switchMode('normal');
      visualMotionBuffer = "";
      return;
    }
    if (e.key === "y") {
      clickMenu(menuItems.copy);
      sendKeyEvent("right");
      sendKeyEvent("left");
      switchMode('normal');
      visualMotionBuffer = "";
      return;
    }
    if (e.key === "p") {
      clickMenu(menuItems.paste);
      return;
    }
    if (e.key === "u") {
      clickMenu(menuItems.undo);
      return;
    }
    if (e.key === "r") {
      clickMenu(menuItems.redo);
      return;
    }
    
    visualMotionBuffer += e.key;
    processMotionBuffer(
      visualMotionBuffer,
      parseVisualMotion,
      isValidVisualMotionPrefix,
      handleVisualParsedMotion,
      () => { visualMotionBuffer = ""; },
      "Visual"
    );
  }
  
  function handleInsertMode(e) {
    // If disabled, do nothing.
    if (!enabled) return;
    
    print("[INSERT MODE] Key pressed:", e.key);
    if (e.ctrlKey && e.key === 'o') {
      tempNormal = true;
      switchMode('normal');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    if (e.ctrlKey && e.key === 'h') {
      sendKeyEvent("backspace");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    if (e.key === 'Escape') {
      sendKeyEvent("left");
      switchMode('normal');
      e.preventDefault();
      return;
    }
  }

  function sendKeyEvent(key, mods = { shift: false, control: false }) {
    const keyCode = keyCodes[key];
    window.dispatchEvent(new CustomEvent("simulate-keypress-vim", {
      detail: { keyCode, mods }
    }));
  }

  function eventHandler(e) {
    // If disabled, ignore all key events.
    if (!enabled) return;
    
    if (!e.isTrusted) return;
    print(`Key event captured: ${e.key} (mode: ${mode})`);
    if (mode === 'normal') {
      handleNormalMode(e);
    } else if (mode === 'insert') {
      handleInsertMode(e);
    } else if (mode === 'visual' || mode === 'visualLine') {
      handleVisualMode(e);
    }
    if (modeIndicatorStyle === "vim") updateModeIndicator();
  }

  const iframe = document.getElementsByTagName('iframe')[0];
  if (iframe && iframe.contentDocument) {
    iframe.contentDocument.addEventListener('keydown', eventHandler, true);
    print("Event listener attached to the iframe's document.");
  } else {
    document.addEventListener('keydown', eventHandler, true);
    print("Event listener attached to the main document.");
  }

    // Listen for settings updates from the popup and update debug/theme/enabled live.
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "updateSettings") {
        console.log("Received updated settings:", message.settings);
        chrome.storage.sync.set(message.settings, () => {
          enabled = message.settings.enabled ?? true;
          debug = message.settings.debug ?? false;
          modeIndicatorStyle = message.settings.theme ?? "vim";
          updateModeIndicator();
          window.location.reload();
          sendResponse({ status: "Settings updated" });
        });
        return true;
      }
    });
})(); // End of the IIFE - This executes all the extension code immediately when loaded