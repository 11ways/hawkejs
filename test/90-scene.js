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

	after(async function() {

		if (do_coverage) {
			let coverage = await fetchCoverage();

			if (!coverage) {
				throw new Error('The browser coverage is empty');
			}

			fs.writeFileSync('./.nyc_output/hawkejs.json', JSON.stringify(coverage));
		}

		await browser.close()
	});
});