module.exports = l => ({
	data: `
All data files exists in \`$XBQG_DATA\` unless user gives a \`--path\` option to override it.
Filenames cannot be changed at present.

RELAVANT

? setting             -> one of the data files
`,
	setting: `
Since all formats of data become Javascript object when the script runs,
Javascript style \`path\` is used below.
` + `
editor: string <- config_edit
# the editor for opening your data files

browser: string <- book_browse
# the browser for opening the current page

around <- around
    style
        format: string

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
            format: string
        diff <- pagewarner_diff
            length: integer
            format: string

source
    active: string
    # what source to use now among the \`list\`
    autoSwitching: boolean <- book_fetch
    # whether to automatically switch the source to the first available one of a book
	useCornerBracket: boolean <- fetch
	# whether to use 「」 instead of “”
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

? data                -> where to store
? config              -> commands to operate the configuration
? config_reset        ~~
? config_edit         ~~
`
	.replace(/(?<=: )[a-z]+/g, s => l.hili(s))
	.replace(/(?<=^ *)[a-zA-Z\[\]]+/gm, l.bold)
	.replace(/(?<=# ).+$/gm, s => l.hili(s, 3))
})
