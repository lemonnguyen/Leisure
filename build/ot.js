// Generated by CoffeeScript 1.9.3
(function() {
  var slice = [].slice;

  define(['./lib/fingertree', './lib/lodash.min', './testing', 'immutable'], function(Fingertree, _, Testing, Immutable) {
    var ConcurrentReplacements, SequentialReplacements, Set, XcomputeReplacements, addOperation, allReplacements, assert, assertEq, buildReplacementTest, computeNodeEffect, computeReplacements, concurrentReplacements, createNode, diag, eachReplacement, isReplace, mergeRepl, replacementsString, runReplacements, sequentialReplacements, testData, testData2, tests;
    assert = Testing.assert, assertEq = Testing.assertEq;
    Set = Immutable.Set;
    diag = function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    };
    ConcurrentReplacements = (function() {
      function ConcurrentReplacements(replacements1) {
        this.replacements = replacements1;
        if (!this.replacements) {
          this.replacements = Fingertree.fromArray([], {
            identity: function() {
              return {
                offset: 0,
                float: 0
              };
            },
            measure: function(v) {
              return {
                offset: v.offset,
                float: v.float
              };
            },
            sum: function(a, b) {
              return {
                offset: a.offset + b.offset,
                float: a.float + b.float
              };
            }
          });
        }
      }

      ConcurrentReplacements.prototype.isEmpty = function() {
        return this.replacements.isEmpty();
      };

      ConcurrentReplacements.prototype.toString = function() {
        var ops;
        ops = [];
        this.eachOperation(function(start, end, text) {
          return ops.push("(" + start + ", " + end + ", " + (JSON.stringify(text)) + ")");
        });
        return ops.join(' ');
      };

      ConcurrentReplacements.prototype.dump = function() {
        return console.log(this.toString());
      };

      ConcurrentReplacements.prototype.snapshot = function() {
        return new ConcurrentReplacements(this.replacements);
      };

      ConcurrentReplacements.prototype.measure = function() {
        return this.replacements.measure();
      };

      ConcurrentReplacements.prototype.replace = function(repl) {
        var first, m, newNext, node, old, oldNext, ref, rest;
        ref = this.replacements.split(function(m) {
          return m.offset >= repl.start;
        }), first = ref[0], rest = ref[1];
        m = first.measure();
        node = !rest.isEmpty() && m.offset + (old = rest.peekFirst()).offset === repl.start ? (rest = rest.removeFirst(), addOperation(old, repl)) : (old = null, !rest.isEmpty() ? (oldNext = rest.peekFirst(), newNext = _.defaults({
          offset: oldNext.offset + m.offset - repl.start
        }, oldNext), rest = rest.removeFirst().addFirst(newNext)) : void 0, createNode(repl.start - m.offset, repl));
        this.replacements = first.concat(rest.addFirst(node));
        return [old, node];
      };

      ConcurrentReplacements.prototype.replacementsAt = function(start) {
        var first, j, len, m, merged, node, ref, ref1, repl, rest, results;
        ref = this.replacements.split(function(m) {
          return m.length >= start;
        }), first = ref[0], rest = ref[1];
        m = first.measure();
        if (!rest.isEmpty() && m.offset + (node = rest.peekFirst()).offset <= start) {
          merged = new SequentialReplacements();
          results = [];
          ref1 = node.activeOperations;
          for (j = 0, len = ref1.length; j < len; j++) {
            repl = ref1[j];
            merged.replace(repl);
          }
          merged.eachOperation(function(start, end, text, cookies) {
            return results.push({
              start: start,
              end: end,
              text: text,
              cookies: cookies
            });
          });
          return merged;
        }
      };

      ConcurrentReplacements.prototype.floatFor = function(start) {
        var first, ref, rest;
        ref = this.replacements.split(function(m) {
          return m.offset > start;
        }), first = ref[0], rest = ref[1];
        return first.measure().float;
      };

      ConcurrentReplacements.prototype.addFloat = function(start, float) {
        var first, newNode, node, ref, rest;
        if (float) {
          ref = this.replacements.split(function(m) {
            return m.offset >= start;
          }), first = ref[0], rest = ref[1];
          if (!rest.isEmpty()) {
            node = rest.peekFirst();
            newNode = _.defaults({
              offset: node.offset + float
            }, node);
            return this.replacements = first.concat(rest.removeFirst().addFirst(newNode));
          }
        }
      };

      ConcurrentReplacements.prototype.eachOperation = function(func) {
        var prevEnd;
        prevEnd = 0;
        return this.eachNode(function(node, offset, start) {
          var j, ref, ref1, repl;
          if (prevEnd <= offset) {
            ref = node.activeOperations;
            for (j = ref.length - 1; j >= 0; j += -1) {
              repl = ref[j];
              func(start, repl.end - repl.start + start, repl.text, [], (ref1 = repl.original) != null ? ref1 : repl, node);
            }
            prevEnd = offset + node.length;
          }
          if (node.labels && node.labels.length) {
            return func(start, start, '', node.labels, null, node);
          }
        });
      };

      ConcurrentReplacements.prototype.eachNode = function(func) {
        var float, node, offset, results1, t;
        offset = 0;
        t = this.replacements;
        float = 0;
        offset = 0;
        results1 = [];
        while (!t.isEmpty()) {
          node = t.peekFirst();
          t = t.removeFirst();
          offset += node.offset;
          func(node, offset, offset + float);
          results1.push(float += node.float);
        }
        return results1;
      };

      return ConcurrentReplacements;

    })();
    ConcurrentReplacements.fromArray = function(reps) {
      var j, len, repl, t;
      t = new ConcurrentReplacements();
      for (j = 0, len = reps.length; j < len; j++) {
        repl = reps[j];
        t.replace(repl);
      }
      return t;
    };
    isReplace = function(repl) {
      return repl.end > repl.start && repl.text.length;
    };
    computeNodeEffect = function(node) {
      var float, insertionText, j, len, length, op, operations, ref, repl;
      insertionText = '';
      repl = null;
      operations = [];
      float = 0;
      length = 0;
      ref = node.operations;
      for (j = 0, len = ref.length; j < len; j++) {
        op = ref[j];
        if (op.end === op.start) {
          operations.push(op);
          float += op.text.length;
        } else if (!repl || op.end - op.start > repl.end - repl.start) {
          repl = op;
        }
      }
      if (repl) {
        operations.push(repl);
        node.length = repl.end - repl.start;
        float += repl.text.length - node.length;
      } else {
        node.length = 0;
      }
      node.float = float;
      node.activeOperations = operations;
      return node;
    };
    addOperation = function(node, record) {
      var ref;
      return computeNodeEffect({
        offset: node.offset,
        operations: node.operations.concat([record]),
        labels: node.labels.concat((ref = record.labels) != null ? ref : [])
      });
    };
    createNode = function(offset, repl) {
      var ref;
      return computeNodeEffect({
        offset: offset,
        operations: [repl],
        labels: (ref = repl.labels) != null ? ref : []
      });
    };
    SequentialReplacements = (function() {
      function SequentialReplacements(reps) {
        this.replacements = reps != null ? reps : Fingertree.fromArray([], {
          identity: function() {
            return {
              initial: 0,
              final: 0,
              float: 0
            };
          },
          measure: function(n) {
            return {
              initial: n.offset + n.length,
              final: n.offset + n.text.length,
              float: n.text.length - n.length
            };
          },
          sum: function(a, b) {
            return {
              initial: a.initial + b.initial,
              final: a.final + b.final,
              float: a.float + b.float
            };
          }
        });
      }

      SequentialReplacements.prototype.snapshot = function() {
        return new SequentialReplacements(this.replacements);
      };

      SequentialReplacements.prototype.isEmpty = function() {
        return this.replacements.isEmpty();
      };

      SequentialReplacements.prototype.initialBounds = function() {
        if (this.isEmpty()) {
          return {
            start: 0,
            end: 0
          };
        } else {
          return {
            start: this.replacements.peekFirst().offset,
            end: this.replacements.measure().initial
          };
        }
      };

      SequentialReplacements.prototype.finalBounds = function() {
        if (this.isEmpty()) {
          return {
            start: 0,
            end: 0
          };
        } else {
          return {
            start: this.replacements.peekFirst().offset,
            end: this.replacements.measure().final
          };
        }
      };

      SequentialReplacements.prototype.measure = function() {
        return this.replacements.measure();
      };

      SequentialReplacements.prototype.floatFor = function(offset) {
        return this.replacements.split(function(m) {
          return m.initial > offset;
        })[0].measure().float;
      };

      SequentialReplacements.prototype.addFloat = function(start, float) {
        var first, l, n, ref, rest;
        ref = this.replacements.split(function(m) {
          return m.final >= start;
        }), first = ref[0], rest = ref[1];
        l = first.measure().final;
        if (!rest.isEmpty()) {
          n = rest.peekFirst();
          rest = rest.removeFirst().addFirst(_.defaults({
            offset: n.offset + float
          }, n));
          return this.replacements = first.concat(rest);
        }
      };

      SequentialReplacements.prototype.replace = function(repl) {
        var end, first, l, next, node, old, ref, ref1, rest, start, text;
        start = repl.start, end = repl.end, text = repl.text;
        ref = this.replacements.split(function(m) {
          return m.final >= start;
        }), first = ref[0], rest = ref[1];
        l = first.measure().final;
        if (!rest.isEmpty() && l + (old = rest.peekFirst()).offset <= end) {
          node = mergeRepl(l, old, repl);
          rest = rest.removeFirst();
        } else {
          node = {
            offset: repl.start - l,
            length: repl.end - repl.start,
            text: text,
            labels: (ref1 = repl.labels) != null ? ref1 : []
          };
          if (!rest.isEmpty()) {
            next = rest.peekFirst();
            rest = rest.removeFirst().addFirst(_.defaults({
              offset: next.offset + l - repl.end
            }, next));
          }
        }
        this.replacements = first.concat(rest.addFirst(node));
        return old != null ? old.repl : void 0;
      };

      SequentialReplacements.prototype.dump = function() {
        return console.log(this.toString());
      };

      SequentialReplacements.prototype.toString = function() {
        var strs;
        strs = [];
        this.eachOperation(function(start, end, text) {
          return strs.push(start + ", " + end + ", " + (JSON.stringify(text)));
        });
        return strs.join('\n');
      };

      SequentialReplacements.prototype.toConcurrent = function(conc) {
        conc = conc != null ? conc : new ConcurrentReplacements();
        this.eachOperation(function(start, end, text, cookies) {
          return conc.replace({
            start: start,
            end: end,
            text: text,
            cookies: cookies
          });
        });
        return conc;
      };

      SequentialReplacements.prototype.eachOperation = function(func) {
        var n, start, t;
        t = this.replacements;
        while (!t.isEmpty()) {
          n = t.peekLast();
          t = t.removeLast();
          start = t.measure().initial + n.offset;
          func(start, start + n.length, n.text, n.labels, n);
        }
        return null;
      };

      SequentialReplacements.prototype.merge = function(replacements) {
        return replacements.eachOperation((function(_this) {
          return function(start, end, text, labels) {
            return _this.replace({
              start: start,
              end: end,
              text: text,
              labels: labels
            });
          };
        })(this));
      };

      SequentialReplacements.prototype.toArray = function() {
        var j, label, len, n, ref, results, start, t;
        results = [];
        t = this.replacements;
        while (!t.isEmpty()) {
          n = t.peekFirst();
          t = t.removeFirst();
          start = t.measure().initial + n.offset;
          results.push(start, start + n.length, n.text);
          ref = n.labels;
          for (j = 0, len = ref.length; j < len; j++) {
            label = ref[j];
            results.push(label);
          }
        }
        return results;
      };

      return SequentialReplacements;

    })();
    eachReplacement = function(reps, func) {
      var end, i, labels, results1, start, text;
      i = 0;
      results1 = [];
      while (i < reps.length) {
        start = reps[i++];
        end = reps[i++];
        text = reps[i++];
        labels = [];
        while (typeof reps[i] === 'object') {
          labels.push(reps[i++]);
        }
        results1.push(func(start, end, text, labels));
      }
      return results1;
    };
    SequentialReplacements.fromArray = function(reps) {
      var seq;
      seq = new SequentialReplacements();
      eachReplacement(reps, function(start, end, text, labels) {
        return seq.replace({
          start: start,
          end: end,
          text: text,
          labels: labels
        });
      });
      return seq;
    };
    mergeRepl = function(offset, node, repl) {
      var end, j, label, labels, len, newStart, rEnd, rStart, ref, start;
      start = offset + node.offset;
      end = start + node.length;
      rStart = Math.max(0, repl.start - start);
      rEnd = repl.end - start;
      newStart = Math.min(start, repl.start);
      labels = (function() {
        var j, len, ref, results1;
        if (rStart === node.text.length) {
          return node.labels.slice(0);
        } else {
          ref = node.labels;
          results1 = [];
          for (j = 0, len = ref.length; j < len; j++) {
            label = ref[j];
            results1.push({
              name: label.name,
              offset: rStart >= label.offset ? label.offset : label.offset + repl.text.length - repl.start + repl.end
            });
          }
          return results1;
        }
      })();
      if (repl.labels != null) {
        ref = repl.labels;
        for (j = 0, len = ref.length; j < len; j++) {
          label = ref[j];
          labels.push({
            name: label.name,
            offset: label.offset + rStart
          });
        }
      }
      return {
        offset: newStart - offset,
        length: end + Math.max(0, repl.end - start - node.text.length) - Math.min(repl.start, start),
        text: node.text.substring(0, rStart) + repl.text + node.text.substring(rEnd),
        labels: labels
      };
    };
    allReplacements = function(reps) {
      var all, firstVersion, j, len, ref, v, versionInfo, vinfo;
      ref = computeReplacements(reps), firstVersion = ref.firstVersion, versionInfo = ref.versionInfo;
      all = new SequentialReplacements();
      for (v = j = 0, len = versionInfo.length; j < len; v = ++j) {
        vinfo = versionInfo[v];
        all.merge(vinfo);
      }
      return all;
    };
    runReplacements = function(reps, func) {
      return allReplacements(reps).eachOperation(func);
    };
    XcomputeReplacements = function(reps) {
      var firstVersion, i, index, j, len, repl, versionInfo, vinfo;
      if (!reps.length) {
        return {
          firstVersion: 0,
          versionInfo: []
        };
      } else {
        firstVersion = reps.reduce((function(a, el) {
          return Math.min(a, el.parent);
        }), reps[0].parent);
        versionInfo = (function() {
          var j, ref, ref1, results1;
          results1 = [];
          for (i = j = ref = firstVersion, ref1 = reps[0].version; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
            results1.push(new ConcurrentReplacements());
          }
          return results1;
        })();
        diag("START REPLACING -----------");
        for (i = j = 0, len = reps.length; j < len; i = ++j) {
          repl = reps[i];
          versionInfo.push(new ConcurrentReplacements());
          if (!repl.parent) {
            eachReplacement(repl.replacements, function(start, end, text) {
              return versionInfo[i].replace({
                start: start,
                end: end,
                text: text
              });
            });
          } else {
            index = Math.max(0, repl.parent - firstVersion);
            vinfo = versionInfo[index];
            eachReplacement(repl.replacements, function(start, end, text) {
              var float, k, len1, modInfo, node, old, ref, ref1, results1;
              ref = vinfo.replace({
                start: start,
                end: end,
                text: text
              }), old = ref[0], node = ref[1];
              if (index + 1 < i) {
                float = node.float;
                if (old) {
                  float -= old.float;
                }
                if (float) {
                  console.log("OUT OF DATE OPERATION FLOAT: v" + repl.version + " " + start + ", " + float);
                  ref1 = versionInfo.slice(index + 1, i);
                  results1 = [];
                  for (k = 0, len1 = ref1.length; k < len1; k++) {
                    modInfo = ref1[k];
                    results1.push(modInfo.addFloat(start, float));
                  }
                  return results1;
                }
              }
            });
          }
        }
        diag("END REPLACING -----------\n\n");
        return {
          firstVersion: firstVersion,
          versionInfo: versionInfo
        };
      }
    };
    computeReplacements = function(reps) {
      var firstVersion, i, index, j, len, repl, versionInfo, vinfo;
      if (!reps.length) {
        return {
          firstVersion: 0,
          versionInfo: []
        };
      } else {
        reps = _.cloneDeep(reps);
        firstVersion = reps.reduce((function(a, el) {
          return Math.min(a, el.parent);
        }), reps[0].parent);
        versionInfo = (function() {
          var j, ref, ref1, results1;
          results1 = [];
          for (i = j = ref = firstVersion, ref1 = reps[0].version; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
            results1.push(new ConcurrentReplacements());
          }
          return results1;
        })();
        diag("START REPLACING -----------");
        for (i = j = 0, len = reps.length; j < len; i = ++j) {
          repl = reps[i];
          versionInfo.push(new ConcurrentReplacements());
          index = Math.max(0, repl.parent - firstVersion);
          vinfo = versionInfo[index];
          eachReplacement(repl.replacements, function(start, end, text) {
            var float, k, len1, len2, modInfo, modRep, node, o, old, rIndex, ref, ref1, ref2, ref3, results1;
            ref = vinfo.replace({
              start: start,
              end: end,
              text: text
            }), old = ref[0], node = ref[1];
            float = node.float;
            if (old) {
              float -= old.float;
            }
            if (float) {
              ref1 = versionInfo.slice(index + 1, +(repl.version - firstVersion) + 1 || 9e9);
              for (k = 0, len1 = ref1.length; k < len1; k++) {
                modInfo = ref1[k];
                modInfo.addFloat(start, float);
              }
              ref2 = reps.slice(i + 1);
              results1 = [];
              for (o = 0, len2 = ref2.length; o < len2; o++) {
                modRep = ref2[o];
                if ((repl.parent < (ref3 = modRep.parent) && ref3 < repl.version)) {
                  rIndex = 0;
                  results1.push((function() {
                    var results2;
                    results2 = [];
                    while (rIndex < modRep.replacements.length) {
                      if (typeof modRep.replacements[rIndex] !== 'number') {
                        results2.push(rIndex++);
                      } else if (modRep.replacements[rIndex] >= start) {
                        modRep.replacements[rIndex++] += float;
                        results2.push(modRep.replacements[rIndex++] += float);
                      } else {
                        results2.push(rIndex += 2);
                      }
                    }
                    return results2;
                  })());
                } else {
                  results1.push(void 0);
                }
              }
              return results1;
            }
          });
        }
        diag("END REPLACING -----------\n\n");
        return {
          firstVersion: firstVersion,
          versionInfo: versionInfo
        };
      }
    };
    sequentialReplacements = function(reps) {
      var j, len, repl, s;
      s = new SequentialReplacements();
      for (j = 0, len = reps.length; j < len; j++) {
        repl = reps[j];
        s.replace(repl);
      }
      return s;
    };
    concurrentReplacements = function(reps) {
      var s;
      s = new SequentialReplacements();
      runReplacements(reps, function(start, end, text, repls) {
        return s.replace({
          start: start,
          end: end,
          text: text
        }, repls);
      });
      return s;
    };
    replacementsString = function(reps) {
      var strs;
      strs = [];
      runReplacements(reps, function(start, end, text) {
        return strs.push(start + ", " + end + ", " + (JSON.stringify(text)));
      });
      return strs.join('\n');
    };
    buildReplacementTest = function() {
      var connectionId, reps, version;
      reps = [];
      version = 0;
      connectionId = 'connection-1';
      return {
        replace: function(start, end, text) {
          reps.push({
            start: start,
            end: end,
            text: text,
            version: version,
            connectionId: connectionId,
            knownVersion: version
          });
          return this;
        },
        assertEq: function(expected) {
          var given;
          if ((given = replacementsString(reps)) !== expected) {
            throw new Error("Bad replacement, expected <" + expected + "> but got <" + given + ">");
          }
          return this;
        },
        version: function(v) {
          version = v;
          return this;
        },
        incVersion: function() {
          version++;
          return this;
        },
        setConnection: function(con) {
          connectionId = con;
          return this;
        },
        dump: function() {
          console.log(replacementsString(reps));
          return this;
        }
      };
    };
    tests = function() {
      buildReplacementTest().replace(4, 4, 'X').replace(0, 0, 'Y').assertEq("4, 4, \"X\"\n0, 0, \"Y\"");
      buildReplacementTest().replace(100, 109, 'duh').replace(101, 102, 'HELLO').assertEq("100, 109, \"dHELLOh\"").replace(100, 109, 'poop').assertEq("100, 111, \"poop\"").replace(95, 100, '').assertEq("95, 111, \"poop\"").replace(30, 35, 'smeg').assertEq("95, 111, \"poop\"\n30, 35, \"smeg\"").replace(25, 33, 'blorfl').assertEq("95, 111, \"poop\"\n25, 35, \"blorflg\"");
      console.log("duh");
      buildReplacementTest().version(3).replace(13, 13, ';').replace(14, 14, 'l').replace(15, 15, 'k').version(7).replace(16, 16, 'j').assertEq("13, 13, \";lk\"\n16, 16, \"j\"").assertEq(replacementsString([
        {
          "connectionId": "peer-0",
          "mine": true,
          "pendingCount": 5,
          "end": 13,
          "knownVersion": 3,
          "start": 13,
          "text": ";",
          "type": "replace",
          "version": 3,
          "messageCount": 6
        }, {
          "connectionId": "peer-0",
          "mine": true,
          "pendingCount": 6,
          "end": 14,
          "knownVersion": 3,
          "start": 14,
          "text": "l",
          "type": "replace",
          "version": 3,
          "messageCount": 7
        }, {
          "connectionId": "peer-0",
          "mine": true,
          "pendingCount": 7,
          "end": 15,
          "knownVersion": 5,
          "start": 15,
          "text": "k",
          "type": "replace",
          "version": 3,
          "messageCount": 9
        }, {
          "connectionId": "peer-0",
          "mine": true,
          "pendingCount": 8,
          "end": 16,
          "knownVersion": 7,
          "start": 16,
          "text": "j",
          "type": "replace",
          "version": 7
        }
      ])).dump();
      console.log('poop');
      return buildReplacementTest().version(13).replace(55, 55, "d").replace(44, 44, "l").replace(46, 46, "k").replace(45, 45, "j").version(17).replace(65, 65, "j").replace(64, 64, "l").replace(67, 67, "d").replace(66, 66, "a").replace(62, 62, ";").replace(63, 63, "k").replace(61, 61, "f").version(13).replace(51, 51, "s").replace(50, 50, "a").replace(47, 47, " ").dump();
    };
    testData = [
      {
        start: 55,
        end: 55,
        text: "d",
        version: 13,
        connectionId: "peer-0",
        messageCount: 23
      }, {
        start: 44,
        end: 44,
        text: "l",
        version: 13,
        connectionId: "peer-0",
        messageCount: 15
      }, {
        start: 46,
        end: 46,
        text: "k",
        version: 13,
        connectionId: "peer-0",
        messageCount: 17
      }, {
        start: 45,
        end: 45,
        text: "j",
        version: 13,
        connectionId: "peer-0",
        messageCount: 16
      }, {
        start: 65,
        end: 65,
        text: "j",
        version: 17,
        connectionId: "peer-0",
        messageCount: 29
      }, {
        start: 64,
        end: 64,
        text: "l",
        version: 17,
        connectionId: "peer-0",
        messageCount: 28
      }, {
        start: 67,
        end: 67,
        text: "d",
        version: 17,
        connectionId: "peer-0",
        messageCount: 32
      }, {
        start: 66,
        end: 66,
        text: "a",
        version: 17,
        connectionId: "peer-0",
        messageCount: 31
      }, {
        start: 62,
        end: 62,
        text: ";",
        version: 17,
        connectionId: "peer-0",
        messageCount: 26
      }, {
        start: 63,
        end: 63,
        text: "k",
        version: 17,
        connectionId: "peer-0",
        messageCount: 27
      }, {
        start: 61,
        end: 61,
        text: "f",
        version: 17,
        connectionId: "peer-0",
        messageCount: 25
      }, {
        start: 51,
        end: 51,
        text: "s",
        version: 13,
        connectionId: "peer-0",
        messageCount: 21
      }, {
        start: 50,
        end: 50,
        text: "a",
        version: 13,
        connectionId: "peer-0",
        messageCount: 20
      }, {
        start: 47,
        end: 47,
        text: " ",
        version: 13,
        connectionId: "peer-0",
        messageCount: 18
      }
    ];
    testData2 = [
      {
        start: 33,
        end: 33,
        text: "d",
        type: "replace",
        version: 0,
        connectionId: "peer-0",
        messageCount: 3
      }, {
        start: 34,
        end: 34,
        text: "f",
        type: "replace",
        version: 0,
        connectionId: "peer-0",
        messageCount: 4
      }, {
        start: 37,
        end: 37,
        text: ";",
        type: "replace",
        version: 0,
        connectionId: "peer-0",
        messageCount: 6
      }, {
        start: 38,
        end: 38,
        text: "l",
        type: "replace",
        version: 0,
        connectionId: "peer-0",
        messageCount: 7
      }, {
        start: 39,
        end: 39,
        text: "k",
        type: "replace",
        version: 0,
        connectionId: "peer-0",
        messageCount: 8
      }, {
        start: 43,
        end: 43,
        text: "j",
        type: "replace",
        version: 3,
        connectionId: "peer-0"
      }, {
        start: 78,
        end: 78,
        text: " ",
        type: "replace",
        version: 3,
        connectionId: "peer-0"
      }, {
        start: 79,
        end: 79,
        text: "a",
        type: "replace",
        version: 3,
        connectionId: "peer-0"
      }, {
        start: 114,
        end: 114,
        text: "s",
        type: "replace",
        version: 3,
        connectionId: "peer-0"
      }, {
        start: 149,
        end: 149,
        text: "d",
        type: "replace",
        version: 7,
        connectionId: "peer-0"
      }, {
        start: 150,
        end: 150,
        text: ";",
        type: "replace",
        version: 7,
        connectionId: "peer-0"
      }, {
        start: 151,
        end: 151,
        text: "l",
        type: "replace",
        version: 7,
        connectionId: "peer-0"
      }, {
        start: 152,
        end: 152,
        text: "f",
        type: "replace",
        version: 7,
        connectionId: "peer-0"
      }, {
        start: 153,
        end: 153,
        text: "k",
        type: "replace",
        version: 7,
        connectionId: "peer-0"
      }, {
        start: 154,
        end: 154,
        text: "j",
        type: "replace",
        version: 7,
        connectionId: "peer-0"
      }
    ];
    if (typeof window !== "undefined" && window !== null) {
      window.OT_TEST_REPL = function() {
        var rep;
        rep = allReplacements([
          {
            parent: 1,
            replacements: [30, 30, "a"],
            version: 3
          }, {
            parent: 3,
            replacements: [31, 31, "s"],
            version: 4
          }, {
            version: 5,
            parent: 3,
            replacements: [60, 60, "q"]
          }, {
            parent: 4,
            replacements: [32, 32, "d"],
            version: 6
          }, {
            version: 7,
            parent: 5,
            replacements: [62, 62, "w"]
          }, {
            parent: 6,
            replacements: [33, 33, "f"],
            version: 8
          }, {
            version: 9,
            parent: 7,
            replacements: [64, 64, "e"]
          }, {
            parent: 9,
            replacements: [34, 34, "a"],
            version: 10
          }, {
            parent: 10,
            replacements: [35, 35, "s"],
            version: 11
          }, {
            version: 12,
            parent: 10,
            replacements: [67, 67, "q"]
          }, {
            parent: 11,
            replacements: [36, 36, "f"],
            version: 13
          }, {
            version: 14,
            parent: 12,
            replacements: [69, 69, "w"]
          }, {
            version: 15,
            parent: 14,
            replacements: [71, 71, "e"]
          }
        ]);
        return assertEq((function(exp, act) {
          return "Expected " + exp + " but got " + act;
        }), "59, 59, \"qweqwe\"\n30, 30, \"asdfasf\"", rep.toString());
      };
    }
    if (typeof window !== "undefined" && window !== null) {
      window.replacementsString = replacementsString;
    }
    return {
      ConcurrentReplacements: ConcurrentReplacements,
      SequentialReplacements: SequentialReplacements,
      runReplacements: runReplacements,
      computeReplacements: computeReplacements,
      replacementsString: replacementsString,
      sequentialReplacements: sequentialReplacements,
      concurrentReplacements: concurrentReplacements,
      allReplacements: allReplacements,
      tests: tests,
      testData2: testData2
    };
  });

}).call(this);

//# sourceMappingURL=ot.js.map
