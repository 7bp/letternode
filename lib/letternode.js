"use strict";

var fs = require('fs'), Util = require('./helper/util'), Q = require('q');

var Backend = (function() {

  // Constructor
  function Backend(storagePath) {
    this.games = {};
    this.storagePath = storagePath;
    this.initialize();
  }

  Backend.prototype.initialize = function() {
    this.readGames();
  };

  // Deferrable
  Backend.prototype.readGames = function() {
    var me = this, onSuccess = function(json) {
      me.games = json;
      var numberOfGames = 0;
      for (var id in me.games) {
        if (me.games.hasOwnProperty(id)) {
          numberOfGames++;
        }
      }
      console.log('Games unserialized: ' + numberOfGames);
    };
    return (Q.nfbind(fs.readFile))(this.storagePath, 'utf8').then(JSON.parse).then(onSuccess);
  };

  // Deferrable
  Backend.prototype.writeGames = function() {
    var onSuccess = function () {
      console.info('Games serialized');
    };
    return (Q.nfbind(fs.writeFile))(this.storagePath, JSON.stringify(this.games), 'utf8').then(onSuccess);
  };

  Backend.prototype.createGame = function(req, res) {
    var game = {};
    game.id = Util.buildUUID(48); // 6 bytes
    game.opponendId = Util.buildUUID(48);
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
        var stateMatrix = [
          0, 1, 2, 0, 2,
          0, 1, 2, 0, 2,
          0, 1, 2, 0, 2,
          0, 1, 2, 0, 2,
          0, 1, 2, 0, 2
        ]; // dummy
        socket.emit('server_message', {stateMatrix: stateMatrix, action: 'move'});      
      },
      join: function(socket, data) {
        var opponend = data.name;
        socket.emit('server_message', {opponend: opponend, action: 'join'});
      },
      restart: function(socket, data) {
        var gameMatrix = this.createGameMatrix();
        var stateMatrix = [
          0, 0, 0, 0, 0,
          0, 0, 0, 0, 0,
          0, 0, 0, 0, 0,
          0, 0, 0, 0, 0,
          0, 0, 0, 0, 0
        ];
        socket.emit('server_message', {gameMatrix: gameMatrix, stateMatrix: stateMatrix, action: 'restart'});
      },
      'default' : function(socket, data) {
        socket.emit('server_message', {error : true, message : 'Unknown action', data : data})
      }
    };

    if (commands[data.action]) {
      commands[data.action](socket, data);
    } else {
      commands['default'](socket, data);
    }

    // socket.emit('server_message', data);
  };
  
  Backend.prototype.createGameMatrix = function() {
    return [
      'A', 'C', 'D', 'E', 'F',
      'I', 'U', 'P', 'K', 'L',
      'A', 'C', 'D', 'E', 'F',
      'I', 'U', 'P', 'K', 'L',
      'A', 'C', 'D', 'E', 'O'
    ];
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

