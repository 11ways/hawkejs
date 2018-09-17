var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('Expressions', function() {

	before(function() {
		hawkejs = new Hawkejs();
	});

	describe('If', function() {
		var tests = [
			['{% if true %}TRUE{% /if %}', 'TRUE'],
			['{% if false %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if "a" eq "a" %}TRUE{% else %}ELSE{% /if %}', 'TRUE'],
			['{% if "a" eq "b" %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if "a" eq "b" %}TRUE{% /if %}', ''],
			['{% if empty_arr %}TRUE{% /if %}', ''],
			['{% if empty_arr %}TRUE{% else %}ELSE{% /if %}', 'ELSE'],
			['{% if non.existing.variable.path %}TRUE{% else %}ELSE{% /if %}', 'ELSE']
		];

		for (let i = 0; i < tests.length; i++) {
			let code = tests[i][0],
			    result = tests[i][1];

			it(code, function(next) {
				test_id++;

				var compiled = hawkejs.compile('test_' + test_id, code);

				hawkejs.render(compiled, {empty_arr: []}, function done(err, res) {

					if (err) {
						return next(err);
					}

					assert.strictEqual(res, result);
					next();
				});
			});
		}
	});
});