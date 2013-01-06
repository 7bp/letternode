var Backdoor = (function($) {

  function Backdoor() {
    this.games = [];
    this.socket = io.connect();
  }

  Backdoor.prototype.initialize = function() {
    this.socket.emit('registerBackdoor', {});
    this.socket.on('backdoorRegistered', events.onBackdoorRegistered.bind(this));
    this.socket.on('gameCreated', events.onMessage.bind(this));
    this.socket.on('playerJoined', events.onMessage.bind(this));
    this.socket.on('playerLeft', events.onMessage.bind(this));
    this.socket.on('playerMoved', events.onMessage.bind(this));
    this.socket.on('playerPreMoved', events.onMessage.bind(this));
  };

  var createGameElement = function(id, game) {
    var element = $('<div id="" class="game"><div class="id"></div></div>');
    element.attr('id', id);
    element.find('div.id').text(game.id);
    element.append($('<div class="players"><div class="player1"><div class="name"></div><div class="score"></div><div class="id"></div><ol class="words"></ol></div><span>vs.</span><div class="player2"><div class="name"></div><div class="score"></div><div class="id"></div><ol class="words"></ol></div></div>'));
    element.append($('<div class="lastChange"></div>'));
    element.append($('<div class="currentWord"></div>'));
    element.append($('<div class="matrix"></div>'));

    var matrix = element.find('.matrix');
    for (var x = 0, y; x < 5; x++) {
      for (y = 0; y < 5; y++) {
        var cellCls = 'cell-' + x + '_' + y, idxCls = 'idx-' + ((x * 5) + y);
        var cell = $('<div class="cell ' + cellCls + ' ' + idxCls + '"></div>');
        cell.text(game.gameMatrix[(x * 5) + y]);
        matrix.append(cell);
      }
    }

    return element;
  };

  Backdoor.prototype.renderGame = function(data) {
    console.log(data);
    var game = data.game;
    if (!game.id) {
      return;
    }

    var gameElementId = 'game_' + game.id, gameElement = $('#' + gameElementId), i, c, x, y;
    if (!gameElement.length) {
      gameElement = createGameElement(gameElementId, game);
      $('#app').prepend(gameElement);
    }

    gameElement.find('.player1 .id').text(game.player1);
    gameElement.find('.player1 .name').text(game.player1Name + ' (' + game.player1Addresses.length + ')').attr('title', 'Addresses: ' + game.player1Addresses.join(', '));
    gameElement.find('.player1 .score').text(game.player1Score);
    gameElement.find('.player2 .id').text(game.player2);
    gameElement.find('.player2 .name').text(game.player2Name + ' (' + game.player2Addresses.length + ')').attr('title', 'Addresses: ' + game.player2Addresses.join(', '));
    gameElement.find('.player2 .score').text(game.player2Score);
    gameElement.find('.lastChange').text(game.updatedAsAgo).attr('title', new Date(game.updated).toString());

    var gameMatrix = gameElement.find('.matrix');
    for (i = 0; i < 25; i++) {
      var idxCls = 'idx-' + i, state = game.stateMatrix[i];
      var $cell = gameMatrix.find('.' + idxCls);
      $cell
        .removeClass('status0')
        .removeClass('status1')
        .removeClass('status2')
        .removeClass('status3')
        .removeClass('status4')
        .addClass('status' + state);
    }

    gameMatrix.find('.cell').removeClass('selected');
    if (data.positions) {
      var word = '';
      for (i = 0, c = data.positions.length; i < c; i++) {
        var position = parseInt(data.positions[i]);
        gameMatrix.find('.idx-' + position).addClass('selected');
        word += game.gameMatrix[position];
      }
      gameElement.find('.currentWord').text(word);
    }

    if (game.activePlayer == 1) {
      gameElement.find('.player1').addClass('active');
      gameElement.find('.player2').removeClass('active');
    } else {
      gameElement.find('.player1').removeClass('active');
      gameElement.find('.player2').addClass('active');
    }

    if (game.player1Words) {
      gameElement.find('.player1 .words').find('li').remove();
      for (i = 0, c = game.player1Words.length; i < c; i++) {
        gameElement.find('.player1 .words').append($('<li>').text(game.player1Words[i]));
      }
    }

    if (game.player2Words) {
      gameElement.find('.player2 .words').find('li').remove();
      for (i = 0, c = game.player2Words.length; i < c; i++) {
        gameElement.find('.player2 .words').append($('<li>').text(game.player2Words[i]));
      }
    }
  };

  var events = {

    onBackdoorRegistered: function(data) {
      if (data.games) {
        for (var i = 0, c = data.games.length; i < c; i++) {
          this.renderGame({game: data.games[i]});
        }
      }
    },

    onMessage: function(data) {
      this.renderGame(data);
    }
  };

  return Backdoor;

})
  ($);

$(document).ready(function() {
  new Backdoor($).initialize();
});