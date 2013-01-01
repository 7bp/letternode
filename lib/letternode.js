"use strict";

var fs = require('fs');

var buildUUID = function(bits) {
  var CHARS, i, rand, result, _i;
  CHARS = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz012345678900';
  result = '';
  while (bits > 0) {
    rand = Math.floor(Math.random() * 0x100000000);
    for (i = _i = 26; _i > 0; i = _i += -6) {
      result += CHARS[0x3F & rand >>> i];
      bits -= 6;
      if (bits <= 0) {
        break;
      }
    }
  }
  return result;
};
// s = buildUUID(48)

var Backend = (function() {
  function Backend(storagePath) {
    this.games = {};
    this.storagePath = storagePath;
    this.initialize();
  }
  
  Backend.prototype.initialize = function() {
    this.readGames();
  };
  
  Backend.prototype.readGames = function() {
    var me = this;
    fs.exists(me.storagePath, function(exists) { 
      if (exists) {
        fs.readFile(me.storagePath, 'utf8', function(err, data) {
          if (err) {
            console.error(err);
          }
          try {
            me.games = JSON.parse(data);
          } catch(e) {
            console.error(e);
          }
          console.info('Games unserialized');
        });    
      }
    });    
  };
  
  Backend.prototype.writeGames = function() {
    fs.writeFile(this.storagePath, JSON.stringify(this.games), 'utf8', function() {
      console.info('Games serialized');
    });
  };
  
  Backend.prototype.createGame = function(req, res) {
    var game = {};
    game.id = buildUUID(48); // 6 bytes
    game.opponendId = buildUUID(48);
    this.games[game.id] = game;
    this.writeGames();
    res.redirect('/game/'+game.id);
  };
  
  Backend.prototype.getGame = function(gameId, res) {
    if (!this.games[gameId]) {
      return null;
    }
    var game = this.games[gameId];
    var result = {
      id: game.id
    };
    return result;
  };
  
  Backend.prototype.dispatchMessage = function(socket, data) {
    var commands = {
      move: function(socket, data) {
        var word = data.word;
        var gameMatrix = [0, 1, 2, 0, 2, 0, 1, 2, 0, 2, 0, 1, 2, 0, 2, 0, 1, 2, 0, 2, 0, 1, 2, 0, 2];
        socket.emit('server_message', {matrix: gameMatrix});      
      }
    };
    
    if (commands[data.action]) {
      commands[data.action](socket, data);
    }
    
    // socket.emit('server_message', data);
  };
  
  return Backend;
})();

var backend = new Backend(__dirname + '/../games.json');

module.exports.routes = function(app) {
  app.get('/game', function(req, res) {
    backend.createGame(req, res);
  });
  
  app.get('/game/:id', function(req, res) {
    var game = backend.getGame(req.params.id, res);
    if (game) {
      res.send(200, game);
    } else {
      res.send(404, "Game not found.");
    }
  });
};

module.exports.sockets = function(io) {
  io.sockets.on('connection', function(socket) {
    console.log('Client Connected');
    
    //socket.join(game.id);
    
    socket.on('message', function(data) {
      //socket.broadcast.emit('server_message', data);
      backend.dispatchMessage(socket, data);
    });

    socket.on('disconnect', function() {
      console.log('Client Disconnected.');
    });

    //socket.broadcast.to(game.id).emit('server_message', {message: 'Player joined [' + game.id + ']', action: 'join'});
  });
};

