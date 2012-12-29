var http = require('http'),
    util = require('util');
    static = require('node-static'),
    webroot = './public',
    port = 8888;

var file = new(static.Server)(webroot, {
  cache: 600,
  headers: { 'X-Powered-By': 'node-static' }
});

function start(api) {
  function onRequest(request, response) {    
    request.addListener('end', function() {
      if (request.url.substring(0, 5) == '/api/') {
        response.writeHead(200, {'Content-Type': 'text/javascript'});
        response.write(api(request.url.substring(5)));
        response.end();
      } else {
        file.serve(request, response, function(err, result) {
          if (err) {
            console.error('Error serving %s - %s', request.url, err.message);
            if (err.status === 404 || err.status === 500) {
              file.serveFile(util.format('/%d.html', err.status), err.status, {}, request, response);
            } else {
              response.writeHead(err.status, err.headers);
              response.end();
            }
          } else {
            console.log('%s - %s', request.url, response.message);
          }
        });
      }
    });
  }

  http.createServer(onRequest).listen(port);
  console.log('Letternode started on port '+port);
}

exports.start = start;