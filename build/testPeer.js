// Generated by CoffeeScript 1.9.3
(function() {
  define(['sockjs'], function(SockJS) {
    var sock, url;
    console.log("SockJS: ", SockJS);
    url = 'http://localhost:9090/Leisure/master';
    console.log("opening socket " + url + "...");
    sock = new SockJS(url);
    sock.onopen = function() {
      console.log('open');
      return sock.send('{"type": "log", "msg": "test"}');
    };
    sock.onmessage = function(e) {
      var ref;
      console.log('message', e.data);
      if (((ref = JSON.parse(e.data)) != null ? ref.type : void 0) === 'close') {
        return sock.close();
      }
    };
    return sock.onclose = function() {
      return console.log('close');
    };
  });

}).call(this);

//# sourceMappingURL=testPeer.js.map
