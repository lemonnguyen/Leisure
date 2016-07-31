// Generated by CoffeeScript 1.10.0
(function() {
  define(['./base', './org', './docOrg', 'lib/lodash.min', './export', './advice', 'lib/bluebird.min'], function(Base, Org, DocOrg, _, BrowserExports, Advice, Bluebird) {
    var BPromise, ChangeMonitor, changeAdvice, getId, monitorChanges, monitorChangesWhile;
    changeAdvice = Advice.changeAdvice;
    BPromise = Bluebird.BPromise;
    getId = null;
    ChangeMonitor = (function() {
      function ChangeMonitor(data1) {
        this.data = data1;
        this.accessed = {};
        this.original = {};
        this.set = {};
        this.deleted = {};
        if (!getId) {
          getId = Leisure.getId;
        }
      }

      ChangeMonitor.prototype.start = function() {
        changeAdvice(this.data, true, this.advice);
        return this;
      };

      ChangeMonitor.prototype.stop = function() {
        changeAdvice(this.data, false, this.advice);
        return this;
      };

      ChangeMonitor.prototype.advice = {
        getBlock: {
          changeMonitor: function(parent) {
            return function(thing, changes) {
              changeMonitor.accessed[getId(thing)] = true;
              return parent(thing, changes);
            };
          }
        },
        setBlock: {
          changeMonitor: function(parent) {
            return function(id, block) {
              id = getId(id);
              changeMonitor.set[id] = true;
              if (!changeMonitor.original[id]) {
                changeMonitor.original[id] = this.getBlock(id);
              }
              return parent(id, block);
            };
          }
        },
        deleteBlock: {
          changeMonitor: function(parent) {
            return function(id) {
              changeMonitor.deleted[id] = true;
              if (!changeMonitor.original[id]) {
                changeMonitor.original[id] = this.getBlock(id);
              }
              return parent(id);
            };
          }
        }
      };

      return ChangeMonitor;

    })();
    monitorChanges = function(data) {
      return new ChangeMonitor(data).start();
    };
    monitorChangesWhile = function(data, func) {
      var mon;
      mon = monitorChanges(data);
      try {
        return func();
      } finally {
        mon.stop();
      }
    };
    return {
      monitorChanges: monitorChanges,
      monitorChangesWhile: monitorChangesWhile
    };
  });

}).call(this);

//# sourceMappingURL=transaction.js.map