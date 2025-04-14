/**
 * Helper function to create and dispatch keyboard events
 * Compatible with both Chrome and Firefox
 */
const simulateKeyEvent = function (eventType, el, keyCode, control, alt, shift, meta) {
    if (!el) {
        console.warn("No editor element found to dispatch event to");
        return;
    }

    // Firefox-specific approach
    if (typeof InstallTrigger !== 'undefined') { // Firefox detection
        try {
            // For Firefox, we need to create the event differently
            // Firefox requires DOM4 events for proper control key handling
            let event;
            
            // If it's a key that needs control key, use a more direct method
            if (control && (keyCode === 37 || keyCode === 39)) { // Left or right arrow with control
                // For Firefox, we'll try keyboard events with init dictionary
                event = new KeyboardEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    keyCode: keyCode,
                    which: keyCode,
                    key: getKeyFromCode(keyCode),
                    code: getKeyCodeMap()[keyCode] || '',
                    location: 0,
                    ctrlKey: control,
                    altKey: alt,
                    shiftKey: shift,
                    metaKey: meta,
                    repeat: false
                });
                
                // Firefox requires setting these manually in some cases
                try {
                    Object.defineProperties(event, {
                        keyCode: { value: keyCode },
                        which: { value: keyCode },
                        ctrlKey: { value: control },
                        altKey: { value: alt },
                        shiftKey: { value: shift },
                        metaKey: { value: meta }
                    });
                } catch (propError) {
                    console.warn("Couldn't set key properties:", propError);
                }
            } else {
                // Standard approach for other keys
                const options = {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    detail: 0,
                    ctrlKey: control,
                    altKey: alt,
                    shiftKey: shift,
                    metaKey: meta
                };
                
                // Create event with KeyboardEvent for better control key support
                event = new KeyboardEvent(eventType, options);
                
                // Important: We need to define properties explicitly for Firefox
                try {
                    Object.defineProperties(event, {
                        keyCode: { value: keyCode },
                        which: { value: keyCode },
                        code: { value: getKeyCodeMap()[keyCode] || '' },
                        key: { value: getKeyFromCode(keyCode) || '' }
                    });
                } catch (propError) {
                    console.warn("Couldn't set key properties:", propError);
                }
            }
            
            // Debug log the event before dispatch
            console.log(`Firefox dispatching ${eventType} event:`, {
                keyCode: event.keyCode,
                which: event.which,
                key: event.key,
                code: event.code,
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey,
                metaKey: event.metaKey
            });
            
            el.dispatchEvent(event);
            return;
        } catch (e) {
            console.warn("Firefox KeyboardEvent method failed:", e);
            
            // Fallback to createEvent for Firefox
            try {
                // Try createEvent with explicit keyCode handling
                const event = document.createEvent("KeyboardEvent");
                
                try {
                    // Try to use initKeyEvent if available (older Firefox)
                    if (typeof event.initKeyEvent !== 'undefined') {
                        event.initKeyEvent(
                            eventType,
                            true, // bubbles
                            true, // cancelable
                            window, // view
                            control, // ctrlKey
                            alt, // altKey
                            shift, // shiftKey
                            meta, // metaKey
                            keyCode, // keyCode
                            0 // charCode
                        );
                    } else {
                        // Modern initKeyboardEvent
                        event.initKeyboardEvent(
                            eventType,
                            true, // bubbles
                            true, // cancelable
                            window, // view
                            getKeyFromCode(keyCode), // key
                            0, // location
                            control, // ctrlKey
                            alt, // altKey
                            shift, // shiftKey
                            meta // metaKey
                        );
                        
                        // Firefox requires setting these properties directly
                        Object.defineProperties(event, {
                            keyCode: { value: keyCode },
                            which: { value: keyCode }
                        });
                    }
                } catch (initError) {
                    // If all else fails, try simple event init
                    event.initEvent(eventType, true, true);
                    
                    // And set all properties manually
                    Object.defineProperties(event, {
                        keyCode: { value: keyCode },
                        which: { value: keyCode },
                        key: { value: getKeyFromCode(keyCode) },
                        code: { value: getKeyCodeMap()[keyCode] || '' },
                        ctrlKey: { value: control },
                        altKey: { value: alt },
                        shiftKey: { value: shift },
                        metaKey: { value: meta }
                    });
                }
                
                el.dispatchEvent(event);
                return;
            } catch (e2) {
                console.warn("Firefox fallback event method failed:", e2);
            }
        }
    }
    
    // Chrome and other browsers - can use the constructor approach
    try {
        const eventInit = {
            bubbles: true,
            cancelable: true,
            view: window,
            ctrlKey: control,
            altKey: alt,
            shiftKey: shift,
            metaKey: meta,
            keyCode: keyCode,
            which: keyCode
        };
        
        // Try to set the key/code based on keyCode if possible
        try {
            eventInit.key = getKeyFromCode(keyCode);
            eventInit.code = getKeyCodeMap()[keyCode] || '';
        } catch (e) {
            // Not critical if this fails
        }
        
        const event = new KeyboardEvent(eventType, eventInit);
        
        // Use a closure to store keyCode value for Chrome
        const keyCodeVal = keyCode;
        
        // For Chrome, we can safely define these properties
        try {
            Object.defineProperties(event, {
                keyCode: { get: function() { return keyCodeVal; } },
                which: { get: function() { return keyCodeVal; } }
            });
        } catch (e) {
            // Ignore if we can't set these properties
            console.log("Couldn't set keyCode properties, continuing anyway");
        }
        
        el.dispatchEvent(event);
        return;
    } catch (e) {
        console.warn("Standard event creation failed:", e);
    }
    
    // Ultimate fallback - try to use DOM level 3 events
    try {
        const event = document.createEvent("KeyboardEvent");
        event.initEvent(eventType, true, true);
        
        // Set properties directly if possible
        event.keyCode = keyCode;
        event.which = keyCode;
        event.ctrlKey = control;
        event.altKey = alt;
        event.shiftKey = shift;
        event.metaKey = meta;
        
        el.dispatchEvent(event);
    } catch (finalError) {
        console.error("Failed to dispatch keyboard event with any method:", finalError);
    }
};

/**
 * Maps keyCode values to key property strings
 */
const getKeyFromCode = function(keyCode) {
    const specialKeys = {
        8: 'Backspace',
        9: 'Tab',
        13: 'Enter',
        27: 'Escape',
        33: 'PageUp',
        34: 'PageDown',
        35: 'End',
        36: 'Home',
        37: 'ArrowLeft',
        38: 'ArrowUp',
        39: 'ArrowRight',
        40: 'ArrowDown',
        46: 'Delete'
    };
    
    if (specialKeys[keyCode]) {
        return specialKeys[keyCode];
    }
    
    // For printable characters
    if (keyCode >= 32 && keyCode <= 126) {
        return String.fromCharCode(keyCode);
    }
    
    return '';
};

/**
 * Maps keyCode values to code property strings
 */
const getKeyCodeMap = function() {
    return {
        8: 'Backspace',
        9: 'Tab',
        13: 'Enter',
        27: 'Escape',
        33: 'PageUp',
        34: 'PageDown',
        35: 'End',
        36: 'Home',
        37: 'ArrowLeft',
        38: 'ArrowUp',
        39: 'ArrowRight',
        40: 'ArrowDown',
        46: 'Delete'
    };
};

/**
 * Function to find the editor element, with better support for Firefox
 * Searches more aggressively to find the active element
 */
const findEditorElement = function() {
    // Try the standard approach first
    try {
        const iframe = document.querySelector(".docs-texteventtarget-iframe");
        if (iframe && iframe.contentDocument) {
            return iframe.contentDocument.activeElement || iframe.contentDocument.body;
        }
    } catch (e) {
        console.log("Standard iframe detection failed:", e);
    }
    
    // Try other iframe selectors
    try {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                if (iframe.contentDocument) {
                    const active = iframe.contentDocument.activeElement;
                    if (active && active.getAttribute('contenteditable') === 'true') {
                        return active;
                    }
                    
                    // Look for contenteditable elements
                    const editables = iframe.contentDocument.querySelectorAll('[contenteditable="true"]');
                    if (editables.length > 0) {
                        return editables[0];
                    }
                    
                    // Last resort - try to find the main content area
                    const possibleEditors = iframe.contentDocument.querySelectorAll('.kix-appview-editor, .docs-editor');
                    if (possibleEditors.length > 0) {
                        return possibleEditors[0];
                    }
                }
            } catch (err) {
                // Silently continue to the next iframe
            }
        }
    } catch (e) {
        console.log("Enhanced iframe detection failed:", e);
    }
    
    // Final fallback - try to find any contenteditable in the main document
    const editables = document.querySelectorAll('[contenteditable="true"]');
    if (editables.length > 0) {
        return editables[0];
    }
    
    console.log("No editor element found");
    return null;
};

// Keep trying to find the editor element
let editorEl = findEditorElement();

// Add a single listener for simpler parameter passing
window.addEventListener("message", function(event) {
    // Only listen to messages from our extension
    if (event.source !== window) return;
    if (!event.data || !event.data.action || !event.data.action.startsWith('vim-key-')) return;
    
    // Refresh the editor element reference each time to ensure we have the latest
    if (!editorEl) {
        editorEl = findEditorElement();
    }
    
    try {
        // Extract parameters from the message data
        const data = event.data;
        const keyCode = data.keyCode || 0;
        const ctrl = !!data.ctrl;
        const alt = !!data.alt;
        const shift = !!data.shift;
        const meta = !!data.meta;
        
        if (data.action === 'vim-key-down') {
            simulateKeyEvent("keydown", editorEl, keyCode, ctrl, alt, shift, meta);
        } else if (data.action === 'vim-key-up') {
            simulateKeyEvent("keyup", editorEl, keyCode, ctrl, alt, shift, meta);
        } else if (data.action === 'vim-key-press') {
            simulateKeyEvent("keypress", editorEl, keyCode, ctrl, alt, shift, meta);
        }
    } catch (e) {
        console.error("Error processing keyboard event:", e);
    }
});