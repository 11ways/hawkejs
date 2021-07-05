/* istanbul ignore file */
// Istanbul coverage is disabled for this file,
// because it would mess up the functions sent to puppeteer

let Hawkejs = require('../index.js'),
    assert = require('assert'),
    fs = require('fs');

require('./helpers/_utils.js');

describe('Hawkejs', function() {

	describe('new Hawkejs()', function() {
		it('should construct a new Hawkejs instance', function() {
			global.hawkejs = new Hawkejs();
			hawkejs.parallel_task_limit = 1;
		});
	});

	describe('#addViewDirectory(path, weight)', function() {
		it('should register a path as a place to get view files from', function() {
			hawkejs.addViewDirectory(__dirname + '/templates');
			hawkejs.load(__dirname + '/helpers/assign_test.js');
			hawkejs.load(__dirname + '/helpers/html_in_constructor.js');
			hawkejs.load(__dirname + '/helpers/my_button.js');
			hawkejs.load(__dirname + '/helpers/my_sync_span.js');
			hawkejs.load(__dirname + '/helpers/my_text.js');
			hawkejs.load(__dirname + '/helpers/retain_test.js');
			hawkejs.load(__dirname + '/helpers/html_resolver.js');
			hawkejs.load(__dirname + '/helpers/render_after_attributes.js');
			hawkejs.load(__dirname + '/helpers/element_specific_variables.js');
		});
	});

	describe('#getSource(templateName, callback)', function() {
		it('should fetch the source of a template', function(done) {

			// Start getting the source
			hawkejs.getSource('simple/string').done(function(err, source) {

				try {
					assert.equal(null, err, 'Could not open file');
					assert.equal('This EJS example can\'t be more simple.', source.source);
				} catch (err) {
					return done(err);
				}

				done();
			});

			// There should be a pledge
			assert.equal(true, !!hawkejs.template_source_cache['simple/string'], 'First download did not create a promise');

			hawkejs.getSource('simple/string').done(function(err, source) {
				assert.equal(null, err, 'Problem getting template from cache');
			});
		});

		it('should return an error if the template is not found', function(done) {
			hawkejs.getSource('simply/nonexistingtemplate').done(function(err) {
				assert.strictEqual(!!err, true);
				done();
			});
		});
	});

	describe('#compile(name, source)', function() {

		it('should compile the given source', function() {

			var src = 'Very simple template',
			    name = 'mycopy',
			    fnc;

			fnc = hawkejs.compile(name, src);

			assert.equal(fnc.name, 'compiledView');
			assert.equal(fnc.source_name, name);
		});

		it('should compile source without a name as "inline"', function() {

			var fnc;

			fnc = hawkejs.compile('this is inline <%= "code" %>');

			assert.strictEqual(fnc.name, 'compiledView');
			assert.strictEqual(fnc.source_name.indexOf('inline'), 0);
			assert.strictEqual(String(fnc).indexOf("timeStart(\"inline") > -1, true);
			assert.strictEqual(String(fnc).indexOf('.printUnsafe("this is inline ') > -1, true, 'Print was cut off');
		});

		it('should add line information to multiline javascript', function() {

			var fnc,
			    body;

			fnc = hawkejs.compile('test this js: <% i = 10;\nprint(i);%>');
			body = String(fnc);

			if (body.indexOf('print(vars.i)') == -1) {
				throw new Error('The inline JS code was not added to the compiled function');
			}

			assert.equal(true, body.indexOf('lineNr:0') > -1);
		});

		it('should return an errorView function for templates containg syntax errors', function() {

			var fnc,
			    backup = console.error;

			// #compile outputs using console.log, shut it up for now
			console.error = function(){};

			fnc = hawkejs.compile('Parse error: <% ! %>');

			// And put it back
			console.error = backup;

			assert.equal('errorView', fnc.name);
		});

		it('should correctly rename variable references', function() {

			var compiled,
			    code;

			hawkejs.try_template_expressions = false;
			hawkejs.skip_set_err = true;

			compiled = hawkejs.compile(`<%
let test = 1, bla;
print(test);

if (true) {
	let zever = 1;
	print(zever);
}

for (let zever = 1; zever < 2; zever++) {
	print(zever);
}

print(zever);
%>`);

			code = String(compiled).replace(/inline_\d+/g, '').trim();

			assert.strictEqual(code, `function compiledView(__render, __template, vars, helper) {
	__render.timeStart("");

let test = 1, bla;
__render.print(test);

if (true) {
let zever = 1;
__render.print(zever);
}

for (let zever = 1; zever < 2; zever++) {
__render.print(zever);
}

__render.print(vars.zever);
;
	__render.timeEnd("");
}`)

			hawkejs.try_template_expressions = true;
			hawkejs.skip_set_err = false;
		});

		it('should not rename scoped variables', function() {
			var compiled,
			    code;

			hawkejs.try_template_expressions = false;
			hawkejs.skip_set_err = true;

			compiled = hawkejs.compile(`<%
Object.each(comments,function eachPosts(post){print(post._id)})
print(post._id)
%>`);

			code = String(compiled).replace(/inline_\d+/g, '').trim();

			assert.strictEqual(code, `function compiledView(__render, __template, vars, helper) {
	__render.timeStart("");

Object.each(vars.comments,function eachPosts(post){__render.print(post._id)})
__render.print(vars.post._id)
;
	__render.timeEnd("");
}`)

			hawkejs.try_template_expressions = true;
			hawkejs.skip_set_err = false;
		});
	});

	// Do some basic #render tests, but this will be tested in ViewRender more
	describe('#render(templateName, callback)', function() {
		it('should render text-only templates', function(done) {

			hawkejs.render('simple/string', function doneSimple(err, result) {

				assert.equal(null, err);
				assert.equal('This EJS example can\'t be more simple.', result);

				done();
			});
		});

		it('should print out the wanted variable', function(done) {

			hawkejs.render('simple/variable', {mytext: 'stuff'}, function doneVariable(err, result) {

				assert.equal(null, err);
				assert.equal('It should print out stuff', result);

				done();
			});
		});

		it('should print out nothing if the wanted variable is not defined', function(done) {

			hawkejs.render('simple/variable', {}, function doneVariable(err, result) {

				assert.equal(null, err);
				assert.equal('It should print out ', result);

				done();
			});
		});
	});

	describe('#createClientFile(options)', function() {
		this.timeout(70000);

		it('should create client file', function(done) {
			hawkejs.createClientFile({
				create_source_map: true,
				enable_coverage  : !!global.__coverage__,
			}).done(function gotFile(err, path) {

				if (err) {
					throw err;
				}

				if (!path) {
					throw new Error('No valid path was returned')
				}

				let source = fs.readFileSync(path, 'utf8');

				if (source.length < 10000) {
					throw new Error('The created client-file is too small');
				}

				if (source.indexOf('require.register("hawkejs/client/template') == -1) {
					throw new Error('Created client-file does not contain required files');
				}

				done();
			});
		});
	});
});