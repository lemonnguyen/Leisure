###
Copyright (C) 2013, Bill Burdick, Tiny Concepts: https://github.com/zot/Leisure

(licensed with ZLIB license)

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
claim that you wrote the original software. If you use this software
in a product, an acknowledgement in the product documentation would be
appreciated but is not required.

2. Altered source versions must be plainly marked as such, and must not be
misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.
###

{
  getType,
  cons,
  define,
  unescapePresentationHtml,
} = require './ast'
{
  resolve,
  lazy,
  defaultEnv,
} = root = module.exports = require './base'
rz = resolve
lz = lazy
{
  newConsFrom,
  setValue,
  getValue,
} = require './runtime'

consFrom = newConsFrom
Nil = rz L_nil

{
  TAB,
  ENTER,
  BS,
  DEL,
  LEFT,
  RIGHT,
  UP,
  DOWN,
} = require './browserSupport'
{
  parseOrgMode,
  Headline,
  Meat,
  Keyword,
  Source,
  Results,
  SimpleMarkup,
  headlineRE,
  HL_TAGS,
  parseTags,
  matchLine,
} = require './org'
_ = require './lodash.min'

PAGEUP = 33
PAGEDOWN = 34

editDiv = null
sourceDiv = null
modifying = false
styleCache = {}
idCount = 0
nodes = {}
needsReparse = false
reparseListeners = []

nextOrgId = -> 'org-node-' + idCount++

getOrgType = (node)-> node?.getAttribute? 'data-org-type'

root.currentMode = null

parentSpec = null
sourceSpec = null

fs = null

initOrg = (parent, source)->
  parentSpec = parent
  sourceSpec = source
  $("<div LeisureOutput contentEditable='false' id='leisure_bar'><div id='leisure_popup'><a id='saveButton' download='leisureFile.lorg'><button><div></div></button></a><div class=\"leisure_theme\"><span>Theme: </span>\n  <select id='themeSelect'>\n    <option value='flat'>Flat</option>\n    <option value=steampunk>Steampunk</option>\n   <option value=googie>Googie</option>\n   <option value=cthulhu>Cthulhu</option>\n  </select></div>\n<input id='nwSaveButton' type='file' nwsaveas onchange='Leisure.saveFile(this)'></input></div><div id='leisure_button'></div></div>")
    .prependTo(document.body)
    .find('#leisure_button').mousedown (e)->
      e.preventDefault()
      root.currentMode.leisureButton()
  $("#themeSelect").change (e) ->
     return Leisure.setTheme(e.target.value)
  b = $('#saveButton')
  if nwDispatcher?
    $(document.body).addClass 'nw'
    $('#nwSaveButton')[0].parentSpec = parentSpec
    fs = require 'fs'
  b.mousedown ->
    if root.repo then root.storeInGit $(parent).text(), null, null, (err)->
      if err then alert "Conflict while attempting to save file to Git.\nPlease take recovery measures."
    else if nwDispatcher? then $('#nwSaveButton').click()
    else
      #console.log "SAVE"
      #console.log encodeURIComponent $(parent)[0].textContent
      #b.attr 'href', "data:text/plain;base64,#{encodeURIComponent btoa $(parent)[0].textContent}"
      console.log "SAVE: data:text/plain,#{encodeURIComponent $(parent).text()}"
      b.attr 'href', "data:text/plain,#{encodeURIComponent $(parent).text()}"
      #b.attr 'href', "http://google.com"
  (root.currentMode = Leisure.fancyOrg).useNode $(parent)[0], source
  Leisure.initStorage '#login', '#panel', root.currentMode

saveFile = (fileInput)->
  if file = fileInput.files[0]
    fileInput.files.clear()
    fs.writeFile file.path, $(fileInput.parentSpec).text(), (err)->
      if err then alert("Error saving file #{file.path}: #{err}")

splitLines = (str)->
  result = []
  pos = 0
  while pos < str.length
    nl = str.indexOf '\n', pos
    if nl == -1
      result.push (str.substring pos) + '\n'
      break
    else result.push str.substring pos, nl + 1
    pos = nl + 1
  result

moveCaret = (r, node, offset)->
  r.setStart node, offset
  r.collapse true
  selectRange r

selectRange = (r)->
  sel = getSelection()
  sel.removeAllRanges()
  sel.addRange r

contains = (parent, child)-> child != null && (parent == child || (contains parent, child.parentNode))

getRangeXY = (r)->
  rects = r.getClientRects()
  leftMost = rects[0]
  for rect in rects
    if rect.left < leftMost.left then leftMost = rect
  leftMost

findCharForColumn = (node, col, start, end)->
  testRng = document.createRange()
  testRng.setStart node, start
  testRng.collapse true
  for i in [end - 1 .. start] by -1
    testRng.setStart node, i
    testRct = getRangeXY testRng
    if testRct.left <= col
      moveCaret testRng, node, testRng.startOffset
      return true
  false

rectFor = (node)->
  r = document.createRange()
  if node.nodeType == 3 && node.data[node.length - 1] == '\n'
    r.setStart node, 0
    r.setEnd node, node.length - 1
  else r.selectNode node
  rect = r.getBoundingClientRect()
  if rect.width == 0 then getRangeXY r else rect

movementGoal = null

moveSelectionUp = (parent, r, start)->
  container = r.startContainer
  startRect = getRangeXY r
  if !(prevKeybinding in [keyFuncs.nextLine, keyFuncs.previousLine]) then movementGoal = startRect.left
  elRect = rectFor container
  if startRect.top > elRect.top
    txt = r.startContainer.textContent
    prevEnd = txt.substring(0, r.startOffset).lastIndexOf '\n'
    prevStart = txt.substring(0, prevEnd).lastIndexOf('\n') + 1
    if findCharForColumn r.startContainer, movementGoal, prevStart, prevEnd then return
  first = textNodeAfter parent
  prev = null
  prevRect = null
  while container != first
    if !(isCollapsed container)
      prev = container
      prevRect = elRect
    container = textNodeBefore container
    if !isCollapsed container
      elRect = rectFor container
      if elRect.top < prevRect.top < startRect.top
        if !findCharForColumn prev, movementGoal, 0, prev.length then moveCaret r, prev, 0
        return
      if elRect.left <= movementGoal < elRect.right && findCharForColumn container, movementGoal, 0, container.length then return

moveSelectionDown = (parent, r, start)->
  container = r.startContainer
  startRect = getRangeXY r
  if !(prevKeybinding in [keyFuncs.nextLine, keyFuncs.previousLine]) then movementGoal = startRect.left
  elRect = rectFor container
  if startRect.bottom < elRect.bottom
    txt = r.startContainer.textContent
    start = txt.indexOf '\n', r.startOffset + 1
    if start > -1
      end = txt.indexOf '\n', start + 1
      if end == -1 then end = r.startContainer.length
      if findCharForColumn r.startContainer, movementGoal, start, end then return
  last = textNodeBefore parent
  prev = null
  prevRect = null
  while container != last
    if !(isCollapsed container)
      prev = container
      prevRect = elRect
    container = textNodeAfter container
    if !isCollapsed container
      elRect = rectFor container
      if startRect.bottom < prevRect.bottom < elRect.bottom
        if !findCharForColumn prev, movementGoal, 0, prev.length then moveCaret r, prev, 0
        return
      if elRect.left <= movementGoal < elRect.right
        end = container.data.indexOf '\n'
        if end == -1 then end = container.length
        if findCharForColumn container, movementGoal, 0, end then return

nextVisibleNewline = (textNode, offset)->
  scanForward textNode, -1, (whenNotCollapsed (node)-> node.data.indexOf '\n', offset + 1), whenNotCollapsed (node)-> node.data.indexOf '\n'

whenNotCollapsed = (block)-> (node)-> if isCollapsed node then -1 else block node

scanForward = (textNode, falseValue, firstBlock, block)->
  if (val = firstBlock textNode) != falseValue then [textNode, val]
  else
    while (textNode = textNodeAfter textNode) && (val = block textNode) == falseValue
      true
    if textNode then [textNode, val] else []

moveSelectionFB = (parent, r, start, delta)->
  r.collapse start
  startContainer = r.startContainer
  startOffset = r.startOffset + delta
  move = (if delta < 0 then textNodeBefore else textNodeAfter)
  while true
    if isCollapsed startContainer then startContainer = move startContainer
    else
      #check for boundary crossing
      if !(0 <= startOffset <= startContainer.length)
        startContainer = move startContainer
        if isCollapsed startContainer
          while isCollapsed startContainer
            startContainer = move startContainer
        if delta < 0 && startContainer != null then startOffset = startContainer.length - 1
        else startOffset = 1
      if startContainer != null && contains parent, startContainer
        if startOffset < startContainer.length
          r.setStart startContainer, startOffset
          r.collapse true
          selectRange r
          return
        else
          startContainer = move startContainer
          startOffset = 0
      else return

# functions return whether to check for mods
keyFuncs =
  backwardChar: (e, parent, r)->
    e.preventDefault()
    moveSelectionFB parent, r, true, -1
    false
  forwardChar: (e, parent, r)->
    e.preventDefault()
    moveSelectionFB parent, r, false, 1
    false
  previousLine: (e, parent, r)->
    e.preventDefault()
    moveSelectionUp parent, r
    false
  nextLine: (e, parent, r)->
    e.preventDefault()
    moveSelectionDown parent, r
    false
  swapMarkup: (e, parent, r)->
    e.preventDefault()
    swapMarkup()
    false
  expandTemplate: (e, parent, r)->
    e.preventDefault()
    txt = r.startContainer
    if r.collapsed && txt.nodeType == 3 && ((r.startOffset > 2 && txt.data[r.startOffset - 3] == '\n') || (r.startOffset == 2 && followsNewline txt))
      str = txt.data.substring r.startOffset - 2, r.startOffset
      if exp = templateExpansions[str]
        start = r.startOffset
        [first, second] = exp
        pos = (getTextPosition parent, txt, start) - 2
        if start == txt.data.length
          next = null
          txt.data = txt.data.substring 0, txt.data.length - 2
        else
          next = (if start == 2 then txt else txt.splitText start - 2)
          next.data = next.data.substring 2
        txt.parentNode.insertBefore (document.createTextNode first + second), next
        selectRange nativeRange findDomPosition parent, pos + first.length
        reparse parent

followsNewline = (txt)->
  prev = textNodeBefore txt
  !prev || prev.data[prev.data.length - 1] == '\n'

templateExpansions =
  '<s': ['#+BEGIN_SRC leisure\n', '\n#+END_SRC']
  '<=': ['#+BEGIN_SRC leisure :results def\n', '\n#+END_SRC']
  '<d': ['#+BEGIN_SRC leisure :results dynamic\n', '\n#+END_SRC']
  '<h': ['#+BEGIN_HTML\n', '\n#+END_HTML']

defaultBindings =
  'C-C C-C': keyFuncs.swapMarkup
  'C-F': keyFuncs.forwardChar
  'C-B': keyFuncs.backwardChar
  'C-P': keyFuncs.previousLine
  'C-N': keyFuncs.nextLine
  'UP': keyFuncs.previousLine
  'DOWN': keyFuncs.nextLine
  'LEFT': keyFuncs.backwardChar
  'RIGHT': keyFuncs.forwardChar
  'TAB': keyFuncs.expandTemplate

swapMarkup = ->
  root.currentMode = (if root.currentMode == Leisure.fancyOrg then Leisure.basicOrg else Leisure.fancyOrg)
  root.restorePosition parentSpec, -> root.currentMode.useNode $(parentSpec)[0], sourceSpec

getStyle = (node)->
  if !node.orgId
    node.orgId = node.getAttribute 'data-org-id'
    if !node.orgId
      modifying = true
      node.setAttribute 'data-org-id', (node.orgId = nextOrgId())
      modifying = false
  style = styleCache[node.orgId]
  if !style then style = styleCache[node.orgId] = getComputedStyle node
  style

# Thanks to rangy for this: http://code.google.com/p/rangy/
isCollapsedOld = (node)->
  if node
    type = node.nodeType
    type == 7 || # PROCESSING_INSTRUCTION
    type == 8 || # COMMENT
    (type == 3 && (node.data == '' || isCollapsed(node.parentNode))) ||
    /^(script|style)$/i.test(node.nodeName) ||
    (type == 1 && (node.classList.contains('collapsed') || getStyle(node).display == 'none' ||
    isCollapsed(node.parentNode)))
  else false

# Thanks to rangy for this: http://code.google.com/p/rangy/
isCollapsed = (node)->
  if node
    type = node.nodeType
    type == 7 || # PROCESSING_INSTRUCTION
    type == 8 || # COMMENT
    (type == 3 && (node.data == '' || isCollapsed(node.parentNode))) ||
    /^(script|style)$/i.test(node.nodeName) ||
    (type == 1 && (node.offsetWidth == 0 || node.offsetHeight == 0))
  else false

markupOrg = (text)->
  [node, result] = markupOrgWithNode text
  result

markupOrgWithNode = (text)->
  nodes = {}
  # ensure trailing newline -- contenteditable doesn't like it, otherwise
  if text[text.length - 1] != '\n' then text = text + '\n'
  org = parseOrgMode text
  [org, markupNode(org, true)]

boundarySpan = "<span data-org-type='boundary'>\n</span>"

sensitive = /^srcStart|^headline-|^keyword/

orgAttrs = (org)->
  if !org.nodeId then org.nodeId = nextOrgId()
  nodes[org.nodeId] = org
  extra = if rt = resultsType org then " data-org-results='#{rt}'"
  else ''
  t = org.allTags()
  if t.length then extra += " data-org-tags='#{escapeAttr t.join(' ')}'"; global.ORG=org
  if org instanceof Keyword && !(org instanceof Source) && org.next instanceof Source  && org.name?.toLowerCase() == 'name' then extra += " data-org-name='#{escapeAttr org.info}'"
  if org instanceof Headline then extra += " data-org-headline='#{escapeAttr org.level}'"
  if org.srcId then extra += " data-org-srcid='#{escapeAttr org.srcId}'"
  "id='#{escapeAttr org.nodeId}' data-org-type='#{escapeAttr org.type}'#{extra}"

resultsType = (org)-> org instanceof Source && (org.info.match /:results *([^ ]*)/)?[1].toLowerCase()

isDynamic = (org)-> resultsType(org) == 'dynamic'

isDef = (org)-> resultsType(org) == 'def'

orgSrcAttrs = (org)->
  "data-org-src='#{if isDef org then 'def' else if isDynamic org then 'dynamic' else 'example'}'"

markupNode = (org, start)->
  if org instanceof Source || org instanceof Results
    pos = org.contentPos - org.offset - 1
    text = org.text.substring pos
    "<span #{orgAttrs org}#{codeBlockAttrs org}><span data-org-type='text'>#{escapeHtml org.text.substring(0, pos)}</span><span #{orgSrcAttrs org}>#{contentSpan text}</span></span>"
  else if org instanceof Headline then "<span #{orgAttrs org}>#{contentSpan org.text, 'text'}#{markupGuts org, checkStart start, org.text}</span>"
  else if org instanceof SimpleMarkup then markupSimple org
  else "<span #{orgAttrs org}>#{content org.text}</span>"

markupSimple = (org)->
  guts = ''
  for c in org.children
    guts += markupNode c
  t = org.text[0]
  switch org.markupType
    when 'bold' then "<b>#{t}#{guts}#{t}</b>"
    when 'italic' then "<i>#{t}#{guts}#{t}</i>"
    when 'underline' then "<span style='text-decoration: underline'>#{t}#{guts}#{t}</span>"
    when 'strikethrough' then "<span style='text-decoration: line-through'>#{t}#{guts}#{t}</span>"
    when 'code' then "<code>#{t}#{guts}#{t}</code>"
    when 'verbatim' then "<code>#{t}#{guts}#{t}</code>"

codeBlockAttrs = (org)->
  while (org = org.prev) instanceof Meat
    if org instanceof Keyword && org.name.match /^name$/i
      return " data-org-codeblock='#{escapeAttr org.info.trim()}'"
  ''

createResults = (srcNode)->

checkStart = (start, text)-> start && (!text || text == '\n')

isSourceNode = (node)-> node?.getAttribute?('data-org-type') == 'source'

isDocNode = (node)-> node?.hasAttribute?('maindoc')

markupGuts = (org, start)->
  if !org.children.length then ''
  else
    prev = if start then null else org
    (for c in org.children
      s = start
      start = false
      p = prev
      prev = c
      optionalBoundary(p, c) + markupNode(c, s)).join ""

#optionalBoundary = (prev, node)-> if prev && (prev.block || node.block) then boundarySpan else ''
optionalBoundary = (prev, node)-> if prev && prev.text[prev.text.length - 1] == '\n' then boundarySpan else ''

contentSpan = (str, type)->
  str = content str
  if str then "<span#{if type then " data-org-type='#{escapeAttr type}'" else ''}>#{escapeHtml str}</span>" else ''

content = (str)-> escapeHtml (if str[str.length - 1] == '\n' then str.substring(0, str.length - 1) else str)

fixupNodes = (node)->
  for n in $(node).find('[data-org-type="headline"]')
    setTags n

isCollapsibleText = (node)-> node.nodeType == 3 && node.parentNode.getAttribute('data-org-type') in ['text', 'meat']

shiftKey = (c)-> 15 < c < 19

specialKeys = {}
specialKeys[TAB] = 'TAB'
specialKeys[ENTER] = 'ENTER'
specialKeys[BS] = 'BS'
specialKeys[DEL] = 'DEL'
specialKeys[LEFT] = 'LEFT'
specialKeys[RIGHT] = 'RIGHT'
specialKeys[UP] = 'UP'
specialKeys[DOWN] = 'DOWN'
specialKeys[PAGEUP] = 'PAGEUP'
specialKeys[PAGEDOWN] = 'PAGEDOWN'

modifiers = (e, c)->
  res = specialKeys[c] || String.fromCharCode(c)
  if e.altKey then res = "M-" + res
  if e.ctrlKey then res = "C-" + res
  if e.shiftKey then res = "S-" + res
  res

lastKeys = []
maxLastKeys = 4
keyCombos = []

addKeyPress = (e, c)->
  if notShift = !shiftKey c
    lastKeys.push modifiers(e, c)
    while lastKeys.length > maxLastKeys
      lastKeys.shift()
    keyCombos = new Array(maxLastKeys)
    for i in [0...Math.min(lastKeys.length, maxLastKeys)]
      keyCombos[i] = lastKeys[lastKeys.length - i - 1 ... lastKeys.length].join ' '
    keyCombos.reverse()
  notShift

prevKeybinding = curKeyBinding = null

setCurKeyBinding = (f)->
  prevKeybinding = curKeyBinding
  curKeyBinding = f

findKeyBinding = (e, parent, r)->
  for k in keyCombos
    if f = root.currentMode.bindings[k]
      lastKeys = []
      keyCombos = []
      setCurKeyBinding f
      return [true, f e, parent, r]
  setCurKeyBinding null
  [false]

bindContent = (div)->
  fixupNodes div
  div.addEventListener 'mousedown', (e)-> setCurKeyBinding null
  div.addEventListener 'keydown', (e)->
    c = (e.charCode || e.keyCode || e.which)
    if !addKeyPress e, c then return
    s = getSelection()
    r = s.getRangeAt(0)
    el = r.startContainer
    par = el.parentNode
    [bound, checkMod] = findKeyBinding e, div, r
    if bound then cancelled = !checkMod
    else
      checkMod = modifyingKey c
      cancelled = false
    if !bound
      if c == TAB
        e.preventDefault()
        cancelled = true
        collapseNode()
      else if String.fromCharCode(c) == 'C' && e.altKey
        root.orgApi.executeSource div, getSelection().focusNode
      else if c == ENTER
        e.preventDefault()
        cancelled = true
        n = s.focusNode
        inCollapsedText = r.collapsed && isCollapsibleText el && par.parentElement.classList.contains('collapsed') && el.nextSibling == null
        if inCollapsedText && r.startOffset == el.length then return
        # Make sure that newlines at the end of a 'text' span go after the span
        else if r.collapsed && r.startOffset == n.length && isCollapsibleText n
          br = document.createTextNode('\n')
          $(br).prependTo followingSpan n.parentNode
          r.setStart br, br.length
          r.setEnd br, br.length
        else
          window.N = n
          r.insertNode br = document.createTextNode(checkExtraNewline r, n, div)
          br.parentNode.normalize()
        r.collapse()
        selectRange r
        checkEnterReparse div, r
      else if c in [DEL, BS]
        inCollapsedText = r.collapsed && isCollapsibleText el && par.parentElement.classList.contains('collapsed') && el.nextSibling == null
        if inCollapsedText && ((c == DEL && r.startOffset == el.length - 1) || (c == BS && r.startOffset == el.length))
          e.preventDefault()
          cancelled = true
          el.data = el.data.substring 0, el.data.length - 1
          r.setStart el, el.data.length
          r.setEnd el, el.data.length
          selectRange r
        else if c == DEL && inCollapsedText && r.startOffset >= el.length - 1
          e.preventDefault()
          cancelled = true
        else if backspace div, e then cancelled = true
        else if c != BS
          checkDeleteReparse div, c == BS
    if !cancelled && checkMod
      if (getOrgType getOrgParent el) == 'boundary' then needsReparse = true
      currentMatch = matchLine currentLine div
      setTimeout (->checkSourceMod div, currentMatch), 1
  div.addEventListener 'DOMCharacterDataModified', handleMutation, true
  div.addEventListener 'DOMSubtreeModified', handleMutation, true
  displaySource()

modifyingKey = (c)-> (
  (47 < c < 58)          || # number keys
  c == 32 || c == ENTER  || # spacebar and enter
  c == BS || c == DEL    || # backspace and delete
  (64 < c < 91)          || # letter keys
  (95 < c < 112)         || # numpad keys
  (185 < c < 193)        || # ;=,-./` (in order)
  (218 < c < 223)          # [\]' (in order)
  )

currentLine = (parent)->
  r = getSelection().getRangeAt(0)
  if r.collapsed && r.startContainer.nodeType == 3
    nl = r.startContainer.data.substring(0, r.startOffset).lastIndexOf '\n'
    lineText = r.startContainer.data
    lineStart = -1
    lineEnd = -1
    if -1 < nl < r.startOffset then lineStart = nl
    else
      node = r.startContainer
      while node && lineStart == -1
        if node = textNodeBefore node
          lineText = node.data + lineText
          lineStart = node.data.lastIndexOf '\n'
    nl = r.startContainer.data.indexOf '\n', r.startOffset
    if nl >= r.startOffset then lineEnd = nl + lineText.length - r.startContainer.data.length
    else
      node = r.startContainer
      while node && lineEnd == -1
        if node = textNodeAfter node
          lineText += node.data
          if (nl = node.data.indexOf '\n') > -1 then lineEnd = nl + lineText.length - r.startContainer.data.length
    if lineEnd == -1 then lineEnd = lineText.length
    lineText.substring lineStart + 1, lineEnd
  else ''

collapseNode = ->
  node = getCollapsible getSelection().focusNode
  if node
    if !isEmptyCollapsible node
      modifying = true
      $(node).toggleClass 'collapsed'
      styleCache = {}
      modifying = false
    else status "EMPTY ENTRY"

isBoundary = (node)->
  (node.nodeType == 1 && node.getAttribute('data-org-type') == 'boundary' && node) || (node.nodeType == 3 && isBoundary node.parentElement)

backspace = (parent, e)->
  if checkCollapsed -1
    e.preventDefault()
    true
  else false

#checkCollapsed = (delta)->
#  s = rangy.getSelection()
#  r = s.getRangeAt 0
#  if delta < 0 then r.moveStart 'character', delta else r.moveEnd 'character', delta
#  if r.startContainer == r.endContainer then false
#  else if boundary = isBoundary (if delta < 0 then r.startContainer else r.endContainer)
#    if delta < 0
#      r.setStartBefore boundary
#      r.moveStart 'character', -1
#    else
#      r.setEndAfter boundary
#      r.moveEnd 'character', 1
#    for n in r.getNodes()
#      if r.containsNode(n) && isCollapsed n then return true
#    false
#  else false

checkCollapsed = (delta)->
  node = getSelection().focusNode
  node && (isCollapsed (if delta < 0 then textNodeBefore else textNodeAfter) node)

checkSourceMod = (parent, oldMatch)->
  r = getSelection().getRangeAt 0
  if (newMatch = matchLine(currentLine parent)) != oldMatch || (newMatch && newMatch.match sensitive) then reparse parent
  else if n = getOrgParent r.startContainer
    switch n.getAttribute('data-org-results')?.toLowerCase()
      when 'dynamic' then root.orgApi.executeSource parent, r.startContainer
      when 'def' then root.orgApi.executeDef n

replacements =
  '<': '&lt;'
  '>': '&gt;'

escapeHtml = (str)->
  if typeof str == 'string' then str.replace /[<>]/g, (c)-> replacements[c]
  else str

escapeAttr = (str)->
  if typeof str == 'string' then str.replace /['"&]/g, (c)->
    switch c
      when '"' then '&quot;'
      when "'" then '&#39;'
      when '&' then '&amp;'
  else str

presentValue = (v)-> rz(L_showHtml) lz v
#  if (getType v) == 'svgNode'
#    cnt = v(-> id)
#    L_svgPresent()(-> cnt)(-> id)
#  else if (getType v) == 'html' then rz(L_getHtml)(lz v)
#  else if (getType v) == 'parseErr' then "PARSE ERROR: #{getParseErr v}"
#  else escapeHtml show v


orgEnv = (parent, node)->
  r = getResultsForSource parent, node
  env =
    presentValue: presentValue
    readFile: (filename, cont)-> window.setTimeout (->$.get filename, (data)-> cont false, data), 1
    writeFile: ->
    newCodeContent: (name, con)-> console.log "NEW CODE CONTENT: #{name}, #{con}"
    __proto__: defaultEnv
  if r
    r.innerHTML = ''
    env.write = (str)-> r.textContent += "\n: #{str.replace /\n/g, '\n: '}"
  else env.write = (str)-> console.log ": #{str.replace /\n/g, '\n: '}\n"
  env

baseEnv =
  __proto__: defaultEnv
  readFile: (filename, cont)-> window.setTimeout (->$.get filename, (data)-> cont false, data), 1
  write: (str)-> console.log unescapePresentationHtml str
  newCodeContent: (name, con)-> console.log "NEW CODE CONTENT: #{name}, #{con}"

getResultsForSource = (parent, node)->
  checkReparse parent
  res = node
  while getOrgType(res.nextSibling) == 'boundary' || (getOrgType(res.nextSibling) == 'meat' && res.textContent.match /^[ \n]*$/)
    res = res.nextSibling
  res = res.nextSibling
  if res?.getAttribute('data-org-type') == 'results' then res.lastChild
  else
    org = parseOrgMode getNodeText parent
    pos = getTextPosition parent, node, 0
    src = org.findNodeAt pos
    if pos > -1
      results = src.next
      if !(results instanceof Results)
        results = if results instanceof Meat && results.text.match /^[ \n]*$/ then results.next
        if !(results instanceof Results) then results = newResults parent, src
      getCollapsible(findDomPosition(parent, results.offset + 1)[0]).lastChild
    else null

checkReparse = (parent)-> if needsReparse then reparse parent

nativeRange = (r)->
  if r instanceof Range then r
  else
    r2 = document.createRange()
    container = if r instanceof Array then r[0] else r.startContainer
    if !container then null
    else
      offset = if r instanceof Array then r[1] else r.startOffset
      r2.setStart container, offset
      r2.collapse true
      r2

hasParent = (node, ancestor)-> node == ancestor || (node && hasParent node.parent, ancestor)

restorePosition = (parent, block)->
  sel = getSelection()
  #if sel.rangeCount && hasParent sel.focusNode, $(parent)
  if sel?.rangeCount
    #if !(hasParent sel.focusNode, $(parent)[0]) then console.log parent, 'is not a parent of ', sel.focusNode
    r = sel.getRangeAt 0
    start = getTextPosition $(parent)[0], r.startContainer, r.startOffset
    end = getTextPosition $(parent)[0], r.endContainer, r.endOffset
    block()
    if start > -1 && (r = nativeRange findDomPosition $(parent)[0], start)
      [endContainer, endOffset] = findDomPosition $(parent)[0], end
      r.setEnd endContainer, endOffset
      selectRange r
  else block()

crnl = (data)-> data.replace /\r\n/g, '\n'

loadOrg = (parent, text, path)->
  text = crnl text
  if nwDispatcher?
    $('#nwSaveButton').attr 'nwsaveas', path
  else
    $('#saveButton').attr 'download', path
  reparse parent, text
  setTimeout (->
    for node in $(parent).find('[data-org-src="def"]')
      executeDef node), 1

reparse = (parent, text)->
  styleCache = {}
  text = text ? getNodeText parent
  sel = getSelection()
  [orgNode, orgText] = root.orgApi.markupOrgWithNode text
  root.restorePosition parent, -> root.orgApi.installOrgDOM parent, orgNode, orgText
  needsReparse = false
  setTimeout (->
    for l in reparseListeners
      l parent, orgNode, orgText
    ), 1

installOrgDOM = (parent, orgNode, orgText)-> parent.innerHTML = orgText

#checkDeleteReparse = (parent, backspace)->
#  r = rangy.getSelection().getRangeAt 0
#  if backspace then r.moveStart 'character', -1 else r.moveEnd 'character', 1
#  if r.text() == '\n' then setTimeout (->reparse parent), 1

checkDeleteReparse = (parent, backspace)->
  r = getSelection().getRangeAt 0
  if backspace
    if r.startOffset == 0 then (prev = textNodeBefore r.startContainer) && prev.data[prev.data.length - 1] == '\n'
    else r.startContainer.data[r.startOffset - 1] == '\n'
  else
    if r.startOffset == r.startContainer.data.length then (next = textNodeAfter r.startContainer) && next.data[0] == '\n'
    else r.startContainer.data[r.startOffset + 1] == '\n'

checkEnterReparse = (parent, r)->
  if (result = getCollapsible r.startContainer) then reparse parent
  result

newResults = (parent, src)->
  text = src.top().allText()
  srcEnd = src.end()
  reparse parent, text.substring(0, srcEnd) + "#+RESULTS:\n: \n" + text.substring(srcEnd)
  findOrgNode parent, srcEnd + 1

id = lz (x)-> rz x
getLeft = (x)-> x(id)(id)
getRight = (x)-> x(id)(id)
show = (obj)-> if L_show? then rz(L_show)(lz obj) else console.log obj

propsFor = (node)->
  props = Nil
  tags = (node.getAttribute('data-org-tags') || '').trim()
  if tags then props = cons cons('tags', consFrom (tags).trim().split ' '), props
  name = (node.getAttribute('data-org-codeblock') || '').trim()
  if name then props = cons cons('block', name), props
  props

executeText = (text, props, env, cont)->
  old = getValue 'parser_funcProps'
  setValue 'parser_funcProps', props
  result = rz(L_baseLoadString)('notebook')(text)
  runMonad result, env, (results)->
    while results != L_nil()
      res = results.head().tail()
      if getType(res) == 'left' then env.write "PARSE ERROR: #{getLeft res}"
      else env.write String(env.presentValue getRight res)
      results = results.tail()
    setValue 'parser_funcProps', old
    cont?()

getSource = (node)->
  while node && !isSourceNode node
    node = node.parentNode
  if node
    txt = $(node).text().substring($(node).find('[data-org-type="text"]').text().length)
    m = txt.match /(^|\n)#\+end_src/i
    if m then txt.substring(0, m.index) else null

executeSource = (parent, node, cont)->
  if isSourceNode node
    checkReparse parent
    if txt = getSource node then executeText txt, propsFor(node), orgEnv(parent, node), cont
    else console.log "No end for src block"
  else if getOrgType(node) == 'text' then needsReparse = true
  else !isDocNode(node) && executeSource parent, node.parentElement

getNodeSource = (node)->
  while !isSourceNode node
    node = node.parentNode
    if !node then return []
  [node, $(node).find('[data-org-src]')[0].textContent]

# given a node, find the enclosing source node and execute it's content as a definition
executeDef = (node, cont)->
  [srcNode, text] = getNodeSource node
  if srcNode then executeText text, propsFor(srcNode), baseEnv, cont

followingSpan = (node)-> node.nextElementSibling ? $('<span></span>').appendTo(node.parentNode)[0]

# Need to insert an extra newline if all of these apply:
# 1) the range is collapsed
# 2) we are at the end of a text node
# 3) the text node does not end in a newline
# 4) the text node is at the end of the editable container
checkExtraNewline = (range, n, parent)->
  if range.collapsed && n.nodeType == 3 && range.startOffset == n.length && n.textContent[n.length - 1] != '\n' then checkLast n, parent
  else '\n'

checkLast = (n, parent)->
  if n == parent then '\n\n'
  else if n.nextSibling then '\n'
  else checkLast n.parentNode, parent

getTags = (headline)->
  if headline.getAttribute('dirty')
    cleanHeadline headline
    setTags headline
  headline.getAttribute 'data-org-tags'

setTags = (headline)->
  m = headline.firstChild.textContent.match headlineRE
  tags = ((m && parseTags m[HL_TAGS]) || []).join ' '
  if headline.getAttribute('data-org-tags') != tags then headline.setAttribute 'data-org-tags', tags

cleanHeadline = (node)->
  modifying = true
  node.removeAttribute 'dirty'
  modifying = false

handleMutation = (evt)->
  if !modifying
    invalidateOrgText()
    modifying = true
    if (node = getCollapsible evt.srcElement) && (node.getAttribute('data-org-type') == 'headline')
      node.setAttribute 'dirty', 'true'
    displaySource()
    modifying = false

displaySource = -> $(sourceDiv).html('').text($(editDiv).text())

isCollapsible = (node)-> node.getAttribute('data-org-type') in ['headline', 'source', 'results']

getCollapsible = (node)->
  if node.nodeType == 1
    if isCollapsible node then node
    else (node.getAttribute('data-org-type') in ['text', 'meat']) && getCollapsible node.parentElement
  else node.nodeType == 3 && getCollapsible node.parentElement

getOrgParent = (node)-> node && ((node.nodeType == 1 && isCollapsible(node) && node) || getOrgParent node.parentElement)

isEmptyCollapsible = (node)->
  firstLine = getTextLine node
  node.firstChild == node.lastChild

getTextLine = (node)->
  c = node.firstElementChild
  while c
    if c.getAttribute('data-org-type') == 'text' then return c
    c = c.nextElementSibling
  null

#
# location tools
#

findOrgNode = (parent, pos)->
  org = parseOrgMode getNodeText parent
  orgNode = org.findNodeAt pos

getTextPosition = (node, target, pos)->
  o = getTextPositionOld node, target, pos
  n = getTextPositionNew node, target, pos
  if o != n then console.log "OLD: #{o}, NEW: #{n}"
  n

getTextPositionNew = (node, target, pos)->
  if target.nodeType == 3
    up = false
    eat = false
    count = 0
    while node
      if node == target then return count + pos
      if node.nodeType == 3
        count += node.length
        eat = true
      node = textNodeAfter node
  -1

getTextPositionOld = (node, target, pos)->
  if node && target && pos
    r = document.createRange()
    r.setStart node, 0
    r.setEnd target, pos
    r.cloneContents().textContent.length
  else -1

findDomPosition = (node, pos)->
  parent = node
  while node
    if node.nodeType == 3
      if pos < node.length
        n = node
        while n != parent && n != null
          n = n.parentNode
        return if n == null then [null, null] else [node, pos]
      pos -= node.length
    node = textNodeAfter node
  [null, null]

textNodeAfter = (node)->
  eat = true
  up = false
  while node && (eat || node.nodeType != 3)
    eat = false
    if !up && node.firstChild then node = node.firstChild
    else if node.nextSibling
      node = node.nextSibling
      up = false
    else
      node = node.parentNode
      up = true
  node

textNodeBefore = (node)->
  eat = true
  up = false
  while node && (eat || node.nodeType != 3)
    eat = false
    if !up && node.lastChild then node = node.lastChild
    else if node.previousSibling
      node = node.previousSibling
      up = false
    else
      node = node.parentNode
      up = true
  node

#
# Shadow dom support
#

getNodeText = (node)-> node.textContent

if Element.prototype.webkitCreateShadowRoot?
  Element.prototype.createShadowRoot = Element.prototype.webkitCreateShadowRoot
  Element.prototype.__defineGetter__ 'shadowRoot', -> @webkitShadowRoot
  Element.prototype.__defineSetter__ 'shadowRoot', (val)-> @webkitShadowRoot = val
else if !document.body.createShadowRoot?
  hasShadow = false
  Element.prototype.createShadowRoot = ->
    hasShadow = true
    @setAttribute 'data-org-shadow', 'true'
  Element.prototype.__defineGetter__ 'shadowRoot', -> (@hasAttribute('data-org-shadow') && @) || null
  getNodeText = (node)->
    if hasShadow
      copy = $(node).clone()
      copy.find('[data-org-shadow]').remove()
      copy.text()
    else node.textContent
  oldReparse = reparse
  reparse = (parent, text)->
    oldReparse parent, text
    hasShadow = false

emptyOutNode = (node)->
  node.innerHTML = ''
  newNode = $(node)[0].cloneNode false
  $(node).after newNode
  $(node).remove()
  newNode

root.orgApi = null

cachedOrgText = null
cachedOrgParent = null
invalidateOrgText = -> cachedOrgParent = cachedOrgText = null
getOrgText = (parent)-> (cachedOrgParent == parent && cachedOrgText) || (cachedOrgParent = parent; cachedOrgText = parent.textContent)

orgNotebook =
  useNode: (node, source)->
    root.orgApi = @
    sourceDiv = source
    oldContent = $(node).text()
    newNode = emptyOutNode node
    editDiv = newNode
    #restorePosition newNode, => $(newNode).html @markupOrg oldContent
    [orgNode, lastOrgText] = @markupOrgWithNode oldContent
    root.restorePosition newNode, => @installOrgDOM newNode, orgNode, lastOrgText
    @bindContent newNode
  installOrgDOM: installOrgDOM
  redrawIssue: (i)-> console.log "REDRAW ISSUE: #{i}"

basicOrg =
  __proto__: orgNotebook
  markupOrg: markupOrg
  markupOrgWithNode: markupOrgWithNode
  bindContent: bindContent
  executeDef: executeDef
  executeSource: executeSource
  createResults: createResults
  installOrgDOM: (parent, orgNode, orgText)->
    parent.setAttribute 'class', 'org-plain'
    orgNotebook.installOrgDOM parent, orgNode, orgText
    #setTimeout (=>
    #  for node in $('[data-org-dynamic="true"]')
    #    @executeSource parent, $(node).find('[data-org-type=text]')[0].nextElementSibling
    #  for node in $('[data-org-results]')
    #    switch $(node).attr('data-org-results').toLowerCase()
    #      when 'dynamic' then @executeSource parent, $(node).find('[data-org-type=text]')[0].nextElementSibling
    #      when 'def'
    #        n = $(node).find('[data-org-type=text]')[0].nextElementSibling
    #        executeText n.textContent, propsFor(node), orgEnv parent, n), 1
  bindings: defaultBindings
  leisureButton: swapMarkup

root.basicOrg = basicOrg
root.orgNotebook = orgNotebook
root.markupOrg = markupOrg
root.bindContent = bindContent
root.cleanHeadline = cleanHeadline
root.getTags = getTags
root.reparse = reparse
root.reparseListeners = reparseListeners
root.findDomPosition = findDomPosition
root.getCollapsible = getCollapsible
root.getNodeText = getNodeText
root.parseOrgMode = parseOrgMode
root.orgAttrs = orgAttrs
root.content = content
root.contentSpan = contentSpan
root.checkStart = checkStart
root.optionalBoundary = optionalBoundary
root.boundarySpan = boundarySpan
root.displaySource = displaySource
root.checkEnterReparse = checkEnterReparse
root.checkCollapsed = checkCollapsed
root.checkExtraNewline = checkExtraNewline
root.followingSpan = followingSpan
root.currentLine = currentLine
root.checkSourceMod = checkSourceMod
root.getTextPosition = getTextPosition
root.isCollapsed = isCollapsed
root.nextOrgId = nextOrgId
root.modifyingKey = modifyingKey
root.getOrgParent = getOrgParent
root.getOrgType = getOrgType
root.executeText = executeText
root.executeDef = executeDef
root.propsFor = propsFor
root.orgEnv = orgEnv
root.baseEnv = baseEnv
root.getResultsForSource = getResultsForSource
root.initOrg = initOrg
root.swapMarkup = swapMarkup
root.modifiers = modifiers
root.keyFuncs = keyFuncs
root.defaultBindings = defaultBindings
root.addKeyPress = addKeyPress
root.findKeyBinding = findKeyBinding
root.invalidateOrgText = invalidateOrgText
root.setCurKeyBinding = setCurKeyBinding
root.presentValue = presentValue
root.escapeHtml = escapeHtml
root.escapeAttr = escapeAttr
root.restorePosition = restorePosition
root.splitLines = splitLines
root.orgSrcAttrs = orgSrcAttrs
root.getNodeSource = getNodeSource
root.loadOrg = loadOrg
root.resultsType = resultsType
root.isDynamic = isDynamic
root.isDef = isDef
root.nativeRange = nativeRange
root.textNodeBefore = textNodeBefore
root.textNodeAfter = textNodeAfter
root.PAGEUP = PAGEUP
root.PAGEDOWN = PAGEDOWN
root.saveFile = saveFile
root.nextVisibleNewline = nextVisibleNewline
