const Classes = Blast.Classes,
      Hawkejs = Classes.Hawkejs;

/**
 * My-text custom element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var MyText = Blast.Bound.Function.inherits('Hawkejs.Element', function MyText() {
	MyText.super.call(this);
});

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
//MyText.setTemplateFile('elements/my_text');

/**
 * Complicated class that turns into an element in hawkejs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var MyTranslation = Blast.Bound.Function.inherits(function MyTranslation(domain, key, options) {

	if (options == null) {
		options = {};
	}

	// The domain/scope/category of this translation
	this.domain = domain;
	this.key = key;
	this.options = options;
	this.suffixes = [];
});

/**
 * The available hawkejs ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @return   {Object}
 */
MyTranslation.setProperty(function view() {

	if (this._view) {
		return this._view;
	}

	if (Blast.isBrowser) {
		return hawkejs.scene.generalView;
	}

}, function setView(view) {
	this._view = view;
});

/**
 * Clone this I18n for JSON-dry
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.4.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {I18n}
 */
MyTranslation.setMethod(function dryClone(wm) {

	var result;

	// Create a new i18n instance
	result = new this.constructor(this.domain, this.key, JSON.clone(this.options, wm));

	// Clone the suffixes too
	result.suffixes = JSON.clone(this.suffixes);

	// The view should stay the same, though
	result.view = this.view;

	return result;
});

/**
 * Clone this I18n for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {WeakMap}    wm
 * @param    {ViewRender} viewrender
 *
 * @return   {I18n}
 */
MyTranslation.setMethod(function toHawkejs(wm, viewrender) {
	var result = this.dryClone(wm);
	result.view = viewrender;
	return result;
});

/**
 * Return an object for json-drying this i18n object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @return   {Object}
 */
MyTranslation.setMethod(function toDry() {
	return {
		value: {
			domain   : this.domain,
			key      : this.key,
			options  : this.options,
			suffixes : this.suffixes
		},
		path: '__Protoblast.Classes.MyTranslation'
	};
});

/**
 * Prepare the result
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.6.0
 * @version  0.6.0
 */
MyTranslation.setMethod(function prepareResult(fetch_content) {

	var has_params,
	    element,
	    result,
	    suffix,
	    i;

	if (this[Classes.Hawkejs.RESULT] != null) {
		return this[Classes.Hawkejs.RESULT];
	}

	has_params = !Blast.Bound.Object.isEmpty(this.parameters);

	// If no result has been found yet,
	// try it now, maybe it can be found synchronously
	if (fetch_content !== false && !this.result) {
		this.renderHawkejsContent();
	}

	if (this.result) {
		result = this.result;
	} else {
		result = this.options.fallback || this.key;
	}

	if (this.options.html === false) {
		this.options.wrap = false;
		result = result.stripTags();
	}

	suffix = '';
	for (i = 0; i < this.suffixes.length; i++) {
		suffix += this.suffixes[i];
	}

	if (this.options.wrap === false) {
		result = result + suffix;
	} else {
		element = Classes.Hawkejs.Hawkejs.createElement('my-text');
		element.dataset.domain = this.domain;
		element.dataset.key = this.key;
		element.innerHTML = result;

		if (suffix) {
			element.innerHTML += suffix;
		}

		result = element;
	}

	this[Classes.Hawkejs.RESULT] = result;

	return result;
});

/**
 * Callback with the translated content (for Hawkejs)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.6.0
 *
 * @param    {Hawkejs.Renderer}   [renderer]
 *
 * @return   {Pledge}
 */
MyTranslation.setMethod(async function renderHawkejsContent(renderer) {

	var that = this,
	    params,
	    source,
	    result;

	if (this.domain) {
		source = this.domain;
	} else {
		source = 'default';
	}

	source += '.' + this.key;

	if (Blast.isNode) {

		await Classes.Pledge.after(5);

		result = 'SERVERTRANSLATED(' + source + ')';
		this.result = result;
		this.prepareResult(false);

	} else {

		await Classes.Pledge.after(20);

		result = 'CLIENTTRANSLATED(' + source + ')';
		this.result = result;
		this.prepareResult(false);
	}

	return this[Hawkejs.RESULT];
});

/**
 * Return the string result
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.6.0
 *
 * @return   {String}
 */
MyTranslation.setMethod(function toString() {

	var result = this.prepareResult();

	if (typeof result == 'string') {
		return result;
	}

	return result.outerHTML;
});

/**
 * Create an i18n string from inside the view.
 * Still needs to be printed to the view.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {I18n}
 */
Blast.Classes.Hawkejs.Renderer.setCommand(function __test(domain, key, parameters) {

	var translation,
	    options,
	    html,
	    wrap;

	if (Blast.Bound.Object.isObject(key)) {
		parameters = key;
		key = domain;
		domain = 'default';
	} else if (key == null) {
		key = domain;
		domain = 'default';
	}

	if (parameters) {
		html = parameters.html;
		wrap = parameters.wrap;
		delete parameters.wrap;
		delete parameters.html;
	}

	options = {
		wrap: wrap,
		html: html,
		parameters: parameters,
		locales: this.internal('locales')
	};

	translation = new MyTranslation(domain, key, options);
	translation.view = this;

	return translation;
});