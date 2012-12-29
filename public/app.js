var app = {
  init: function() {
    console.log('init');
    this.ping();
  },
  
  ping: function() {
    $.get('api/game', function(response) {
      console.log(response);
    });
  }
};

app.init();