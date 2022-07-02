# TerminalXbqg

[简体中文](ReadMe.zh-Hans.md) | [English](ReadMe.md)

## 背景

　　我曾经拥有一台 Macbook 但它坏了。我成功进入恢复模式然后开心地看到有 Terminal.app 和 Safari 可以用。但那 Safari 太旧了，于是我写了一个 [bash 脚本](https://github.com/TerminalXbqgBash) 来看小说。我寻思在终端看小说很棒，所以拿到新笔记本之后就把这个脚本迁移到了 node.js 并做了些很酷的新功能。

## 安装

1. 下载

   ```plain
   $ git clone https://github.com/ForkKILLET/TerminalXbqg.git
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

   添加到您的终端 profile 文件。（如`.zshrc`）

3. 配置环境变量

   ```plain
   $ export XBQG_DATA="/path/to/..."
   ```

   把这行也加进去。

## FAQ

- Q: 该怎么添加小说呢？

  A:
     1. 选一个源（source）。您可 `xbqg config source.list` 以检查源列表。我个人用下来 [ibiqu](https://www.ibiqu.net) 质量比较高，接下来以它为例。
     2. `xbqg source ibiqu` 以切换源。（加入书签之后就可以省略这个步骤，TerminalXbqg 支持自动换源）
     3. 假设您要看《诡秘之主》，那么打开浏览器，在 ibiqu [搜索](http://www.ibiqu.net/modules/article/search.php?searchkey=%E8%AF%A1%E7%A7%98%E4%B9%8B%E4%B8%BB) 它（笔趣阁站群大多支持搜索功能），然后进入其第一章。此时可以看到地址是 <http://www.ibiqu.net/book/94525/153378216.htm>，您需要复制地址中章节编号即 `94525/153378216`。
     4. `xbqg fetch 52542/20380548` 以获取本章内容。随后可以关闭浏览器，体验终端沉浸阅读。
     5. 一些您可能会常用到的功能：`fetch_prev(p, [)` 和 `fetch_next(n, ])` 翻页，`book_mark`添加书签，`book_show`显示书架，`watch` 检查更新，`interactive` 进入交互模式等等。每个命令都有字母和符号两种缩写形式，便于快速输入。您可以 `help` 获取全部命令信息，或者如 `help watch` 获取指定命令的信息。
     5. 祝您阅读愉快！

- Q: 为什么文本包含奇怪的乱码？

  A: 它们来自新笔趣阁站群自身。不过 `replacer`  可以改善这个问题。

- Q: 我想加入新的源，该怎么做？

  A: 目前您只能编辑 `$XBQG_DATA/setting.json` 中的 `source.list`。 `replacer` 也在这。

- Q: 我把设置搞坏了。

  A: 试试 `xbqg config_reset`。

- Q: TerminalXbqg 在某某系统上用不了。

  A: 抱歉，我只在这些环境中测试过它：

  - Archlinux 5.10.14-arch1-1 (tty & Konsole)
  - MacOS Catalina (Terminal.app)
  - MacOS Catalina Recovery (Terminal.app)
  - Windows 10 (Git bash)
  
您可以在[这](https://github.com/ForkKILLET/TerminalXbqg/issues)提 issue。
  
**需要 node.js v16 版本以上。**

## 炫酷截图

- `interactive (!)` 和 `watch (..)`

  ![sc-1](https://s2.loli.net/2022/01/16/aTU4NJk3jmfpv6s.gif)

- `around`, `pagewarner` 和 `useCornerBracket`

  ![sc-2](https://s2.loli.net/2022/01/16/JtMrKuhie9g6EHU.png)

- `book_fetch (@)`, `hook (automatical book_mark)`, `autoSwitching`

  ![sc-3](https://s2.loli.net/2022/01/16/aVHK9yPNThLuAks.png)

## EOF

