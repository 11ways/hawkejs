var assert   = require('assert'),
    Hawkejs  = require('../index.js'),
    hawkejs,
    test_id = 0;

describe('TextNode', function() {

	before(function() {
		hawkejs = createHawkejsInstance();
		hawkejs.addViewDirectory(__dirname + '/templates');
	});

	describe('#toString()', function() {

		it('should return a string representation', function() {

			let text = new Hawkejs.Text('test');

			assert.strictEqual(text+'', '[object Text]');
		});
	});

	describe('#nodeType', function() {
		it('should return the number 3', function() {
			let text = new Hawkejs.Text('test');

			assert.strictEqual(text.nodeType, 3);
		});
	});

	describe('#nodeName', function() {

		it('should return #text', function() {
			let text = new Hawkejs.Text('test');

			assert.strictEqual(text.nodeName, '#text');
		});
	});
});

describe('HTMLElement', function() {

	describe('#nodeType', function() {
		it('should return the number 1', function() {
			var el = Hawkejs.Hawkejs.createElement('div');
			assert.strictEqual(el.nodeType, 1);
		});
	});

	describe('#nodeName', function() {

		it('should return the upercase tag name', function() {
			var el = Hawkejs.Hawkejs.createElement('div');
			assert.strictEqual(el.nodeName, 'DIV');
		});
	});

	describe('#className', function() {
		it('gets the current class attribute', function() {
			var el = Hawkejs.Hawkejs.createElement('div');
			el.classList.add('a');
			el.classList.add('b');

			assertEqualHtml(el.outerHTML, '<div class="a b"></div>');
		});
	});

	describe('#id', function() {
		it('get/set the id of the element', function() {

			var el = Hawkejs.Hawkejs.createElement('div');

			el.id = 'test';

			assertEqualHtml(el.outerHTML, '<div id="test"></div>');
		});
	});

	describe('#name', function() {
		it('get/set the name of the element', function() {

			var el = Hawkejs.Hawkejs.createElement('div');

			el.name = 'test';

			assertEqualHtml(el.outerHTML, '<div name="test"></div>');
		});
	});

	describe('#tabIndex', function() {
		it('get/set the tabindex of the element', function() {

			var el = Hawkejs.Hawkejs.createElement('div');

			el.tabIndex = 1;

			assertEqualHtml(el.outerHTML, '<div tabindex="1"></div>');
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

			// Even though setting a textarea's value does not change the "innerHTML"
			// value on the browser, it does on the server
			assertEqualHtml(area.innerHTML, 'test');

			assertEqualHtml(input.outerHTML, '<input value="test">');
			assertEqualHtml(area.outerHTML, '<textarea>test</textarea>');
			assertEqualHtml(div.outerHTML, '<div></div>');
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
			div.append('€&');
			div.append(Hawkejs.Hawkejs.createElement('br'));

			assertEqualHtml(div.outerHTML, '<div>a<br>@<br>&euro;&amp;<br></div>');
			assert.strictEqual(div.innerText, 'a\n@\n€&\n');
		});

		it('should correctly escape html', function() {

			let source = '<div>&lt;%</div>';

			let div = Hawkejs.Hawkejs.createElement('div');
			div.innerText = source;

			console.log(div.innerHTML)

			assert.strictEqual(div.innerText, source);
		});

		it('should not break on Hawkejs code', function() {

			let source = '\n' +
			'Error inside »inline_0« template\n' +
			'Error: Could not find conduit, alchemy resource will not be fetched\n' +
			'----------------------------------------------\n' +
			'      17 | \n' +
			'      18 | \t\t\tnext(null, result);\n' +
			'      19 | \t\t});\n' +
			' »»»  20 | \t}) %&gt;\n' +
			'      21 | {% /block %}\n' +
			'----------------------------------------------\n' +
			'       3 | {% block "kak" %}\n' +
			'       4 | \t&lt;% this.async(function getResource(next) {\n' +
			'       5 | \t\tdelayedError(next);\n' +
			' »»»   6 | \t}) %&gt;\n' +
			'       7 | {% /block %}\n' +
			'       8 | \n' +
			'       9 | &lt;% assign("kak") %&gt;\n';

			let div = Hawkejs.Hawkejs.createElement('div');
			div.innerText = source;

			let index = div.innerText.indexOf('9 | &lt;% assign("kak") %&gt;');

			assert.strictEqual(index > -1, true);
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

			assertEqualHtml(div.outerHTML, '<div><i></i><br><b></b></div>');
		});
	});

	describe('#hasAttribute(name)', function() {
		it('checks if the given attribute is present on the element', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			assert.strictEqual(div.hasAttribute('id'), false);
			div.id = 'test';
			assert.strictEqual(div.hasAttribute('id'), true);

			assertEqualHtml(div.outerHTML, '<div id="test"></div>');

			div.removeAttribute('id');
			assertEqualHtml(div.outerHTML, '<div></div>');
		});

		it('should also work with data attributes', function() {

			var div = Hawkejs.Hawkejs.createElement('div');

			assert.strictEqual(div.hasAttribute('data-test'), false);
			div.setAttribute('data-test', '');
			assert.strictEqual(div.hasAttribute('data-test'), true);

			assertEqualHtml(div.outerHTML, '<div data-test></div>');

			div.removeAttribute('data-test');
			assertEqualHtml(div.outerHTML, '<div></div>');

			div.setAttribute('data-he-test', '');
			assert.strictEqual(div.hasAttribute('data-he-test'), true);

			div.setAttribute('data-he-test', '1');
			assert.strictEqual(div.hasAttribute('data-he-test'), true);

			assert.strictEqual(div.dataset.heTest, '1');
		});
	});

	describe('#setAttribute(name, value)', function() {
		it('should escape the set values', function() {
			var div = Hawkejs.Hawkejs.createElement('div');
			div.setAttribute('test', 'my "value"');
			assertEqualHtml(div.outerHTML, `<div test="my &quot;value&quot;"></div>`);

			div = Hawkejs.Hawkejs.createElement('div');
			div.setAttribute('data-test', 'my "value"');
			assertEqualHtml(div.outerHTML, `<div data-test="my &quot;value&quot;"></div>`);
		});
	});

	describe('#removeAttribute(name)', function() {
		it('should remove data attributes too', () => {

			let div = Hawkejs.Hawkejs.createElement('div');

			div.setAttribute('data-bla', '');
			div.removeAttribute('data-bla');
			assertEqualHtml(div.outerHTML, `<div></div>`);

			div = Hawkejs.Hawkejs.createElement('div');
			div.setAttribute('data-he-bla', '');
			div.removeAttribute('data-he-bla');

			assertEqualHtml(div.outerHTML, `<div></div>`);
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

			assertEqualHtml(div.outerHTML, '<div></div>');

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

			assertEqualHtml(result, source);
		});

		it('should not throw an error when trying to close a void tag', function() {

			let source = '<div>1<br></br>2</div>';

			let elements = hawkejs.evaluate(source);

			let result = elements[0].innerHTML;

			assertEqualHtml(result, '1<br><br>2');
		});

		it('should not throw an error when creating badly formed self-closing tags', function() {

			let source = '<div><br><br /><br/></div>';

			let elements = hawkejs.evaluate(source);

			let result = elements[0].innerHTML;

			assertEqualHtml(result, '<br><br><br>');
		});

		it('should not throw an error when trying to close a tag that is not present', function() {

			let div = Hawkejs.Hawkejs.createElement('div');

			div.innerHTML = 'bla</p>';
			let result = div.innerHTML;

			assertEqualHtml(result, 'bla<p></p>');
		});
	});

	describe('#outerHTML', function() {
		it('should prevent catastrophic recursive serialization', function(done) {
			let renderer = hawkejs.render('nested_test', function doneTest(err, result) {

				if (err) {
					throw err;
				}

				result = despace(result, '');

				assertEqualHtml(result, `<div class="a">\t<div class="b"><div class="c"><div class="d"><div class="e"><div class="f"><div class="g"><div class="h"><div class="i"><div class="j"><div class="k"><div class="l"><div class="m"><div class="n"><div class="o"><div class="p"><div class="q"><div class="r"><div class="s"><div class="t"><div class="u"></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div></div>\t</div></div>`);
				done();
			});
		});

		it('should correctly render style contents', function(done) {
			let renderer = hawkejs.render('404', function doneTest(err, result) {

				if (err) {
					throw err;
				}

				assertEqualHtml(result, "<style type=\"text/css\">\nbody {\n\tfont-family: sans-serif;\n\tfont-size: 15px;\n\tfont-weight: normal;\n\tmargin: 0;\n\tcolor: #4C4C4C;\n\tbackground-color: #EDEDED;\n}\ndiv {\n\twidth: 100vw;\n}\nh1 {\n\ttext-align: center;\n\tpadding-top: 50vh;\n}\np {\n\ttext-align: center;\n}\n</style>\n<div>\n\t<h1>404: Not found</h1>\n\t<p></p>\n</div>");
				done();
			});
		});

		it('should correctly serialize Hawkejs.RESULT entries', function(done) {

			var renderer = hawkejs.render('generic_rhc', {}, function _done(err, html) {

				if (err) {
					throw err;
				}

				assertEqualHtml(html, '<x-text>hi</x-text>\n<div>\n\t<x-text>nested</x-text>\n</div>');
				done();
			});
		});

		it('should act the same in the browser', async function() {

			await setLocation('/generic_rhc_based');

			let block = await getBlockData('main');

			assertEqualHtml(block.html, '<he-block data-he-name="main" data-hid="hserverside-0" data-he-template="generic_rhc_based">\n<x-text>hi</x-text>\n<div>\n\t<x-text>nested</x-text>\n</div>\n</he-block>');

			let html = await getHtml();

			assertContains(html.html, '<!-- Static hawkejs variables -->', 'The foundation was not found');

			await openHeUrl('/generic_rhc_based');

			block = await getBlockData('main');

			assertEqualHtml(block.html, '<he-block data-he-name="main" data-hid="hserverside-0" data-he-template="generic_rhc_based">\n<x-text tabindex="-1">hi</x-text>\n<div>\n\t<x-text>nested</x-text>\n</div>\n</he-block>');
		});
	});

	describe('#querySelector', function() {
		it('should be possible to use the query selector on the server', function(done) {

			var template = 'query_test';

			var renderer = hawkejs.renderToElements(template, {}, function finished(err, elements) {

				if (err) {
					return done(err);
				}

				try {

				let element = elements[0];

				if (!element) {
					throw new Error('renderToElements() did not provide elements');
				}

				let spans = element.querySelectorAll('span');

				assert.strictEqual(spans.length, 2, 'Expected to find 2 spans');
				assertEqualHtml(spans[0].outerHTML, '<span>1</span>');
				assertEqualHtml(spans[1].outerHTML, '<span>2</span>');

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

				} catch(err) {
					done(err);
				}
			});
		});
	});

	describe('#remove()', function() {
		it('should remove the item from its parent', function() {

			let div = Hawkejs.Hawkejs.createElement('div'),
			    span = Hawkejs.Hawkejs.createElement('span');

			div.append('»');
			div.append(span);
			div.append('«');

			assert.strictEqual(div.childNodes.length, 3);

			assertEqualHtml(div.outerHTML, '<div>»<span></span>«</div>');

			span.remove();

			assert.strictEqual(div.childNodes.length, 2);

			assertEqualHtml(div.outerHTML, '<div>»«</div>');
		});
	});

	describe('#insertBefore()', function() {
		it('should set the corrent parent', function() {

			let wrapper = Hawkejs.Hawkejs.createElement('main'),
			    div = Hawkejs.Hawkejs.createElement('div'),
			    span = Hawkejs.Hawkejs.createElement('span');
			
			wrapper.append(div);
			wrapper.insertBefore(span, div);

			assert.strictEqual(span.parentElement, wrapper);
			assert.strictEqual(div.parentElement, wrapper);

			// Sorry, this is now turning into a "dirty" test
			let async_span_1 = Hawkejs.Hawkejs.createElement('span');
			assert.strictEqual(Hawkejs.canBeMarkedAsDirty(async_span_1), false);

			async_span_1.onHawkejsAssemble = () => {};
			assert.strictEqual(Hawkejs.canBeMarkedAsDirty(async_span_1), true);

			let dirty_info = async_span_1[Hawkejs.DIRTY_INFO];

			// DIRTY_LINE_NEEDS_ASSEMBLY
			assert.strictEqual(dirty_info, 4);

			async_span_1 = Hawkejs.Hawkejs.createElement('span');
			async_span_1.onHawkejsAssemble = () => {};
			dirty_info = async_span_1[Hawkejs.DIRTY_INFO];

			assert.strictEqual(dirty_info, undefined);

			wrapper.append(async_span_1);
			dirty_info = async_span_1[Hawkejs.DIRTY_INFO];

			// DIRTY_LINE_NEEDS_ASSEMBLY | DIRTY_LINE_NEEDS_RENDER
			assert.strictEqual(dirty_info, 5);

			async_span_1 = Hawkejs.Hawkejs.createElement('span');
			async_span_1.onHawkejsAssemble = () => {};

			wrapper.insertBefore(async_span_1, div);
			dirty_info = async_span_1[Hawkejs.DIRTY_INFO];

			// DIRTY_LINE_NEEDS_ASSEMBLY | DIRTY_LINE_NEEDS_RENDER
			assert.strictEqual(dirty_info, 5);
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

			assertEqualHtml(div.innerHTML, '<a></a><b></b><i></i>');

			a.setIndexInParent(0);
			assertEqualHtml(div.innerHTML, '<a></a><b></b><i></i>');
		});
	});

	describe('Hawkejs.getFirstElement(entries)', function() {
		it('should return the first HTMLElement', function() {

			let hawkejs = createHawkejsInstance();

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