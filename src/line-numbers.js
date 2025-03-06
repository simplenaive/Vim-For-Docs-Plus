(function() {
    'use strict';
    
    // Configuration for line markers
    const config = {
        updateDebounce: 10,
        zIndex: 1000,
        fontSize: '15px',
        lineColor: '#6c6c6c',
        fontWeight: 'normal',
        minTopPosition: 120,
        markerClass: 'relative-line-marker',
        caretSelector: '.kix-cursor-caret',
        titleSelector: '.docs-title-outer',
        canvasTileSelector: '.kix-canvas-tile-content',
        editorContainerSelector: '#kix-appview > div.kix-appview-editor-container > div',
        linesToDisplay: 20,
        defaultZoom: 1,
        lineHeightRatio: 0.85,
        scrollThrottle: 5,
        scrollFrameRate: 30
    };
    
    // State variables
    let lastCaretRect = null;
    let lastUpdateTime = 0;
    let isScrolling = false;
    let scrollUpdateScheduled = false;
    let scrollCounter = 0;
    let lastScrollTime = 0;
    let rafId = null;
    let enabled = false; // Start disabled until we check storage
    let initialized = false;
    let eventListenersAdded = false;
    let observers = [];
    
    // Pool for reusing marker elements
    const markersPool = [];
    
    // Create styles for the markers
    function createStyles() {
        // Only create styles once
        if (document.getElementById('relative-line-numbers-style')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'relative-line-numbers-style';
        styleEl.textContent = `
            .${config.markerClass} {
                position: absolute;
                color: ${config.lineColor};
                font-family: monospace;
                font-weight: ${config.fontWeight};
                z-index: ${config.zIndex};
                font-size: ${config.fontSize};
                pointer-events: none;
                text-align: right;
                width: 30px;
                opacity: 0.8;
                user-select: none;
                will-change: transform;
                transition: top 50ms linear;
            }
        `;
        document.head.appendChild(styleEl);
    }
    
    // Remove all existing markers
    function clearMarkers() {
        const markers = document.querySelectorAll(`.${config.markerClass}`);
        markers.forEach(marker => {
            marker.remove();
            if (markersPool.length < 100) {
                markersPool.push(marker);
            }
        });
    }
    
    // Get current zoom level
    function getZoomLevel() {
        const titleElement = document.querySelector(config.titleSelector);
        return titleElement && titleElement.style.zoom 
               ? parseFloat(titleElement.style.zoom) 
               : config.defaultZoom;
    }
    
    // Create a single marker element
    function createMarker(left, top, text) {
        if (top < config.minTopPosition) return null;
        
        let marker = markersPool.pop();
        if (!marker) {
            marker = document.createElement('div');
            marker.className = config.markerClass;
        } else {
            marker.className = config.markerClass;
        }
        
        marker.textContent = text;
        marker.style.left = `${left}px`;
        marker.style.top = `${top}px`;
        return marker;
    }
    
    // Add markers to the document
    function addMarkers(markers) {
        if (!enabled) return; // Extra check before adding markers
        
        const fragment = document.createDocumentFragment();
        markers.forEach(marker => {
            if (marker) fragment.appendChild(marker);
        });
        document.body.appendChild(fragment);
    }
    
    // Update relative line number markers
    function updateLineMarkers(isScrollUpdate = false) {
        // Don't update if disabled
        if (!enabled) {
            clearMarkers(); // Make sure no markers are visible
            return;
        }
        
        try {
            const now = Date.now();
            
            // Debouncing for non-scroll updates
            if (!isScrollUpdate && now - lastUpdateTime < config.updateDebounce) return;
            
            // For scroll updates, use frame rate limiter
            if (isScrollUpdate && now - lastUpdateTime < (1000 / config.scrollFrameRate)) return;
            
            // Find caret element
            const caret = document.querySelector(config.caretSelector);
            if (!caret) return;
            
            const caretRect = caret.getBoundingClientRect();
            
            // Skip invalid caret rectangles
            if (caretRect.width === 0 && caretRect.height === 0) return;
            
            // Check if caret position has changed
            const hasCaretMoved = !lastCaretRect || 
                Math.abs(caretRect.top - lastCaretRect.top) > 2 ||
                Math.abs(caretRect.left - lastCaretRect.left) > 50 ||
                caretRect.width !== lastCaretRect.width ||
                caretRect.height !== lastCaretRect.height;
                
            if (!hasCaretMoved && !isScrollUpdate) return;
            
            // Update state
            lastCaretRect = { ...caretRect };
            lastUpdateTime = now;
            
            // Clear existing markers
            clearMarkers();
            
            // Double-check enabled state before recreating markers
            if (!enabled) return;
            
            // Calculate line height based on caret height and zoom
            const zoomLevel = getZoomLevel();
            const lineHeight = (caretRect.height / config.lineHeightRatio) * zoomLevel;
            const markers = [];
            
            // Get caret position
            const caretTop = caretRect.top + window.scrollY;
            
            // Find position for line numbers
            let lineNumberLeft;
            const canvasTile = document.querySelector(config.canvasTileSelector);
            
            if (canvasTile) {
                const canvasRect = canvasTile.getBoundingClientRect();
                lineNumberLeft = (canvasRect.left + window.scrollX) - 50; // 50px to the left
            } else {
                lineNumberLeft = 540 - (caretRect.height * 16);
            }
            
            // Create relative line number markers
            for (let i = -config.linesToDisplay; i <= config.linesToDisplay; i++) {
                if (i === 0) continue; // Skip the current line
                
                // Calculate relative line number (absolute value)
                const relativeLineNumber = Math.abs(i);
                
                markers.push(createMarker(
                    lineNumberLeft, 
                    caretTop + (lineHeight * i), 
                    relativeLineNumber.toString()
                ));
            }
            
            // Add all markers to the document
            addMarkers(markers);
        } catch (error) {
            // Silent error handling
        }
    }
    
    // Handle scroll events with optimized animation frame scheduling
    function handleScroll() {
        if (!enabled) return;
        
        isScrolling = true;
        scrollCounter++;
        
        // Only process every Nth scroll event to avoid overwhelming the browser
        if (scrollCounter % config.scrollThrottle !== 0) return;
        
        const now = Date.now();
        if (now - lastScrollTime < (1000 / config.scrollFrameRate)) return;
        lastScrollTime = now;
        
        // Cancel any pending animation frame to avoid queuing up too many
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        
        rafId = requestAnimationFrame(() => {
            if (enabled) updateLineMarkers(true);
            rafId = null;
            
            // Schedule a final update when scrolling stops
            if (isScrolling) {
                clearTimeout(scrollUpdateScheduled);
                scrollUpdateScheduled = setTimeout(() => {
                    isScrolling = false;
                    scrollCounter = 0;
                    if (enabled) updateLineMarkers(true);
                }, 100);
            }
        });
    }
    
    // Set up mutation observer to watch for caret changes
    function observeCaretChanges() {
        const caret = document.querySelector(config.caretSelector);
        if (!caret) {
            if (enabled) {
                setTimeout(observeCaretChanges, 1000);
            }
            return null;
        }
        
        const observer = new MutationObserver(() => {
            if (enabled) {
                try {
                    updateLineMarkers();
                } catch (e) {
                    // Silent error handling
                }
            }
        });
        
        observer.observe(caret, { 
            attributes: true, 
            characterData: true, 
            subtree: true 
        });
        
        return observer;
    }
    
    // Observe editor position changes
    function observeEditorChanges() {
        const docContainer = document.querySelector('.kix-appview-editor');
        if (!docContainer) {
            if (enabled) {
                setTimeout(observeEditorChanges, 1000);
            }
            return null;
        }
        
        const observer = new MutationObserver(() => {
            if (enabled) {
                updateLineMarkers(true);
            }
        });
        
        observer.observe(docContainer, { 
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: true, 
            subtree: true
        });
        
        return observer;
    }
    
    // Add event listeners for user interaction
    function addEventListeners() {
        if (eventListenersAdded) return;
        
        document.addEventListener("keyup", () => {
            if (enabled) updateLineMarkers();
        }, { passive: true });
        
        document.addEventListener("keydown", () => {
            if (enabled) updateLineMarkers();
        }, { passive: true });
        
        document.addEventListener("mouseup", () => {
            if (enabled) updateLineMarkers();
        }, { passive: true });
        
        // Add scroll listeners
        document.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", () => {
            if (enabled) updateLineMarkers(true);
        }, { passive: true });
        
        // Add scroll listener to the editor container
        const editorContainer = document.querySelector(config.editorContainerSelector);
        if (editorContainer) {
            editorContainer.addEventListener("scroll", handleScroll, { passive: true });
        }
        
        // Also monitor more DOM elements for scroll events
        const possibleScrollContainers = document.querySelectorAll('.kix-appview-editor, .docs-scrollable');
        possibleScrollContainers.forEach(container => {
            container.addEventListener("scroll", handleScroll, { passive: true });
        });
        
        eventListenersAdded = true;
    }
    
    // Set up observers for document changes
    function setupObservers() {
        if (observers.length === 0) {
            const caretObserver = observeCaretChanges();
            const editorObserver = observeEditorChanges();
            
            if (caretObserver) observers.push(caretObserver);
            if (editorObserver) observers.push(editorObserver);
        }
    }
    
    // Clean up observers if needed
    function cleanupObservers() {
        observers.forEach(observer => observer.disconnect());
        observers = [];
    }
    
    // Toggle line numbers on/off
    function toggleLineNumbers(showLineNumbers) {
        const wasEnabled = enabled;
        enabled = showLineNumbers;
        
        // If turning off, make sure markers are cleared
        if (!enabled) {
            clearMarkers();
        }
        
        // If turning on from off
        if (enabled && !wasEnabled) {
            if (!initialized) {
                init();
            } else {
                addEventListeners();
                setupObservers();
                updateLineMarkers(true);
            }
        }
        
        return enabled;
    }
    
    // Initialize the script when needed
    function init() {
        if (initialized) return;
        
        try {
            createStyles();
            addEventListeners();
            
            if (enabled) {
                setupObservers();
                updateLineMarkers(true);
            }
            
            initialized = true;
        } catch (error) {
            // Silent error handling
        }
    }
    
    // Check storage for initial state
    function checkInitialState() {
        try {
            chrome.storage.sync.get(["lineNumbersEnabled"], (data) => {
                enabled = data.lineNumbersEnabled ?? true;
                
                if (enabled) {
                    init();
                }
                
                // Set up Chrome message listener
                try {
                    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                        if (message.action === "updateSettings" && 
                            message.settings.hasOwnProperty('lineNumbersEnabled')) {
                            // Ensure we clean existing markers before a potential page reload
                            if (!message.settings.lineNumbersEnabled) {
                                clearMarkers();
                            }
                            toggleLineNumbers(message.settings.lineNumbersEnabled);
                        }
                        return true;
                    });
                } catch (e) {
                    // Chrome API might not be available in all contexts
                }
            });
        } catch (e) {
            // If Chrome API is not available, start in enabled mode
            enabled = true;
            init();
        }
    }
    
    // Expose API to window
    window.relativeLineNumbers = {
        update: updateLineMarkers,
        toggle: toggleLineNumbers,
        clear: clearMarkers
    };
    
    // Start the initialization process
    checkInitialState();
})();