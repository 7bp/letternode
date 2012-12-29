var server = require('./server'),
    api = require('./api');

server.start(api.api);