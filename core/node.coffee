{
  defaultEnv,
} = root = module.exports = require './base'
{
  consFrom,
  Nil,
  cons
} = require './ast'
{
  booleanFor,
} = require './runtime'

fs = require 'fs'

defaultEnv.readFile = (fileName, cont)-> fs.readFile fileName, encoding: 'utf8', cont

defaultEnv.writeFile = (fileName, data, cont)-> fs.writeFile fileName, data, (encoding: 'utf8'), cont

defaultEnv.readDir = (fileName, cont)-> fs.readdir fileName, (err, files)->
  if !err then files = consFrom files
  cont err, files

addStats = (name, stats, result) -> cons (cons name, booleanFor stats[name]), result

defaultEnv.statFile = (fileName, cont)-> fs.stat fileName, (err, stats)->
  if !err
    res = Nil
    res = addStats 'isBlockDevice', stats, res
    res = addStats 'isCharacterDevice', stats, res
    res = addStats 'isFIFO', stats, res
    res = addStats 'isSocket', stats, res
    res = addStats 'isSymbolicLink', stats, res
    res = addStats 'isFile', stats, res
    res = addStats 'isDirectory', stats, res
    cont err, res
  else cont err, null

defaultEnv.statDir = (fileName, cont)-> fs.stat fileName, cont
