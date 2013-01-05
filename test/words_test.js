"use strict";

var Words = require('../lib/words');

exports['Words'] = {
  setUp: function(done) {
    done();
    this.emptyFn = function() {
    };
  },
  'Load EWOL with Cache': function(test) {
    var words = Words.loadDictionary({
      basePath: 'lib/dictionary/eowl',
      fileNameChars: 1,
      useCache: true
    }), emptyFn = this.emptyFn;
    words.onReady(function() {
      words.existWord('alpine').then(function() {
        test.ok(true, 'Word is valid.');
      }, emptyFn).fin(function() {
          test.expect(1);
          test.done();
        });
    });
  },
  'Load EWOL with Cache (failed)': function(test) {
    var words = Words.loadDictionary({
      basePath: 'lib/dictionary/eowl',
      fileNameChars: 1,
      useCache: true
    }), emptyFn = this.emptyFn;
    words.onReady(function() {
      words.existWord('willneverexistthisword').then(emptyFn,function() {
        test.ok(true, 'Word is invalid.');
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
    }), emptyFn = this.emptyFn;
    words.onReady(function() {
      words.existWord('alpine').then(function() {
        test.ok(true, 'Word is valid.');
      }, emptyFn).fin(function() {
          test.expect(1);
          test.done();
        });
    });
  },
  'Load EWOL without Cache (failed)': function(test) {
    var words = Words.loadDictionary({
      basePath: 'lib/dictionary/eowl',
      fileNameChars: 1,
      useCache: false
    }), emptyFn = this.emptyFn;
    words.onReady(function() {
      words.existWord('willneverexistthisword').then(emptyFn,function() {
        test.ok(true, 'Word is invalid.');
      }).fin(function() {
          test.expect(1);
          test.done();
        });
    });
  }
};
