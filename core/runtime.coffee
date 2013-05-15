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
in a product, an acknowledgment in the product documentation would be
appreciated but is not required.

2. Altered source versions must be plainly marked as such, and must not be
misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.
###

root = module.exports = require './base'
{
  define,
  consFrom,
  getType,
  getDataType,
} = require './ast'
_ = require('./lodash.min')

############
# LOGIC
############

booleanFor = (bool)-> if bool then L_true() else L_false()

define 'eq', ->(a)->(b)-> booleanFor a() == b()
define 'hasType', ->(data)->(func)-> booleanFor getType(data()) == getDataType(func())

############
# MATH
############

define '+', ->(x)->(y)->x() + y()
define '-', ->(x)->(y)->x() - y()
define '*', ->(x)->(y)->x() * y()
define '/', ->(x)->(y)->x() / y()

############
# STRINGS
############

define 'strStartsWith', ->(str)->(prefix)-> booleanFor (str().indexOf prefix()) == 0
define 'strLen', ->(str)-> str().length
define 'strSplit', ->(str)->(pat)-> consFrom str().split new RegExp pat()

############
# IO Monads
############

# Make a new function and hide func and binding in properties on it
# making them inaccessible to pure Leisure code
# so people won't accidentally fire off side effects
makeMonad = (guts)->
  m = ->
  m.__proto__ = Monad.prototype
  m.cmd = guts
  m.type = 'monad'
  m

nextMonad = (cont)-> cont

runMonad = (monad, env, cont)->
  try
    if monad.cmd? then monad.cmd(env, nextMonad(cont))
    else cont(monad)
  catch err
    console.log "ERROR RUNNING MONAD: #{err.stack}"

class Monad
  andThen: (func)-> makeMonad (env, cont)=> runMonad @, env, (value)-> runMonad (codeMonad func), env, cont
  toString: -> "Monad: #{@cmd.toString()}"

codeMonad = (code)->
  makeMonad (env, cont)->
    result = code env
    if result instanceof Monad then runMonad result, env, cont
    else cont _false()

define 'true', ->(a)->(b)->a()

define 'false', ->(a)->(b)->b()

define 'print', ->(msg)->
  makeMonad (env, cont)->
    m = msg()
    env.write("#{if typeof m == 'string' then m else Parse.print(m)}\n")
    cont(`L_false()`)

define 'bind', ->(m)->(binding)->
  makeMonad (env, cont)-> runMonad m(), env, (value)->runMonad binding()(->value), env, cont

values = {}

define 'hasValue', ->(name)->
  makeMonad (env, cont)->
    cont (if values[name()]? then L_true() else L_false())

define 'getValueOr', ->(name)->(defaultValue)->
  makeMonad (env, cont)->
    cont(values[name()] ? defaultValue())

define 'getValue', ->(name)->
  makeMonad (env, cont)->
    cont values[name()]

define 'setValue', ->(name)->(value)->
  makeMonad (env, cont)->
    values[name()] = value()
    cont L_false()

define 'createS', ->
  makeMonad (env, cont)->
    cont {value: null}

define 'getS', ->(state)->
  makeMonad (env, cont)->
    cont state().value

define 'setS', ->(state)->(value)->
  makeMonad (env, cont)->
    state().value = value()
    cont(L_false())

root.stateValues = values
root.runMonad = runMonad
root.defaultEnv =
  write: (str)-> process.stdout.write(str)
