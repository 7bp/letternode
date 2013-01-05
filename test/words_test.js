"use strict";

var Words = require('../lib/words');

exports['Words'] = {
  setUp: function(done) {
    done();
  },
  'Load EWOL with Cache': function(test) {
    var words = Words.loadDictionary({
      basePath: 'lib/dictionary/eowl',
      fileNameChars: 1,
      useCache: true
    });
    words.onReady(function() {
      words.existWord('alpine').then(function() {
        test.ok(true, 'Word is valid.');
      }).fin(function() {
          test.expect(1);
          test.done();
        });
    });
  },
  'Load EWOL without Cache': function(test) {
    var words = Words.loadDictionary({
      basePath: 'lib/dictionary/eowl',
      fileNameChars: 1,
      useCache: false
    });
    words.onReady(function() {
      words.existWord('alpine').then(function() {
        test.ok(true, 'Word is valid.');
      }).fin(function() {
          test.expect(1);
          test.done();
        });
    });
  }
};
