    define ['./editor', './editorSupport', './ui', './modes'], (Editor, EditorSupport, UI, Modes)->
      {
        findEditor
        LeisureEditCore
        preserveSelection
      } = Editor
      {
        OrgEditing
        editorForToolbar
        basicDataFilter
      } = EditorSupport
      {
        fancyMode
        doSlideValue
      } = Modes
      {
        addView
        removeView
        renderView
        hasView
        viewKey
        addController
        removeController
        withContext
        mergeContext
        initializePendingViews
      } = UI

      searchToken = /[^\'\"]+|\'[^\']*\'|\"[^\"]*\"/g
      editorCount = 0

      normalize = (str)-> str && str.toLowerCase().replace(/([^a-z0-9]|\n)+/g, '').trim()

      chr = (c)-> c.charCodeAt 0

      grams = (str, gr = {})->
        str = normalize str
        if str
          for cc in [chr('a')..chr('z')].concat [chr('0')..chr('9')]
            c = String.fromCharCode cc
            if str.indexOf(c) > -1 then gr[c] = true
        if str && str.length >= 2
          for i in [0...str.length - 3]
            gr[str.substring i, i + 2] = true
        if str && str.length >= 3
          for i in [0...str.length - 2]
            gr[str.substring i, i + 3] = true
        gr

      tokenize = (query)-> _.map query.match(searchToken) ? [], normalize

      indexQuery = (query)->
        tri = {}
        tokens = {}
        for token in tokenize query
          if !tokens[token]
            tokens[token] = true
            grams token, tri
        grams: tri
        tokens: _.keys tokens

      addSearchDataFilter = (data)->
        updateEditors = _.throttle -> data.trigger 'updateSearch'
        data.addFilter
          __proto__: basicDataFilter
          clear: (data)->
            data.ftsIndex =
              sizes: {}
              gramBlocks: {}
          replaceBlock: (data, oldBlock, newBlock)->
            for gram of grams oldBlock?.text
              if data.ftsIndex.gramBlocks[gram]?[oldBlock._id]
                delete data.ftsIndex.gramBlocks[gram]?[oldBlock._id]
                if ! --data.ftsIndex.sizes[gram]
                  delete data.ftsIndex.gramBlocks[gram]
                  delete data.ftsIndex.sizes[gram]
            for gram of grams newBlock?.text
              if !data.ftsIndex.gramBlocks[gram]?[newBlock._id]
                if !data.ftsIndex.gramBlocks[gram]
                  data.ftsIndex.gramBlocks[gram] = {}
                  data.ftsIndex.sizes[gram] = 0
                data.ftsIndex.gramBlocks[gram]?[newBlock._id] = true
                ++data.ftsIndex.sizes[gram]
            setTimeout updateEditors, 1

      searchForBlocks = (data, query)->
        {tokens, grams: g} = indexQuery query
        {gramBlocks, sizes} = data.ftsIndex
        counts = []
        for gram of g
          if !sizes[gram] then return []
          else counts.push gram: gram, size: sizes[gram]
        if counts.length
          counts.sort (a, b)-> b.size - a.size
          results = _.keys gramBlocks[counts.pop().gram]
          for count in counts by -1
            blocks = gramBlocks[count.gram]
            results = _.filter results, (x)-> blocks[x]
          _.filter results, (id)->
            text = normalize data.getBlock(id).text
            _.every tokens, (tok)-> text.search(tok) >= 0
        else []

      class SearchEditor extends OrgEditing
        constructor: (@data, @text)->
          super @data
          @results = {}
          @addDataCallbacks updateSearch: => @redisplay()
          @setPrefix "search-#{editorCount++}-"
        checkValid: ->
          if !document.documentElement.contains $(@editor.node)[0]
            @cleanup()
            false
          true
        initToolbar: ->
        setResults: (newResults)->
          if changed = !_.isEqual newResults, @results
            @results = newResults
            @rerenderAll()
          changed
        renderBlock: (block)->
          realBlock = @getBlock block
          if @shouldRender realBlock
            super realBlock
          else ['', realBlock?.next]
        shouldRender: (block)->
          while block
            if @results[block._id] then return true
            block = @data.parent block
          false
        search: ->
          if hits = searchForBlocks(@data, @text.val())
            results = _.transform hits, ((obj, item)-> obj[item] = true), {}
            @setResults results
        redisplay: -> preserveSelection => @search()

      openSearch = (event)->
        editor = editorForToolbar(event.originalEvent.srcElement)
        withContext {editor: editor}, =>
          $(editor.node)
            .append renderView 'leisure-search'
          initializePendingViews()

      configureSearch = (view)->
        editor = UI.context.editor
        output = $(view).find '.leisure-searchOutput'
        input = $(view).find '.leisure-searchText'
        output.parent().addClass 'flat'
        searchEditor = new LeisureEditCore output, new SearchEditor(editor.options.data, input).setMode fancyMode
        opts = searchEditor.options
        Leisure.configureEmacsOpts opts
        Leisure.configurePeerOpts opts
        opts.data.openRegistration()
        opts.data.registerCollaborativeCode 'doSlideValue', doSlideValue
        opts.data.registerCollaborativeCode 'viewBoundSet', (context, name, data)-> options.setData name, data
        opts.data.closeRegistration()
        opts.hiding = false
        output.prev().filter('[data-view=leisure-toolbar]').remove()
        input.on 'input', (e)-> opts.search()
        opts

      Object.assign Leisure, {
        openSearch
        configureSearch
        searchForBlocks
      }

      {
        normalize
        indexQuery
        tokenize
        addSearchDataFilter
        grams
        searchForBlocks
        openSearch
      }
