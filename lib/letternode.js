"use strict";

var pad = require('pad'), 
    dateFormat = require('dateformat'), 
    fs = require('fs'), 
    config = null,
    backend = null;

// Test Logging
var installLogger = function() {
  if (!backend) { return; }
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
};

module.exports.configure = function(profile) {
  config = new (require('configgles'))(__dirname + '/../config/base.yaml', profile || '');
  if (config && config.gameSpec) {
    console.log('Configuration profile ' + profile + ' loaded.');
    // It seems that a valid configuration could be found.
    backend = new (require('./backend'))(config);
    module.exports.backend = backend;
    module.exports.config = config;
    installLogger();
    return true;
  } else {
    console.error('No valid configuration file or profile at ' + __dirname + '/../config/base.yaml with profile ' + profile + ' found.');
  }
  return false;
};

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

