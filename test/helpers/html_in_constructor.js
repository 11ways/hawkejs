var HtmlInConstructor = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function HtmlInConstructor() {
	HtmlInConstructor.super.call(this);
	this.innerHTML = '<bold>This is a test</bold>';
	this.setAttribute('my-test', 47);
});
