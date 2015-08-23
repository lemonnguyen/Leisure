// Generated by CoffeeScript 1.9.3
(function() {
  var MasterHandler, MessageHandler, SlaveHandler, badIdError, badMsgTypeError, crypto, guid, http, masterPrefix, masters, ref, rerequire, s4, slavePrefix, slaves, sockjs, sockjsUtil, startServer,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  sockjs = require('sockjs');

  sockjsUtil = require('sockjs/lib/utils');

  http = require('http');

  crypto = require('crypto');

  ref = require('requirejs').config({
    baseUrl: path.dirname(module.filename)
  })('./common'), badIdError = ref.badIdError, badMsgTypeError = ref.badMsgTypeError;

  masters = {};

  slaves = {};

  masterPrefix = '/Leisure/master';

  slavePrefix = '/Leisure/slave[^/]*';

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

  MessageHandler = (function() {
    function MessageHandler() {}

    MessageHandler.prototype.setConnection = function(con1) {
      this.con = con1;
      this.id = guid();
      this.con.leisure = this;
      this.con.on('data', (function(_this) {
        return function(msg) {
          return _this.handleMessage(JSON.parse(msg));
        };
      })(this));
      this.con.on('close', (function(_this) {
        return function() {
          return _this.closed();
        };
      })(this));
      return this.send({
        type: 'connect',
        id: this.id
      });
    };

    MessageHandler.prototype.type = 'Unknown Handler';

    MessageHandler.prototype.close = function() {
      return this.con.close();
    };

    MessageHandler.prototype.closed = function() {};

    MessageHandler.prototype.send = function(msg) {
      return this.con.write(JSON.stringify(msg));
    };

    MessageHandler.prototype.handleMessage = function(msg) {
      var ref1, ref2;
      console.log(this.type + " received: " + (JSON.stringify(msg)));
      if (ref1 = (ref2 = msg.type) != null ? ref2.toLowerCase() : void 0, indexOf.call(this.legalMessages, ref1) >= 0) {
        this[msg.type](msg);
        return this.send({
          type: 'close'
        });
      } else {
        return this.send(badMsgTypeError(msg));
      }
    };

    MessageHandler.prototype.legalMessages = ['log'];

    MessageHandler.prototype.log = function(msg) {
      return console.log(msg.msg);
    };

    return MessageHandler;

  })();

  MasterHandler = (function(superClass) {
    extend(MasterHandler, superClass);

    function MasterHandler() {
      this.slaves = {};
    }

    MasterHandler.prototype.setConnection = function(con) {
      MasterHandler.__super__.setConnection.call(this, con);
      console.log("Master connection: " + con.leisure.id);
      return masters[this.id] = this;
    };

    MasterHandler.prototype.addSlave = function(slave) {
      return this.slaves[slave.id] = slave;
    };

    MasterHandler.prototype.type = 'Master';

    MasterHandler.prototype.closed = function() {
      var id, ref1, results, slave;
      console.log("Closed master: " + this.con.leisure.id);
      delete masters[this.con.leisure.id];
      ref1 = this.slaves;
      results = [];
      for (id in ref1) {
        slave = ref1[id];
        results.push(slave.close());
      }
      return results;
    };

    MasterHandler.prototype.legalMessages = ['log', 'change'];

    MasterHandler.prototype.change = function(msg) {};

    return MasterHandler;

  })(MessageHandler);

  SlaveHandler = (function(superClass) {
    extend(SlaveHandler, superClass);

    function SlaveHandler() {
      return SlaveHandler.__super__.constructor.apply(this, arguments);
    }

    SlaveHandler.prototype.connectToMaster = function(master1) {
      this.master = master1;
    };

    SlaveHandler.prototype.type = 'Slave';

    SlaveHandler.prototype.setConnection = function(con) {
      var ignore, master, masterId, ref1;
      SlaveHandler.__super__.setConnection.call(this, con);
      ref1 = con.pathname.match(con.prefix)[0].match(/.*([0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})/), ignore = ref1[0], masterId = ref1[1];
      if (!(master = masters[masterId])) {
        this.send(badMasterIdError(masterId));
        return this.close();
      } else {
        return this.master.addSlave(this);
      }
    };

    SlaveHandler.prototype.legalMessages = [];

    return SlaveHandler;

  })(MessageHandler);

  startServer = function(port) {
    var http_server;
    http_server = http.createServer();
    sockjs.createServer({
      sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js',
      prefix: masterPrefix
    }).on('connection', function(con) {
      return new MasterHandler().setConnection(con);
    }).installHandlers(http_server);
    sockjs.createServer({
      sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js',
      prefix: slavePrefix
    }).on('connection', function(con) {
      return new SlaveHandler().setConnection(con);
    }).installHandlers(http_server);
    return http_server.listen(port, '0.0.0.0');
  };

  rerequire = function(module) {
    var exp, k, ref1, removeKey, v;
    removeKey = null;
    if (module.match(/^\.[\/\\]/)) {
      exp = new RegExp((module.substring(2)) + "\.js$");
      console.log(exp);
      ref1 = require.cache;
      for (k in ref1) {
        v = ref1[k];
        if ((k.match(exp)) && !k.match(/node_modules/)) {
          if (removeKey) {
            console.log("WARNING: More than one module matches " + module);
            removeKey = null;
            break;
          }
          removeKey = k;
        }
      }
      if (removeKey) {
        delete require.cache[removeKey];
      }
    }
    return require(module);
  };

  module.exports = {
    startServer: startServer,
    rerequire: rerequire,
    guid: guid
  };

}).call(this);

//# sourceMappingURL=server.js.map
