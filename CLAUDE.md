# CLAUDE.md - Vim-For-Docs-Plus

## Project Overview
A browser extension (Chrome/Firefox Manifest V3) that implements Vim-like motions and commands for Google Docs. Enables power users to navigate and edit documents using familiar Vim keybindings.

## Architecture

### Core Files (in load order via manifest.json)
1. **parser.js** - Trie-based Vim command parser
   - `VimMotionParser` class: parses keystrokes into motion/operator/command objects
   - Supports registers (`"a`, `"b`), counts (`3w`), and operator-motion combos (`d2w`)
   - Mode-aware parsing (normal, visual, visualLine, insert)

2. **executor.js** - Main execution engine (~2400 lines)
   - `GDocsNavigator` class: handles cursor movement and selection in Google Docs
   - `MotionExecutor` class: executes parsed commands
   - Uses synthetic keyboard events to interact with Google Docs' contenteditable iframe
   - Mac/Windows key mapping handled in `sendKeyEvent()` (swaps ctrl/alt on Mac)

3. **ui.js** - Mode indicator UI component
   - `VimUIV2Internal` class: manages the status bar at bottom of page
   - Supports themes: 'vim' (status bar) and 'default' (floating badge)

4. **line-numbers.js** - Relative line numbers feature
   - DOM mutation observers for caret position tracking
   - Marker pooling for performance

5. **content.js** - Content script entry point
   - Attaches key listener to `.docs-texteventtarget-iframe`
   - Mode management (`normal`, `insert`, `visual`, `visualLine`)
   - Storage sync for settings

### Supporting Files
- **page_script.js** - Injected into page context for keyboard event simulation
- **browser-api.js** - Cross-browser API abstraction (Chrome/Firefox)
- **motions.json** - Configuration for all motions, operators, text objects, and commands

### UI Files (`src/ui/`)
- **index.html/popup.js** - Main popup with enable toggle, theme selector, line numbers toggle
- **advanced.html/advanced.js** - Debug mode toggle
- **motions.html/motions.js** - Custom keybinding editor

## Key Patterns

### Event Flow
```
User keystroke
    → content.js (captures in iframe)
    → eventToToken() converts to Vim token
    → parser.feed(token) returns parsed result
    → executor.exec(result) performs action
    → sendKeyEvent() simulates keys to Google Docs
```

### Google Docs Interaction
- Editor lives in `.docs-texteventtarget-iframe`
- Use `sel.modify('extend', direction, unit)` for selection manipulation
- Native word movement via Ctrl+Arrow (Option+Arrow on Mac)
- Text insertion via `InputEvent('beforeinput', { inputType: 'insertReplacementText' })`

### Mac vs Windows
In `sendKeyEvent()` (executor.js ~line 97):
- Mac: control and alt are swapped
- Home/End mapped to Cmd+Arrow on Mac
- This allows using `control: true` to mean "word movement key" on both platforms

## Development Commands

```bash
# Build Chrome extension zip
rm -f vim-for-docs-plus-chrome.zip && zip -r vim-for-docs-plus-chrome.zip src/

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Load unpacked → select src/ folder

# Load in Firefox
# 1. Go to about:debugging#/runtime/this-firefox
# 2. Load Temporary Add-on → select src/manifest.json
```

## Supported Features

### Motions
- Basic: `h`, `j`, `k`, `l`, `w`, `b`, `e`, `W`, `B`, `E`
- Line: `0`, `^`, `$`, `g_`
- Find/Till: `f{char}`, `t{char}`, `F{char}`, `T{char}`, `;`, `,`
- Jumps: `gg`, `G`, `{`, `}`, `%`, `H`, `M`, `L`
- Scroll: `zz`, `zt`, `zb`, `Ctrl+E`, `Ctrl+Y`, `Ctrl+D`, `Ctrl+U`

### Operators
- `d` (delete), `c` (change), `y` (yank)
- `>` (indent), `<` (dedent), `=` (reindent)
- `g~` (toggle case), `gu` (lowercase), `gU` (uppercase)

### Text Objects
- Words: `iw`, `aw`, `iW`, `aW`
- Delimiters: `i(`, `a(`, `i{`, `a{`, `i"`, `a"`, `i'`, `a'`
- Paragraphs/Sentences: `ip`, `ap`, `is`, `as`
- Tags: `it`, `at`

### Commands
- Insert: `i`, `I`, `a`, `A`, `o`, `O`
- Visual: `v`, `V`
- Edit: `r{char}`, `R`, `J`, `gJ`, `s`, `S`, `C`, `D`, `x`, `X`
- Paste: `p`, `P`, `gp`, `gP`, `]p`
- Undo/Redo: `u`, `U`, `Ctrl+R`
- Repeat: `.`
- Marks: `m{char}`, `'{char}`, `` `{char} ``
- Search: `/`, `?`, `n`, `N`, `*`, `#`
- Numbers: `Ctrl+A`, `Ctrl+X`

### Native Shortcuts Passthrough
In NORMAL/VISUAL mode, these pass through to browser:
- `Cmd+C` / `Ctrl+C` - Copy
- `Cmd+V` / `Ctrl+V` - Paste
- `Cmd+X` / `Ctrl+X` - Cut
- `Cmd+Z` / `Ctrl+Z` - Undo
- `Cmd+Shift+Z` / `Ctrl+Shift+Z` - Redo

## Common Issues

### "Keys don't work"
1. Ensure accessibility is enabled in Google Docs: Tools → Accessibility → Enable Screen reader support
2. Check extension is enabled in popup
3. Refresh the Google Docs page

### Word motions (`w`, `e`, `b`) not working correctly
These use native Ctrl/Option+Arrow for reliability. If issues persist, check:
- Line 1200-1225 in executor.js for motion handlers
- `moveWordRight()` / `moveWordLeft()` methods in GDocsNavigator

### Selection not working
Google Docs uses a complex iframe structure. Ensure:
- Focus is on the editor iframe
- `focusEditor()` is called before operations

## Testing
No automated tests currently. Manual testing workflow:
1. Load extension in Chrome/Firefox
2. Open a Google Docs document
3. Test individual motions and commands
4. Check debug mode (Advanced Settings) for console logs

## Storage Keys
- `enabled` (sync) - Extension on/off
- `lineNumbersEnabled` (sync) - Line numbers on/off
- `theme` (sync) - 'vim' or 'default'
- `debug` (sync) - Debug logging
- `motionsConfig` (local) - Custom keybindings (moved from sync due to quota limits)
- `vim_last_exit:{pathname}` (localStorage) - Per-document cursor position on exit
