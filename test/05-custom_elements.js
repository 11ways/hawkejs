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

			var MethodTestOnly = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function MethodTestOnly() {
				MethodTestOnly.super.call(this);
			});

			MethodTestOnly.setAssignedProperty(function stopped(value) {
				return value;
			}, function setStoppedValue(value) {

				if (value) {
					this.classList.add('stopped');
				} else {
					this.classList.remove('stopped');
				}

				return value;
			});

			MethodTestOnly.setProperty(function title_element() {

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

			MethodTestOnly.setAssignedProperty(function title(value) {
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

		it('should be possible to set the innerHTML in the constructor', async function() {

			let test = Hawkejs.Hawkejs.createElement('html-in-constructor');

			let expected_html = '<html-in-constructor my-test="47"><bold>This is a test</bold></html-in-constructor>';

			assert.strictEqual(test.outerHTML, expected_html);

			await setLocation('/base_scene');

			let result = await evalPage(function() {

				let test = document.createElement('html-in-constructor');

				return {
					html        : test.outerHTML,
					constructor : test.constructor.name,
				}
			});

			assert.strictEqual(result.constructor, 'HtmlInConstructor');

			assert.strictEqual(result.html, expected_html);
		});

		it('should call the constructor before the `introduced` method is executed', async function() {

			let test = Hawkejs.Hawkejs.createElement('html-in-constructor');

			let expected_html = '<bold data-test="47">This is a test</bold>';

			// Manually call the introduced method
			test.introduced();

			assert.strictEqual(test.innerHTML, expected_html);

			await setLocation('/base_scene');

			let result = await evalPage(async function() {

				let test = document.createElement('html-in-constructor');

				document.body.append(test);

				await Pledge.after(80);

				return {
					html         : test.innerHTML,
					constructor  : test.constructor.name,
					has_renderer : !!test.hawkejs_view,
				}
			});

			assert.strictEqual(result.constructor, 'HtmlInConstructor');
			assert.strictEqual(result.html, expected_html);
			assert.strictEqual(result.has_renderer, true);

			result = await evalPage(async function() {

				let test = document.createElement('html-in-constructor');

				let deeper = test.addDeep('deeper');

				deeper.removeAttribute('data-hid');

				await Pledge.after(80);

				return {
					html         : test.innerHTML,
					constructor  : test.constructor.name,
					has_renderer : !!test.hawkejs_view,
				}
			});

			assert.strictEqual(result.html, '<bold>This is a test</bold><html-in-constructor my-test="47"><bold>deeper</bold></html-in-constructor>');
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

				assert.strictEqual(res, '<div><assign-test class="stopped"><div class="title" data-hid="hserverside-1">Bla</div></assign-test></div>');
				done();
			});
		});

		it('should revive the assigned data when sent to the browser', async function() {

			actions['/assigned_data_test'] = function(req, res, renderer, responder) {

				let test_el = Hawkejs.Hawkejs.createElement('assign-test');

				let url = renderer.internal('url');

				test_el.title = url.param('title');

				renderer.set('test_el', test_el);

				let template = 'data_test';

				renderer.renderHTML(template).done(function afterRender(err, html) {

					if (err) {
						throw err;
					}

					responder(html);
				});
			};

			await setLocation('/assigned_data_test?title=First+title');

			let html = await getMainHtml();

			function getMainHtml() {
				return evalPage(function() {

					let data_test = document.querySelector('.data-test'),
					    html;

					if (data_test) {
						html = data_test.innerHTML.trim();
					} else {
						html = document.body.innerHTML.trim();
					}

					return html;
				});
			}

			assert.strictEqual(html, `<span tabindex="0">Element:</span> <assign-test><div class="title">First title</div></assign-test>\nTittle AD: First title`);

			await openHeUrl('/assigned_data_test?title=Ajax title');

			html = await getMainHtml();

			assert.strictEqual(html, `<span tabindex="0">Element:</span> <assign-test><div class="title">Ajax title</div></assign-test>\nTittle AD: Ajax title`);
		});
	});

	describe('.setTemplate(source, is_plain_html)', function() {
		it.skip('should set the template to render the contents', function(done) {

			var SyncTemplateTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function SyncTemplateTest() {
				return SyncTemplateTest.super.call(this);
			});

			SyncTemplateTest.setTemplate('<span class="test">This is a test!!</span>', true);

			setTimeout(function() {

				var code = `<sync-template-test></sync-template-test><sync-template-test>NOPE</sync-template-test>`;

				var compiled = hawkejs.compile('template_test_2', code);

				hawkejs.render(compiled, {}, function rendered(err, res) {

					if (err) {
						throw err;
					}

					res = res.trim();

					assert.strictEqual(res, '<sync-template-test><span class="test">This is a test!!</span></sync-template-test><sync-template-test>NOPE</sync-template-test>');

					done();
				});

			}, 4);

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

					assert.strictEqual(res, '<template-test he-rendered="1">This is the content of template-test</template-test>');
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

					assert.strictEqual(res, '<template-slot-test he-rendered="1"><div data-he-slot="main">This will set the content of the <b>main</b> slot</div></template-slot-test>');
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

				assert.strictEqual(res, '<template-slot-test he-rendered="1"><div data-he-slot="main">Slot test 1</div></template-slot-test>\n<template-slot-test he-rendered="1"><div data-he-slot="main">Slot test 2</div></template-slot-test>');
				done();
			});
		});
	});

});