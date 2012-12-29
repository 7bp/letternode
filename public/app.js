var letterrun = {
  gameId: 0,
  userId: 0,
  userName: 'anonymous',
  app: $('.app'),
  game: $('.game'),
  word: $('.word'),  
  letters: $('.letters'),
  buttonReset: $('button.clear').hide(),
  buttonSubmit: $('button.submit').hide(),  
  wordsLeft: $('.leftWords'),
  wordsRight: $('.rightWords'),
  left: $('.left'),
  right: $('.right'),
  leftScore: $('.leftScore'),
  rightScore: $('.rightScore'),
  player: 1,
  freeze: false,
  focus: true,
  
  apiUrl: function(action) {
    return '/api/'+action;
  },
  
  init: function() {
    var _this = this;
    this.buttonReset.click(function(e) {
      e.preventDefault();
      if (_this.freeze) { return; }
      $('a', _this.letters).each(function(i) {
        $(this).delay(i * 50).trigger('click');
      });
      _this.buttonReset.fadeOut();
      _this.buttonSubmit.fadeOut();
    });
    
    this.buttonSubmit.click(function(e) {
      e.preventDefault();
      if ($('a', _this.letters).length <= 0 || _this.freeze) {
        return;
      }
      var word = _this.selected();
      _this.loader(true);
      $.post(_this.apiUrl('submit'), {positions: word}, function(data) {
        if (typeof data.field != "undefined") {
          _this.wordPlayed(data.word, _this.player);
          _this.update(data.field);
          if (data.check == true) {
            _this.finish(data);     
          } else {
            $('a', _this.game).removeClass('picked');
            _this.wait();
          }
        }
        _this.loader(false);
      }, 'json');
    });
    
    $(window).focus(function() {
      if (!_this.focus) _this.focus = true;
    });

    $(window).blur(function() {
      _this.focus = false;
    });
    
    if (this.gameId != '' && this.gameId != '0') {
      // check for running game
      $.post(this.apiUrl('resume'), function(data) {
        if (data.length <= 0) {
          _this.create();
        } else {
          _this.gameId = data.id;
          _this.prepare(data.data);          
          $.each(data.words[0], function(itm) {
            _this.wordPlayed(this.toUpperCase(), 1);
          });          
          $.each(data.words[1], function(itm) {
            _this.wordPlayed(this.toUpperCase(), 2);
          });          
          _this.player = data.player;
          _this.title(data);
          if (data.status == 0 && data.player == 2) {
            if (_this.userName == 'anonymous') {
              _this.userName = prompt('Set your player name: ', _this.userName);
            }
            $.post(_this.apiUrl('join'), {gameId: _this.gameId, name: _this.userName, userId: _this.userId}, function(data) {
              _this.gameId = data.id;
              history.pushState({game:data.id}, "game:"+data.id, "/game/"+data.id);
            }, 'json');
          } else {
            _this.userName = data.your_name;
          }
          if (data.check == true) {
            _this.finish(data);
          } else if (data.active_player != _this.player) {
            alert('It\'s your opponents turn, please wait.');
            setTimeout(_this.wait, 2500);
          } else {
            //alert('It\'s your turn, '+$name+'!');
            _this.title(data, '[!]');
            _this.game.stop().animate({ opacity: 1.0 });
            _this.freeze = false;
          }
        }
      }, 'json');
    } else {
      _this.create(); // todo: resume game
    }
  },
  
  deselect: function(l) {
    var _this = this;
    var x = $('a', this.letters).length;
    var h = $('a').eq(0).outerHeight() + 6;
    var nw = (x - 1) * h;
    this.letters.animate({
      width: nw
    }, 'fast', function() {
      $(l).hide();
      $('a[data-pos="'+$(l).attr('data-pos')+'"]').removeClass('picked').animate({
        opacity: 1.0
      }, 'fast');
      $(l).remove();
      _this.recalculate();
    });  
    if (x <= 1) {
      this.buttonReset.fadeOut();
      this.buttonSubmit.fadeOut();
    }
  },
    
  select: function(l) {
    var _this = this;
    if ($(l).hasClass('picked')) {
      return;
    }
    this.buttonReset.fadeIn();
    this.buttonSubmit.fadeIn();
    $(l).addClass('picked');
    $(l).animate({ opacity: 0.1 });
    var m = $(l).clone();
    m.addClass('moved');
    m.css({
      top: $(l).offset().top-3,
      left: $(l).offset().left-3
    });
    m.appendTo(this.app);
    var x = $('a', this.letters).length;
    var h = $('a').eq(0).outerHeight() + 6;
    var nw = (x + 1) * h;
    this.letters.animate({
      width: nw
    }, 'fast', function() {
      m.animate({
        top: _this.letters.offset().top,
        left: _this.letters.offset().left + nw - h
      }, 'fast', function() {
        m.removeClass('moved')
        m.click(function(e) {
          e.preventDefault();
          _this.deselect(this);
        })
        _this.letters.append(m);
        _this.recalculate();
      });
    });    
  },
    
  prepare: function(data) {
    var _this = this;
    
    $('a', this.game).remove();
    $('a', this.letters).remove();
    $('li', this.wordsLeft).remove();
    $('li', this.wordsRight).remove();
    
    var i,j,c,b;
    for (i = 0; i < 5; i++) {
      for (j = 0; j < 5; j++) {
        if (typeof data[0][i] != "undefined" && typeof data[0][i][j] != "undefined") {
          b = $('<a href="#" data-pos="['+i+','+j+','+data[1][i][j]+']"><span>'+data[0][i][j]+'</span></a>');
          b.hide();
          this.game.append(b);
        }
      }
    }
    $('a', this.game).each(function(i) {
      var data = eval($(this).attr('data-pos'));    
      $(this).addClass('status'+data[2]);
      $(this).delay(i * 50).fadeIn('fast');
    }).unbind('click').bind('click', function(e) {
      e.preventDefault();
      if (_this.freeze) { return; }
      _this.select(this);
    });
    setTimeout(this.iphone, 26 * 50);
  };

  create: function() {
    var _this = this;
    if (this.userName == 'anonymous') {
      this.userName = prompt('Your name please?', this.userName);
    }
    this.loader(true);    
    $.post(this.apiUrl('new'), {gameId: this.gameId, name: this.userName, userId: this.userId}, function(data) {
      _this.game(data);
      history.pushState({game:data[2]}, "game:"+data[2], "/game/"+data[2]);      
      _this.gameId = data[2];
      prompt('Link for opponend:', 'http://lr.bp.la/game/'+data[3]);
      _this.loader(false);      
    }, 'json');
  },
  
  update: function(data) {
    var _this = this;
    $('a', this.letters).each(function(i) {
      $(this).trigger('click');
      $('a', _this.game).removeClass('picked');
    });
    $('a', this.game).each(function(i) {
      var pos = eval($(this).attr('data-pos'));    
      if (pos[2] != data[pos[0]][pos[1]]) {
        $(this).css('opacity', 0.3);
        $(this).removeClass('status'+pos[2]);        
        $(this).addClass('status'+data[pos[0]][pos[1]]);
        
        pos[2] = data[pos[0]][pos[1]];
        $(this).attr('data-pos', '['+pos.join(',')+']');
        
        $(this).delay(i * 50).animate({ opacity: 1.0 });
      }
    });
  },
  
  loader: function(status) {
    if (status) {
      this.game.stop().animate({ opacity: 0.5 });
    } else {
      this.game.stop().animate({ opacity: 1.0 });      
    }
  },
  
  title: function(data, prefix) {
    if (typeof prefix == "undefined") {
      prefix = '';
    }
    var num = this.player == 1 ? 1 : 0;
    document.title = prefix+"LR with "+data.names[num];
    this.left.text(data.names[0]);
    this.right.text(data.names[1]);
    this.leftScore.text(data.scores[0]);
    this.rightScore.text(data.scores[1]);
  },

  selected: function() {
    var r = [];
    $('a', this.letters).each(function() {
      var data = eval($(this).attr('data-pos'));
      var x = (data[0] * 5) + data[1];
      r.push(x);
    });
    return r.join(',');
  },
  
  wordPlayed: function(w, player) {
    if (player == 1) {
      $('ul', this.wordsLeft).prepend('<li>'+w+'</li>');
    } else {
      $('ul', this.wordsRight).prepend('<li>'+w+'</li>');
    }
  },
  
  recalculate: function() {
    var score = [0, 0];
    $('a', this.game).not('.picked').each(function() {
      var coord = eval($(this).attr('data-pos'));
      if (coord[2] > 0) {
        score[0]++;
      } else if (coord[2] < 0) {
        score[1]++;
      }
    });
    $('a', this.letters).each(function() {
      var coord = eval($(this).attr('data-pos'));
      if (coord[2] != -2) {
        score[0]++;
      }
    });
    if (this.player == 2) {
      this.leftScore.text(score[1]);
      this.rightScore.text(score[0]);      
    } else {
      this.leftScore.text(score[0]);
      this.rightScore.text(score[1]);      
    }
  },
  
  wait: function() {
    var _this = this;
    this.game.stop().animate({ opacity: 0.5 });
    this.freeze = true;
    $.post(this.apiUrl('resume'), function(data) {
      if (data.active_player != _this.player) {
        _this.title(data);
        setTimeout(_this.wait, 2500);
      } else {
        if (data.check == true) {
          _this.finish(data);
        } else {
          _this.title(data, '[!]');
          _this.notify('It is your turn!', data.names);
          _this.game.stop().animate({ opacity: 1.0 });
          _this.freeze = false;
        }
        $('li', _this.wordsLeft).remove();
        $('li', _this.wordsRight).remove();
        $.each(data.words[0], function(itm) {
          _this.wordPlayed(this.toUpperCase(), 1);
        });  
        $.each(data.words[1], function(itm) {
          _this.wordPlayed(this.toUpperCase(), 2);
        });  
        _this.update(data.data[1]);
      }
    }, 'json');
  },

  finish: function(data) {
    alert('Game has ended: '+data.score);
    this.game.stop().animate({ opacity: 1.0 });
    this.freeze = true;         
    this.buttonReset.fadeOut();
  },
  
  iphone: function() {
    if (navigator.userAgent.indexOf('iPhone') != -1) {
      window.scrollTo(0, 1);
    }
  },

  notify: function(text, names) {
    if (this.focus) return;
    if (window.Notification) {
      var n = new Notification(
        'LetterRun game "'+names[0]+' vs '+names[1]+'"',
        { 
          body: text,
          tag: new Date().getTime(),
          onshow: function() { setTimeout(n.close(), 15000); }
        }
      );
      n.show();
    } else {
      alert(text);
    }
  }
};

$(document).ready(function() {
  if ($('.app').length > 0) {
    letterrun.init();
  }
});
