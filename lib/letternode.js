"use strict";

var Backend = require('./backend'), pad = require('pad'), dateFormat = require('dateformat'), fs = require('fs');

var MATRIX_CONFIGURATION = {
  FIVE_X_FIVE: {
    ID: '5x5',
    ROWS: 5,
    COLUMNS_PER_ROW: 5
  }
};

var backend = new Backend(__dirname + '/../games.json', MATRIX_CONFIGURATION.FIVE_X_FIVE, true);

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
  var servedHtmlFiles = ['game', 'backdoor'], onRoute = function(servedHtmlFile) {
    app.get('/' + servedHtmlFile + '*', function(req, res) {
      fs.readFile(__dirname + '/../static/' + servedHtmlFile + '.html',
        function(err, data) {
          if (err) {
            res.writeHead(500);
            return res.end('Error loading ' + servedHtmlFile + '.html');
          }
          res.header('Content-Type', 'text/html');
          res.writeHead(200);
          res.end(data);
        }
      );
    });
  };
  for (var i = 0, c = servedHtmlFiles.length; i < c; i++) {
    onRoute(servedHtmlFiles[i]);
  }
};

module.exports.sockets = function(io) {
  backend.setSocketIO(io);
  io.sockets.on('connection', function(socket) {
    console.log('Client Connected');

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

    socket.on('restartGame', function(data) {
      backend.restartGame(socket, data);
    });

    socket.on('disconnect', function() {
      backend.deRegisterClient(socket);
    });

    socket.on('registerBackdoor', function() {
      backend.registerBackdoor(socket);
    });
  });
};

