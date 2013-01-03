/* Author: YOUR NAME HERE
 */

$(document).ready(function() {

  var socket = io.connect();

  $('#sender').bind('click', function() {
    //socket.emit('message', {word: [8, 12, 24], action: 'move'});
    // socket.emit('message', {action: 'createGame', playerName: 'Jan'});
    //socket.emit('message', {message: 'Message Sent on ' + new Date(), action: 'info'});         
  });

  socket.on('server_message', function(data) {
    console.log(data);
    $('#receiver').append('<li>' + data.message + '</li>');
  });

  // Debugging
  (function() {
    var stateMatrix = $('#stateMatrix'), convertMatrixArrayToPrint = function(input) {
      var result = '';
      for (var i = 0, c = input.length; i < c; i += 5) {
        result += input.slice(i, i + 5).join(' ');
        result += '\n';
      }
      return result;
    }, convertMatrixStringToPrint = function(input) {
      var result = '';
      for (var i = 0, c = input.length; i < c; i += 5) {
        result += input.substring(i, 5);
        result += '\n';
      }
      return result;
    };
    socket.on('gameCreated', function(data) {
      game = data.game || {};
      $('#gameId').val(game.player2);
      console.log(data);
      console.info('Game ID: ' + game.id + 'Player 2 ID: ' + game.player2);
    });
    socket.on('playerJoined', function(data) {
      game = data.game || {};
      console.log(data);
      console.info('Action: ' + 'playerJoined', game);
    });
    socket.on('playerLeft', function(data) {
      game = data.game || {};
      console.log(data);
      console.info('Action: ' + 'playerLeft', game);
    });
    socket.on('server_message', function(data) {
      game = data.game || {};
      console.log(data);
    });
    socket.on('playerPreMoved', function(data) {
      game = data.game || {};
      stateMatrix.text(convertMatrixArrayToPrint(data.stateMatrix));
      console.log('PreMove from this player group: ', data);
    });
    socket.on('playerMoved', function(data) {
      game = data.game || {};
      stateMatrix.text(convertMatrixArrayToPrint(data.stateMatrix));
      console.log('Move from any player: ', data);
    });
    var form = $('#form');
    var game = null;
    $('form button').click(function(event) {
      var $this = $(this);
      event.preventDefault();
      var action = $this.attr('id');
      var commands = {
        createGame: function() {
          socket.emit('createGame', {playerName: $('#playerName').val()});
        },
        joinGame: function() {
          socket.emit('joinGame', {playerName: $('#playerName').val(), playerId: $('#gameId').val()});
        },
        move: function() {
          socket.emit('move', {gameId: game.id, playerName: $('#playerName').val(), word: $('#gameId').val()});
        },
        preMove: function() {
          socket.emit('preMove', {gameId: game.id, playerName: $('#playerName').val(), word: $('#gameId').val()});
        }
      };

      if (commands[action]) {
        commands[action]();
      } else {
        console.warn('Invalid action.');
      }
    });
  })();
});