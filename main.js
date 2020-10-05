#!/Volumes/FORKUB/Safety/bin/node

// :: Import

const fs    = require("fs")
const execa = require("execa")
const {
    Is, sleep, ajax
}           = require("fkutil") // TODO: refactor with it

// :: Tool

const debug = false

function Warn(...m) {
    console.warn(`\x1B[33m${m.join(" ")}\x1B[0m`)
}
function Err(...m) {
    m = `\x1B[31m${m.join(" ")}\x1B[0m`
    if (debug) throw m
    console.error(m)
    div("EOF", 1, 1)
    process.exit()
}
function Log(...m) { console.log(...m) }
function Hili(m) { return `\x1B[32m${m}\x1B[0m` }

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
                : JSON.stringify(data, null, 4)
            )
        ), "utf8", err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

// :: Script

const [ , , ...args ] = process.argv
let verb = args?.[0] ?? "help"
if (verb.match(/\d+_\d+\/\d+/)) {
    args[1] = verb
    verb = "fetch"
}

function div(t, u, d) {
    process.stdout.write(
        "\n".repeat(u ?? 1) +
        "-".repeat(10) +
        "=".repeat(5) + 
        (t ? ` \x1B[1;34m${t}\x1B[0m ` : "") +
        "=".repeat(5) +
        "-".repeat(10) +
        "\n".repeat(d ?? 1)
    )
}

const p_data = process.env.XBQG_DATA.replace(/\/$/, "")
if (!p_data) Err("xbqg: Please configure the environment variable `XBQG_DATA` to a non-root dir.")

let arround, setting

async function readConfig(filename, noParse) {
    const o = await readJSON(`${p_data}/${filename}.json`, noParse)
    if (o instanceof Error) Err(o)
    return o
}
async function writeConfig(filename, data) {
    const o = await writeJSON(`${p_data}/${filename}.json`, data)
    if (o instanceof Error) Err(o)
    return o 
}

function fetchAlias(name) {
    return async() => {
        div("page info", 0, 2)
        arround = await readConfig("arround")
        if (arround[name]) {
            Log(`${name}: ${arround[name]}`)
            verbs.fetch(arround[name])
        }
        else {
            Log(`${name}: null`)
            div("EOF", 1, 1)
        }
    }
}

const verbs = {
    // :::: alias

    ":":    "fetch",            "f":    "fetch",

    "[":    "fetch_prev",       "fp":   "fetch_prev",
    "=":    "fetch_curr",       "fc":   "fetch_curr",
    "]":    "fetch_next",       "fn":   "fetch_next",
    "-":    "arround",          "a":    "arround",

    "@-":   "book_list",        "bs":   "book_show",
    "@+":   "book_mark",        "bm":   "book_mark",
    "@:":   "book_fetch",       "bf":   "book_fetch",

    "%":    "config",           "c":    "config",
    "%+":   "config_edit",      "ce":   "config_edit",
    "%=":   "config_reset",     "cr":   "config_reset",

    "^-":   "pagewarner_stat",  "ps":   "pagewarner_stat",
    "^=":   "pagewarner_diff",  "pd":   "pagewarner_diff",
    
    "?":    "help",             "h":    "help",

    // :::: work

    fetch: async(page) => {
        page = page ?? args[1]
        if (!page) Err("fetch: Page can't be null.")

        const srcName = setting.sourceActive, src = setting.sources[srcName]
        const _html = await ajax(src.url.replace(/\$\{page\}/g, page))

        let _title = _html.match(/<title>(.*)<\/title>/)[1]
        if (_title.match(/^[3-5][01]\d+/))
            Err(`fetch: HTTP error code: ${_title}`)
        _title = _title.replace(/ - 新笔趣阁.*/, "").replace("-", " @ ")
        const _content = _html.match(/<div id="content">(.*)<\/div>/)[1]
            .replace(/<br[ ][/]>/g, "\n")
            .replace(/readx\(\);/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&nbsp;/g, " ")
        div("text", 1, 2)
        Log(_title, "\n", _content)

        div("arround", 1, 2)
        const
            _arround = _html.match(/=keypage;([\s\S]*)function keypage/)[1],
            _prev = _arround.match(/prevpage="\/(.*).html"/)?.[1],
            _next = _arround.match(/nextpage="\/(.*).html"/)?.[1],
            arround = {
                prev: _prev ?? null,
                curr: page,
                next: _next ?? null
            }
        Log(JSON.stringify(arround, null, 4) + "\n")
        
        arround.title = _title
        await writeConfig("arround", arround)

        const pagewarner = await readConfig("pagewarner")
        const today = Date.fromTimeZone(+8).fommat("yyyymmdd")
        // WwW: I don't think anyone can read these pages one day.
        const n = setting.pagewarner.warnNum ?? 0xffff

        if (pagewarner.date !== today) {
            pagewarner.date = today
            pagewarner.num = 0
        }
        else pagewarner.num++
        if (pagewarner.num >= n) {
            div("pagewarner", 0, 2)
            Warn(`You have reached the warning page number ${n}.\nPage now: ${pagewarner.num}.\nSuggestion: stop.\n`)
        }

        await writeConfig("pagewarner", pagewarner)

        div("EOF", 0, 1)
    },

    help: () => {
        div("help", 0, 2)
        Warn("Nothing here, at least not now.")
        div("EOF", 1, 1)
    },

    fetch_prev: fetchAlias("prev"),
    fetch_curr: fetchAlias("curr"),
    fetch_next: fetchAlias("next"),

    arround: async() => {
        div("arround", 0, 2)
        Log(await readConfig("arround", true) + "\n")
        div("EOF", 0, 1)
    },

    book_show: async() => {
        div("bookcase", 0, 2)
        // TODO: better display
        Log(await readConfig("books", true))
        div("EOF", 1, 1) 
    },

    book_mark: async() => {
        const arround = await readConfig("arround")
        const key = arround.curr.match(/(.*)\//)[1]
        const books = await readConfig("books")
        
        const newBook = ! books[key], nameOri = books[key].name
        books[key] = arround
        books[key].name = args[1] ?? nameOri
        await writeConfig("books", books)

        div("bookmark", 0, 1)
        Log(newBook ? "Added." : "Updated.")
        div("EOF", 0, 1)
    },

    book_fetch: async() => {
        const name = args[1]
        if (!name) Err("bookfetch: book name can't be null.")

        div("bookfetch", 0, 2)
        const books = await readConfig("books")
        for (let i in books) if (name === i || books[i].name?.startWith(name)) {
            Log("Succeeded.")
            await verbs.fetch(books[i].curr)
            return
        }
        Warn("Not found.")
        div("EOF", 1, 1)
    },

    config: async() => {
        if (args[1] == null) {
            div("config list global", 0, 2)
            Log(JSON.stringify(setting, null, 4))
            div("EOF", 1, 1)
        }
        else {
            const W = !! args[2]
            div(W ? "config write" : "config read", 0, 2)

            let path = args[1]
            if (path[0] !== "." && path[0] !== "[") path = "." + path

            const rsit = path.matchAll(/\.([_a-zA-Z][0-9_a-zA-Z]*)|\[(\d+)]/g)
            let rs, c = setting, pa, f = true, keyT, key, modify

            while (! (rs = rsit.next()).done) {
                keyT = !! rs.value[1]
                key = keyT ? rs.value[1] : Number(rs.value[2])
                if (Is.objR(c)) {
                    if ((keyT && ! Array.isArray(c))
                    || (!keyT && Array.isArray(c)))
                        pa = c, c = pa[key]
                    else {
                        if (W) Err("config: Path type conflicted.")
                        Log(undefined)
                        f = false; break
                    }
                }
                else if (c === undefined) W && (pa[key] = (keyT ? {} : []), c = pa[key])
                else W && Err("config: Path type conflicted.")
            }
            if (W) {
                pa[key] = [ "undefined", "/" ].includes(args[2])
                    ? undefined
                    : JSON.parse(args[2] === "=" ? '"' + args[3] + '"' : args[2])
                await writeConfig("setting", setting)

                modify = pa[key], pa[key] = "${config_modify}"
            }
            if (f) Log(JSON.stringify(W ? setting : c, null, 4)
                .replace(/"\$\{config_modify\}"/, Hili(JSON.stringify(modify)))
            )
            div("EOF", 1, 1)
        }
    },

    config_edit: async() => {
        const path = process.env.XBQG_DATA + "/" + (args[1] ?? "setting") + ".json"
        const editor = setting.editor.replace(/\$\{path\}/g, path)

        div("config edit", 0, 2)
        Log("Running " + Hili("$ " + editor))
        
        await execa.command(editor, {
            stdin: process.stdin, stdout: process.stdout, stderr: process.stderr
        })
        
        Log(`Done.`)
        div("EOF", 1, 1)
    },

    config_reset: async() => {
        div("config reset", 0, 2)
        Warn("The default setting will be restored in 5 sec.")
        await sleep(5000)

        Log("Reseting.")
        await writeConfig("setting", configDft.setting)
        Log("Done.")
        div("EOF", 1, 1)
    }
}

const configDft = {
    setting:        {
        editor: "vi ${path}",
        pagewarner: {
            warnNum: 0xffff
        },
        sourceActive: "xbqg",
        sources: {
            xbqg: { url: "https://www.xsbiquge.com/${page}.html", charset: "utf8" }
        }
    },
    arround:        {},
    books:          {},
    pagewarner:     {}
}

async function init() {
    for (let i in configDft)
        if (! await existFile(`${p_data}/${i}.json`))
            writeConfig(i, configDft[i])

    setting = await readConfig("setting")

    let done = false; while (!done) {
        switch (typeof verbs[verb]) {
            case "string":
                verb = verbs[verb]; break
            case "function":
                await verbs[verb]()
                done = true; break
            default:
                Err(`xbqg: Unknown verb: ${verb}`)
        }
    }
}

// :: Beautiful Init

init()

