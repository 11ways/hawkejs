var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs;

const Blast = __Protoblast;
let CloneTestClass;

const RENDER = (done, ...render_args) => {
	let callback = render_args.pop();
	return hawkejs.render(...render_args, (...args) => {
		try {
			callback(...args);
		} catch (err) {
			done(err);
		}
	});
}

describe('Renderer', function() {

	before(function() {
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
		hawkejs.addViewDirectory(__dirname + '/templates');

		CloneTestClass = Blast.Collection.Function.inherits(null, function CloneTestClass(value) {
			this.value = value;
		});

		CloneTestClass.setMethod(function toHawkejs() {
			return new CloneTestClass('!!!' + this.value + '!!!');
		});
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

			RENDER(done, compiled, {}, function rendered(err, res) {

				if (err) {
					throw err;
				}

				res = res.trim();

				assert.strictEqual(res, 'text');
				done();
			});
		});

		it('should correctly serialize variables', function(done) {

			let value = new CloneTestClass('value_to_clone');

			let source = `<% this.doAsyncTest() %>`;
			let compiled = hawkejs.compile(source);

			let renderer = RENDER(done, compiled, {bla: value}, function finished(err, html) {

				if (err) {
					throw err;
				}

				assert.strictEqual(html, 'The value is: "!!!value_to_clone!!!"');

				let dried = Blast.Bound.JSON.dry(renderer);

				let has_cloned_value = dried.indexOf('"!!!value_to_clone!!!"') > -1;
				let has_uncloned_value = dried.indexOf('"value_to_clone"') > -1;

				assert.strictEqual(has_uncloned_value, false, 'The uncloned value was found in the serialized Renderer');
				assert.strictEqual(has_cloned_value, true, 'The cloned value was not found in the serialized Renderer');

				done();
			});

			renderer.set('unused', value);

			renderer.doAsyncTest = function doAsyncTest() {

				return this.async((next) => {
					let source = `The value is: "<%= test_instance.value %>"`;
					let compiled = hawkejs.compile(source);

					let other_renderer = renderer.createSubRenderer();
					other_renderer.set('test_instance', value);
					other_renderer.set('test_instance_2', value);

					let placeholder = other_renderer.addSubtemplate(compiled, {print: false});

					placeholder.getContent((err, block) => {

						if (err) {
							return next(err);
						}

						try {
							next(null, Blast.Bound.JSON.clone(block, 'toHawkejs'));
						} catch (err) {
							next(err);
						}
					});
				});
			};
		});
	});

	describe('#assign(name)', function() {
		it('sets the wanted block content', function(done) {

			RENDER(done, 'assign_test', function doneAssignTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result.trim(), `<div>
<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="assign_test">
This is the internally set main
</he-block>
</div>`);

				done();
			});
		});
	});

	describe('#assign_end()', function() {
		it('should claim the siblings', function(done) {
			RENDER(done, 'assign_end', function doneAssignTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result.trim(), '<div class="a">\n\t<div class="b">\n\t\t<div class="c">\n\t\t\t<label class="d">\n\t\t\t\t<he-block data-hid="hserverside-0" data-he-name="title">DEFAULT</he-block>\n\t\t\t</label>\n\t\t</div>\n\t</div>\n\t<div class="row">\n\t\t\n\t</div>\n</div>');

				done();
			});
		});
	});

	describe('#expands(template)', function() {
		it('expands into the given template', function(done) {
			RENDER(done, 'expand_test', function doneExpandTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result.trim(), `<div class="main">
	<hr>
	<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="expand_test">
This is the main content
</he-block>
</div>`);

				done();
			});
		});

		it('should be possible to use the {% extend %} expression instead', function(done) {

			RENDER(done, 'extend_test', function doneExpandTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result.trim(), `<div class="main">
	<hr>
	<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="extend_test">
This is the main content
</he-block>
</div>`);

				done();
			});

		});
	});

	describe('#start(name, options)', function() {
		it('should add block classes if given', function(done) {

			RENDER(done, 'assign_test_class', function doneExpandTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result.trim(), '<div>\n<he-block class="with-class" data-hid="hserverside-0" data-he-name="main" data-he-template="assign_test_class">\nShould have class set\n</he-block>\n</div>');
				done();
			});

		});
	});

	describe('#addSubTemplate(template, options)', () => {
		it('should correctly convert the variables', (done) => {

			let value = new CloneTestClass('value_to_clone');

			let renderer = hawkejs.createRenderer();
			renderer.set('test_instance', value);
			renderer.set('test_instance_2', value);

			let sub_renderer = renderer.createSubRenderer();
			sub_renderer.set('test_instance', value);

			let source = `The value is: "<%= test_instance.value %>"`;

			let compiled = hawkejs.compile(source);
			let placeholder = sub_renderer.addSubtemplate(compiled, {print: false});

			//let cloned = Blast.Bound.JSON.clone(value, 'toHawkejs')

			placeholder.getContent(function gotContent(err, block_buffer) {

				if (err) {
					return done(err);
				}

				try {

					let dried = Blast.Bound.JSON.dry(block_buffer);

					let has_cloned_value = dried.indexOf('"!!!value_to_clone!!!"') > -1;
					let has_uncloned_value = dried.indexOf('"value_to_clone"') > -1;

					assert.strictEqual(has_uncloned_value, false, 'The uncloned value was found in the serialized BlockBuffer');
					assert.strictEqual(has_cloned_value, true, 'The cloned value was not found in the serialized BlockBuffer');

					assert.strictEqual(block_buffer.toHTML(), 'The value is: "!!!value_to_clone!!!"');

				} catch (err) {
					return done(err);
				}

				testFoundation();
			});

			async function testFoundation() {

				let dried = Blast.Bound.JSON.dry(renderer);

				let has_cloned_value = dried.indexOf('"!!!value_to_clone!!!"') > -1;
				let has_uncloned_value = dried.indexOf('"value_to_clone"') > -1;

				try {
					assert.strictEqual(has_uncloned_value, false, 'The uncloned value was found in the serialized Renderer');
					assert.strictEqual(has_cloned_value, true, 'The cloned value was not found in the serialized Renderer');
				} catch (err) {
					return done(err);
				}

				dried = Blast.Bound.JSON.dry(sub_renderer);

				has_cloned_value = dried.indexOf('"!!!value_to_clone!!!"') > -1;
				has_uncloned_value = dried.indexOf('"value_to_clone"') > -1;

				try {
					assert.strictEqual(has_uncloned_value, false, 'The uncloned value was found in the serialized sub-Renderer');
					assert.strictEqual(has_cloned_value, true, 'The cloned value was not found in the serialized sub-Renderer');
				} catch (err) {
					return done(err);
				}

				let foundation = renderer.foundation();

				let content = await foundation.getContent();
				//console.log('Content:', content)

				has_cloned_value = content.indexOf('"!!!value_to_clone!!!"') > -1;
				has_uncloned_value = content.indexOf('"value_to_clone"') > -1;

				try {
					assert.strictEqual(has_uncloned_value, false, 'The uncloned value was found in the foundation content');
					assert.strictEqual(has_cloned_value, true, 'The cloned value was not found in the foundation content');
				} catch (err) {
					return done(err);
				}

				done();
			}
		});
	});

	describe('#implement(name)', function() {
		it('should print the given element', function(done) {
			RENDER(done, 'implement_test', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result, `S: This EJS example can't be more simple.-`);
				done();
			});
		});

		it('should include assignments', function(done) {
			RENDER(done, 'implement_blocks', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, `--
»<he-block data-hid="hserverside-0" data-he-name="test" data-he-template="partials/text_block">TEXT_BLOCK PARTIAL</he-block>«`);
				done();
			});
		});

		it('should work on assignments', function(done) {
			RENDER(done, 'expand_start_implement_assign', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, `<div class="main">
	<hr>
	<he-block data-hid="hserverside-1" data-he-name="main" data-he-template="expand_start_implement_assign">[<he-block data-hid="hserverside-0" data-he-name="test" data-he-template="partials/text_block">TEXT_BLOCK PARTIAL</he-block>]</he-block>\n</div>`);
				done();
			});
		});
	});

	describe('#include(name)', function() {
		it('should only be executed if in a used block', function(done) {
			RENDER(done, 'expand_start_include_assign', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, `<div class="main">
	<hr>
	<he-block data-hid="hserverside-1" data-he-name="main" data-he-template="expand_start_include_assign">[<he-block data-hid="hserverside-0" data-he-name="test"></he-block>]</he-block>\n</div>`);
				done();
			});
		});

		it('should set the correct ancestor element', function(done) {

			RENDER(done, 'include_parent_test', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, `<div><span>The parent of this span is "DIV"</span></div>`);
				done();
			});
		});

		it('should pass through the variables', function(done) {

			let root_variables = {
				alfa  : 'ALFA',
				name  : 'root',
				count : 0,
			};

			RENDER(done, 'include_with_variables', root_variables, function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, `ROOT:
				alfa: ALFA
				name: root
				extra:
				count: 0
				
				
				FIRST:
				alfa: ALFA
				name: root
				extra:
				count: 1
				
				
				SECOND:
				alfa: ALFA
				name: included
				extra: 1
				count: 2
				
				ROOT FINAL:
				alfa: ALFA
				name: root
				extra:
				count: 2`);

				done();
			});

		});
	});

	describe('#partial(name)', function() {
		it('should render a partial in a new scope', function(done) {
			RENDER(done, 'print_partial', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, `<div>
<span>Printing:</span>
<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="print_partial">Printing Main</he-block>
<span>Partial:</span>
<he-block data-hid="hserverside-1" data-he-name="main" data-he-template="partials/partial_with_own_main">Partial Main</he-block>


</div>
<hr>`);
				done();
			});
		});

		it('should allow using scoped blocks with implements', function(done) {
			RENDER(done, 'partial_with_implements', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, "<b><he-block data-hid=\"hserverside-0\" data-he-name=\"text\" data-he-template=\"partials/create_text_block\">TEXT: bold</he-block></b>\n\n\n<i><he-block data-hid=\"hserverside-1\" data-he-name=\"text\" data-he-template=\"partials/create_text_block\">TEXT: italic</he-block></i>");
				done();
			});
		});
	});

	describe('Template#switchTemplate(name, variables)', function() {
		it('should allow using scoped blocks that switch target blocks', function(done) {
			RENDER(done, 'partial_with_switch_template', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assertEqualHtml(result, '<span><he-block data-hid="hserverside-0" data-he-name="text" data-he-template="partials/switch_bold"><b>bold</b></he-block></span>');
				done();
			});
		});

		it('should allow switching to another template in the start template', function(done) {
			RENDER(done, 'partial_with_root_switch_and_implement', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result, 'This is wrapper text "wrapper"\n<he-block data-hid="hserverside-0" data-he-name="entries" data-he-template="partials/entries">Text: entries</he-block>');
				done();
			});
		});
	});

	describe('#foundation()', function() {
		it('should not wait for placeholders that are waiting for itself', function(done) {

			let renderer = RENDER(done, 'implement_with_foundation_extension', function doneImplement(err, result) {

				if (err) {
					return done(err);
				}

				if (!result) {
					return done(new Error('Render result was empty'));
				}

				if (result === 'null') {
					return done(new Error('Render result was the string "null"'));
				}
				
				result = despace(result);

				// Json-dry v1: <title></title> <link rel="preload" href="/hawkejs/hawkejs-client.js" as="script"> <!-- Static hawkejs variables --> <script>window._hawkejs_static_expose = JSON.parse('{}');</script> <!-- Request specific variables --> <script>window._initHawkejs = JSON.parse('[{},{"script_path":"","style_path":"","app_version":""},{"value":{"variables":"~0","expose_to_scene":{},"blocks":{"value":{"entries":[["implement_with_foundation_extension__main__",{"value":{"name":"implement_with_foundation_extension__main__","origin":{"value":{"name":"implement_with_foundation_extension","theme":"","source_name":"implement_with_foundation_extension"},"namespace":"Hawkejs","dry_class":"Template","dry":"toDry","drypath":["2","value","blocks","value","entries","0","1","value","origin"]},"variables":"~0","options":{"start_call":true},"block_id":"block-0"},"namespace":"Hawkejs","dry_class":"BlockBuffer","dry":"toDry","drypath":["2","value","blocks","value","entries","0","1"]}],["partials/extend_into_base_foundation__main__1",{"value":{"name":"partials/extend_into_base_foundation__main__1","origin":{"value":{"name":"partials/extend_into_base_foundation","theme":"","source_name":"partials/extend_into_base_foundation"},"namespace":"Hawkejs","dry_class":"Template","dry":"toDry","drypath":["2","value","blocks","value","entries","1","1","value","origin"]},"variables":{},"options":{"start_call":true},"block_id":"block-1"},"namespace":"Hawkejs","dry_class":"BlockBuffer","dry":"toDry","drypath":["2","value","blocks","value","entries","1","1"]}],["base_with_foundation__main__",{"value":{"name":"base_with_foundation__main__","origin":{"value":{"name":"base_with_foundation","theme":"","source_name":"base_with_foundation"},"namespace":"Hawkejs","dry_class":"Template","dry":"toDry","drypath":["2","value","blocks","value","entries","2","1","value","origin"]},"variables":"~2~value~blocks~value~entries~1~1~value~variables","options":{"start_call":true},"block_id":"block-2"},"namespace":"Hawkejs","dry_class":"BlockBuffer","dry":"toDry","drypath":["2","value","blocks","value","entries","2","1"]}]]},"namespace":"Hawkejs","dry_class":"Blocks","dry":"toDry","drypath":["2","value","blocks"]},"last_template":"~2~value~blocks~value~entries~2~1~value~origin","focus_block":null,"assigns":{},"theme":"","queued_templates":[{"value":{"templates":["~2~value~blocks~value~entries~0~1~value~origin"],"active":"~2~value~queued_templates~0~value~templates~0","options":{},"theme":""},"namespace":"Hawkejs","dry_class":"Templates","dry":"toDry","drypath":["2","value","queued_templates","0"]}],"dialogs":[],"base_id":"serverside","scripts":null,"styles":null,"is_for_client_side":null},"namespace":"Hawkejs","dry_class":"Renderer","dry":"toDry","drypath":["2"]}]');</script> <script>if (typeof _initHawkejsFunction == "function") {window.hawkejs = _initHawkejsFunction()}</script> <script src="/hawkejs/hawkejs-client.js"></script>
				// Json-dry v2: <title></title> <link rel="preload" href="/hawkejs/hawkejs-client.js" as="script"> <!-- Static hawkejs variables --> <script>window._hawkejs_static_expose = JSON.parse('{"$refs":[],"$root":{}}');</script> <!-- Request specific variables --> <script>window._initHawkejs = JSON.parse('{"$refs":[{},"implement_with_foundation_extension__main__","implement_with_foundation_extension","partials/extend_into_base_foundation__main__1","partials/extend_into_base_foundation","base_with_foundation__main__","base_with_foundation",{},{"value":{"name":{"~r":6},"theme":"","source_name":{"~r":6}},"namespace":"Hawkejs","dry_class":"Template","dry":"toDry"},{"value":{"name":{"~r":2},"theme":"","source_name":{"~r":2}},"namespace":"Hawkejs","dry_class":"Template","dry":"toDry"}],"$root":[{"~r":0},{"script_path":"","style_path":"","app_version":""},{"value":{"variables":{"~r":0},"expose_to_scene":{},"blocks":{"value":{"entries":[[{"~r":1},{"value":{"name":{"~r":1},"origin":{"~r":9},"variables":{"~r":0},"options":{"start_call":true},"block_id":"block-0"},"namespace":"Hawkejs","dry_class":"BlockBuffer","dry":"toDry"}],[{"~r":3},{"value":{"name":{"~r":3},"origin":{"value":{"name":{"~r":4},"theme":"","source_name":{"~r":4}},"namespace":"Hawkejs","dry_class":"Template","dry":"toDry"},"variables":{"~r":7},"options":{"start_call":true},"block_id":"block-1"},"namespace":"Hawkejs","dry_class":"BlockBuffer","dry":"toDry"}],[{"~r":5},{"value":{"name":{"~r":5},"origin":{"~r":8},"variables":{"~r":7},"options":{"start_call":true},"block_id":"block-2"},"namespace":"Hawkejs","dry_class":"BlockBuffer","dry":"toDry"}]]},"namespace":"Hawkejs","dry_class":"Blocks","dry":"toDry"},"last_template":{"~r":8},"focus_block":null,"assigns":{},"theme":"","queued_templates":[{"value":{"templates":[{"~r":9}],"active":{"~r":9},"options":{},"theme":""},"namespace":"Hawkejs","dry_class":"Templates","dry":"toDry"}],"dialogs":[],"base_id":"serverside","scripts":null,"styles":null,"is_for_client_side":null},"namespace":"Hawkejs","dry_class":"Renderer","dry":"toDry"}]}');</script> <script>if (typeof _initHawkejsFunction == "function") {window.hawkejs = _initHawkejsFunction()}</script> <script src="/hawkejs/hawkejs-client.js"></script>

				try {
					assert.strictEqual(result.indexOf('window._initHawkejs = ') > -1, true);
					assert.strictEqual(result.indexOf('window._hawkejs_static_expose = ') > -1, true);
				} catch (err) {
					return done(err);
				}

				done();
			});
		});
	});

	describe('#setTheme(name)', function() {
		it('should set the theme to use for partials', function(done) {

			let renderer = RENDER(done, 'implement_blocks', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result, `--\n»<he-block data-hid="hserverside-0" data-he-name="test" data-he-template="partials/text_block" data-theme="dark">DARK TEXT_BLOCK PARTIAL</he-block>«`);
				done();
			});

			renderer.setTheme('dark');
		});

		it('should set the theme to use for extensions', function(done) {

			let renderer = RENDER(done, 'expand_test', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result, `<div class="main dark">\n\t<hr>\n\t<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="expand_test" data-theme="dark">\nThis is the main content\n</he-block>\n</div>`);
				done();
			});

			renderer.setTheme('dark');
		});
	});

	describe('#$0', function() {
		it('is a local property that refers to the current element', function(done) {

			let renderer = RENDER(done, 'local_property_test', function doneTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result, `<div class="Alfa">
	Alfa
	<span id="myspan">
		myspan

		<hr>
		<p class="Beta">
			This Beta is in Alfa
		</p>
	</span>
</div>`);
				done();
			});
		});
	});

	describe('#style()', function() {
		it('should add stylesheet elements', function(done) {
			RENDER(done, 'style_test', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				let count;

				count = countString(result, '<link rel="preload" href="/alpha.css" as="style">');
				assert.strictEqual(count, 1, 'The alpha.css style should be preloaded exactly once, but it is preloaded ' + count + ' times');

				count = countString(result, '<link rel="preload" href="/beta.css" as="style">')
				assert.strictEqual(count, 1, 'The beta.css style should be preloaded exactly once, but it is preloaded ' + count + ' times');

				count = countString(result, '<link href="/alpha.css" rel="stylesheet">')
				assert.strictEqual(count, 1, 'The alpha.css style should be loaded exactly once, but it is loaded ' + count + ' times');

				count = countString(result, '<link href="/beta.css" rel="stylesheet">')
				assert.strictEqual(count, 1, 'The beta.css style should be loaded exactly once, but it is loaded ' + count + ' times');

				count = countString(result, '<link rel="preload" href="/test.png" as="image">');
				assert.strictEqual(count, 1, 'The test.png image should be preloaded exactly once, but it is preloaded ' + count + ' times');

				done();
			});
		});
	});

	describe('#showDialog(template, variables, options)', function() {
		this.timeout(50000)

		it('should work without dialogs', async function() {

			// Make sure the template itself works without the dialog stuff
			await setLocation('/dialog_test');

			let main = await getBlockData('main');

			assertEqualHtml(main.text, 'This is the new main body Include Test Contents: bla Contents: AfterBody');
			assert.strictEqual(main.location, '/dialog_test');
		});

		it('should show a dialog on the page', async function() {

			actions['/dialog_test'] = function(req, res, renderer, responder) {

				renderer.showDialog('partials/dialog_contents', {message: 'MyMessage'});

				respondWithRender('dialog_test', renderer, responder);
			};

			await setLocation('/dialog_test');

			let main = await getBlockData('main');

			assertEqualHtml(main.text, 'This is the new main body Include Test Contents: bla Contents: AfterBody');
			assert.strictEqual(main.location, '/dialog_test');

			let result = await evalPage(function() {

				let dialog = document.querySelector('he-dialog');

				return {
					element    : dialog,
					html       : dialog.innerHTML,
					is_visible : dialog.isVisible(),
				}
			});

			assert.strictEqual(result.is_visible, true, 'The dialog is not visible, but it should be');
			assert.strictEqual(result.html.indexOf('This is the content of the dialog: MyMessage') > -1, true, 'The dialog does not contain the expected text. HTML was:\n' + result.html);

			result = await evalPage(function() {
				let dialog = document.querySelector('he-dialog');
				dialog.close();

				return {
					in_document : document.contains(dialog),
					is_visible  : dialog.isVisible(),
				}
			});

			assert.strictEqual(result.in_document, false, 'The dialog should no longer be in the document after closing');
			assert.strictEqual(result.is_visible, false, 'The dialog should no longer be visible after closing');

		});
	});

	describe('#makeDialog()', () => {
		it('should create dialogs', async () => {

			let renderer = hawkejs.createRenderer();

			let html = await renderer.renderHTML('render_dialog_with_custom_element');
			html = despace(html);

			assertEqualHtml(html, `<print-attribute text="Hello World" he-rendered="1">Hello World </print-attribute>`);
		});
	});

	describe('#renderHTML()', function() {

		let devices = [
			{label: 'One'},
			{label: 'Two'}
		];

		it('should render a template and return the HTML', async function() {

			let renderer = hawkejs.createRenderer();

			let html = await renderer.renderHTML('render_to_html', {devices});
			html = despace(html);

			assertEqualHtml(html, `Render this to HTML! <div> Text </div> Device: One<br> Device: Two<br>`);
		});

		it('should also work on the browser side', async function() {

			await setLocation('/base_scene');

			let result = await evalPage(async function() {

				let devices = [
					{label: 'One'},
					{label: 'Two'}
				];

				let renderer = hawkejs.createRenderer();

				let html = await renderer.renderHTML('render_to_html', {devices});

				return {
					html : html
				};
			});

			assertEqualHtml(result.html, `Render this to HTML! <div> Text </div> Device: One<br> Device: Two<br>`);
		});
	});

	describe('#createOpenElement(name)', function() {

		it('should close void elements silently', async function() {

			let renderer = hawkejs.createRenderer();

			let html = await renderer.renderHTML('render_svg_elements');

			assertEqualHtml(html, `<div class="main"> <hr> <he-block data-hid="hserverside-0" data-he-name="main" data-he-template="render_svg_elements"> <svg> <g> <path/> </g> </svg> <br> </he-block> </div>`);
		});
	});
});

function countString(source, needle) {
	return __Protoblast.Bound.String.count(source, needle);
}

function createTests(tests) {
	for (let i = 0; i < tests.length; i++) {
		let code = tests[i][0],
		    title = tests[i][0].replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t'),
		    result = tests[i][1];

		if (title.length > 74) {
			title = title.slice(0, 72) + '…';
		}

		it(title, function(next) {
			test_id++;

			var compiled = hawkejs.compile('test_' + test_id, code),
			    vars;

			vars = {
				empty_arr : [],
				full_arr  : [0],
				single    : [0],
				numbers   : [0, 1, 2, 3],
				empty_obj : {},
				date      : new Date('2019-03-07'),
				test      : {
					name  : 'testname',
					one   : 1,
					three : 3,
					two   : {
						three: {
							four: 4
						}
					}
				}
			};

			hawkejs.render(compiled, vars, function done(err, res) {

				if (err) {
					return next(err);
				}

				assertEqualHtml(res, result);
				next();
			});
		});
	}
}