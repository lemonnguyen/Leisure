// Generated by CoffeeScript 1.10.0
(function() {
  var GuardedServer, MasterHandler, MessageHandler, OtServer, RejectGuardedOperation, Selection, SlaveHandler, TextOperation, WrappedOperation, _, badMasterIdError, badMsgTypeError, badVersionError, baseDir, crypto, diag, disapprovedError, finalhandler, guid, http, isTextMsg, masters, noTrim, path, ref, requirejs, s4, serveStatic, socketPrefix, sockjs, sockjsUtil, startServer,
    slice = [].slice,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  require('source-map-support').install();

  sockjs = require('sockjs');

  sockjsUtil = require('sockjs/lib/utils');

  http = require('http');

  crypto = require('crypto');

  serveStatic = require('serve-static');

  finalhandler = require('finalhandler');

  path = require('path');

  console.log("DIR: " + (path.resolve(path.dirname(module.filename) + '/../..')));

  baseDir = path.resolve(path.dirname(module.filename) + "/../..");

  _ = require(baseDir + "/lib/lodash.min");

  requirejs = require('requirejs').config({
    baseUrl: baseDir,
    paths: {
      immutable: 'lib/immutable-3.7.4.min'
    }
  });

  ref = requirejs('./common'), badMasterIdError = ref.badMasterIdError, badMsgTypeError = ref.badMsgTypeError, disapprovedError = ref.disapprovedError, badVersionError = ref.badVersionError, noTrim = ref.noTrim;

  OtServer = requirejs('lib/ot/server').Server;

  WrappedOperation = requirejs('lib/ot/wrapped-operation').WrappedOperation;

  TextOperation = requirejs('lib/ot/text-operation').TextOperation;

  RejectGuardedOperation = requirejs('lib/ot/guarded-operation').RejectGuardedOperation;

  GuardedServer = requirejs('lib/ot/guarded-server').GuardedServer;

  Selection = requirejs('lib/ot/selection').Selection;

  masters = {};

  socketPrefix = '/Leisure/(create|join(?:-([^/]*)))';

  s4 = function() {
    var bytes, n;
    bytes = crypto.randomBytes(2);
    n = (bytes[0] + (bytes[1] << 8)).toString(16);
    while (n.length < 4) {
      n = '0' + n;
    }
    return n;
  };

  guid = function() {
    return "" + (s4()) + (s4()) + "-" + (s4()) + "-" + (s4()) + "-" + (s4()) + "-" + (s4()) + (s4()) + (s4());
  };

  diag = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return console.log.apply(console, args);
  };

  MessageHandler = (function() {
    function MessageHandler() {
      this.guid = guid();
      this.messageCount = 1;
      this.lastVersionAck = -1;
    }

    MessageHandler.prototype.setConnection = function(con1) {
      this.con = con1;
      console.log(this.type + " connection: " + this.guid);
      this.con.leisure = this;
      this.con.on('data', (function(_this) {
        return function(msg) {
          return _this.handleMessage(JSON.parse(msg));
        };
      })(this));
      return this.con.on('close', (function(_this) {
        return function() {
          return _this.closed();
        };
      })(this));
    };

    MessageHandler.prototype.type = 'Unknown Handler';

    MessageHandler.prototype.close = function() {
      return this.con.close();
    };

    MessageHandler.prototype.closed = function() {
      return console.log(this.type + " closed: " + this.guid);
    };

    MessageHandler.prototype.send = function(msg) {
      diag("S    " + (JSON.stringify(msg)));
      return this.con.write(JSON.stringify(msg));
    };

    MessageHandler.prototype.broadcast = function(msg) {
      return this.master.sendBroadcast(this, msg);
    };

    MessageHandler.prototype.sendError = function(msg) {
      msg.type = 'error';
      this.send(msg);
      return setTimeout(((function(_this) {
        return function() {
          return _this.close();
        };
      })(this)), 1);
    };

    MessageHandler.prototype.handleMessage = function(msg) {
      var err, error;
      msg.connectionId = this.connectionId;
      diag("R    " + (JSON.stringify(msg)));
      if (!(msg.type in this.handler)) {
        console.log("Received bad message " + msg.type, msg);
        return this.close();
      } else {
        try {
          return this.handler[msg.type].call(this, msg);
        } catch (error) {
          err = error;
          return console.log(err.stack);
        }
      }
    };

    MessageHandler.prototype.handler = {
      log: function(msg) {
        return console.log(msg.msg);
      },
      replace: function(msg) {
        this.lastVersionAck = msg.parent;
        return this.master.relay(msg);
      },
      conditionalReplace: function(msg) {
        if (msg.version !== this.master.version && this.master.versionDirty) {
          return this.send({
            type: 'rejectChange',
            targetVersion: msg.targetVersion,
            version: this.version
          });
        } else {
          return this.master.relay(msg);
        }
      },
      guardedOperation: function(msg) {
        return this.master.guardedOperation(this, msg);
      },
      operation: function(msg) {
        return this.master.operation(this, msg);
      },
      selection: function(msg) {
        return this.master.selection(this, msg);
      },
      setName: function(msg) {
        return this.master.setName(this, msg);
      }
    };

    MessageHandler.prototype.peerEntry = function() {
      return {
        name: this.name,
        selection: this.selection
      };
    };

    return MessageHandler;

  })();

  isTextMsg = function(msg) {
    var ref1;
    return (ref1 = msg.type) === 'replace' || ref1 === 'conditionalReplace';
  };

  MasterHandler = (function(superClass) {
    extend(MasterHandler, superClass);

    function MasterHandler() {
      MasterHandler.__super__.constructor.call(this);
      this.master = this;
      this.connectionId = "peer-0";
      this.slaves = {};
      this.pendingSlaves = {};
      this.peerCount = 0;
    }

    MasterHandler.prototype.type = 'Master';

    MasterHandler.prototype.peers = function() {
      var cons, id, ref1, s;
      cons = {};
      cons[this.connectionId] = this.peerEntry();
      ref1 = this.slaves;
      for (id in ref1) {
        s = ref1[id];
        cons[id] = s.peerEntry();
      }
      return cons;
    };

    MasterHandler.prototype.setConnection = function(con) {
      masters[this.guid] = this;
      MasterHandler.__super__.setConnection.call(this, con);
      return this.send({
        type: 'connected',
        guid: this.guid,
        id: this.connectionId,
        revision: 0,
        peers: this.peers()
      });
    };

    MasterHandler.prototype.addSlave = function(slave) {
      slave.connectionId = "peer-" + (++this.peerCount);
      this.pendingSlaves[slave.connectionId] = slave;
      return this.send({
        type: 'slaveConnect',
        slaveId: slave.connectionId
      });
    };

    MasterHandler.prototype.removeSlave = function(slave) {
      delete this.slaves[slave.connectionId];
      delete this.pendingSlaves[slave.connectionId];
      this.send({
        type: 'slaveDisconnect',
        slaveId: slave.connectionId
      });
      return this.sendBroadcast(null, {
        type: 'disconnection',
        peerId: slave.connectionId
      });
    };

    MasterHandler.prototype.closed = function() {
      var id, ref1, slave;
      delete masters[this.con.leisure.id];
      ref1 = this.slaves;
      for (id in ref1) {
        slave = ref1[id];
        slave.close();
      }
      this.slaves = {};
      return MasterHandler.__super__.closed.call(this);
    };

    MasterHandler.prototype.sendBroadcast = function(sender, msg) {
      var id, ref1, slave;
      ref1 = this.slaves;
      for (id in ref1) {
        slave = ref1[id];
        if (sender !== slave) {
          slave.send(msg);
        }
      }
      if (sender !== this) {
        return this.send(msg);
      }
    };

    MasterHandler.prototype.guardedOperation = function(peer, arg) {
      var error, error1, exc, guardId, guards, operation, revision, selection, wrapped, wrappedPrime;
      revision = arg.revision, operation = arg.operation, selection = arg.selection, guards = arg.guards, guardId = arg.guardId;
      try {
        wrapped = new WrappedOperation(TextOperation.fromJSON(operation, selection && Selection.fromJSON(selection)));
      } catch (error) {
        exc = error;
        peer.send({
          type: 'rejectGuard',
          guardId: guardId
        });
        console.error("Invalid operation received: " + exc.stack);
        return;
      }
      try {
        wrappedPrime = this.otServer.receiveGuardedOperation(revision, wrapped, guards);
        if (wrappedPrime === RejectGuardedOperation) {
          return peer.send({
            type: 'rejectGuard',
            guardId: guardId,
            retryOK: true
          });
        } else {
          console.log("new guard operation: " + JSON.stringify(wrapped));
          peer.selection = wrappedPrime.meta;
          this.sendBroadcast(null, {
            type: 'operation',
            peerId: peer.connectionId,
            operation: wrappedPrime.wrapped.toJSON(),
            meta: wrappedPrime.meta
          });
          return peer.send({
            type: 'ackGuard',
            guardId: guardId,
            operation: wrappedPrime.wrapped.toJSON()
          });
        }
      } catch (error1) {
        exc = error1;
        peer.send({
          type: 'rejectGuard',
          guardId: guardId
        });
        return console.error(exc.stack);
      }
    };

    MasterHandler.prototype.operation = function(peer, arg) {
      var error, error1, exc, operation, revision, selection, wrapped, wrappedPrime;
      revision = arg.revision, operation = arg.operation, selection = arg.selection;
      try {
        wrapped = new WrappedOperation(TextOperation.fromJSON(operation, selection && Selection.fromJSON(selection)));
      } catch (error) {
        exc = error;
        console.error("Invalid operation received: " + exc.stack);
        return;
      }
      try {
        wrappedPrime = this.otServer.receiveOperation(revision, wrapped);
        console.log("new operation: " + JSON.stringify(wrapped));
        peer.selection = wrappedPrime.meta;
        peer.send({
          type: 'ack'
        });
        return peer.broadcast({
          type: 'operation',
          peerId: peer.connectionId,
          operation: wrappedPrime.wrapped.toJSON(),
          meta: wrappedPrime.meta
        });
      } catch (error1) {
        exc = error1;
        return console.error(exc.stack);
      }
    };

    MasterHandler.prototype.selection = function(peer, arg) {
      var selection;
      selection = arg.selection;
      if (selection) {
        peer.selection = selection;
      } else {
        delete peer.selection;
      }
      return peer.broadcast({
        type: 'selection',
        peerId: peer.id,
        selection: selection
      });
    };

    MasterHandler.prototype.setName = function(peer, arg) {
      var name;
      name = arg.name;
      peer.name = name;
      return peer.broadcast({
        type: 'setName',
        peerId: peer.id,
        name: name
      });
    };

    MasterHandler.prototype.handler = {
      __proto__: MessageHandler.prototype.handler,
      initDoc: function(arg) {
        var doc;
        doc = arg.doc, this.name = arg.name;
        return this.otServer = new GuardedServer(doc);
      },
      slaveApproval: function(arg) {
        var approval, slave, slaveId;
        slaveId = arg.slaveId, approval = arg.approval;
        if (slave = this.pendingSlaves[slaveId]) {
          delete this.pendingSlaves[slaveId];
          if (approval) {
            slave.send({
              type: 'connected',
              id: slave.connectionId,
              doc: this.otServer.document,
              revision: this.otServer.operations.length,
              peers: this.peers()
            });
            return this.slaves[slaveId] = slave;
          } else {
            return slave.sendError(disapprovedError());
          }
        }
      }
    };

    return MasterHandler;

  })(MessageHandler);

  SlaveHandler = (function(superClass) {
    extend(SlaveHandler, superClass);

    function SlaveHandler() {
      return SlaveHandler.__super__.constructor.apply(this, arguments);
    }

    SlaveHandler.prototype.type = 'Slave';

    SlaveHandler.prototype.setConnection = function(con, masterId) {
      if (!(this.master = masters[masterId])) {
        this.sendError(badMasterIdError(masterId));
      } else {
        this.master.addSlave(this);
      }
      return SlaveHandler.__super__.setConnection.call(this, con);
    };

    SlaveHandler.prototype.closed = function() {
      this.master.removeSlave(this);
      return SlaveHandler.__super__.closed.call(this);
    };

    SlaveHandler.prototype.handler = {
      __proto__: MessageHandler.prototype.handler,
      intro: function(arg) {
        this.name = arg.name;
        return this.broadcast({
          type: 'connection',
          peerId: this.connectionId,
          peerName: this.name
        });
      }
    };

    return SlaveHandler;

  })(MessageHandler);

  startServer = function(port) {
    var docs, files, http_server;
    console.log('serve: ' + path.dirname(process.cwd()));
    files = serveStatic(path.dirname(process.cwd()), {
      index: ['index.html']
    });
    docs = serveStatic(path.resolve(path.dirname(process.cwd()), "../docs"));
    http_server = http.createServer(function(req, res) {
      var m;
      return ((m = req.url.match(/^\/docs(\/.*)$/)) ? (req.url = m[1], docs) : files)(req, res, finalhandler(req, res));
    });
    sockjs.createServer({
      sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js',
      prefix: socketPrefix
    }).on('connection', function(con) {
      var ignore, masterId, ref1, type;
      if (ref1 = con.pathname.match(socketPrefix), ignore = ref1[0], type = ref1[1], masterId = ref1[2], ref1) {
        if (type === 'create') {
          return new MasterHandler().setConnection(con);
        } else {
          return new SlaveHandler().setConnection(con, masterId);
        }
      }
    }).installHandlers(http_server);
    http_server.listen(port, '0.0.0.0');
    return masters;
  };

  module.exports = {
    startServer: startServer
  };

}).call(this);

//# sourceMappingURL=launch-server.js.map
