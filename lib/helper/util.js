'use strict';

var Util = (function() {

  var Util = function Util() {
  };

  Util.buildUUID = function(bits) {
    var CHARS, i, rand, result, _i;
    CHARS = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz012345678900';
    result = '';
    while (bits > 0) {
      rand = Math.floor(Math.random() * 0x100000000);
      for (i = _i = 26; _i > 0; i = _i += -6) {
        result += CHARS[0x3F & rand >>> i];
        bits -= 6;
        if (bits <= 0) {
          break;
        }
      }
    }
    return result;
  };

  Util.checkSearchDoesNotExistInWords = function(search, words) {
    var result = true, searchLength = search.length, word;

    for (var i = 0, c = words.length; i < c; i++) {
      word = words[i];
      if (word === search) {
        result = false;
        break;
      } else if (searchLength < word.length && search === word.substring(0, searchLength)) {
        result = false;
        break;
      }
    }

    return result;
  };

  return Util;

})();

module.exports = Util;