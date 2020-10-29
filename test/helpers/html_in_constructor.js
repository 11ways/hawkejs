var HtmlInConstructor = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function HtmlInConstructor() {
	HtmlInConstructor.super.call(this);
	this.innerHTML = '<bold>This is a test</bold>';
	this.setAttribute('my-test', 47);
});

HtmlInConstructor.setMethod(function introduced() {
	let bold = this.querySelector('bold');
	bold.setAttribute('data-test', '47');
});

HtmlInConstructor.setMethod(function addDeep(text) {

	let el = this.createElement('html-in-constructor');

	el.querySelector('bold').textContent = text;

	this.append(el);

	return el;
});