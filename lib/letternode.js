"use strict";

var Backend = require('./backend');

var backend = new Backend(__dirname + '/../games.json');

// Test Logging
backend.getEmitter().on('app.init.*', function(data) {
  console.log('Games initialized: ', data.games);
});

module.exports.routes = function(app) {
  app.get('/game', function(req, res) {
    var game = backend.createGame({});
    res.redirect('/game/' + game.id);
  });

  app.get('/game/:id', function(req, res) {
    var game = backend.getGame(req.params.id, res);
    if (game) {
      res.send(200, game);
    } else {
      res.send(404, "Game not found.");
    }
  });
};

module.exports.sockets = function(io) {
  io.sockets.on('connection', function(socket) {
    console.log('Client Connected');

    //socket.join(game.id);

    socket.on('message', function(data) {
      //socket.broadcast.emit('server_message', data);
      backend.dispatchMessage(socket, data);
    });

    socket.on('disconnect', function() {
      console.log('Client Disconnected.');
      backend.deregisterClient(socket);
    });

    //socket.broadcast.to(game.id).emit('server_message', {message: 'Player joined [' + game.id + ']', action: 'join'});
  });
};

