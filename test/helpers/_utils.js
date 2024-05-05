let puppeteer = require('puppeteer'),
    assert    = require('assert'),
    Hawkejs   = require('../../index.js'),
    http      = require('http'),
    fs        = require('fs');

let navigations = 0,
    coverages = [];

global.do_coverage = !!global.__coverage__;
global.page = null;

let hserverside_rx = /hserverside-\d+/g,
    hrendered_rx = /he-rendered="\d+?"/i;

global.createHawkejsInstance = function createHawkejsInstance() {

	let hawkejs = new Hawkejs();

	// Disable the exposed static variables being loaded via separate js file
	hawkejs.exposed_path = null;

	return hawkejs;
};

global.assertContains = function assertContains(actual, expected, message) {
	let index = actual.indexOf(expected);

	if (index == -1 && !message) {
		message = 'Expected to find `' + expected + '`';
	}

	assert.ok(index > -1, message);
};

/**
 * Normalize attributes that are randomly generated
 */
global.assertEqualHtml = function assertEqualHtml(actual, expected, message) {

	actual = despace(actual);
	expected = despace(expected);

	// Normalize he-rendered attributes
	actual = actual.replace(hrendered_rx, 'he-rendered="1"');
	expected = expected.replace(hrendered_rx, 'he-rendered="1"');

	actual = actual.replace(hserverside_rx, 'hserverside-0');
	expected = expected.replace(hserverside_rx, 'hserverside-0');

	//actual = actual.replace(/hextrinsic_\d+-\d+/g, 'hserverside-0');
	//expected = expected.replace(/hextrinsic_\d+-\d+/g, 'hserverside-0');

	actual = actual.replace(/data-hid="h\d+-\d+"/g, 'data-hid="h0-0"');
	expected = expected.replace(/data-hid="h\d+-\d+"/g, 'data-hid="h0-0"');

	return assert.strictEqual(actual, expected, message);
};

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

global.despace = function despace(text, replacement) {

	if (replacement == null) {
		replacement = ' ';
	}

	let result = text.trim().replace(/\t/g, ' ').replace(/\r\n/g, '\n').replace(/\n/g, replacement).replace(/\s\s+/g, replacement);

	return result;
};

global.simplifyHtml = function simplifyHtml(html) {

	if (!html) {
		return '';
	}

	// Remove the "he-rendered" attributes
	html = html.replace(/he\-rendered="\d*?"/g, '');

	// Remove double spaces
	html = despace(html);

	// Remove spaces before ending tags
	html = html.replace(/\s+\>/g, '>');

	return html;
}

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

global.openHeUrlCaptureError = async function openHeUrlCaptureError(path) {

	let result;

	try {
		result = await evalPage(async function(path) {

			const console_error = console.error;
			const console_warn = console.warn;

			let warnings;
			let messages;
			let result = {};
			let opened;

			console.error = function(...args) {
				messages = args;
				console.error = console_error;
			};

			console.warn = function(...args) {
				warnings = args;
				console.warn = console_warn;
			};

			try {
				opened = await hawkejs.scene.openUrl(path);
			} catch (err) {
				result.error = err;
			}

			result.opened = opened;
			result.messages = messages;
			result.warnings = warnings;

			console.error = console_error;
			console.warn = console_warn;

			return result;
		}, path);
	} catch (err) {
		throw err;
	}

	return result;
};

global.openHeUrl = async function openHeUrl(path) {

	let result;

	try {
		result = await evalPage(function(path) {
			return hawkejs.scene.openUrl(path);
		}, path);
	} catch (err) {
		throw err;
	}

	return result;
};

global.queryElements = async function queryElements(selector) {

	let result = await evalPage(function(selector) {
		let elements = document.querySelectorAll(selector),
		    result = [];

		for (let i = 0; i < elements.length; i++) {
			let block = elements[i];

			let entry = {
				name       : block.dataset.heName,
				template   : block.dataset.heTemplate,
				html       : block.outerHTML,
				text       : block.textContent,
			};

			result.push(entry);
		}

		return result;
	}, selector);

	for (let entry of result) {

		let key;

		for (key in entry) {
			if (typeof entry[key] == 'string') {
				entry[key] = entry[key].replace(/\r\n/g, '\n');
			}
		}
	}

	return result;
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
			html       : block.outerHTML,
			text       : block.textContent,
			location   : document.location.pathname,
			scroll_top : document.scrollingElement.scrollTop,
		};

		return result;
	}, name);

	let key;

	for (key in result) {
		if (typeof result[key] == 'string') {
			result[key] = result[key].replace(/\r\n/g, '\n');
		}
	}

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

global.getHtml = async function getHtml() {

	return await evalPage(function() {

		let html = document.querySelector('html');

		return {
			html : html.outerHTML.replace(/\r\n/g, '\n')
		};
	});
};

global.loadHawkejs = function loadHawkejs() {

	if (global.hawkejs) {
		return global.hawkejs;
	}

	global.hawkejs = createHawkejsInstance();

	hawkejs.parallel_task_limit = 1;

	let base = __dirname + '/..';

	hawkejs.addViewDirectory(base + '/templates');
	hawkejs.load(base + '/helpers/assign_test.js');
	hawkejs.load(base + '/helpers/html_in_constructor.js');
	hawkejs.load(base + '/helpers/my_button.js');
	hawkejs.load(base + '/helpers/my_sync_span.js');
	hawkejs.load(base + '/helpers/my_text.js');
	hawkejs.load(base + '/helpers/retain_test.js');
	hawkejs.load(base + '/helpers/html_resolver.js');
	hawkejs.load(base + '/helpers/render_after_attributes.js');
	hawkejs.load(base + '/helpers/parent_element_test.js');
	hawkejs.load(base + '/helpers/error_thrower.js');
	hawkejs.load(base + '/helpers/nested_template_elements.js');
	hawkejs.load(base + '/helpers/render_looper.js');

	addActions();
}

const times = {};

global.timeLog = function timeLog(name) {

	let previous = times[name];
	let now = times[name] = Date.now();

	let past;

	if (previous) {
		past = now - previous;
	} else {
		past = 0;
	}

	console.log(name, past);
}

const console_error = console.error;
const console_warn = console.warn;

global.renderAndCaptureErrorMessage = async function renderAndCaptureErrorMessage(template, data) {

	let pledge = new __Protoblast.Classes.Pledge(),
	    message,
		warnings;

	console.error = function captureError(err, msg) {
		message = msg;
		console.error = console_error;
	};

	console.warn = function ignoreWarning(...args) {
		warnings = args;
	};

	hawkejs.render(template, data, (err, html) => {

		let result = {
			warnings : warnings,
			message  : message,
			error    : err,
			htmm     : html,
		};

		console.warn = console_warn;
		console.error = console_error;

		pledge.resolve(result);
	});

	return pledge;
};

global.loadBrowser = async function loadBrowser() {

	global.browser = await puppeteer.launch({
		headless : true
	});

	global.page = await browser.newPage();

	addActions();

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
			} else if (remote.className) {
				pieces.push('\x1b[1m\x1b[33m{' + remote.type + ' ' + remote.className + '}\x1b[0m');
				if (remote.preview) {
					pieces.push(remote.preview);
				}
			} else if (remote.value != null) {
				pieces.push(remote.value);
			} else {
				pieces.push(remote);
			}
		}

		console.log(...pieces);
	});

	loadHawkejs();

	let listen_port = global.listen_port || 0;

	await new Promise(function(resolve, reject) {
		server = http.createServer(function onReq(req, res) {

			var url = __Protoblast.Classes.RURL.parse(req.url),
			    renderer = hawkejs.createRenderer(),
			    templates;

			req.renderer = renderer;
			renderer.prepare(req, res);
			renderer.internal('url', url);

			let query = url.query;

			for (let key in query) {
				renderer.set(key, query[key]);
			}

			// End stylesheet requests with a generic valid response
			if (url.pathname.indexOf('.css') > -1) {
				return res.end('body{color: #101010}');
			}

			if (url.pathname.indexOf('favicon.ico') > -1) {
				return res.end();
			}

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

		}).listen(listen_port, '0.0.0.0', function listening() {
			port = server.address().port;
			global.hawkejs_server = server;
			resolve();
		});
	});
}

function addActions() {
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
}