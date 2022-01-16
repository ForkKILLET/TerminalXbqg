# TerminalXbqg

[简体中文](ReadMe.zh-Hans.md) | [English](ReadMe.md)

## 安装

1. 下载

   ```plain
   $ git clone https://github.com/ForkFG/TerminalXbqg.git
   $ cd TerminalXbqg
   $ yarn
   $ chmod 755 main.js # 如有需要
   ```

2. 链接

   将

   ```plain
   $ alias xbqg="/path/to/TerminalXbqg/main.js"
   ```

   或者

   ```plain
   $ export PATH="$PATH:/path/to/TerminalXbqg"
   ```

   添加到你的终端 profile 文件。（如`.zshrc`）

3. 配置环境变量

   ```plain
   $ export XBQG_DATA="/path/to/..."
   ```

   把这行也加进去。

# FAQ

- Q: 为什么文本包含奇怪的乱码？

  A: 它们来自新笔趣阁站群自身。不过 `replacer`  可以改善这个问题。

- Q: 我想加入新的源，该怎么做？

  A: 目前你只能编辑 `$XBQG_DATA/setting.json` 中的 `source.list`。 `replacer` 也在这。

- Q: 我把设置搞坏了。

  A: 试试 `xbqg config_reset`。

- Q: TerminalXbqg 在某某系统上用不了。

  A: 抱歉，我只在这些环境中测试过它：

    - Archlinux 5.10.14-arch1-1 (tty & Konsole)

    - MacOS Catalina (Terminal.app)
    - MacOS Catalina Recovery (Terminal.app)
    - Windows 10 (Git bash)

  你可以在[这](https://github.com/ForkKILLET/TerminalXbqg/issues)提 issue。

  **需要 node.js v16 版本以上。**

# 炫酷截图

- `interactive (!)` 和 `watch (..)`

  ![sc-1](https://s2.loli.net/2022/01/16/aTU4NJk3jmfpv6s.gif)

- `around`, `pagewarner` 和 `useCornerBracket`

  ![sc-2](https://s2.loli.net/2022/01/16/JtMrKuhie9g6EHU.png)

- `book_fetch (@)`, `hook (automatical book_mark)`, `autoSwitching`

  ![sc-3](https://s2.loli.net/2022/01/16/aVHK9yPNThLuAks.png)

# EOF

