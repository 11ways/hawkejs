/* istanbul ignore file */
// Istanbul coverage is disabled for this file,
// because it would mess up the functions sent to puppeteer

let puppeteer = require('puppeteer'),
    assert    = require('assert'),
    Hawkejs   = require('../index.js'),
    http      = require('http'),
    fs        = require('fs'),
    Fn        = __Protoblast.Bound.Function,
    hawkejs,
    Test;

let navigations = 0,
    do_coverage = !!global.__coverage__,
    coverage,
    browser,
    server,
    page,
    port;

function despace(text) {
	return text.trim().replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
}

async function fetchCoverage() {
	let temp = await page.evaluate(function getCoverage() {
		return window.__coverage__;
	});

	if (temp) {
		coverage = temp;
	}
}

async function setLocation(path) {

	if (navigations && do_coverage) {
		await fetchCoverage;
	}

	navigations++;

	var url = 'http://127.0.0.1:' + port + path;
	await page.goto(url);

	if (coverage) {
		await page.evaluate(function setCoverage(coverage) {
			window.__coverage__ = coverage;
		}, coverage);
	}
}

function evalPage(fnc) {
	return page.evaluate(fnc);
}

describe('Scene', function() {
	this.timeout(60000);

	before(async function() {
		browser = await puppeteer.launch();
		page = await browser.newPage();

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
				renderer.internal('url', url);

				if (url.pathname == '/hawkejs/hawkejs-client.js') {

					__Protoblast.getClientPath({
						modify_prototypes : true,
						ua                : req.headers.useragent,
						enable_coverage   : !!global.__coverage__,
					}).done(function gotClientFile(err, path) {

						if (err) {
							throw err;
						}

						res.writeHead(200, {'Content-Type': 'application/javascript'});

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

				templates = url.pathname.slice(1);

				renderer.renderHTML(templates).done(function afterRender(err, html) {

					var mimetype;

					if (err != null) {
						throw err;
					}

					if (typeof html !== 'string') {

						// Stringify using json-dry
						html = __Protoblast.Bound.JSON.dry(html);

						// Tell the client to expect a json-dry response
						mimetype = 'application/json-dry';
					} else {
						mimetype = 'text/html';
					}

					// Only send the mimetype if it hasn't been set yet
					if (res.getHeader('content-type') == null) {
						res.setHeader('content-type', mimetype + ";charset=utf-8");
					}

					res.end(html);
				});

			}).listen(0, '0.0.0.0', function listening() {
				port = server.address().port;
				resolve();
			});
		});
	});

	describe('init', function() {
		it('starts', async function() {

			await setLocation('/home');

			var res = await evalPage(function() {
				return document.body.innerHTML;
			});

			res = res.trim();

			assert.strictEqual(res, "<he-block data-hid=\"hserverside-0\" data-he-name=\"old-main\" data-he-template=\"home\">This is the old main</he-block>\n\t\t<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"home\">This is the new main</div>");
		});
	});

	describe('Rerender custom elements', function() {
		it('should be able to rerender elements', async function() {

			var html;

			await setLocation('/rerender');

			// Get the inner HTML of the main block
			html = await evalPage(function() {
				return document.querySelector('[data-he-name="main"]').innerHTML;
			});

			// Remove extraneous whitespaces
			html = despace(html);

			// Compare
			assert.strictEqual(html, `This is my button:<br> <my-button he-rendered="1"><my-text data-domain="default" data-key="direct.child.of.block.buffer">SERVERTRANSLATED(default.direct.child.of.block.buffer)</my-text> <span> <my-text data-domain="default" data-key="my.button.no.text">SERVERTRANSLATED(default.my.button.no.text)</my-text> </span></my-button>`);

			// And now rerender!
			html = await evalPage(function() {
				var main = document.querySelector('[data-he-name="main"]'),
				    button = document.querySelector('my-button');

				var promise = button.setText('Hello!'),
				    pledge = new __Protoblast.Classes.Pledge();

				promise.then(function() {
					pledge.resolve(main.innerHTML);
				}).catch(function(err) {
					pledge.reject(err);
				});

				return pledge;
			});

			// Remove extraneous whitespaces
			html = despace(html);

			html = html.replace(/he-rendered="\d+?"/i, 'he-rendered="1"');

			assert.strictEqual(html, `This is my button:<br> <my-button he-rendered="1" text="Hello!"><my-text data-domain="default" data-key="direct.child.of.block.buffer">CLIENTTRANSLATED(default.direct.child.of.block.buffer)</my-text> <span> <my-text data-domain="default" data-key="my.button.has.text">CLIENTTRANSLATED(default.my.button.has.text)</my-text>: Hello! </span></my-button>`);
		});
	});

	describe('#scrollTo()', function() {
		it('should scroll to the given element', async function() {

			let scroll_top = await evalPage(function() {
				return document.scrollingElement.scrollTop;
			});

			assert.strictEqual(scroll_top, 0, 'The originel scroll top should have been 0');

			await evalPage(function() {

				let button = document.querySelector('my-button'),
				    i;

				if (!button) {
					throw new Error('Could not find <my-button> element');
				}

				// Insert a bunch of elements
				for (i = 0; i < 400; i++) {
					let element = document.createElement('p');
					element.innerHTML = 'A<br>B<br>C<br>';
					button.prepend(element);
				}

				hawkejs.scene.scrollTo('my-button');
			});

			await __Protoblast.Classes.Pledge.after(100);

			scroll_top = await evalPage(function() {
				return document.scrollingElement.scrollTop;
			});

			assert.strictEqual(scroll_top > 0, true, 'The page should have scrolled');
		});
	});

	after(async function() {

		if (do_coverage) {
			await fetchCoverage();
			fs.writeFileSync('./.nyc_output/hawkejs.json', JSON.stringify(coverage));
		}

		await browser.close()
	});
});