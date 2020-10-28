var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('HTMLElement', function() {

	before(function() {
		hawkejs = new Hawkejs();
		hawkejs.addViewDirectory(__dirname + '/templates');
	});

	describe('#className', function() {
		it('gets the current class attribute', function() {
			var el = Hawkejs.Hawkejs.createElement('div');
			el.classList.add('a');
			el.classList.add('b');

			assert.strictEqual(el.outerHTML, '<div class="a b"></div>');
		});
	});

	describe('#id', function() {
		it('get/set the id of the element', function() {

			var el = Hawkejs.Hawkejs.createElement('div');

			el.id = 'test';

			assert.strictEqual(el.outerHTML, '<div id="test"></div>');
		});
	});

	describe('#name', function() {
		it('get/set the name of the element', function() {

			var el = Hawkejs.Hawkejs.createElement('div');

			el.name = 'test';

			assert.strictEqual(el.outerHTML, '<div name="test"></div>');
		});
	});

	describe('#tabIndex', function() {
		it('get/set the tabindex of the element', function() {

			var el = Hawkejs.Hawkejs.createElement('div');

			el.tabIndex = 1;

			assert.strictEqual(el.outerHTML, '<div tabindex="1"></div>');
		});
	});

	describe('#value', function() {
		it('gets/sets the value of the element, depending on the type', function() {

			var input = Hawkejs.Hawkejs.createElement('input'),
			    area = Hawkejs.Hawkejs.createElement('textarea'),
			    div = Hawkejs.Hawkejs.createElement('div');

			input.value = 'test';
			div.value = 'test';

			assert.strictEqual(input.value, 'test');
			assert.strictEqual(div.value, 'test');

			assert.strictEqual(area.value, '');
			area.innerHTML = 'html';
			assert.strictEqual(area.value, 'html');

			area.value = 'test';
			assert.strictEqual(area.value, 'test');

			// Setting a textarea's value breaks the link with the innerText
			assert.strictEqual(area.innerHTML, 'html');

			assert.strictEqual(input.outerHTML, '<input value="test">');
			assert.strictEqual(area.outerHTML, '<textarea>html</textarea>');
			assert.strictEqual(div.outerHTML, '<div></div>');
		});
	});

	describe('#style', function() {
		it('should set the style attribute', function() {

			var div = Hawkejs.Hawkejs.createElement('div', false);
			div.style.setProperty('display', 'none');

			assert.strictEqual(div.outerHTML, '<div style="display:none;"></div>');
		});
	});

	describe('#innerText', function() {
		it('gets/sets the innerText of an element', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			div.append('a');
			div.append(Hawkejs.Hawkejs.createElement('br'));
			div.append('@');
			div.append(Hawkejs.Hawkejs.createElement('br'));
			div.append('€');
			div.append(Hawkejs.Hawkejs.createElement('br'));

			assert.strictEqual(div.outerHTML, '<div>a<br>@<br>&euro;<br></div>');
			assert.strictEqual(div.innerText, 'a\n@\n€\n');
		});
	});

	describe('#textContent', function() {
		it('gets/sets the textContent of an element', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			div.append('a');
			div.append(Hawkejs.Hawkejs.createElement('br'));
			div.append('@');
			div.append(Hawkejs.Hawkejs.createElement('br'));
			div.append('€');
			div.append(Hawkejs.Hawkejs.createElement('br'));

			assert.strictEqual(div.outerHTML, '<div>a<br>@<br>&euro;<br></div>');
			assert.strictEqual(div.textContent, 'a@€');
		});
	});

	describe('#insertAdjacentHTML(position, html)', function() {
		it('should insert html at a specific position', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			div.append(Hawkejs.Hawkejs.createElement('br'));
			div.insertAdjacentHTML('afterBegin', '<i></i>');
			div.insertAdjacentHTML('beforeEnd', '<b></b>');

			assert.strictEqual(div.outerHTML, '<div><i></i><br><b></b></div>');
		});
	});

	describe('#hasAttribute(name)', function() {
		it('checks if the given attribute is present on the element', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			assert.strictEqual(div.hasAttribute('id'), false);
			div.id = 'test';
			assert.strictEqual(div.hasAttribute('id'), true);

			assert.strictEqual(div.outerHTML, '<div id="test"></div>');

			div.removeAttribute('id');
			assert.strictEqual(div.outerHTML, '<div></div>');
		});
	});

	describe('#setAttribute(name, value)', function() {
		it('should escape the set values', function() {
			var div = Hawkejs.Hawkejs.createElement('div');
			div.setAttribute('test', 'my "value"');
			assert.strictEqual(div.outerHTML, `<div test="my &quot;value&quot;"></div>`);

			div = Hawkejs.Hawkejs.createElement('div');
			div.setAttribute('data-test', 'my "value"');
			assert.strictEqual(div.outerHTML, `<div data-test="my &quot;value&quot;"></div>`);
			
			
		});
	});

	describe('#dataset', function() {
		it('is an object with all the data attributes', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			assert.strictEqual(div.dataset.alpha, undefined);
			div.dataset.alpha = '1';
			assert.strictEqual(div.dataset.alpha, '1');

			assert.strictEqual(div.hasAttribute('data-alpha'), true);
			assert.strictEqual(div.getAttribute('data-alpha'), '1');

			assert.strictEqual(div.outerHTML, '<div data-alpha="1"></div>');

			div.removeAttribute('data-alpha');
			assert.strictEqual(div.dataset.alpha, undefined);

			assert.strictEqual(div.outerHTML, '<div></div>');

			// Setting to undefined results in an "undefined" string
			div.dataset.alpha = undefined;
			assert.strictEqual(div.dataset.alpha, 'undefined');
		});
	});

	describe('#innerHTML', function() {
		it('should parse the HTML on-the-fly', function() {

			let div = Hawkejs.Hawkejs.createElement('div');

			div.innerHTML = '<span class="test">This is a test!</span><bold>This too</bold>';

			assert.strictEqual(div.children.length, 2);

			let span = div.querySelector('span');

			assert.strictEqual(span.className, 'test');
			assert.strictEqual(span.textContent, 'This is a test!');
		});

		it('should not escape the contents of a script tag', function() {

			let source = "<script>document.write('<scr' + 'ipt src=\"/test\"></scr' + 'ipt>');</script>";

			let elements = hawkejs.evaluate(source);

			let result = elements[0].outerHTML;

			assert.strictEqual(result, source);

		});
	});

	describe('#outerHTML', function() {
		it('should prevent catastrophic recursive serialization', function(done) {
			let renderer = hawkejs.render('nested_test', function doneTest(err, result) {

				if (err) {
					throw err;
				}

				result = result.replace(/[\n\t]/g, '');

				assert.strictEqual(renderer.last._render_count, 1, 'The HTML elements were serialized more than expected!');
				assert.strictEqual(result, `<div class="a"><div class="b"><div class="c"><div class="d"><div class="e"><div class="f"><div class="g"><div class="h"><div class="i"><div class="j"><div class="k"><div class="l"><div class="m"><div class="n"><div class="o"><div class="p"><div class="q"><div class="r"><div class="s"><div class="t"><div class="u"></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div>`);
				done();
			});
		});

		it('should correctly render style contents', function(done) {
			let renderer = hawkejs.render('404', function doneTest(err, result) {

				if (err) {
					throw err;
				}

				assert.strictEqual(result, "<style type=\"text/css\">\nbody {\n\tfont-family: sans-serif;\n\tfont-size: 15px;\n\tfont-weight: normal;\n\tmargin: 0;\n\tcolor: #4C4C4C;\n\tbackground-color: #EDEDED;\n}\ndiv {\n\twidth: 100vw;\n}\nh1 {\n\ttext-align: center;\n\tpadding-top: 50vh;\n}\np {\n\ttext-align: center;\n}\n</style>\n<div>\n\t<h1>404: Not found</h1>\n\t<p></p>\n</div>");
				done();
			});
		});

		it('should correctly serialize Hawkejs.RESULT entries', function(done) {
			var HtmlResolver = function HtmlResolver(value) {
				this.value = value;
			};

			HtmlResolver.prototype.toString = function() {
				throw new Error('#toString() should not be called, renderHawkejsContent() should be!');
			}

			HtmlResolver.prototype.renderHawkejsContent = function() {
				var pledge = new __Protoblast.Classes.Pledge();

				let element = Hawkejs.Hawkejs.createElement('x-text');
				element.innerHTML = this.value;

				this[Hawkejs.RESULT] = element;

				pledge.resolve(element);

				return pledge;
			}

			Hawkejs.Renderer.setCommand(function resolveToHtml(value) {
				return new HtmlResolver(value);
			});

			var renderer = hawkejs.render('generic_rhc', {}, function _done(err, html) {

				if (err) {
					throw err;
				}

				assert.strictEqual(html, '<x-text>hi</x-text>\n<div>\n\t<x-text>nested</x-text>\n</div>');
				done();
			});
		});
	});

	describe('#querySelector', function() {
		it('should be possible to use the query selector on the server', function(done) {

			var template = 'query_test';

			var renderer = hawkejs.renderToElements(template, {}, function finished(err, elements) {

				if (err) {
					throw err;
				}

				let element = elements[0];

				if (!element) {
					throw new Error('renderToElements() did not provide elements');
				}

				let spans = element.querySelectorAll('span');

				assert.strictEqual(spans.length, 2, 'Expected to find 2 spans');
				assert.strictEqual(spans[0].outerHTML, '<span>1</span>');
				assert.strictEqual(spans[1].outerHTML, '<span>2</span>');

				let my_div = element.querySelector('.my-div');
				assert.strictEqual(my_div.id, 'test');

				let table = element.querySelector('table');

				let tr_one = table.firstElementChild;

				assert.strictEqual(tr_one.id, 'tr1', '#firstElementChild returned the wrong element');

				let tr_two = element.querySelector('#tr2');

				if (!tr_two) {
					throw new Error('Failed to find element by its id');
				}

				assert.strictEqual(tr_two.id, 'tr2');

				let even_rows = element.querySelectorAll('table tr:nth-child(even)');
				assert.strictEqual(even_rows.length, 3, 'Expected 3 rows');
				assert.strictEqual(even_rows[0].id, 'tr2');
				assert.strictEqual(even_rows[1].id, 'tr4');
				assert.strictEqual(even_rows[2].id, 'tr6');

				let odd_rows = element.querySelectorAll('table tr:nth-child(odd)');
				assert.strictEqual(odd_rows.length, 4, 'Expected 4 rows');
				assert.strictEqual(odd_rows[0].id, 'tr1');
				assert.strictEqual(odd_rows[1].id, 'tr3');
				assert.strictEqual(odd_rows[2].id, 'tr5');
				assert.strictEqual(odd_rows[3].id, 'tr7');

				done();
			});
		});
	});

	// HTML Element Extensions!

	describe('#setIndexInParent(index)', function() {
		it('moved the element to the given index', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			let i = Hawkejs.Hawkejs.createElement('i'),
			    a = Hawkejs.Hawkejs.createElement('a'),
			    b = Hawkejs.Hawkejs.createElement('b');

			div.append(i);
			div.append(a);
			div.append(b);

			a.setIndexInParent(0);
			i.setIndexInParent(2);

			assert.strictEqual(div.innerHTML, '<a></a><b></b><i></i>');

			a.setIndexInParent(0);
			assert.strictEqual(div.innerHTML, '<a></a><b></b><i></i>');
		});
	});

	describe('Hawkejs.getFirstElement(entries)', function() {
		it('should return the first HTMLElement', function() {

			let hawkejs = new Hawkejs.Hawkejs();

			let entries = hawkejs.evaluate(`this is text<span>First</span>`);

			let first = Hawkejs.getFirstElement(entries);

			assert.strictEqual(first.textContent, 'First');

			entries = hawkejs.evaluate(`<div>Real first</div>this is text<span>Second</span>`);
			first = Hawkejs.getFirstElement(entries);

			assert.strictEqual(first.textContent, 'Real first');
		});

		it('should also work in the browser', async function() {

			await setLocation('/home');

			let result = await evalPage(function() {

				let entries = hawkejs.evaluate(`this is text<span>First</span>`);
				let first = __Protoblast.Classes.Hawkejs.getFirstElement(entries);

				return {
					first : first.textContent
				};
			});

			assert.strictEqual(result.first, 'First');
		});
	});
});