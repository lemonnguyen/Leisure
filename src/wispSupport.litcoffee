Clojure support for Lounge

    define ['./eval', './docOrg', 'lib/bluebird.min', './gen'], (Eval, DocOrg, Bluebird, Gen)->
      {
        setLounge
        parseIt
        jsCodeFor
        Scope
        lineColumnStrOffset
      } = Eval
      {
        blockSource
      } = DocOrg
      {
        Promise
      } = Bluebird
      {
        SourceNode
        SourceMapConsumer
        SourceMapGenerator
      } = Gen

      Wisp = null
      wispCompile = null
      wispFileCounter = 0

      wispRequire = (s, base)->
        s = new URL(s, 'http://x\/' + base.replace(/\./g, "\/")).pathname.replace(/^\//, '').replace '\/', '.'
        if m = s.match /^(\.)?wisp\./ then findNs s.substring(m[0].length), Wisp
        else findNs s, Leisure.WispNS

      findNs = (nsName, obj, create)->
        for comp in nsName.split '.'
          if !obj[comp]
            if create then obj[comp] = new Scope
            else return null
          obj = obj[comp]
        if create && !obj._ns_ then obj._ns_ =
          id: nsName
        obj

      wp = null

      translateIdentifierWord = null

      wispPromise = ->
        wp || (wp = new Promise (resolve, reject)->
          setTimeout (->
            req = window.require
            window.require = null
            req ['lib/wisp'], (W)->
              Leisure.Wisp = Wisp = W
              {translateIdentifierWord} = W.backend.escodegen.writer
              baseWispCompile = Wisp.compiler.compile
              window.require = req
              wispCompile = (args...)->
                node = baseWispCompile args...
                if node.error then throw node.error
                node
              Leisure.wispCompilePrim = wispCompile
              Leisure.wispCompileBase = baseWispCompile
              Leisure.WispNS = lounge: tools: {}
              exports = Leisure.WispNS.lounge.tools
              resolve wispCompile), 100)

Compile Wisp code, optionally in a namespace.

      class Compiler
        constructor: ->
        compile: (s, @nsName, @wrapFunction, @returnList)->
          @reqs = ''
          @splice = ''
          @pad = if @wrapFunction then '  ' else ''
          @result = wispCompile s, "source-uri": "wispEval-#{wispFileCounter++}"
          if @result.ast[0].op == 'ns' then @nsName = @result.ast[0].form.tail.head?.name
          nameSpace: @handleNameSpace()
          code: @scanNodes()
        handleNameSpace: ->
          @gennedNs = true
          needsExports = _.find @result.ast, (n)-> n.op == 'def'
          if @nsName
            nsObj = findNs @nsName, Leisure.WispNS, true
            names = {_ns_: true}
            for node in @result.ast when node.op == 'def'
              names[node.id.id.name] = true
            if @result.ast[0].op == 'ns' && @result.ast[0].require
              for req in @result.ast[0].require
                for ref in req.refer
                  names[translateIdentifierWord (ref.rename ? ref.name).name] = true
            nsObj.newNames _.keys names
            if needsExports
              if @wrapFunction then @reqs += "exports = exports || window.Leisure.WispNS.#{@nsName};\n"
              else @reqs += "var exports = window.Leisure.WispNS.#{@nsName};\n"
            if @result.ast[0].require then @reqs += """
              var require = function(s) {
                return Leisure.wispRequire(s, '#{@nsName}');
              };

            """
            if @result.ast[0].op != 'ns' then @reqs += """
              var _ns_ = {
                id: '#{@nsName}',
                doc: void 0
              };

            """
            else if @result.ast[0].doc then @splice = """
              exports._ns_.doc = _ns_.doc;

            """
            @end = @result.ast[0].end ? line: 0, column: 0
            if @pad then @splice = @splice.replace /\n/g, '\n' + @pad
            @gennedNs = false
          else if needsExports
            if @wrapFunction then @reqs += "exports = exports || {};\n"
            else @destroyExports = true
          if @pad then @reqs = @reqs.replace /\n/g, '\n' + @pad
          nsObj
        scanNodes: ->
          if @returnList
            exprs = _.filter _.map(@result.ast, (n, i)=>
              if !(n.op in ['def', 'ns']) && n.form && !(n.op == 'var' && n.form.name == 'debugger') then @result['js-ast'].body[i].loc), identity
            if exprs.length then @reqs += "var $ret$ = [];\n"
            else @returnList = false
          else if @wrapFunction then addReturn = true
          # splice in export, require, and namespace code at proper position
          # edit out "var " occurances because Scope objects already declare the variables
          # if returning a list, add expr results to list
          # replace the bottom source-mapping comment with a new one
          head = []
          tail = []
          foundEnd = false
          startedPush = false
          exprPos = 0
          returnNode = null
          destroyingExport = false
          # prevCode lookback hack for inserting 'push(' before operation
          prevCode = code: ''
          con = SourceMapConsumer.fromSourceMap @result['source-map']
          nodes = SourceNode.fromStringWithSourceMap @result.code, con
          if addReturn
            addReturn = lastLoc = _.last _.filter(_.map(@result.ast, (n, i)=> if !(n.op in ['def', 'ns']) && n.form then @result['js-ast'].body[i].loc?.start), identity)
          nodes.walk (code, loc)=>
            if code.match /\/\/# sourceMappingURL=/
              foundEnd = true
              code = code.replace /\/\/# sourceMappingURL=.*/, ''
              if !code.trim() then return
            else if foundEnd then return
            if @destroyExports && !destroyingExport && code == "exports" && prevCode.code.match(/ *= */)
              destroyingExport = true
              return
            else if destroyingExport
              if code.match(/ *= */) then destroyingExport = false
              return
            if @nsName then code = code.replace /^ *var /g, ' '
            if @returnList && !startedPush && loc.line >= exprs[exprPos]?.start.line && loc.column >= exprs[exprPos].start.column - 1
              startedPush = true
              if prevCode.node
                c = prevCode.node.children[0]
                c2 = c.replace /((^|\n) *)([^ \n]+)$/, '$1$$ret$$.push($3'
              if prevCode.node && c != c2 then prevCode.node.children[0] = c2
              else code = "$ret$.push(#{code}"
            if startedPush && loc.line? && (code.match(/;[ \n]*$/) || (loc.line >= exprs[exprPos].end.line && loc.column >= exprs[exprPos].end.column))
              startedPush = false
              code = code.replace(/;([ \n]*)$/, ');$1')
              exprPos++
            if @pad then code = code.replace /\n/g, '\n' + @pad
            node = new SourceNode loc.line, loc.column, loc.source, code, loc.name
            if addReturn && !returnNode && loc.line == lastLoc.line && loc.column >= lastLoc.column - 1
              returnNode = node
            if !@gennedNs && (loc.line < @end.line + 1 || (loc.line == @end.line + 1 && loc.column < @end.column))
              head.push node
            else
              @gennedNs = true
              tail.push node
            prevCode = {code, loc, node}
          file = (_.find nodes.children, (n)-> n instanceof SourceNode)?.source
          children = [head, new SourceNode(1, 0, file, @splice), tail]
          if returnNode
            code = returnNode.children[0]
            if _.last(tail) == returnNode then returnNode.children[0] = "return #{code}"
            else
              returnNode.children[0] = "var $ret$ = #{code}"
              children.push "\n#{@pad}return $ret$;\n"
          else if @returnList then children.push(if @wrapFunction then "\n#{@pad}return $ret$;\n" else "\n#{@pad}$ret$;\n")
          if startedPush then tail.push ");"
          if @reqs then children.unshift @reqs
          if @wrapFunction
            children.unshift "(function(exports, console){\n#{@pad}console = console ? console : window.console;\n#{@pad}"
            children.push '})'
          splicedResult = new SourceNode(1, 0, file, children).toStringWithSourceMap()
          if file then splicedResult.map.setSourceContent file, con.sourceContentFor file
          splicedResult.code + "\n//# sourceMappingURL=data:application/json;base64,#{btoa JSON.stringify splicedResult.map.toJSON()}\n"

      compile = (s, nsName, @wrapFunction, returnList)->
        new Compiler().compile s, nsName, @wrapFunction, returnList

      Leisure.wispCompile = compile
      Leisure.wispEval = wispEval = (args...)->
        {nameSpace, code} = compile args...
        if nameSpace then nameSpace.eval code
        else eval code
      Leisure.wispRequire = wispRequire
      Leisure.wispFindNs = findNs

      sourceMapFromCode = (code)->
        new SourceMapConsumer JSON.parse atob code.substring(code.lastIndexOf '\n', code.length - 2).match(/sourceMappingURL=.*base64,([^\n]*)\n/)[1]

      codeOffset = (err, code, src, originalSrc)->
        [ign, line, column] = err.stack.match /\n +at .*:([0-9]*):([0-9]*)/
        line = Number line
        column = Number column
        {line, column} = sourceMapFromCode(code).originalPositionFor {line: line - 1, column}
        lineColumnStrOffset(src, line, column) + (originalSrc ? src).length - src.length

      envFunc = (env)->
        env.executeText = (text, props, cont)-> setLounge this, =>
          result = [Leisure.wispEval(text)]
          if cont then cont result else result
        env.executeBlock = (block, props, cont)-> @compileBlock(block).call this, cont
        env.compileBlock = (block)->
          original = res = "#{blockSource(block).trim()}"
          try
            props = @data.properties(block)
            ns = props.namespace?.trim() ? undefined
            if ns
              if props.macro then macros = true
              res = "(ns #{ns})\n#{res}"
              ns = ns.match(/^[^ ]+/)[0]
              nsObj = findNs ns, Leisure.WispNS, true
            {nameSpace, code} = compile res, ns, true, true
            func = if nameSpace then nameSpace.eval code else eval code
            (cont, args...)->
              env = this
              envConsole = log: (args...)-> env.write args.join ' '
              try
                setLounge env, -> (cont ? identity) _.filter func(null, envConsole, args...), (n)-> typeof n != 'undefined'
              catch err
                console.error err.stack ? err
                if original != blockSource(env.data.getBlock block._id).trim()
                  console.error "Warning, code is from a different version of block #{block._id}"
                env.errorAt codeOffset(err, code, res, original), err.message
                (cont ? identity) []
          catch err
            console.error err.stack ? err
            if m = err.message.match /^([^\n]+)\nline:([^\n]+)\ncolumn:([^\n]+)(\n|$)/
              [ignore, msg, line, column] = m
              pos = lineColumnStrOffset(res, Number(line.trim()), Number(column.trim()))
              pos += original.length - res.length
              env.errorAt pos, msg
            else if code
              env.errorAt codeOffset(err, code, res, original), err.message
            else env.errorAt 0, err.message
        env.generateCode = (text, noFunc)-> debugger
        env

      (env)->
        wispPromise().then ->
          envFunc env
          resolve envFunc
