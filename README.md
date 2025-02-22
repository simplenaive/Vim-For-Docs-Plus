# Vim-For-Docs
[![Install Vim for Docs](https://img.shields.io/badge/Install-Chrome%20Extension-blue?style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/vim-for-docs/kablhddalgenjgmoaignkfcphgmjnkno?authuser=0&hl=en)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/kablhddalgenjgmoaignkfcphgmjnkno?style=for-the-badge)](https://chromewebstore.google.com/detail/vim-for-docs/kablhddalgenjgmoaignkfcphgmjnkno)
[![GitHub stars](https://img.shields.io/github/stars/greenstorm5417/Vim-For-Docs?style=for-the-badge)](https://github.com/greenstorm5417/Vim-For-Docs/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/greenstorm5417/Vim-For-Docs?style=for-the-badge)](https://github.com/greenstorm5417/Vim-For-Docs/issues)

Vim-For-Docs is a browser extension that brings Vim-like navigation and editing functionality to Google Docs. With Vim-For-Docs, you can navigate, edit, and manipulate your documents using familiar Vim commands—now with a new default "vim" theme that displays a full-width overlay at the bottom. The left side of the overlay shows the current mode, while the right side shows the pending motion buffer.

> **Note:** This extension intercepts keystrokes before they reach Google Docs’ internal editor and remaps them to simulate Vim motions. It is designed for users who love Vim’s efficient navigation and editing style.

## Navigation
| **Key(s)**       | **Action**                                      |
|------------------|-------------------------------------------------|
| `h`              | Move left                                       |
| `j`              | Move down                                       |
| `k`              | Move up                                         |
| `l`              | Move right                                      |
| `w`              | Jump forward to start of word                   |
| `b`              | Jump backward to start of word                  |
| `0`              | Go to beginning of the current line             |
| `^`              | Go to first non‑blank character of the line*     |
| `$`              | Go to end of the current line                   |
| `g_`             | Go to last non‑blank character of the line       |
| `{` or `}`       | Move to previous/next paragraph                 |
| `gg`             | Jump to the top of the document                 |
| `ge`             | Jump backward to end of previous word           |
| `Ctrl + b`       | Page up                                         |
| `Ctrl + f`       | Page down                                       |

*Note: Due to Google Docs limitations, `^` does not work on the first line of the document.

## Modes
| **Key(s)**       | **Action**                                      |
|------------------|-------------------------------------------------|
| `i`              | Enter insert mode                               |
| `a`              | Enter insert mode (after cursor)                |
| `v`              | Enter visual (character) mode                   |
| `V`              | Enter visual line mode                          |
| `Esc`            | Return to normal mode                           |
| `Ctrl + o`       | Temporarily switch to normal mode from insert   |

## Editing
| **Key(s)**         | **Action**                                              |
|--------------------|---------------------------------------------------------|
| `d + motion`       | Delete text over a motion                               |
| `c + motion`       | Change text over a motion (delete then enter insert mode) |
| `y + motion`       | Yank (copy) text over a motion                          |
| `p`                | Paste copied text                                       |
| `u`                | Undo                                                    |
| `r`                | Redo*                                                   |
| `o`                | Open a new line below and enter insert mode             |
| `O`                | Open a new line above and enter insert mode             |
| `I`                | Go to beginning of line and insert                      |
| `A`                | Go to end of line and insert                            |

*Note: Redo is bound to `r` rather than `Ctrl + r` since the latter reloads the browser.


## Known Limitations
Due to browser restrictions and the Google Docs environment, some Vim commands have been modified or are unavailable:
- **Control + w:** In insert mode, this shortcut is disabled to avoid closing the current tab.
- **^ Command:** The `^` command does not work on the first line of the document.
- **Redo:** We use `r` for redo instead of `Ctrl + r` (which reloads the browser).
- **Visual Mode "U":** Undo functionality in visual mode (typically bound to `U`) is not supported by Google Docs.

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
