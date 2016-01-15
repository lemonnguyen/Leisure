// Generated by CoffeeScript 1.10.0
(function() {
  define([], function() {
    var defer, deleteStore, getLocalStore, hasDatabase, localTransaction, openStore, promiseForRequest, storeName, stores, transaction;
    stores = {};
    storeName = 'leisureStorage';
    deleteStore = false;
    getLocalStore = function(id) {
      if (deleteStore) {
        return new Promise(function(succeed, fail) {
          var req;
          deleteStore = false;
          delete stores[id];
          req = indexedDB.deleteDatabase(id);
          req.onsuccess = function() {
            return succeed(openStore(id));
          };
          return req.onerror = fail;
        });
      } else {
        return openStore(id);
      }
    };
    openStore = function(id) {
      return stores[id] || (stores[id] = new Promise(function(succeed, fail) {
        var req;
        req = indexedDB.open(id, 1);
        req.onupgradeneeded = function(e) {
          var db;
          db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            return db.createObjectStore(storeName, {
              keyPath: '_id'
            });
          }
        };
        req.onsuccess = function() {
          return succeed(req.result);
        };
        return req.onerror = fail;
      }));
    };
    defer = function(cont) {
      return setTimeout(cont, 1);
    };
    localTransaction = function(id, type) {
      return getLocalStore(id).then(function(db) {
        if (db.objectStoreNames.contains(storeName)) {
          return db.transaction([storeName], type || 'readwrite');
        } else {
          return Promise.reject("No object store named " + storeName);
        }
      });
    };
    promiseForRequest = function(req) {
      return new Promise(function(succeed, fail) {
        req.onsuccess = function(e) {
          return succeed(req.result);
        };
        return req.onerror = fail;
      });
    };
    hasDatabase = function(id) {
      return stores[id];
    };
    transaction = function(id, type) {
      var p, trans;
      trans = null;
      p = localTransaction(id, type).then(function(t) {
        return trans = t;
      });
      return {
        put: function(value) {
          return p = p.then(function() {
            return promiseForRequest(trans.objectStore(storeName).put(value));
          });
        },
        get: function(key) {
          return p = p.then(function() {
            return promiseForRequest(trans.objectStore(storeName).get(key));
          });
        },
        "delete": function(key) {
          return p = p.then(function() {
            return promiseForRequest(trans.objectStore(storeName)["delete"](key));
          });
        },
        getAll: function() {
          var results;
          results = [];
          return p.then(function() {
            return new Promise(function(succeed, fail) {
              return trans.objectStore(storeName).openCursor().onsuccess = function(e) {
                var cursor;
                if (cursor = e.target.result) {
                  results.push(cursor.value);
                  return cursor["continue"]();
                } else {
                  return succeed(results);
                }
              };
            });
          });
        }
      };
    };
    return {
      hasDatabase: hasDatabase,
      transaction: transaction
    };
  });

}).call(this);

//# sourceMappingURL=db.js.map
