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
    socket.on('server_message', function(data) {
      var action = data.action;
      if (action === 'gameCreated') {
        game = data.game;
        console.info('Game ID: ' + game.id);
      } else if (action === 'playerJoined') {
        game = data.game;
        console.info('Action: ' + action, game);
      } else {
        console.warn('Unknown action: ' + action);
      }
    });
    var form = $('#form');
    var game = null;
    form.submit(function(event) {
      event.preventDefault();
      var action = $('#action').val();
      var commands = {
        createGame: function() {
          socket.emit('message', {action: 'createGame', playerName: $('#playerName').val()});
        },
        joinGame: function() {
          socket.emit('message', {action: 'joinGame', playerName: $('#playerName').val(), gameId: $('#gameId').val()});
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