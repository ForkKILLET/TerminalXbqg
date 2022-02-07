#!/bin/env node

// :: Dep

const version = "4.10.6"

const fs			= require("fs")
const execa			= require("execa")
const open			= require("open")
const readline		= require("readline")
const {
	Is, Cc, ski,
	httpx, exT: ext, serialize,
	Logger
}					= require("fkutil")
const dayjs			= require("dayjs").extend(require("dayjs/plugin/relativeTime"))

const l = Logger({
	noColor: false,
	dftTem: {
		black: (_, s) => l.hili(s, 0),
		red: (_, s) => l.hili(s, 1),
		green: (_, s) => l.hili(s),
		yellow: (_, s) => l.hili(s, 3),
		blue: (_, s) => l.hili(s, 4),
		magenta: (_, s) => l.hili(s, 5),
		cyan: (_, s) => l.hili(s, 6),
		white: (_, s) => l.hili(s, 7),
		bold: (_, s) => l.bold(s)
	}
}).bind()
l.debug	= (...msg) => flag.debug && l.log(l.hili("xbqg%"), ...msg)
l.clearEOF = () => {
	if (l.opt.drop) return
	readline.moveCursor(std.stdout, 0, -1)
	l.log(" ".repeat(35))
	readline.moveCursor(std.stdout, 0, -1)
}

const std = {
	stdin: process.stdin, stdout: process.stdout, stderr: process.stderr
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
		if (! flag.readonly) fs.writeFileSync(p_file(n),
			new Uint8Array(Buffer.from(Is.str(c[n])
				? c[n]
				: serialize(c[n], { regexp: true, indent: 2 })
			)), "utf8")
		l.debug(`write ${n}`)
	}
}

const flag = {
	hook: true,
	throw: false,
	lauch: true,
	interactive: false,
	get debug() { return cli.g.o.debug ?? false },
	get plain() { return cli.g.o.plain ?? false },
	get readonly() { return cli.g.o.readonly ?? false },
	with: async (flag_, f) => {
		for (const n in flag_) [ flag[n], flag_[n] ] = [ flag_[n], flag[n] ]
		await f()
		for (const n in flag_) flag[n] = flag_[n]
	}
}
let p_data, rln
const p_file = n => `${p_data}/${n}.json`

const int_s = []

const info = require("./info")(l)

const cmd = {}

const int_sleep = sec => new Promise((res, rej) => {
	int_s.push(() => {
		clearTimeout(t)
		int_s.pop()
		rej("Interrupted.")
	})
	const t = setTimeout(() => {
		int_s.pop()
		res()
	}, sec * 1000)
})

const fetch_alias = name => async() => {
	l.div("page info", 0, 1)

	c.read("around")
	const a = c.around[c.setting.source.active]
	if (! a) throw "Around not found."

	const page = a[name]
	if (page) {
		c.read("pagewarner")
		const today = new Date().format("yyyy-mm-dd")
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
const find_src = src => {
	if (! src) throw "Source name is empty."
	const s = Object.keys(c.setting.source.list)
		?.find(n => n !== "global" && n?.startsWith(src))
	if (! s) throw "Source not found."
	return s
}
const find_book = (name, autoSwitching, src) => {
	if (! name) throw "Book name is empty."
	c.read("books")

	name = Object.keys(c.books).find(n => n.startsWith(name))
	if (src && src !== "all") src = find_src(src)

	if (name) {
		const book = c.books[name]
		let s = src ?? c.setting.source.active
		if (! book[s])
			if (! src && autoSwitching && c.setting.source.autoSwitching) {
				c.setting.source.active = s = Object.keys(book)[0]
				l.log(l.hiqt`Auto switching source to ${s}.`)
				c.write("setting")
			}
			else return [ name, undefined, s, book ]
		return [ name, book[s], s, book ]
	}
	return []
}
const history_save = ln => {
	if (c.setting.history.on) {
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
const use_corner_bracket = str => c.setting.source.useCornerBracket
	? str.replaceAll("“", "「").replaceAll("”", "」")
	: str

cmd.g = {
	fetch: async(page) => {
		l.div("fetch", 0, 2)
		if (! page) throw "Page can't be null."

		const s = c.setting.source.active, src = c.setting.source.list[s]
		const g = c.setting.source.list.global
		const matcher = { ...g.matcher, ...src.matcher }
		const replacer = g.replacer.concat(src.replacer ?? [])
		const blocks = {}

		try {
			const ac = new AbortController()
			int_s.push(() => ac.abort())
			blocks.html = await httpx.get(
				ext(src.url, { page }), {
					headers: { "User-Agent": "xbqg/" + version },
					signal: ac.signal
				}
			)
		}
		catch (err) {
			if (Is.num(err)) throw (l.hiqt`Unexpected response code ${err}.` + ski(
				err, {
					404: " Perhaps the given page is wrong.",
					502: " Perhaps the server go wrong. You may switch the source.",
					503: " Perhaps the server is busy. You may wait and retry later.",
					504: ski.q(503)
				}, "")
			)
			else {
				const msg = err.message ?? String(err)
				throw msg.endsWith(".") ? msg : msg + "."
			}
		}
		finally {
			int_s.pop()
		}

		for (let i in matcher) {
			const m = matcher[i]
			blocks[i] = blocks[m.from]?.match(RegExp(m.regexp))?.[m.group ?? 1] ?? null
			if (m.necessary && ! blocks[i]) {
				l.log(blocks)
				throw l.hiqt`Block ${i} mismatched.`
			}
		}

		for (let r of replacer)
			blocks.content = blocks.content.replace(RegExp(r[0], "g"), r[1])

		if (blocks.title.match(/^[3-5][01]\d+/))
			throw `Got HTTP error code: ${blocks.title}.`

		blocks.content = use_corner_bracket(blocks.content)
		const chapterTitle = use_corner_bracket(
			blocks.chapterName.trim() + " @ " + blocks.bookName.trim()
		)
		l.log(l.hili(chapterTitle, 3))
		l.log(blocks.content)

		c.read("around")
		const a = c.around[s] = {
			prev: blocks.prev,
			curr: page,
			next: blocks.next,
			title: chapterTitle,
			time: Date.now()
		}
		c.write("around")

		await cmd.g.around()

		return a
	},
	fetch_prev: fetch_alias("prev"),
	fetch_curr: fetch_alias("curr"),
	fetch_next: fetch_alias("next"),

	around: () => {
		l.div("around", 0, 2)

		c.read("around")

		const { prev, curr, next, title } = c.around[c.setting.source.active]
		l.extlog(
			c.setting.around.style.format,
			"around.style.format", {
				prev: prev ?? "null", curr, next: next ?? "null", title
			}
		)

		l.div("EOF", 1, 1)
	},

	source: (_src) => {
		if (_src) {
			l.div("source switch", 0, 1)

			_src = find_src(_src)

			c.setting.source.active = _src

			c.write("setting")
			l.log(l.hiqt`Switching source to ${_src}.`)

			l.div("EOF", 0, 1)
		}
		else {
			l.div("source active", 0, 1)
			l.log(l.hiqt`The active source is ${c.setting.source.active} now.`)
			l.div("EOF", 0, 1)
		}
	},

	book_show: () => {
		l.div("book show", 0, 2)
		const rows = Object.entries(c.read("books")).map(([ name, book ]) =>
			Object.entries(book).map(([
				src, { title, time, next, updated, unwatch }
			], k) => [
				k ? "" : l.bold(name),
				src,
				l.hili(title, 3),
				l.hili(c.setting.bookcase.style.useRelativeTime
					? dayjs(time).fromNow()
					: new Date(time).format("yyyy-mm-dd")
				),
				next
					? (updated ? l.hili("√") : "")
					: (unwatch ? l.hili("#", 5) : l.hili("*", 4))
			]
		)).flat()
		if (c.setting.bookcase.style.header)
			rows.unshift([ "name", "source", "title", "time", "watch" ].map(l.bold))
		l.log(l.table(
			rows,
			c.setting.bookcase.style.padding
		))
		l.div("EOF", 1, 1)
	},
	book_mark: (_bang, _name) => {
		c.read("around")
		c.read("books")

		const s = c.setting.source.active
		const re = RegExp(c.setting.source.list[s].matchKeyInAround)
		const key = c.around[s]?.curr.match(re)[1]

		if (! key)
			if (! _bang) throw "No around is found."
			else return

		l.div("book mark", 0, 2)

		let newBook = true
		for (let i in c.books)
			if (c.books[i][s]?.curr.match(re)[1] === key) {
				newBook = false
				_name = i
			}

		if (newBook && ! _name)
			throw "Book name can't be null when adding new book."
		const a = c.books[_name] ??= {}
		a[s] = { ...a[s], ...c.around[s], updated: undefined }

		c.write("books")
		l.log(newBook ? "Added." : "Updated.")
		l.div("EOF", 1, 1)
	},
	book_remove: async(_bang, _name, _src) => {
		l.div("book remove", 0, 2)

		let rm_f, rm_t, rm_l
		if (_name) {
			const [ n, a, s, book ] = find_book(_name, false, _src)

			if (n) {
				if (a) {
					rm_f = () => delete book[s]
					rm_t = 5
					rm_l = l.hiqt`Book ${n} in source ${s}`
				}
				else if (_src === "all") {
					rm_f = () => delete c.books[n]
					rm_t = 10
					rm_l = l.hiqt`Book ${n} in all sources`
				}
				else throw l.hiqt`Book ${n} not found in the active source.`
			}
			else throw "Book not found."
		}
		else {
			rm_f = () => c.books = {}
			rm_t = 20
			rm_l = l.bold("ALL") + " books"
		}

		if (! _bang) {
			l.log(`${rm_l} will be removed in ${rm_t} seconds.`)
			await int_sleep(rm_t)
		}

		l.log("Removing.")

		rm_f()
		c.write("books")
		l.log(_bang ? `${rm_l} is removed` : "Done.")
		l.div("EOF", 1, 1)
	},
	book_fetch: async(name) => {
		l.div("book fetch", 0, 1)

		const [ n, a ] = find_book(name, true)

		if (n) {
			if (a) {
				l.log(l.hiqt`Fetching book ${n}.`)
				await cmd.g.fetch(a.curr)
			}
			else {
				l.warn(l.hiqt`Book ${n} not found in the active source.`)
				l.div("EOF", 0, 1)
			}
		}
		else throw "Book not found."
	},
	book_browse: () => {
		l.div("book browse", 0, 2)

		c.read("around")

		const s = c.setting.source.active, src = c.setting.source.list[s]
		const browser = c.setting.browser

		if (! c.around[s]) throw "Around not found."

		else {
			const url = ext(src.url, { page: c.around[s].curr })
			l.log("Running " + l.hili(`${ browser ?? "browser" } ${url}`))
			open(url, { app: { name: browser } })

			l.log("Done.")
		}
		l.div("EOF", 1, 1)
	},

	watch: async() => {
		await cmd.g.book_show()

		l.clearEOF()
		l.log("Watching.")

		const check = [], updated = []
		let i = 0
		for (const n in c.books) for (const s in c.books[n]) {
			const a = c.books[n][s]
			if (! a.next && ! a.unwatch) check.push([ i, n, a, s ])
			i ++
		}

		const o_s = c.setting.source.active

		const lx = c.setting.bookcase.style.padding.reduce((a, c) => a + c, 0)
		for (let [ k, n, a, s ] of check) {
			const draw = ch => {
				readline.moveCursor(std.stdout, lx, - i + k - 2)
				l.logi(ch)
				readline.moveCursor(std.stdout, - lx - 1, i - k + 2)
			}

			const { characters, delay } = c.setting.bookcase.style.watchSpinner
			let sp_i = 0, sp_t = setInterval(() => {
				l.opt.drop = false
				draw(l.hili(characters[sp_i], 4))
				l.opt.drop = true
				if (++ sp_i === characters.length) sp_i = 0
			}, delay)

			l.opt.drop = true
			c.setting.source.active = s
			let err, res
			try {
				await flag.with({ throw: true, hook: false }, async() =>
					res = await cmd.g.fetch(a.curr)
				)
			}
			catch (e) { err = e }

			clearInterval(sp_t)
			l.opt.drop = false
			if (err) draw(l.hili("!", 1))
			else if (res.next) {
				draw(l.hili("√"))
				l.opt.drop = true

				updated.push([ n, a, s ])
				await cmd.g.book_mark(false)
				c.books[n][s].updated = true
				c.write("books")

				l.opt.drop = false
			}
			else draw(l.hili("x", 5))
		}

		c.setting.source.active = o_s
		c.write("setting")

		l.log(`Updated: [ ${updated.length} / ${check.length} ]`)
		l.div("EOF", 1, 1)
	},

	watch_toggle: (name, _src) => {
		l.div("watch toggle", 0, 2)

		const [ n, a, s, book ] = find_book(name, false, _src)
		let r
		if (n) {
			if (a) {
				r = a.unwatch = ! a.unwatch
			}
			else if (_src === "all") {
				for (const s in book) {
					const a = book[s]
					a.unwatch = r ??= ! a.unwatch
				}
			}
		}
		else throw "Book not found."

		c.write("books")
		l.log(`${ r ? "Disabled" : "Enabled" } in ` + (s === "all" ? l.bold("ALL") + " sources." : l.hiqt`${s} source.`))
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
				throw "Illegal JSON value."
			}

			const r = l.catch(() => Object.path(c.setting, _path, create, val))

			c.write("setting", c.setting)
			l.log(r)

			l.div("EOF", 1, 1)
		}
	},
	config_edit: async(_file) => {
		const path = p_data + "/" + (_file ??= "setting") + ".json"
		const editor = ext(c.setting.editor, { path })

		l.div("config edit", 0, 2)
		l.log("Running " + l.hili("$ " + editor))

		if (flag.interactive) rln.pause()
		await execa.command(editor, std)
		if (flag.interactive) rln.resume()

		c.read(_file)
		l.log(`Done.`)
		l.div("EOF", 1, 1)
	},
	config_reset: async(_bang, _path) => {
		l.div("config reset", 0, 2)

		if (! _path && ! _bang) {
			l.log("The default setting will be restored in 5 seconds.")
			await int_sleep(5)
		}

		l.log("Reseting.")

		if (_path) {
			const dft = l.catch(() => Object.path(c_dft.setting, _path, false))
			l.catch(() => Object.path(c.setting, _path, true, dft))
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

		const today = new Date().format("yyyy-mm-dd")
		const n = c.pagewarner[today] ?? 0, m = c.setting.pagewarner.warnNum

		l.div("pagewarner stat", 0, 2)
		if (n <= m) {
			if (c.setting.pagewarner.onlyWarnAfterFetching === true) return

			l.log(`Reading progress today: [${n} / ${m}]`)
			l.log(`${m - n} page${ m - n <= 1 ? "" : "s" } left.`)
			const L = c.setting.pagewarner.progressStyle.stat.length
			let nc = parseInt(n / m * L)
			if (nc < 0) nc = 0
			l.extlog(
				c.setting.pagewarner.progressStyle.stat.format,
				"pagewarner.progressStyle.stat.format", {
					progress: ($, f, b) =>
						l.hili(Cc(f, $.param(0, "fore")).char().r.repeat(nc)) +
						Cc(b, $.param(1, "back")).char().r.repeat(L - nc),
					percent: (n / m).toPercent()
				}
			)
		}
		else {
			l.warn(`Reading progress today: [${n} / ${m}]`)
			l.warn(`${n - m} page${ m - n <= 1 ? "" : "s" } more than the warning num!`)
			l.warn("Suggestion: stop now!")
		}
		l.div("EOF", 1, 1)
	},
	pagewarner_diff: () => {
		c.pagewarner = c.read("pagewarner")

		l.div("pagewarner diff", 0, 2)

		const L = c.setting.pagewarner.progressStyle.diff.length
		let m = L; for (let d in c.pagewarner) if (c.pagewarner[d] > m) m = c.pagewarner[d]

		for (let d in c.pagewarner) {
			const n = c.pagewarner[d]
			l.extlog(
				c.setting.pagewarner.progressStyle.diff.format,
				"pagewarner.progressStyle.diff.format", {
					date: d,
					progress: (_, f) =>
						l.hili(Cc(f, _.param(0, "fore")).char().r.repeat(n / m * L)),
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
			completer: c.setting.interactive.allowComplete ? interactive_completer : undefined,
			removeHistoryDuplicates: true
		})
		rln.rePrompt = () => rln.setPrompt(
			ext(c.setting.interactive.prompt, { hili: s => l.hili(s) })
		)

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

			if (c.setting.interactive.allowXbqgPrefix) ln = ln?.replace(/^xbqg /, "")

			await cli.parse_ln(ln)

			rln.prompt()
		})

		int_s.push(() => rln.close())
		rln.on("SIGINT", () => int_s.pop()())
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

		l.log(c.setting.hooks)

		l.div("EOF", 1, 1)
	},
	hook_toggle: (name) => {
		l.div("hook toggle", 0, 1)

		const h = cli.g._hook._find(name)
		if (! h) throw "Hook not found."
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
		process.exit()
	},
	clear: async(_bang) => {
		if (_bang)
			await execa.command(c.setting.interactive.forceClearCommand, std)
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
	version:	[ "v"	, [ "null"					], `show version.` ],
	plain:		[ "n"	, [ "boolean"				], `disable colored output` ],
	path:		[ "p"	, [ "string",	"p_data"	], `assign data path, override "${ l.hili("$XBQG_DATA", 3) }".` ],
	debug:		[ "d"	, [ "boolean"				], `enable debugging output` ],
	readonly:	[ "r"	, [ "boolean",				], `stop writing data to files` ]
}

const c_dft = require("./default_config.js")

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
			const f = this.cmd[n]
			this.cmd[n] = async (...p) => {
				await this.trigger([ "pre-" + n, "pre*" ], f, n)
				let res
				try {
					res = await f(...p)
				}
				catch (err) {
					if (flag.throw) throw err
					l.err(flag.debug ? err?.stack ?? err : err)
					l.div("EOE", 1, 1)
				}
				await this.trigger([ "post-" + n, "post*" ], f, n)
				return res
			}
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
						? "[" + l.hili(n === "_bang" ? "!" : n.slice(1)) + "]"
						: "<" + l.hili(n) + ">"
				}).join(" ")
			]

			if (! _theme) {
				if (this.has_option) txt = "OPTIONS\n\n"
					+ l.table(Object.entries(this.opt).map(([ k, v ]) => [
						"--" + l.hili(k) +  " | -" + l.hili(v[0]) + (v[1][0] === "boolean" ? `[${ l.hili("!") }]` : ""),
						v[1][1] ? `<${ l.hili(v[1][1]) }>` : "",
						v[2]
					]), [ 30, 25 ])
					+ `\n\nBoolean options can be toggled with "${ l.hili("!", 3) }".\n\n`
				txt	+= "COMMANDS\n\n"
					+ l.table(
						Object.entries(this.info).map(([ k, v ]) => {
							const tab = [ cmd_head(k, v) ]
							for (const i in v[1]) {
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
				const e = this._find_cmd(_theme)
				if (e) txt = "COMMAND\n\n" + cmd_head(...e).join(" ") + "\n" + e[1][1].join("\n")
				else l.warn("Unknown command or theme.")
			}

			l.log(txt.replace(/(^|\n)[A-Z]+\n/g, l.bold))
			l.div("EOF", 1, 1)

			if (! flag.interactive) process.exit()
		}
		this._init_cmd([ "help" ])

		return this
	},
	_hook: {
		_find: name => c.setting.hooks.find(h => h?.name === name),
		_execute: async h => {
			if (! h) return
			if (flag.interactive || ! h?.interactive) {
				if (h.clearEOF) l.clearEOF()
				for (let ln of h.action) await flag.with({ hook: false },
					() => cli.parse_ln(ln)
				)
			}
		}
	},
	trigger(event, ...A) {
		if (! flag.hook) return
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
			l.fatal(s)
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
				if (arg_i_now === "_bang" && ! (tk = tk === "!")) i --
				arg.push(tk)
				break
			}
		}

		if (! flag.interactive && ! cmd_n) {
			cmd_n = "help"
		}
		else if (cmd_n) {
			if (arg.length < arg_i.req) return this._wrong("too_few_args", cmd_n, arg_i.req)
			if (Is.num(arg_res)) arg.push(arg.splice(arg_res))
		}

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
			unknown_cmd: cmd_n => l.hiqt`Unknown command ${cmd_n}. Use ${"help"} to get usage.`,
			too_many_args: cmd_n => l.hiqt`Too many arguments for ${cmd_n}. Use ${ "help " + cmd_n } to get usage.`,
			too_few_args: (cmd_n, req) => `Too few arguments for ${cmd_n}, required ${req}. `
				+ l.hiqt`Use ${ "help " + cmd_n } to get usage.`,
			illegal_option_bang: opt_n => l.hiqt`Option ${opt_n} is not a boolean one, so it cannot have a bang ${"!"}`
		}
	})
	.help({ themes: info.t, extra: info.g_ex })
	.hook("run", async(C, cmd, raw) => {
		if (C.o.version) {
			l.log("xbqg/" + version)
			C.o.version = false
			if (! flag.interactive) process.exit()
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
				l.fatal(
					`Please set the environment variable "$XBQG_DATA" to a non-root dir.\n` +
					`Or use "xbqg --path <p_data>" to assign it.`
				)
			}

			// Note: Touch data files.
			for (let fn in c_dft)
				if (! fs.existsSync(`${p_data}/${fn}.json`))
					c.write(fn, c_dft[fn])
			c.read("setting")

			// Note: Load user-defined hooks.
			if (Is.arr(c.setting.hooks))
				c.setting.hooks.filter(h => h?.on).forEach(h =>
					C.hook(h.event,  async() => C._hook._execute(h))
				)
		}

		history_save(raw.join(" "))
	})
cli.i = wargs("i")
	.init({
		wrong_usage: {
			unknown_cmd: cmd => l.hiqt`Unknown instruction ${cmd}. Use ${"! help"} to get usage.`,
			too_many_args: cmd => l.hiqt`Too many arguments for ${cmd}. Use ${"! help ${cmd}"} to get usage.`
		}
	})
	.help({ extra: info.i_ex })
	.hook("run", (_, __, raw) => history_save("!" + raw.join(" ")))
cli.parse_ln = async ln =>
	await cli[ ln[0] === "!" ? "i" : "g" ].parse(ln.replace(/^!/, "").split(" "))

// :: Goodbye

cli.g.parse()

