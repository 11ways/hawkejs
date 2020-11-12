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
			res = __Protoblast.Bound.String.before(res, '<he-bottom').trim();

			assert.strictEqual(res, `<he-block data-hid=\"hserverside-0\" data-he-name=\"old-main\" data-he-template=\"home\">This is the old main</he-block>\n\t\t<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"home\">This is the new main</div>`);
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
			assert.strictEqual(html, `This is my button:<br> <my-button he-rendered="1" data-hid="hserverside-1"><my-text data-domain="default" data-key="direct.child.of.block.buffer">SERVERTRANSLATED(default.direct.child.of.block.buffer)</my-text> <span> <my-text data-domain="default" data-key="my.button.no.text">SERVERTRANSLATED(default.my.button.no.text)</my-text> </span></my-button>`);

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

			assert.strictEqual(html, `This is my button:<br> <my-button he-rendered="1" data-hid="hserverside-1" text="Hello!"><my-text data-domain="default" data-key="direct.child.of.block.buffer">CLIENTTRANSLATED(default.direct.child.of.block.buffer)</my-text> <span> <my-text data-domain="default" data-key="my.button.has.text">CLIENTTRANSLATED(default.my.button.has.text)</my-text>: Hello! </span></my-button>`);
		});
	});

	describe('#scrollTo()', function() {
		it('should scroll to the given element', async function() {

			let scroll_top = await evalPage(function() {
				return document.scrollingElement.scrollTop;
			});

			assert.strictEqual(scroll_top, 0, 'The original scroll top should have been 0');

			let result = await evalPage(async function() {

				let button = document.querySelector('my-button'),
				    i;

				if (!button) {
					throw new Error('Could not find <my-button> element');
				}

				// Insert a bunch of elements
				for (i = 0; i < 1000; i++) {
					let element = document.createElement('p');
					element.innerHTML = 'A<br>B<br>C<br>D<br>';
					button.insertAdjacentElement('beforebegin', element);
				}

				button.insertAdjacentHTML('beforebegin', '<br>\n<br>\n');

				let rect = button.getBoundingClientRect();

				rect = {
					x: rect.x,
					y: rect.y,
					top: rect.top,
					bottom: rect.bottom,
					width : rect.width,
					height: rect.height,
				};

				let sc = __Protoblast.Classes.Element.prototype.getScrollContainer.call(button);

				await hawkejs.scene.scrollTo('my-button');

				return {
					rect : rect,
				}
			});

			let data = await evalPage(function() {
				return {
					scroll_element : document.scrollingElement.nodeName,
					scroll_top     : document.scrollingElement.scrollTop,
					html           : document.body.innerHTML
				};
			});

			assert.strictEqual(data.scroll_top > 0, true, 'The page should have scrolled, but it\'s still at ' + scroll_top);
		});

		it('should not be confused by scrollable parents that don\'t actually scroll', async function() {

			await setLocation('/scrolltests');

			let main = await getBlockData('main');

			assert.strictEqual(main.template, 'scrolltests');
			assert.strictEqual(main.location, '/scrolltests');
			assert.strictEqual(main.scroll_top, 0);

			let scrolled = await scrollTo('#button-one');

			assert.strictEqual(scrolled.container_tag, 'BODY');
			assert.strictEqual(scrolled.main_scroll_top > 1000, true);
			assert.strictEqual(scrolled.main_scroll_tag, 'BODY');
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

			await openHeUrl('/welcome');

			await __Protoblast.Classes.Pledge.after(50);

			let result = await getBlockData('main');

			assert.strictEqual(result.name, 'main', 'Info on the "main" block should have been returned');
			assert.strictEqual(result.template, 'welcome', 'The "main" block should now have content by the "welcome" template, but it is currently "' + result.template + '"');
			assert.strictEqual(result.text.trim(), 'Welcome!');
			assert.strictEqual(result.location, '/welcome');
		});
	});

	describe('#onLinkClick(element, e)', function() {
		it('should be used when clicking on an anchor', async function() {

			await setLocation('/links');

			await clickHeLink('#link-to-welcome');

			let result = await getBlockData('main');

			assert.strictEqual(result.name, 'main', 'Info on the "main" block should have been returned');
			assert.strictEqual(result.template, 'welcome', 'The "main" block should now have content by the "welcome" template, but it is currently "' + result.template + '"');
			assert.strictEqual(result.text.trim(), 'Welcome!');
			assert.strictEqual(result.location, '/welcome');
		});

		it('should not change the history if the element has `data-he-history="false"`', async function() {

			await openHeUrl('/links');

			await clickHeLink('#link-to-welcome-without-history');

			let result = await getBlockData('main');

			assert.strictEqual(result.name, 'main', 'Info on the "main" block should have been returned');
			assert.strictEqual(result.template, 'welcome', 'The "main" block should now have content by the "welcome" template, but it is currently "' + result.template + '"');
			assert.strictEqual(result.text.trim(), 'Welcome!');

			assert.strictEqual(result.location, '/links', 'The History API was used to change the current location, even though it should have been disabled');

		});
	});

	describe('#attachHistoryListener()', function() {
		it('should use the history API to go back', async function() {

			await setLocation('/home');

			await evalPage(function() {
				window.should_still_exist = 1;
			});

			let main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"home\">This is the new main</div>",
				name       : 'main',
				template   : 'home',
				text       : 'This is the new main',
				location   : '/home',
				scroll_top : 0
			});

			await openHeUrl('/welcome');

			let result = await evalPage(function() {
				return window.should_still_exist;
			});

			assert.strictEqual(result, 1, 'A hard navigation hapened instead of an ajax call');

			main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"welcome\" tabindex=\"-1\">\nWelcome!\n</div>",
				name       : 'main',
				template   : 'welcome',
				text       : '\nWelcome!\n',
				location   : '/welcome',
				scroll_top : 0
			});

			await page.goBack();

			// Wait until the page has loaded
			await __Protoblast.Classes.Pledge.after(100);

			main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"home\" tabindex=\"-1\">This is the new main</div>",
				name       : 'main',
				template   : 'home',
				text       : 'This is the new main',
				location   : '/home',
				scroll_top : 0
			});

			result = await evalPage(function() {
				return window.should_still_exist;
			});

			assert.deepStrictEqual(result, 1, 'A hard back happened instead of using the History API');
		});
	});

	describe('#allow_back_button', function() {
		it('enables or disables back button functionality', async function() {

			let main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"home\" tabindex=\"-1\">This is the new main</div>",
				name       : 'main',
				template   : 'home',
				text       : 'This is the new main',
				location   : '/home',
				scroll_top : 0
			});

			await openHeUrl('/welcome');

			main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"welcome\" tabindex=\"-1\">\nWelcome!\n</div>",
				name       : 'main',
				template   : 'welcome',
				text       : '\nWelcome!\n',
				location   : '/welcome',
				scroll_top : 0
			});

			await evalPage(function() {
				hawkejs.scene.allow_back_button = false;
			});

			await page.goBack();

			// Make sure the page did not go back
			await __Protoblast.Classes.Pledge.after(100);

			main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"welcome\" tabindex=\"-1\">\nWelcome!\n</div>",
				name       : 'main',
				template   : 'welcome',
				text       : '\nWelcome!\n',
				location   : '/welcome',
				scroll_top : 0
			}, 'The browser did not stay on the /welcome page');

			await evalPage(function() {
				hawkejs.scene.allow_back_button = true;
			});

			await page.goBack();

			// Make sure the page went back
			await __Protoblast.Classes.Pledge.after(100);

			main = await getBlockData('main');

			assert.deepStrictEqual(main, {
				html       : "<div data-he-name=\"main\" data-hid=\"hserverside-1\" data-he-template=\"home\" tabindex=\"-1\">This is the new main</div>",
				name       : 'main',
				template   : 'home',
				text       : 'This is the new main',
				location   : '/home',
				scroll_top : 0
			});
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