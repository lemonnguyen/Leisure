(function() {
  var Core, FS, L, P, Path, Prim, R, U, compile, face, getType, help, init, print, processResult, repl, root, vars, write,
    __slice = Array.prototype.slice;

  U = require('util');

  R = require('readline');

  L = require('./lazp');

  Prim = require('./prim');

  Core = require('./replCore');

  FS = require('fs');

  Path = require('path');

  P = require('./pretty');

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.quiet = false;

  getType = L.getType;

  vars = {
    c: [false, 'show generated code'],
    a: [false, 'show parsed AST'],
    r: [true, 'show evaluation result']
  };

  print = function print() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return process.stdout.write(U.format.apply(null, args));
  };

  write = function write() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return process.stdout.write(args.join(''));
  };

  face = null;

  init = function init() {
    if (!(face != null)) {
      face = R.createInterface(process.stdin, process.stdout);
      Prim.setTty(face);
      face.setPrompt("Lazp> ");
      face.on('close', function() {
        return process.exit(0);
      });
      face.on('line', function(line) {
        return Core.processLine(line.trim());
      });
      return Core.setNext(function() {
        return face.prompt();
      });
    }
  };

  repl = function repl() {
    print("Welcome to Lazp!\n");
    help();
    init();
    return face.prompt();
  };

  help = function help() {
    return write(":v -- vars\n:h -- help\n:c file -- compile file\n:q -- quit\n!code -- eval JavaScript code\n");
  };

  compile = function compile(file) {
    var contents, oldfile, stream;
    if (!file) {
      console.log("No file to compile");
      return face != null ? face.prompt() : void 0;
    } else {
      contents = '';
      if (!Path.existsSync(file)) {
        oldfile = file;
        file = file + ".laz";
        if (!Path.existsSync(file)) {
          console.log("No file: " + oldfile);
          return Core.next();
        }
      }
      stream = FS.createReadStream(file);
      stream.on('data', function(data) {
        return contents += data;
      });
      stream.on('end', function() {
        var out;
        out = Core.generateCode(file, contents, !root.quiet);
        stream = FS.createWriteStream("" + (Path.basename(file, '.laz')) + ".js");
        stream.end(out, 'utf8');
        return Core.next();
      });
      return stream.on('error', function(ex) {
        console.log("Exception reading file: ", ex.stack);
        return Core.next();
      });
    }
  };

  processResult = function processResult(result) {
    init();
    write("" + (getType(result)) + ": " + (P.print(result)) + "\n");
    return Core.processResult(result);
  };

  Core.setHelp(help);

  Core.setCompiler(compile);

  Core.setWriter(function(str) {
    return process.stdout.write(str);
  });

  root.print = print;

  root.repl = repl;

  root.compile = compile;

  root.init = init;

  root.processResult = processResult;

}).call(this);
