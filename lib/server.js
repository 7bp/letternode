"use strict";

var express = require('express'),
    http = require('http'),
    main = require('./letternode'),
    port = (process.env.PORT || 8000),
    app = express(),
    server = http.createServer(app),
    MemoryStore = express.session.MemoryStore;
    
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
  console.log('Server started '+port);
});