"use strict";

var express = require('express'),
    http = require('http'),
    main = require('./letternode'),
    app = express(),
    server = http.createServer(app),
    MemoryStore = express.session.MemoryStore;

main.configure(process.env.LETTERNODE_PROFILE);
if (!main.backend) {
  // If no backend is defined, it seems that an internal misconfiguration had happened.
  console.error('Please check your configuration.');
  return -1;
}

var port = (main.config.server.port);

app.configure(function() {
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.errorHandler());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/../static')); 
  app.use(app.router);
  main.routes(app);
    
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'akjdajkdjknwndw',
    store: new MemoryStore({
      reapInterval: 60000 * 10
    })
  }));

  main.sockets(require('socket.io').listen(server));
});

server.listen(port, function() {
  console.log('Server started ' + port);
});