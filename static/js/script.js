/* Author: YOUR NAME HERE
*/

$(document).ready(function() {   

  var socket = io.connect();

  $('#sender').bind('click', function() {
    socket.emit('message', {word: [8, 12, 24], action: 'move'});     
    //socket.emit('message', {message: 'Message Sent on ' + new Date(), action: 'info'});         
  });

  socket.on('server_message', function(data){
  console.log(data);
    $('#receiver').append('<li>' + data.message + '</li>');  
  });
});