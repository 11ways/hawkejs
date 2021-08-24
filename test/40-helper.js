var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    Fn       = __Protoblast.Bound.Function,
    hawkejs,
    Test;

describe('Helper', function() {

	before(function() {
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
		hawkejs.addViewDirectory(__dirname + '/templates');
	});

	describe('inheritance', function() {
		it('registers new classes', function(done) {

			Test = Fn.inherits('Hawkejs.Helper', function Test(renderer) {
				Test.super.call(this, renderer);
			});

			Test.setMethod(function saySomething() {
				this.print('something');
			});

			Test.setMethod(function applyDirective(element, value) {
				element.setAttribute('id', value || 'done');

				if (element.hasAttribute('data-delay')) {
					let pledge = new __Protoblast.Classes.Pledge();
					let delay = +element.getAttribute('data-delay');

					setTimeout(function() {
						element.setAttribute('data-delayed', delay);
						pledge.resolve();
					}, delay);

					return pledge;
				}
			});

			Test.setProperty(function return_ok() {
				return 'ok';
			});

			setTimeout(function() {

				assert.strictEqual(Hawkejs.Helper.Test, Test);

				done();
			}, 4);
		});
	});

	describe('HelperCollection', function() {
		it('creates helper instances on the fly', function(done) {

			var renderer = new Hawkejs.Renderer(hawkejs);

			assert.strictEqual(renderer.helpers.Test.constructor, Test);
			done();
		});
	});

	describe('methods', function() {
		it('should allow the use of methods in templates', function(done) {

			var code = `<%= Test.saySomething() %>`;

			var compiled = hawkejs.compile('Test_test_1', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, 'something');
				done();
			});
		});

		it('should work inside blocks', function(done) {

			let code = `<div data-he-name="main"></div>
			{% block "main" %}
				<%= Test.saySomething() %>
			{% /block %}
			`;

			let compiled = hawkejs.compile('Test_test_5', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assertEqualHtml(res, '<div data-he-name="main" data-hid="hserverside-0" data-he-template="Test_test_5"> something </div>');
				done();
			});

		});

		it('should allow the use of methods in Hawkejs expressions', function(done) {

			var code = '{%= Test.saySomething() %}';

			var compiled = hawkejs.compile('Test_test_3', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, 'something');
				done();
			});
		});

		it('should allow the use of properties in Hawkejs expressions', function(done) {

			var code = '{%= Test.return_ok %}';

			var compiled = hawkejs.compile('Test_test_4', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, 'ok');
				done();
			});
		});

		it('should allow the use of methods when using explicit declaration', function(done) {

			var code = `<% const something = Test.saySomething() %><%= something %>`;

			var compiled = hawkejs.compile('Test_test_2', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, 'something');
				done();
			});

		});
	});
});