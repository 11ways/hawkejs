var hawkejs = require('./_init.js');
var renderer = hawkejs.createRenderer();
var Hawkejs = __Protoblast.Classes.Hawkejs;

suite('HTMLElement', function() {

	var div,
	    single;

	before(function() {
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

	bench('#outerHTML (single element)', function() {
		single.outerHTML;
	});

	bench('#outerHTML (nested elements)', function() {
		div.outerHTML;
	});

});