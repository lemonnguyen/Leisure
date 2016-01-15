Code for local-mode.  This will not be loaded under meteor.

    require ['./domCursor'], (DC)-> window.DOMCursor = DC

    init = (jqui, EditorSupport, Modes, Diag, P2P, Tests, Webrtc, Defaults, UI, BrowserExports, Search, Emacs, Todo)->

      {
        OrgData
        installSelectionMenu
        getDocumentParams
        editorToolbar
      } = EditorSupport
      {
        plainEditDiv
        fancyEditDiv
      } = Modes
      {
        createStructureDisplay
        createEditorDisplay
      } = Diag
      {
        Peer
      } = P2P
      {
        findPeer
      } = Webrtc
      {
        runTests
      } = Tests
      {
        renderView
        initializePendingViews
        withContext
        setPanelExpanded
      } = UI
      {
        mergeExports
      } = BrowserExports
      {
        addSearchDataFilter
      } = Search
      {
        addEmacsDataFilter
      } = Emacs
      {
        todoForEditor
      } = Todo

      useP2P = true
      #useP2P = false
      peer = null
      p2pPanel = null
      p2pConnections = null
      DEFAULT_PAGE='demo/documentComputers.lorg'

      Leisure.configureP2P = ({panel, hostField, sessionField, createSessionButton, connections})->
        p2pPanel = panel
        p2pConnections = connections
        if !useP2P then panel.css 'display', 'none'
        hostField.val document.location.host || "localhost:8080"
        createSessionButton.data hasSession: false
        Leisure.createSession = (url, doneFunc)->
          createSessionButton.closest('.contents').removeClass 'not-connected'
          createSessionButton.closest('.contents').addClass 'connected'
          peer.createSession hostField.val(), ((con)->
            url = new URL("", document.location)
            url.search = "?join=#{peer.connectUrl}"
            sessionField.attr 'href', url.toString()
            sessionField.text url.toString()
            setPanelExpanded panel, true
            createSessionButton.button('option', 'label', 'Disconnect')
            doneFunc?()), (n)->
              connections.html n
        createSessionButton.click ->
          if !createSessionButton.data().hasSession
            Leisure.createSession hostField.val()
          else
            createSessionButton.closest('.contents').removeClass 'connected'
            createSessionButton.closest('.contents').addClass 'not-connected'
            peer.disconnect()
            createSessionButton.button('option', 'label', 'Create Session')
            setTimeout (->setPanelExpanded panel, true), 1
          createSessionButton.data hasSession: !createSessionButton.data().hasSession

      $(document).ready ->
        runTests()
        installSelectionMenu()
        if useP2P
          window.PEER = peer = new Peer
          window.DATA = data = peer.data
          p2pPanel?.css 'display', ''
        else window.DATA = data = new OrgData()
        addSearchDataFilter data
        data.processDefaults Defaults
        createStructureDisplay data
        #window.ED = plainEditDiv $("[maindoc]"), data
        window.ED = fancyEditDiv $("[maindoc]"), data
        if useP2P then window.PEER.setEditor ED
        createEditorDisplay ED
        todoForEditor ED
        if document.location.search
          {load, theme, join} = getDocumentParams()
        else load = DEFAULT_PAGE
        if load
          load = new URL(load, document.location).toString()
          $.get(load, (data)-> ED.options.load load, data)
          ED.options.loadName = load
        if theme then ED.options.setTheme theme
        if join
          setTimeout (->
            createSessionButton = $(editorToolbar window.PEER.editor.node).find('[name=p2pConnector] [name=createSession]')
            createSessionButton.data hasSession: true
            createSessionButton.closest('.contents').removeClass 'not-connected'
            createSessionButton.closest('.contents').addClass 'connected'
            createSessionButton.button 'option', 'label', 'Disconnect'
            console.log "CREATE SESSION:", createSessionButton[0]
            u = new URL join
            console.log "JOIN SESSION: #{u}"
            window.PEER.connectToSession u.toString(), null, (n)-> p2pConnections.html n), 1
        #else
        #  ED.options.load 'default', """
        #  Create a bad replacement with collaboration: asdf<-<-<-as

        #  burp
        #  * top
        #  bubba

        #  [[leisure:bubba]][[leisure:bubba]]

        #  #+NAME: bubba
        #  #+BEGIN_SRC yaml
        #  type: rotator
        #  degrees: 45
        #  #+END_SRC

        #  #+BEGIN_SRC leisure :results dynamic
        #  3 + 4
        #  #+END_SRC
        #  #+RESULTS:
        #  : 7

        #  #+BEGIN_SRC js :results dynamic
        #  3-4
        #  #+END_SRC
        #  #+RESULTS:
        #  : 7
        #  #+BEGIN_SRC lisp :results dynamic
        #  (+ 3 4)
        #  #+END_SRC
        #  #+BEGIN_SRC cs :results dynamic
        #  '<b>duh</b>'
        #  html '<b>duh</b>'
        #  37/3333
        #  html '<img src="https://imgs.xkcd.com/comics/lisp_cycles.png">'
        #  #+END_SRC
        #  #+RESULTS:
        #  : &lt;b&gt;duh&lt;/b&gt;
        #  : <b>duh</b>
        #  : 0.0111011101110111
        #  : <img src="https://imgs.xkcd.com/comics/lisp_cycles.png">

        #  #+BEGIN_HTML
        #  <b>hello</b>
        #  #+END_HTML

        #  #+BEGIN_SRC html :defview rotator
        #  <div style='padding: 25px; display: inline-block'>
        #    <div style='transform: rotate({{degrees}}deg);height: 100px;width: 100px;background: green'></div>
        #  </div>
        #  #+END_SRC

        #  #+BEGIN_SRC cs :control rotator
        #  @initializeView = (view)-> #console.log "initialize", view
        #  #+END_SRC

        #  #+BEGIN_SRC html :defview leisure-headlineX
        #  <span id='{{id}}' data-block='headline'><span class='hidden'>{{stars}}</span><span class='maintext'>{{maintext}}</span>{{EOL}}{{nop
        #  }}</span>{{#each children}}{{{render this}}}{{/each}}</span>
        #  #+END_SRC
        #  
        #  #+BEGIN_SRC css
        #  [data-block='headline'] .maintext {
        #    font-weight: bold;
        #    color: blue;
        #  }
        #  .custom-headline {
        #    font-weight: bold;
        #    color: green;
        #  }
        #  [data-block='headline'] {
        #    color: orangeX;
        #  }
        #  #+END_SRC
        #  * Test properties > splunge
        #   ** sub 1
        #  */duh/*
        #  :properties:
        #  :hidden: true
        #  :a: 1
        #  :end:


        #  image link
        #  [[https://imgs.xkcd.com/comics/lisp_cycles.png]]

        #  peep
        #  :properties:
        #  :b: 2
        #  :end:
        #  ** sub 2
        #  asdf
        #  """ + '\n'
        $('#globalLoad').remove()

    require ['jquery'], ->
      require ['jqueryui', './editorSupport', './modes', './diag', './leisure-client-adapter', './tests', './lib/webrtc', 'text!../src/defaults.lorg', './ui', './export', './search', './emacs', './todo'], init
