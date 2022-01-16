# TerminalXbqg

[简体中文](ReadMe.zh-Hans.md) | [English](ReadMe.md)

## Install

1. Download
	```plain
	$ git clone https://github.com/ForkFG/TerminalXbqg.git
	$ cd TerminalXbqg
	$ yarn
	$ chmod 755 main.js # if necessary
	```

2. Link

   Add
   
   ```plain
   $ alias xbqg="/path/to/TerminalXbqg/main.js"
   ```

   or
   
   ```plain
   $ export PATH="$PATH:/path/to/TerminalXbqg"
   ```

   to your terminal profile. (e.g. `.zshrc`)
   
3. Configure environment variables

   ```plain
   $ export XBQG_DATA="/path/to/..."
   ```

   Add this to the profile too.

# FAQ

- Q: Why does the text contain weird characters?

  A: They are from the xbqg websites, however, `replacer` can help.

- Q: I'd like to add new source, how?

  A: You have to edit `source.list` in `$XBQG_DATA/setting.json` .  `replacer` is also defined here.

- Q: My settings went wrong.

  A: Try `xbqg config_reset`.

- Q: TerminalXbqg doesn't work on xx OS.

  A: Sorry, I've only tested it on:

    - Archlinux 5.10.14-arch1-1 (tty & Konsole)

    - MacOS Catalina (Terminal.app)
    - MacOS Catalina Recovery (Terminal.app)
    - Windows 10 (Git bash)

  You may raise an issue [here](https://github.com/ForkKILLET/TerminalXbqg/issues).

  **Require node.js > v16.**

# Screenshots

- `interactive (!)` and `watch (..)`

  ![sc-1](https://s2.loli.net/2022/01/16/aTU4NJk3jmfpv6s.gif)

- `around`, `pagewarner` and `useCornerBracket`

  ![sc-2](https://s2.loli.net/2022/01/16/JtMrKuhie9g6EHU.png)
  
- `book_fetch (@)`, `hook (automatical book_mark)`, `autoSwitching`

  ![sc-3](https://s2.loli.net/2022/01/16/aVHK9yPNThLuAks.png)

# EOF

