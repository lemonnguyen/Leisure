if window? and (!global? or global == window)
  # running in a browser
  window.global = window
  Lazp = window.Lazp
  output = null
  write = (msg)->
    if !output? then output = document.getElementById('output')
    output.innerHTML += "#{msg}"
  prompt = (msg, cont)-> cont(window.prompt(msg))
  window.Prim = root = {}
else
  # running in node
  root = exports ? this
  Lazp = require('./lazp')
  Pretty = require('./pretty')
  U = require('util')
  RL = require('readline')
  tty = null
  write = (msg)-> process.stdout.write(msg)
  prompt = (msg, cont)-> tty.question(msg, cont)

setTty = (rl)-> tty = rl

define = Lazp.define
getType = Lazp.getType
laz = Lazp.laz

define 'is', (value)-> (type)-> if value()?.type == type().dataType then `_true()` else `_false()`
define 'eq', (a)-> (b)-> if a() == b() then `_true()` else` _false()`
define 'getType', (value)-> if type = getType(value()) then _some()(->type) else _none()
define 'parse', (value)->
  [prepped, err] = Lazp.prepare String(value())
  if err? then _right()(laz("Error: #{err}"))
  else
    [ast, err, rest] = Lazp.parseFull(prepped)
    if err? then _right()(laz("Error: #{err}"))
    else if rest?.trim() then _right()(laz("Error, input left after parsing: '#{rest.trim()}'"))
    else _left()(laz(ast))

define '+', (a)->(b)->a() + b()
define '-', (a)->(b)->a() - b()
define '*', (a)->(b)->a() * b()
define '/', (a)->(b)->a() / b()
define '%', (a)->(b)->a() % b()
define 'floor', (a)->Math.floor(a())
define 'ceil', (a)->Math.ceil(a())
define 'round', (a)->Math.round(a())


define '>', (a)->(b)->if a() > b() then `_true()` else `_false()`
define '<', (a)->(b)->if a() < b() then `_true()` else `_false()`
define 'gt', (a)->(b)->if a() > b() then `_true()` else `_false()`
define 'gte', (a)->(b)->if a() >= b() then `_true()` else `_false()`
define 'lt', (a)->(b)->if a() < b() then `_true()` else `_false()`
define 'lte', (a)->(b)->if a() <= b() then `_true()` else `_false()`

###
define '++', (a)->a() + 1
define '--', (a)->a() - 1
define 'iszero', (a)-> if 0 == a() then `_true()` else` _false()`

define 'randInt', (from)->(to)-> Math.floor(Math.random() * (to() - from() + 1)) + from();
###

runMonad = (monad, cont)->
  monad.cmd (value) ->
    if monad.binding? then runMonad monad.binding(-> value), cont
    else cont(value)

# Make a new function and hide func and binding in properties on it
# making them inaccessible to pure Lazp code
# so people won't accidentally fire off side effects
makeMonad = (binding, guts)->
  m = ->
  m.cmd = guts
  m.type = 'monad'
  if binding != "end" then m.binding = binding
  m

define 'return', (v)->
  makeMonad 'end', (cont)->cont(v())

define 'print', (msg)->
  makeMonad 'end', (cont)->
    write("#{msg()}\n")
    cont(_false)

define 'prompt', (msg)->
  makeMonad 'end', (cont)->
    prompt(String(msg()), (input)-> cont(input))

define 'bind', (m)->(binding)->
  makeMonad binding(), (cont)-> runMonad m(), cont

head = (l)->l ->(hh)->(tt)->hh()
tail = (l)->l ->(hh)->(tt)->tt()

concatList = (l)->
  if l == _nil() then ""
  else (head l) + concatList tail l

define 'concat', (l)-> concatList(l())

define 'js', (codeList)->
  makeMonad 'end', (cont)->
    cl = codeList()
    if cl != _nil() && cl.type != 'cons' then throw new Error("js expects a list for its code")
    cont(eval(concatList(cl)))

define 'createS', ->
  makeMonad 'end', (cont)->
    cont {value: null}

define 'getS', (state)->
  makeMonad 'end', (cont)->
    cont state().value

define 'setS', (state)->(value)->
  makeMonad 'end', (cont)->
    state().value = value()
    cont(_false)

root.setTty = setTty
root.runMonad = runMonad
root.makeMonad = makeMonad
root.tokenDefs = []
