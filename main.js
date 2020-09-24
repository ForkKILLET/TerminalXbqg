#!/Volumes/FORKUB/Safety/bin/node

// :: Import

const fs    = require("fs")
const http  = require("https") // Note: xbqg deny http

// :: Tool

const debug = false

function Err(m) {
    m = `\x1B[31m${m}\x1B[0m`
    if (debug) throw m
    else console.error(m)
    process.exit()
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
                : JSON.stringify(data)
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
        (t ? ` ${t} ` : "") +
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
        div("page info", 0, 1)
        arround = await readConfig("arround")
        if (arround[name]) {
            console.log(`${name}: ${arround[name]}`)
            verbs.fetch(arround[name])
        }
        else {
            console.log(`${name}: null`)
            div("EOF", 0, 1)
        }
    }
}

const verbs = {
    // Note: alias
    "[": "prev",
    "=": "curr",
    "]": "next",
    "-": "arro",
    ":": "fetch",
    "?": "help",

    // Note: work

    fetch: async(page) => {
        page = page ?? args[1]
        if (!page) Err("fetch: Page can't be null.")

        const _html = await ajax(setting?.src
            ?? `https://www.xsbiquge.com/${page}.html`)
        let _title = _html.match(/<title>(.*)<\/title>/)[1]
        if (_title.match(/^[3-5][01]\d+/))
            Err(`fetch: HTTP error code: ${_title}`)
        _title = _title.replace(/- 新笔趣阁.*/, "\n").replace("-", " @ ")
        const _content = _html.match(/<div id="content">(.*)<\/div>/)[1]
            .replace(/<br[ ][\/]>/g, "\n").replace(/&nbsp;/g, " ")
        div("text", 1, 2)
        console.log(_title, _content)

        div("arround", 1, 2)
        const
            _arround = _html.match(/=keypage;([\s\S]*)function keypage/)[1],
            _prev = _arround.match(/prevpage="\/(.*).html"/)[1],
            _next = _arround.match(/nextpage="\/(.*).html"/)[1],
            arroundJSON = `{
    "prev": "${_prev}",
    "curr": "${page}",
    "next": "${_next}"
}`
        console.log(arroundJSON)
        await writeConfig("arround", arroundJSON + "\n")
        div("EOF", 1, 1)
    },

    help: () => {
        div("help", 0, 2)
        console.log("Nothing here, at least not now.")
        div("EOF", 1, 1)
    },

    prev: fetchAlias("prev"),
    curr: fetchAlias("curr"),
    next: fetchAlias("next"),

    arro: async () => {
        div("arround", 0, 2)
        console.log(await readConfig("arround", true))
        div("EOF", 0, 1)
    }
}

async function init() {
    setting = await readConfig("setting")

    let done = false; while (!done) {
        switch (typeof verbs[verb]) {
            case "string":
                verb = verbs[verb]; break
            case "function":
                await verbs[verb]()
                done = true; break
            default:
                Err(`xbqg: unreachable. verb: ${verb}
I think the world crashed, don't worry -
Because the matter is big, and worrying is useless.`)
                // wWw: 别慌，事情很大，慌也没用
        }
    }
}

// :: Beautiful Init

init()

