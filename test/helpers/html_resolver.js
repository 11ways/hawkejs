const Hawkejs = __Protoblast.Classes.Hawkejs;

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