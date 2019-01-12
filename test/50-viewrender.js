var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('ViewRender', function() {

	before(function() {
		hawkejs = new Hawkejs();
	});

	describe('#async(fnc)', function() {
		it('allows you to use an async function inside a template', function(done) {

			var code = `
				<% this.async(function(next) {
					__Protoblast.Globals.setTimeout(function() {
						next(null, 'text');
					}, 5);
				}) %>
			`;

			var compiled = hawkejs.compile('async_test_1', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, 'text');
				done();
			});
		});
	});
});