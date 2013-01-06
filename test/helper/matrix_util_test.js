"use strict";

var MatrixUtil = require('../../lib/helper/matrix_util.js');

exports['Helper.MatrixUtil'] = {
  setUp: function(done) {
    done();
  },
  'isPositionBlockedByPlayer Non-Blocked': function(test) {
    var matrix = '2222222222';
    var position = 3;
    test.equal(MatrixUtil.isPositionBlockedByPlayer(matrix, position, 'PLAYER_1'), false);
    test.equal(MatrixUtil.isPositionBlockedByPlayer(matrix, position, 'PLAYER_2'), false);
    //test.expect(1);
    test.done();
  },
  'isPositionBlockedByPlayer Blocked': function(test) {
    var matrix = '2202222222';
    var position = 2;
    test.equal(MatrixUtil.isPositionBlockedByPlayer(matrix, position, 'PLAYER_1'), true);
    test.equal(MatrixUtil.isPositionBlockedByPlayer(matrix, position, 'PLAYER_2'), false);
    matrix = '2242222222';
    test.equal(MatrixUtil.isPositionBlockedByPlayer(matrix, position, 'PLAYER_1'), false);
    test.equal(MatrixUtil.isPositionBlockedByPlayer(matrix, position, 'PLAYER_2'), true);
    //test.expect(1);
    test.done();
  },
  'markPositionOwnedByPlayer': function(test) {
    test.equal(MatrixUtil.markPositionOwnedByPlayer('2222222222', 2, 'PLAYER_1'), '2212222222');
    test.equal(MatrixUtil.markPositionOwnedByPlayer('2222222222', 2, 'PLAYER_2'), '2232222222');
    // Invalid positions follow..
    test.equal(MatrixUtil.markPositionOwnedByPlayer('2222222222', -1, 'PLAYER_2'), '2222222222');
    test.equal(MatrixUtil.markPositionOwnedByPlayer('2222222222', 10, 'PLAYER_2'), '2222222222');
    test.expect(4);
    test.done();
  },
  'removeAllBlockedStates': function(test) {
    test.equal(MatrixUtil.removeAllBlockedStates('012340123401234'), '112331123311233');
    test.expect(1);
    test.done();
  },
  'checkNeighboursHaveStates': function(test) {
    // (top left corner)
    var matrix = ['21222', '12222'];
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 0, ['0', '1']), true, 'Top left corner: Position');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 1, ['0', '1']), false, 'Top left corner: Neighbour 1/2');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 5, ['0', '1']), false, 'Top left corner: Neighbour 2/2');
    // (top right corner)
    matrix = ['22212', '22221'];
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 4, ['0', '1']), true, 'Top right corner: Position');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 3, ['0', '1']), false, 'Top right corner: Neighbour 1/2');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 9, ['0', '1']), false, 'Top right corner: Neighbour 2/2');
    // (bottom left corner)
    matrix = ['12222', '21222'];
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 5, ['0', '1']), true, 'Bottom left corner: Position');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 0, ['0', '1']), false, 'Bottom left corner: Neighbour 1/2');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 6, ['0', '1']), false, 'Bottom left corner: Neighbour 2/2');
    // (bottom right corner)
    matrix = ['22221', '22212'];
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 9, ['0', '1']), true, 'Bottom right corner: Position');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 4, ['0', '1']), false, 'Bottom right corner: Neighbour 1/2');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 8, ['0', '1']), false, 'Bottom right corner: Neighbour 2/2');
    // (middle)
    matrix = ['21222', '12122', '21222'];
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 6, ['0', '1']), true, 'Middle: Position');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 1, ['0', '1']), false, 'Middle: Neighbour 1/2');
    test.equal(MatrixUtil.checkNeighboursHaveStates(matrix.join(''), 11, ['0', '1']), false, 'Middle: Neighbour 2/2');
    test.expect(15);
    test.done();
  },
  'markAllBlockedStates (position owned)': function(test) {
    // (top left corner)
    var matrix = ['11222', '12222'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '0122212222', 'Top left corner: Position');
    // (top right corner)
    matrix = ['22211', '22221'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '2221022221', 'Top right corner: Position');
    // (bottom left corner)
    matrix = ['12222', '11222'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '1222201222', 'Bottom left corner: Position');
    // (bottom right corner)
    matrix = ['22221', '22211'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '2222122210', 'Bottom right corner: Position');
    // (middle)
    matrix = ['21222', '11122', '21222'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '212221012221222', 'Middle: Position');
    test.expect(5);
    test.done();
  },
  'markAllBlockedStates (position not owned)': function(test) {
    // (top left corner)
    var matrix = ['21222', '12222'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '2122212222', 'Top left corner: Position');
    // (top right corner)
    matrix = ['22212', '22221'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '2221222221', 'Top right corner: Position');
    // (bottom left corner)
    matrix = ['12222', '21222'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '1222221222', 'Bottom left corner: Position');
    // (bottom right corner)
    matrix = ['22221', '22212'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '2222122212', 'Bottom right corner: Position');
    // (middle)
    matrix = ['21222', '12122', '21222'];
    test.equal(MatrixUtil.markAllBlockedStates(matrix.join('')), '212221212221222', 'Middle: Position');
    test.expect(5);
    test.done();
  },
  'getOpponentPlayer': function(test) {
    test.equal(MatrixUtil.getOpponentPlayer('PLAYER_1'), 'PLAYER_2');
    test.equal(MatrixUtil.getOpponentPlayer('PLAYER_2'), 'PLAYER_1');
    // Invalid player type
    test.equal(MatrixUtil.getOpponentPlayer(), undefined);
    test.expect(3);
    test.done();
  },
  'buildStateMatrixAsString': function(test) {
    var matrix = MatrixUtil.buildStateMatrixAsString(['21222', '12222'].join(''), 'PLAYER_1', ['0']);
    test.equal(matrix, '0122212222');
    test.done();
  }
};
