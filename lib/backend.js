"use strict";

var fs = require('fs'), Util = require('./helper/util'), Q = require('q'), EventEmitter2 = require('eventemitter2').EventEmitter2;

var Backend = (function() {

  // Constructor
  function Backend(storagePath) {
    this.games = {};
    this.storagePath = storagePath;
    this.clients = {};
    this.emitter = new EventEmitter2({wildcard: true, maxListeners: 50});
    this.log('info', 'Backend starting initialization...');
    this.initialize();
  }

  Backend.prototype.initialize = function() {
    this.readGames();
  };

  Backend.prototype.getEmitter = function() {
    return this.emitter;
  };

  Backend.prototype.emit = function(event, data) {
    data.event = event;
    data.timestamp = new Date();
    this.emitter.emit(event, data);
  };

  Backend.prototype.log = function(level, data) {
    if (typeof data !== 'object') {
      data = {message: data};
    }
    data.level = level;
    this.emit('logger.' + level, data);
  };

  // Deferrable
  Backend.prototype.readGames = function() {
    var me = this, onSuccess = function(json) {
      me.games = json;
      me.log('info', 'Reading game data finished.');
    };
    me.log('info', 'Reading game data from file: ' + me.storagePath);
    return (Q.nfbind(fs.readFile))(me.storagePath, 'utf8').then(JSON.parse).then(onSuccess);
  };

  // Deferrable
  Backend.prototype.writeGames = function() {
    var me = this, onSuccess = function() {
      me.log('info', 'Writing game data finished.');
    };
    me.log('info', 'Writing game data to file: ' + me.storagePath);
    return (Q.nfbind(fs.writeFile))(this.storagePath, JSON.stringify(this.games), 'utf8').then(onSuccess);
  };

  /**
   * Add a new client identified by a socket.
   * @param gameId
   * @param socket
   * @param type
   */
  Backend.prototype.registerClient = function(gameId, socket, type) {
    var clients = this.clients[gameId];
    if (!clients) {
      clients = [];
      this.clients[gameId] = clients;
    }
    var client = {
      socket: socket,
      created: new Date(),
      updated: new Date(),
      type: type
    };
    clients.push(client);
    this.log('log', 'Client #' + socket.id + ' (type=' + type + ') has been registered successfully with Game #' + gameId + '.');
  };

  /**
   * Look up the internal storage of clients for all sockets which match the given gameId and type.
   *
   * @param gameId
   * @param type
   * @return {Array}
   */
  Backend.prototype.findClientsByType = function(gameId, type) {
    var result = [];
    for (var gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var clients = this.clients[gameId];
        if (clients) {
          for (var i = 0; i < clients.length; i++) {
            var client = clients[i];
            if (client.type === type) {
              result.push(client);
            }
          }
        }
      }
    }
    return result;
  };

  /**
   * Remove the client identified by this socket.
   * @param socket
   */
  Backend.prototype.deregisterClient = function(socket) {
    this.log('info', 'Requested deregistration of client #' + socket.id + '...');
    for (var gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var clients = this.clients[gameId];
        if (clients) {
          // Find and remove a client referenced by this socket object.
          var toRemove = [];
          for (var i = 0; i < clients.length; i++) {
            var client = clients[i];
            if (client.socket === socket) {
              toRemove.push(i);
              // A socket can only exist once a time.
              break;
            }
          }
          if (toRemove.length) {
            this.clients[gameId] = clients.splice(i, 1);
            this.log('info', 'Deregistration of client #' + socket.id + ' in game #' + gameId + ' successfully finished.');
          }
        }
      }
    }
  };

  Backend.prototype.clearClients = function() {
    // TODO for each old clients...
  };

  /**
   * Create a new game by the first player.
   * @param options
   * @return {{}}
   */
  Backend.prototype.createGame = function(options) {
    var game = {};
    game.id = Util.buildUUID(48); // 6 bytes
    game.player1 = Util.buildUUID(48); // 6 bytes
    game.player1Name = (options != null && options.playerName) ? options.playerName : 'Player 1';
    game.player2 = Util.buildUUID(48); // 6 bytes
    game.player2Name = 'Player 2';
    this.games[game.id] = game;
    this.writeGames();
    // FIXME game object should not be exposed!
    return game;
  };

  /**
   * Return the (public) available game information data.
   * @param gameId
   * @return {*}
   */
  Backend.prototype.getGame = function(gameId) {
    if (!this.games[gameId]) {
      return null;
    }
    var game = this.games[gameId];
    var result = {
      id: game.id,
      player1: game.player1,
      player2: game.player2,
      player1Name: game.player1Name,
      player2Name: game.player2Name
    };
    return result;
  };

  /**
   * Dispatch and handling incoming messages.
   * @param socket
   * @param data
   */
  Backend.prototype.dispatchMessage = function(socket, data) {
    var commands = {
      'createGame': function(socket, data) {
        var game = this.createGame({playerName: data.playerName});
        this.registerClient(game.id, socket, 'player1');
        socket.emit('server_message', {action: 'gameCreated', game: game});
      },
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
      joinGame: function(socket, data) {
        // FIXME security!
        var game = this.games[data.gameId];
        game.player2Name = data.playerName || 'Player 2';
        this.registerClient(game.id, socket, 'player2');
        this.writeGames();
        var otherClients = this.findClientsByType(game.id, 'player1');
        var resultGame = this.getGame(game.id);
        for (var i = 0; i < otherClients.length; i++) {
          try {
            otherClients[i].socket.emit('server_message', {action: 'gameJoined', game: resultGame});
          } catch (exception) {
            // Removing origin clients directly; "otherClients" is now out of sync.
            this.deregisterClient(otherClients[i].socket);
          }
        }
        socket.emit('server_message', {action: 'gameJoined', game: resultGame});
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
      'default': function(socket, data) {
        socket.emit('server_message', {error: true, message: 'Unknown action', data: data})
      }
    };

    if (commands[data.action]) {
      commands[data.action].call(this, socket, data);
    } else {
      commands['default'].call(this, socket, data);
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

module.exports = Backend