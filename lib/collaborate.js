// Generated by CoffeeScript 1.7.1
(function() {
  var attemptCollaboration, checkAncestor, commonAncestor, diff, hash, initCollaboration, listener, parents, receivePatch, root, sendData, sendDiff, sendText, setListener, setText, sha, socket, storeText, text, texts, trunk, watchPeriod, watching, _;

  root = module.exports = require('./base');

  _ = require('./lazy');

  window.Utf8 = require('utf8');

  sha = require('./sha256');

  diff = require('./diff');

  socket = null;

  text = '';

  hash = '';

  trunk = '';

  texts = {};

  parents = {};

  listener = function() {};

  watching = false;

  watchPeriod = 250;

  storeText = function(txt) {
    var textHash;
    textHash = sha.hash(txt);
    texts[textHash] = txt;
    return textHash;
  };

  setText = function(txt) {
    var ancestor, mergeHash, oldHash, oldText, trunkText;
    if (socket) {
      oldHash = hash;
      oldText = text;
      if (txt !== text) {
        text = txt;
        hash = storeText(txt);
        mergeHash = null;
        if (oldHash) {
          parents[hash] = oldHash;
          if (trunk && trunk !== oldHash) {
            sendDiff(oldHash, oldText, hash, txt, true);
            trunkText = texts[trunk];
            ancestor = commonAncestor(oldHash, trunk);
            storeText(_(diff.diff3_merge(txt, texts[ancestor], texts[trunk], true)).reduce((function(str, result) {
              if (result.ok) {
                return str + result.ok.join('');
              } else {
                return str + result.conflict.a + result.conflict.b;
              }
            }), ''));
            mergeHash = oldHash;
            oldHash = trunk;
            oldText = texts[trunk];
          } else {
            storeText(txt);
          }
          return sendDiff(oldHash, oldText, hash, txt, false, mergeHash);
        }
      }
    }
  };

  sendText = function(el) {
    if (!watching) {
      watching = true;
      return setTimeout((function() {
        setText(el.textContent);
        return watching = false;
      }), watchPeriod);
    }
  };

  sendData = function(el, key, oldValue, newValue) {
    if (socket) {
      socket.emit('storeData', {
        parent: hash,
        key: key,
        patch: diff.diff_patch(oldValue, newValue)
      });
    }
    return storeText(el.textContent);
  };

  commonAncestor = function(h1, h2) {
    var anc, r;
    if (h1 && h2) {
      anc = {};
      while (h1 || h2) {
        if (r = checkAncestor(h1, anc)) {
          return r;
        }
        if (r = checkAncestor(h2, anc)) {
          return r;
        }
        h1 = h1 && parents[h1];
        h2 = h2 && parents[h2];
      }
      return null;
    } else {
      return h1 || h2;
    }
  };

  checkAncestor = function(ancestor, set) {
    if (ancestor && set[ancestor]) {
      return ancestor;
    } else {
      return ancestor && (set[ancestor] = true) && ancestor;
    }
  };

  sendDiff = function(parentHash, parentText, hash, txt, keepPrivate, merge) {
    var d;
    if (socket) {
      d = diff.diff_patch(parentText, txt);
      console.log("Hash: " + hash + ", Parent: " + parentHash + ", Patch: " + (JSON.stringify(d, '  ')));
      return socket.emit('store', {
        hash: hash,
        parent: parentHash,
        patch: d,
        "private": !!keepPrivate,
        mergeHash: merge
      });
    }
  };

  receivePatch = function(oldHash, patch) {
    text = diff.patch(texts[oldHash], patch).join('');
    hash = storeText(text);
    trunk = hash;
    return listener(text);
  };

  setListener = function(l) {
    return listener = l;
  };

  attemptCollaboration = function(docUrl, res) {
    var m, u;
    u = new URI(document.location.href, docUrl);
    m = u.path.match(/^\/file(\/.*)$/);
    if (m) {
      u.path = "/collab" + m[1];
      return $.get(u.toString(), function(data) {
        return res(true, m[1]);
      }).fail(function() {
        return res(false);
      });
    } else {
      return res(false);
    }
  };

  initCollaboration = function(url, doc) {
    var uri;
    uri = new URI(url);
    console.log("\n\n*\n*\n* COLLABORATE " + uri.path + "\n*\n*\n");
    return attemptCollaboration(url, function(success, path) {
      if (success) {
        console.log("CONNECTING TO: " + path);
        socket = io.connect(path, {
          'force new connection': true
        });
        setText(doc);
        setListener(function(txt) {
          return root.useText(txt);
        });
        socket.on('connect', function() {
          console.log("CONNECTED");
          return socket.emit('init', hash);
        });
        return socket.on('patch', function(_arg) {
          var hash, patch;
          hash = _arg.hash, patch = _arg.patch;
          console.log("RECEIVED hash: " + hash + ", patch " + (JSON.stringify(patch)));
          return receivePatch(hash, patch);
        });
      } else {
        return console.log("NOT COLLABORATING");
      }
    });
  };

  root.setText = setText;

  root.receivePatch = receivePatch;

  root.setCollaborationListener = setListener;

  root.initCollaboration = initCollaboration;

  root.sendText = sendText;

  root.sendDataDiff = sendDataDiff;

}).call(this);

//# sourceMappingURL=collaborate.map