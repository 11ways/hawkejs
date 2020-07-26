/* istanbul ignore file */
// Istanbul coverage is disabled for this file,
// because it would mess up the functions sent to puppeteer

let puppeteer = require('puppeteer'),
    assert    = require('assert'),
    Hawkejs   = require('../index.js'),
    http      = require('http'),
    fs        = require('fs'),
    hawkejs;

let navigations = 0,
    coverages = [];

global.do_coverage = !!global.__coverage__;
global.page = null;

global.fetchCoverage = async function fetchCoverage() {

	if (!page) {
		return;
	}

	let temp = await page.evaluate(function getCoverage() {
		return window.__coverage__;
	});

	if (temp) {
		coverages.push(temp);
	}

	return coverages;
};

global.setLocation = async function setLocation(path) {

	let url;

	if (!page) {
		await loadBrowser();
	}

	if (navigations && do_coverage) {
		await fetchCoverage();
	}

	navigations++;

	if (path.indexOf('http') == -1) {
		url = 'http://127.0.0.1:' + port + path;
	} else {
		url = path;
	}

	await page.goto(url);
};

global.clickPage = function clickPage(selector, options) {
	return page.click(selector, options);
};

global.evalPage = function evalPage(fnc, ...args) {
	return page.evaluate(fnc, ...args);
};

global.despace = function despace(text) {
	return text.trim().replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
};

global.respondWithRender = function respondWithRender(templates, renderer, responder) {
	renderer.renderHTML(templates).done(function afterRender(err, html) {

		if (err != null) {
			throw err;
		}

		responder(html);
	});
}

global.actions = {};

// Click on a link & wait for hawkejs to render it
global.clickHeLink = async function clickHeLink(selector, options) {

	let wait_for_render = true;

	if (!wait_for_render) {
		return clickPage(selector, options);
	}

	let wait_for_open_url = evalPage(function() {
		let pledge = new __Protoblast.Classes.Pledge();

		hawkejs.scene.once('opened_url', function whenUrlOpened(href, err) {

			if (err) {
				return pledge.reject(err);
			}

			pledge.resolve(true);
		});

		return pledge;
	});

	await clickPage(selector, options);

	await wait_for_open_url;
}

global.openHeUrl = function openHeUrl(path) {
	return evalPage(function(path) {
		return hawkejs.scene.openUrl(path);
	}, path);
};

global.getBlockData = async function getBlockData(name) {

	if (!name) {
		name = 'main';
	}

	let result = await evalPage(function(name) {
		let block = document.querySelector('[data-he-name="' + name + '"]');

		let result = {
			name       : block.dataset.heName,
			template   : block.dataset.heTemplate,
			text       : block.textContent,
			location   : document.location.pathname,
			scroll_top : document.scrollingElement.scrollTop,
		};

		return result;
	}, name);

	assert.strictEqual(result.name, name);

	return result;
};

global.scrollTo = async function scrollTo(selector) {

	let result = await evalPage(async function(selector) {

		let element = document.querySelector(selector);

		if (!element) {
			throw new Error('Could not find element by selector "' + selector + '"');
		}

		await hawkejs.scene.scrollTo(element);

		let container = element.getScrollContainer();

		let scroll_top = document.scrollingElement.scrollTop;

		let result = {
			container            : container.id,
			container_tag        : container.tagName,
			container_scroll_top : container.scrollTop,
			main_scroll_top      : document.scrollingElement.scrollTop,
			main_scroll_tag      : document.scrollingElement.tagName,
		};

		return result;
	}, selector);

	return result;
};

async function loadBrowser() {

	global.browser = await puppeteer.launch({
		headless : true
	});

	global.page = await browser.newPage();

	page.on('console', function(msg) {
		var pieces = ['[BROWSER]'],
		    args = msg.args(),
		    args;

		for (arg of args) {
			let remote = arg._remoteObject;

			if (remote.type == 'string') {
				pieces.push(remote.value);
			} else if (remote.subtype == 'node') {
				pieces.push('\x1b[1m\x1b[36m<' + remote.description + '>\x1b[0m');
				//console.log(remote.preview);
			} else if (remote.className) {
				pieces.push('\x1b[1m\x1b[33m{' + remote.type + ' ' + remote.className + '}\x1b[0m');
			} else if (remote.value != null) {
				pieces.push(remote.value);
			} else {
				pieces.push(remote);
			}
		}

		console.log(...pieces);
	});

	hawkejs = new Hawkejs();
	hawkejs.addViewDirectory(__dirname + '/templates');

	await new Promise(function(resolve, reject) {
		server = http.createServer(function onReq(req, res) {

			var url = __Protoblast.Classes.RURL.parse(req.url),
			    renderer = hawkejs.createRenderer(),
			    templates;

			req.renderer = renderer;
			renderer.prepare(req, res);
			renderer.internal('url', url);

			if (url.pathname == '/hawkejs/hawkejs-client.js') {

				__Protoblast.getClientPath({
					modify_prototypes : true,
					ua                : req.headers.useragent,
					enable_coverage   : do_coverage,
				}).done(function gotClientFile(err, path) {

					if (err) {
						throw err;
					}

					fs.createReadStream(path).pipe(res);
				});

				return;
			}

			// Serve multiple template files
			if (url.pathname == '/hawkejs/templates') {

				var names = url.param('name');

				if (!names) {
					res.status = 500;
					return res.end('No template names have been given');
				}

				hawkejs.getFirstAvailableSource(names, function gotResult(err, result) {

					if (err) {
						res.status = 500;
						return res.end(String(err));
					}

					if (!result || !result.name) {
						res.status = 400;
						return res.end('Could not find any of the given templates');
					}

					res.setHeader('content-type', 'application/json;charset=utf-8');
					res.end(JSON.stringify(result));
				});

				return;
			}

			if (actions[url.pathname]) {
				return actions[url.pathname](req, res, renderer, responder);
			}

			templates = url.pathname.slice(1);

			renderer.renderHTML(templates).done(function afterRender(err, html) {

				if (err != null) {
					throw err;
				}

				responder(html);
			});

			function responder(body, type) {

				if (!type) {
					if (typeof body !== 'string') {

						// Stringify using json-dry
						body = __Protoblast.Bound.JSON.dry(body);

						// Tell the client to expect a json-dry response
						type = 'application/json-dry';
					} else {
						type = 'text/html';
					}
				}

				// Only send the mimetype if it hasn't been set yet
				if (res.getHeader('content-type') == null) {
					res.setHeader('content-type', type + ";charset=utf-8");
				}

				res.end(body);
			}

		}).listen(0, '0.0.0.0', function listening() {
			port = server.address().port;
			resolve();
		});
	});
}

describe('Hawkejs', function() {

	describe('new Hawkejs()', function() {
		it('should construct a new Hawkejs instance', function() {
			hawkejs = new Hawkejs();
		});
	});

	describe('#addViewDirectory(path, weight)', function() {
		it('should register a path as a place to get view files from', function() {
			hawkejs.addViewDirectory(__dirname + '/templates');
			hawkejs.load(__dirname + '/helpers/my_button.js');
			hawkejs.load(__dirname + '/helpers/my_text.js');
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
			assert.strictEqual(String(fnc).indexOf('.print("this is inline ') > -1, true, 'Print was cut off');
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