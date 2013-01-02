"use strict";

var fs = require('fs'), Util = require('./helper/util'), Q = require('q'), EventEmitter2 = require('eventemitter2').EventEmitter2;

var GAME_STATES = {
  INIT: 'INIT',
  CREATED: 'CREATED',
  FINISHED: 'FINISHED'
};

var CLIENT_TYPES = {
  PLAYER_1: 'player1',
  PLAYER_2: 'player2'
};

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
    this.readGames().then(this.cleanGames.bind(this));
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
    var clients = this.clients[gameId];
    if (clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.type === type) {
          result.push(client);
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

    // Internal app events should not be called while running in the loops to avoid a deadlock.
    var eventsToEmit = [], i;

    for (var gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var clients = this.clients[gameId];
        if (clients) {
          // Find and remove a client referenced by this socket object.
          var clientsToRemove = [];
          for (i = 0; i < clients.length; i++) {
            var client = clients[i];
            if (client.socket.id === socket.id) {
              clientsToRemove.push({client: client, index: i});
              // A socket must be unique in this list.
              break;
            }
          }
          if (clientsToRemove.length) {
            for (i = 0; i < clientsToRemove.length; i++) {
              var clientToRemove = clientsToRemove[i];
              clients.splice(clientToRemove.index, 1);
              eventsToEmit.push({
                event: 'app.game.clientDeRegistered',
                data: {gameId: gameId, type: clientToRemove.type}
              });
              this.log('info', 'Deregistration of client #' + socket.id + ' in game #' + gameId + ' successfully finished.');
            }
          }
        }
      }
    }

    for (i = 0; i < eventsToEmit.length; i++) {
      var eventToEmit = eventsToEmit[i];
      this.emit(eventToEmit.event, eventToEmit.data);
    }
  };

  /**
   * Remove all games (including clients) which are older than 24 hours.
   * Remove all clients of newer games which are older than one hour.
   */
  Backend.prototype.cleanGames = function() {
    var twentyFourHoursAgo = new Date().getTime() - (86400 * 1000);
    var oneOurHourAgo = new Date().getTime() - (3600 * 1000);
    var gamesToRemove = [];

    this.log('info', 'Cleaning game data...');

    var gameId;
    for (gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var game = this.games[gameId];
        if (game.updated < twentyFourHoursAgo) {
          gamesToRemove.push(gameId);
        } else {
          this.cleanClients(gameId, oneOurHourAgo);
        }
      }
    }
    for (var i = 0; i < gamesToRemove.length; i++) {
      gameId = gamesToRemove[i];
      this.cleanClients(gameId, 0);
      this.games[gameId] = undefined;
    }
  };

  /**
   * Remove all clients (and disconnect the socket if required) of the specified gameId.
   * If the the threshold is set, only older ones will be affected.
   * @param gameId
   * @param activityThreshold
   */
  Backend.prototype.cleanClients = function(gameId, activityThreshold) {
    var clients = this.clients[gameId];
    if (clients) {
      var clientsToRemove = [], i;
      if (activityThreshold) {
        for (i = 0; i < clients.length; i++) {
          if (clients[i].updated < activityThreshold) {
            clientsToRemove.push(clients[i]);
          }
        }
      } else {
        // Remove all.
        for (i = 0; i < clients.length; i++) {
          clientsToRemove.push(clients[i]);
        }
      }
      for (i = 0; i < clientsToRemove.length; i++) {
        var clientToRemove = clientsToRemove[i];
        clients.splice(clients.indexOf(clientToRemove), 1);
        try {
          clientToRemove.socket.disconnect();
        } catch (ignored) {
          this.log('warn', 'CleanClients: Failed disconnecting socket #' + clientToRemove.socket.id);
        }
      }
    }
  };

  /**
   * Create a new game by the first player.
   * @param options
   * @return {{}}
   */
  Backend.prototype.createGame = function(options) {
    var game = {};

    game.id = Util.buildUUID(48); // 6 bytes
    game.created = new Date().getTime();
    game.updated = new Date().getTime();
    game.state = GAME_STATES.INIT;
    game.player1 = Util.buildUUID(48); // 6 bytes
    game.player1Name = (options != null && options.playerName) ? options.playerName : 'Player 1';
    game.player2 = Util.buildUUID(48); // 6 bytes
    game.player2Name = 'Player 2';
    game.gameMatrix = this.createGameMatrix();
    game.stateMatrix = '2222222222222222222222222';
    this.games[game.id] = game;

    if (options.socket) {
      this.registerClient(game.id, options.socket, CLIENT_TYPES.PLAYER_1);
    }

    this.syncData();

    return this.getGame(game.id);
  };

  Backend.prototype.findGameByPlayerId = function(playerId) {
    var gameId;
    for (gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var game = this.games[gameId];
        if (game.player1 === playerId) {
          return {gameId: game.id, playerNum: 1};
        } else if (game.player2 === playerId) {
          return {gameId: game.id, playerNum: 2};
        }
      }
    }
    return false;
  };

  /**
   * Join an existing game.
   * @param options
   * @return {{}}
   */
  Backend.prototype.joinGame = function(options) {
    var gameData = this.findGameByPlayerId(options.playerId);
    if (!gameData) {
      options.socket.emit('createGameRequired');
      return null;
    }
    var game = this.games[gameData.gameId];
    var playerNum = gameData.playerNum;

    if (playerNum === 1) {
      game.player1Name = (options != null && options.playerName) ? options.playerName : 'Player 1';
    } else if (playerNum === 2) {
      game.player2Name = (options != null && options.playerName) ? options.playerName : 'Player 2';
    }
    game.state = GAME_STATES.CREATED;
    game.updated = new Date().getTime();

    if (options.socket) {
      if (playerNum === 1) {
        this.registerClient(game.id, options.socket, CLIENT_TYPES.PLAYER_1);
      } else if (playerNum === 2) {
        this.registerClient(game.id, options.socket, CLIENT_TYPES.PLAYER_2);
      }
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
      player2Name: game.player2Name,
      gameMatrix: game.gameMatrix,
      stateMatrix: game.stateMatrix
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
        socket.emit(data.action, data);
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
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var importantChars = 'AEIOU';
    var result = '';
    var i;
    var ic = 0;
    for (i = 0; i < 25; i++) {
      var position = Math.floor(Math.random() * chars.length);
      result += chars[position];
      if (importantChars.indexOf(chars[position]) !== -1) {
        ic++;
      }
    }
    while (ic <= 2) {
      var position = Math.floor(Math.random() * result.length);
      result[position] = importantChars[Math.floor(Math.random() * importantChars.length)];
    }
    return result;
  };

  Backend.prototype.onClientRegistered = function(data) {
    var game = this.games[data.gameId], publicGame = this.getGame(game.id);
    if (game.state === GAME_STATES.INIT) {
      this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_1, {action: 'gameCreated', game: publicGame, playerNum: 1});
    } else {
      this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_1, {action: 'playerJoined', game: publicGame, playerNum: 1});
      this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_2, {action: 'playerJoined', game: publicGame, playerNum: 2});
    }
  };

  Backend.prototype.onClientDeRegistered = function(data) {
    var game = this.games[data.gameId], publicGame = this.getGame(game.id);
    this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_1, {action: 'playerLeft', game: publicGame});
    this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_2, {action: 'playerLeft', game: publicGame});
  };

  return Backend;
})();

module.exports = Backend;
