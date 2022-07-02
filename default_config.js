module.exports = {
	setting: {
	  editor: "vim ${path}",
	  browser: null,
	  around: {
	    style: {
	      format: "<< !{ green | ${prev} } | !{ yellow | ${title} } | !{ green | ${next} } >>"
	    }
	  },
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
	        format: "[ !{ progress | # | = } ] ${percent}"
	      },
	      diff: {
	        length: 80,
	        format: "${date} | !{ progress | # } ] ${number}"
	      }
	    }
	  },
	  bookcase: {
	    style: {
	      useRelativeTime: true,
	      header: true,
	      padding: [ 10, 10, 40, 20 ],
	      watchSpinner: {
	        characters: "/-\\|",
	        delay: 300
	      }
	    }
	  },
	  source: {
	    active: "xbqg",
	    autoSwitching: true,
	    useCornerBracket: true,
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
	          [ /<p>\s*/, "    " ],
	          [ /<\/p>/, "\n" ],
	          [ /<br ?\/?>/, "\n" ],
	          [ /&?amp;/, "&" ],
	          [ /&?nbsp;/, " " ],
	          [ /&?lt;/, "<" ],
	          [ /&?gt;/, ">" ]
	        ]
	      },
	      "xbqg": {
	        url: "https://www.biqupai.com/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /-(.+?) - 新笔趣阁$/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.+?)-/
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
	          [ /一秒记住，精彩小说无弹窗免费阅读！/, "" ],
	          [ /谷<\/span>/, "" ]
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
	            regexp: /^.+?_(.+?)(章节免费阅读无弹窗)?_书本网/,
	            group: 1
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="booktxt">([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: false,
	            from: "html",
	            regexp: /<a id="prev_url".*href="\/read\/(.+?)\.html"/
	          },
	          next: {
	            necessary: false,
	            from: "html",
	            regexp: /<a id="next_url".*href="\/read\/(.+?)\.html"/
	          }
	        },
	        matchKeyInAround: /(.*)\//
	      },
	      "yingsx": {
	        url: "https://www.yingsx.com/${page}.html",
	        matcher: {
	          bookName: {
	            necessary: true,
	            from: "title",
	            regexp: /^(.+?)_/
	          },
	          chapterName: {
	            necessary: true,
	            from: "title",
	            regexp: /^.+?_ (.+?)-笔趣阁/,
	            group: 1
	          },
	          content: {
	            necessary: true,
	            from: "html",
	            regexp: /<div id="content">([^]+?)<\/div>/
	          },
	          prev: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/([\d\/_]+?)\.html">上一章<\/a>/
	          },
	          next: {
	            necessary: false,
	            from: "html",
	            regexp: /<a href="\/([\d\/_]+?)\.html">下一章<\/a>/
	          }
	        },
	        matchKeyInAround: /(.*)\//
	      },
		  "wzxmt": {
			url: "https://www.wzxmt.com/read/${page}.html",
			matcher: {
			  bookName: {
				necessary: true,
				from: "title",
				regexp: /_(.+?)_笔趣阁/
			  },
			  chapterName: {
				necessary: true,
				from: "title",
				regexp: /^(.+?)_/
			  },
			  content: {
				necessary: true,
				from: "html",
				regexp: /下一章<\/a><\/div>([^]+?)<div class="read_btn"/
			  },
			  prev: {
				necessary: false,
				from: "html",
				regexp: /<a href="\/read\/([0-9_\/]+?).html">上一章<\/a>/
			  },
			  next: {
				necessary: false,
				from: "html",
				regexp: /<a href="\/read\/([0-9_\/]+?).html">下一章<\/a>/
			  }
			},
			matchKeyInAround: /.*(?=\/)/
		  },
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
	      clearEOF: true,
	      action: [
	        "pagewarner_stat"
	      ]
	    },
	    {
	      on: true,
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
	    },
	    {
	      on: false,
	      interactive: true,
	      name: "reload-default-config",
	      event: [ "pre-config_reset" ],
	      action: [
	        "!eval ! "
	        +   "delete require.cache["
	        +       "Object.keys(require.cache).find(fp => fp.endsWith(\"default_config.js\"))"
	        +   "]",
	        "!eval ! c_dft = require(\"./default_config.js\")",
	        "!eval ! l.dbg(\"re-req default_config\")"
	      ]
	    }
	  ]
	},
	history: [ "help" ],
	around: {},
	books: {},
	pagewarner: {}
}
