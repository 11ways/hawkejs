var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('CustomElement', function() {

	before(function() {
		hawkejs = new Hawkejs();
		hawkejs.addViewDirectory(__dirname + '/templates');
	});

	describe('Inheritance', function() {
		it('should create a new class', function(done) {

			var HeTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function HeTest() {
				return HeTest.super.call(this);
			});

			HeTest.setAttribute('testval');

			setTimeout(done, 4);
		});

		it('should set assigned data', function(done) {

			var AssignTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function AssignTest() {
				AssignTest.super.call(this);
			});

			AssignTest.setAssignedProperty(function stopped(value) {
				return value;
			}, function setStoppedValue(value) {

				if (value) {
					this.classList.add('stopped');
				} else {
					this.classList.remove('stopped');
				}

				return value;
			});

			AssignTest.setProperty(function title_element() {

				if (!this.assigned_data.title_element) {
					let element = this.createElement('div');
					element.classList.add('title');
					this.assigned_data.title_element = element;
					this.append(element);
				}

				return this.assigned_data.title_element;
			}, function setTitleElement(element) {

				if (this.assigned_data.title_element) {
					this.assigned_data.title_element.remove();
				}

				this.append(element);

				return this.assigned_data.title_element = element
			});

			AssignTest.setAssignedProperty(function title(value) {
				return this.title_element.innerText;
			}, function setTitle(value) {

				if (value) {
					this.title_element.innerText = value;
				} else {
					this.title_element.innerText = '';
				}

				return this.title_element.innerText;
			});

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

	describe('.setAssignedProperty(name)', function() {
		it('should execute the special assigned function', function(done) {

			var code = `<div><%
				at = createElement('assign-test');
				at.stopped = "test";
				at.title = "Bla";
				print(at);
				%></div>`;

			var compiled = hawkejs.compile('he_test_2', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, '<div><assign-test class="stopped" data-hid="hserverside-0"><div class="title" data-hid="hserverside-1">Bla</div></assign-test></div>');
				done();
			});
		});
	});

	describe('.setTemplateFile(path)', function() {
		it('should set the template to use for the content of the element', function(done) {

			var TemplateTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function TemplateTest() {
				return TemplateTest.super.call(this);
			});

			TemplateTest.setTemplateFile('partials/template_test');

			setTimeout(function() {

				var code = `<template-test></template-test>`;

				var compiled = hawkejs.compile('template_test_1', code);

				hawkejs.render(compiled, {}, function rendered(err, res) {

					if (err) {
						throw err;
					}

					res = res.trim();

					assert.strictEqual(res, '<template-test>This is the content of template-test</template-test>');
					done();
				});

			}, 4);
		});

		it('should allow the usage of slots', function(done) {

			var TemplateSlotTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function TemplateSlotTest() {
				return TemplateSlotTest.super.call(this);
			});

			TemplateSlotTest.setTemplateFile('partials/template_slot_test');

			setTimeout(function() {

				var code = `<template-slot-test>
	<div slot="main">This will set the content of the <b>main</b> slot</div>
</template-slot-test>`;

				var compiled = hawkejs.compile('template_test_2', code);

				hawkejs.render(compiled, {}, function rendered(err, res) {

					if (err) {
						throw err;
					}

					res = res.trim();

					assert.strictEqual(res, '<template-slot-test><div data-he-slot="main">This will set the content of the <b>main</b> slot</div></template-slot-test>');
					done();
				});

			}, 4);
		});

		it('should not confuse slots with similar elements', function(done) {

			var code = `<template-slot-test>
	<div slot="main">Slot test 1</div>
</template-slot-test>
<template-slot-test>
	<div slot="main">Slot test 2</div>
</template-slot-test>`;

			var compiled = hawkejs.compile('template_test_3', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, '<template-slot-test><div data-he-slot="main">Slot test 1</div></template-slot-test>\n<template-slot-test><div data-he-slot="main">Slot test 2</div></template-slot-test>');
				done();
			});

		});
	});

});