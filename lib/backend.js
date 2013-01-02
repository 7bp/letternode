"use strict";

var fs = require('fs'), Util = require('./helper/util'), Q = require('q'), EventEmitter2 = require('eventemitter2').EventEmitter2;

var Backend = (function() {

  // Constructor
  function Backend(storagePath) {
    this.games = {};
    this.storagePath = storagePath;
    this.clients = {};
    this.emitter = new EventEmitter2({wildcard: true, maxListeners: 50});
    this.syncDataBuffer = 5000;
    this.log('info', 'Backend starting initialization...');
    this.initialize();
  }

  Backend.prototype.initialize = function() {
    this.emitter.on('app.game.clientRegistered', this.onClientRegistered.bind(this));
    this.emitter.on('app.game.clientDeRegistered', this.onClientDeRegistered.bind(this));
    this.readGames();
    this.emit('app.initialized');
  };

  Backend.prototype.getEmitter = function() {
    return this.emitter;
  };

  Backend.prototype.emit = function(event, data) {
    data = data || {};
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

  Backend.prototype.syncData = function() {
    var me = this;

    // If there is already exists a timer object, we have to check if the writing process has already been started.
    if (me._syncDataTimeoutObj) {
      if (me._syncDataInProgress) {
        // Special use case in which syncData was called while the timer function was writing the data.
        // To ensure all data were written, the syncData have to be called another time.
        me.log('warn', 'Sync data was requested while writing data, retry in 1s.');
        setTimeout(function() {
          me.syncData();
        }, 1000);
      } else {
        me.log('info', 'Sync data requested; already in queue.');
      }
    } else {
      me.log('info', 'Sync data requested; add this to the queue.');
      me._syncDataTimeoutObj = setTimeout(function() {
        me._syncDataTimeoutObj = null;
        me._syncDataInProgress = true;
        me.writeGames().then(function() {
          me._syncDataInProgress = false;
        });
      }, me.syncDataBuffer);
    }
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
    this.emit('app.game.clientRegistered', {gameId: gameId, sockedId: socket.id, type: type});
  };

  /**
   * Look up the internal storage of clients for all sockets which match the given gameId and type.
   * @param gameId
   * @param type
   * @return {Array}
   */
  Backend.prototype.findClientsByType = function(gameId, type) {
    var result = [];
    for (var gameId in this.games) { // FIXME 'gameId' is already defined.
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
    game.state = 'INIT';
    game.player1 = Util.buildUUID(48); // 6 bytes
    game.player1Name = (options != null && options.playerName) ? options.playerName : 'Player 1';
    game.player2 = Util.buildUUID(48); // 6 bytes
    game.player2Name = 'Player 2';
    this.games[game.id] = game;

    if (options.socket) {
      this.registerClient(game.id, options.socket, 'player1');
    }

    this.syncData();

    return this.getGame(game.id);
  };

  /**
   * Join an existing game.
   * @param options
   * @return {{}}
   */
  Backend.prototype.joinGame = function(options) {
    var game = this.games[options.gameId];

    game.player2Name = (options != null && options.playerName) ? options.playerName : 'Player 2';
    game.state = 'CREATED';

    if (options.socket) {
      this.registerClient(game.id, options.socket, 'player2');
    }

    this.syncData();

    return this.getGame(game.id);
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
   * Send the message "data" to each client (socket) for the specified gameId and client type.
   * @param gameId
   * @param clientType
   * @param data the actual message
   */
  Backend.prototype.broadcastToGamePlayers = function(gameId, clientType, data) {
    var clients = this.findClientsByType(gameId, clientType);
    for (var i = 0; i < clients.length; i++) {
      var socket = clients[i].socket;
      try {
        socket.emit('server_message', data);
      } catch (exception) {
        this.log('error', 'The client #' + socket.id + ' seems to be disconnected. This client will be deregistered now.');
        // Removing origin clients directly; "otherClients" is now out of sync.
        this.deregisterClient(socket);
      }
    }
  };

  /**
   * Dispatch and handling incoming messages.
   * @param socket
   * @param data
   */
  Backend.prototype.dispatchMessage = function(socket, data) {
    var commands = {
      'createGame': function(socket, data) {
        this.createGame({playerName: data.playerName, socket: socket});
      },
      'joinGame': function(socket, data) {
        this.joinGame({gameId: data.gameId, playerName: data.playerName, socket: socket});
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
        socket.emit('server_message', {error: true, message: 'Unknown action', data: data});
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

  Backend.prototype.onClientRegistered = function(data) {
    var game = this.games[data.gameId], publicGame = this.getGame(game.id);
    if (game.state === 'INIT') {
      this.broadcastToGamePlayers(data.gameId, 'player1', {action: 'gameCreated', game: publicGame});
    } else {
      this.broadcastToGamePlayers(data.gameId, 'player1', {action: 'playerJoined', game: publicGame});
      this.broadcastToGamePlayers(data.gameId, 'player2', {action: 'playerJoined', game: publicGame});
    }
  };

  Backend.prototype.onClientDeRegistered = function(data) {
    var game = this.games[data.gameId], publicGame = this.getGame(game.id);
    this.broadcastToGamePlayers(data.gameId, 'player1', {action: 'playerLeaved', game: publicGame});
    this.broadcastToGamePlayers(data.gameId, 'player2', {action: 'playerLeaved', game: publicGame});
  };

  return Backend;
})();

module.exports = Backend;