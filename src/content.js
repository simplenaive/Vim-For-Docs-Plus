(() => {
  //=============================================================================
  // CONSTANTS AND GLOBAL CONFIGURATION
  //=============================================================================

  // Key code definitions
  const KEY_CODES = {
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

  // Menu items for operations with class-based selectors
  const MENU_ITEMS = {
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
    }
  };

  // Browser environment detection
  const IS_BROWSER = typeof browser !== 'undefined';
  const API = IS_BROWSER ? browser : chrome;

  //=============================================================================
  // UTILITY FUNCTIONS
  //=============================================================================

  /**
   * Check if character is a digit
   */
  function isDigit(ch) {
    return /\d/.test(ch);
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

  //=============================================================================
  // CLASS DEFINITIONS
  //=============================================================================

  /**
   * Main state management class for Vim motions
   */
  class VimState {
    constructor() {
      // Extension preferences
      this.enabled = true;
      this.debug = false;
      this.modeIndicatorStyle = "vim";

      // Current editing mode
      this.mode = 'normal';
      
      // Visual line mode state
      this.visualLineDisplacement = 0;
      
      // Temporary normal mode from Ctrl-o
      this.tempNormal = false;
      
      // Motion command buffers
      this.normalMotionBuffer = "";
      this.visualMotionBuffer = "";
      
      // Last completed motion for '.' command
      this.lastCompletedMotion = null;

      // Load settings from browser storage
      this.loadSettings();
    }

    /**
     * Load stored settings from browser storage
     */
    loadSettings() {
      API.storage.sync.get(["enabled", "debug", "theme"], (data) => {
        this.enabled = data.enabled ?? true;
        this.debug = data.debug ?? false;
        this.modeIndicatorStyle = data.theme ?? "vim";
      });
    }

    /**
     * Debug logging helper
     */
    print(...args) {
      if (this.debug) {
        console.log(...args);
      }
    }

    /**
     * Switch between editing modes
     */
    switchMode(newMode) {
      // Clear visualLineDisplacement when leaving visual line mode
      if (this.mode === 'visualLine' && newMode !== 'visualLine') {
        this.visualLineDisplacement = 0;
      }
      
      this.mode = newMode;

      // Clear appropriate buffer when switching modes
      if (newMode === 'normal') {
        this.normalMotionBuffer = "";
      } else if (newMode === 'visual' || newMode === 'visualLine') {
        this.visualMotionBuffer = "";
      }
    }

    /**
     * Reset motion buffers
     */
    resetNormalBuffer() {
      this.normalMotionBuffer = "";
    }

    resetVisualBuffer() {
      this.visualMotionBuffer = "";
    }

    /**
     * Update settings from external source (popup, etc.)
     */
    updateSettings(settings) {
      this.enabled = settings.enabled ?? this.enabled;
      this.debug = settings.debug ?? this.debug;
      this.modeIndicatorStyle = settings.theme ?? this.modeIndicatorStyle;
    }

    /**
     * Store motion for repeat functionality
     */
    setLastCompletedMotion(motion) {
      this.lastCompletedMotion = motion;
      this.print("Tracking motion:", motion);
    }

    /**
     * Get current mode display string
     */
    getModeDisplayString() {
      if (this.mode === 'visualLine') return 'visual line';
      return this.mode;
    }

    /**
     * Get current motion buffer based on mode
     */
    getCurrentBuffer() {
      if (this.mode === 'normal') {
        return this.normalMotionBuffer;
      } else if (this.mode === 'visual' || this.mode === 'visualLine') {
        return this.visualMotionBuffer;
      }
      return "";
    }

    /**
     * Add character to current motion buffer
     */
    addToCurrentBuffer(char) {
      if (this.mode === 'normal') {
        this.normalMotionBuffer += char;
      } else if (this.mode === 'visual' || this.mode === 'visualLine') {
        this.visualMotionBuffer += char;
      }
    }
  }

  /**
   * Handles UI elements like mode indicator and cursor styling
   */
  class VimUI {
    constructor(state) {
      this.state = state;
      this.modeIndicator = null;
      this.cursorCaret = null;
      
      this.initializeModeIndicator();
      this.initializeCursorCaret();
    }

    /**
     * Create and initialize the mode indicator element
     */
    initializeModeIndicator() {
      this.modeIndicator = document.createElement('div');
      document.body.appendChild(this.modeIndicator);
      this.updateModeIndicator();
    }

    /**
     * Find and store reference to cursor caret
     */
    initializeCursorCaret() {
      this.cursorCaret = document.querySelector('.kix-cursor-caret');
      this.updateCursorStyle();
    }

    /**
     * Updates the mode indicator based on current mode and theme preference
     */
    updateModeIndicator() {
      if (!this.state.enabled) {
        this.modeIndicator.style.display = "none";
        return;
      }

      this.modeIndicator.style.display = "flex";

      if (this.state.modeIndicatorStyle === "vim") {
        this.applyVimStyleIndicator();
      } else {
        this.applyDefaultStyleIndicator();
      }
    }

    /**
     * Apply vim-style full-width indicator at bottom
     */
    applyVimStyleIndicator() {
      Object.assign(this.modeIndicator.style, {
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
      let modeText = this.modeIndicator.querySelector('.mode-text');
      let commandText = this.modeIndicator.querySelector('.command-text');

      if (!modeText) {
        modeText = document.createElement('div');
        modeText.className = 'mode-text';
        this.modeIndicator.appendChild(modeText);
      }

      if (!commandText) {
        commandText = document.createElement('div');
        commandText.className = 'command-text';
        this.modeIndicator.appendChild(commandText);
      }

      // Left side: display the current mode
      let displayMode = this.state.getModeDisplayString();
      if (this.state.tempNormal && this.state.mode === 'normal') {
        modeText.textContent = "-- (Insert) --";
      } else {
        modeText.textContent = `-- ${displayMode.toUpperCase()} --`;
      }

      // Right side: display the accumulated motion command
      commandText.textContent = this.state.getCurrentBuffer();
    }

    /**
     * Apply default style indicator at bottom-right
     */
    applyDefaultStyleIndicator() {
      // Reset styles that might have been applied in Vim mode
      this.modeIndicator.style.left = '';
      this.modeIndicator.style.right = '';

      Object.assign(this.modeIndicator.style, {
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

      this.modeIndicator.innerHTML = "";

      // Set style based on mode
      if (this.state.mode === 'normal') {
        this.modeIndicator.textContent = this.state.mode.toUpperCase();
        this.modeIndicator.style.backgroundColor = '#1a73e8';
        this.modeIndicator.style.color = 'white';
      } else if (this.state.mode === 'insert') {
        this.modeIndicator.textContent = this.state.mode.toUpperCase();
        this.modeIndicator.style.backgroundColor = '#34a853';
        this.modeIndicator.style.color = 'white';
      } else if (this.state.mode === 'visual') {
        this.modeIndicator.textContent = this.state.mode.toUpperCase();
        this.modeIndicator.style.backgroundColor = '#fbbc04';
        this.modeIndicator.style.color = 'black';
      } else if (this.state.mode === 'visualLine') {
        this.modeIndicator.textContent = 'VISUAL LINE';
        this.modeIndicator.style.backgroundColor = '#fbbc04';
        this.modeIndicator.style.color = 'black';
      }

      // Additional theme overrides
      if (this.state.modeIndicatorStyle === "dark") {
        this.modeIndicator.style.backgroundColor = "#222";
        this.modeIndicator.style.color = "#ddd";
      } else if (this.state.modeIndicatorStyle === "light") {
        this.modeIndicator.style.backgroundColor = "#f8f9fa";
        this.modeIndicator.style.color = "#000";
      }
    }

    /**
     * Update cursor style based on current mode
     */
    updateCursorStyle() {
      if (!this.cursorCaret) return;

      if (this.state.mode === 'insert') {
        this.cursorCaret.style.borderWidth = '2px';
      } else {
        try {
          if (this.cursorCaret.style && this.cursorCaret.style.height) {
            const height = parseFloat(this.cursorCaret.style.height.slice(0, -2));
            if (!isNaN(height)) {
              const width = 0.416 * height;
              this.cursorCaret.style.borderWidth = width + 'px';
            }
          }
        } catch (error) {
          this.state.print("Error updating cursor style:", error);
        }
      }
    }

    /**
     * Find menu item by its icon class or text content
     */
    findMenuItemElement(item) {
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
     * Click a menu item using class-based selectors
     */
    clickMenu(item) {
      const element = this.findMenuItemElement(item);
      if (element) {
        simulateClick(element);
      } else {
        console.warn(`Menu item with icon class ${item.iconClass} not found`);
        // Try to use keyboard shortcuts as last resort
        if (item === MENU_ITEMS.cut) {
          document.execCommand('cut');
        } else if (item === MENU_ITEMS.copy) {
          document.execCommand('copy');
        } else if (item === MENU_ITEMS.paste) {
          document.execCommand('paste');
        }
      }
    }
  }

  /**
   * Parses motion commands and validates input
   */
  class MotionParser {
    constructor(commandRegistry = null) {
      this.commandRegistry = commandRegistry;
    }
    
    /**
     * Initialize parser with data from command registry
     */
    updateFromRegistry() {
      // No-op - parser now works entirely from JSON registry queries
    }

    /**
     * Check if key is part of an operator sequence - now JSON-driven
     */
    isOperatorContext(key, buffer) {
      if (!this.commandRegistry || buffer.length === 0) return false;
      
      // Check if buffer + key combination exists in registry
      const combinedKey = buffer + key;
      return this.commandRegistry.getKeyBinding('normal', combinedKey) !== null;
    }

    /**
     * Check if key is a mode switch that conflicts with operators - now JSON-driven
     */
    isModeConflict(key, buffer) {
      if (!this.commandRegistry || buffer.length === 0) return false;
      
      // Check if this would be a valid operator context but conflicts with mode switching
      const combinedKey = buffer + key;
      const hasValidCombination = this.commandRegistry.getKeyBinding('normal', combinedKey) !== null;
      const isModeSwitch = this.commandRegistry.getKeyBinding('normal', key) !== null;
      
      return hasValidCombination && isModeSwitch;
    }

    /**
     * Parses a buffer of keystrokes in normal mode to identify valid commands
     */
    parseNormalMotion(buffer) {
      // Check if buffer matches any complete command from registry
      if (this.commandRegistry) {
        // First check if it's a direct command key
        const binding = this.commandRegistry.getKeyBinding('normal', buffer);
        if (binding) {
          return { command: binding.commandName };
        }
        
        // Check for commands with count prefixes
        const countMatch = buffer.match(/^(\d+)(.+)$/);
        if (countMatch) {
          const count = parseInt(countMatch[1], 10);
          const keyPart = countMatch[2];
          const keyBinding = this.commandRegistry.getKeyBinding('normal', keyPart);
          if (keyBinding) {
            return { command: keyBinding.commandName, count };
          }
        }
      }

      // Parse using JSON-driven operator-motion combinations
      return this.parseOperatorMotion(buffer);
    }
    
    /**
     * Parse operator-motion combinations dynamically from JSON
     */
    parseOperatorMotion(buffer) {
      if (!this.commandRegistry) return null;
      
      let i = 0;
      let count = 1;
      let operator = null;
      let motion = "";
      
      // Parse optional count prefix
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
      
      // Try to find any operator-motion combination that matches
      const remainingBuffer = buffer.slice(i);
      
      // Look for operator + motion combinations in JSON
      for (let j = 1; j <= remainingBuffer.length; j++) {
        const potentialCommand = remainingBuffer.slice(0, j);
        const binding = this.commandRegistry.getKeyBinding('normal', potentialCommand);
        if (binding) {
          // Found a complete command
          return { command: binding.commandName, count };
        }
      }
      
      // Simple fallback - if we got here, assume it might be a valid prefix
      return null;
    }

    /**
     * Checks if a buffer represents a valid prefix for a normal mode command
     */
    isValidMotionPrefix(buffer) {
      if (!this.commandRegistry) return false;
      
      // Check if buffer is a valid prefix for any command
      // First check direct matches
      if (this.commandRegistry.getKeyBinding('normal', buffer)) {
        return true;
      }
      
      // Check if buffer could be a count + command prefix
      const countMatch = buffer.match(/^(\d+)(.*)$/);
      if (countMatch) {
        const keyPart = countMatch[2];
        if (keyPart === '') return true; // Just a number, could be building a count
        if (this.commandRegistry.getKeyBinding('normal', keyPart)) return true;
      }

      // Check for operator-motion combinations
      return this.isValidOperatorMotionPrefix(buffer);
    }
    
    /**
     * Check if buffer is a valid operator-motion prefix
     */
    isValidOperatorMotionPrefix(buffer) {
      let i = 0;
      
      // Parse optional count prefix
      if (buffer.length > 0 && buffer[0] !== '0' && isDigit(buffer[0])) {
        while (i < buffer.length && isDigit(buffer[i])) {
          i++;
        }
      }
      
      // Check for operator using JSON registry
      if (i < buffer.length) {
        const potentialOperator = buffer[i];
        // Check if this character starts any compound commands (operator+motion patterns)
        const startsCompoundCommand = this.commandRegistry.config.commands && 
          Object.keys(this.commandRegistry.config.commands).some(cmd => 
            cmd.length >= 2 && cmd[0] === potentialOperator
          );
        
        if (startsCompoundCommand) {
          i++;
          
          // Parse optional count after operator
          if (i < buffer.length && isDigit(buffer[i])) {
            while (i < buffer.length && isDigit(buffer[i])) {
              i++;
            }
          }
        }
      }
      
      // Check remaining part as command prefix using JSON registry
      if (i < buffer.length) {
        const remainingPart = buffer.slice(i);
        // Check if any command in the registry starts with this prefix
        if (this.commandRegistry.config.commands) {
          for (const commandName in this.commandRegistry.config.commands) {
            if (commandName.startsWith(remainingPart)) {
              return true;
            }
          }
        }
        // Also check core commands
        if (this.commandRegistry.config.coreCommands) {
          for (const mode in this.commandRegistry.config.coreCommands) {
            for (const key in this.commandRegistry.config.coreCommands[mode]) {
              if (key.startsWith(remainingPart)) {
                return true;
              }
            }
          }
        }
        return false;
      }
      
      return i > 0; // Valid if we parsed something
    }

    /**
     * Parses a buffer of keystrokes in visual mode to identify valid commands
     */
    parseVisualMotion(buffer) {
      if (!this.commandRegistry) return null;
      
      // Check if buffer matches any complete command from registry
      const binding = this.commandRegistry.getKeyBinding('visual', buffer) || 
                     this.commandRegistry.getKeyBinding('visualLine', buffer);
      if (binding) {
        return { command: binding.commandName };
      }
      
      // Check for commands with count prefixes
      const countMatch = buffer.match(/^(\d+)(.+)$/);
      if (countMatch) {
        const count = parseInt(countMatch[1], 10);
        const keyPart = countMatch[2];
        const keyBinding = this.commandRegistry.getKeyBinding('visual', keyPart) ||
                          this.commandRegistry.getKeyBinding('visualLine', keyPart);
        if (keyBinding) {
          return { command: keyBinding.commandName, count };
        }
      }
      
      // Parse operator-motion combinations for visual mode
      return this.parseOperatorMotion(buffer);
    }

    /**
     * Checks if a buffer represents a valid prefix for a visual mode command
     */
    isValidVisualMotionPrefix(buffer) {
      if (!this.commandRegistry) return false;
      
      // Check direct command matches
      if (this.commandRegistry.getKeyBinding('visual', buffer) ||
          this.commandRegistry.getKeyBinding('visualLine', buffer)) {
        return true;
      }
      
      // Check count + command prefix
      const countMatch = buffer.match(/^(\d+)(.*)$/);
      if (countMatch) {
        const keyPart = countMatch[2];
        if (keyPart === '') return true;
        if (this.commandRegistry.getKeyBinding('visual', keyPart) ||
            this.commandRegistry.getKeyBinding('visualLine', keyPart)) {
          return true;
        }
      }
      
      // Check operator-motion combinations
      return this.isValidOperatorMotionPrefix(buffer);
    }
  }

  /**
   * Executes parsed motions and operations
   */
  class MotionExecutor {
    constructor(state, ui, commandRegistry = null) {
      this.state = state;
      this.ui = ui;
      this.commandRegistry = commandRegistry;
    }

    /**
     * Sends a key event to the page directly using DOM keyboard events
     */
    sendKeyEvent(key, mods = { shift: false, control: false, alt: false, meta: false }) {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      let keyCode = KEY_CODES[key];

      let finalMods = { ...mods };

      // Make sure alt is defined in finalMods
      if (finalMods.alt === undefined) {
        finalMods.alt = false;
      }

      if (isMac) {
        if (key === "home") {
          if (finalMods.control) {
            keyCode = KEY_CODES.up;
            finalMods.meta = true;
            finalMods.control = false;
          } else {
            keyCode = KEY_CODES.left;
            finalMods.meta = true;
          }
        } else if (key === "end") {
          if (finalMods.control) {
            keyCode = KEY_CODES.down;
            finalMods.meta = true;
            finalMods.control = false;
          } else {
            keyCode = KEY_CODES.right;
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

    // Basic cursor movement functions with optional shift key for selection
    moveLeft(shift = false) {
      this.sendKeyEvent("left", { shift });
    }

    moveRight(shift = false) {
      this.sendKeyEvent("right", { shift });
    }

    moveUp(shift = false) {
      // this works the same as moveDown, but inverse (see below)
      if (this.state.mode === 'visualLine' && shift) {
        if (this.state.visualLineDisplacement === 0) {
          this.sendKeyEvent("end");
          this.sendKeyEvent("up", { shift: true });
          this.sendKeyEvent("home", { shift: true });
        } else {
          this.sendKeyEvent("up", { shift: true });
          if (this.state.visualLineDisplacement === 1) {
            // When returning to the original line from the line below, the selection
            // needs to be explicitly extended to the end of the line. Otherwise,
            // the selection would only be as long as the line below it.
            this.sendKeyEvent("end", { shift: true });
          }
        }
        this.state.visualLineDisplacement--;
      } else {
        this.sendKeyEvent("up", { shift });
      }
    }

    moveDown(shift = false) {
      if (this.state.mode === 'visualLine' && shift) {
        // check if you are currently on the original line that visual mode started on
        if (this.state.visualLineDisplacement === 0) {
          // go to beginning of current line, go down, and then go to end of line
          // this selects both lines completely
          this.sendKeyEvent("home");
          this.sendKeyEvent("down", { shift: true });
          this.sendKeyEvent("end", { shift: true });
        } else {
          // after this inital "anchoring", you can simply move down like normal
          this.sendKeyEvent("down", { shift: true });
        }
        this.state.visualLineDisplacement++;
      } else {
        // otherwise just act as normal
        this.sendKeyEvent("down", { shift });
      }
    }

    moveWordForward(shift = false) {
      this.sendKeyEvent("right", { control: true, shift });
    }

    moveWordBackward(shift = false) {
      this.sendKeyEvent("left", { control: true, shift });
    }

    goToTop(shift = false) {
      this.sendKeyEvent("home", { control: true, shift });
    }

    goToBottom(shift = false) {
      this.sendKeyEvent("end", { control: true, shift });
    }

    goToEndOfWord(shift = false) {
      this.sendKeyEvent("right", { control: true, shift });
    }

    goToStartOfLine(shift = false) {
      this.sendKeyEvent("home", { shift });
    }

    goToEndOfLine(shift = false) {
      this.sendKeyEvent("end", { shift });
    }

    goToBackwardEndOfWord(shift = false) {
      this.sendKeyEvent("left", { control: true, shift });
      this.sendKeyEvent("left", { shift });
    }

    goToPrevPara(shift = false) {
      this.sendKeyEvent("up", { control: true, shift });
    }

    goToNextPara(shift = false) {
      this.sendKeyEvent("down", { control: true, shift });
    }

    /**
     * Selects the inner part of a word
     */
    selectInnerWord(count = 1) {
      this.moveRight(false);
      this.moveWordBackward(false);
      // For count > 1, select multiple words
      for (let i = 0; i < count; i++) {
        this.moveWordForward(true);
      }
    }

    /**
     * Selects a word including surrounding whitespace
     */
    selectAWord(count = 1) {
      this.moveRight(false);
      this.moveWordBackward(false);
      // For count > 1, select multiple words
      for (let i = 0; i < count; i++) {
        this.moveWordForward(true);
      }
    }

    /**
     * Line operations
     */
    openNewLineBelow() {
      this.sendKeyEvent("end");
      this.sendKeyEvent("enter");
    }

    openNewLineAbove() {
      this.sendKeyEvent("home");
      this.sendKeyEvent("enter");
      this.sendKeyEvent("up");
    }

    enterVisualLineMode() {
      this.sendKeyEvent("home");
      this.sendKeyEvent("end", { shift: true });
      this.sendKeyEvent("right", { shift: true });
    }

    deleteLine() {
      this.sendKeyEvent("home");
      this.sendKeyEvent("end", { shift: true });
      this.sendKeyEvent("right", { shift: true });
      this.ui.clickMenu(MENU_ITEMS.cut);
    }

    yankLine() {
      this.sendKeyEvent("home");
      this.sendKeyEvent("end", { shift: true });
      this.sendKeyEvent("right", { shift: true });
      this.ui.clickMenu(MENU_ITEMS.copy);
      // Unselect the text
      this.sendKeyEvent("right");
      this.sendKeyEvent("left");
    }

    selectLines(count) {
      // Start selection from the beginning of the current line
      this.sendKeyEvent("home");
      // Select to the end of the current line
      this.sendKeyEvent("end", { shift: true });
      // For multiple lines, keep selecting additional lines
      for (let i = 1; i < count; i++) {
        // Select to the end of the next line
        this.sendKeyEvent("down", { shift: true });
        this.sendKeyEvent("end", { shift: true });
      }
      // Include the line break at the end
      this.sendKeyEvent("right", { shift: true });
    }

    /**
     * Executes movement based on parsed motion command
     */
    doMoveMotion(parsed, shift = false) {
      const count = parsed.count || 1;
      
      // Handle motions using command registry for consistency
      // This allows all motions to be customized via JSON
      if (this.commandRegistry) {
        // Find command by looking up which command has this key bound to it
        const binding = this.commandRegistry.getKeyBinding('normal', parsed.motion);
        if (binding) {
          for (let i = 0; i < count; i++) {
            this.commandRegistry.executeCommand(binding.commandName, { shift, count: 1 });
          }
          return;
        }
      }
      
      // Fallback for any motions not in JSON (should be minimal)
      this.state.print("Motion not found in command registry:", parsed.motion);

    }

    /**
     * Executes commands with operators (d, y, c) in normal mode
     */
    doOperatorMotion(operator, parsed) {
      // Handle operator+motion combinations using command registry
      if (this.commandRegistry) {
        const commandName = operator + parsed.motion;
        
        // Try to execute the compound command (e.g., "diw", "daw", "ciw")
        if (this.commandRegistry.commands.has(commandName)) {
          this.commandRegistry.executeCommand(commandName, { count: parsed.count || 1 });
          return;
        }
      }

      // Fallback: execute motion with shift for selection, then apply operator through JSON system
      this.doMoveMotion(parsed, true);
      
      // Try to find the operator command in the registry for proper handling
      const operatorCommand = this.commandRegistry && this.commandRegistry.commands.get(operator);
      if (operatorCommand) {
        this.commandRegistry.executeCommand(operator, { count: 1 });
      } else {
        console.warn(`Operator ${operator} not found in command registry`);
      }
    }
  }

  /**
   * Command registry and key binding system for customizable Vim motions
   */
  class CommandRegistry {
    constructor(state, ui, executor) {
      this.commands = new Map();
      this.keyBindings = new Map();
      this.modeHandlers = new Map();
      this.lastCommand = null;
      this.state = state;
      this.ui = ui;
      this.executor = executor;
      this.config = null;
    }

    registerCommand(name, handler, options = {}) {
      this.commands.set(name, { handler, options });
    }

    /**
     * Load command configuration from JSON
     */
    async loadConfig(configUrl) {
      try {
        const response = await fetch(configUrl);
        this.config = await response.json();
        this.setupCoreCommands();
        this.setupConfigurableCommands();
        this.setupConfigurableKeyBindings();
      } catch (error) {
        console.error('Failed to load command configuration:', error);
        // Fall back to hardcoded commands if JSON loading fails
        this.setupFallbackCommands();
      }
    }

    /**
     * Setup core commands that require special handling
     */
    setupCoreCommands() {
      // Visual mode entry (special handling for visualLineDisplacement)
      this.registerCommand('visualMode', () => {
        this.executor.sendKeyEvent("right", { shift: true });
        this.state.switchMode('visual');
        this.updateUI();
      }, { repeatable: false });

      this.registerCommand('visualLineMode', () => {
        this.executor.enterVisualLineMode();
        this.state.switchMode('visualLine');
        this.updateUI();
      }, { repeatable: false });

      // Repeat system
      this.registerCommand('repeatLastMotion', () => {
        this.repeatLastCommand();
      }, { repeatable: false });

      // Mode transitions with special state handling
      this.registerCommand('exitVisualMode', () => {
        this.executor.sendKeyEvent("left");
        this.executor.sendKeyEvent("right");
        this.state.switchMode('normal');
        this.state.resetVisualBuffer();
        this.updateUI();
      }, { repeatable: false });

      this.registerCommand('exitInsertMode', () => {
        this.executor.sendKeyEvent("left");
        this.state.switchMode('normal');
        this.updateUI();
      }, { repeatable: false });

      this.registerCommand('tempNormalMode', () => {
        this.state.tempNormal = true;
        this.state.switchMode('normal');
        this.updateUI();
      }, { repeatable: false });

      // Core motions that require special handling for visualLineDisplacement
      this.registerCommand('moveUp', (ctx) => {
        const count = ctx.count || 1;
        const shift = ctx.shift || false;
        for (let i = 0; i < count; i++) {
          this.executor.moveUp(shift);
        }
      }, { repeatable: true });

      this.registerCommand('moveDown', (ctx) => {
        const count = ctx.count || 1;
        const shift = ctx.shift || false;
        for (let i = 0; i < count; i++) {
          this.executor.moveDown(shift);
        }
      }, { repeatable: true });

      // Substitute command requires special handling (selection + mode switch)
      this.registerCommand('substituteChar', (ctx) => {
        const count = ctx.count || 1;
        for (let i = 0; i < count; i++) {
          this.executor.sendKeyEvent("right", { shift: true });
        }
        this.ui.clickMenu(MENU_ITEMS.cut);
        this.state.switchMode('insert');
        this.updateUI();
      }, { repeatable: true });
    }

    /**
     * Setup configurable commands from JSON
     */
    setupConfigurableCommands() {
      if (!this.config || !this.config.commands) return;

      for (const [commandName, commandConfig] of Object.entries(this.config.commands)) {
        if (commandConfig.comment) continue; // Skip comment entries
        
        const handler = this.createCommandHandler(commandConfig);
        this.registerCommand(commandName, handler, {
          repeatable: commandConfig.repeatable !== false, // Default to true unless explicitly false
          supportsCount: commandConfig.supportsCount || false
        });
      }
    }

    /**
     * Create a command handler from JSON configuration
     */
    createCommandHandler(commandConfig) {
      return (ctx) => {
        const count = (commandConfig.supportsCount && ctx && ctx.count) ? ctx.count : 1;
        
        // Store the original context for repeat functionality
        const originalContext = ctx ? JSON.parse(JSON.stringify(ctx)) : {};
        
        for (let i = 0; i < count; i++) {
          for (const action of commandConfig.actions) {
            this.executeAction(action);
          }
        }
        
        // Return the context for repeat tracking
        return originalContext;
      };
    }

    /**
     * Execute a single action from JSON configuration
     */
    executeAction(action) {
      const { motion, args = {} } = action;
      
      // Core action handlers - these require special handling and remain hardcoded
      const coreActions = {
        'sendKeyEvent': () => this.executor.sendKeyEvent(args.key, args),
        'clickMenu': () => this.ui.clickMenu(MENU_ITEMS[args.item]),
        'resetBuffer': () => this.state.resetNormalBuffer(),
        'switchMode': () => this.state.switchMode(args.mode),
        'updateUI': () => this.updateUI(),
        'resetVisualBuffer': () => this.state.resetVisualBuffer(),
        'moveLeft': () => this.executor.moveLeft(args.shift || false),
        'moveRight': () => this.executor.moveRight(args.shift || false),
        'moveWordForward': () => this.executor.moveWordForward(args.shift || false),
        'moveWordBackward': () => this.executor.moveWordBackward(args.shift || false),
        'goToStartOfLine': () => this.executor.goToStartOfLine(args.shift || false),
        'goToEndOfLine': () => this.executor.goToEndOfLine(args.shift || false),
        'goToTop': () => this.executor.goToTop(args.shift || false),
        'goToBottom': () => this.executor.goToBottom(args.shift || false),
        'openNewLineBelow': () => this.executor.openNewLineBelow(),
        'openNewLineAbove': () => this.executor.openNewLineAbove()
      };
      
      if (coreActions[motion]) {
        coreActions[motion]();
      } else {
          console.warn(`Unknown action motion: ${motion}`);
      }
    }

    /**
     * Setup key bindings from JSON configuration
     */
    setupConfigurableKeyBindings() {
      if (!this.config) return;

      // Bind core commands
      if (this.config.coreCommands) {
        for (const [mode, bindings] of Object.entries(this.config.coreCommands)) {
          if (bindings.comment) continue;
          for (const [key, commandName] of Object.entries(bindings)) {
            this.registerKeyBinding(mode, key, commandName);
          }
        }
      }

      // Bind configurable commands
      if (this.config.commands) {
        for (const [commandName, commandConfig] of Object.entries(this.config.commands)) {
          if (commandConfig.comment) continue;
          
          const modes = commandConfig.modes || ['normal'];
          const keys = [commandConfig.key];
          if (commandConfig.alternateKeys) {
            keys.push(...commandConfig.alternateKeys);
          }
          
          for (const mode of modes) {
            for (const key of keys) {
              this.registerKeyBinding(mode, key, commandName);
            }
          }
        }
      }
    }

    /**
     * Fallback to hardcoded commands if JSON loading fails
     */
    setupFallbackCommands() {
      // Keep the essential core commands
      this.setupCoreCommands();
      
      // Add minimal essential commands
      this.registerCommand('paste', (ctx) => {
        const count = ctx.count || 1;
        this.executor.sendKeyEvent("right");
        for (let i = 0; i < count; i++) {
          this.ui.clickMenu(MENU_ITEMS.paste);
        }
        this.state.resetNormalBuffer();
      }, { repeatable: true });
      
      // Register basic key bindings
      this.registerKeyBinding('normal', 'p', 'paste');
      this.registerKeyBinding('normal', '.', 'repeatLastMotion');
      this.registerKeyBinding('visual', 'Escape', 'exitVisualMode');
      this.registerKeyBinding('insert', 'Escape', 'exitInsertMode');
    }

    /**
     * Helper method to update UI
     */
    updateUI() {
      this.ui.updateModeIndicator();
      this.ui.updateCursorStyle();
    }

    registerKeyBinding(mode, key, commandName, options = {}) {
      if (!this.keyBindings.has(mode)) {
        this.keyBindings.set(mode, new Map());
      }
      this.keyBindings.get(mode).set(key, { commandName, options });
    }

    registerModeHandler(mode, handler) {
      this.modeHandlers.set(mode, handler);
    }

    executeCommand(commandName, context, trackForRepeat = true) {
      const command = this.commands.get(commandName);
      if (command) {
        // Track command for repeat if it's repeatable
        if (trackForRepeat && command.options.repeatable !== false) {
          this.lastCommand = {
            name: commandName,
            context: JSON.parse(JSON.stringify(context || {}))
          };
        }
        const result = command.handler(context);
        return result;
      }
      console.warn(`Command '${commandName}' not found`);
      return false;
    }

    repeatLastCommand() {
      if (!this.lastCommand) {
        return false;
      }
      return this.executeCommand(this.lastCommand.name, this.lastCommand.context, false);
    }

    getKeyBinding(mode, key) {
      const modeBindings = this.keyBindings.get(mode);
      return modeBindings ? modeBindings.get(key) : null;
    }

    getModeHandler(mode) {
      return this.modeHandlers.get(mode);
    }
  }

  /**
   * Handles keyboard events and dispatches to appropriate handlers
   */
  class VimEventHandler {
    constructor(state, ui, parser, executor) {
      this.state = state;
      this.ui = ui;
      this.parser = parser;
      this.executor = executor;
      this.registry = new CommandRegistry(state, ui, executor);
      
      // Connect executor and parser to registry
      this.executor.commandRegistry = this.registry;
      this.parser.commandRegistry = this.registry;

      this.setupModeHandlers();
      this.bindEvents();
      
      // Load JSON configuration
      this.loadConfiguration();
    }

    /**
     * Load command configuration from JSON file
     */
    async loadConfiguration() {
      const configUrl = API.runtime.getURL('default-commands.json');
      await this.registry.loadConfig(configUrl);
      
      // Update parser with loaded configuration
      this.parser.updateFromRegistry();
    }

    /**
     * Bind keyboard event listeners
     */
    bindEvents() {
      this.attachKeyListener();

      // Retry attaching the event listener every 500ms for up to 5 seconds (10 attempts)
      let retryCount = 0;
      const maxRetries = 10;
      const retryInterval = 500;
      const retryAttach = () => {
        const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
        if (editorIframe && !editorIframe._vimListenerAttached) {
          this.attachKeyListener();
          editorIframe._vimListenerAttached = true;
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(retryAttach, retryInterval);
        }
      };
      retryAttach();

      // Add a mutation observer to detect when the iframe is added to the DOM
      const docObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            for (const node of mutation.addedNodes) {
              if (node.tagName === 'IFRAME' || node.querySelector && node.querySelector('iframe')) {
                this.state.print("Iframe detected via mutation observer, attaching event listener");
                setTimeout(() => this.attachKeyListener(), 100);
              }
            }
          }
        }
      });

      docObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    /**
     * Helper to attach the event listener with Firefox compatibility
     */
    attachKeyListener() {
      // Primary approach - try to find the specific Google Docs editor iframe
      const editorIframe = document.querySelector('.docs-texteventtarget-iframe');
      if (editorIframe && editorIframe.contentDocument) {
        editorIframe.contentDocument.addEventListener('keydown', (e) => this.eventHandler(e), true);
        this.state.print("Event listener attached to the editor iframe document.");
        return true;
      }

      // Secondary approach - try any iframe
      const iframe = document.getElementsByTagName('iframe')[0];
      if (iframe && iframe.contentDocument) {
        iframe.contentDocument.addEventListener('keydown', (e) => this.eventHandler(e), true);
        this.state.print("Event listener attached to the iframe's document.");
        return true;
      }

      // Fallback - attach to main document
      document.addEventListener('keydown', (e) => this.eventHandler(e), true);
      this.state.print("Event listener attached to the main document.");
      return true;
    }

    /**
     * Main event handler that dispatches events to mode-specific handlers
     */
    eventHandler(e) {
      // If disabled, ignore all key events
      if (!this.state.enabled) return;
      if (!e.isTrusted) return;

      this.state.print(`Key event captured: ${e.key} (mode: ${this.state.mode})`);

      // Use the registry's mode handlers for cleaner dispatch
      const modeHandler = this.registry.getModeHandler(this.state.mode);
      if (modeHandler) {
        modeHandler(e);
      } else {
        console.warn(`No handler found for mode: ${this.state.mode}`);
      }

      if (this.state.modeIndicatorStyle === "vim") {
        this.ui.updateModeIndicator();
      }
    }

    /**
     * Handles arrow key events with optional shift key for selection
     */
    handleArrowKeys(e, alwaysShift = false) {
      const shift = alwaysShift ? true : e.shiftKey;

      if (e.key === "ArrowLeft") {
        if (e.ctrlKey) {
          this.executor.moveWordBackward(shift);
        } else {
          this.executor.moveLeft(shift);
        }
        return true;
      }

      if (e.key === "ArrowRight") {
        if (e.ctrlKey) {
          this.executor.moveWordForward(shift);
        } else {
          this.executor.moveRight(shift);
        }
        return true;
      }

      if (e.key === "ArrowUp") {
        if (e.ctrlKey) {
          this.executor.goToPrevPara(shift);
        } else {
          this.executor.moveUp(shift);
        }
        return true;
      }

      if (e.key === "ArrowDown") {
        if (e.ctrlKey) {
          this.executor.goToNextPara(shift);
        } else {
          this.executor.moveDown(shift);
        }
        return true;
      }

      return false;
    }

    /**
     * Unified processing of motion buffers with error handling
     */
    processMotionBuffer(buffer, parseFn, isValidFn, handleFn, resetFn, modeLabel, tempNormalCallback) {
      const result = parseFn.call(this.parser, buffer);

      if (result) {
        if (!result.error) {
          // Store the last successful motion for '.' command
          if (modeLabel === 'Normal') {
            this.state.setLastCompletedMotion({
              type: 'normal',
              originalBuffer: buffer,
              result: JSON.parse(JSON.stringify(result))
            });
          } else if (modeLabel === 'Visual') {
            this.state.setLastCompletedMotion({
              type: 'visual',
              originalBuffer: buffer,
              result: JSON.parse(JSON.stringify(result))
            });
          }

          handleFn.call(this, result);
          resetFn();
          if (tempNormalCallback && this.state.tempNormal) {
            tempNormalCallback();
          }
        } else {
          this.state.print(`${modeLabel} motion parsing error:`, result.error);
          resetFn();
          if (tempNormalCallback && this.state.tempNormal) {
            tempNormalCallback();
          }
        }
      } else if (!isValidFn.call(this.parser, buffer)) {
        resetFn();
      }
    }



    /**
     * Setup mode-specific handlers
     */
    setupModeHandlers() {
      this.registry.registerModeHandler('normal', this.handleNormalMode.bind(this));
      this.registry.registerModeHandler('visual', this.handleVisualMode.bind(this));
      this.registry.registerModeHandler('visualLine', this.handleVisualMode.bind(this));
      this.registry.registerModeHandler('insert', this.handleInsertMode.bind(this));
    }


    /**
     * Get key string including modifiers
     */
    getKeyString(e) {
      const parts = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey && e.key.length > 1) parts.push('shift'); // Only for special keys
      parts.push(e.key);
      return parts.join('+');
    }

    /**
     * Extract count from buffer for numbered commands
     */
    getCountFromBuffer(buffer) {
      const numberMatch = buffer.match(/^(\d+)$/);
      return numberMatch ? parseInt(numberMatch[1], 10) : 1;
    }

    /**
     * Check if key should be handled as a simple command
     */
    isSimpleCommand(key, buffer) {
      const numberCmdMatch = buffer.match(/^(\d+)$/);
      return buffer === '' || numberCmdMatch;
    }

    /**
     * Check if key is part of an operator sequence - now JSON-driven
     */
    isOperatorContext(key, buffer) {
      if (!this.registry || buffer.length === 0) return false;
      
      // Check if buffer + key combination exists in registry
      const combinedKey = buffer + key;
      return this.registry.getKeyBinding('normal', combinedKey) !== null;
    }

    /**
     * Check if key is a mode switch that conflicts with operators - now JSON-driven
     */
    isModeConflict(key, buffer) {
      if (!this.registry || buffer.length === 0) return false;
      
      // Check if this would be a valid operator context but conflicts with mode switching
      const combinedKey = buffer + key;
      const hasValidCombination = this.registry.getKeyBinding('normal', combinedKey) !== null;
      const isModeSwitch = this.registry.getKeyBinding('normal', key) !== null;
      
      return hasValidCombination && isModeSwitch;
    }

    /**
     * Handles keypresses in normal mode
     */
    handleNormalMode(e) {
      if (!this.state.enabled) return;
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;

      this.state.print("[NORMAL MODE] Key pressed:", e.key);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Handle arrow keys
      if (this.handleArrowKeys(e, false)) return;

      const keyString = this.getKeyString(e);
      const binding = this.registry.getKeyBinding('normal', keyString);
      
      // Handle direct key bindings
      if (binding) {
        // Special handling for numbered commands - check if command supports count
        if (this.isSimpleCommand(e.key, this.state.normalMotionBuffer)) {
          const count = this.getCountFromBuffer(this.state.normalMotionBuffer);
          this.registry.executeCommand(binding.commandName, { count, event: e });
          return;
        }
        
        // Handle operator conflicts
        if (this.isOperatorContext(e.key, this.state.normalMotionBuffer)) {
          this.state.addToCurrentBuffer(e.key);
          return;
        }
        
        // Handle mode switch conflicts
        if (this.isModeConflict(e.key, this.state.normalMotionBuffer)) {
          this.state.addToCurrentBuffer(e.key);
          this.ui.updateModeIndicator();
          return;
        }
        
        // Execute the command
        this.registry.executeCommand(binding.commandName, { event: e });
        return;
      }

      // Add key to buffer and process motion commands
      this.state.addToCurrentBuffer(e.key);
      this.processMotionBuffer(
        this.state.normalMotionBuffer,
        this.parser.parseNormalMotion,
        this.parser.isValidMotionPrefix,
        this.handleParsedMotion,
        () => { this.state.resetNormalBuffer(); },
        "Normal",
        () => { 
          setTimeout(() => { 
            this.state.switchMode('insert'); 
            this.state.tempNormal = false;
            this.updateUI();
          }, 0); 
        }
      );
    }

    /**
     * Handles keypresses in visual mode
     */
    handleVisualMode(e) {
      if (!this.state.enabled) return;
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;

      this.state.print("[VISUAL MODE] Key pressed:", e.key);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Handle arrow keys (with shift always on in visual mode)
      if (this.handleArrowKeys(e, true)) return;

      const keyString = this.getKeyString(e);
      const mode = this.state.mode; // visual or visualLine
      const binding = this.registry.getKeyBinding(mode, keyString);
      
      // Handle direct key bindings
      if (binding) {
        this.registry.executeCommand(binding.commandName, { event: e });
        return;
      }

      // Add key to buffer and process motion commands
      this.state.addToCurrentBuffer(e.key);
      this.processMotionBuffer(
        this.state.visualMotionBuffer,
        this.parser.parseVisualMotion,
        this.parser.isValidVisualMotionPrefix,
        this.handleVisualParsedMotion,
        () => { this.state.resetVisualBuffer(); },
        "Visual"
      );
    }

    /**
     * Handles keypresses in insert mode
     */
    handleInsertMode(e) {
      if (!this.state.enabled) return;

      this.state.print("[INSERT MODE] Key pressed:", e.key);

      const keyString = this.getKeyString(e);
      const binding = this.registry.getKeyBinding('insert', keyString);
      
      // Handle direct key bindings
      if (binding) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.registry.executeCommand(binding.commandName, { event: e });
        return;
      }

      // Let other keys pass through normally for text input
    }

    /**
     * Create a dynamic motion command for repeat functionality - now JSON-driven
     */
    createMotionCommand(parsed, isVisual = false) {
      const commandName = `motion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.registry.registerCommand(commandName, () => {
        if (parsed.command) {
          // Execute the command through registry
          this.registry.executeCommand(parsed.command, { count: parsed.count || 1 });
        } else if (parsed.operator) {
          // Use the MotionExecutor's JSON-driven operator handling
          this.executor.doOperatorMotion(parsed.operator, parsed);
        } else {
          // Use the MotionExecutor's JSON-driven motion handling
          this.executor.doMoveMotion(parsed, isVisual);
        }
        
        if (isVisual) {
          this.state.resetVisualBuffer();
        }
      }, { repeatable: true });
      
      return commandName;
    }




    /**
     * Handles parsed normal mode motions
     */
    handleParsedMotion(parsed) {
      const commandName = this.createMotionCommand(parsed, false);
      this.registry.executeCommand(commandName, { parsed });
    }

    /**
     * Handles parsed visual mode motions
     */
    handleVisualParsedMotion(parsed) {
      const commandName = this.createMotionCommand(parsed, true);
      this.registry.executeCommand(commandName, { parsed });
    }
  }

  /**
   * Main class that orchestrates all Vim functionality
   */
  class VimMotionsForChrome {
    constructor() {
      // Initialize all subsystems
      this.state = new VimState();
      this.ui = new VimUI(this.state);
      this.parser = new MotionParser();
      this.executor = new MotionExecutor(this.state, this.ui);
      this.eventHandler = new VimEventHandler(this.state, this.ui, this.parser, this.executor);


      // Inject the page script
      this.injectPageScript();

      // Listen for settings updates from popup
      this.setupMessageListener();

      this.state.print("VimMotionsForChrome initialized successfully");
    }


    /**
     * Inject the page script for additional functionality
     */
    injectPageScript() {
      const script = document.createElement("script");
      script.src = API.runtime.getURL("page_script.js");
      document.documentElement.appendChild(script);
    }

    /**
     * Set up message listener for settings updates
     */
    setupMessageListener() {
      API.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updateSettings") {
          this.state.updateSettings(message.settings);
          if (window.relativeLineNumbers && message.settings.hasOwnProperty('lineNumbersEnabled')) {
            window.relativeLineNumbers.toggle(message.settings.lineNumbersEnabled);
          }
          this.ui.updateModeIndicator();
          sendResponse({ success: true });
        }
      });
    }

    /**
     * Handles the execution of parsed commands in normal mode
     */
    handleParsedMotion(parsed) {
      if (parsed.command) {
        // Execute command through registry
        this.registry.executeCommand(parsed.command, { count: parsed.count || 1 });
        
        this.state.setLastCompletedMotion({
          type: 'command',
          command: parsed.command,
          count: parsed.count || 1
        });
      } else if (parsed.operator) {
        this.executor.doOperatorMotion(parsed.operator, parsed);
      } else {
        this.state.print(`Handling motion '${parsed.motion}', repeated ${parsed.count} time(s).`);
        
        if (parsed.motion !== 's') {
          this.state.setLastCompletedMotion({
            type: 'normal',
            originalBuffer: this.state.normalMotionBuffer,
            result: JSON.parse(JSON.stringify(parsed))
          });
        }

        this.executor.doMoveMotion(parsed, false);

        if (parsed.motion === 's') {
          this.state.setLastCompletedMotion({
            type: 'special',
            command: 's',
            count: parsed.count
          });
        }
      }
    }

    /**
     * Handles the execution of parsed commands in visual mode - now JSON-driven
     */
    handleVisualParsedMotion(parsed) {
      if (parsed.command) {
        // Execute command through registry
        this.registry.executeCommand(parsed.command, { count: parsed.count || 1 });
        
        this.state.setLastCompletedMotion({
          type: 'command',
          command: parsed.command,
          count: parsed.count || 1
        });
      } else if (parsed.operator) {
        // Use the MotionExecutor's JSON-driven operator handling
        this.executor.doOperatorMotion(parsed.operator, parsed);
        
        this.state.setLastCompletedMotion({
          type: 'visual_operator',
          operator: parsed.operator,
          motion: parsed.motion,
          count: parsed.count || 1
        });
        
        this.state.switchMode('normal');
        this.ui.updateModeIndicator();
        this.ui.updateCursorStyle();
      }
    }

  }

  const vimMotions = new VimMotionsForChrome();

})(); // End of IIFE
