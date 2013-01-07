"use strict";

var fs = require('fs'),
  Util = require('./helper/util'),
  Q = require('q'),
  EventEmitter2 = require('eventemitter2').EventEmitter2,
  Words = require('./words'),
  MatrixUtil = require('./helper/matrix_util'),
  ScoreUtil = require('./helper/score_util'),
  timeago = require('timeago');

var WORD_DICTIONARIES = {
  EOWL: {
    PATH: './lib/dictionary/eowl',
    LENGTH: 1
  },
  LETTERPRESS: {
    PATH: './lib/dictionary/letterpress',
    LENGTH: 2
  }
};

// change this to WORD_DICTIONARIES.LETTERPRESS after adding the letterpress dictionary files
var WORD_DICTIONARY = WORD_DICTIONARIES.EOWL;

var GAME_STATES = {
  INIT: 'INIT',
  CREATED: 'CREATED',
  FINISHED: 'FINISHED'
};

var CLIENT_TYPES = {
  ALL_PLAYERS: null,
  PLAYER_1: 'player1',
  PLAYER_2: 'player2'
};

var FAILURE_TYPES = {
  WORD_INVALID: 'word_invalid',
  WORD_ALREADY_PLAYED: 'word_already_played',
  GAME_ALREADY_FINISHED: 'game_already_finished',
  INVALID_MOVE: 'invalid_move'
};

var GAME_ID_LENGTH = 6, GAME_ROOM_PREFIX = 'game#';

var Backend = (function() {

  var cloneObject = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  // Constructor
  function Backend(storagePath, matrixConfig, backdoorEnabled) {
    this.games = {};
    this.storagePath = storagePath;
    this.matrixConfig = cloneObject(matrixConfig);
    this.matrixConfig.CELLS = this.matrixConfig.ROWS * this.matrixConfig.COLUMNS_PER_ROW;
    this.emitter = new EventEmitter2({wildcard: true, maxListeners: 50});
    this.words = new Words({
      fileNameChars: WORD_DICTIONARY.LENGTH,
      basePath: WORD_DICTIONARY.PATH
    });
    this.syncDataBuffer = 5000;
    this.backdoorEnabled = backdoorEnabled === true;
    this.log('info', 'Backend starting initialization...');
    if (this.backdoorEnabled) {
      this.log('warn', 'Backdoor mode was initialized!');
    }
    this.matrixUtil = new MatrixUtil(this.matrixConfig);
    this.initialize();
  }

  Backend.prototype.setSocketIO = function(io) {
    this.io = io;
  };

  Backend.prototype.initialize = function() {
    this.emitter.on('app.game.client.joined', events.onClientJoined.bind(this));
    this.emitter.on('app.game.client.left', events.onClientLeft.bind(this));
    this.emitter.on('app.game.player.moved', events.onPlayerMoved.bind(this));
    this.emitter.on('app.game.player.preMoved', events.onPlayerPreMoved.bind(this));
    this.emitter.on('app.game.player.restartedGame', events.onPlayerRestartedGame.bind(this));
    this.emitter.on('app.game.state.changed', events.onGameStateChanged.bind(this));
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
      var getSocketIdsBySockets = function(sockets) {
        var result = [];
        for (var i = 0, c = sockets.length; i < c; i++) {
          result.push(sockets[i].id);
        }
        return result;
      };

      me.games = json;
      for (var gameId in me.games) {
        if (me.games.hasOwnProperty(gameId)) {
          me.updateGameStats(me.games[gameId]);
          me.games[gameId].player1List = getSocketIdsBySockets(me.io.sockets.clients(me.getGamePlayerRoomName(gameId, CLIENT_TYPES.PLAYER_1)));
          me.games[gameId].player2List = getSocketIdsBySockets(me.io.sockets.clients(me.getGamePlayerRoomName(gameId, CLIENT_TYPES.PLAYER_2)));
        }
      }
      me.log('info', 'Reading game data finished.');
    };
    me.log('info', 'Reading game data from file: ' + me.storagePath);
    return (Q.nfbind(fs.readFile))(me.storagePath, 'utf8').then(JSON.parse).then(onSuccess);
  };

  Backend.prototype.updateGameStats = function(game, playerType, positions) {
    if (playerType && positions) {
      game.stateMatrix = this.matrixUtil.buildStateMatrixAsString(game.stateMatrix, playerType, positions);
    }
    var score = ScoreUtil.getScores(game.stateMatrix);
    game.player1Score = score[0];
    game.player2Score = score[1];
    if (ScoreUtil.isGameFinished(game.stateMatrix)) {
      game.state = GAME_STATES.FINISHED;
    }
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
    // Join internal used rooms.
    socket.join(this.getGameRoomName(gameId));
    socket.join(this.getGamePlayerRoomName(gameId, type));

    // Store internal socket id, intentionally to increase internal counter.
    if (type === CLIENT_TYPES.PLAYER_1) {
      this.games[gameId].player1List.push(socket.id);
    } else if (type === CLIENT_TYPES.PLAYER_2) {
      this.games[gameId].player2List.push(socket.id);
    }

    this.emit('app.game.client.joined', {gameId: gameId, socketId: socket.id, type: type});
  };

  Backend.prototype.findPlayerTypeBySocketId = function(gameId, socketId) {
    var game = this.games[gameId];
    if (game) {
      if (game.player1List.indexOf(socketId) > -1) {
        return CLIENT_TYPES.PLAYER_1;
      }
      if (game.player2List.indexOf(socketId) > -1) {
        return CLIENT_TYPES.PLAYER_2;
      }
    }
    return null;
  };

  /**
   * Remove the client identified by this socket.
   * @param socket
   */
  Backend.prototype.deRegisterClient = function(socket) {
    var removeSocketIdInList = function(list, socketId) {
      var idx = list.indexOf(socketId);
      if (idx > -1) {
        list.splice(idx, 1);
      }
    };
    if (this.io) {
      // Goal: Find the game by the socket
      // (1) A list of all rooms of this client.
      // See https://github.com/LearnBoost/socket.io/wiki/Rooms
      var rooms = this.io.sockets.manager.roomClients[socket.id];
      for (var room in rooms) {
        if (rooms.hasOwnProperty(room)) {
          // (2) Find the appropriate room (note: room names are internally always prefixed with a '/')..
          var prefixLength = 1 + GAME_ROOM_PREFIX.length;
          if (room.length === prefixLength + GAME_ID_LENGTH) {
            var gameId = room.slice(prefixLength);
            if (this.games[gameId]) {
              // (3) Remove the socket id from the internal "counters".
              removeSocketIdInList(this.games[gameId].player1List, socket.id);
              removeSocketIdInList(this.games[gameId].player2List, socket.id);
              this.emit('app.game.client.left', {gameId: gameId});
            }
            break;
          }
        }
      }
    }
  };

  /**
   * Remove all games (including clients) which are older than 24 hours.
   * Remove all clients of newer games which are older than one hour.
   */
  Backend.prototype.cleanGames = function() {
    var twentyFourHoursAgo = new Date().getTime() - (86400 * 1000);
    var gamesToRemove = [];

    this.log('info', 'Cleaning game data...');

    var gameId;
    for (gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var game = this.games[gameId];
        if (game.updated < twentyFourHoursAgo) {
          gamesToRemove.push(gameId);
        }
      }
    }
    for (var i = 0; i < gamesToRemove.length; i++) {
      gameId = gamesToRemove[i];
      this.games[gameId] = undefined;
    }
  };

  /**
   * Create a new game by the first player.
   * @param socket
   * @param options
   * @return {{}}
   */
  Backend.prototype.createGame = function(socket, options) {
    var game = {};

    game.id = Util.buildUUID(6 * GAME_ID_LENGTH);
    game.created = new Date().getTime();
    game.updated = new Date().getTime();
    game.state = GAME_STATES.INIT;
    game.player1 = Util.buildUUID(48); // 6 bytes
    game.player1Name = (options != null && options.playerName) ? options.playerName : false;
    game.player2 = Util.buildUUID(48); // 6 bytes
    game.player2Name = (options != null && options.playerOtherName) ? options.playerOtherName : false;
    game.player1List = [];
    game.player2List = [];
    game.player1Words = [];
    game.player2Words = [];
    game.player1Score = 0;
    game.player2Score = 0;
    game.gameMatrix = this.matrixUtil.createGameMatrix();
    game.stateMatrix = '2222222222222222222222222';
    game.activePlayer = 1;
    game.matrixConfig = cloneObject(this.matrixConfig);
    this.games[game.id] = game;

    if (socket) {
      this.registerClient(game.id, socket, CLIENT_TYPES.PLAYER_1);
    }

    this.syncData();

    return this.getGame(game.id);
  };

  Backend.prototype.findGameByPlayerId = function(playerId) {
    var gameId;
    for (gameId in this.games) {
      if (this.games.hasOwnProperty(gameId)) {
        var game = this.games[gameId];
        if (!game) {
          this.log('info', 'Somehow no game was found at this place.');
          return;
        }
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
   * @param socket
   * @param options
   * @return {{}}
   */
  Backend.prototype.joinGame = function(socket, options) {
    var gameData = this.findGameByPlayerId(options.playerId);
    if (!gameData) {
      if (socket) {
        socket.emit('createGameRequired');
      }
      return null;
    }
    var game = this.games[gameData.gameId];
    var playerNum = gameData.playerNum;

    if (options.playerName) {
      if (playerNum === 1) {
        game.player1Name = options.playerName;
      } else if (playerNum === 2) {
        game.player2Name = options.playerName;
      }
    }
    if (game.state === GAME_STATES.INIT) {
      game.state = GAME_STATES.CREATED;
    }
    game.updated = new Date().getTime();

    if (socket) {
      if (playerNum === 1) {
        this.registerClient(game.id, socket, CLIENT_TYPES.PLAYER_1);
      } else if (playerNum === 2) {
        this.registerClient(game.id, socket, CLIENT_TYPES.PLAYER_2);
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
      stateMatrix: game.stateMatrix,
      player1Words: game.player1Words,
      player2Words: game.player2Words,
      player1Score: game.player1Score,
      player2Score: game.player2Score,
      player1Available: game.player1List.length > 0,
      player2Available: game.player2List.length > 0,
      updated: game.updated,
      updatedAsAgo: timeago(new Date(game.updated)),
      activePlayer: game.activePlayer,
      state: game.state,
      matrixConfig: game.matrixConfig
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
    if (this.io) {
      var sockets, clonedData;
      if (clientType) {
        sockets = this.io.sockets.in(this.getGamePlayerRoomName(gameId, clientType));
      } else {
        sockets = this.io.sockets.in(this.getGameRoomName(gameId));
      }
      if (data.action) {
        var action = data.action;
        data.action = undefined;
        sockets.emit(action, data);
        if (this.backdoorEnabled) {
          clonedData = cloneObject(data);
          if (clonedData.game) {
            Internals.enrichWithAddresses(this, clonedData.game);
          }
          this.io.sockets.in('backdoor').emit(action, clonedData);
        }
      } else {
        sockets.emit('message', data);
        if (this.backdoorEnabled) {
          clonedData = cloneObject(data);
          if (clonedData.game) {
            Internals.enrichWithAddresses(this, clonedData.game);
          }
          this.io.sockets.in('backdoor').emit('message', clonedData);
        }
      }
    }
  };

  Backend.prototype.preMove = function(socket, data) {
    var game = this.games[data.gameId], positions = data.positions;
    if (!game) {
      this.log('info', 'Action "preMove" was performed without a valid game id.');
      return;
    }

    this.emit('app.game.player.preMoved', {gameId: game.id, socketId: socket.id, positions: positions});
  };

  Backend.prototype.restartGame = function(socket, data) {
    // get current game
    var oldGameId = data.gameId, playerNum = data.playerNum, newGame, playerName, playerOtherName;
    if (this.games[oldGameId]) {
      var oldGameData = this.games[oldGameId];
      if (playerNum === 1) { // FIXME #9
        playerName = oldGameData.player1Name;
        playerOtherName = oldGameData.player2Name;
      } else if (playerNum === 2) { // FIXME #9
        playerName = oldGameData.player2Name;
        playerOtherName = oldGameData.player1Name;
      }
      // create new game and trigger event
      newGame = this.createGame(false, {
        playerName: playerName,
        playerOtherName: playerOtherName
      });
      this.emit('app.game.player.restartedGame', {gameId: oldGameId, socketId: socket.id, newGame: newGame});
    }
  };

  Backend.prototype.move = function(socket, data) {
    var game = this.games[data.gameId], positions = data.positions;
    if (!game) {
      this.log('info', 'Action "move" was performed without a valid game id.');
      return;
    }

    var me = this,
      word = '',
      i,
      position,
      playerType = this.findPlayerTypeBySocketId(game.id, socket.id),
      wordPlayed = true,
      playerMoveValid = game.state !== GAME_STATES.FINISHED &&
        (
          (game.activePlayer === 1 && playerType === CLIENT_TYPES.PLAYER_1) ||
          (game.activePlayer === 2 && playerType === CLIENT_TYPES.PLAYER_2)
        );

    if (playerMoveValid) {
      // get word
      for (i = 0; i < positions.length; i++) {
        position = positions[i];
        word += game.gameMatrix[position];
      }

      if (Util.checkSearchDoesNotExistInWords(word, game.player1Words) && Util.checkSearchDoesNotExistInWords(word, game.player2Words)) {
        this.words.existWord(word).then(function() {
          var playerNum;
          if (playerType === CLIENT_TYPES.PLAYER_1) {
            game.player1Words.push(word);
            playerNum = 1;
            game.activePlayer = 2;
          } else if (playerType === CLIENT_TYPES.PLAYER_2) {
            game.player2Words.push(word);
            playerNum = 2;
            game.activePlayer = 1;
          }

          // Update deserialized game object.
          me.updateGameStats(game, playerType, positions);
          game.updated = new Date().getTime();

          me.syncData();
          me.emit('app.game.player.moved', {gameId: game.id, success: true, socketId: socket.id, word: word, playerNum: playerNum});
        }, function() {
          me.emit('app.game.player.moved', {gameId: game.id, success: false, socketId: socket.id, word: word, failureType: FAILURE_TYPES.WORD_INVALID});
        });
      } else {
        this.emit('app.game.player.moved', {gameId: game.id, success: false, socketId: socket.id, word: word, failureType: FAILURE_TYPES.WORD_ALREADY_PLAYED});
      }
    } else if (game.state === GAME_STATES.FINISHED) {
      this.emit('app.game.player.moved', {gameId: game.id, success: false, socketId: socket.id, word: word, failureType: FAILURE_TYPES.GAME_ALREADY_FINISHED});
    } else {
      this.emit('app.game.player.moved', {gameId: game.id, success: false, socketId: socket.id, word: word, failureType: FAILURE_TYPES.INVALID_MOVE});
    }
  };

  Backend.prototype.getGameRoomName = function(gameId) {
    return GAME_ROOM_PREFIX + gameId;
  };

  Backend.prototype.getGamePlayerRoomName = function(gameId, type) {
    return GAME_ROOM_PREFIX + gameId + '/' + type;
  };

  Backend.prototype.registerBackdoor = function(socket) {
    if (this.backdoorEnabled) {
      socket.join('backdoor');
      var games = [];
      for (var gameId in this.games) {
        if (this.games.hasOwnProperty(gameId)) {
          var game = cloneObject(this.getGame(gameId));
          Internals.enrichWithAddresses(this, game);
          games.push(game);
        }
      }
      socket.emit('backdoorRegistered', {games: games});
    }
  };

  var events = {
    onGameStateChanged: function(data) {
      var publicGame = this.getGame(data.gameId);
      this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.ALL_PLAYERS, {action: 'gameStateChanged', state: data.state, game: publicGame});
    },
    onPlayerPreMoved: function(data) {
      var publicGame = this.getGame(data.gameId);
      var playerType = this.findPlayerTypeBySocketId(data.gameId, data.socketId);
      if (playerType) {
        this.broadcastToGamePlayers(data.gameId, playerType, {action: 'playerPreMoved', game: publicGame, positions: data.positions});
      }
    },
    onPlayerMoved: function(data) {
      var publicGame = this.getGame(data.gameId);
      if (!data.success) {
        var playerType = this.findPlayerTypeBySocketId(data.gameId, data.socketId);
        var failureType = data.failureType || FAILURE_TYPES.INVALID_MOVE;
        this.broadcastToGamePlayers(data.gameId, playerType, {action: 'playerMoveDeclined', failureType: failureType});
      } else {
        this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.ALL_PLAYERS, {action: 'playerMoved', game: publicGame, word: data.word, playerNum: data.playerNum});
      }
    },
    onPlayerRestartedGame: function(data) {
      var publicGame = this.getGame(data.newGame.id);
      this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_1, {action: 'playerRestartedGame', game: publicGame, playerNum: 1});
      this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_2, {action: 'playerRestartedGame', game: publicGame, playerNum: 2});
    },
    onClientJoined: function(data) {
      var game = this.games[data.gameId], publicGame = this.getGame(game.id);
      if (game.state === GAME_STATES.INIT) {
        this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_1, {action: 'gameCreated', game: publicGame, playerNum: 1});
      } else {
        this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_1, {action: 'playerJoined', game: publicGame, playerNum: 1});
        this.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.PLAYER_2, {action: 'playerJoined', game: publicGame, playerNum: 2});
      }
    },
    onClientLeft: function(data) {
      var me = this, game, publicGame;
      game = this.games[data.gameId];
      publicGame = this.getGame(game.id);
      // Queue the event because SocketIO's internal store still have the socket.
      setTimeout(function() {
        me.broadcastToGamePlayers(data.gameId, CLIENT_TYPES.ALL_PLAYERS, {action: 'playerLeft', game: publicGame});
      }, 100);
    }
  };

  var Internals = {
    enrichWithAddresses: function(scope, game) {
      game.player1Addresses = Internals.getSocketAddresses(scope.io.sockets.clients(scope.getGamePlayerRoomName(game.id, CLIENT_TYPES.PLAYER_1)));
      game.player2Addresses = Internals.getSocketAddresses(scope.io.sockets.clients(scope.getGamePlayerRoomName(game.id, CLIENT_TYPES.PLAYER_2)));
    },
    getSocketAddresses: function(sockets) {
      var clients = [];
      for (var i = 0, c = sockets.length; i < c; i++) {
        var client = Internals.extractClientSocketAddress(sockets[i]);
        if (client) {
          clients.push(client);
        }
      }
      return clients;
    },
    extractClientSocketAddress: function(socket) {
      if (socket) {
        return socket.handshake.address.address + ':' + socket.handshake.address.port;
      }
    }
  };

  return Backend;
})();

module.exports = Backend;
