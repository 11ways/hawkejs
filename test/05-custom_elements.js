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

		it('should not call the constructor before the renderer is attached', async function() {

			await setLocation('/custom_element_constructor');

			await __Protoblast.Classes.Pledge.after(50);

			function getHtml() {
				return evalPage(function gettingHTML() {

					let main = document.querySelector('[data-he-name="main"]'),
					    main_html,
					    all_html;

					if (main) {
						main_html = main.innerHTML;
					}

					let aics = document.querySelectorAll('assign-in-constructor');

					let assigned_datas = [],
					    i;

					for (i = 0; i < aics.length; i++) {
						assigned_datas.push(aics[i].assigned_data);
					}

					let html = document.querySelector('html');

					return {
						all_html  : html.innerHTML,
						main_html : main_html,
						datas     : assigned_datas,
					};
				});
			}

			let expected_main = '<assign-in-constructor created-on-server="true" data-hid="hserverside-0"></assign-in-constructor>\n' +
								'<assign-in-constructor created-on-server="true" data-hid="hserverside-1"><assign-in-constructor created-on-server="true" data-hid="hserverside-2">child</assign-in-constructor></assign-in-constructor>\n';

			let result = await getHtml();

			assert.strictEqual(result.main_html, expected_main);

			assert.deepStrictEqual(result.datas, [
				{ assigned_in_constructor: 47 },
				{ assigned_in_constructor: 47, added_child: true },
				{ assigned_in_constructor: 47, assigned_in_addchild: 48 }
			]);

			await openHeUrl('/custom_element_constructor');

			result = await getHtml();

			// 'assigned_in_constructor' is not set, because that only happens on the server-side
			assert.deepStrictEqual(result.datas, [
				{ },
				{ added_child: true },
				{ assigned_in_addchild: 48 }
			]);
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

				assert.strictEqual(res, '<he-test testval="bla"></he-test>');
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

				assert.strictEqual(res, '<div><assign-test class="stopped" data-hid="hserverside-0"><div class="title">Bla</div></assign-test></div>');
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
		it('should set the template to render the contents', function(done) {

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

		it('should load the stylesheets of custom elements created in the sync template', async function() {

			await setLocation('/nested_custom_element');

			let result = await getHtml();

			let has_rendered_template = result.html.indexOf('<inner-custom-test><sync-template-test>') > -1;

			assert.strictEqual(has_rendered_template, true, 'The <inner-custom-test> element did not render its contents');

			let has_broken_render = result.html.indexOf('<sync-template-test><span class="test">This is a test!!57</span></sync-template-test>') > -1;

			assert.strictEqual(has_broken_render, false, 'The 3 <sync-template-test> elements all share the same content');

			let has_default_content = result.html.indexOf('<sync-template-test><span class="test">This is a test!!</span></sync-template-test>') > -1;
			assert.strictEqual(has_default_content, true, 'One of the <sync-template-test> elements should have the default content');

			let has_content_5 = result.html.indexOf('<sync-template-test><span class="test">This is a test!!5</span></sync-template-test>') > -1;
			assert.strictEqual(has_content_5, true, 'One of the <sync-template-test> elements should have content ending with 5');

			let has_content_7 = result.html.indexOf('<sync-template-test><span class="test">This is a test!!7</span></sync-template-test>') > -1;
			assert.strictEqual(has_content_7, true, 'One of the <sync-template-test> elements should have content ending with 7');

			let has_css = result.html.indexOf('sync_template_test_style.css') > -1;

			assert.strictEqual(has_css, true, 'The expected CSS file was not found');
		});

		it('should also load the stylesheets when rendered on the browser side', async function() {

			await setLocation('/base_scene');

			await openHeUrl('/nested_custom_element');

			await __Protoblast.Classes.Pledge.after(1000);

			let result = await getHtml();

			let has_rendered_template = result.html.indexOf('<inner-custom-test><sync-template-test>') > -1;
			assert.strictEqual(has_rendered_template, true, 'The <inner-custom-test> element did not render its contents');

			let has_broken_render = result.html.indexOf('<sync-template-test><span class="test">This is a test!!57</span></sync-template-test>') > -1;
			assert.strictEqual(has_broken_render, false, 'The 3 <sync-template-test> elements all share the same content');

			// If an error occurs here, it's probably because of the tabindex="-1" on the span
			let has_default_content = result.html.indexOf('<sync-template-test><span class="test" tabindex="-1">This is a test!!</span></sync-template-test>') > -1;
			assert.strictEqual(has_default_content, true, 'One of the <sync-template-test> elements should have the default content');

			let has_content_5 = result.html.indexOf('<sync-template-test><span class="test">This is a test!!5</span></sync-template-test>') > -1;
			assert.strictEqual(has_content_5, true, 'One of the <sync-template-test> elements should have content ending with 5');

			let has_content_7 = result.html.indexOf('<sync-template-test><span class="test">This is a test!!7</span></sync-template-test>') > -1;
			assert.strictEqual(has_content_7, true, 'One of the <sync-template-test> elements should have content ending with 7');


			let has_css = result.html.indexOf('sync_template_test_style.css') > -1;

			assert.strictEqual(has_css, true, 'The expected CSS file was not found');

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