// Generated by CoffeeScript 1.6.2
(function() {
  var ENTER, configureCalc, defaultEnv, delayedEval, evalDiv, genSource, getParseErr, getType, isMonad, lazy, lz, resolve, root, runMonad, rz, show, _ref, _ref1;

  _ref = root = module.exports = require('./base'), resolve = _ref.resolve, lazy = _ref.lazy, defaultEnv = _ref.defaultEnv;

  rz = resolve;

  lz = lazy;

  genSource = require('./gen').genSource;

  ENTER = require('./notebook').ENTER;

  _ref1 = require('./runtime'), runMonad = _ref1.runMonad, isMonad = _ref1.isMonad;

  getType = require('./ast').getType;

  delayedEval = function(env, input, output, simplified, ast, code) {
    return setTimeout((function() {
      return evalDiv(input.text(), env, input, output, simplified, ast, code);
    }), 1);
  };

  configureCalc = function(input, output, simplified, ast, code) {
    var env;

    env = {
      write: function(str) {
        return output.append(str);
      }
    };
    env.__proto__ = defaultEnv;
    input[0].addEventListener('DOMCharacterDataModified', (function(evt) {
      return delayedEval(env, input, output, simplified, ast, code);
    }));
    return input[0].addEventListener('DOMSubtreeModified', (function(evt) {
      return delayedEval(env, input, output, simplified, ast, code);
    }));
  };

  getParseErr = function(x) {
    return x(lz(function(value) {
      return rz(value);
    }));
  };

  show = function(obj) {
    if (typeof L_show !== "undefined" && L_show !== null) {
      return rz(L_show)(lz(obj));
    } else {
      return String(obj);
    }
  };

  evalDiv = function(text, env, input, output, simplified, astDiv, code) {
    var err, result, _ref2;

    output.html('');
    simplified.html('');
    code.html('');
    if (text) {
      try {
        result = rz(L_newParseLine)(lz(0))(L_nil)(lz(text));
        return runMonad(result, env, function(ast) {
          var err, js;

          try {
            if (getType(ast) === 'parseErr') {
              output.addClass('err');
              return output.html("Parse error: " + (getParseErr(ast)));
            } else {
              output.removeClass('err');
              simplified.html(rz(L_show)(lz(runMonad(rz(L_simplify)(lz(text))))));
              js = genSource(text, ast);
              code.html(js);
              result = eval(js);
              output.html((isMonad(result) ? "(processing IO monad)" : ''));
              return runMonad(result, env, function(res) {
                return output.append(show(res));
              });
            }
          } catch (_error) {
            err = _error;
            output.addClass('err');
            return output.html(err.toString());
          }
        });
      } catch (_error) {
        err = _error;
        output.addClass('err');
        return output.html(rz(L_err)(lz((_ref2 = err.stack) != null ? _ref2 : err.toString())));
      }
    } else {
      return output.html('');
    }
  };

  root.configureCalc = configureCalc;

}).call(this);

/*
//@ sourceMappingURL=calcSupport.map
*/
