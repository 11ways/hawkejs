var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

const Blast = __Protoblast;

describe('CustomElement', function() {

	before(function() {
		hawkejs = loadHawkejs();
	});

	describe('#retained()', function() {
		this.timeout(50000);

		it('should be called when the custom element is retained by hawkejs', async function() {

			await setLocation('/retain_test_one');

			let result = await evalPage(function() {

				let wrapper = document.querySelector('retain-wrapper'),
				    one = wrapper.querySelector('retain-test-one'),
				    alpha = one.querySelector('div.alpha');

				let result = {
					foo  : one.dataset.foo,
					val  : one.my_value,
					html : one.outerHTML
				};

				return result;
			});

			assert.strictEqual(result.foo, 'bar', 'The foo dataset attribute should have been "bar"');
			assertEqualHtml(result.html, '<retain-test-one he-rendered="1" data-foo="bar" data-hid="hserverside-2">Contents: bar</retain-test-one>');
			assert.strictEqual(result.val, 48, 'The assigned my_value property should be 48');
		});

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

			assertEqualHtml(result.main_html, expected_main);

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

			assertEqualHtml(test.outerHTML, expected_html);

			await setLocation('/base_scene');

			let result = await evalPage(function() {

				let test = document.createElement('html-in-constructor');

				return {
					html        : test.outerHTML,
					constructor : test.constructor.name,
				}
			});

			assert.strictEqual(result.constructor, 'HtmlInConstructor');

			assertEqualHtml(result.html, expected_html);
		});

		it('should call the constructor before the `introduced` method is executed', async function() {

			let test = Hawkejs.Hawkejs.createElement('html-in-constructor');

			let expected_html = '<bold data-test="47">This is a test</bold>';

			// Manually call the introduced method
			test.introduced();

			assertEqualHtml(test.innerHTML, expected_html);

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
			assertEqualHtml(result.html, expected_html);
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

			assertEqualHtml(result.html, '<bold>This is a test</bold><html-in-constructor my-test="47"><bold>deeper</bold></html-in-constructor>');
		});

		it('should allow other elements being set & revived', async function() {

			await setLocation('/assign_test_element_data');

			let result = await evalPage(function() {

				let wrapper = document.getElementById('atw1'),
				    at = wrapper.querySelector('assign-test');

				return {
					html                           : document.body.innerHTML,
					wrapper_id                     : wrapper.id,
					at_has_assigned_element        : !!at.custom_element,
					at_assigned_element_is_wrapper : at.custom_element == wrapper,
					at_wrapper_id                  : at.getAttribute('data-wrapper-id'),
				};
			});

			assert.strictEqual(result.wrapper_id, 'atw1', 'The wrapper has the wrong ID');
			assert.strictEqual(result.at_wrapper_id, 'atw1', 'The <assign-test> element should have a `data-wrapper-id` attribute equal to the wrapper\'s ID');
			assert.strictEqual(result.at_has_assigned_element, true, 'The <assign-test> element should have an assigned `custom_element` property');
			assert.strictEqual(result.at_assigned_element_is_wrapper, true, 'The <assign-test> element has an assigned `custom_element` property, but it does not match the wrapper');
		});
	});

	describe('.setAttribute(name)', function() {
		it('should add an attribute that is also accessible via a getter/setter', async function() {

			let code = `
				<% el = create_element('he-test') %>
				<% el.testval = "bla" %>
				<%= el %>
			`;

			let compiled = hawkejs.compile('he_test_1', code);

			let result = await renderWithPledge(compiled);

			assertEqualHtml(result.html, '<he-test testval="bla"></he-test>');
		});
	});

	describe('.setAssignedProperty(name)', function() {
		it('should execute the special assigned function', async function() {

			let code = `<div><%
				at = createElement('assign-test');
				at.stopped = "test";
				at.title = "Bla";
				print(at);
				%></div>`;

			let compiled = hawkejs.compile('he_test_2', code);

			let result = await renderWithPledge(compiled);
			assertEqualHtml(result.html, '<div><assign-test class="stopped" data-hid="hserverside-0"><div class="title">Bla</div></assign-test></div>');
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

			assertEqualHtml(html, `<span tabindex="0">Element:</span> <assign-test data-hid="hserverside-0"><div class="title" data-hid="hserverside-0">First title</div></assign-test> Tittle AD: First title`);

			await openHeUrl('/assigned_data_test?title=Ajax title');

			html = await getMainHtml();

			assertEqualHtml(html, `<span tabindex="0">Element:</span> <assign-test data-hid="h0-0"><div class="title">Ajax title</div></assign-test> Tittle AD: Ajax title`);
		});

	});

	describe('.setTemplate(source, is_plain_html)', function() {
		it('should set the template to render the contents', async function() {

			let code = `<sync-template-test></sync-template-test><sync-template-test>NOPE</sync-template-test>`;

			let compiled = hawkejs.compile('template_test_2', code);

			let result = await renderWithPledge(compiled);
			assertEqualHtml(result.html, '<sync-template-test he-rendered="1"><span class="test">This is a test!!</span></sync-template-test><sync-template-test he-rendered="1"><span class="test">This is a test!!</span></sync-template-test>');
		});

		it('should load the stylesheets of custom elements created in the sync template', async function() {

			await setLocation('/nested_custom_element');

			let result = await getHtml();

			let has_rendered_template = result.html.indexOf('<inner-custom-test he-rendered="1"><sync-template-test') > -1;

			assert.strictEqual(has_rendered_template, true, 'The <inner-custom-test> element did not render its contents');

			let has_broken_render = result.html.indexOf('<sync-template-test><span class="test">This is a test!!57</span></sync-template-test>') > -1;

			assert.strictEqual(has_broken_render, false, 'The 3 <sync-template-test> elements all share the same content');

			let has_default_content = result.html.indexOf('<sync-template-test he-rendered="1"><span class="test">This is a test!!</span></sync-template-test>') > -1;
			assert.strictEqual(has_default_content, true, 'One of the <sync-template-test> elements should have the default content');

			let has_content_5 = result.html.indexOf('><span class="test">This is a test!!5</span></sync-template-test>') > -1;
			assert.strictEqual(has_content_5, true, 'One of the <sync-template-test> elements should have content ending with 5');

			// This <sync-template-test> element gets registered for some reason, so it has a hserverside hawkejs id...
			// No idea why though
			let has_content_7 = result.html.indexOf('<span class="test">This is a test!!7</span></sync-template-test>') > -1;
			assert.strictEqual(has_content_7, true, 'One of the <sync-template-test> elements should have content ending with 7');

			let has_css = result.html.indexOf('sync_template_test_style.css') > -1;

			assert.strictEqual(has_css, true, 'The expected CSS file was not found');
		});

		it('should also load the stylesheets when rendered on the browser side', async function() {

			await setLocation('/base_scene');

			await openHeUrl('/nested_custom_element');

			await __Protoblast.Classes.Pledge.after(1000);

			let result = await getHtml();
			result.html = simplifyHtml(result.html);

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

		it('should load the stylesheets of custom elements created inside other custom elements', async function() {

			await setLocation('/custom_element_nested_styles');

			let result = await getHtml();

			let has_styled_button = result.html.indexOf('>Styled!</my-styled-button>') > -1;

			assert.strictEqual(has_styled_button, true, 'The <my-styled-button> is missing');

			let has_style = result.html.indexOf('href="/my_styled_button.css"') > -1;

			assert.strictEqual(has_style, true, 'The stylesheet for <my-styled-button> is missing');

			await setLocation('/append_element_nested_styles');

			result = await getHtml();

			has_style = result.html.indexOf('href="/my_styled_button.css"') > -1;

			assert.strictEqual(has_style, true, 'The stylesheet for <my-styled-button> is missing');

			await setLocation('/printed_element_nested_styles');

			result = await getHtml();

			has_style = result.html.indexOf('href="/my_styled_button.css"') > -1;

			assert.strictEqual(has_style, true, 'The stylesheet for <my-styled-button> is missing');

			await setLocation('/interpreted_element_nested_styles');

			result = await getHtml();

			has_style = result.html.indexOf('href="/my_styled_button.css"') > -1;

			assert.strictEqual(has_style, true, 'The stylesheet for <my-styled-button> is missing');
		});
	});

	describe('.setTemplateFile(path)', function() {
		it('should set the template to use for the content of the element', async function() {

			let TemplateTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function TemplateTest() {
				return TemplateTest.super.call(this);
			});

			TemplateTest.setTemplateFile('partials/template_test');

			await Blast.Classes.Pledge.after(4);

			let code = `<template-test></template-test>`;

			let compiled = hawkejs.compile('template_test_1', code);

			let result = await renderWithPledge(compiled);
			assertEqualHtml(result.html, '<template-test he-rendered="1">This is the content of template-test</template-test>');
		});

		it('should allow the usage of slots', async function() {

			let TemplateSlotTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function TemplateSlotTest() {
				return TemplateSlotTest.super.call(this);
			});

			TemplateSlotTest.setTemplateFile('partials/template_slot_test');

			await Blast.Classes.Pledge.after(4);

			let code = `<template-slot-test>
	<div slot="main">This will set the content of the <b>main</b> slot</div>
</template-slot-test>`;

			let compiled = hawkejs.compile('template_test_2', code);

			let result = await renderWithPledge(compiled);

			assertEqualHtml(result.html, '<template-slot-test he-rendered="1"><slot name="main"><div slot="main">This will set the content of the <b>main</b> slot</div></slot></template-slot-test>');
		});

		it('should not confuse slots with similar elements', async function() {

			let code = `<template-slot-test>
	<div slot="main">Slot test 1</div>
</template-slot-test>
<template-slot-test>
	<div slot="main">Slot test 2</div>
</template-slot-test>`;

			let compiled = hawkejs.compile('template_test_3', code);

			let result = await renderWithPledge(compiled);

			assertEqualHtml(result.html, '<template-slot-test he-rendered="1"><slot name="main"><div slot="main">Slot test 1</div></slot></template-slot-test> <template-slot-test he-rendered="1"><slot name="main"><div slot="main">Slot test 2</div></slot></template-slot-test>');
		});

		it('should render the contents after the attributes have been set', async function() {

			let code = `
				<render-after-attributes title={% delayResult("pretty-title") %} ></render-after-attributes>
			`;

			let compiled = hawkejs.compile('template_test_4', code);

			let result = await renderWithPledge(compiled);

			assertEqualHtml(result.html, '<render-after-attributes title="pretty-title" he-rendered="1"><span class="title">pretty-title</span></render-after-attributes>');
		});

		it('should render the contents after the attributes have been set (within extensions)', async function() {

			await setLocation('/render_after_attributes');

			let data = await getBlockData('main');

			assert.strictEqual(data.html.indexOf('>pretty-title</span>') > -1, true);

			await openHeUrl('/render_after_attributes');

			data = await getBlockData('main');

			assert.strictEqual(data.html.indexOf('>pretty-title</span>') > -1, true);
		});

		it('should set the corrent $0 variable inside the template', async function() {

			let code = `
				<span><parent-element-sync-test></parent-element-sync-test></span>
				<div><parent-element-async-test></parent-element-async-test></div>
			`;

			let compiled = hawkejs.compile('template_parent-element-test', code);

			let result = await renderWithPledge(compiled);

			assertEqualHtml(result.html, `
				<span><parent-element-sync-test he-rendered="1">Self: PARENT-ELEMENT-SYNC-TEST - Parent: SPAN</parent-element-sync-test></span>
				<div><parent-element-async-test he-rendered="1">Self: PARENT-ELEMENT-ASYNC-TEST - Parent: DIV</parent-element-async-test></div>
			`);
		});
	});

	describe('.addElementGetter(name, selector)', () => {
		it('should return the correct element', async () => {

			let custom_element = Hawkejs.Hawkejs.createElement('my-sync-span');
			await custom_element.rerender();

			assert.strictEqual(custom_element.innerHTML, '<span class="test">Test this sync template!</span>');

			let main_span = custom_element.main_span;

			assert.strictEqual(main_span.tagName, 'SPAN');

			main_span.textContent = 'Changed!';

			assert.strictEqual(custom_element.innerHTML, '<span class="test">Changed!</span>');

			await custom_element.rerender();
			assert.strictEqual(custom_element.innerHTML, '<span class="test">Test this sync template!</span>');

			main_span = custom_element.main_span;
			assert.strictEqual(main_span.innerHTML, 'Test this sync template!');
		});
	});

	describe('#rendered()', () => {
		it('should call back when the element has been rendered', async () => {

			let code = `
				<rendered-counter></rendered-counter>
			`;

			let compiled = hawkejs.compile('template_test_rendered_counter', code);

			let result = await renderWithPledge(compiled);
			assertEqualHtml(result.html, '<rendered-counter he-rendered="1" rcount="1"></rendered-counter>');
		});
	});

});