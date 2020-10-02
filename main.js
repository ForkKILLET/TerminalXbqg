#!/Volumes/FORKUB/Safety/bin/node

// :: Import

const fs    = require("fs")
const http  = require("https") // Note: Xbqg refuses http requests.

// :: Tool

const debug = false

function Err(m) {
    m = `\x1B[31m${m}\x1B[0m`
    if (debug) throw m
    else console.error(m)
    process.exit()
}

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
            Buffer.from(typeof data === "string"
                ? data
                : JSON.stringify(data, null, 4)
            )
        ), "utf8", err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

async function ajax(tar) {
   return new Promise((resolve, reject) => {
        http.get(tar, res => {
            const { statusCode } = res
            const contentType = res.headers['content-type']
            
            if (statusCode !== 200) {
                res.resume()
                reject(new Error(`ajax: Request failed.\n` + 
                    `Status Code: ${statusCode}\n` +
                    `URL: ${tar}`
                ))
            }

            let data = ""
            res.setEncoding("utf8")
            res.on("data", chunk => data += chunk)
            res.on("end", () => resolve(data))
        })
    })
}

// :: Script

const [ interpreter, script, ...args ] = process.argv
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

let arround, setting, books

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
            console.log(`${name}: ${arround[name]}`)
            verbs.fetch(arround[name])
        }
        else {
            console.log(`${name}: null`)
            div("EOF", 1, 1)
        }
    }
}

const verbs = {
    // Note: alias
    "[":    "prev",
    "=":    "curr",
    "]":    "next",
    "-":    "arround",
    "@+":   "bookmark",
    "@-":   "bookcase",
    "@:":   "bookfetch",
    ":":    "fetch",
    "?":    "help",
    "%":    "config",

    // Note: work

    fetch: async(page) => {
        page = page ?? args[1]
        if (!page) Err("fetch: Page can't be null.")

        const _html = await ajax(setting?.src
            ?? `https://www.xsbiquge.com/${page}.html`)
        let _title = _html.match(/<title>(.*)<\/title>/)[1]
        if (_title.match(/^[3-5][01]\d+/))
            Err(`fetch: HTTP error code: ${_title}`)
        _title = _title.replace(/ - 新笔趣阁.*/, "").replace("-", " @ ")
        const _content = _html.match(/<div id="content">(.*)<\/div>/)[1]
            .replace(/<br[ ][\/]>/g, "\n").replace(/&nbsp;/g, " ")
        div("text", 1, 2)
        console.log(_title, "\n", _content)

        div("arround", 1, 2)
        const
            _arround = _html.match(/=keypage;([\s\S]*)function keypage/)[1],
            _prev = _arround.match(/prevpage="\/(.*).html"/)?.[1],
            _next = _arround.match(/nextpage="\/(.*).html"/)?.[1],
            arroundJSON =
`{
    "prev": ${_prev ? '"' + _prev + '"' : "null"},
    "curr": "${page}",
    "next": ${_next ? '"' + _next + '"' : "null"},
    "title": "${_title}"
}\n`
        console.log(arroundJSON)
        await writeConfig("arround", arroundJSON)
        div("EOF", 0, 1)
    },

    help: () => {
        div("help", 0, 2)
        console.log("Nothing here, at least not now.")
        div("EOF", 1, 1)
    },

    prev: fetchAlias("prev"),
    curr: fetchAlias("curr"),
    next: fetchAlias("next"),

    arround: async() => {
        div("arround", 0, 2)
        console.log(await readConfig("arround", true))
        div("EOF", 0, 1)
    },

    bookcase: async() => {
        div("bookcase", 0, 2)
        // TODO: better display
        console.log(await readConfig("books", true))
        div("EOF", 1, 1) 
    },

    bookmark: async() => {
        const arround = await readConfig("arround")
        const key = arround.curr.match(/(.*)\//)[1]
        const books = await readConfig("books")
        
        let newBook = ! books[key]
        books[key] = arround
        books[key].name = args[1]
        await writeConfig("books", books)

        div("bookmark", 0, 1)
        console.log(newBook ? "Added." : "Updated.")
        div("EOF", 0, 1)
    },

    bookfetch: async() => {
        const name = args[1]
        if (!name) Err("bookfetch: book name can't be null.")

        div("bookfetch", 0, 2)
        const books = await readConfig("books")
        for (let i in books) if (name === i || name === books[i].name) {
            console.log("Succeeded.")
            await verbs.fetch(books[i].curr)
            return
        }
        console.log("Not found.")
        div("EOF", 1, 1)
    },

    config: async() => {
        if (args[1] == null) {
            div("config list global", 0, 2)
            console.log(await readConfig("setting", true))
            div("EOF", 1, 1)
        }
        else {
            const W = !! args[2]

            div(W ? "config write" : "config read", 0, 2)

            let config = await readConfig("setting"),
                path = args[1]
            if (path[0] !== "." && path[0] !== "[") path = "." + path

            const rsit = path.matchAll(/\.([_a-zA-Z][0-9_a-zA-Z]*)|\[(\d+)]/g)
            let rs, c = config, pa, f = true, t, key
            while (! (rs = rsit.next()).done) {
                t = !! rs.value[1], key = t ? rs.value[1] : Number(rs.value[2])
                if (c && typeof c === "object") {
                    if ((t && ! Array.isArray(c))
                    || (!t && Array.isArray(c))) {
                        pa = c
                        c = pa[key]
                    }
                    else {
                        if (W) Err("c: Path type conflicted.")
                        console.log(undefined)
                        f = false; break
                    }
                }
                else if (c === undefined) W && (c = pa[key] = (t ? {} : []))
                else W && Err("c: Path type conflicted.")
            }
            if (W) {
                pa[key] = [ "undefined", "x" ].includes(args[2])
                    ? undefined
                    : JSON.parse(args[2][0] === "=" ? '"' + args[2].slice(1) + '"' : args[2])
                await writeConfig("setting", config)
            }
            if (f) console.log(JSON.stringify(W ? config : c, null, 4))
            div("EOF", 1, 1)
        }
    }
}

async function init() {
    const configDft = {
        setting:    "{}",
        arround:    "{}",
        books:      "{}"
    }
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

