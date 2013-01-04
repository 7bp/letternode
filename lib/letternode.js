"use strict";

var Backend = require('./backend'), pad = require('pad'), dateFormat = require('dateformat'), fs = require('fs');

var backend = new Backend(__dirname + '/../games.json');

// Test Logging
(function() {
  var maxLevelSize = 0;
  backend.getEmitter().on('logger.*', function(data) {
    if (data.level) {
      maxLevelSize = Math.max(maxLevelSize, data.level.length);
    }
    var prefix = '[' + dateFormat(data.timestamp) + ']' + ' ' + '[' + pad(data.level.toUpperCase(), maxLevelSize) + ']';
    if (data.message && typeof data.message === 'string') {
      console.log(prefix + ' - ' + data.message);
    } else {
      console.log(prefix, data.message);
    }
  });
})();

module.exports.routes = function(app) {
  app.get('/game*', function(req, res) {
    fs.readFile(
      __dirname + '/../static/game.html',
      function(err, data) {
        if (err) {
          res.writeHead(500);
          return res.end('Error loading game.html');
        }
        res.header('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(data);
      }
    );
  });
};

module.exports.sockets = function(io) {
  backend.setSocketIO(io);
  io.sockets.on('connection', function(socket) {
    console.log('Client Connected');

    //socket.join(game.id);

    socket.on('message', function(data) {
      //socket.broadcast.emit('server_message', data);
      backend.dispatchMessage(socket, data);
    });

    socket.on('createGame', function(data) {
      backend.createGame(socket, data);
    });

    socket.on('joinGame', function(data) {
      backend.joinGame(socket, data);
    });

    socket.on('preMove', function(data) {
      backend.preMove(socket, data);
    });

    socket.on('move', function(data) {
      backend.move(socket, data);
    });

    socket.on('disconnect', function() {
      backend.deRegisterClient(socket);
    });

    //socket.broadcast.to(game.id).emit('server_message', {message: 'Player joined [' + game.id + ']', action: 'join'});
  });
};

