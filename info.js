module.exports = l => {

const info = {}

info.g = {
	fetch:				[ [ "f",	"."		], [ `Fetch a page by specific <page> id.` ] ],
	source:				[ [ "s",	".="	], [ `Modify the active [source]. Prefix matching is OK.`,
												 `Show the active source when no argument is given.` ] ],
	fetch_prev:			[ [ "p",	"["		], [ `Fetch the <prev>ious page.` ] ],
	fetch_curr:			[ [ "c",	"="		], [ `Fetch the <curr>ent page.` ] ],
	fetch_next:			[ [ "n",	"]"		], [ `Fetch the <next> page.` ] ],
	around:				[ [ "a",	"-"		], [ `Show around information,`,
												 `i.e. current title and page id of prev, curr, next.` ] ],
	book_show:			[ [ "bs",	"@-"	], [ `Show your bookcase.` ] ],
	book_mark:			[ [ "bm",	"@+"	], [ `Add the current page to your bookcase and give it a <name>.`,
												 `Update when the book already exists.` ] ],
	book_remove:		[ [ "br",	"@#"	], [ `Remove a [name]d book in [src].`,
												 `When [src] is "all", remove in all sources. When it's not given,`,
												 `remove in the active source. When [book] is not given, remove all books.`,
												 `Add "!" to skip waiting.` ] ],
	book_fetch:			[ [ "b",	"@"		], [ `Fetch the page you read before of a <name>d book in your bookcase.` ] ],
	book_browse:		[ [ "bb",	"@!"	], [ `Open the current page in your browser` ] ],
	watch:				[ [ "w",	".."	], [ `Watch update in the bookcase. Marks:`,
												 `"*" = to watch, "#" = unwatch,`,
												 `"x" = no update, "√" = updated, "!" = error` ] ],
	watch_toggle:		[ [ "wt",	"..="	], [ "Toggle watching on a <name>d book in [src].",
												 `When [src] is "all", toggle all sources synchronously.` ] ],
	config:				[ [ "c",	"%"		], [ `Print the whole configuration when no arguments is given.`,
												 `Print a specific item by the given JSON <path>.`,
												 `e.g. "config a.b[42].c"`,
												 `Delete the specific item.`,
												 `e.g. "config i.dont.want.it undefined" or "config me.too /"`,
												 `Modify the specific item. When <action> is "=", <value> is string.`,
												 `e.g. "config a.boolean true" and`,
												 `     "config a.string = true" or "config a.string \\'true\\'"` ] ],
	config_edit:		[ [ "ce",	"%!"	], [ `Edit a configuration JSON [file] by your editor.`,
												 `In default, "setting.json".` ] ],
	config_reset:		[ [ "cr",	"%#"	], [ `Reset your configuration to the default.`,
												 `Add "!" to skip waiting.`,
												 `Just reset the specific <path> of the configuration without delaying.` ] ],
	pagewarner_stat:	[ [ "ps",	"^"		], [ `Show today's pagewarner information using a progress bar.` ] ],
	pagewarner_diff:	[ [ "pd",	"^-"	], [ `Show pagewarner difference among days using a bar chart.` ] ],
	interactive:		[ [ "i",	"!"		], [ `Enter the interactive-mode.` ] ],
	history:			[ [ "hi",	"~"		], [ `Show history.` ] ],
	history_reset:		[ [ "hr",	"~#"	], [ `Reset history.` ] ],
	hook:				[ [ "k",	"/"		], [ `Trigger a <name>d hook manually.` ] ],
	hook_show:			[ [ "ks",	"/-"	], [ `Show your hooks.` ] ],
	hook_toggle:		[ [ "kt",	"/="	], [ `Toggle a <name>d hook.` ] ],
	help:				[ [ "h",	"?"		], [ `Show help of the given <theme> or command name.`,
												 `Show usage when no arguments is given.`] ],
}

info.i = {
	exit:		[ [ "e",	"!"	], [ `Exit the interactive-mode.` ] ],
	clear:		[ [ "c",	"-" ], [ `Clear the console.` ] ],
	eval:		[ [ "v",	"+"	], [ `Run Javascript code. Add "!" to mute.` ] ],
	shell:		[ [ "s",	"$"	], [ `Run command in shell.` ] ],
	help:		[ [ "h",	"?" ], [ `Show help of the given <theme> or command name.` ] ],
}

const color_info = s => {
	let q = 0
	return s
		.replace(/(?<=[\[<])[a-z]+(?=[\]>])/g, s => l.hili(s))
		.replace(/(?<=")[^]+?(?=")/g, s => q ++ % 2 ? s : l.hili(s, 3))
}

info.g_ex = color_info(`
CONTACT

GitHub Issue         "https://github.com/ForkFG/TerminalXbqg/issues"
Email                "fork_killet@qq.com"

RELAVANT

?                    -> this
! ?                  -> interactive instructions
? data               -> data files
? setting            -> the configuration
`)

info.i_ex = color_info(`Interactive instruction starts with a bang "!".`)

; [ "g", "i" ].forEach(i => {
	for (const n in info[i]) info[i][n][1].forEach((v, k, a) =>
		a[k] = color_info(v)
	)
})

info.t = {
data: `
All data files exists in "$XBQG_DATA" unless user gives a "--path" option to override it.
Filenames cannot be changed at present.

RELAVANT

? setting             -> one of the data files
`,
setting: `
Since all formats of data become Javascript object when the script runs,
Javascript style "path" is used below.` + `

editor: string <- config_edit
# the editor for opening your data files

browser: string <- book_browse
# the browser for opening the current page

around <- around
    style
        format: string

bookcase <- book_show
    style
        useRelativeTime: boolean
        # whether to use relative time like "3 days ago"
        header: boolean
        # whether to show the table header
        padding: array
        # lengths of each columns, which are name, source, title and time
            0: integer
            1: integer
            2: integer
            3: integer
        watchSpinner
        # the spinner displaying when watching
            characters: string
            delay: integer
            # how soon to show the next character

interactive <- interactive
    prompt: string
    # what to display before your cursor in interactive-mode
    forceClearCommand: string <- !clear !
    # the command for clearing the console history instead of the current screen
    allowXbqgPrefix: boolean
    # whether to allow commands like "xbqg ]"
    # helpful when you aren't used to interactive-mode
    allowComplete: boolean
    # whether to complete the command when pressing tab

pagewarner <- pagewarner*
    warnNum: integer
    # how much pages you decided to read every day at most
    onlyWarnAfterFetching <- hook anti-addiction
    # whether display the pagewarner when only you reach the "warnNum"
    progressStyle
        stat <- pagewarner_stat
            length: integer
            format: string
        diff <- pagewarner_diff
            length: integer
            format: string

source
    active: string
    # what source to use now among the "list"
    autoSwitching: boolean <- book_fetch
    # whether to automatically switch the source to the first available one of a book
    useCornerBracket: boolean <- fetch
    # whether to use "「」" instead of "“”"
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
        clearEOF: boolean
        # whether to clear the last line

RELAVANT

? data                -> where to store
? config              -> commands to operate the configuration
? config_reset        ~~
? config_edit         ~~
`
	.replace(/(?<=: )[a-z]+/g, s => l.hili(s))
	.replace(/(?<=^ *)[a-zA-Z\[\]]+/gm, l.bold)
	.replace(/(?<=# ).+$/gm, s => l.hili(s, 3))
}

	return info
}
