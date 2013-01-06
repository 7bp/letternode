'use strict';

var ScoreUtil = (function() {

  var ScoreUtil = function ScoreUtil() {
  };

  ScoreUtil.getScores = function(matrix) {
    var result = [0, 0], position;
    for (var i = 0, c = matrix.length; i < c; i++) {
      position = matrix[i];
      if (position < 2) {
        result[0]++;
      } else if (position > 2) {
        result[1]++;
      }
    }
    return result;
  };

  ScoreUtil.isGameFinished = function(matrix) {
    var scores = this.getScores(matrix);
    return (scores[0] + scores[1] === 25);
  };

  return ScoreUtil;

})();

module.exports = ScoreUtil;