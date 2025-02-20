# Vim-For-Docs

Vim-For-Docs is a browser extension that brings Vim-like motions and editing functionality to Google Docs. With Vim-For-Docs, you can navigate, edit, and manipulate your Google Docs using familiar Vim commands, making text editing fast and efficient.

> **Note:** This extension works by intercepting keystrokes before they reach Google Docs’ internal editor, remapping them to simulate Vim motions. It is designed for users who love Vim’s navigation and editing style.


## Key Motions

### Navigation

| **Key(s)**       | **Action**                                      |
|------------------|-------------------------------------------------|
| `h`              | Move left                                       |
| `j`              | Move down                                       |
| `k`              | Move up                                         |
| `l`              | Move right                                      |
| `w`              | Jump to start of next word                      |
| `b`              | Jump to start of previous word                  |
| `0`, `^`, or `_` | Go to beginning of the current line             |
| `$`              | Go to end of the current line                   |
| `{` or `}`       | Move to previous/next paragraph                 |
| `g + g`          | Jump to the top of the document                 |
| `g + e`          | Jump backward to end of previous word           |
| `g + 0`          | Go to first character of the screen line        |
| `g + _`          | Go to last non-blank character of the line      |
| `g + j`          | Move down one visual (wrapped) line             |
| `g + k`          | Move up one visual (wrapped) line               |

### Modes

| **Key(s)**       | **Action**                                      |
|------------------|-------------------------------------------------|
| `i`              | Enter insert mode                               |
| `a`              | Enter insert mode (after cursor)                |
| `v`              | Enter visual (character) mode                   |
| `V`              | Enter visual line mode                          |
| `Esc`            | Return to normal mode                           |
| `Ctrl + o`       | Temporarily switch to normal mode from insert   |

### Editing

| **Key(s)**         | **Action**                                              |
|--------------------|---------------------------------------------------------|
| `d + motion`       | Delete text over a motion                               |
| `c + motion`       | Change text over a motion (delete then enter insert mode) |
| `y + motion`       | Yank (copy) text over a motion                          |
| `p`                | Paste copied text                                       |
| `u`                | Undo                                                    |
| `r`                | Redo                                                    |
| `o`                | Open a new line below                                   |
| `O`                | Open a new line above                                   |
| `I`                | Go to beginning of line and insert                      |
| `A`                | Go to end of line and insert                            |

---

## How It Works

Vim-For-Docs intercepts key events in the Google Docs iframe and remaps them to Vim-like motions. It:
- **Maps keys** (e.g., `h`, `j`, `k`, `l` for navigation)
- **Handles multi-key commands** (e.g., `gg`, `ge`, etc.)
- **Switches modes** between Normal, Insert, and Visual to mimic Vim behavior
- **Simulates keystroke events** to interact with Google Docs’ editing surface

For a detailed look at the code, please refer to the source code.


## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check [Issues](https://github.com/greenstorm5417/Vim-For-Docs/issues) or submit a pull request.



---

## Links

- **Chrome Web Store:** [chrome](https://chromewebstore.google.com/detail/vim-for-docs/kablhddalgenjgmoaignkfcphgmjnkno)

---

## Inspired By & Continued From

Vim-For-Docs is inspired by and serves as a continuation of the work started in the [DocsKeys](https://www.github.com/tirthd16/dockeys) repository. Special thanks to the original creators for laying the groundwork for Vim-like navigation in Google Docs.



*Vim-For-Docs – Bringing Vim-like navigation and editing to Google Docs!*
