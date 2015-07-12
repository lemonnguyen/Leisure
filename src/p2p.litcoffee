Peer-to-peer connection

    define ['jquery', 'immutable', 'cs!./lib/webrtc.litcoffee', 'lib/cycle', 'cs!./editor.litcoffee', 'cs!./editorSupport.litcoffee'], (jq, immutable, Peer, cycle, Editor, Support)->
      {
        Map
      } = window.Immutable = immutable
      {
        PeerConnection
        MasterConnection
        SlaveConnection
      } = Peer
      {
        DataStore
        preserveSelection
      } = Editor
      {
        OrgData
      } = Support

`P2POrgData` uses a HAMT for blocks instead of a regular JS object.  This is to make
it easier to handle merges.

      class P2POrgData extends OrgData
        constructor: (@peer)->
          super()
          @blocks = new Map()
        getFirst: -> getFirst @blocks
        setFirst: (firstId)-> @blocks = setFirst @blocks, firstId
        getBlock: (id, changes)->
          if typeof id != 'string' then id else changes?.sets[id] ? @blocks.get id
        setBlock: (id, block)->
          @runFilters @getBlock(id), block
          @blocks = @blocks.set id, block
        deleteBlock: (id)->
          @runFilters @getBlock(id), null
          @blocks = @blocks.delete id
        eachBlock: (func)->
          @blocks.forEach (block, id)-> if id != 'FIRST' then func block, id
        load: (first, newBlocks)->
          super first, setFirst((new Map newBlocks), first),
            sets: newBlocks
            oldBlocks: {}
            first: first
        makeChange: (change)->
          ch = super change
          ch.origin = change.origin
          ch

      class Peer
        constructor: ->
          @changeCount = 0
          @connectionNumber = 0
          @data = new P2POrgData this
          @data.on 'change', (change)=> @changed change
        receiveMessage: (connection, msg)->
          if msg.type of @messageHandler
            console.log "receiving", msg
            @messageHandler[msg.type] connection, msg
          else connection.error "Unknown message type: #{msg.type}"
        changed: (change)->
        becomeMaster: ->
          if !@mode
            @mode = 'master'
            @connections = {}
            @pending = {}
            @messageHandler =
              change: (connection, {change})=>
                change.origin = connection.id
                preserveSelection => @data.change change
              ack: (connection, {count})-> connection.ack count
            @changed = (change)->
              @changeCount++
              ch =
                first: change.first
                sets: change.sets
                removes: change.removes
                origin: change.origin
              for id, con of @connections
                con.pushChange ch
            @removeConnection = (con)->
              delete @connections[con.id]
              delete @pending[con.id]
              @updateConnections()
            @addConnection = (con)->
              @connections[con.id] = con
              delete @pending[con.id]
              @updateConnections()
            @updateConnections = ->
              tot = _.size @connections
              for id, con of @connections
                con.updateConnections tot
            true
          else false
        createConnectionForSlave: ({offerReady, connected, error})->
          id = "master-#{@connectionNumber++}"
          @pending[id] = new MC this, id, offerReady, connected, error
        becomeSlave: (updateConnections)->
          if !@mode
            @mode = 'slave'
            @changing = false
            @messageHandler =
              document: (connection, {@id, document})=>
                blocks = {}
                for block in document
                  blocks[block._id] = block
                @data.load document[0]._id, blocks
              change: (connection, {count, change})=>
                @remoteChangeCount = count
                @protectChange => preserveSelection => @data.change change
                connection.sendMessage 'ack', count: count
              changeAck: (connection, {count})=>
                @remoteChangeCount = count
                connection.sendMessage 'ack', count: count
              connections: (connection, info)-> updateConnections info
            @protectChange = (func)->
              oldChanging = @changing
              @changing = true
              try
                func()
              finally
                @changing = oldChanging
            @changed = (change)->
              if !@changing
                @changeCount++
                ch =
                  first: change.first
                  sets: change.sets
                  removes: change.removes
                  origin: change.origin
                @connection.pushChange ch
            @removeConnection = (con)-> @connection = null
            true
          else false
        createConnectionToMaster: ({offer, answerReady, connected, error})->
          @connection = new SC this, offer, answerReady, connected, error

      getFirst = (blocks)-> blocks.get 'FIRST'
      setFirst = (blocks, firstId)-> blocks.set 'FIRST', firstId

      class Connection
        constructor: (@peer, @errorFunc)->
        sendMessage: (type, msg)->
          msg.type = type
          console.log "SENDING", msg
          @connection.sendMessage JSON.stringify JSON.decycle msg
        error: (err)->
          console.log "Error: #{err.message}", err
          @peer.removeConnection this
          @errorFunc this, err

      class MC extends Connection
        constructor: (peer, @id, offerReadyFunc, connectedFunc, errorFunc)->
          super peer, errorFunc
          @trees = {}
          @minCount = -1
          @lastUpdate = peer.currentUpdate
          @connection = new MasterConnection
            offerReady: (offer)=> offerReadyFunc offer, _this
            connected: =>
              peer.addConnection this
              console.log "connected"
              @sendMessage 'document', id: @id, document: @document()
              connectedFunc?()
            handleMessage: (msg)=> @peer.receiveMessage _this, JSON.retrocycle JSON.parse msg
           @connection.start (err)=> @error err
        ack: (count)->
          if @minCount >= 0
            for c in [@minCount..count]
              delete @trees[c]
            if @maxCount == count then @minCount = -1
        document: ->
          doc = []
          cur = @peer.data.getFirst()
          while cur
            block = @peer.data.getBlock cur
            doc.push block
            cur = block.next
          doc
        establishConnection: (answer)-> @connection.establishConnection answer
        pushChange: (change)->
          @trees[@peer.changeCount] = @peer.data.blocks
          @maxCount = @peer.changeCount
          if @minCount < 0 then @minCount = @peer.changeCount
          if change.origin != @id then @sendMessage 'change', count: @peer.changeCount, change: change
          else @sendMessage 'changeAck', count: @peer.changeCount
        updateConnections: (tot)-> @sendMessage 'connections', total: tot

      class SC extends Connection
        constructor: (peer, masterOffer, answerReadyFunc, connectedFunc, errorFunc)->
          super peer, errorFunc
          @connection = new SlaveConnection
            offerReady: (offer)-> answerReadyFunc offer
            connected: ->
              console.log "Connected"
              #@sendMessage 'change', change: @document()
              connectedFunc?()
            handleMessage: (msg)=> @peer.receiveMessage _this, JSON.retrocycle JSON.parse msg
          @connection.start masterOffer, (err)=> @error err
        pushChange: (change)-> @sendMessage 'change', change: change

      {
        Peer
      }