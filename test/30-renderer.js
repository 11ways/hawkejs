var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs;

describe('Renderer', function() {

	before(function() {
		hawkejs = createHawkejsInstance();
		hawkejs.parallel_task_limit = 1;
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
			hawkejs.render('assign_end', function doneAssignTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result.trim(), '<div class="a">\n\t<div class="b">\n\t\t<div class="c">\n\t\t\t<label class="d">\n\t\t\t\t<he-block data-hid="hserverside-0" data-he-name="title">DEFAULT</he-block>\n\t\t\t</label>\n\t\t</div>\n\t</div>\n\t<div class="row">\n\t\t\n\t</div>\n</div>');

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
	<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="expand_test">
This is the main content
</he-block>
</div>`);

				done();
			});
		});

		it('should be possible to use the {% extend %} expression instead', function(done) {

			hawkejs.render('extend_test', function doneExpandTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result.trim(), `<div class="main">
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

			hawkejs.render('assign_test_class', function doneExpandTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result.trim(), '<div>\n<he-block class="with-class" data-hid="hserverside-0" data-he-name="main" data-he-template="assign_test_class">\nShould have class set\n</he-block>\n</div>');
				done();
			});

		});
	});

	describe('#implement(name)', function() {
		it('should print the given element', function(done) {
			hawkejs.render('implement_test', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result, `S: This EJS example can't be more simple.-`);
				done();
			});
		});

		it('should include assignments', function(done) {
			hawkejs.render('implement_blocks', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assert.strictEqual(result, `--
»<he-block data-hid="hserverside-0" data-he-name="test" data-he-template="partials/text_block">TEXT_BLOCK PARTIAL</he-block>«`);
				done();
			});
		});

		it('should work on assignments', function(done) {
			hawkejs.render('expand_start_implement_assign', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assert.strictEqual(result, `<div class="main">
	<hr>
	<he-block data-hid="hserverside-1" data-he-name="main" data-he-template="expand_start_implement_assign">[<he-block data-hid="hserverside-0" data-he-name="test" data-he-template="partials/text_block">TEXT_BLOCK PARTIAL</he-block>]</he-block>\n</div>`);
				done();
			});
		});
	});

	describe('#include(name)', function() {
		it('should only be executed if in a used block', function(done) {
			hawkejs.render('expand_start_include_assign', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assert.strictEqual(result, `<div class="main">
	<hr>
	<he-block data-hid="hserverside-1" data-he-name="main" data-he-template="expand_start_include_assign">[<he-block data-hid="hserverside-0" data-he-name="test"></he-block>]</he-block>\n</div>`);
				done();
			});
		});
	});

	describe('#partial(name)', function() {
		it('should render a partial in a new scope', function(done) {
			hawkejs.render('print_partial', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assert.strictEqual(result, `<div>
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
			hawkejs.render('partial_with_implements', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assert.strictEqual(result, "<b><he-block data-hid=\"hserverside-0\" data-he-name=\"text\" data-he-template=\"partials/create_text_block\">TEXT: bold</he-block></b>\n\n\n<i><he-block data-hid=\"hserverside-1\" data-he-name=\"text\" data-he-template=\"partials/create_text_block\">TEXT: italic</he-block></i>");
				done();
			});
		});
	});

	describe('Template#switchTemplate(name, variables)', function() {
		it('should allow using scoped blocks that switch target blocks', function(done) {
			hawkejs.render('partial_with_switch_template', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				result = result.trim();

				assert.strictEqual(result, '<span><he-block data-hid="hserverside-0" data-he-name="text" data-he-template="partials/switch_bold"><b>bold</b></he-block></span>');
				done();
			});
		});

		it('should allow switching to another template in the start template', function(done) {
			hawkejs.render('partial_with_root_switch_and_implement', function donePartial(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result, 'This is wrapper text "wrapper"\n<he-block data-hid="hserverside-0" data-he-name="entries" data-he-template="partials/entries">Text: entries</he-block>');
				done();
			});
		});
	});

	describe('#foundation()', function() {
		it('should not wait for placeholders that are waiting for itself', function(done) {

			let renderer = hawkejs.render('implement_with_foundation_extension', function doneImplement(err, result) {

				if (err) {
					return done(err);
				}

				if (!result) {
					return done(new Error('Render result was empty'));
				}

				if (result === 'null') {
					return done(new Error('Render result was the string "null"'));
				}

				let checksum = __Protoblast.Bound.String.checksum(result);

				try {
					assert.strictEqual(checksum, 2597404698);
				} catch (err) {
					return done(err);
				}

				done();
			});
		});
	});

	describe('#setTheme(name)', function() {
		it('should set the theme to use for partials', function(done) {

			let renderer = hawkejs.render('implement_blocks', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result, `--\n»<he-block data-hid="hserverside-0" data-he-name="test" data-he-template="partials/text_block" data-theme="dark">DARK TEXT_BLOCK PARTIAL</he-block>«`);
				done();
			});

			renderer.setTheme('dark');
		});

		it('should set the theme to use for extensions', function(done) {

			let renderer = hawkejs.render('expand_test', function doneImplement(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result, `<div class="main dark">\n\t<hr>\n\t<he-block data-hid="hserverside-0" data-he-name="main" data-he-template="expand_test" data-theme="dark">\nThis is the main content\n</he-block>\n</div>`);
				done();
			});

			renderer.setTheme('dark');
		});
	});

	describe('#$0', function() {
		it('is a local property that refers to the current element', function(done) {

			let renderer = hawkejs.render('local_property_test', function doneTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result, `<div class="Alfa">
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
			hawkejs.render('style_test', function doneImplement(err, result) {

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

		it('should show a dialog on the page', async function() {

			actions['/dialog_test'] = function(req, res, renderer, responder) {

				renderer.showDialog('partials/dialog_contents', {message: 'MyMessage'});

				respondWithRender('dialog_test', renderer, responder);
			};

			await setLocation('/dialog_test');

			let main = await getBlockData('main');

			assert.strictEqual(despace(main.text), 'This is the new main body Include Test Contents: bla Contents: AfterBody');
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

	describe('#renderHTML()', function() {

		let devices = [
			{label: 'One'},
			{label: 'Two'}
		];

		it('should render a template and return the HTML', async function() {

			let renderer = hawkejs.createRenderer();

			let html = await renderer.renderHTML('render_to_html', {devices});
			html = despace(html);

			assert.strictEqual(html, `Render this to HTML! <div> Text </div> Device: One<br> Device: Two<br>`);
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

			let html = despace(result.html);

			assert.strictEqual(html, `Render this to HTML! <div> Text </div> Device: One<br> Device: Two<br>`);
		});
	});

	describe('#createOpenElement(name)', function() {

		it('should close void elements silently', async function() {

			let renderer = hawkejs.createRenderer();

			let html = await renderer.renderHTML('render_svg_elements');
			html = despace(html);

			console.log(html);

			assert.strictEqual(html, `<div class="main"> <hr> <he-block data-hid="hserverside-0" data-he-name="main" data-he-template="render_svg_elements"><svg> <g> <path> </g> </svg> <br> </he-block> </div>`);

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

				assert.strictEqual(res, result);
				next();
			});
		});
	}
}