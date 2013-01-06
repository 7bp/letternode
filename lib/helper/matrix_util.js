'use strict';

var CLIENT_TYPES = {
  ALL_PLAYERS: null,
  PLAYER_1: 'player1',
  PLAYER_2: 'player2'
};

var MatrixUtil = (function() {

  function MatrixUtil(config) {
    this.config = config || {ROWS: 5, COLUMNS_PER_ROW: 5, CELLS: 25};
  }

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
    if (position % this.config.COLUMNS_PER_ROW > 0) {
      checkPositions.push(position - 1);
    }
    // Next column
    if (position % this.config.COLUMNS_PER_ROW < (this.config.COLUMNS_PER_ROW - 1)) {
      checkPositions.push(position + 1);
    }
    // Previous row
    if (position / this.config.COLUMNS_PER_ROW >= 1) {
      checkPositions.push(position - 5);
    }
    // Next row
    if (position / this.config.COLUMNS_PER_ROW < ((matrix.length / this.config.COLUMNS_PER_ROW) - 1)) {
      checkPositions.push(position + this.config.COLUMNS_PER_ROW);
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