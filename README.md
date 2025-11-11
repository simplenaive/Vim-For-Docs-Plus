# Vim-For-Docs
# Vim-For-Docs
[![Install Vim for Docs (Chrome)](https://img.shields.io/badge/Install-Chrome%20Extension-blue?style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/vim-for-docs/kablhddalgenjgmoaignkfcphgmjnkno?authuser=0&hl=en)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/kablhddalgenjgmoaignkfcphgmjnkno?style=for-the-badge)](https://chromewebstore.google.com/detail/vim-for-docs/kablhddalgenjgmoaignkfcphgmjnkno)

[![Install Vim for Docs (Firefox)](https://img.shields.io/badge/Install-Firefox%20Extension-orange?style=for-the-badge&logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/vim-for-docs/)
[![Firefox Add-on Users](https://img.shields.io/amo/users/vim-for-docs?style=for-the-badge)](https://addons.mozilla.org/en-US/firefox/addon/vim-for-docs/)

[![GitHub stars](https://img.shields.io/github/stars/greenstorm5417/Vim-For-Docs?style=for-the-badge)](https://github.com/greenstorm5417/Vim-For-Docs/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/greenstorm5417/Vim-For-Docs?style=for-the-badge)](https://github.com/greenstorm5417/Vim-For-Docs/issues)

Vim-For-Docs is a browser extension that brings Vim-like navigation and editing functionality to Google Docs. With Vim-For-Docs, you can navigate, edit, and manipulate your documents using familiar Vim commands—now with a new default "vim" theme that displays a full-width overlay at the bottom. The left side of the overlay shows the current mode, while the right side shows the pending motion buffer.

> **Note:** This extension intercepts keystrokes before they reach Google Docs’ internal editor and remaps them to simulate Vim motions. It is designed for users who love Vim’s efficient navigation and editing style.

## ⚠️ Requirements
**Important:** This extension requires Google Docs accessibility features to be enabled:
1. Open a Google Doc
2. Go to **Tools → Accessibility**
3. Enable **Screen reader support**
4. Enable **Braille support**

Without these settings enabled, the extension will not function properly.

## Features
- Vim-like navigation and editing for Google Docs.
- Customizable motions, operators, commands, and text objects via a built‑in Motions Editor.
- Clean, non-destructive editor UX: no row deletion, IDs locked, keys edited in modals.
- Live apply of settings and motions through storage sync listeners (no tabs permission).
- Minimal permissions: storage only.

## Configuration & Motions Editor
- Open the popup → Motions Editor to customize key sequences and text object delimiters.
- Edits are validated as you type (token format, duplicates per section/type).
- Changes are saved to browser sync storage and applied instantly.

## Help
- A concise Help is available inside each edit modal.
- For general Vim references, see https://vim.rtorr.com/.

## How It Works
Vim-For-Docs intercepts key events from the Google Docs iframe and remaps them to Vim-like motions. The extension:
- **Maps keys:** For example, `h`, `j`, `k`, `l` for basic navigation.
- **Handles multi-key commands:** Such as `gg` and `ge` for document navigation.
- **Switches modes:** Between Normal, Insert, and Visual, with the "vim" theme providing a full-width overlay that shows the current mode and pending command.
- **Simulates keystroke events:** To interact with Google Docs’ editing surface.

For a detailed look at the code, please refer to the source files.

## Contributing
Contributions, issues, and feature requests are welcome!  
Feel free to check [Issues](https://github.com/greenstorm5417/Vim-For-Docs/issues) or submit a pull request.



## Links
- **Chrome Web Store:** [Vim-For-Docs Extension](https://chromewebstore.google.com/detail/vim-for-docs/kablhddalgenjgmoaignkfcphgmjnkno)


## Inspired By & Continued From
Vim-For-Docs is inspired by and continues the work started in the [DocsKeys](https://github.com/tirthd16/dockeys) repository. 

*Vim-For-Docs – Bringing Vim-like navigation and editing to Google Docs!*
