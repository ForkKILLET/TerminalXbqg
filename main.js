#!/bin/env node

// :: Dep

const version		= "4.3.1"

const fs			= require("fs")
const execa			= require("execa")
const open			= require("open")
const readline		= require("readline")
const {
	Is, Cc, ski,
	sleep, httpx, exTemplate: exT, serialize,
	Logger
}					= require("fkutil")

const logger		= Logger({ noColor: false }).bind(), {
	warn: Warn, errEOF: Err, log: Log, div: Div,
	exTemplateLog: exTLog, hili: Hili, bold: Bold, table: Table
} = logger
const std			= {
	stdin: process.stdin, stdout: process.stdout, stderr: process.stderr
}

// :: Tool

const objectPath = (obj, path, create, val) => {	
	if (! path.match(/^[.[]/)) path = "." + path

	const rsit = path.matchAll(/\.([_a-zA-Z][0-9_a-zA-Z]*)|\[(\d+)]/g)
	let rs, o = obj, pa_o, k, pa_k, t
	// Note:
	// a.b.c
	// o					pa_o				k		pa_k
	// { a: b: { c: 1 } }	undefined			"a"		undefined
	// { b: { c: 1 } }		{ a: b: { c: 1 } }	"b"		"a"
	// { c: 1}				{ b: { c: 1 } }		"c"		"b"

	while (! (rs = rsit.next()).done) {
		t = !! rs.value[1] // Note: 0 Number, 1 String.
		k = t ? rs.value[1] : Number(rs.value[2])

		if (Is.objR(o)) {
			if (t ^ Is.arr(o)) ;
			else if (create) Err("Path type conflicted.")
		}

		else if (Is.udf(o)) {
			if (create) o = pa_o[pa_k] = t ? {} : []
			else Err("Path includes undefined.")
		}
		else if (create) Err("Path type conflicted.")

		pa_o = o
		o = o[k]
		pa_k = k
	}

	if (create) pa_o[pa_k] = val

	return pa_o[pa_k]
}

// :: Logic

const c = {
	read: (n, force) => {
		if (force && c[n]) return c[n]
		if (flag.debug) Log(Hili("xbqg% ") + `read ${n}`)
		return c[n] = JSON.parse(fs.readFileSync(p_file(n), "utf8").toString())
	},
	read_json: n => fs.readFileSync(p_file(n), "utf8").toString(),
	write: (n, data) => {
		if (data) c[n] = data
		fs.writeFileSync(p_file(n),
			new Uint8Array(Buffer.from(Is.str(c[n])
				? c[n]
				: serialize(c[n], { regexp: true, indent: 2 })
			)), "utf8")
		if (flag.debug) Log(Hili("xbqg% ") + `write ${n}`)
	}
}

const flag = {
	lauch: true,
	interactive: false,
	get debug() { return cli.g.o.debug ?? false },
	get plain() { return cli.g.o.plain ?? false }
}
let p_data, rln
const p_file = n => `${p_data}/${n}.json`

const info = {}
info.g = {
	fetch:				[ [ "f",	":"		], [ "Fetch a page by specific `page` id." ] ],
	source:				[ [ "s",	":="	], [ "Modify the active `source`. Prefix matching is OK.",
												 "Show the active `source` when no argument is given." ] ],
	fetch_prev:			[ [ "fp",	"["		], [ "Fetch the `prev`ious page." ] ],
	fetch_curr:			[ [ "fc",	"="		], [ "Fetch the `curr`ent page." ] ],
	fetch_next:			[ [ "n",	"]"		], [ "Fetch the `next` page." ] ],
	around:				[ [ "a",	"-"		], [ "Show `around` information,",
												 "i.e. current title and `page` id of `prev`, `curr`, `next`." ] ],
	book_show:			[ [ "bs",	"@-"	], [ "Show your `bookcase`." ] ],
	book_mark:			[ [ "bm",	"@+"	], [ "Add the current page to your `bookcase` and give it a `name`.",
												 "Update when the book `name` already exists." ] ],
	book_fetch:			[ [ "bf",	"@:"	], [ "Fetch the page you read before of a named book in your `bookcase`.",
												 "Prefix matching is OK." ] ],
	book_browse:		[ [ "bb",	"@@"	], [ "Open the current page in your browser" ] ],
	config:				[ [ "c",	"%"		], [ "Print the whole configuration when no arguments is given.",
												 "Print a specific item by the given `JSON path`.",
												 "e.g. `xbqg c a.b[42].c`",
												 "Delete the specific item.",
												 "e.g. `xbqg c i.dont.want.it -` or `xbqg c me.too undefined`",
												 "Modify the specific item. Argument `=` turns the `value` into a string.",
												 "e.g. `xbqg c a.boolean true` and",
												 "     `xbqg c a.string = true` or `xbqg c a.string \\\"true\\\"`" ] ],
	config_edit:		[ [ "ce",	"%+"	], [ "Edit a configuration JSON file by your %`editor`.",
												 "In default, `setting.json`." ] ],
	config_reset:		[ [ "cr",	"%="	], [ "Reset your configuration to the default in 5 seconds.",
												 "The task is immediately done when `path` is `!`.",
												 "Just reset the specific `path` of the configuration without delaying." ] ],
	pagewarner_stat:	[ [ "ps",	"^-"	], [ "Show today's `pagewarner` information using a progress bar." ] ],
	pagewarner_diff:	[ [ "pd",	"^="	], [ "Show `pagewarner` difference among days using a bar chart." ] ],
	interactive:		[ [ "i",	"!"		], [ "Enter the `interactive` mode." ] ],
	history:			[ [ "hi",	"~"		], [ "Show history." ] ],
	history_reset:		[ [ "hr",	"~="	], [ "Reset history." ] ],
	hook:				[ [ "k",	"/"		], [ "Trigger a `name`d hook manually." ] ],
	hook_show:			[ [ "ks",	"/-"	], [ "Show your hooks." ] ],
	hook_toggle:		[ [ "kt",	"/="	], [ "Toggle a `name`d hook." ] ],
	help:				[ [ "h",	"?"		], [ "Show help of the given `theme` or `command name`.",
												 "Show usage when no arguments is given."] ],
}
info.i = {
	exit:		[ [ "!",	"e"	], [ "Exit the interactive mode." ] ],
	clear:		[ [ "-",	"c" ], [ "Clear the console." ] ],
	eval:		[ [ "+",	"v"	], [ "Run Javascript code." ] ],
	shell:		[ [ "^",	"s"	], [ "Run command in shell." ] ],
	help:		[ [ "?",	"h" ], [ "Show help of the given `theme` or `command name`." ] ],
}
info.t = {
	data: `
All data files exists in \`$XBQG_DATA\` unless user gives a \`--path\` option to override it.
Filenames cannot be changed at present.

RELAVANT

?setting             -> one of the data files
`,
	setting: `
Since all formats of data become Javascript object when the script runs,
Javascript style \`path\` is used below.

.editor: string
# what to edit your data files with
interactive: object
    prompt: string
    # what to display before your cursor in the interactive mode
    forceClearCommand: string
    # how to clear the console history instead of the current screen.

pagewarner: object
    warnNum: integer
    # how much pages you decided to read at most.
    onlyWarnAfterFetching
    # whether display the pagewarner after \`fetch\`ing
      when only you reach the \`warnNum\`.
    progressStyle: object
        stat: object
            length: integer
            fommat: string
        diff: object
            length: integer
            fommat: string

source: object
    active: string
    # what source to use now among the \`list\`
    autoSwitching: boolean
    # whether automatically switch the source to
      the first available one of a book when \`book_fetch\`
    list: object
        [source]: object
            url: string
            matcher: object
                [matcher]: object
                    necessary: boolean
                    from: string
                    regexp: regexp
            replacer: array
                [index]: array
                    0: string
                    1: string
            matchKeyInAround: regexp

history: object
    on: boolean
    loadToInteractive: integer

RELAVANT

?data                -> where to store
?config              -> commands to operate the configuration
?config_reset        ~~
?config_edit         ~~
`
}

const cmd = {}
const fetch_alias = name => async() => {
	Div("page info", 0, 1)

	c.read("around")
	const page = c.around[c.setting.source.active]?.[name]

	if (page) {
		c.read("pagewarner")
		const today = new Date().format("yyyymmdd")
		if (Is.udf(c.pagewarner[today])) c.pagewarner[today] = 0
		else c.pagewarner[today] += ski(name, { prev: -1, curr: 0, next: +1 })
		c.write("pagewarner")

		Log(`${name}: ${page}`)
		await cmd.g.fetch(page)
	}
	else {
		Log(`${name}: null`)
		Div("EOF", 0, 1)
	}
}
const history_save = ln => {
	if (c.setting.history.on) {
		c.read("history")
		c.history.push(ln)
		c.write("history")
	}
}

cmd.g = {
	fetch: async(page) => {
		Div("fetch", 0, 2)
		if (! page) Err("Page can't be null.")

		const s = c.setting.source.active, src = c.setting.source.list[s]
		const g = c.setting.source.list.global
		const matcher = Object.assign({}, g.matcher, src.matcher ?? {})
		const replacer = g.replacer.concat(src.replacer ?? [])
		const blocks = {}

		try {
			blocks.html = await httpx.get(exT(src.url, { page }),
				{ headers: { "User-Agent": "xbqg/" + version } }
			)
		}
		catch (err) {
			if (Is.num(err)) Log("Unexpected response code " + err + "." + ski(
				err, {
					404: " Perhaps the given page is wrong.",
					502: " Perhaps the server go wrong. You may switch the source.",
					503: " Perhaps the server is busy. You may wait and retry later.",
					504: ski.q(503)
				}, "")
			)
			else Err(err?.message ?? err)
		}

		for (let i in matcher) {
			const m = matcher[i]
			blocks[i] = blocks[m.from]?.match(RegExp(m.regexp))?.[m.group ?? 1]
			if (m.necessary && ! blocks[i])
				Log(blocks), Err(`Block "${i}" mismatched.\nsource name: "${s}"`)
		}

		for (let r of replacer)
			blocks.content = blocks.content.replace(RegExp(r[0], "g"), r[1])

		if (blocks.title.match(/^[3-5][01]\d+/))
			Err(`HTTP error code: ${blocks.title}`)

		const chapterTitle = blocks.chapterName + " @ " + blocks.bookName
		Log(chapterTitle)
		Log(blocks.content)

		Div("around", 1, 1)

		const a = {
			prev: blocks.prev,
			curr: page,
			next: blocks.next
		}
		Log(JSON.stringify(a, null, 2))

		c.read("around")
		a.title = chapterTitle
		a.time = + new Date()
		c.around[s] = a

		c.write("around")

		Div("EOF", 1, 1)
	},
	fetch_prev: fetch_alias("prev"),
	fetch_curr: fetch_alias("curr"),
	fetch_next: fetch_alias("next"),

	around: () => {
		Div("around", 0, 2)

		c.read("around")
		Log(c.around[c.setting.source.active])

		Div("EOF", 1, 1)
	},
	
	source: (_src) => {
		if (_src) {
			Div("source switch", 0, 1)

			_src = Object.keys(c.setting.source.list).find(n => n !== "global" && n.startWith(_src))
			
			if (_src) {
				c.setting.source.active = _src

				c.write("setting")
				Log(`Switching source to \`${_src}\`.`)
			}
			else Warn("Not found.")

			Div("EOF", 0, 1)
		}
		else {
			Div("source active", 0, 1)
			Log(c.setting.source.active)
			Div("EOF", 0, 1)
		}
	},

	book_show: () => {
		Div("book show", 0, 2)
		// TODO: better display
		Log(c.read("books"))
		Div("EOF", 1, 1)
	},
	book_mark: (_name) => {
		Div("book mark", 0, 2)

		c.read("around")
		c.read("books")

		const s = c.setting.source.active
		const re = RegExp(c.setting.source.list[s].matchKeyInAround)
		const key = c.around[s]?.curr.match(re)[1]

		if (! key) Err("No around is found.")

		let newBook = true
		for (let i in c.books)
			if (c.books[i][s]?.curr.match(re)[1] === key) {
				newBook = false
				_name = i
			}

		if (newBook && ! _name)
			Err("Book name can't be null when adding new book.")
		if (! c.books[_name]) c.books[_name] = {}
		c.books[_name][s] = c.around[s]

		c.write("books", c.books)
		Log(newBook ? "Added." : "Updated.")
		Div("EOF", 1, 1)
	},
	book_fetch: async(name) => {
		Div("book fetch", 0, 1)

		if (! name) Err("Book name can't be null.")
		c.read("books")

		name = Object.keys(c.books).find(n => n.startWith(name))
		const a = c.books[name]
		let s = c.setting.source.active
		if (a?.[s]) ;
		else if (c.setting.source.autoSwitching) {
			c.setting.source.active = s = Object.keys(a)[0]
			Log(`Auto switching source to \`${s}\`.`)
			c.write("setting")
		}
		else {
			Warn("Not found.")
			Div("EOF", 0, 1)
			return
		}
		Log(`Fetching book \`${name}\`.`)
		await cmd.g.fetch(a[s].curr)
	},
	book_browse: () => {
		Div("book browse", 0, 2)

		c.read("around")
		const s = c.setting.source.active, src = c.setting.source.list[s]
		const browser = c.setting.browser
		const url = exT(src.url, { page: c.around[s].curr })
		Log("Running " + Hili(`${browser ?? "browser"} ${url}`))
		open(url, { app: { name: browser } })

		Log("Done.")
		Div("EOF", 1, 1)
	},

	config: (_path, _action, _val_) => {
		if (! _path) {
			Div("config read all", 0, 2)
			Log(c.setting)
			Div("EOF", 1, 1)
		}
		else {
			const create = !! _action
			Div(create ? "config write" : "config read", 0, 2)

			let val; try {
				val = [ "undefined", "-" ].includes(_action + "")
					? undefined
					: JSON.parse(_action === "=" ? `"${ _val_.join(" ") }"` : _action)
			}
			catch {
				Err("Illegal JSON value.")
			}

			const r = objectPath(c.setting, _path, create, val)

			c.write("setting", c.setting)
			Log(r)

			Div("EOF", 1, 1)
		}
	},
	config_edit: async(_file) => {
		const path = p_data + "/" + (_file ?? "setting") + ".json"
		const editor = exT(c.setting.editor, { path })

		Div("config edit", 0, 2)
		Log("Running " + Hili("$ " + editor))

		try {
			if (flag.interactive) rln.pause()
			await execa.command(editor, std)
			if (flag.interactive) rln.resume()
		}
		catch {}

		Log(`Done.`)
		Div("EOF", 1, 1)
	},
	config_reset: async(_path) => {
		Div("config reset", 0, 2)

		if (! _path) {
			Warn("The default setting will be restored in 5 seconds.")
			await sleep(5000)
		}

		Log("Reseting.")
		
		if (_path !== "!") {
			const r = objectPath(c.setting, _path, false,
				objectPath(c_dft.setting, _path, false)
			)
			Log("\n%o\n", r)
		}

		c.write("setting", c_dft.setting)
		Log("Done.")
		Div("EOF", 1, 1)
	},

	pagewarner_stat: () => {
		c.read("pagewarner")

		const today = new Date().format("yyyymmdd")
		const n = c.pagewarner[today] ?? 0, m = c.setting.pagewarner.warnNum

		Div("pagewarner stat", 0, 2)
		if (n <= m) {
			if (c.setting.pagewarner.onlyWarnAfterFetching === true) return

			Log(`Reading progress today: [${n} / ${m}]`)
			Log(`${m - n} page${m - n <= 1 ? "" : "s"} left.`)
			const l = c.setting.pagewarner.progressStyle.stat.length
			let nc = parseInt(n / m * l)
			if (nc < 0) nc = 0
			exTLog(
				c.setting.pagewarner.progressStyle.stat.fommat,
				"setting.pagewarner.progressStyle.stat.fommat", {
					progress: ($, f, b) =>
						Hili(Cc(f, $.param(0, "fore")).char().r.repeat(nc)) +
						Cc(b, $.param(1, "back")).char().r.repeat(l - nc),
					percent: (n / m).toPercent()
				}
			)
		}
		else {
			Warn(`Reading progress today: [${n} / ${m}]`)
			Warn(`${n - m} page${m - n <= 1 ? "" : "s"} more than the warning num!`)
			Warn("Suggestion: stop now!")
		}
		Div("EOF", 1, 1)
	},
	pagewarner_diff: () => {
		c.pagewarner = c.read("pagewarner")

		Div("pagewarner diff", 0, 2)

		const l = c.setting.pagewarner.progressStyle.diff.length
		let m = l; for (let d in c.pagewarner) if (c.pagewarner[d] > m) m = c.pagewarner[d]

		for (let d in c.pagewarner) {
			const n = c.pagewarner[d]
			exTLog(
				c.setting.pagewarner.progressStyle.diff.fommat,
				"setting.pagewarner.progressStyle.diff.fommat", {
					date: d,
					progress: (_, f) =>
						Hili(Cc(f, _.param(0, "fore")).char().r.repeat(n / m * l)),
					number: n
				}
			)
		}

		Div("EOF", 1, 1)
	},

	interactive: async() => {
		if (flag.interactive) {
			Warn("Already in interactive mode.")
			rln.prompt()
			return
		}

		Div("interactive", 0, 2)
		Log("Use `!help` to get usage of interactive instructions.")
		
		flag.interactive = true
		rln = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			removeHistoryDuplicates: true
		})
		rln.rePrompt = () => rln.setPrompt(exT(c.setting.interactive.prompt, { hili: s => Hili(s) }))
		
		let n = c.setting.history.loadToInteractive
		if (n) {
			c.read("history")
			rln.history = c.history.slice(- n).reverse()
		}

		rln.rePrompt()
		rln.prompt()
		rln.on("line", async(ln) => {
			if (! (ln = ln.trim())) {
				rln.prompt()
				return
			}

			if (c.setting.interactive.allowXbqgPrefix) ln = ln.replace(/^xbqg /, "")

			await cli.parse_ln(ln)

			rln.prompt()
		})
		rln.on("close", () => Div("EOI", 2, 1))
	},

	history: () => {
		Div("history show", 0, 2)
		c.read("history")
		Log(c.history.join("\n"))
		Div("EOF", 1, 1)
	},
	history_reset: () => {
		Div("history reset", 0, 2)

		Log("Reseting.")
		c.write("history", c_dft.history)
		Log("Done.")
		Div("EOF", 1, 1)
	},

	hook: async(name) => {
		Div("hook execute", 0, 1)

		await cli.g._hook._execute(cli.g._hook._find(name))

		Div("EOH", 0, 1)
	},
	hook_show: () => {
		Div("hook show", 0, 2)

		Log(c.setting.hooks)

		Div("EOF", 1, 1)
	},
	hook_toggle: (name) => {
		Div("hook toggle", 0, 1)
		
		const h =  cli.g._hook._find(name)
		if (! h) Warn("Not found.")
		else {
			h.on = ! h.on
			c.write("setting")
			
			Log(h.on ? "Enabled." : "Disabled.")
		}
		Div("EOF", 0, 1)
	}
}
cmd.i = {
	exit: () => {
		rln.close()
		process.exit(0)
	},
	clear: async(_force) => {
		if (_force === "!")
			await execa.command(c.setting.interactive.forceClearCommand, std)
		else rln.write(null, { ctrl: true, name: 'l' })
	},
	eval: (code_) => {
		Div("evaluate", 0, 1)
		try {
			Log(eval(code_.join(" ")))
		}
		catch (e) {
			Warn(e)
		}
		Div("EOF", 0, 1)
	},
	shell: async(code_) => {
		Div("shell", 0, 1)
		try {
			await execa.command(code_.join(" "), std)
		}
		catch {}
		Div("EOF", 0, 1)
	}
}

const opt = {}
opt.g = {
	version:	[ "v"	, [ "null"					], "show version" ],
	plain:		[ "n"	, [ "boolean"				], "disable colored output" ],
	path:		[ "p"	, [ "string",	"p_data"	], "assign data path, override `$XBQG_DATA`." ],
	debug:		[ "d"	, [ "boolean"				], "enable debugging output" ]
}

const c_dft = {
	setting: {
	  editor: "vi ${path}",
      browser: null,
	  interactive: {
	    prompt: "!{ hili | xbqg$ } ",
        forceClearCommand: "clear",
        allowXbqgPrefix: true
	  },
	  pagewarner: {
	    warnNum: 50,
	    onlyWarnAfterFetching: false,
	    progressStyle: {
	      stat: {
	        length: 80,
	        fommat: "[ !{ progress | # | = } ] ${percent}"
	      },
	      diff: {
	        length: 80,
	        fommat: "${date} | !{ progress | # } ] ${number}"
	      }
	    }
	  },
	  source: {
	    active: "xbqg",
		autoSwitching: true,
	    list: {
	      "global": {
	        matcher: {
	          title: {
	            necessary: true,
	            from: "html",
	            regexp: /<title>(.*)<\/title>/
	          }
	        },
	        replacer: [
	          [ /<br ?\/?>/, "\n" ],
	          [ /&?amp;/, "&" ],
	          [ /&?nbsp;/, " " ],
	          [ /&?lt;/, "<" ],
	          [ /&?gt;/, ">" ]
	        ]
	      },
	      "xbqg": {
	        url: "https://www.vbiquge.com/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /-(.*?) - 新笔趣阁$/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.*)-/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content">([^]*?)<\/div>/
	          },
	          around: {
	            necessary: true,
	            from: "html",
	            regexp: /=keypage;([^]*?)function keypage/
	          },
	          prev: {
	            necessary: false,
	            from: "around",
	            regexp: /prevpage="\/(.*?).html"/
	          },
	          next: {
	            necessary: false,
	            from: "around",
	            regexp: /nextpage="\/(.*?).html"/
	          }
	        },
	        matchKeyInAround: /(.*)\//
	      },
	      "8wenku": {
	        url: "http://www.8wenku.com/b/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /\s*(.*)_/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /_(.*)_8文库/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content">([^]*?)<\/div>/
	          },
	          prev: {
	            necessary: true,
	            from: "",
	            regexp: /<a href="\/b\/(.*?).html">上一章<\/a>/
	          },
	          next: {
	            necessary: true,
	            from: "html",
	            regexp: /<a href="\/b\/(.*?).html">下一章<\/a>/
	          }
	        },
	        matchKeyInAround: /(.*)\//
	      },
	      "kenshuge": {
	        url: "https://m.kenshuge.com/wapbook/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /\s*(.*?)_/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /_(.*?)_笔趣阁/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="chapter_con" class="chapter_con">([^]*?)<\/div>/
	          },
	          prev: {
	            necessary: true,
	            from: "html",
	            regexp: /<a href="\/wapbook\/(.*?)\.html">上一章<\/a>/
	          },
	          next: {
	            necessary: true,
	            from: "html",
	            regexp: /<a href="\/wapbook\/(.*?)\.html">下一章<\/a>/
	          }
	        },
	        replacer: [
	          [ /\n{3,}/, "\n\n" ]
	        ],
	        matchKeyInAround: /(.*)_/
	      },
	      "ibiqu": {
	        url: "http://www.ibiqu.net/book/${page}.htm",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /_(.*?)小说在线阅读/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^ (.*?)_/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content">([^]*?)<\/div>/
	          },
	          prev: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/book\/([0-9\/]*?).htm">上一章<\/a>/
	          },
	          next: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/book\/([0-9\/]*?).htm">下一章<\/a>/
	          }
	        },
	        replacer: [
	          [ /<p>/, "" ],
	          [ /<\/p>/, "\n" ],
	          [ /一秒记住，精彩小说无弹窗免费阅读！/, "" ]
	        ],
	        matchKeyInAround: /(.*)\//
	      }
	    }
	  },
      history: {
        on: true,
        loadToInteractive: 10
      },
      hooks: [
        {
          on: true,
          name: "anti-addiction",
          event: [ "post-fetch" ],
          action: [
            "pagewarner_stat"
          ]
        },
        {
          on: false,
          name: "page-refresh",
          interactive: true,
          event: [ "pre-fetch" ],
          action: [
            "!clear !"
          ]
        }
      ]
	},
	history: [ "help" ],
	around: {},
	books: {},
	pagewarner: {}
}

// :: Wargs

const wargs = (name) => ({
	init({ has_option, wrong_usage }) {
		this.cmd = cmd[name]
		this.wrong_usage = wrong_usage
		this.info = info[name]
		if (this.has_option = has_option)
			this.opt = opt[name]

		this._init_cmd(Object.keys(this.cmd))

		return this
	},
	_init_cmd(cmds) {
		for (let n of cmds) {
			this.info[n][2] =
				this.cmd[n].toString().match(/^(async)?\((.*)\)/)?.[2]?.split(", ")
			this.info[n][2].req =
				this.info[n][2].reduce((x, s) => s.startWith("_") ? x : x + 1, 0)
			this.cmd[n] = new Proxy(this.cmd[n], {
				apply: async(f, _, $) => {
					await this.trigger([ "pre-" + n, "pre*" ], _, n)
					await f(...$)
					await this.trigger([ "post-" + n, "post*" ], _, n)
				}
			})
		}
	},
	_find_cmd(n) {
		return n && Object.entries(this.info).find(e => [ e[0], ...e[1][0] ].includes(n))
	},
	_find_opt(n) {
		return n && Object.entries(this.opt).find(e => [ e[0], e[1][0] ].includes(n))
	},
	help({ themes, extra } = {}) {
		this.cmd.help = (_theme) => {
			Div("help", 0, 2)

			let ext, txt = ""
			const cmd_head = (k, v) => [
				[ k, ...v[0] ].map(Hili).join(" | "),
				v[2].filter(o => o).map(o => {
					const n = o.replace(/_$/, "...")
					return n[0] === "_"
						? "[" + Hili(n.slice(1)) + "]"
						: "<" + Hili(n) + ">"
				}).join(" ")
			]

			if (! _theme) {
				if (this.has_option) txt = "OPTIONS\n\n"
					+ Table(Object.entries(this.opt).map(([ k, v ]) => {
						const bool = v[1][0] === "boolean"
						return [
							"--" + Hili(k) +  " | -" + Hili(v[0]) + (bool ? `[${ Hili("!") }]` : ""),
							v[2] + (bool ? ", toggle with a bang `!`." : "")
						]
					}), [ 25 ])
				txt	+= "\n\nCOMMANDS\n\n"
					+ Table(
						Object.entries(this.info).map(([ k, v ]) => {
							const tab = [ cmd_head(k, v) ]
							for (let i in v[1]) {
								if (! tab[i]) tab[i] = [ "", "" ]
								tab[i][2] = v[1][i]
							}
							return tab
						}).flat(), [ 30, 25 ]
					)
					+ (extra ? "\n\n" + extra.trim() : "")
			}
			else if (ext = themes[_theme]) {
				txt = _theme.toUpperCase() + "\n\n" + ext.trim()
			}
			else {
				let e = this._find_cmd(_theme)
				if (e) txt = "COMMAND\n\n" + cmd_head(...e).join(" ") + "\n" + e[1][1].join("\n")
				else Warn("Unknown command or theme.")
			}

			Log(txt.replace(/(^|\n)[A-Z]+\n/g, Bold))
			Div("EOF", 1, 1)
			
			if (! flag.interactive) process.exit(0)
		}
		this._init_cmd([ "help" ])

		return this
	},
	_hook: {
		_find: name => c.setting.hooks.find(h => h.name === name),
		_execute: async h => {
			if (! h) return
			if (flag.interactive || ! h?.interactive)
			for (let ln of h.action) await cli.parse_ln(ln)
		}
	},
	trigger(event, ...A) {
		if (! Is.arr(event)) event = [ event ]
		if (flag.debug) Log(Hili("xbqg% ") + `trigger ${ event.join(", ") }`)
		return Promise.all(event
			.filter(e => this._hook[e])
			.map(e =>
				this._hook[e].map(h =>
					new Promise(res =>
						setImmediate(async() => res(await h?.(this, ...A)))
					)
				)
			)
			.flat()
		)
	},
	hook(event, cb) {
		if (! this._hook[event]) this._hook[event] = []
		this._hook[event].push(cb)
		return this
	},
	_wrong(sit, ...A) {
		const s = this.wrong_usage[sit](...A)
		if (flag.interactive) Warn(s)
		else {
			Div("wrong usage", 0, 2)
			Err(s)
		}
		return this
	},
	o: {},
	async parse(raw) {
		if (! raw?.length) raw = process.argv.slice(2)

		let mod = this.opt ? "opt" : "cmd",
			opt_n, opt_t, opt_m, cmd_n, arg_i, arg_res, arg = []
		for (let i = 0; i < raw.length; i++) {
			let tk = raw[i]
			switch (mod) {
			case "opt":
				const bang = tk.endsWith("!")
				let n = tk.replace(/!$/, "").match(/^-{1,2}([^-]+)/)?.[1]
				const o = this._find_opt(n)
				if (! o) {
					if (tk !== "--") i --
					mod = "cmd"
					continue
				}

				[ opt_n, [ , [ opt_t, opt_m ] ] ] = o
				if (bang && opt_t !== "boolean") return this._wrong("illegal_bang", opt_n)

				if ([ "null", "boolean" ].includes(opt_t))
					this.o[opt_n] = bang ? ! this.o[opt_n] : true
				else mod = "opt_arg"
				break
			case "opt_arg":
				switch (opt_t) {
				case "string":
					break
				case "number":
					tk = + tk
					break
				}
				this.o[opt_m ?? opt_n] = tk
				mod = "opt"
				break
			case "cmd":
				const c = this._find_cmd(tk)
				if (! c) return this._wrong("unknown_cmd", tk);
				[ cmd_n ] = c
				arg_i = this.info[cmd_n][2]
				mod = "cmd_arg"
				break
			case "cmd_arg":
				const arg_i_now = arg_i[arg.length]
				if (Is.udf(arg_res)) {
					if (! arg_i_now) return this._wrong("too_many_args", cmd_n)
					if (arg_i_now.endsWith("_")) arg_res = arg.length
				}
				arg.push(tk)
				break
			}
		}

		if (arg.length < arg_i.req) return this._wrong("too_few_args", cmd_n, arg_i.req)

		if (Is.num(arg_res)) arg.push(arg.splice(arg_res))
		if (! flag.interactive) cmd_n ??= "help"
		await this.trigger("run", cmd_n, raw)
		await this.cmd[cmd_n]?.(...arg)

		return this
	}
})

const cli = {}

cli.g = wargs("g")
	.init({
		has_option: true,
		wrong_usage: {
			unknown_cmd: cmd_n => `Unknown command \`${cmd_n}\`. Use \`help\` to get usage.`,
			too_many_args: cmd_n => `Too many arguments for \`${cmd_n}\`. Use \`help ${cmd_n}\` to get usage.`,
			too_few_args: (cmd_n, req) => `Too few arguments for \`${cmd_n}\`, required ${req}. `
				+ `Use \`help ${cmd_n}\` to get usage.`,
			illegal_bang: opt_n => `Option \`${opt_n}\` is not a boolean one, so it cannot have a bang \`!\``
		}
	})
	.help({ themes: info.t, extra: `
CONTACT

GitHub Issue         <https://github.com/ForkFG/TerminalXbqg/issues>
Email                <fork_killet@qq.com>

RELAVANT

?                    -> this
!?                   -> interactive instructions
?data                -> data files
?setting             -> the configuration
`		})
	.hook("run", async(C, cmd, raw) => {
		if (C.o.version) {
			Log("xbqg " + version)
			process.exit(0)
		}

		logger.opt.noColor = flag.plain
		if (flag.interactive) rln.rePrompt()

		if (flag.lauch) {
			flag.lauch = false
			
			if (! (
				p_data = C.p_data ?? process.env.XBQG_DATA?.replace(/\/$/, "")
			)) {
				if (cmd === "help") return
				Div("lauch", 0, 2)
				Err(
					"Please set the environment variable `$XBQG_DATA` to a non-root dir.\n" +
					"Or use `xbqg --path <p_data>` to assign it."
				)
			}

			// Note: Touch data files.
			for (let fn in c_dft)
				if (! fs.existsSync(`${p_data}/${fn}.json`))
					c.write(fn, c_dft[fn])
			c.read("setting")

			// Note: Load user-defined hooks.
			c.setting.hooks?.filter(h => h?.on)?.forEach(h =>
				C.hook(h.event,  async() => C._hook._execute(h))
			)
		}

		history_save(raw.join(" "))
	})
cli.i = wargs("i")
	.init({
		wrong_usage: {
			unknown_cmd: cmd => `Unknown instruction \`${cmd}\`. Use \`! help\` to get usage.`,
			too_many_args: cmd => `Too many arguments for \`${cmd}\`. Use \`! help ${cmd}\` to get usage.`
		}
	})
	.help({ extra: "Interactive instruction starts with a bang \`!\`." })
	.hook("run", (_, __, raw) => history_save("!" + raw.join(" ")))
cli.parse_ln = async ln =>
	await cli[ ln[0] === "!" ? "i" : "g" ].parse(ln.replace(/^!/, "").split(" "))

// :: Ugly IIAFE

; (async() => await cli.g.parse())()

