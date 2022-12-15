if (!Classes.Hawkejs.RENDER_CONTENT) {
	throw new Error('RENDER_CONTENT symbo is missing');
}

const NestedRootElement = Fn.inherits('Hawkejs.Element', 'NestedRootElement');
NestedRootElement.setTemplateFile('elements/nested_root_element');
NestedRootElement.setAttribute('count', {type: 'number'});

const NestedChildElement = Fn.inherits('Hawkejs.Element', 'NestedChildElement');
NestedChildElement.setTemplateFile('elements/nested_child_element');
NestedChildElement.setAttribute('count', {type: 'number'});

const NestedAsyncElement = Fn.inherits('Hawkejs.Element', 'NestedAsyncElement');

NestedAsyncElement.setMethod(async function injectAsync() {

	await Blast.Classes.Pledge.after(25);

	this.innerHTML = 'DONE';

	if (this._resolve_me_too) {
		this._resolve_me_too.resolve();
	}
});

Classes.Hawkejs.setCachedMethod(NestedAsyncElement, Classes.Hawkejs.RENDER_CONTENT, function doRender() {
	return this.injectAsync();
});

const NestedSubRenderElement = Fn.inherits('Hawkejs.Element', 'NestedSubRender');
NestedSubRenderElement.setMethod(function renderSubTemplate(value) {
	let promise = this.populate(value);

	if (promise) {
		this.delayAssemble(promise);
	}
});

NestedSubRenderElement.setMethod(async function populate(view) {

	let options = {},
	    variables = {};

	await Blast.Classes.Pledge.after(25);

	let placeholder = this.hawkejs_renderer.addSubtemplate(view, options, variables);

	this.append(placeholder);
});

const NestedEmptyElement = Fn.inherits('Hawkejs.Element', 'NestedEmptyElement');

Classes.Hawkejs.setCachedMethod(NestedEmptyElement, Classes.Hawkejs.RENDER_CONTENT, function doRender() {
	return
});