'use strict';

var Word = (function () {

  var Word = function Word(dict) {
    this.dict = dict; // loader
  };

  Word.check = function(word) {
    return true;
  };

  return Word;

})();

module.exports = Word;