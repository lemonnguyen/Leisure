// Generated by CoffeeScript 1.9.3

/*
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
 */

(function() {
  var files,
    slice1 = [].slice;

  files = !(typeof window !== "undefined" && window !== null ? window : global).btoa ? ['btoa'] : [null];

  define(files, function(btoa) {
    var SimpyCons, baseLeisureCall, concat, defaultEnv, errors, funcInfo, genInfo, leisureCall, primConsFrom, readDir, readFile, root, rz, serverIncrement, simpyCons, slice, statFile, test, testCount, verboseMsg, writeFile;
    if (!btoa) {
      btoa = (typeof window !== "undefined" && window !== null ? window : global).btoa;
    }
    root = {};
    root.currentNameSpace = 'core';
    root.nameSpacePath = ['core'];
    root.shouldNsLog = false;
    root.nsLog = function() {
      var args;
      args = 1 <= arguments.length ? slice1.call(arguments, 0) : [];
      if (root.shouldNsLog) {
        return console.log.apply(console, args);
      }
    };
    (typeof window !== "undefined" && window !== null ? window : global).verbose = {};
    verboseMsg = function() {
      var label, msg;
      label = arguments[0], msg = 2 <= arguments.length ? slice1.call(arguments, 1) : [];
      if ((typeof window !== "undefined" && window !== null ? window : global).verbose[label]) {
        return console.log.apply(console, msg);
      }
    };
    if (btoa == null) {
      (typeof window !== "undefined" && window !== null ? window : global).btoa = require('btoa');
    }
    defaultEnv = {
      presentValue: function(x) {
        return String(x) + '\n';
      },
      values: {},
      errorHandlers: [],
      prompt: function() {}
    };
    rz = (typeof window !== "undefined" && window !== null ? window : global).resolve = function(value) {
      if (typeof value === 'function' && value.length === 0) {
        if (typeof value.memo !== 'undefined') {
          return value.memo;
        } else {
          if (value.creationStack) {
            value.creationStack = null;
          }
          if (value.args) {
            value.args = null;
          }
          return value.memo = value();
        }
      } else {
        return value;
      }
    };
    (typeof window !== "undefined" && window !== null ? window : global).lazy = function(l) {
      if (typeof l === 'function') {
        return l.memo = l;
      } else {
        return l;
      }
    };
    readFile = function(fileName, cont) {
      return defaultEnv.readFile(fileName, cont);
    };
    writeFile = function(fileName, data, cont) {
      return defaultEnv.writeFile(fileName, data, cont);
    };
    readDir = function(fileName, cont) {
      return defaultEnv.readDir(fileName, cont);
    };
    statFile = function(fileName, cont) {
      return defaultEnv.statFile(fileName, cont);
    };
    root.trackCreation = false;
    root.trackVars = true;
    funcInfo = function(func) {
      var callInfo, info;
      if (func.leisureInfoNew) {
        return primConsFrom(func.leisureInfoNew, 0);
      } else if (func.leisureInfo) {
        (typeof window !== "undefined" && window !== null ? window : global).FUNC = func;
        info = [];
        callInfo = func.leisureInfo;
        while (callInfo) {
          info.push(resolve(callInfo.arg));
          if (callInfo.name) {
            info.push(callInfo.name);
            break;
          }
          callInfo = callInfo.parent;
        }
        return root.consFrom(info.reverse());
      } else {
        return rz(L_nil);
      }
    };
    primConsFrom = function(array, index) {
      if (index >= array.length) {
        return rz(L_nil);
      } else {
        return root.primCons(array[index], primConsFrom(array, index + 1));
      }
    };
    SimpyCons = (function() {
      function SimpyCons(head, tail) {
        this.head = head;
        this.tail = tail;
      }

      SimpyCons.prototype.toArray = function() {
        var array, h, ref;
        return (ref = this._array) != null ? ref : ((function() {
          h = this;
          array = [];
          while (h !== null) {
            array.push(h.head);
            h = h.tail;
          }
          return this._array = array;
        }).call(this));
      };

      return SimpyCons;

    })();
    simpyCons = function(a, b) {
      return new SimpyCons(a, b);
    };
    slice = Array.prototype.slice;
    concat = Array.prototype.concat;
    (typeof window !== "undefined" && window !== null ? window : global).L$ = function(f) {
      f = rz(f);
      if (f.length > 1) {
        return f;
      } else {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice1.call(arguments, 0) : [];
          return baseLeisureCall(f, 0, args);
        };
      }
    };
    (typeof window !== "undefined" && window !== null ? window : global).Leisure_call = leisureCall = function(f) {
      return baseLeisureCall(f, 1, arguments);
    };
    (typeof window !== "undefined" && window !== null ? window : global).Leisure_primCall = baseLeisureCall = function(f, pos, args, len) {
      var oldLen, partial, prev;
      len = len != null ? len : f.length;
      while (pos < args.length) {
        if (typeof f !== 'function') {
          throw new Error("TypeError: " + (typeof f) + " is not a function: " + f);
        }
        if (len <= args.length - pos) {
          oldLen = len;
          switch (len) {
            case 1:
              f = f(args[pos]);
              break;
            case 2:
              f = f(args[pos], args[pos + 1]);
              break;
            case 3:
              f = f(args[pos], args[pos + 1], args[pos + 2]);
              break;
            case 4:
              f = f(args[pos], args[pos + 1], args[pos + 2], args[pos + 3]);
              break;
            default:
              if (f.leisureInfo || (pos === 0 && len === args.length)) {
                return f.apply(null, (pos === 0 ? args : slice.call(args, pos)));
              }
              f = f.apply(null, slice.call(args, pos, pos + len));
          }
          if (len < args.length - pos) {
            len = f.length;
          }
          pos += oldLen;
        } else {
          prev = slice.call(args, pos);
          partial = function() {
            var newArgs;
            newArgs = concat.call(prev, slice.call(arguments));
            if (!f.apply) {
              console.log("No apply! " + f + " " + newArgs[0]);
            }
            if (newArgs.length === len) {
              return f.apply(null, newArgs);
            } else {
              return baseLeisureCall(f, 0, newArgs, len);
            }
          };
          partial.leisurePartial = true;
          partial.leisureInfo = genInfo(f, args, f.leisureInfo);
          return lazy(partial);
        }
      }
      if (pos !== args.length) {
        console.log("BAD FINAL POSITION IN LEISURE CALL, ARG LENGTH IS " + args.length + " BUT POSITION IS " + pos);
      }
      return f;
    };
    genInfo = function(func, args, oldInfo) {
      var arg, i, len1;
      for (i = 0, len1 = args.length; i < len1; i++) {
        arg = args[i];
        if (!oldInfo) {
          oldInfo = {
            name: func.leisureName,
            arg: arg
          };
        } else {
          oldInfo = {
            arg: arg,
            parent: oldInfo
          };
        }
      }
      return oldInfo;
    };
    testCount = 0;
    errors = '';
    test = function(expected, actual) {
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        if (errors.length) {
          errors += '\n';
        }
        errors += "TEST " + testCount + " FAILED, EXPECTED " + (JSON.stringify(expected)) + " BUT GOT " + (JSON.stringify(actual));
      }
      return testCount++;
    };
    (typeof window !== "undefined" && window !== null ? window : global).Leisure_test_call = function() {
      test([1, 2, 3], Leisure_call((function(a, b) {
        return function(c) {
          return [a, b, c];
        };
      }), 1, 2, 3));
      test([1, 2, 3], Leisure_call((function(a, b, c) {
        return [a, b, c];
      }), 1, 2, 3));
      test([1, 2, 3], Leisure_call((function(a) {
        return function(b, c) {
          return [a, b, c];
        };
      }), 1, 2, 3));
      test([1, 2, 3, 4], Leisure_call((function(a) {
        return function(b, c) {
          return function(d) {
            return [a, b, c, d];
          };
        };
      }), 1, 2, 3, 4));
      test([1, 2, 3, 4], Leisure_call((function(a, b, c) {
        return function(d) {
          return [a, b, c, d];
        };
      }), 1, 2, 3, 4));
      test([1, 2, 3, 4], Leisure_call((function(a, b) {
        return function(c) {
          return function(d) {
            return [a, b, c, d];
          };
        };
      }), 1, 2, 3, 4));
      test([1, 2, 3, 4], Leisure_call((function(a, b) {
        return function(c, d) {
          return [a, b, c, d];
        };
      }), 1, 2, 3, 4));
      test([1, 2, 3, 4], Leisure_call((function(a, b, c, d) {
        return [a, b, c, d];
      }), 1, 2, 3, 4));
      test([1, 2, 3, 4], Leisure_call(Leisure_call((function(a, b, c, d) {
        return [a, b, c, d];
      }), 1, 2), 3, 4));
      if (errors.length) {
        return errors;
      } else {
        return null;
      }
    };
    serverIncrement = function(path, amount, cont) {
      var block;
      block = root.getBlockNamed(path.split(/\./)[0]);
      if (block.origin !== root.currentDocument._name) {
        return root.storeBlock(block, function() {
          return serverIncrement(path, amount, cont);
        });
      }
      if (typeof path === 'function') {
        return cont("Error, no path given to serverIncrement");
      } else if (typeof amount === 'function') {
        return cont("Error, no amount given to serverIncrement");
      } else {
        return Meteor.call('incrementField', root.currentDocument.leisure.name, path, amount, cont);
      }
    };
    root.serverIncrement = serverIncrement;
    root.defaultEnv = defaultEnv;
    root.readFile = readFile;
    root.readDir = readDir;
    root.writeFile = writeFile;
    root.statFile = statFile;
    root.SimpyCons = SimpyCons;
    root.simpyCons = simpyCons;
    root.resolve = resolve;
    root.lazy = lazy;
    root.verboseMsg = verboseMsg;
    root.maxInt = 9007199254740992;
    root.minInt = -root.maxInt;
    root.funcInfo = funcInfo;
    return root;
  });

}).call(this);

//# sourceMappingURL=base.js.map
