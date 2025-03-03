const simulateKeyEvent = function (eventType, el, args) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    const event = document.createEvent("KeyboardEvent");
    Object.defineProperty(event, "keyCode", {
        get() {
            return this.keyCodeVal;
        },
    });
    Object.defineProperty(event, "which", {
        get() {
            return this.keyCodeVal;
        },
    });
    
    const ctrlKey = isMac ? false : args.mods?.control;
    const altKey = isMac ? args.mods?.control : false;
    
    event.initKeyboardEvent(
        eventType,
        true,
        true,
        document.defaultView,
        "",
        false,
        ctrlKey,
        altKey,
        args.mods?.shift,
        false,
        args.keyCode,
        args.keyCode,
    );
    event.keyCodeVal = args.keyCode;
    el.dispatchEvent(event);
};

const editorEl = (() => {
    try {
        return document.querySelector(".docs-texteventtarget-iframe").contentDocument.activeElement;
    } catch (e) {
        console.log("iframe not detected");
        return null;
    }
})();

window.addEventListener("simulate-keypress-vim", function (event) {
    const args = event.detail
    simulateKeyEvent("keydown", editorEl, args);
    simulateKeyEvent("keyup", editorEl, args);
});

