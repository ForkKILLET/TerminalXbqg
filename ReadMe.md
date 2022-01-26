# TerminalXbqg

[简体中文](ReadMe.zh-Hans.md) | [English](ReadMe.md)

## Background

I once had a Macbook and it broke down. I managed to enter Recovery mode and happily found Terminal.app and Safari there. But that Safari was too old so I wrote a [bash script](https://github.com/TerminalXbqgBash) to read novel. I thought reading in a terminal is nice so I migrate the script to node.js and added some awesome features after I got a new laptop.

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

## FAQ

- Q: How to add a book?

  A:
     1. First, choose a source. You can run `xbqg config source.list` to get the source list.  
        As for me, [ibiqu](https://www.ibiqu.net) works well, so I'll use it as an example.
     2. Run `xbqg source ibiqu` to switch the source. (This step will be unnecessary after adding a book mark because TerminalXbqg supports automatical source switching.)
     3. Suggest you're going to read _诡秘之主 (Lord of the Mysteries)_, then open the brower and [search](http://www.ibiqu.net/modules/article/search.php?searchkey=%E8%AF%A1%E7%A7%98%E4%B9%8B%E4%B8%BB) it. (Biquge site group mostly support seacrhing). Then enter chapter 1. Now the URL is <http://www.ibiqu.net/book/94525/153378216.htm> and you need to copy page ID in that address, i.e. `94525/153378216`。
     4. Finally, run `xbqg fetch 52542/20380548` to fetch the chapter. Then you can close the brower and enjoy the immersive experience of reading in terminal.
     5. Some commands you may need: `fetch_prev(p, [)` & `fetch_next(n, ])` to turn page, `book_mark` to add books to your bookcase，`book_show` to show the bookcase，`watch` update, `interactive` mode, etc. There are two short forms (letter and symbol) of each commands for quick input. You can run `help` to get information of all commands, or `help watch` and more to get information about a specific command.
     5. Happy reading!

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

## Screenshots

- `interactive (!)` and `watch (..)`

  ![sc-1](https://s2.loli.net/2022/01/16/aTU4NJk3jmfpv6s.gif)

- `around`, `pagewarner` and `useCornerBracket`

  ![sc-2](https://s2.loli.net/2022/01/16/JtMrKuhie9g6EHU.png)
  
- `book_fetch (@)`, `hook (automatical book_mark)`, `autoSwitching`

  ![sc-3](https://s2.loli.net/2022/01/16/aVHK9yPNThLuAks.png)

## EOF

