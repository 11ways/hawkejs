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

	after(async function() {
		const [jsCoverage, cssCoverage] = await Promise.all([
			page.coverage.stopJSCoverage(),
			page.coverage.stopCSSCoverage(),
		]);

		pti.write(jsCoverage);
		await browser.close()
	});
});