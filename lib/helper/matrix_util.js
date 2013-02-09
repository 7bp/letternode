'use strict';

var CLIENT_TYPES = {
  ALL_PLAYERS: null,
  PLAYER_1: 'player1',
  PLAYER_2: 'player2'
};

var MatrixUtil = (function() {

  function MatrixUtil(config) {
    this.config = config || {rows: 5, columns_per_row: 5, cells: 25};
  }

  /**
   * Find occurrence of given search string inside matrix
   * @param matrix {String}
   * @param search {String}
   * @return {Integer}
   */
  MatrixUtil.prototype.getOccurrenceCount = function(matrix, search) {
    var result = 0, i, c;
    for (i = 0, c = matrix.length; i < c; i++) {
      if (search.indexOf(matrix[i]) !== -1) {
        result++;
      }
    }
    return result;
  };

  /**
   * Create a new matrix
   * @return {String}
   */
  MatrixUtil.prototype.createGameMatrix = function() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var vowels = 'AEIOU';
    var result = '';
    var i, position;
    for (i = 0; i < this.config.cells; i++) {
      position = Math.floor(Math.random() * chars.length);
      result += chars[position];
    }
    // at least 3 vowels must be generated, otherwise replace existing characters
    var maxTries = 0;
    while (this.getOccurrenceCount(result, vowels) <= 2 && maxTries < 10) {
      position = Math.floor(Math.random() * result.length);
      result = result.substring(0, position) + vowels[Math.floor(Math.random() * vowels.length)] + result.substring(position + 1);
      maxTries++;
    }
    if (this.getOccurrenceCount(result, 'Q') > 0 && this.getOccurrenceCount(result, 'U') === 0) {
      position = Math.floor(Math.random() * result.length);
      result = result.substring(0, position) + 'U' + result.substring(position + 1);
    }
    return result;
  };

  MatrixUtil.prototype.isPositionBlockedByPlayer = function(matrix, position, playerType) {
    if (playerType === CLIENT_TYPES.PLAYER_1 && matrix[position] === '0') {
      return true;
    } else if (playerType === CLIENT_TYPES.PLAYER_2 && matrix[position] === '4') {
      return true;
    }
    return false;
  };

  MatrixUtil.prototype.getOpponentPlayer = function(playerType) {
    if (playerType === CLIENT_TYPES.PLAYER_1) {
      return CLIENT_TYPES.PLAYER_2;
    } else if (playerType === CLIENT_TYPES.PLAYER_2) {
      return CLIENT_TYPES.PLAYER_1;
    }
    return;
  };

  MatrixUtil.prototype.markPositionOwnedByPlayer = function(matrix, position, playerType) {
    if (position < 0 || position >= matrix.length) {
      return matrix;
    }
    if (playerType === CLIENT_TYPES.PLAYER_1) {
      return matrix.substring(0, position) + '1' + matrix.substring(position + 1);
    } else if (playerType === CLIENT_TYPES.PLAYER_2) {
      matrix[position] = '3';
      return matrix.substring(0, position) + '3' + matrix.substring(position + 1);
    } else {
      return matrix;
    }
  };

  MatrixUtil.prototype.removeAllBlockedStates = function(matrix) {
    var result = '';
    for (var i = 0, c = matrix.length, state; i < c; i++) {
      state = matrix[i];
      if (state === '0') {
        result += '1';
      } else if (state === '4') {
        result += '3';
      } else {
        result += state;
      }
    }
    return result;
  };

  MatrixUtil.prototype.checkNeighboursHaveStates = function(matrix, position, requiredStates) {
    var checkPositions = [], i, c;
    // Previous column
    if (position % this.config.columns_per_row > 0) {
      checkPositions.push(position - 1);
    }
    // Next column
    if (position % this.config.columns_per_row < (this.config.columns_per_row - 1)) {
      checkPositions.push(position + 1);
    }
    // Previous row
    if (position / this.config.columns_per_row >= 1) {
      checkPositions.push(position - 5);
    }
    // Next row
    if (position / this.config.columns_per_row < ((matrix.length / this.config.columns_per_row) - 1)) {
      checkPositions.push(position + this.config.columns_per_row);
    }
    for (i = 0, c = checkPositions.length; i < c; i++) {
      var checkPosition = checkPositions[i];
      if (requiredStates.indexOf(matrix[checkPosition]) < 0) {
        return false;
      }
    }
    return true;
  };

  MatrixUtil.prototype.markAllBlockedStates = function(matrix) {
    var result = '';
    for (var i = 0, c = matrix.length, state; i < c; i++) {
      state = matrix[i];
      if ((state === '0' || state === '1') && this.checkNeighboursHaveStates(matrix, i, ['0', '1'])) {
        result += '0';
      } else if ((state === '3' || state === '4') && this.checkNeighboursHaveStates(matrix, i, ['3', '4'])) {
        result += '4';
      } else {
        result += state;
      }
    }
    return result;
  };

  /**
   * 0 => 1: Blocked field
   * 1 => 1: Non-blocked field
   * 2 => Neutral
   * 3 => 2: Non-blocked field
   * 4 => 2: Blocked field
   * @param oldMatrix
   * @param playerType
   * @param positions
   * @return {String}
   */
  MatrixUtil.prototype.buildStateMatrixAsString = function(oldMatrix, playerType, positions) {
    var i = 0, c = positions.length, position, result = oldMatrix.substring(0, oldMatrix.length), opponentPlayer = this.getOpponentPlayer(playerType);
    for (; i < c; i++) {
      position = parseInt(positions[i], 10);
      if (!this.isPositionBlockedByPlayer(result, position, opponentPlayer)) {
        result = this.markPositionOwnedByPlayer(result, position, playerType);
      }
    }
    result = this.removeAllBlockedStates(result);
    result = this.markAllBlockedStates(result);
    return result;
  };

  (function() {
    var defaultInstance = new MatrixUtil();
    MatrixUtil.isPositionBlockedByPlayer = defaultInstance.isPositionBlockedByPlayer;
    MatrixUtil.getOpponentPlayer = defaultInstance.getOpponentPlayer;
    MatrixUtil.markPositionOwnedByPlayer = defaultInstance.markPositionOwnedByPlayer;
    MatrixUtil.removeAllBlockedStates = defaultInstance.removeAllBlockedStates;
    MatrixUtil.checkNeighboursHaveStates = defaultInstance.checkNeighboursHaveStates;
    MatrixUtil.markAllBlockedStates = defaultInstance.markAllBlockedStates;
    MatrixUtil.buildStateMatrixAsString = defaultInstance.buildStateMatrixAsString;
  })();

  return MatrixUtil;

})();

module.exports = MatrixUtil;