"use strict";

var letternode = require('../lib/letternode.js');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports['Letternode'] = {
  setUp: function(done) {
    done();
  },
  'without configuration profile': function(test) {
    var main = require('../lib/letternode.js');
    main.configure();
    test.ok(!main.backend, 'Backend SHOULD NOT be defined because no profile was selected.');
    test.done();
  },
  'with configuration profile "development"': function(test) {
    var main = require('../lib/letternode.js');
    test.ok(main.configure('development'), 'Configure SHOULD return true.');
    test.notEqual(typeof(main.backend), 'undefined', 'Backend SHOULD be defined because a profile was selected.');
    test.done();
  },
  'with configuration profile "production"': function(test) {
    var main = require('../lib/letternode.js');
    test.ok(main.configure('production'), 'Configure SHOULD return true.');
    test.notEqual(typeof(main.backend), 'undefined', 'Backend SHOULD be defined because a profile was selected.');
    test.done();
  }
};
