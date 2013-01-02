var Letternode = (function() {
  function Letternode() {
    // current game session
    this.game = {};
    this.playerNum = 0;
    this.socket = io.connect();
  }

  Letternode.prototype.run = function() {
    this.socketBinds();
    this.initialize();
  };

  Letternode.prototype.socketBinds = function() {
    var me = this;
    this.socket.on('gameCreated', function(data) {
      me.game = data.game;
      me.playerNum = data.playerNum;
      history.pushState({gameId: me.game.id}, 'Game [' + me.game.id + '/' + me.game.player1 + ']', '/game/' + me.game.player1);
      prompt('Send this URL to second player:', 'http://localhost:8000/game/' + me.game.player2);
      console.info('Game ID: ' + me.game.id);
      me.updateUi();
    });
    this.socket.on('playerJoined', function(data) {
      me.game = data.game;
      me.playerNum = data.playerNum;
      console.info('Action: ' + 'playerJoined', data);
      me.updateUi();
    });
    this.socket.on('playerLeft', function(data) {
      me.game = data.game;
      console.info('Action: ' + 'playerLeft', me.game);
      me.updateUi();
    });
    this.socket.on('createGameRequired', function(data) {
      me.createGame()
      console.info('Action: ' + 'createGameRequired');
    });
  };

  Letternode.prototype.updateUi = function() {
    $('.player1Name span').text(this.game.player1Name);
    $('.player2Name span').text(this.game.player2Name);
  };

  Letternode.prototype.initialize = function() {
    // detect whether a game must be created or resumed
    if (!this.resumeGame()) {
      this.createGame();
    }
  };

  Letternode.prototype.resumeGame = function() {
    var urlParts = location.href.split('/');
    var gameId = urlParts[urlParts.length - 1] === 'game' ? false : urlParts[urlParts.length - 1];
    console.info('GameID found: ' + gameId);
    if (gameId) {
      this.joinGame(gameId);
      return true;
    }
    return false;
  };

  Letternode.prototype.createGame = function() {
    var playerName = $('#playername').val();
    this.socket.emit('createGame', {playerName: playerName});
  };

  Letternode.prototype.joinGame = function(playerId) {
    var playerName = $('#playername').val();
    this.socket.emit('joinGame', {playerName: playerName, playerId: playerId});
  };

  return Letternode;
})();

$(document).ready(function() {
  var letternode = new Letternode();

  $('#joingame').click(function(event) {
    event.preventDefault();
    letternode.run();
  })
});