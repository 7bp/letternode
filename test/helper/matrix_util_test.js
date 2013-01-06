"use strict";

var MatrixUtil = require('../../lib/helper/matrix_util.js');

exports['Helper.MatrixUtil'] = {
  setUp: function(done) {
    done();
  },
  'isPositionBlockedByPlayer Non-Blocked': function(test) {
    var matrixUtil = new MatrixUtil();
    var matrix = '2222222222';
    var position = 3;
    test.equal(matrixUtil.isPositionBlockedByPlayer(matrix, position, 'player1'), false);
    test.equal(matrixUtil.isPositionBlockedByPlayer(matrix, position, 'player2'), false);
    //test.expect(1);
    test.done();
  },
  'isPositionBlockedByPlayer Blocked': function(test) {
    var matrixUtil = new MatrixUtil();
    var matrix = '2202222222';
    var position = 2;
    test.equal(matrixUtil.isPositionBlockedByPlayer(matrix, position, 'player1'), true);
    test.equal(matrixUtil.isPositionBlockedByPlayer(matrix, position, 'player2'), false);
    matrix = '2242222222';
    test.equal(matrixUtil.isPositionBlockedByPlayer(matrix, position, 'player1'), false);
    test.equal(matrixUtil.isPositionBlockedByPlayer(matrix, position, 'player2'), true);
    //test.expect(1);
    test.done();
  },
  'markPositionOwnedByPlayer': function(test) {
    var matrixUtil = new MatrixUtil();
    test.equal(matrixUtil.markPositionOwnedByPlayer('2222222222', 2, 'player1'), '2212222222');
    test.equal(matrixUtil.markPositionOwnedByPlayer('2222222222', 2, 'player2'), '2232222222');
    // Invalid positions follow..
    test.equal(matrixUtil.markPositionOwnedByPlayer('2222222222', -1, 'player2'), '2222222222');
    test.equal(matrixUtil.markPositionOwnedByPlayer('2222222222', 10, 'player2'), '2222222222');
    test.expect(4);
    test.done();
  },
  'removeAllBlockedStates': function(test) {
    var matrixUtil = new MatrixUtil();
    test.equal(matrixUtil.removeAllBlockedStates('012340123401234'), '112331123311233');
    test.expect(1);
    test.done();
  },
  'checkNeighboursHaveStates': function(test) {
    var matrixUtil = new MatrixUtil();
    // (top left corner)
    var matrix = ['21222', '12222'];
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 0, ['0', '1']), true, 'Top left corner: Position');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 1, ['0', '1']), false, 'Top left corner: Neighbour 1/2');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 5, ['0', '1']), false, 'Top left corner: Neighbour 2/2');
    // (top right corner)
    matrix = ['22212', '22221'];
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 4, ['0', '1']), true, 'Top right corner: Position');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 3, ['0', '1']), false, 'Top right corner: Neighbour 1/2');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 9, ['0', '1']), false, 'Top right corner: Neighbour 2/2');
    // (bottom left corner)
    matrix = ['12222', '21222'];
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 5, ['0', '1']), true, 'Bottom left corner: Position');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 0, ['0', '1']), false, 'Bottom left corner: Neighbour 1/2');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 6, ['0', '1']), false, 'Bottom left corner: Neighbour 2/2');
    // (bottom right corner)
    matrix = ['22221', '22212'];
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 9, ['0', '1']), true, 'Bottom right corner: Position');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 4, ['0', '1']), false, 'Bottom right corner: Neighbour 1/2');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 8, ['0', '1']), false, 'Bottom right corner: Neighbour 2/2');
    // (middle)
    matrix = ['21222', '12122', '21222'];
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 6, ['0', '1']), true, 'Middle: Position');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 1, ['0', '1']), false, 'Middle: Neighbour 1/2');
    test.equal(matrixUtil.checkNeighboursHaveStates(matrix.join(''), 11, ['0', '1']), false, 'Middle: Neighbour 2/2');
    test.expect(15);
    test.done();
  },
  'markAllBlockedStates (position owned)': function(test) {
    var matrixUtil = new MatrixUtil();
    // (top left corner)
    var matrix = ['11222', '12222'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '0122212222', 'Top left corner: Position');
    // (top right corner)
    matrix = ['22211', '22221'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '2221022221', 'Top right corner: Position');
    // (bottom left corner)
    matrix = ['12222', '11222'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '1222201222', 'Bottom left corner: Position');
    // (bottom right corner)
    matrix = ['22221', '22211'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '2222122210', 'Bottom right corner: Position');
    // (middle)
    matrix = ['21222', '11122', '21222'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '212221012221222', 'Middle: Position');
    test.expect(5);
    test.done();
  },
  'markAllBlockedStates (position not owned)': function(test) {
    var matrixUtil = new MatrixUtil();
    // (top left corner)
    var matrix = ['21222', '12222'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '2122212222', 'Top left corner: Position');
    // (top right corner)
    matrix = ['22212', '22221'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '2221222221', 'Top right corner: Position');
    // (bottom left corner)
    matrix = ['12222', '21222'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '1222221222', 'Bottom left corner: Position');
    // (bottom right corner)
    matrix = ['22221', '22212'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '2222122212', 'Bottom right corner: Position');
    // (middle)
    matrix = ['21222', '12122', '21222'];
    test.equal(matrixUtil.markAllBlockedStates(matrix.join('')), '212221212221222', 'Middle: Position');
    test.expect(5);
    test.done();
  },
  'getOpponentPlayer': function(test) {
    var matrixUtil = new MatrixUtil();
    test.equal(matrixUtil.getOpponentPlayer('player1'), 'player2');
    test.equal(matrixUtil.getOpponentPlayer('player2'), 'player1');
    // Invalid player type
    test.equal(matrixUtil.getOpponentPlayer(), undefined);
    test.expect(3);
    test.done();
  },
  'buildStateMatrixAsString': function(test) {
    var matrixUtil = new MatrixUtil();
    var matrix = matrixUtil.buildStateMatrixAsString(['21222', '12222'].join(''), 'player1', ['0']);
    test.equal(matrix, '0122212222');
    test.done();
  }
};
