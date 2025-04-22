(() => {
  //=============================================================================
  // CONFIGURATION AND INITIALIZATION
  //=============================================================================
  
  // Default preferences
  let enabled = true;
  let debug = false;
  let modeIndicatorStyle = "vim";

  // Initialize all state variables
  let mode = 'normal';
  let tempNormal = false; // temporary normal mode from Ctrl-o
  let normalMotionBuffer = ""; // accumulates keystrokes in normal mode
  let visualMotionBuffer = ""; // accumulates keystrokes in visual mode
  let lastCompletedMotion = null; // stores the last valid motion for the '.' command

  // Detect browser environment
  const isBrowser = typeof browser !== 'undefined';
  const api = isBrowser ? browser : chrome;

  // Load stored settings from browser storage
  api.storage.sync.get(["enabled", "debug", "theme"], (data) => {
    enabled = data.enabled ?? true;
    debug = data.debug ?? false;
    modeIndicatorStyle = data.theme ?? "vim";
    updateModeIndicator();
  });

  // Debug logging helper
  function print(...args) {
    if (debug) {
      console.log(...args);
    }
  }

  // Inject the page script
  const script = document.createElement("script");
  script.src = api.runtime.getURL("page_script.js");
  document.documentElement.appendChild(script);

  //=============================================================================
  // KEY CODE DEFINITIONS
  //=============================================================================
  
  const keyCodes = {
    backspace: 8, 
    tab: 9, 
    enter: 13, 
    esc: 27,
    pageUp: 33, 
    pageDown: 34,
    end: 35, 
    home: 36, 
    left: 37, 
    up: 38,
    right: 39, 
    down: 40, 
    "delete": 46
  };

  //=============================================================================
  // MODE INDICATOR UI
  //=============================================================================
  
  const modeIndicator = document.createElement('div');
  document.body.appendChild(modeIndicator);

  function setModeIndicatorStyle(newStyle) {
    modeIndicatorStyle = newStyle;
    updateModeIndicator();
  }

  /**
   * Updates the mode indicator based on current mode and theme preference.
   * - "vim" theme: full-width bar at bottom with mode on left, pending commands on right
   * - Other themes: small indicator at bottom-right
   */
  function updateModeIndicator() {
    // If the extension is disabled, hide the overlay
    if (!enabled) {
      modeIndicator.style.display = "none";
      return;
    }
    
    modeIndicator.style.display = "flex";
    
    if (modeIndicatorStyle === "vim") {
      applyVimStyleIndicator();
    } else {
      applyDefaultStyleIndicator();
    }
  }

  function applyVimStyleIndicator() {
    // Vim style: full-width bar along the bottom
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
    
    // Create or reuse left and right sections
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
    
    // Left side: display the current mode
    let displayMode = mode === 'visualLine' ? 'visual line' : mode;
    if (tempNormal && mode === 'normal') {
      modeText.textContent = "-- (Insert) --";
    } else {
      modeText.textContent = `-- ${displayMode.toUpperCase()} --`;
    }

    // Right side: display the accumulated motion command
    if (mode === 'normal') {
      commandText.textContent = normalMotionBuffer;
    } else if (mode === 'visual' || mode === 'visualLine') {
      commandText.textContent = visualMotionBuffer;
    } else {
      commandText.textContent = "";
    }
  }

  function applyDefaultStyleIndicator() {
    // Reset styles that might have been applied in Vim mode
    modeIndicator.style.left = '';
    modeIndicator.style.right = '';
  
    // Default style: a single indicator at bottom-right
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
    
    // Set style based on mode
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
    
    // Additional theme overrides
    if (modeIndicatorStyle === "dark") {
      modeIndicator.style.backgroundColor = "#222";
      modeIndicator.style.color = "#ddd";
    } else if (modeIndicatorStyle === "light") {
      modeIndicator.style.backgroundColor = "#f8f9fa";
      modeIndicator.style.color = "#000";
    }
  }
  
  // Initial update of mode indicator
  updateModeIndicator();

  //=============================================================================
  // CURSOR STYLE
  //=============================================================================
  
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

  //=============================================================================
  // MODE MANAGEMENT
  //=============================================================================
  
  /**
   * Switches between editing modes and updates UI accordingly
   */
  function switchMode(newMode) {
    mode = newMode;
    updateModeIndicator();
    updateCursorStyle();
    
    // Clear appropriate buffer when switching modes
    if (newMode === 'normal') {
      normalMotionBuffer = "";
    } else if (newMode === 'visual' || newMode === 'visualLine') {
      visualMotionBuffer = "";
    }
  }

  //=============================================================================
  // LINE OPERATIONS
  //=============================================================================
  
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

  //=============================================================================
  // MOTION COMMANDS AND PARSING
  //=============================================================================
  
  const validMotions = [
    "h", "j", "k", "l", "w", "gg", "G", "e", "b", 
    "ge", "0", "^", "$", "g_", "{", "}", "x", "iw", "aw"
  ];
  
  const normalOperators = ["d", "y", "c"];
  const visualOperators = ["d"];
  
  function isDigit(ch) {
    return /\d/.test(ch);
  }
  
  /**
   * Parses a buffer of keystrokes in normal mode to identify valid commands
   */
  function parseNormalMotion(buffer) {
    // Special cases for dd, yy, cc, S with number prefixes
    const lineOperatorPattern = /^(\d*)(dd|yy|cc|S)$/;
    const match = buffer.match(lineOperatorPattern);
    
    if (match) {
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const operator = match[2]; // "dd", "yy", "cc", or "S"
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

    // Special case for s with number prefixes
    const sPattern = /^(\d*)s$/;
    const sMatch = buffer.match(sPattern);
    
    if (sMatch) {
      const count = sMatch[1] ? parseInt(sMatch[1], 10) : 1;
      // Treat 's' like 'x' initially, but handle differently in execution
      return { count, motion: "s" }; 
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

  /**
   * Checks if a buffer represents a valid prefix for a normal mode command
   */
  function isValidMotionPrefix(buffer) {
    // Reject "caw" as it's not a valid command
    if (buffer === "ca" || buffer === "caw") {
      return false;
    }
    
    // Special cases for dd, yy, cc, S with number prefixes
    if (/^\d*d?d?$/.test(buffer) || /^\d*y?y?$/.test(buffer) || /^\d*c?c?$/.test(buffer) || /^\d*S?$/.test(buffer)) {
      return true;
    }

    // Special case for C, D, Y commands
    if (/^\d*[CDY]?$/.test(buffer)) {
      return true;
    }

    if (/^\d*x?$/.test(buffer) || buffer === "P" || /^\d*s?$/.test(buffer)) {
      return true;
    }
    
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

  /**
   * Parses a buffer of keystrokes in visual mode to identify valid commands
   */
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

  /**
   * Checks if a buffer represents a valid prefix for a visual mode command
   */
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

  //=============================================================================
  // CURSOR MOVEMENT FUNCTIONS
  //=============================================================================
  
  // Basic cursor movement functions with optional shift key for selection
  function moveLeft(shift = false) { 
    sendKeyEvent("left", { shift }); 
  }
  
  function moveRight(shift = false) { 
    sendKeyEvent("right", { shift }); 
  }
  
  function moveUp(shift = false) { 
    sendKeyEvent("up", { shift }); 
  }
  
  function moveDown(shift = false) { 
    sendKeyEvent("down", { shift }); 
  }
  
  function moveWordForward(shift = false) { 
    sendKeyEvent("right", { control: true, shift }); 
  }
  
  function moveWordBackward(shift = false) { 
    sendKeyEvent("left", { control: true, shift }); 
  }
  
  function goToTop(shift = false) { 
    sendKeyEvent("home", { control: true, shift }); 
  }
  
  function goToBottom(shift = false) { 
    sendKeyEvent("end", { control: true, shift }); 
  }
  
  function goToEndOfWord(shift = false) { 
    sendKeyEvent("right", { control: true, shift }); 
  }
  
  function goToStartOfLine(shift = false) { 
    sendKeyEvent("home", { shift }); 
  }
  
  function goToEndOfLine(shift = false) { 
    sendKeyEvent("end", { shift }); 
  }
  
  function goToBackwardEndOfWord(shift = false) { 
    sendKeyEvent("left", { control: true, shift });
    sendKeyEvent("left", { shift });
  }
  
  function goToPrevPara(shift = false) { 
    sendKeyEvent("up", { control: true, shift }); 
  }
  
  function goToNextPara(shift = false) { 
    sendKeyEvent("down", { control: true, shift }); 
  }

  //=============================================================================
  // TEXT OBJECT SELECTION
  //=============================================================================
  
  /**
   * Selects the inner part of a word
   */
  function selectInnerWord(count = 1) {
    moveRight(false);
    moveWordBackward(false);
    // For count > 1, select multiple words
    for (let i = 0; i < count; i++) {
      moveWordForward(true);
    }
    // add fix when i figure out how
  }
  
  /**
   * Selects a word including surrounding whitespace
   */
  function selectAWord(count = 1) {
    moveRight(false);
    moveWordBackward(false);
    // For count > 1, select multiple words
    for (let i = 0; i < count; i++) {
      moveWordForward(true);
    }
    // add fix when i figure out how
  }

  //=============================================================================
  // MOTION EXECUTION FUNCTIONS
  //=============================================================================
  
  /**
   * Executes movement based on parsed motion command
   */
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

    // Special handling for 's' command (substitute character)
    if (parsed.motion === "s") {
      for (let i = 0; i < count; i++) {
        sendKeyEvent("right", { shift: true });
      }
      if (!shift) { // Only cut and switch mode if not part of an operator command
        clickMenu(menuItems.cut);
        switchMode('insert');
      }
      return; // Handled 's' motion, exit
    }
  }

  /**
   * Executes commands with operators (d, y, c) in normal mode
   */
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

  /**
   * Repeats the last recorded motion (for the '.' command)
   */
  function repeatLastMotion() {
    if (!lastCompletedMotion) {
      print("No motion to repeat");
      return;
    }

    print("Repeating last motion:", lastCompletedMotion);
    
    const motion = lastCompletedMotion;
    
    switch (motion.type) {
      case 'normal':
        // For normal motions, re-parse and execute
        const normalResult = parseNormalMotion(motion.originalBuffer);
        if (normalResult && !normalResult.error) {
          handleParsedMotion(normalResult);
        }
        break;
        
      case 'special':
        // For special commands like p, u, r, X, P
        const count = motion.count || 1;
        if (motion.command === 'p') {
          sendKeyEvent("right");
          for (let i = 0; i < count; i++) {
            clickMenu(menuItems.paste);
          }
        } else if (motion.command === 'u') {
          for (let i = 0; i < count; i++) {
            clickMenu(menuItems.undo);
          }
        } else if (motion.command === 'r') {
          for (let i = 0; i < count; i++) {
            clickMenu(menuItems.redo);
          }
        } else if (motion.command === 'X') {
          for (let i = 0; i < count; i++) {
            moveLeft();
            sendKeyEvent("delete");
          }
        } else if (motion.command === 'P') {
          for (let i = 0; i < count; i++) {
            clickMenu(menuItems.paste);
          }
        }
        break;
        
      case 'special_line':
        // For line operations like dd, yy, cc
        const lineCount = motion.count || 1;
        if (motion.command === 'dd') {
          selectLines(lineCount);
          clickMenu(menuItems.cut);
        } else if (motion.command === 'yy') {
          selectLines(lineCount);
          clickMenu(menuItems.copy);
          // Unselect the text
          sendKeyEvent("right");
          sendKeyEvent("left");
        } else if (motion.command === 'cc') {
          sendKeyEvent("end");
          sendKeyEvent("enter");
          sendKeyEvent("up");
          selectLines(lineCount);
          clickMenu(menuItems.cut);
          switchMode('insert');
        } else if (motion.command === 'S') { // Handle S (equivalent to cc)
          print(`Changing ${count} line(s) [S command]`);
          // Perform the same actions as cc
          sendKeyEvent("end");
          sendKeyEvent("enter");
          sendKeyEvent("up");
          selectLines(count);
          clickMenu(menuItems.cut);
          switchMode('insert');
          // Store the special command for repeat
          lastCompletedMotion = {
            type: 'special_line',
            command: 'S', // Track as S
            count: count
          };
          print(`Tracking special S:`, lastCompletedMotion);
        }
        break;
        
      case 'mode_switch':
        // For commands that switch to insert mode like i, a, A, I, o, O
        if (motion.command === 'i') {
          switchMode('insert');
        } else if (motion.command === 'a') {
          sendKeyEvent("right");
          switchMode('insert');
        } else if (motion.command === 'A') {
          sendKeyEvent("end");
          switchMode('insert');
        } else if (motion.command === 'I') {
          sendKeyEvent("home");
          switchMode('insert');
        } else if (motion.command === 'o') {
          openNewLineBelow();
          switchMode('insert');
        } else if (motion.command === 'O') {
          openNewLineAbove();
          switchMode('insert');
        }
        break;
        
      case 'operator_eol':
        // For end-of-line operations like d$, y$, c$ (or D, Y, C)
        const eolCount = motion.count || 1;
        if (eolCount > 1) {
          // For operations like 2D or 2d$ that should work on multiple lines
          sendKeyEvent("home");
          for (let i = 0; i < eolCount - 1; i++) {
            sendKeyEvent("down", { shift: true });
          }
          sendKeyEvent("end", { shift: true });
        } else {
          // Regular end-of-line operation
          goToEndOfLine(true);
        }
        
        if (motion.operator === 'd') {
          clickMenu(menuItems.cut);
        } else if (motion.operator === 'y') {
          clickMenu(menuItems.copy);
          // Unselect the text
          sendKeyEvent("right");
          sendKeyEvent("left");
        } else if (motion.operator === 'c') {
          clickMenu(menuItems.cut);
          switchMode('insert');
        }
        break;
        
      case 'visual_operator':
        // Convert the visual operation to equivalent normal mode operation
        // For example, 'vwd' (visual select word + delete) would be repeated as 'dw'
        if (motion.operator && motion.motion) {
          // Create a synthetic normal mode command
          const syntheticParsed = {
            count: motion.count || 1,
            operator: motion.operator,
            motion: motion.motion
          };
          doOperatorMotion(motion.operator, syntheticParsed);
        }
        break;
        
      case 'visual_direct':
        // Repeats direct visual mode operations like 'y' without motion
        // This is trickier in normal mode, so we'll generally convert to text object operations
        if (motion.command === 'y') {
          // Select current word (approximation of last visual selection)
          selectInnerWord();
          clickMenu(menuItems.copy);
          // Unselect the text
          sendKeyEvent("right");
          sendKeyEvent("left");
        }
        break;
        
      default:
        print("Unknown motion type:", motion.type);
    }
  }
  
  /**
   * Handles the execution of parsed commands in normal mode
   */
  function handleParsedMotion(parsed) {
    if (parsed.special) {
      const count = parsed.count || 1;
      
      if (parsed.special === "dd") {
        print(`Deleting ${count} line(s)`);
        // Select and delete the specified number of lines
        selectLines(count);
        clickMenu(menuItems.cut);
        // Store the special command for repeat
        lastCompletedMotion = {
          type: 'special_line',
          command: 'dd',
          count: count
        };
        print(`Tracking special dd:`, lastCompletedMotion);
      } else if (parsed.special === "yy") {
        print(`Yanking ${count} line(s)`);
        // Select and copy the specified number of lines
        selectLines(count);
        clickMenu(menuItems.copy);
        // Unselect the text
        sendKeyEvent("right");
        sendKeyEvent("left");
        // Store the special command for repeat
        lastCompletedMotion = {
          type: 'special_line',
          command: 'yy',
          count: count
        };
        print(`Tracking special yy:`, lastCompletedMotion);
      } else if (parsed.special === "cc") {
        print(`Changing ${count} line(s)`);
        // Go to start of line and press enter first
        sendKeyEvent("end");
        sendKeyEvent("enter");
        sendKeyEvent("up");
        selectLines(count);
        clickMenu(menuItems.cut);
        switchMode('insert');
        // Store the special command for repeat
        lastCompletedMotion = {
          type: 'special_line',
          command: 'cc',
          count: count
        };
        print(`Tracking special cc:`, lastCompletedMotion);
      } else if (parsed.special === "S") { // Handle S (equivalent to cc)
        print(`Changing ${count} line(s) [S command]`);
        // Perform the same actions as cc
        sendKeyEvent("end");
        sendKeyEvent("enter");
        sendKeyEvent("up");
        selectLines(count);
        clickMenu(menuItems.cut);
        switchMode('insert');
        // Store the special command for repeat
        lastCompletedMotion = {
          type: 'special_line',
          command: 'S', // Track as S
          count: count
        };
        print(`Tracking special S:`, lastCompletedMotion);
      } else if (parsed.special === "P") {
        // Paste before cursor
        clickMenu(menuItems.paste);
        // Store the special command for repeat
        lastCompletedMotion = {
          type: 'special',
          command: 'P',
          count: count
        };
        print(`Tracking special P:`, lastCompletedMotion);
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
        
        // Store the operation for repeat
        lastCompletedMotion = {
          type: 'operator_eol',
          operator: parsed.operator,
          shorthand: parsed.shorthand,
          count: parsed.count
        };
        print(`Tracking operator_eol:`, lastCompletedMotion);
      } else {
        // Regular operator handling
        doOperatorMotion(parsed.operator, parsed);
        // Operation tracking is done in processMotionBuffer
      }
    } else {
      print(`Handling motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
      // Store non-operator motion for repeat, unless it's 's' (handled separately)
      if (parsed.motion !== 's') {
        lastCompletedMotion = {
          type: 'normal',
          originalBuffer: normalMotionBuffer, // Use the buffer that generated this
          result: JSON.parse(JSON.stringify(parsed))
        };
        print(`Tracking normal motion:`, lastCompletedMotion);
      }
      
      doMoveMotion(parsed, false);

      // Special tracking for 's' after execution
      if (parsed.motion === 's') {
          lastCompletedMotion = {
            type: 'special',
            command: 's',
            count: parsed.count
          };
          print(`Tracking special s:`, lastCompletedMotion);
      }
      // Motion tracking is done in processMotionBuffer
    }
  }

  /**
   * Handles the execution of parsed commands in visual mode
   */
  function handleVisualParsedMotion(parsed) {
    if (parsed.operator) {
      if (parsed.operator === "d") {
        print(`Visual Delete operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
        doMoveMotion(parsed, true);
        clickMenu(menuItems.cut);
        switchMode('normal');
        
        // Store the visual operation for repeat via '.'
        lastCompletedMotion = {
          type: 'visual_operator',
          operator: 'd',
          motion: parsed.motion,
          count: parsed.count
        };
        print(`Tracking visual operator:`, lastCompletedMotion);
      } else if (parsed.operator === "y") {
        print(`Visual Yank operator with motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
        doMoveMotion(parsed, true);
        clickMenu(menuItems.copy);
        switchMode('normal');
        
        // Store the visual operation for repeat via '.'
        lastCompletedMotion = {
          type: 'visual_operator',
          operator: 'y',
          motion: parsed.motion,
          count: parsed.count
        };
        print(`Tracking visual operator:`, lastCompletedMotion);
      }
      visualMotionBuffer = "";
    } else {
      print(`Handling visual motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
      doMoveMotion(parsed, true);
      visualMotionBuffer = "";
      
      // If this was just a motion without an operator, we don't track it for '.'
      // since '.' typically repeats operations, not just movements
    }
  }

  //=============================================================================
  // MENU INTERACTION
  //=============================================================================
  
  // Define menu items for operations with class-based selectors that work across languages
  const menuItems = {
    cut: { 
      iconClass: "docs-icon-editors-ia-cut",
      fallbackText: "Cut" 
    },
    paste: { 
      iconClass: "docs-icon-editors-ia-paste",
      fallbackText: "Paste" 
    },
    undo: { 
      iconClass: "docs-icon-editors-ia-undo",
      fallbackText: "Undo" 
    },
    redo: { 
      iconClass: "docs-icon-editors-ia-redo",
      fallbackText: "Redo" 
    },
    copy: { 
      iconClass: "docs-icon-editors-ia-copy",
      fallbackText: "Copy" 
    },
  };

  /**
   * Find menu item by its icon class or text content
   * This approach is more robust across different languages and sessions
   */
  function findMenuItemElement(item) {
    // Try finding by icon class first (most reliable across languages)
    const iconSelector = `.docs-icon-img.${item.iconClass}`;
    const iconElements = document.querySelectorAll(iconSelector);
    
    for (const iconEl of iconElements) {
      // Find the parent menuitem element
      let parent = iconEl;
      while (parent && !parent.classList.contains("goog-menuitem")) {
        parent = parent.parentElement;
      }
      
      if (parent) {
        return parent;
      }
    }
    
    // Fallback: Try to find by text content in the menuitem label
    const menuItems = document.querySelectorAll('.goog-menuitem');
    for (const menuItem of menuItems) {
      const labelEl = menuItem.querySelector('.goog-menuitem-label');
      if (labelEl && labelEl.textContent.includes(item.fallbackText)) {
        return menuItem;
      }
    }
    
    // Second fallback: Try to find by aria-label
    for (const menuItem of menuItems) {
      if (menuItem.getAttribute('aria-label') && 
          menuItem.getAttribute('aria-label').includes(item.fallbackText)) {
        return menuItem;
      }
    }
    
    // If all fails, try opening the Edit menu and searching again
    const editMenus = Array.from(document.querySelectorAll('.menu-button'))
      .filter(button => button.textContent.trim() === 'Edit');
    
    if (editMenus.length > 0) {
      simulateClick(editMenus[0]);
      
      // Try again to find by icon class after menu is open
      const iconElements = document.querySelectorAll(iconSelector);
      for (const iconEl of iconElements) {
        let parent = iconEl;
        while (parent && !parent.classList.contains("goog-menuitem")) {
          parent = parent.parentElement;
        }
        
        if (parent) {
          return parent;
        }
      }
    }
    
    return null;
  }

  /**
   * Simulates clicking a menu item using class-based selectors
   */
  function clickMenu(item) {
    const element = findMenuItemElement(item);
    if (element) {
      simulateClick(element);
    } else {
      console.warn(`Menu item with icon class ${item.iconClass} not found`);
      // Try to use keyboard shortcuts as last resort
      if (item === menuItems.cut) {
        document.execCommand('cut');
      } else if (item === menuItems.copy) {
        document.execCommand('copy');
      } else if (item === menuItems.paste) {
        document.execCommand('paste');
      }
    }
  }

  /**
   * Simulates mouse clicks on an element
   */
  function simulateClick(el, x = 0, y = 0) {
    if (!el) {
      console.warn("No element provided to simulateClick");
      return;
    }
    
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

  //=============================================================================
  // KEY EVENT HANDLING
  //=============================================================================
  
  /**
   * Handles arrow key events with optional shift key for selection
   */
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

  /**
   * Unified processing of motion buffers with error handling
   */
  function processMotionBuffer(buffer, parseFn, isValidFn, handleFn, resetFn, modeLabel, tempNormalCallback) {
    const result = parseFn(buffer);
    
    if (result) {
      if (!result.error) {
        // Store the last successful motion for '.' command
        if (modeLabel === 'Normal') {
          lastCompletedMotion = {
            type: 'normal',
            originalBuffer: buffer,
            result: JSON.parse(JSON.stringify(result)) // Deep copy to avoid reference issues
          };
          print(`Tracking last motion:`, lastCompletedMotion);
        } else if (modeLabel === 'Visual') {
          lastCompletedMotion = {
            type: 'visual',
            originalBuffer: buffer,
            result: JSON.parse(JSON.stringify(result))
          };
          print(`Tracking last visual motion:`, lastCompletedMotion);
        }
        
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

  /**
   * Handles keypresses in normal mode
   */
  function handleNormalMode(e) {
    // If disabled, do nothing
    if (!enabled) return;
    
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    
    print("[NORMAL MODE] Key pressed:", e.key);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Handle arrow keys
    if (handleArrowKeys(e, false)) return;

    // Handle Ctrl key combinations
    if (e.ctrlKey && e.key === 'b') {
      sendKeyEvent("pageUp");
      return;
    }
    if (e.ctrlKey && e.key === 'f') {
      sendKeyEvent("pageDown");
      return;
    }
    
    // Handle single-key commands - only if buffer is empty
    // Special case for the dot command to repeat last motion
    if (e.key === "." && normalMotionBuffer === "") {
      repeatLastMotion();
      return;
    }

    // Handle simple numbered commands like "3p", "5u", etc.
    const numberCmdMatch = normalMotionBuffer.match(/^(\d+)$/);
    if (normalMotionBuffer === "" || numberCmdMatch) {
      // For numbered commands, extract the count
      const count = numberCmdMatch ? parseInt(numberCmdMatch[1], 10) : 1;
      
      if (e.key === "p") {
        sendKeyEvent("right");
        for (let i = 0; i < count; i++) {
          clickMenu(menuItems.paste);
        }
        // Track this motion
        lastCompletedMotion = {
          type: 'special',
          command: 'p',
          count: count
        };
        print(`Tracking special p:`, lastCompletedMotion);
        normalMotionBuffer = "";
        return;
      }
      if (e.key === "u") {
        for (let i = 0; i < count; i++) {
          clickMenu(menuItems.undo);
        }
        // Track this motion
        lastCompletedMotion = {
          type: 'special',
          command: 'u',
          count: count
        };
        print(`Tracking special u:`, lastCompletedMotion);
        normalMotionBuffer = "";
        return;
      }
      if (e.key === "r") {
        for (let i = 0; i < count; i++) {
          clickMenu(menuItems.redo);
        }
        // Track this motion
        lastCompletedMotion = {
          type: 'special',
          command: 'r',
          count: count
        };
        print(`Tracking special r:`, lastCompletedMotion);
        normalMotionBuffer = "";
        return;
      }
      if (e.key === "X") {
        // Delete character before cursor (multiple times if count provided)
        for (let i = 0; i < count; i++) {
          moveLeft();
          sendKeyEvent("delete");
        }
        // Track this motion
        lastCompletedMotion = {
          type: 'special',
          command: 'X',
          count: count
        };
        print(`Tracking special X:`, lastCompletedMotion);
        normalMotionBuffer = "";
        return;
      }
      // P has a special case when buffer is empty or has only numbers
      if (e.key === "P") {
        for (let i = 0; i < count; i++) {
          clickMenu(menuItems.paste);
        }
        // Track this motion
        lastCompletedMotion = {
          type: 'special',
          command: 'P',
          count: count
        };
        print(`Tracking special P:`, lastCompletedMotion);
        normalMotionBuffer = "";
        return;
      }
    }
    
    // Additional check for operators + u,r,p,X,P (like "du" should not undo)
    if (normalMotionBuffer.length > 0 && 
        normalOperators.includes(normalMotionBuffer[normalMotionBuffer.length - 1]) &&
        ["u", "r", "p", "X", "P"].includes(e.key)) {
      // If we have an operator followed by one of these keys, treat it as a potentially 
      // invalid command sequence, but don't immediately execute the single-key command
      normalMotionBuffer += e.key;
      return;
    }
    
    // Mode switching commands
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
        // Track this motion for '.' command (entering insert mode is trackable)
        lastCompletedMotion = {
          type: 'mode_switch',
          command: 'i'
        };
        print(`Tracking mode switch i:`, lastCompletedMotion);
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
        // Track this motion for '.' command
        lastCompletedMotion = {
          type: 'mode_switch',
          command: 'a'
        };
        print(`Tracking mode switch a:`, lastCompletedMotion);
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
      // Track this motion for '.' command
      lastCompletedMotion = {
          type: 'mode_switch',
          command: 'A'
      };
      print(`Tracking mode switch A:`, lastCompletedMotion);
      return;
    } else if (e.key === 'I') {
      sendKeyEvent("home");
      switchMode('insert');
      // Track this motion for '.' command
      lastCompletedMotion = {
          type: 'mode_switch',
          command: 'I'
      };
      print(`Tracking mode switch I:`, lastCompletedMotion);
      return;
    } else if (e.key === 'o') {
      openNewLineBelow();
      switchMode('insert');
      // Track this motion for '.' command
      lastCompletedMotion = {
          type: 'mode_switch',
          command: 'o'
      };
      print(`Tracking mode switch o:`, lastCompletedMotion);
      return;
    } else if (e.key === 'O') {
      openNewLineAbove();
      switchMode('insert');
      // Track this motion for '.' command
      lastCompletedMotion = {
          type: 'mode_switch',
          command: 'O'
      };
      print(`Tracking mode switch O:`, lastCompletedMotion);
      return;
    } else if (e.key === 'V') {
      enterVisualLineMode();
      return;
    }

    // Add key to buffer and process commands
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

  /**
   * Handles keypresses in visual mode
   */
  function handleVisualMode(e) {
    // If disabled, do nothing
    if (!enabled) return;

    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    
    print("[VISUAL MODE] Key pressed:", e.key);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Handle arrow keys (with shift always on in visual mode)
    if (handleArrowKeys(e, true)) return;

    // Handle Escape to exit visual mode
    if (e.key === 'Escape') {
      sendKeyEvent("left");
      sendKeyEvent("right");
      switchMode('normal');
      visualMotionBuffer = "";
      return;
    }
    
    // Handle direct operations
    if (e.key === "d" || e.key === "x") {
        clickMenu(menuItems.cut);
        switchMode('normal');
        
        // Store the visual delete for repeat via '.'
        lastCompletedMotion = {
          type: 'visual_direct',
          command: 'd' // Treat x as d for repeat
        };
        print(`Tracking visual direct delete:`, lastCompletedMotion);
        
        visualMotionBuffer = "";
        return;
    }
    if (e.key === "c" || e.key === "s") {
        clickMenu(menuItems.cut);
        switchMode('insert');
        
        // Store the visual change for repeat via '.'
        lastCompletedMotion = {
          type: 'visual_direct',
          command: 'c' // Treat s as c for repeat
        };
        print(`Tracking visual direct change:`, lastCompletedMotion);
        
        visualMotionBuffer = "";
        return;
    }
    if (e.key === "y") {
      clickMenu(menuItems.copy);
      sendKeyEvent("right");
      sendKeyEvent("left");
      switchMode('normal');
      
      // Store the visual yank for repeat via '.'
      lastCompletedMotion = {
        type: 'visual_direct',
        command: 'y'
      };
      print(`Tracking visual direct y:`, lastCompletedMotion);
      
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
    
    // Add key to buffer and process commands
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
  
  /**
   * Handles keypresses in insert mode
   */
  function handleInsertMode(e) {
    // If disabled, do nothing
    if (!enabled) return;
    
    print("[INSERT MODE] Key pressed:", e.key);
    
    // Handle Ctrl+O (temporary normal mode)
    if (e.ctrlKey && e.key === 'o') {
      tempNormal = true;
      switchMode('normal');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    
    // Handle Ctrl+H (backspace)
    if (e.ctrlKey && e.key === 'h') {
      sendKeyEvent("backspace");
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    
    // Handle Escape (exit insert mode)
    if (e.key === 'Escape') {
      sendKeyEvent("left");
      switchMode('normal');
      e.preventDefault();
      return;
    }
  }

  /**
   * Sends a key event to the page directly using DOM keyboard events
   * @param {string} key - The key to send
   * @param {Object} mods - Modifier keys (shift, control)
   */
  function sendKeyEvent(key, mods = { shift: false, control: false, alt: false, meta: false }) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    let keyCode = keyCodes[key];

    let finalMods = {...mods};
    
    // Make sure alt is defined in finalMods
    if (finalMods.alt === undefined) {
      finalMods.alt = false;
    }

    if (isMac) {
      if (key === "home") {
        if (finalMods.control) {
          keyCode = keyCodes.up;
          finalMods.meta = true;
          finalMods.control = false;
        } else {
          keyCode = keyCodes.left;
          finalMods.meta = true;
        }
      } else if (key === "end") {
        if (finalMods.control) {
          keyCode = keyCodes.down;
          finalMods.meta = true;
          finalMods.control = false;
        } else {
          keyCode = keyCodes.right;
          finalMods.meta = true;
        }
      }
    }
    
    if (isMac) {
      const tempControl = finalMods.control;
      finalMods.control = finalMods.alt;
      finalMods.alt = tempControl;
    }
    
    try {
      // Find the appropriate target element to receive the event
      const editorEl = findEditorElement();
      if (!editorEl) {
        console.error("Cannot find editor element to send key event to");
        return;
      }
      
      // Create and dispatch keyboard events directly
      const keyDownEvent = createKeyboardEvent("keydown", keyCode, finalMods);
      const keyUpEvent = createKeyboardEvent("keyup", keyCode, finalMods);
      
      // Dispatch the events synchronously
      editorEl.dispatchEvent(keyDownEvent);
      editorEl.dispatchEvent(keyUpEvent);
    } catch (e) {
      console.error("Error sending key event:", e);
    }
  }

  /**
   * Sends a typing event to the page directly using DOM keyboard events
   * @param {string} key - The key to send
   * @param {Object} mods - Modifier keys (shift, control)
   */
  function sendTypingEvent(key, mods = { shift: false, control: false, alt: false, meta: false }) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    let keyCode = keyCodes[key];

    let finalMods = {...mods};
    
    // Make sure alt is defined in finalMods
    if (finalMods.alt === undefined) {
      finalMods.alt = false;
    }

    try {
      // Find the appropriate target element to receive the event
      const editorEl = findEditorElement();
      if (!editorEl) {
        console.error("Cannot find editor element to send typing event to");
        return;
      }
      
      // Create and dispatch keyboard press event directly
      const keyPressEvent = createKeyboardEvent("keypress", keyCode, finalMods);
      
      // Dispatch the event synchronously
      editorEl.dispatchEvent(keyPressEvent);
    } catch (e) {
      console.error("Error sending typing event:", e);
    }
  }
  
  /**
   * Helper function to create keyboard events
   */
  function createKeyboardEvent(eventType, keyCode, mods) {
    const event = new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
      keyCode: keyCode,
      which: keyCode,
      ctrlKey: mods.control || false,
      altKey: mods.alt || false,
      shiftKey: mods.shift || false,
      metaKey: mods.meta || false
    });
    
    // Some browsers need additional property configuration
    try {
      Object.defineProperties(event, {
        keyCode: { value: keyCode },
        which: { value: keyCode }
      });
    } catch (e) {
      // Ignore if properties cannot be set
    }
    
    return event;
  }
  
  /**
   * Finds the appropriate editor element to send events to
   */
  function findEditorElement() {
    // Try to find the editor iframe first
    const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
    if (editorIframe && editorIframe.contentDocument) {
      return editorIframe.contentDocument.activeElement || editorIframe.contentDocument.body;
    }
    
    // Try any iframe as fallback
    const iframe = document.getElementsByTagName('iframe')[0];
    if (iframe && iframe.contentDocument) {
      return iframe.contentDocument.activeElement || iframe.contentDocument.body;
    }
    
    // Last resort - use document.activeElement
    return document.activeElement || document.body;
  }

  /**
   * Main event handler that dispatches events to mode-specific handlers
   */
  function eventHandler(e) {
    // If disabled, ignore all key events
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
    
    if (modeIndicatorStyle === "vim") {
      updateModeIndicator();
    }
  }

  //=============================================================================
  // EVENT BINDING & SETTINGS LISTENERS
  //=============================================================================
  
  // Helper to attach the event listener with Firefox compatibility
  function attachKeyListener() {
    // Primary approach - try to find the specific Google Docs editor iframe
    const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
    if (editorIframe && editorIframe.contentDocument) {
      editorIframe.contentDocument.addEventListener('keydown', eventHandler, true);
      print("Event listener attached to the editor iframe document.");
      return true;
    }
    
    // Secondary approach - try any iframe
    const iframe = document.getElementsByTagName('iframe')[0];
    if (iframe && iframe.contentDocument) {
      iframe.contentDocument.addEventListener('keydown', eventHandler, true);
      print("Event listener attached to the iframe's document.");
      return true;
    }
    
    // Fallback - attach to main document
    document.addEventListener('keydown', eventHandler, true);
    print("Event listener attached to the main document.");
    return true;
  }
  
  // Initial event binding
  attachKeyListener();
  
  // Some browsers (especially Firefox) might load iframes after our content script
  // So we need to retry attaching the event listener after a delay
  setTimeout(() => {
    const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
    if (editorIframe && !editorIframe._vimListenerAttached) {
      attachKeyListener();
      editorIframe._vimListenerAttached = true;
    }
  }, 1000);
  
  // Also add a mutation observer to detect when the iframe is added to the DOM
  const docObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'IFRAME' || node.querySelector && node.querySelector('iframe')) {
            print("Iframe detected via mutation observer, attaching event listener");
            setTimeout(attachKeyListener, 100); // Short delay to ensure iframe is fully loaded
          }
        }
      }
    }
  });
  
  docObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Listen for settings updates from the popup
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateSettings") {
      console.log("Received updated settings:", message.settings);
      enabled = message.settings.enabled;
      debug = message.settings.debug;
      modeIndicatorStyle = message.settings.theme;
      if (window.relativeLineNumbers && message.settings.hasOwnProperty('lineNumbersEnabled')) {
        window.relativeLineNumbers.toggle(message.settings.lineNumbersEnabled);
      }
      updateModeIndicator();
      // Don't reload the page as it might disrupt user experience
      // window.location.reload();
      sendResponse({ success: true });
    }
  });

})(); // End of the IIFE - This executes all the extension code immediately when loaded
