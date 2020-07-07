var pti       = require('puppeteer-to-istanbul'),
    puppeteer = require('puppeteer'),
    assert    = require('assert'),
    Hawkejs   = require('../index.js'),
    http      = require('http'),
    fs        = require('fs'),
    Fn        = __Protoblast.Bound.Function,
    hawkejs,
    Test;

var browser,
    server,
    page,
    port;

function despace(text) {
	return text.trim().replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
}

function setLocation(path) {
	var url = 'http://127.0.0.1:' + port + path;
	return page.goto(url);
}

function evalPage(fnc) {
	return page.evaluate(fnc);
}

describe('Scene', function() {

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

		// Enable both JavaScript and CSS coverage
		await Promise.all([
			page.coverage.startJSCoverage(),
			page.coverage.startCSSCoverage()
		]);

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
						modify_prototypes: true,
						ua: req.headers.useragent
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

	after(async function() {

		// Report coverage from the browser to istanbul.
		// This won't really work of course, because the
		// entire hawkejs codebase gets put in 1 big file
		const [jsCoverage, cssCoverage] = await Promise.all([
			page.coverage.stopJSCoverage(),
			page.coverage.stopCSSCoverage(),
		]);

		pti.write(jsCoverage);
		await browser.close()
	});
});