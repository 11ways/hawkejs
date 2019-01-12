var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('CustomElement', function() {

	before(function() {
		hawkejs = new Hawkejs();
	});

	describe('Inheritance', function() {
		it('should create a new class', function(done) {

			var HeTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function HeTest() {
				return HeTest.super.call(this);
			});

			HeTest.setAttribute('testval');

			setTimeout(done, 4);
		});
	});

	describe('.setAttribute(name)', function() {
		it('should add an attribute that is also accessible via a getter/setter', function(done) {

			var code = `
				<% el = create_element('he-test') %>
				<% el.testval = "bla" %>
				<%= el %>
			`;

			var compiled = hawkejs.compile('he_test_1', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, '<he-test testval="bla" data-hid="hserverside-0"></he-test>');
				done();
			});
		});
	});

});