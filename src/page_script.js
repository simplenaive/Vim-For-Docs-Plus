const simulateKeyEvent = function (eventType, el, args) {

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
    event.initKeyboardEvent(
        eventType,
        true,
        true,
        document.defaultView,
        "",
        false,
        args.mods?.control,
        null,
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

