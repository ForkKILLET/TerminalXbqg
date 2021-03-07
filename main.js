#!/bin/env node

// :: Dep

const fs			= require("fs")
const execa			= require("execa")
const readline		= require("readline")
const { Command }	= require("commander")
const {
	Is, Cc, ski,
	sleep, ajax, exTemplate: exT, serialize,
	Logger
}					= require("fkutil")

const logger = Logger().bind(), {
	warn: Warn, errEOF: Err, log: Log,
	exTemplateLog: exTLog, hili: Hili, div: Div
} = logger
const program = new Command("global"), program_i = new Command("interactive")
const std = {
	stdin: process.stdin, stdout: process.stdout, stderr: process.stderr
}

// :: Tool

const existFile = p => new Promise(resolve =>
	fs.exists(p, exist => resolve(exist))
)
const readJSON = (p, noParse) => new Promise((resolve, reject) =>
	fs.readFile(p, "utf8", (err, data) => err
		? reject(err)
		: resolve(noParse
			? data.toString()
			: JSON.parse(data.toString())
		)
	)
)
const writeJSON = (p, data) => new Promise((resolve, reject) =>
	fs.writeFile(p, new Uint8Array(
		Buffer.from(Is.str(data)
			? data
			: serialize(data, { regexp: true, indent: 2 })
		)
	), "utf8", err => err
		? reject(err)
		: resolve()
	)
)

// :: Logic

const c = {
	read: async(n, force) => {
		if (force && c[n]) return c[n]
		c[n] = await readJSON(`${p_data}/${n}.json`)
	},
	read_json: async(n) => await readJSON(`${p_data}/${n}.json`),
	write: async(n, data) => {
		if (data) c[n] = data
		await writeJSON(`${p_data}/${n}.json`, c[n])
	}
}
const today = new Date().format("yyyymmdd")
const flag = {
	pre: false,
	interactive: false,
	help: true
}
let options, p_data, rln

const info = {
	fetch:				[ [ ":",	"f"		], [ "Fetch a page by specific `page` id." ] ],
	source:				[ [ ":=",	"s"		], [ "Modify the active `source`. Prefix matching is OK.",
												 "Show the active `source` when no argument is given." ] ],
	fetch_prev:			[ [ "[",	"fp"	], [ "Fetch the `prev`ious page." ] ],
	fetch_curr:			[ [ "=",	"fc"	], [ "Fetch the `curr`ent page." ] ],
	fetch_next:			[ [ "]",	"n"		], [ "Fetch the `next` page." ] ],
	around:				[ [ "-",	"a"		], [ "Show `arround` information,",
												 "i.e. current title and `page` id of `prev`, `curr`, `next`." ] ],
	book_show:			[ [ "@-",	"bs"	], [ "Show your `bookcase`." ] ],
	book_mark:			[ [ "@+",	"bm"	], [ "Add the current page to your `bookcase` and give it a `name`.",
												 "Update when the book `name` already exists." ] ],
	book_fetch:			[ [ "@:",	"bf"	], [ "Fetch the page you read before of a named book in your `bookcase`.",
												 "Prefix matching is OK." ] ],
	config:				[ [ "%",	"c"		], [ "Print the whole configuration when no arguments is given.",
												 "Print a specific item by the given `JSON path`.",
												 "e.g. `xbqg c a.b[42].c`",
												 "Delete the specific item.",
												 "e.g. `xbqg c i.dont.want.it -` or `xbqg c me.too undefined`",
												 "Modify the specific item. Argument `=` turns the `value` into a string.",
												 "e.g. `xbqg c a.boolean true` and",
												 "     `xbqg c a.string = true` or `xbqg c a.string \\\"true\\\"`" ] ],
	config_edit:		[ [ "%+",	"ce"	], [ "Edit a configuration JSON file by your %`editor`.",
												 "In default, `setting.json`." ] ],
	config_reset:		[ [ "%=",	"cr"	], [ "Reset your configuration to the default in 5 seconds.",
												 "The task is immediately done when `now` is given." ] ],
	pagewarner_stat:	[ [ "^-",	"ps"	], [ "Show today's `pagewarner` information using a progress bar." ] ],
	pagewarner_diff:	[ [ "^=",	"pd"	], [ "Show `pagewarner` difference among days using a bar chart." ] ],
	interactive:		[ [ "!",	"i"		], [ "Enter the `interactive` mode." ] ],
	history:			[ [ "~",	"hi"	], [ "Show history." ] ],
	history_reset:		[ [ "~=",	"hr"	], [ "Reset history." ] ],
	help:				[ [ "?",	"h"		], [ "Show help of the given `theme` or `command name`.",
												 "Show usage when no arguments is given."] ],
}

const info_i = {
	exit:		[ [ "!",	"e"	], [ "Exit the interactive mode." ] ],
	clear:		[ [ "-",	"c" ], [ "Clear the console." ] ],
	eval:		[ [ "+",	"v"	], [ "Run Javascript code." ] ],
	help:		[ [ "?",	"h" ], [ "Show help of the given `theme` or `command name`." ] ],
}

const info_t = {
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
            charset: string
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

const fetch_alias = name => async() => {
	Div("page info", 0, 1)

	await c.read("around")
	const page = c.around[c.setting.source.active]?.[name]

	if (page) {
		await c.read("pagewarner")
		if (Is.udf(c.pagewarner[today])) c.pagewarner[today] = 0
		else c.pagewarner[today] += ski(name, { prev: -1, curr: 0, next: +1 })
		await c.write("pagewarner")

		Log(`${name}: ${page}`)
		await fun.fetch(page)
	}
	else {
		Log(`${name}: null`)
		Div("EOF", 0, 1)
	}
}

const fun = {
	fetch: async(page) => {
		Div("fetch", 0, 2)
		if (! page) Err("Page can't be null.")

		const s = c.setting.source.active, src = c.setting.source.list[s]
		const g = c.setting.source.list.global
		const matcher = Object.assign({}, g.matcher, src.matcher ?? {})
		const replacer = g.replacer.concat(src.replacer ?? [])
		const blocks = {}

		try {
			blocks.html = await ajax(exT(src.url, { page }), src.charset)
		}
		catch (e) {
			if (e.user) {
				if (e.type === "UnexpectResCode") Err(
					`Got an exception response code ${e.statusCode}.` + ski(
					e.statusCode, {
						404: " Perhaps the given page is wrong.",
						502: " Perhaps the server go wrong. You may switch the source.",
						503: " Perhaps the server is busy. You may wait and retry later.",
						504: ski.q(503)
					}, "")
				)
			}
			else if (e.when === "RequestGet" && e.err.code === 'ENOTFOUND')
				Err("Network went wrong. Please check your Wi-fi.")
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

		await c.read("around")
		a.title = chapterTitle
		a.time = + new Date()
		c.around[s] = a

		await c.write("around")

		await fun.pagewarner_stat(true)

		Div("EOF", 1, 1)
	},

	fetch_prev: fetch_alias("prev"),
	fetch_curr: fetch_alias("curr"),
	fetch_next: fetch_alias("next"),

	around: async() => {
		Div("around", 0, 2)

		await c.read("around")
		Log(serialize(c.around[c.setting.source.active], { indent: 2 }))

		Div("EOF", 1, 1)
	},
	
	source: async(_src) => {
		if (_src) {
			Div("source switch", 0, 1)

			_src = Object.keys(c.setting.source.list).find(n => n !== "global" && n.startWith(_src))
			
			if (_src) {
				c.setting.source.active = _src

				await c.write("setting")
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

	book_show: async() => {
		Div("book show", 0, 2)
		// TODO: better display
		Log(await c.read_json("books"))
		Div("EOF", 1, 1)
	},

	book_mark: async(_name) => {
		Div("book mark", 0, 2)

		await c.read("around")
		await c.read("books")

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

		await c.write("books", c.books)
		Log(newBook ? "Added." : "Updated.")
		Div("EOF", 1, 1)
	},

	book_fetch: async(name) => {
		Div("book fetch", 0, 1)

		if (! name) Err("Book name can't be null.")
		await c.read("books")

		name = Object.keys(c.books).find(n => n.startWith(name))
		const a = c.books[name]
		let s = c.setting.source.active
		if (a[s]) ;
		else if (c.setting.source.autoSwitching) {
			c.setting.source.active = s = Object.keys(a)[0]
			Log(`Auto switching source to \`${s}\`.`)
			await c.write("setting")
		}
		else {
			Warn("Not found.")
			Div("EOF", 0, 1)
			return
		}
		Log(`Fetching book \`${name}\`.`)
		await fun.fetch(a[s].curr)
	},

	config: async(_path, _action, _val) => {
		if (! _path) {
			Div("config list global", 0, 2)
			Log(serialize(c.setting, { indent: 2 }))
			Div("EOF", 1, 1)
		}
		else {
			const W = !! _action
			Div(W ? "config write" : "config read", 0, 2)

			if (_path[0] !== "." && _path[0] !== "[") _path = "." + _path

			const rsit = _path.matchAll(/\.([_a-zA-Z][0-9_a-zA-Z]*)|\[(\d+)]/g)
			let rs, o = c.setting, pa_o, k, pa_k, t
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
					if (t ^ Is.array(o)) ;
					else if (W) Err("Path type conflicted.")
				}

				else if (Is.udf(o)) {
					if (W) o = pa_o[pa_k] = t ? {} : []
				}
				else if (W) Err("Path type conflicted.")

				pa_o = o
				o = o[k]
				pa_k = k
			}
			if (W) {
				pa_o[k] = [ "undefined", "-" ].includes(_action)
					? undefined
					: JSON.parse(_action === "=" ? "\"" + _val + "\"" : _action)
				await c.write("setting", c.setting)
			}
			Log(serialize(W ? pa_o[k]: o, { indent: 2 }))

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

	config_reset: async(_now) => {
		Div("config reset", 0, 2)

		if (_now !== "!") {
			Warn("The default setting will be restored in 5 seconds.")
			await sleep(5000)
		}

		Log("Reseting.")
		await c.write("setting", c_dft.setting)
		Log("Done.")
		Div("EOF", 1, 1)
	},

	pagewarner_stat: async($after_fetching) => {
		await c.read("pagewarner")

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
		if ($after_fetching !== true) Div("EOF", 1, 1)
	},

	pagewarner_diff: async() => {
		c.pagewarner = await c.read("pagewarner")

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

		init_program({
			p: program_i, i: info_i, f: fun_i,
			h: "Interactive instruction starts with a bang \`!\`.",
			u: () =>
				Warn("Unknown interactive instruction. Use `!help`, `!h` or `!?` to get usage.")
		})

		Div("interactive", 0, 2)
		Log("Use `!help`, `!h` or `!?` to get interactive instruction usage.")
		
		flag.interactive = true
		rln = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: exT(c.setting.interactive.prompt, { hili: s => Hili(s) }),
			removeHistoryDuplicates: true
		})
		
		let n = c.setting.history.loadToInteractive
		if (n) {
			await c.read("history")
			rln.history = c.history.slice(- n).reverse()
		}

		rln.prompt()
		rln.on("line", async(cmd) => {
			if (! cmd.trim()) {
				rln.prompt()
				return
			}
			flag.help = true

			let p = program, s = cmd
			if (s[0] === "!") {
				s = s.slice(1)
				p = program_i
			}

			await p.parseAsync(s.split(" "), { from: "user" })
			
			if (c.setting.history.on) {
				c.history.push(cmd)
				await c.write("history")
			}

			rln.prompt()
		})
		rln.on("close", () => Div("EOI", 2, 1))
	},

	history: async() => {
		Div("history show", 0, 2)
		await c.read("history")
		Log(c.history.join("\n"))
		Div("EOF", 1, 1)
	},

	history_reset: async() => {
		Div("history reset", 0, 2)

		Log("Reseting.")
		await c.write("history", c_dft.history)
		Log("Done.")
		Div("EOF", 1, 1)
	}
}

const fun_i = {
	exit: () => {
		rln.close()
		process.exit(0)
	},
	clear: async(_force) => {
		if (_force === "!")
			await execa.command(c.setting.interactive.forceClearCommand, std)
		else rln.write(null, { ctrl: true, name: 'l' })
	},
	eval: (code) => {
		Div("evaluate", 0, 1)
		try {
			Log(eval(code))
		}
		catch (e) {
			Warn(e)
		}
		Div("EOF", 0, 1)
	}
}

const c_dft = {
	setting: {
	  editor: "vi ${path}",
	  interactive: {
	    prompt: "!{ hili | xbqg$ } ",
        forceClearCommand: "clear"
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
	        charset: "utf8",
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
	        charset: "gbk",
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
	        charset: "gbk",
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
	        charset: "gbk",
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
      }
	},
	history: [ "help" ],
	around: {},
	books: {},
	pagewarner: {}
}

// :: Init

const pre = async(pass) => {
	flag.pre = true

	options = program.opts()
	if (! options.color) logger.opt.noColor = true

	if (pass) return

	if (! (
		p_data = options.path ?? process.env.XBQG_DATA?.replace(/\/$/, "")
	)) {
		Div("pre", 0, 2)
		Err(
			"Please set the environment variable `$XBQG_DATA` to a non-root dir.\n" +
			"Or use `xbqg -p <p_data>` to assign it."
		)
	}

	for (let fn in c_dft)
		if (! await existFile(`${p_data}/${fn}.json`))
			await c.write(fn, c_dft[fn])
	await c.read("setting")
}

const init_program = ({ p, i, f, h, u }) => {
	f.help = async(_theme) => {
		if (! flag.help) return
		flag.help = false

		Div("help", 0, 2)

		let noPadding = false, extra

		const
			len = s => s.replace(/\x1B\[.+?m/g, "").length,
			pad = x =>  " ".repeat(noPadding === true ? 1 : x),
			
			opt = o => {
				const value = o.flags.split(", ").map(f => f.replace(/[^-<>]/g, s => Hili(s))).join(" | ")
				return "\n" +
					value + " ".repeat(25 - len(value)) +
					o.description
			},
			cmd = c => {
				const
					argument = c._args.map(arg => {
						const n = Hili(arg.name + (arg.variadic ? "..." : ""))
						return arg.required ? "<" + n + ">" : "[" + n + "]"
					}).join(" ") || "-",
					alias = Hili(c._name) +
						(c._aliases.map(a => " | " + Hili(a)).join(""))
				return "\n" +
					alias + pad(30 - len(alias)) +
					argument + pad(25 - len(argument)) + (
					noPadding
						? "\n" + c.description()
						: c.description().replace(/\n/g, "\n" + pad(55))
					)
			}

		if (! _theme || _theme.error) Log(
			(p === program ? "OPTIONS\n" + p.options.map(opt).join("") + "\n\n" : "") +
			"COMMANDS\n" + p.commands.map(cmd).join("") +
			"\n" + h.replace(/<(.+?)>/g, (_, s) => "<" + Hili(s) + ">")
		)
		else if (extra = info_t[_theme]) {
			Log(_theme.toUpperCase() + "\n" + extra)
		}
		else {
			let id
			Object.entries(i).forEach((v, k) => {
				const i = [ v[0], ...v[1][0] ].indexOf(_theme)
				if (i >= 0) id = k
			})
			noPadding = true
			if (Is.num(id)) Log("COMMAND\n" + cmd(p.commands[id]))
			else Warn("Unknown command or theme.")
		}
		Div("EOF", 1, 1)
		
		if (! flag.interactive) process.exit(0)
	}

	for (let n in i) {
		i[n].push(f[n].toString().match(/^(async)?\((.*)\)/)?.[2])

		f[n] = new Proxy(f[n], {
			apply: async(f, _, $) => {
				if (! flag.pre)
					await pre(n === "help")
				await f(...$)
				if (c.setting.history.on && ! flag.interactive) {
					await c.read("history")
					c.history.push(process.argv.slice(2).join(" "))
					await c.write("history")
				}
			}
		})
		
		p
			.command(n + (i[n][2]
				? i[n][2].split(", ").filter(p => p[0] !== "$")		// Note: Private parameter.
					.map(p => (p[0] === "_"
						? ` [${p.slice(1)}]`						// Note: Optional parameter.
						: ` <${p}>`									// Note: Necessary parameter.
					)).join(" ")
				: ""
			))
			.aliases(i[n][0])
			.description(i[n][1].join("\n"))
			.action(f[n])
			.helpOption(false)
	}

	p.help = f.help // Hack: Kill original help.

	p._unknownCommand = program.unknownCommand
	p.unknownCommand = () => {
		if (flag.interactive) u()
		else p._unknownCommand()
	}
}

init_program({
	p: program, i: info, f: fun,
	h: `
CONTACT

GitHub Issue         <https://github.com/ForkFG/TerminalXbqg/issues>
Email                <fork_killet@qq.com>

RELAVANT

?                    -> this
!?                   -> interactive instructions
?data                -> data files
?setting             -> the configuration
`,
	u: () => Warn("Unknown command. Use `help`, `h` or `?` to get usage.")
})

program
	.helpOption(false)
	.version("3.2.1", "-v, --version")
	.option("-n, --no-color", "disable colored output")
	.option("-p, --path <p_data>", "assign data path, override `$XBQG_DATA`.")
	.parse(process.argv)

