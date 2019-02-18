var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('ViewRender', function() {

	before(function() {
		hawkejs = new Hawkejs();
		hawkejs.addViewDirectory(__dirname + '/templates');
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

	describe('#assign(name)', function() {
		it('sets the wanted block content', function(done) {

			hawkejs.render('assign_test', function doneAssignTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result.trim(), `<div>
<x-hawkejs class="x-hawkejs js-he-newblock" data-type="block" data-name="main" data-target="assign_test" data-template="assign_test" data-theme="default">
This is the internally set main
</x-hawkejs>
</div>`);

				done();
			});
		});
	});

	describe('#expands(template)', function() {
		it('expands into the given template', function(done) {
			hawkejs.render('expand_test', function doneExpandTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result.trim(), `<div class="main">
	<hr>
	<x-hawkejs class="x-hawkejs js-he-newblock" data-type="block" data-name="main" data-target="base" data-template="expand_test" data-theme="default">
This is the main content
</x-hawkejs>
</div>`);

				done();
			});
		});
	});
});