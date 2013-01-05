var Letternode = (function() {
  function Letternode($) {
    // current game session
    this.game = {};
    this.playerNum = 0;
    this.socket = io.connect();
    this.playerName = false;
  }

  Letternode.prototype.pinupPromptPlayerName = function() {
    $(document).avgrund({
      height: 140,
      openOnEvent: false,
      holderClass: 'avgrundCustom',
      showClose: false,
      enableStackAnimation: true,
      onBlurContainer: '#app',
      closeByEscape: false,
      closeByDocument: false,
      template: '<p><label for="playername">Player name: </label><input type="text" id="playername" value="Anonymous" />' +
      '<br />' +
      '<a href="" target="_blank" class="startGame" id="joingame">Continue</a></p>'
    });

    var me = this;
    $('#joingame').click(function(event) {
      event.preventDefault();
      $('body').unbind('keyup').unbind('click').removeClass('avgrund-active');
      me.joinGame(me.retrieveGameId(), $('#playername').val());
    });
  };    

  Letternode.prototype.pinupPlayer2Url = function(player2Id) {
    var domain = location.href.split('/')[2];
    var http = location.href.split('/')[0];
    var player2Url = http + '//' + domain + '/game/' + player2Id;
    $(document).avgrund({
  		height: 140,
  		openOnEvent: false,
  		holderClass: 'avgrundCustom',
  		showClose: true,
  		showCloseText: 'Close',
  		enableStackAnimation: true,
  		onBlurContainer: '#app',
  		closeByEscape: true,
    	closeByDocument: true,
  		template: '<p>Give the following url to the second player to allow joining this game.' +
  		'<br />' +
  		'<label for="player2url">URL for Player 2: </label><input type="text" id="player2url" onclick="this.select();" value="' + player2Url + '" />' +
  		'</p>'
  	});
  };

  Letternode.prototype.socketBinds = function() {
    var me = this;
    this.socket.on('gameCreated', function(data) {
      me.game = data.game;
      me.playerNum = data.playerNum;
      history.pushState({gameId: me.game.id}, 'Game [' + me.game.id + '/' + me.game.player1 + ']', '/game/' + me.game.player1);
      me.checkPlayers();
      console.info('Game ID: ' + me.game.id);
      me.updateUi();
    });
    this.socket.on('playerJoined', function(data) {
      me.game = data.game;
      me.playerNum = data.playerNum;
      me.checkPlayers();
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

  Letternode.prototype.checkPlayers = function() {
    if (
      (this.playerNum === 1 && !this.game.player1Name) ||
      (this.playerNum === 2 && !this.game.player2Name)
    ) {
      this.pinupPromptPlayerName();
    } else if (this.playerNum === 1 && !this.game.player2Available) {
      this.pinupPlayer2Url(this.game.player2);
    }
  };

  Letternode.prototype.updateUi = function() {
    if (this.game.player1Name) {
      $('.player1Name').text(this.game.player1Name);
    }
    if (this.game.player2Name) {
      $('.player2Name').text(this.game.player2Name);
    }

    if ($('#game a').length === 0) {
      var i;
      for (i = 0; i < this.game.gameMatrix.length; i++) {
        var status = this.game.stateMatrix[i];
        if (this.playerNum === 2) {
          status = Math.abs(status - 4);
        }
        $('#game').append('<a href="#" class="status' + status + '">' + this.game.gameMatrix[i] + '</a>');
      }
      this.bindGameEvents();
    }

    if ($('#letters a').length > 0) {
      $('#buttons .clear').stop().fadeIn('fast');
    } else {
      $('#buttons .clear').stop().fadeOut('fast');
    }

    if ($('#letters a').length > 1) {
      $('#buttons .submit').stop().fadeIn('fast');
    } else {
      $('#buttons .submit').stop().fadeOut('fast');
    }
  };

  Letternode.prototype.initialize = function() {
    this.socketBinds();
    // detect whether a game must be created or resumed
    if (!this.resumeGame()) {
      this.createGame();
    }
  };

  Letternode.prototype.retrieveGameId = function() {
    var urlParts = location.href.split('/');
    return urlParts[urlParts.length - 1] === 'game' ? false : urlParts[urlParts.length - 1].replace('#', '');
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
    this.socket.emit('createGame');
  };

  Letternode.prototype.joinGame = function(playerId, playerName) {
    if (typeof playerName != 'undefined') {
      this.socket.emit('joinGame', {playerName: playerName, playerId: playerId});
    } else {
      this.socket.emit('joinGame', {playerId: playerId});
    }
  };

  Letternode.prototype.bindGameEvents = function() {
    $('#game a').hammer().bind('tap', function(event) {
      event.preventDefault();
      alert($(this).text() + ' tapped');
    });
  };

  return Letternode;
})();

$(document).ready(function() {
  var letternode = new Letternode($);
  letternode.initialize();
});