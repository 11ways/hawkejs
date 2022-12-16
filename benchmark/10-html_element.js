var main = require('./init.js');
var renderer = hawkejs.createRenderer();

suite('HTMLElement', function() {

	var div,
	    single;

	set('setup', function() {
		div = renderer.createElement('div');

		let child,
		    prev = div;

		for (let i = 0; i < 20; i++) {
			child = renderer.createElement('div');
			child.classList.add(String(i));
			prev.append(child);
			prev = child;
		}

		single = renderer.createElement('div');
		single.classList.add('alpha');
		single.setAttribute('test', 'testing!');
	});

	bench('new HTMLElement()', function() {
		new Hawkejs.HTMLElement();
	});

	suite('#innerHTML', function() {

		let set_div;

		set('setup', function() {
			set_div = renderer.createElement('div');
			set_div.innerHTML = '<p></p>';
		});

		bench('set safe text', function() {
			// Went from 23.000 to 3,590,000
			set_div.innerHTML = 'this is a longer piece of text';
		});

		bench('set html', function() {
			// 11.200
			set_div.innerHTML = '<div><p><span>SPAN</span></p></div>';
		});
	});

	suite('#textContent', function() {
		set('setup', function() {
			get_div = renderer.createElement('div');
			get_div.innerHTML = '<p>Hello! <strong><i>Nested</i></strong></p>';
		});

		bench('get', function() {
			div.textContent;
		});
	});

	suite('#innerText', function() {

		let get_div;

		set('setup', function() {
			get_div = renderer.createElement('div');
			get_div.innerHTML = '<p>Hello! <strong><i>Nested</i></strong></p>';
		});

		bench('set safe text', function() {
			// Used to be only 22.000, but is now 1.300.000
			let div = renderer.createElement('div');
			div.innerText = 'simple';
		});

		bench('set unsafe text', function() {
			// 500.000
			let div = renderer.createElement('div');
			div.innerText = '<p> & <b> needs escaping!';
		});

		bench('get', function() {
			// Still slow at only 22.000, but it isn't used that much
			div.innerText;
		});
	});

	suite('#querySelector', function() {
		let get_div;

		set('setup', function() {
			get_div = renderer.createElement('div');
			get_div.innerHTML = `<p>
				Hello! <strong><i>Nested</i></strong>
				<div class="test">
					<span class="deeper">
						<i class="bla"></i>
					</span>
				</div>
			</p>`;
		});

		bench('.bla', function() {
			get_div.querySelector('.bla');
		});

		bench('.test .deeper .bla', function() {
			get_div.querySelector('.test .deeper .bla');
		});
	});

	bench('#outerHTML (single element)', function() {
		single.outerHTML;
	});

	bench('#outerHTML (nested elements)', function() {
		div.outerHTML;
	});

});