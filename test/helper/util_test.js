"use strict";

var Util = require('../../lib/helper/util.js');

exports['Helper.Util'] = {
  setUp: function(done) {
    done();
  },
  'Empty UUID (bits/length 0)': function(test) {
    var uuid = Util.buildUUID(0);
    test.expect(uuid.length, 0, 'The generated uuid must be empty.');
    test.done();
  },
  'No arguments': function(test) {
    var uuid = Util.buildUUID();
    test.expect(uuid.length, 0, 'The generated uuid must be empty.');
    test.done();
  },
  'Specific length of a UUID (1 -> 6)': function(test) {
    var uuid = Util.buildUUID(1);
    test.equal(uuid.length, 1, 'The generated uuid has not the correct length: ' + uuid);
    test.expect(1);
    test.done();
  },
  'Specific length of a UUID (6)': function(test) {
    var uuid = Util.buildUUID(6);
    test.equal(uuid.length, 1, 'The generated uuid has not the correct length: ' + uuid);
    test.expect(1);
    test.done();
  },
  'Specific length of a UUID (48)': function(test) {
    var uuid = Util.buildUUID(48);
    test.equal(uuid.length, 8, 'The generated uuid has not the correct length: ' + uuid);
    test.expect(1);
    test.done();
  },
  'Specific length of a UUID (49 -> 54)': function(test) {
    var uuid = Util.buildUUID(49);
    test.equal(uuid.length, 9, 'The generated uuid has not the correct length: ' + uuid);
    test.expect(1);
    test.done();
  }
};
