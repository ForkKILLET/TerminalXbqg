#!/bin/env node

// :: Dep

const version		= "4.5.1"

const fs			= require("fs")
const execa			= require("execa")
const open			= require("open")
const readline		= require("readline")
const {
	Is, Cc, ski,
	sleep, httpx, exTemplate: ext, serialize,
	Logger
}					= require("fkutil")

const l				= Logger({ noColor: false }).bind()
l.debug				= (...msg) => flag.debug && l.log(l.hili("xbqg% "), ...msg)

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
			else if (create) l.err("Path type conflicted.")
		}

		else if (Is.udf(o)) {
			if (create) o = pa_o[pa_k] = t ? {} : []
			else l.err("Path includes undefined.")
		}
		else if (create) l.err("Path type conflicted.")

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
		l.debug(`read ${n}`)
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
		l.debug(`write ${n}`)
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
	fetch:				[ [ "f",	"."		], [ "Fetch a page by specific <page> id." ] ],
	source:				[ [ "s",	".="	], [ "Modify the active [source]. Prefix matching is OK.",
												 "Show the active source when no argument is given." ] ],
	fetch_prev:			[ [ "p",	"["		], [ "Fetch the <prev>ious page." ] ],
	fetch_curr:			[ [ "c",	"="		], [ "Fetch the <curr>ent page." ] ],
	fetch_next:			[ [ "n",	"]"		], [ "Fetch the <next> page." ] ],
	around:				[ [ "a",	"-"		], [ "Show around information,",
												 "i.e. current title and page id of prev, curr, next." ] ],
	book_show:			[ [ "bs",	"@-"	], [ "Show your bookcase." ] ],
	book_mark:			[ [ "bm",	"@+"	], [ "Add the current page to your bookcase and give it a <name>.",
												 "Update when the book already exists." ] ],
	book_remove:		[ [ "br",	"@="	], [ "Remove a <name>d book." ] ],
	book_fetch:			[ [ "b",	"@"		], [ "Fetch the page you read before of a <name>d book in your bookcase.",
												 "Prefix matching is OK." ] ],
	book_browse:		[ [ "bb",	"@!"	], [ "Open the current page in your browser" ] ],
	config:				[ [ "c",	"%"		], [ "Print the whole configuration when no arguments is given.",
												 "Print a specific item by the given JSON <path>.",
												 "e.g. `config a.b[42].c`",
												 "Delete the specific item.",
												 "e.g. `config i.dont.want.it undefined` or `config me.too /`",
												 "Modify the specific item. When <action> is `=`, <value> is string.",
												 "e.g. `config a.boolean true` and",
												 "     `config a.string = true` or `config a.string \\\"true\\\"`" ] ],
	config_edit:		[ [ "ce",	"%!"	], [ "Edit a configuration JSON [file] by your %editor.",
												 "In default, `setting.json`." ] ],
	config_reset:		[ [ "cr",	"%="	], [ "Reset your configuration to the default in 5 seconds.",
												 "The task is immediately done when `!` is given.",
												 "Just reset the specific <path> of the configuration without delaying." ] ],
	pagewarner_stat:	[ [ "ps",	"^"		], [ "Show today's pagewarner information using a progress bar." ] ],
	pagewarner_diff:	[ [ "pd",	"^-"	], [ "Show pagewarner difference among days using a bar chart." ] ],
	interactive:		[ [ "i",	"!"		], [ "Enter nteractive-mode." ] ],
	history:			[ [ "hi",	"~"		], [ "Show history." ] ],
	history_reset:		[ [ "hr",	"~="	], [ "Reset history." ] ],
	hook:				[ [ "k",	"/"		], [ "Trigger a <name>d hook manually." ] ],
	hook_show:			[ [ "ks",	"/-"	], [ "Show your hooks." ] ],
	hook_toggle:		[ [ "kt",	"/="	], [ "Toggle a <name>d hook." ] ],
	help:				[ [ "h",	"?"		], [ "Show help of the given <theme> or command name.",
												 "Show usage when no arguments is given."] ],
}
info.i = {
	exit:		[ [ "e",	"!"	], [ "Exit interactive-mode." ] ],
	clear:		[ [ "c",	"-" ], [ "Clear the console." ] ],
	eval:		[ [ "v",	"+"	], [ "Run Javascript code." ] ],
	shell:		[ [ "s",	"$"	], [ "Run command in shell." ] ],
	help:		[ [ "h",	"?" ], [ "Show help of the given <theme> or command name." ] ],
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
` + `
editor: string <- config_edit
# the editor for opening your data files

interactive <- interactive
    prompt: string
    # what to display before your cursor in interactive-mode
    forceClearCommand: string <- !clear !
    # the command for clearing the console history instead of the current screen
    allowXbqgPrefix: boolean
    # whether to allow commands like \`xbqg ]\`
    # helpful when you aren't used to interactive-mode
    allowComplete: boolean
    # whether to complete the command when pressing tab

pagewarner <- pagewarner*
    warnNum: integer
    # how much pages you decided to read every day at most
    onlyWarnAfterFetching <- hook anti-addiction
    # whether display the pagewarner when only you reach the \`warnNum\`
    progressStyle
        stat <- pagewarner_stat
            length: integer
            fommat: string
        diff <- pagewarner_diff
            length: integer
            fommat: string

source
    active: string
    # what source to use now among the \`list\`
    autoSwitching: boolean <- book_fetch
    # whether automatically switch the source to the first available one of a book
    list
        [source]
            url: string
            matcher
                [matcher]
                    necessary: boolean
                    from: string
                    regexp: regexp
            replacer: array
                []: array
                    0: string
                    1: string
            matchKeyInAround: regexp

history <- history*
    on: boolean
    # whether to store commands to history
    loadToInteractive: integer
    # how much commands to load to interactive-mode history

hooks: array
    []
        on: boolean <- hook_toggle
        name: string
        event: array
            []: string
            # when to trigger this hook
        action: array
            []: string
            # a whole command, can be interactive

RELAVANT

?data                -> where to store
?config              -> commands to operate the configuration
?config_reset        ~~
?config_edit         ~~
`
	.replace(/(?<=: )[a-z]+/g, s => l.hili(s))
	.replace(/(?<=^ *)[a-zA-Z\[\]]+/gm, l.bold)
	.replace(/(?<=# ).+$/gm, s => l.hili(s, 3))
}

const cmd = {}
const fetch_alias = name => async() => {
	l.div("page info", 0, 1)

	c.read("around")
	const page = c.around[c.setting?.source?.active]?.[name]

	if (page) {
		c.read("pagewarner")
		const today = new Date().format("yyyymmdd")
		if (Is.udf(c.pagewarner[today])) c.pagewarner[today] = 0
		else c.pagewarner[today] += ski(name, { prev: -1, curr: 0, next: +1 })
		c.write("pagewarner")

		l.log(`${name}: ${page}`)
		await cmd.g.fetch(page)
	}
	else {
		l.log(`${name}: null`)
		l.div("EOF", 0, 1)
	}
}
const history_save = ln => {
	if (c.setting?.history?.on) {
		c.read("history")
		c.history.push(ln)
		c.write("history")
	}
}
const interactive_completer = ln => {
	const bang = ln[0] === "!", cmd_n = ln.replace(/^!/, "")
	const s = []
	if (! ln.includes(" ") && ln.trim())
		Object.entries(info[ bang ? "i" : "g" ])
			.forEach(([ k, v ]) => s.push(
				[ k, ...v[0] ].find(n => n.startsWith(cmd_n))
			)
		)
	return [
		s.filter(n => n).map(n => (bang ? "!" : "") + n),
		ln
	]
}

cmd.g = {
	fetch: async(page) => {
		l.div("fetch", 0, 2)
		if (! page) l.err("Page can't be null.")

		const s = c.setting?.source?.active, src = c?.setting?.source?.list[s]
		const g = c.setting?.source?.list?.global
		const matcher = Object.assign({}, g.matcher, src.matcher ?? {})
		const replacer = g.replacer.concat(src.replacer ?? [])
		const blocks = {}

		try {
			blocks.html = await httpx.get(ext(src.url, { page }),
				{ headers: { "User-Agent": "xbqg/" + version } }
			)
		}
		catch (err) {
			if (Is.num(err)) l.log("Unexpected response code " + err + "." + ski(
				err, {
					404: " Perhaps the given page is wrong.",
					502: " Perhaps the server go wrong. You may switch the source.",
					503: " Perhaps the server is busy. You may wait and retry later.",
					504: ski.q(503)
				}, "")
			)
			else l.err(err?.message ?? err)
		}

		for (let i in matcher) {
			const m = matcher[i]
			blocks[i] = blocks[m.from]?.match(RegExp(m.regexp))?.[m.group ?? 1]
			if (m.necessary && ! blocks[i])
				l.log(blocks), l.err(`Block "${i}" mismatched.\nsource name: "${s}"`)
		}

		for (let r of replacer)
			blocks.content = blocks.content.replace(RegExp(r[0], "g"), r[1])

		if (blocks.title.match(/^[3-5][01]\d+/))
			l.err(`HTTP error code: ${blocks.title}`)

		const chapterTitle = blocks.chapterName + " @ " + blocks.bookName
		l.log(chapterTitle)
		l.log(blocks.content)

		l.div("around", 1, 1)

		const a = {
			prev: blocks.prev,
			curr: page,
			next: blocks.next
		}
		l.log(JSON.stringify(a, null, 2))

		c.read("around")
		a.title = chapterTitle
		a.time = + new Date()
		c.around[s] = a

		c.write("around")

		l.div("EOF", 1, 1)
	},
	fetch_prev: fetch_alias("prev"),
	fetch_curr: fetch_alias("curr"),
	fetch_next: fetch_alias("next"),

	around: () => {
		l.div("around", 0, 2)

		c.read("around")
		l.log(c.around[c.setting?.source?.active])

		l.div("EOF", 1, 1)
	},

	source: (_src) => {
		if (_src) {
			l.div("source switch", 0, 1)

			_src = Object.keys(c.setting?.source?.list)?.find(n => n !== "global" && n?.startsWith(_src))
			
			if (_src) {
				c.setting.source.active = _src

				c.write("setting")
				l.log(`Switching source to \`${_src}\`.`)
			}
			else l.warn("Not found.")

			l.div("EOF", 0, 1)
		}
		else {
			l.div("source active", 0, 1)
			l.log(c.setting?.source?.active)
			l.div("EOF", 0, 1)
		}
	},

	book_show: () => {
		l.div("book show", 0, 2)
		// TODO: better display
		l.log(c.read("books"))
		l.div("EOF", 1, 1)
	},
	book_mark: (_bang, _name) => {
		c.read("around")
		c.read("books")

		const s = c.setting?.source?.active
		const re = RegExp(c.setting?.source?.list[s]?.matchKeyInAround)
		const key = c.around[s]?.curr.match(re)[1]

		if (! key)
			if (! _bang) l.err("No around is found.")
			else return

		l.div("book mark", 0, 2)

		let newBook = false
		for (let i in c.books)
			if (c.books[i][s]?.curr.match(re)[1] === key) {
				newBook = false
				_name = i
			}

		if (newBook && ! _name)
			l.err("Book name can't be null when adding new book.")
		if (! c.books[_name]) c.books[_name] = {}
		c.books[_name][s] = c.around[s]

		c.write("books", c.books)
		l.log(newBook ? "Added." : "Updated.")
		l.div("EOF", 1, 1)
	},
	book_remove: (name) => {
		l.div("book remove")
	},
	book_fetch: async(name) => {
		l.div("book fetch", 0, 1)

		if (! name) l.err("Book name can't be null.")
		c.read("books")

		name = Object.keys(c.books).find(n => n.startsWith(name))

		if (name) {
			const a = c.books[name]
			let s = c.setting?.source?.active
			if (! a[s] && c.setting?.source?.autoSwitching) {
				c.setting.source.active = s = Object.keys(a ?? {})[0]
				l.log(`Auto switching source to \`${s}\`.`)
				c.write("setting")
			}
			l.log(`Fetching book \`${name}\`.`)
			await cmd.g.fetch(a[s].curr)
		}
		else {
			l.warn("Not found.")
			l.div("EOF", 0, 1)
			return
		}
	},
	book_browse: () => {
		l.div("book browse", 0, 2)

		c.read("around")

		const s = c.setting?.source?.active, src = c?.setting?.source?.list[s]
		const browser = c.setting?.browser

		if (! c.around[s]) l.warn("Not found.")

		else {
			const url = ext(src.url, { page: c.around[s].curr })
			l.log("Running " + l.hili(`${browser ?? "browser"} ${url}`))
			open(url, { app: { name: browser } })

			l.log("Done.")
		}
		l.div("EOF", 1, 1)
	},

	config: (_path, _action, _val_) => {
		if (! _path) {
			l.div("config read all", 0, 2)
			l.log(c.setting)
			l.div("EOF", 1, 1)
		}
		else {
			const create = !! _action
			l.div(create ? "config write" : "config read", 0, 2)

			let val; try {
				val = [ "undefined", "/" ].includes(_action + "")
					? undefined
					: JSON.parse(_action === "=" ? `"${ _val_.join(" ") }"` : _action)
			}
			catch {
				l.err("Illegal JSON value.")
			}

			const r = objectPath(c.setting, _path, create, val)

			c.write("setting", c.setting)
			l.log(r)

			l.div("EOF", 1, 1)
		}
	},
	config_edit: async(_file) => {
		const path = p_data + "/" + (_file ?? "setting") + ".json"
		const editor = ext(c.setting?.editor, { path })

		l.div("config edit", 0, 2)
		l.log("Running " + l.hili("$ " + editor))

		try {
			if (flag.interactive) rln.pause()
			await execa.command(editor, std)
			if (flag.interactive) rln.resume()
		}
		catch {}

		l.log(`Done.`)
		l.div("EOF", 1, 1)
	},
	config_reset: async(_bang, _path) => {
		l.div("config reset", 0, 2)

		if (! _path && ! _bang) {
			l.warn("The default setting will be restored in 5 seconds.")
			await sleep(5000)
		}

		l.log("Reseting.")

		if (_path) {
			const dft = objectPath(c_dft.setting, _path, false)
			objectPath(c.setting, _path, true, dft)
			l.log("\n%o\n", dft)
			c.write("setting")
		}

		else {
			c.write("setting", c_dft.setting)
		}
		l.log("Done.")
		l.div("EOF", 1, 1)
	},

	pagewarner_stat: () => {
		c.read("pagewarner")

		const today = new Date().format("yyyymmdd")
		const n = c.pagewarner[today] ?? 0, m = c.setting?.pagewarner?.warnNum

		l.div("pagewarner stat", 0, 2)
		if (n <= m) {
			if (c.setting?.pagewarner?.onlyWarnAfterFetching === true) return

			l.log(`Reading progress today: [${n} / ${m}]`)
			l.log(`${m - n} page${m - n <= 1 ? "" : "s"} left.`)
			const L = c.setting?.pagewarner?.progressStyle?.stat?.length
			let nc = parseInt(n / m * L)
			if (nc < 0) nc = 0
			l.extlog(
				c.setting?.pagewarner?.progressStyle?.stat?.fommat,
				"setting.pagewarner.progressStyle.stat.fommat", {
					progress: ($, f, b) =>
						l.hili(Cc(f, $.param(0, "fore")).char().r.repeat(nc)) +
						Cc(b, $.param(1, "back")).char().r.repeat(L - nc),
					percent: (n / m).toPercent()
				}
			)
		}
		else {
			l.warn(`Reading progress today: [${n} / ${m}]`)
			l.warn(`${n - m} page${m - n <= 1 ? "" : "s"} more than the warning num!`)
			l.warn("Suggestion: stop now!")
		}
		l.div("EOF", 1, 1)
	},
	pagewarner_diff: () => {
		c.pagewarner = c.read("pagewarner")

		l.div("pagewarner diff", 0, 2)

		const l = c.setting?.pagewarner?.progressStyle?.diff?.length
		let m = l; for (let d in c.pagewarner) if (c.pagewarner[d] > m) m = c.pagewarner[d]

		for (let d in c.pagewarner) {
			const n = c.pagewarner[d]
			l.extlog(
				c.setting?.pagewarner?.progressStyle?.diff?.fommat,
				"setting.pagewarner.progressStyle.diff.fommat", {
					date: d,
					progress: (_, f) =>
						l.hili(Cc(f, _.param(0, "fore")).char().r.repeat(n / m * l)),
					number: n
				}
			)
		}

		l.div("EOF", 1, 1)
	},

	interactive: async() => {
		if (flag.interactive) {
			l.warn("Already in interactive-mode.")
			rln.prompt()
			return
		}

		l.div("interactive", 0, 2)
		l.log("Use `!help` to get usage of interactive instructions.")

		flag.interactive = true
		rln = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			completer: c.setting?.interactive?.allowComplete ? interactive_completer : undefined,
			removeHistoryDuplicates: true
		})
		rln.rePrompt = () => rln.setPrompt(ext(c.setting?.interactive?.prompt, { hili: s => l.hili(s) }))

		let n = c.setting?.history?.loadToInteractive
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

			if (c.setting?.interactive?.allowXbqgPrefix) ln = ln?.replace(/^xbqg /, "")

			await cli.parse_ln(ln)

			rln.prompt()
		})
		rln.on("close", () => l.div("EOI", 2, 1))
	},

	history: () => {
		l.div("history show", 0, 2)
		c.read("history")
		l.log(c.history.join("\n"))
		l.div("EOF", 1, 1)
	},
	history_reset: () => {
		l.div("history reset", 0, 2)

		l.log("Reseting.")
		c.write("history", c_dft.history)
		l.log("Done.")
		l.div("EOF", 1, 1)
	},

	hook: async(name) => {
		l.div("hook execute", 0, 1)

		await cli.g._hook._execute(cli.g._hook._find(name))

		l.div("EOH", 0, 1)
	},
	hook_show: () => {
		l.div("hook show", 0, 2)

		l.log(c.setting?.hooks)

		l.div("EOF", 1, 1)
	},
	hook_toggle: (name) => {
		l.div("hook toggle", 0, 1)
		
		const h =  cli.g._hook._find(name)
		if (! h) l.warn("Not found.")
		else {
			h.on = ! h.on
			c.write("setting")
			
			l.log(h.on ? "Enabled." : "Disabled.")
		}
		l.div("EOF", 0, 1)
	}
}
cmd.i = {
	exit: () => {
		rln.close()
		process.exit(0)
	},
	clear: async(_bang) => {
		if (_bang === "!")
			await execa.command(c.setting?.interactive?.forceClearCommand, std)
		else rln.write(null, { ctrl: true, name: 'l' })
	},
	eval: (code_) => {
		l.div("evaluate", 0, 1)
		try {
			l.log(eval(code_.join(" ")))
		}
		catch (e) {
			l.warn(e)
		}
		l.div("EOF", 0, 1)
	},
	shell: async(code_) => {
		l.div("shell", 0, 1)
		try {
			await execa.command(code_.join(" "), std)
		}
		catch {}
		l.div("EOF", 0, 1)
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
	  editor: "vim ${path}",
      browser: null,
	  interactive: {
	    prompt: "!{ hili | xbqg$ } ",
        forceClearCommand: "clear",
        allowXbqgPrefix: true,
        allowComplete: true
	  },
	  pagewarner: {
	    warnNum: 20,
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
	            regexp: /-(.+?) - 新笔趣阁$/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.*)-/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content">([^]+?)<\/div>/
	          },
	          around: {
	            necessary: true,
	            from: "html",
	            regexp: /=keypage;([^]+?)function keypage/
	          },
	          prev: {
	            necessary: false,
	            from: "around",
	            regexp: /prevpage="\/(.+?).html"/
	          },
	          next: {
	            necessary: false,
	            from: "around",
	            regexp: /nextpage="\/(.+?).html"/
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
	            regexp: /<div id="content">([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: true,
	            from: "",
	            regexp: /<a href="\/b\/(.+?).html">上一章<\/a>/
	          },
	          next: {
	            necessary: true,
	            from: "html",
	            regexp: /<a href="\/b\/(.+?).html">下一章<\/a>/
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
	            regexp: /\s*(.+?)_/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /_(.+?)_笔趣阁/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="chapter_con" class="chapter_con">([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: true,
	            from: "html",
	            regexp: /<a href="\/wapbook\/(.+?)\.html">上一章<\/a>/
	          },
	          next: {
	            necessary: true,
	            from: "html",
	            regexp: /<a href="\/wapbook\/(.+?)\.html">下一章<\/a>/
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
	            regexp: /_(.+?)小说在线阅读/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^ (.+?)_/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content">([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/book\/([0-9\/]+?).htm">上一章<\/a>/
	          },
	          next: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/book\/([0-9\/]+?).htm">下一章<\/a>/
	          }
	        },
	        replacer: [
	          [ /<p>/, "" ],
	          [ /<\/p>/, "\n" ],
	          [ /一秒记住，精彩小说无弹窗免费阅读！/, "" ]
	        ],
	        matchKeyInAround: /(.*)\//
	      },
          "tvbts": {
            url: "https://www.tvbts.com/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /_(.+?)_TVB小说网/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.+?)_/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content"[^]*?>([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/([0-9_\/]+?).html" target="_top" class="pre">/
	          },
	          next: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/([0-9_\/]+?).html" target="_top" class="next">/
	          }
	        },
            replacer: [
              [ /天才一秒记住本站地址：<a.+?<\/a>/, "" ],
              [ /<p style="font-size:16px;">[^]+$/, "" ],
              [ /转载请注明出处：<a.+?<\/a>/, "" ],
              [ /\S+?提示您：看后求收藏.+?，接着再看更方便。/, "" ],
              [ /《\S+?》来源：<a.+?<\/a>/, "" ]
            ],
	        matchKeyInAround: /(.*)\//
          },
          "bookben": {
            url: "https://www.bookben.net/read/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.+?)_/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.+?)_(.+)_书本网/
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="booktxt">([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: false,
	            from: "html",
	            regexp: /<a id="prev_url" href="\/read\/([0-9\/])+.html" class="block">/
	          },
	          next: {
	            necessary: false,
	            from: "html",
	            regexp: /<a id="next_url" href="\/read\/([0-9\/])+.html" class="block">/
	          }
	        }
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
        },
        {
          on: true,
          name: "auto-bookmark",
          event: [ "pre-book_fetch" ],
          action: [
            "book_mark !"
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
			const arg = this.info[n][3] =
				this.cmd[n].toString().match(/^(async)?\((.*)\)/)?.[2]?.split(", ").filter(s => s)
			arg.req = arg.reduce((x, s) => s.startsWith("_") ? x : x + 1, 0)
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
			l.div("help", 0, 2)

			let ext, txt = ""
			const cmd_head = (k, v) => [
				[ k, ...v[0] ].map(s => l.hili(s)).join(" | "),
				v[3].map(o => {
					const n = o.replace(/_$/, "...")
					return n[0] === "_"
						? "[" + l.hili(n.slice(1)) + "]"
						: "<" + l.hili(n) + ">"
				}).join(" ")
			]

			if (! _theme) {
				if (this.has_option) txt = "OPTIONS\n\n"
					+ l.table(Object.entries(this.opt).map(([ k, v ]) => {
						const bool = v[1][0] === "boolean"
						return [
							"--" + l.hili(k) +  " | -" + l.hili(v[0]) + (bool ? `[${ l.hili("!") }]` : ""),
							v[2] + (bool ? ", toggle with a bang `!`." : "")
						]
					}), [ 25 ])
					+ "\n\n"
				txt	+= "COMMANDS\n\n"
					+ l.table(
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
				else l.warn("Unknown command or theme.")
			}

			l.log(txt.replace(/(^|\n)[A-Z]+\n/g, l.bold))
			l.div("EOF", 1, 1)

			if (! flag.interactive) process.exit(0)
		}
		this._init_cmd([ "help" ])

		return this
	},
	_hook: {
		_find: name => c.setting?.hooks?.find(h => h?.name === name),
		_execute: async h => {
			if (! h) return
			if (flag.interactive || ! h?.interactive)
				for (let ln of h.action) await cli.parse_ln(ln, true)
		}
	},
	trigger(event, ...A) {
		if (! Is.arr(event)) event = [ event ]
		if (flag.debug) l.debug(`trigger ${ event.join(", ") }`)
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
		if (flag.interactive) l.warn(s)
		else {
			l.div("wrong usage", 0, 2)
			l.err(s)
		}
		return this
	},
	o: {},
	async parse(raw, is_hook) {
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
				if (bang && opt_t !== "boolean") return this._wrong("illegal_option_bang", opt_n)

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
				arg_i = this.info[cmd_n][3]
				mod = "cmd_arg"
				break
			case "cmd_arg":
				const arg_i_now = arg_i[arg.length]
				if (Is.udf(arg_res)) {
					if (! arg_i_now) return this._wrong("too_many_args", cmd_n)
					if (arg_i_now.endsWith("_")) arg_res = arg.length
				}
				if (arg_i === "_bang" && ! (tk = tk === "!")) i --
				arg.push(tk)
				break
			}
		}

		if (! flag.interactive && ! cmd_n) cmd_n = "help"
		else {
			if (arg.length < arg_i.req) return this._wrong("too_few_args", cmd_n, arg_i.req)
			if (Is.num(arg_res)) arg.push(arg.splice(arg_res))
		}
		if (! is_hook) await this.trigger("run", cmd_n, raw)
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
			illegal_option_bang: opt_n => `Option \`${opt_n}\` is not a boolean one, so it cannot have a bang \`!\``
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
			l.log("xbqg " + version)
			process.exit(0)
		}

		l.opt.noColor = flag.plain
		if (flag.interactive) rln.rePrompt()

		if (flag.lauch) {
			flag.lauch = false

			if (! (
				p_data = C.p_data ?? process.env.XBQG_DATA?.replace(/\/$/, "")
			)) {
				if (cmd === "help") return
				l.div("lauch", 0, 2)
				l.err(
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
			if (Is.arr(c.setting?.hooks))
				c.setting.hooks.filter(h => h?.on)?.forEach(h =>
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
cli.parse_ln = async (ln, is_hook) =>
	await cli[ ln[0] === "!" ? "i" : "g" ].parse(ln.replace(/^!/, "").split(" "), is_hook)

// :: Goodbye

cli.g.parse()

