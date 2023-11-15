var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

let Blast,
    Bound;

describe('CustomElement', function() {

	before(function() {
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
		hawkejs.addViewDirectory(__dirname + '/templates');
		Blast = __Protoblast;
		Bound = Blast.Bound;
	});

	describe('#retained()', function() {
		this.timeout(50000);

		it('should be called when the custom element is retained by hawkejs', async function() {

			await setLocation('/retain_test_one');

			let result = await evalPage(function() {

				let wrapper = document.querySelector('retain-wrapper'),
				    alpha,
				    one;

				if (wrapper) {
					one = wrapper.querySelector('retain-test-one');
				}

				if (one) {
					alpha = one.querySelector('div.alpha');
				}

				let result = {
					found_rto : !!one,
					foo  : one && one.dataset.foo,
					val  : one && one.my_value,
					html : one && one.outerHTML
				};

				return result;
			});

			assert.ok(result.found_rto, 'Did not find the retain-test-one element, did the block get assigned?');

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

			HeTest.setAttribute('my-tokens', {type: 'token_list'});
			HeTest.setAttribute('my-boolean', {type: 'boolean'});
			HeTest.setAttribute('my-number', {type: 'number'});

			HeTest.setAttribute('default-tokens', {type: 'token_list', default: 'a b c'});
			HeTest.setAttribute('default-boolean', {type: 'boolean', default: true});
			HeTest.setAttribute('default-number', {type: 'number', default: 47});

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
				    at;

				if (wrapper) {
					at = wrapper.querySelector('assign-test');
				}

				return {
					has_at                         : !!at,
					html                           : document.body.innerHTML,
					wrapper_id                     : wrapper && wrapper.id,
					at_has_assigned_element        : at && !!at.custom_element,
					at_assigned_element_is_wrapper : at && at.custom_element == wrapper,
					at_wrapper_id                  : at && at.getAttribute('data-wrapper-id'),
				};
			});

			assert.ok(result.wrapper_id == 'atw1', 'The #atw1 wrapper was not found');

			assert.ok(result.has_at, 'The assign-test element was not found inside #atw1');

			assert.strictEqual(result.wrapper_id, 'atw1', 'The wrapper has the wrong ID');
			assert.strictEqual(result.at_wrapper_id, 'atw1', 'The <assign-test> element should have a `data-wrapper-id` attribute equal to the wrapper\'s ID');
			assert.strictEqual(result.at_has_assigned_element, true, 'The <assign-test> element should have an assigned `custom_element` property');
			assert.strictEqual(result.at_assigned_element_is_wrapper, true, 'The <assign-test> element has an assigned `custom_element` property, but it does not match the wrapper');
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

				assertEqualHtml(res, '<he-test default-tokens="a b c" default-boolean="true" default-number="47" testval="bla"></he-test>');
				done();
			});
		});

		it('supports custom DOMTokenList', function() {

			let element = hawkejs.createElement('he-test');
			let tokens = element.default_tokens;

			assert.strictEqual(element.default_tokens.value, 'a b c');

			element.default_tokens.value = 'd e f';
			assert.strictEqual(element.default_tokens+'', 'd e f');
			assert.strictEqual(element.getAttribute('default-tokens'), 'd e f');

			element.default_tokens.add('g', 'h');
			assert.strictEqual(element.getAttribute('default-tokens'), 'd e f g h');

			element.removeAttribute('default-tokens');
			assert.strictEqual(element.default_tokens.value, '', 'Token list was not cleared after removal');

			tokens.add('new');
			assert.strictEqual(element.getAttribute('default-tokens'), 'new');

			tokens = element.my_tokens;

			if (!tokens) {
				throw new Error('The my-tokens is not a valid token list');
			}

			tokens.add('test');
			assert.strictEqual(element.getAttribute('my-tokens'), 'test');

			element.removeAttribute('my-tokens');
			assert.strictEqual(element.my_tokens.value, '');
			
		});

		it('supports default values', function() {

			let element = hawkejs.createElement('he-test');

			assert.strictEqual(element.default_boolean, true);
			assert.strictEqual(element.default_number, 47);
			assert.strictEqual(element.getAttribute('default-boolean'), 'true');
			assert.strictEqual(element.getAttribute('default-number'), '47');
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

				assertEqualHtml(res, '<div><assign-test class="stopped" data-hid="hserverside-0"><div class="title">Bla</div></assign-test></div>');
				done();
			});
		});

		it('should revive the assigned data when sent to the browser', async function() {

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
		it('should set the template to render the contents', function(done) {

			setTimeout(function() {

				var code = `<sync-template-test></sync-template-test><sync-template-test>NOPE</sync-template-test>`;

				var compiled = hawkejs.compile('template_test_2', code);

				hawkejs.render(compiled, {}, function rendered(err, res) {

					if (err) {
						throw err;
					}

					res = res.trim();

					assertEqualHtml(res, '<sync-template-test he-rendered="1"><span class="test">This is a test!!</span></sync-template-test><sync-template-test he-rendered="1"><span class="test">This is a test!!</span></sync-template-test>');

					done();
				});

			}, 4);
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

		it('should allow nested custom elements', async function() {

			await setLocation('/custom_element_render_loop');

			async function testRenderLoopResult(is_server) {

				let result = await queryElements('render-looper');

				assert.strictEqual(result.length, 2);

				let loop_three = result[0],
					loop_one = result[1];

				if (is_server) {
					assert.strictEqual(loop_three.html.indexOf('SERVERTRANSLATED') > -1, true);
				} else {
					assert.strictEqual(loop_three.html.indexOf('CLIENTTRANSLATED') > -1, true);
				}

				// The sub custom-elements should be there
				assert.strictEqual(Bound.String.count(loop_three.html, '<my-button'), 3);
				assert.strictEqual(Bound.String.count(loop_one.html, '<my-button'), 1);

				// And those sub elements have other custom elements too
				assert.strictEqual(Bound.String.count(loop_three.html, '<my-text'), 6);
				assert.strictEqual(Bound.String.count(loop_one.html, '<my-text'), 2);
			}

			await testRenderLoopResult(true);

			await openHeUrl('/empty_base_scene');

			let result = await getBlockData('main');

			assert.strictEqual(result.html.indexOf('class="empty"') > -1, true);

			await openHeUrl('/custom_element_render_loop');

			await testRenderLoopResult(false);
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

					assertEqualHtml(res, '<template-test he-rendered="1">This is the content of template-test</template-test>');
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

					assertEqualHtml(res, '<template-slot-test he-rendered="1"><div data-he-slot="main">This will set the content of the <b>main</b> slot</div></template-slot-test>');
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

				assertEqualHtml(res, '<template-slot-test he-rendered="1"><div data-he-slot="main">Slot test 1</div></template-slot-test>\n<template-slot-test he-rendered="1"><div data-he-slot="main">Slot test 2</div></template-slot-test>');
				done();
			});
		});

		it('should render the contents after the attributes have been set', function(done) {

			let code = `
				<render-after-attributes title={% delayResult("pretty-title") %} ></render-after-attributes>
			`;

			var compiled = hawkejs.compile('template_test_4', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				try {
					assertEqualHtml(res, '<render-after-attributes title="pretty-title" he-rendered="1"><span class="title">pretty-title</span></render-after-attributes>');
				} catch (err) {
					return done(err);
				}
				done();
			});
		});

		it('should render the contents after the attribtues have been set (within extensions)', async function() {

			await setLocation('/render_after_attributes');

			let data = await getBlockData('main');

			assert.strictEqual(data.html.indexOf('>pretty-title</span>') > -1, true);

			await openHeUrl('/render_after_attributes');

			data = await getBlockData('main');

			assert.strictEqual(data.html.indexOf('>pretty-title</span>') > -1, true);
		});

		it('should render nested custom elements', async function() {

			if (!Hawkejs.Element.NestedRootElement) {
				throw new Error('Failed to find the NestedRootElement class')
			}

			await setLocation('/nested_async_elements');

			let data = await getBlockData('main');

			let has_done = data.html.indexOf('nested-async data-index="0">DONE<') > -1;

			assert.strictEqual(has_done, true, 'The nested elements did not render fully');

			let pledge = new __Protoblast.Classes.Pledge();

			hawkejs.render('nested_async_elements', {}, (err, res) => {
				
				if (err) {
					return pledge.reject(err);
				}

				let has_done = res.indexOf('nested-async data-index="0">DONE<') > -1;

				if (!has_done) {
					return pledge.reject(new Error('The nested elements did not render fully'));
				}

				pledge.resolve();
			});

			return pledge;
		});

		it('should render looped nested custom elements', async function() {

			await setLocation('/nested_loop_async_elements');

			let data = await getBlockData('main');

			let has_done = data.html.indexOf('nested-async data-index="3">DONE<') > -1;

			assert.strictEqual(has_done, true, 'The nested elements did not render fully');
		});

		it('should render nested elements in a subrender', async function() {

			await setLocation('/nested_sub_render_element');

			let data = await getBlockData('main');

			let text = despace(data.text);
			assert.strictEqual(text, 'DONE DONE DONE DONE');
		});

		it('should render nested subrenders', async function() {

			await setLocation('/nested_sub_renders');

			let data = await getBlockData('main');

			let text = despace(data.text);

			assert.strictEqual(text, 'DONE DONE DONE DONE DONE DONE DONE DONE');

			let pledge = new __Protoblast.Classes.Pledge();

			hawkejs.render('nested_sub_renders', {}, (err, res) => {
				
				if (err) {
					return pledge.reject(err);
				}

				let has_done = res.indexOf('nested-async data-index="1">DONE<') > -1;

				if (!has_done) {
					return pledge.reject(new Error('The nested elements did not render fully'));
				}

				pledge.resolve();
			});

			return pledge;
		});
	});

	describe('#rendered()', () => {
		it('should call back when the element has been rendered', (done) => {

			let code = `
				<rendered-counter></rendered-counter>
			`;

			var compiled = hawkejs.compile('template_test_rendered_counter', code);

			hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				try {
					assertEqualHtml(res, '<rendered-counter he-rendered="1" rcount="1"></rendered-counter>');
				} catch (err) {
					return done(err);
				}
				done();
			});

		});
	});

});