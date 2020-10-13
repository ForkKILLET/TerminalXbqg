#!/Volumes/FORKUB/Safety/bin/node

// :: Import

const fs    = require("fs")
const execa = require("execa")
const {
    Is, Cc, ski,
    sleep, ajax, exTemplate: exT, serialize,
    Logger: {
        warn: Warn, errEOF: Err, log: Log,
        exTemplateLog: exTLog, hili: Hili, div: Div
    }
}           = require("fkutil") // TODO: refactor with it

// :: Tool

global.debug = false

function existFile(path) {
    return new Promise(resolve =>
        fs.exists(path, exist => resolve(exist))
    )
}
function readJSON(path, noParse) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, "utf8", (err, data) => {
            if (err) reject(err)
            else resolve(noParse
                ? data.toString()
                : JSON.parse(data.toString())
            )
        })
    })
}
function writeJSON(path, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, new Uint8Array(
            Buffer.from(Is.str(data)
                ? data
                : serialize(data, { regexp: true, indent: 2 })
            )
        ), "utf8", err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

async function readConfig(filename, noParse) {
    return await readJSON(`${p_data}/${filename}.json`, noParse)
}
async function writeConfig(filename, data) {
    return await writeJSON(`${p_data}/${filename}.json`, data)
}

// :: Script

const [ , , ...args ] = process.argv
let verb = args?.[0] ?? "help"

const p_data = process.env.XBQG_DATA.replace(/\/$/, "")
if (!p_data) {
    Div("init", 0, 2)
    Err("Please config the environment variable `XBQG_DATA` to a non-root dir.")
}

let arround, setting, pagewarner, books
const today = Date.fromTimeZone(+8).fommat("yyyymmdd")

function fetchAlias(name) {
    return async(_, source) => {
        Div("page info", 0, 1)

        arround = await readConfig("arround")
        const src = setting.source.active, page = arround[src]?.[name]

        if (page) {
            pagewarner = await readConfig("pagewarner")
            if (Is.udf(pagewarner[today])) pagewarner[today] = 0
            else pagewarner[today] += ski(name, { prev: -1, curr: 0, next: +1 })
            await writeConfig("pagewarner", pagewarner)

            Log(`${name}: ${page}`)
            await verbs.fetch(page, source, name === "curr")
        }
        else {
            Log(`${name}: null`)
            Div("EOF", 0, 1)
        }
    }
}

const verbs = {
    // :::: alias

    ":":    "fetch",            "f":    "fetch",
    ":=":   "source",           "s":    "source",

    "[":    "fetch_prev",       "fp":   "fetch_prev",
    "=":    "fetch_curr",       "fc":   "fetch_curr",
    "]":    "fetch_next",       "fn":   "fetch_next",
    "-":    "arround",          "a":    "arround",

    "@-":   "book_show",        "bs":   "book_show",
    "@+":   "book_mark",        "bm":   "book_mark",
    "@:":   "book_fetch",       "bf":   "book_fetch",

    "%":    "config",           "c":    "config",
    "%+":   "config_edit",      "ce":   "config_edit",
    "%=":   "config_reset",     "cr":   "config_reset",

    "^-":   "pagewarner_stat",  "ps":   "pagewarner_stat",
    "^=":   "pagewarner_diff",  "pd":   "pagewarner_diff",

    "?":    "help",             "h":    "help",

    // :::: work

    fetch: async(page, source, noArround) => {
        Div("fetch", 0, 2)

        if (! page) Err("Page can't be null.")

        const s = source ?? setting.source.active, src = setting.source.list[s]
        const g = setting.source.list.global
        const matcher = Object.assign(g.matcher, src.matcher ?? {})
        const replacer = g.replacer.concat(src.replacer ?? [])
        const blocks = {}

        try {
            blocks.html = await ajax(exT(src.url, { page }), src.charset)
        } catch (e) {
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
            else
                if (e.when === "RequestGet" && e.err.code === 'ENOTFOUND')
                    Err("Network went wrong. Please check your Wi-fi.")
        }

        for (let i in matcher) {
            const m = matcher[i]
            blocks[i] = blocks[m.from]?.match(RegExp(m.regexp))?.[m.group ?? 1]
            if (m.necessary && ! blocks[i])
                Err(`Block "${i}" mismatched.\nsource name: "${s}"`)
        }

        for (let r of replacer)
            blocks.content = blocks.content.replace(RegExp(r[0], "g"), r[1])

        if (blocks.title.match(/^[3-5][01]\d+/))
            Err(`HTTP error code: ${blocks.title}`)

        const chapterTitle = blocks.chapterName + " @ " + blocks.bookName
        Log(chapterTitle)
        Log(blocks.content)

        Div("arround", 1, 1)

        const a = {
            prev: blocks.prev,
            curr: page,
            next: blocks.next
        }
        Log(JSON.stringify(a, null, 2))

        arround = arround ?? await readConfig("arround")
        a.title = chapterTitle
        arround[s] = a

        if (noArround !== true) await writeConfig("arround", arround)

        await verbs.pagewarner_stat(setting.pagewarner.onlyWarnAfterFetching, true)

        Div("EOF", 1, 1)
    },

    source: async(source) => {
        if (source) {
            Div("source switch", 0, 1)

            setting.source.active = source
            await writeConfig("setting", setting)
            Log("Succeed.")

            Div("EOF", 0, 1)
        }
        else {
            Div("source active", 0, 1)
            Log(setting.source.active)
            Div("EOF", 0, 1)
        }
    },

    help: () => {
        Div("help", 0, 2)
        Warn("Nothing here, at least not now.")
        Div("EOF", 1, 1)
    },

    fetch_prev: fetchAlias("prev"),
    fetch_curr: fetchAlias("curr"),
    fetch_next: fetchAlias("next"),

    arround: async(source) => {
        Div("arround", 0, 2)

        arround = await readConfig("arround")
        Log(serialize(arround[source ?? setting.source.active], { indent: 2 }))

        Div("EOF", 1, 1)
    },

    book_show: async() => {
        Div("book show", 0, 2)
        // TODO: better display
        Log(await readConfig("books", true))
        Div("EOF", 1, 1)
    },

    book_mark: async(name) => {
        Div("book mark", 0, 2)

        arround = await readConfig("arround")
        books = await readConfig("books")

        const src = setting.source.active
        const re = RegExp(setting.source.list[src].matchKeyInArround)
        const key = arround[src]?.curr.match(re)[1]

        if (! key) Err("No arround is found.")

        let newBook = true
        for (let i in books)
            if (books[i][src]?.curr.match(re)[1] === key) {
                newBook = false
                name = i
            }

        if (newBook && ! name)
            Err("Book name can't be null when adding new book.")
        if (! books[name]) books[name] = {}
        books[name][src] = arround[src]

        await writeConfig("books", books)
        Log(newBook ? "Added." : "Updated.")
        Div("EOF", 1, 1)
    },

    book_fetch: async(name) => {
        Div("book fetch", 0, 1)

        if (! name) Err("Book name can't be null.")
        books = await readConfig("books")

        for (let i in books) if (i.startWith(name)) {
            const src = setting.source.active, a = books[i][src]
            if (a) {
                Log("Succeeded.")
                await verbs.fetch(a.curr, src)
            }
            else {
                Warn("Not found.")
                Div("EOF", 0, 1)
            }
        }
    },

    config: async(path, v1, v2) => {
        if (! path) {
            Div("config list global", 0, 2)
            Log(serialize(setting, { indent: 2 }))
            Div("EOF", 1, 1)
        }
        else {
            const W = !! v1
            Div(W ? "config write" : "config read", 0, 2)

            if (path[0] !== "." && path[0] !== "[") path = "." + path

            const rsit = path.matchAll(/\.([_a-zA-Z][0-9_a-zA-Z]*)|\[(\d+)]/g)
            let rs, s = setting, pa, key, paKey, keyT
            // a.b.c
            // s    pa      key
            // root null    a
            // a    root    b

            while (! (rs = rsit.next()).done) {
                keyT = !! rs.value[1]
                key = keyT ? rs.value[1] : Number(rs.value[2])

                if (Is.objR(s)) {
                    if (keyT ^ Is.array(s)) ;
                    else {
                        if (W) Err("Path type conflicted.")
                    }
                }

                else if (Is.udf(s)) {
                    if (W) s = pa[paKey] = keyT ? {} : []
                }
                else if (W) Err("Path type conflicted.")

                pa = s
                s = s[key]
                paKey = key
            }
            if (W) {
                pa[key] = [ "undefined", "x", "/" ].includes(v1)
                    ? undefined
                    : JSON.parse(v1 === "=" ? '"' + v2 + '"' : v1)
                await writeConfig("setting", setting)
            }
            Log(serialize(W ?pa[key]: s, { indent: 2 }))

            Div("EOF", 1, 1)
        }
    },

    config_edit: async(file) => {
        const path = process.env.XBQG_DATA + "/" + (file ?? "setting") + ".json"
        const editor = exT(setting.editor, { path })

        Div("config edit", 0, 2)
        Log("Running " + Hili("$ " + editor))

        try {
            await execa.command(editor, {
                stdin: process.stdin, stdout: process.stdout, stderr: process.stderr
            })
        } catch {}

        Log(`Done.`)
        Div("EOF", 1, 1)
    },

    config_reset: async(now) => {
        Div("config reset", 0, 2)

        if (now !== "now") {
            Warn("The default setting will be restored in 5 sec.")
            await sleep(5000)
        }

        Log("Reseting.")
        await writeConfig("setting", configDft.setting)
        Log("Done.")
        Div("EOF", 1, 1)
    },

    pagewarner_stat: async(onlyWarn, afterFetching) => {
        pagewarner = pagewarner ?? await readConfig("pagewarner")

        const n = pagewarner[today] ?? 0, m = setting.pagewarner.warnNum

        Div("pagewarner stat", 0, 2)
        if (n <= m) {
            if (onlyWarn === true) return

            Log(`Reading progress today: [${n} / ${m}]`)
            Log(`${m - n} page${m - n <= 1 ? "" : "s"} left.`)
            const l = setting.pagewarner.progressStyle.stat.length
            const nc = parseInt(n / m * l)
            exTLog(
                setting.pagewarner.progressStyle.stat.fommat,
                "setting.pagewarner.progressStyle.stat.fommat", {
                    progress: (_, f, b) =>
                        Hili(Cc(f, _.param(0, "fore")).char().r.repeat(nc)) +
                        Cc(b, _.param(1, "back")).char().r.repeat(l - nc),
                    percent: (n / m).toPercent()
                }
            )
        }
        else {
            Warn(`Reading progress today: [${n} / ${m}]`)
            Warn(`${n - m} page${m - n <= 1 ? "" : "s"} more than the warning num!`)
            Warn("Suggestion: stop now!")
        }
        if (! afterFetching) Div("EOF", 1, 1)
    },

    pagewarner_diff: async() => {
        pagewarner = pagewarner ?? await readConfig("pagewarner")

        Div("pagewarner diff", 0, 2)

        // TODO

        const l = setting.pagewarner.progressStyle.diff.length
        let m = l; for (let d in pagewarner) if (pagewarner[d] > m) m = pagewarner[d]

        for (let d in pagewarner) {
            const n = pagewarner[d]
            exTLog(
                setting.pagewarner.progressStyle.diff.fommat,
                "setting.pagewarner.progressStyle.diff.fommat", {
                    date: d,
                    progress: (_, f) =>
                        Hili(Cc(f, _.param(0, "fore")).char().r.repeat(n / m * l)),
                    number: n
                }
            )
        }

        Div("EOF", 1, 1)
    }
}

const configDft = {
  setting: {
    editor: "vi ${path}",
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
      active: "kenshuge",
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
          url: "https://www.xsbiquge.com/${page}.html",
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
            arround: {
              necessary: true,
              from: "html",
              regexp: /=keypage;([^]*?)function keypage/
            },
            prev: {
              necessary: false,
              from: "arround",
              regexp: /prevpage="\/(.*?).html"/
            },
            next: {
              necessary: false,
              from: "arround",
              regexp: /nextpage="\/(.*?).html"/
            }
          },
          matchKeyInArround: /(.*)\//
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
          matchKeyInArround: /(.*)\//
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
          matchKeyInArround: /(.*)_/
        }
      }
    }
  },
  arround: {},
  books: {},
  pagewarner: {}
}

// :: Beautiful Init

async function init() {
    for (let i in configDft)
        if (! await existFile(`${p_data}/${i}.json`))
            writeConfig(i, configDft[i])

    setting = await readConfig("setting")

    let done = false; while (!done) {
        switch (typeof verbs[verb]) {
            case "string":
                verb = verbs[verb]
                break
            case "function":
                await verbs[verb](...args.slice(1))
                done = true
                break
            default:
                Div("init", 0, 2)
                Err(`Unknown verb: ${verb}`)
        }
    }
}

init()

