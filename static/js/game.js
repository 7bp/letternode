var Letternode = (function() {
  function Letternode($) {
    // current game session
    this.game = {};
    this.playerNum = 0;
    this.socket = io.connect();
    this.playerName = 'Anonymous';
    this.pinupStart();
  }

  Letternode.prototype.pinupStart = function() {
    var template;
    var buttonText;
    if (this.retrieveGameId() !== false) {
      template = 'Click "Continue" to resume your running game.';
      buttonText = 'Continue';
    } else {
      template = 'Click "Start new game" to create a new game.';
      buttonText = 'Start new game';
    }

    $(document).avgrund({
  		height: 200,
  		openOnEvent: false,
  		holderClass: 'avgrundCustom',
  		showClose: false,
  		enableStackAnimation: true,
  		onBlurContainer: '#app',
  		closeByEscape: false,
    	closeByDocument: false,
  		template: '<p><strong>Welcome to Letternode!</strong><br />' +
  		template +
  		'<br />' +
  		'<br />' +
  		'<label for="playername">Player name: </label><input type="text" id="playername" value="Anonymous" />' +
  		'</p>' +
  		'<div>' +
  		'<a href="" target="_blank" class="startGame" id="joingame">' +
  		buttonText +
  		'</a>' +
  		'</div>'
  	});
  };

  Letternode.prototype.pinupPlayer2Url = function(player2Id) {
    $(document).avgrund({
  		height: 150,
  		openOnEvent: false,
  		holderClass: 'avgrundCustom',
  		showClose: true,
  		showCloseText: 'Close',
  		enableStackAnimation: true,
  		onBlurContainer: '#app',
  		closeByEscape: true,
    	closeByDocument: true,
  		template: '<p><strong>Welcome to Letternode!</strong><br />' +
  		'Give the following url to the second player to allow joining this game.' +
  		'<br />' +
  		'<br />' +
  		'<label for="player2url">URL for Player 2: </label><input type="text" id="player2url" value="http://localhost:8000/game/' + player2Id + '" />' +
  		'</p>'
  	});
  };

  Letternode.prototype.run = function(playerName) {
    this.playerName = playerName;
    this.socketBinds();
    this.initialize();
  };

  Letternode.prototype.socketBinds = function() {
    var me = this;
    this.socket.on('gameCreated', function(data) {
      me.game = data.game;
      me.playerNum = data.playerNum;
      history.pushState({gameId: me.game.id}, 'Game [' + me.game.id + '/' + me.game.player1 + ']', '/game/' + me.game.player1);
      me.pinupPlayer2Url(me.game.player2);
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

    if ($('#game a').length === 0) {
      var i;
      for (i = 0; i < this.game.gameMatrix.length; i++) {
        var status = this.game.stateMatrix[i];
        if (this.playerNum === 2) {
          status = Math.abs(status - 4);
        }
        $('#game').append('<a href="#" class="status' + status + '">' + this.game.gameMatrix[i] + '</a>');
      }
    }
  };

  Letternode.prototype.initialize = function() {
    // detect whether a game must be created or resumed
    if (!this.resumeGame()) {
      this.createGame();
    }
  };

  Letternode.prototype.retrieveGameId = function() {
    var urlParts = location.href.split('/');
    return urlParts[urlParts.length - 1] === 'game' ? false : urlParts[urlParts.length - 1];
  };

  Letternode.prototype.resumeGame = function() {
    var gameId = this.retrieveGameId();
    console.info('GameID found: ' + gameId);
    if (gameId) {
      this.joinGame(gameId);
      return true;
    }
    return false;
  };

  Letternode.prototype.createGame = function() {
    this.socket.emit('createGame', {playerName: this.playerName});
  };

  Letternode.prototype.joinGame = function(playerId) {
    this.socket.emit('joinGame', {playerName: this.playerName, playerId: playerId});
  };

  return Letternode;
})();

$(document).ready(function() {
  var letternode = new Letternode($);

  $('#joingame').click(function(event) {
    event.preventDefault();
    $('body').unbind('keyup').unbind('click').removeClass('avgrund-active');
    letternode.run($('#playername').val());
  })
});