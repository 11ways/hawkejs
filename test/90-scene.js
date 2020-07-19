/* istanbul ignore file */
// Istanbul coverage is disabled for this file,
// because it would mess up the functions sent to puppeteer

let assert    = require('assert'),
    Hawkejs   = require('../index.js'),
    fs        = require('fs'),
    Fn        = __Protoblast.Bound.Function,
    hawkejs,
    Test;

describe('Scene', function() {
	this.timeout(60000);

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

	describe('#setPageTitle(title)', function() {

		it('should set the pagetitle', async function() {

			let title = await evalPage(function() {
				hawkejs.scene.setPageTitle('My Page!');
				return document.querySelector('head title').textContent;
			});

			assert.strictEqual(title, 'My Page!');
		});

		it('should create the title element if it does not exist', async function() {
			let title = await evalPage(function() {
				document.querySelector('head title').remove();
				hawkejs.scene.setPageTitle('Other title');
				return document.querySelector('head title').textContent;
			});

			assert.strictEqual(title, 'Other title');
		});

		it('should not set the title if an object is given', async function() {
			let title = await evalPage(function() {
				hawkejs.scene.setPageTitle({});
				return document.querySelector('head title').textContent;
			});

			assert.strictEqual(title, 'Other title');
		});
	});

	describe('#openUrl()', function() {
		it('should browse to a link using ajax', async function() {

			await setLocation('/home');

			if (do_coverage) {
				let has_coverage = await evalPage(function() {
					return window.__coverage__;
				});

				if (!has_coverage) {
					throw new Error('Puppeteer page is missing coverage after browse');
				}
			}

			await evalPage(function() {
				return hawkejs.scene.openUrl('/welcome');
			});

			await __Protoblast.Classes.Pledge.after(50);

			let result = await evalPage(function() {
				let main = document.querySelector('[data-he-name="main"]');

				let result = {
					name     : main.dataset.heName,
					template : main.dataset.heTemplate,
					text     : main.textContent
				};

				return result;
			});

			assert.strictEqual(result.name, 'main', 'Info on the "main" block should have been returned');
			assert.strictEqual(result.template, 'welcome', 'The "main" block should now have content by the "welcome" template, but it is currently "' + result.template + '"');
			assert.strictEqual(result.text.trim(), 'Welcome!');
		});
	});

	after(async function() {

		if (do_coverage) {

			let coverages = await fetchCoverage();

			if (!coverages || !coverages.length) {
				throw new Error('The browser coverage is empty');
			}

			let i;

			for (i = 0; i < coverages.length; i++) {
				fs.writeFileSync('./.nyc_output/hawkejs_' + i + '.json', JSON.stringify(coverages[i]));
			}
		}

		await browser.close()
	});
});