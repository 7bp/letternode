var Letternode = (function() {
  function Letternode($) {
    // current game session
    this.game = {};
    this.playerNum = 0;
    this.socket = io.connect();
    this.playerName = false;
  }

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
    $('#joingame').bind('click', function(event) {
      event.preventDefault();
      $('body').removeClass('avgrund-active');
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

  Letternode.prototype.info = function(message) {
    $('#gameMessage').text(message);
  };

  Letternode.prototype.socketBinds = function() {
    var me = this;
    this.socket.on('gameCreated', function(data) {
      events.onGameCreated.call(me, data);
    });
    this.socket.on('playerJoined', function(data) {
      events.onPlayerJoined.call(me, data);
    });
    this.socket.on('playerLeft', function(data) {
      events.onPlayerLeft.call(me, data);
    });
    this.socket.on('createGameRequired', function(data) {
      events.onCreateGameRequired.call(me, data);
    });
    this.socket.on('playerMoved', function(data) {
      events.onPlayerMoved.call(me, data);
    });
    this.socket.on('playerPreMoved', function(data) {
      events.onPlayerPreMoved.call(me, data);
    });
    this.socket.on('playerMoveDeclined', function(data) {
      events.onPlayerMoveDeclined.call(me, data);
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
      $('.player1Name .name').text(this.game.player1Name);
      $('.player1Name .status').addClass('available' + (this.game.player1Available ? '1' : '0'));
    }
    if (this.game.player2Name) {
      $('.player2Name .status').addClass('available' + (this.game.player2Available ? '1' : '0'));
      $('.player2Name .name').text(this.game.player2Name);
    }
    if (this.game.player1Score) {
      $('.player1Score').text(this.game.player1Score);
    }
    if (this.game.player2Score) {
      $('.player2Score').text(this.game.player2Score);
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
    } else {
      var i;
      for (i = 0; i < this.game.gameMatrix.length; i++) {
        var status = this.game.stateMatrix[i];
        if (this.playerNum === 2) {
          status = Math.abs(status - 4);
        }
        $('#game a').eq(i)
          .removeClass('status0')
          .removeClass('status1')
          .removeClass('status2')
          .removeClass('status3')
          .removeClass('status4')
          .addClass('status' + status);
        $('#word a[data-position="' + i + '"]')
          .removeClass('status0')
          .removeClass('status1')
          .removeClass('status2')
          .removeClass('status3')
          .removeClass('status4')
          .addClass('status' + status);
      }
    }

    if ($('#word a').length > 0) {
      $('#buttons .clear').stop().fadeIn('fast');
    } else {
      $('#buttons .clear').stop().fadeOut('fast');
    }

    if ($('#word a').length > 1) {
      $('#buttons .submit').stop().fadeIn('fast');
    } else {
      $('#buttons .submit').stop().fadeOut('fast');
    }
  };

  Letternode.prototype.selectLetter = function(position) {
    var me = this;
    var clonedLetter = $('#game a').eq(position).clone();
    $(clonedLetter)
      .attr('data-position', position)
      .hammer()
      .unbind('tap').bind('tap', function(event) {
        // deselect
        event.preventDefault();
        var position = $(this).attr('data-position');
        me.deselectLetter(this);
        $('#game a').eq(position).removeClass('selected');
      });
    $('#word').stop().animate({ width: 50 * ($('#word a').length + 1) }, 'fast', function() {
      $('#word').append(clonedLetter);
      me.fader($('#game a').eq(position), clonedLetter);
      me.preMove();
    });
    this.updateUi();
  };

  Letternode.prototype.deselectLetter = function(letter) {
    var me = this;
    $(letter).transition({
      opacity: 0,
      scale: 1.6
    }, 200, function() {
      $(letter).remove();
      $('#word').stop().animate({ width: 50 * $('#word a').length });
      me.preMove();
      me.updateUi();
    });
  };

  Letternode.prototype.bindGameEvents = function() {
    var me = this;
    // select letter for word
    $('#game a').hammer().bind('tap', function(event) {
      event.preventDefault();
      if (!$(this).hasClass('selected')) {
        $(this).addClass('selected');
        me.selectLetter($(this).index('#game a'));
      }
    });
    $('#buttons .clear').hammer().bind('tap', function(event) {
      me.clearSelectedLetters();
    });
    $('#buttons .submit').hammer().bind('tap', function(event) {
      me.move();
    });
  };

  Letternode.prototype.clearSelectedLetters = function() {
    var me = this;
    $('#word a').transition({
      opacity: 0,
      scale: 1.6
    }, 200, function() {
      $('#word a').remove();
      $('#word').stop().animate({ width: 0 });
      $('#game a').removeClass('selected');
    });
    setTimeout(function() {
      me.preMove();
      me.updateUi();
    }, 250);
  };

  Letternode.prototype.selectedWord = function() {
    var result = [];
    $('#word a').each(function() {
      result.push($(this).attr('data-position'));
    });
    return result;
  };

  Letternode.prototype.translateWordPositions = function(positions) {
    var result = '';
    $.each(positions, function(i) {
      result += $('#game a').eq(i).text();
    });
    return result;
  };

  /**
  * Shakes UI element(s) e.g. when move is declined on server side
  */
  Letternode.prototype.shake = function(elements) {
    $(elements)
      .transition({ rotate: '2deg', x: -2 }, 50)
      .transition({ rotate: '-2deg', x: 2 }, 50)
      .transition({ rotate: '2deg', x: -2 }, 50)
      .transition({ rotate: '-2deg', x: 2 }, 50)
      .transition({ rotate: '0deg', x: 0 }, 50);
  };

  /**
  * Animates a shader to move from origin position to target position e.g. when selecting a letter
  */
  Letternode.prototype.fader = function(origin, target) {
    var fader = $('<a>');
    fader
      .appendTo('body')
      .attr('class', $(origin).attr('class'))
      .addClass('fader')
      .text($(origin).text());
    $(target).css({ opacity: 0 });
    // todo colorize with status class like origin
    fader
      .css({
        left: $(origin).offset().left,
        top: $(origin).offset().top,
        width: $(origin).css('width'),
        height: $(origin).css('height')
      })
      .transition({
        left: $(target).offset().left,
        top: $(target).offset().top,
        width: $(target).css('width'),
        height: $(target).css('height'),
      }, function() {
        $(target).css({ opacity: 1.0 });
        $(fader).remove();
      });
  };

  Letternode.prototype.checkPreMove = function(positions) {
    var me = this;
    if (this.selectedWord() != positions) {
      $('#word a').remove();
      $('#game a').removeClass('selected');
      $.each(positions, function(key) {
        var clonedLetter = $('#game a').eq(this).clone();
        $('#game a').eq(this).addClass('selected');
        $(clonedLetter)
          .attr('data-position', this)
          .hammer()
          .unbind('tap').bind('tap', function(event) {
            // deselect
            event.preventDefault();
            var position = $(this).attr('data-position');
            me.deselectLetter(this);
            $('#game a').eq(position).removeClass('selected');
          });
        $('#word').css({ width: 50 * ($('#word a').length + 1) });
        $('#word').append(clonedLetter);
      });
      this.updateUi();
    }
  };

  Letternode.prototype.preMove = function() {
    this.socket.emit('preMove', {gameId: this.game.id, positions: this.selectedWord()});
  };

  Letternode.prototype.move = function() {
    this.socket.emit('move', {gameId: this.game.id, positions: this.selectedWord()});
  };

  Letternode.prototype.winnerCheck = function() {
    if (this.game.state === 'FINISHED') {
    var winnerName = 'Nobody';
      if (this.game.player1Score > this.game.player2Score) {
        winnerName = this.game.player1Name;
      } else if (this.game.player2Score > this.game.player1Score) {
        winnerName = this.game.player2Name;
      }
      this.info('Game Over! Score is ' + this.game.player1Score + ' vs ' + this.game.player2Score + '. ' + winnerName + ' has won the game!');
    }
  };

  var events = {
    onGameCreated: function(data) {
      this.game = data.game;
      this.playerNum = data.playerNum;
      history.pushState({gameId: this.game.id}, 'Game [' + this.game.id + '/' + this.game.player1 + ']', '/game/' + this.game.player1);
      this.checkPlayers();
      this.updateUi();
      console.info('Action: gameCreated', data);
    },
    onPlayerJoined: function(data) {
      this.game = data.game;
      this.playerNum = data.playerNum;
      if (this.game.activePlayer === this.playerNum) {
        $('#gameMessage').text('It\'s your turn!');
      }
      this.winnerCheck();
      this.checkPlayers();
      this.updateUi();
      console.info('Action: playerJoined', data);
    },
    onPlayerLeft: function(data) {
      this.game = data.game;
      this.updateUi();
      console.info('Action: playerLeft', data);
    },
    onCreateGameRequired: function(data) {
      this.createGame()
      console.info('Action: createGameRequired');
    },
    onPlayerMoved: function(data) {
      this.game = data.game;
      if (data.playerNum === this.playerNum) {
        this.clearSelectedLetters();
        $('#gameMessage').text('');
      } else {
        $('#gameMessage').text('It\'s your turn!');
      }
      this.updateUi();
      this.winnerCheck();
      console.info('Action: playerMoved', data);
    },
    onPlayerPreMoved: function(data) {
      this.checkPreMove(data.positions);
      console.info('Action: playerPreMoved', data);
    },
    onPlayerMoveDeclined: function(data) {
      this.shake('#buttons .submit, #word');
      switch (data.failureType) {
        case 'invalid_move':
          this.info('It\'s not your turn!');
          break;
        case 'word_already_played':
          this.info('The word has already been played or is a prefix of an already played word.');
          break;
        case 'word_invalid':
          this.info('The word is invalid.');
          break;
        case 'game_already_finished':
          this.winnerCheck();
          break;
      }
      console.info('Action: playerMoveDeclined');
    }
  };

  return Letternode;
})();

$(document).ready(function() {
  var letternode = new Letternode($);
  letternode.initialize();
});