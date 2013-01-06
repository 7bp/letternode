"use strict";

var ScoreUtil = require('../../lib/helper/score_util.js');

exports['Helper.ScoreUtil'] = {
  setUp: function(done) {
    done();
  },
  'getScores 0 vs 0': function(test) {
    var matrix = '222222222222';
    var result = ScoreUtil.getScores(matrix);
    test.equal(result[0], 0, 'Score for player 1 is 0.');
    test.equal(result[1], 0, 'Score for player 2 is 0.');
    test.expect(2);
    test.done();
  },
  'getScores 6 vs 0': function(test) {
    var matrix = '100122112222';
    var result = ScoreUtil.getScores(matrix);
    test.equal(result[0], 6, 'Score for player 1 is 6.');
    test.equal(result[1], 0, 'Score for player 2 is 0.');
    test.expect(2);
    test.done();
  },
  'getScores 7 vs 8': function(test) {
    var matrix = '1011122233334121343';
    var result = ScoreUtil.getScores(matrix);
    test.equal(result[0], 7, 'Score for player 1 is 7.');
    test.equal(result[1], 8, 'Score for player 2 is 8.');
    test.expect(2);
    test.done();
  },
  'getScores 12 vs 13': function(test) {
    var matrix = '100110223313341211213343433320';
    var result = ScoreUtil.getScores(matrix);
    test.equal(result[0], 12, 'Score for player 1 is 12.');
    test.equal(result[1], 13, 'Score for player 2 is 13.');
    test.expect(2);
    test.done();
  },
  'isGameFinished 0 vs 0': function(test) {
    var matrix = '222222222222';
    var result = ScoreUtil.isGameFinished(matrix);
    test.equal(result, false, 'Game with score 0 vs 0 is not finished.');
    test.expect(1);
    test.done();
  },
  'isGameFinished 6 vs 0': function(test) {
    var matrix = '100122112222';
    var result = ScoreUtil.isGameFinished(matrix);
    test.equal(result, false, 'Game with score 6 vs 0 is not finished.');
    test.expect(1);
    test.done();
  },
  'isGameFinished 7 vs 8': function(test) {
    var matrix = '1011122233334121343';
    var result = ScoreUtil.isGameFinished(matrix);
    test.equal(result, false, 'Game with score 7 vs 8 is not finished.');
    test.expect(1);
    test.done();
  },
  'isGameFinished 12 vs 13': function(test) {
    var matrix = '100110223313341211213343433320';
    var result = ScoreUtil.isGameFinished(matrix);
    test.equal(result, true, 'Game with score 12 vs 13 is finished.');
    test.expect(1);
    test.done();
  }

};
