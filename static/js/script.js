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
    socket.on('gameCreated', function(data) {
      game = data.game;
      $('#gameId').val(game.player2);
      console.log(data);
      console.info('Game ID: ' + game.id + 'Player 2 ID: ' + game.player2);
    });
    socket.on('playerJoined', function(data) {
      game = data.game;
      console.log(data);
      console.info('Action: ' + 'playerJoined', game);
    });
    socket.on('playerLeft', function(data) {
      game = data.game;
      console.log(data);
      console.info('Action: ' + 'playerLeft', game);
    });
    socket.on('server_message', function(data) {
      game = data.game;
      console.log(data);
    });
    var form = $('#form');
    var game = null;
    form.submit(function(event) {
      event.preventDefault();
      var action = $('#action').val();
      var commands = {
        createGame: function() {
          socket.emit('createGame', {playerName: $('#playerName').val()});
        },
        joinGame: function() {
          socket.emit('joinGame', {playerName: $('#playerName').val(), playerId: $('#gameId').val()});
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