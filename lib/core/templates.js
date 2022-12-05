var RENDERER = Symbol('renderer');

/**
 * The Templates class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 * @param    {Hawkejs.Templates}  names
 * @param    {Object}             options
 */
const Templates = Fn.inherits('Hawkejs.Base', function Templates(renderer, names, options) {

	// The main renderer instance
	this.renderer = renderer;

	// Normalize the options
	this.options = options || {};

	// Set the actual templates to use
	this.templates = names;

	// Should this be forced to render?
	// (Used for extensions/switches)
	this.force_render = false;

	// The template where this was made in
	this.origin_template = renderer.current_template;
});

/**
 * unDry a templates object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Hawkejs.Templates}
 */
Templates.setStatic(function unDry(obj) {

	var result,
	    inst;

	if (typeof hawkejs != 'undefined') {
		inst = hawkejs;
	} else {
		inst = {};
	}

	result = new Templates({hawkejs: inst});

	Object.assign(result, obj);

	return result;
});

/**
 * The variables to use for these templates
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Variables}
 */
Templates.enforceProperty(function variables(value) {

	if (value) {
		return Hawkejs.Variables.cast(value, this.renderer);
	}

	return null;
});

/**
 * Is this a subtemplate render?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Templates.setProperty('is_subtemplate', false);

/**
 * The block name modifier
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Templates.setProperty('main_name_modifier', '');

/**
 * Get the renderer instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Templates.setProperty(function renderer() {
	return this[RENDERER];
}, function setRenderer(renderer) {
	return this[RENDERER] = renderer
});

/**
 * The amount of template options given
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Number}
 */
Templates.setProperty(function length() {

	if (this.templates) {
		return this.templates.length || 0;
	}

	return 0;
});

/**
 * Get the main name of the template (first one supplied)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @type     {String}
 */
Templates.setProperty(function name() {

	var template,
	    i;

	for (i = 0; i < this.templates.length; i++) {
		template = this.templates[i];

		if (template.name) {
			return template.name;
		}
	}
});

/**
 * Set the templates to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.20
 *
 * @type     {Array}
 */
Templates.enforceProperty(function templates(names) {

	if (names instanceof Hawkejs.Templates) {
		names = names.templates.slice(0);
	}

	if (Array.isArray(names)) {
		names = Bound.Array.flatten(names);
	} else {
		names = [names];
	}

	let to_check = names,
	    entry,
	    i;
	
	names = [];
	
	for (i = 0; i < to_check.length; i++) {
		entry = to_check[i];

		if (typeof entry == 'object' && entry instanceof Hawkejs.Templates) {

			for (let template of entry.templates) {
				names.push(template);
			}

			continue;
		}

		names.push(entry);
	}

	for (i = 0; i < names.length; i++) {
		if (!(names[i] instanceof Hawkejs.Template)) {
			names[i] = new Hawkejs.Template(this, names[i]);
		} else {
			names[i].parent = this;
		}

		names[i].renderer = this.renderer;

		if (this.main_name_modifier) {
			names[i].main_name_modifier = this.main_name_modifier;
		}

		if (i == 0 && names[i].fnc) {
			this.active = names[i];
		}
	}

	return names;
});

/**
 * Set the currently active template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Template}
 */
Templates.enforceProperty(function active(template, current) {

	if (arguments.length == 0 || !template) {
		template = null;
	}

	if (current == template) {
		return template;
	}

	return template;
});

/**
 * Set/get the theme to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.6
 *
 * @type     {String}
 */
Templates.setProperty(function theme() {
	return this._theme || this.renderer.theme || '';
}, function setTheme(value) {

	this._theme = value || '';

	for (let i = 0; i < this.templates.length; i++) {
		if (this.templates[i].theme) {
			this.templates[i].theme = value;
		}
	}

	return this._theme;
});

/**
 * Did we find the first, main template?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Templates.setProperty(function found_main() {

	if (this.active && this.active == this.templates[0]) {
		return true;
	}

	return false;
});

/**
 * Return an object for json-drying this instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
Templates.setMethod(function toDry() {

	var value = {
		templates : this.templates,
		active    : this.active,
		options   : this.options,
		theme     : this.theme
	};

	if (this.variables) {
		value.variables = this.variables;

		if (this.renderer && this.renderer.prepareVariables) {
			value.variables = this.renderer.prepareVariables(this.variables);
		}
	}

	return {
		value: value
	};
});

/**
 * Return a string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {String}
 */
Templates.setMethod(function toString() {
	if (this.active) {
		return this.active.toString();
	} else if (this.templates[0]) {
		return this.templates[0].toString();
	}

	return '';
});

/**
 * Get the first available compiled template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.3
 *
 * @param    {Function}   callback
 */
Templates.setMethod(function getCompiled(callback) {

	var that = this,
	    filenames,
	    i;

	if (this.active && this.active.fnc) {
		return callback(null, that.active);
	}

	this.renderer.emit('compiling_templates', this);

	filenames = [];

	for (i = 0; i < this.templates.length; i++) {
		filenames = filenames.concat(this.templates[i].getFilenames());
	}

	this.hawkejs.getFirstAvailableCompiled(filenames, function gotResult(err, result) {
		return that._gotCompiledResult(err, result, callback);
	});
});

/**
 * Handle result of getCompiled call
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.3
 *
 * @param    {Error}      err
 * @param    {Object}     result
 * @param    {Function}   callback
 */
Templates.setMethod(function _gotCompiledResult(err, result, callback) {

	var template,
	    found,
	    names,
	    i,
	    j;

	if (err) {
		return callback(err);
	}

	for (i = 0; i < this.templates.length; i++) {
		template = this.templates[i];
		names = template.getFilenames();

		for (j = 0; j < names.length; j++) {
			if (names[j] == result.name) {
				found = template;
				template.renderer = this.renderer;
				template.fnc = result.compiled;
				this.active = template;

				break;
			}
		}

		if (found) {
			break;
		}
	}

	this.renderer.emit('compiled_templates', this);

	callback(null, found);
});

/**
 * Interpret the first found compiled template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   variables
 *
 * @return   {Pledge}
 */
Templates.setMethod(function interpret(variables) {

	var that = this,
	    pledge = new Classes.Pledge();

	this.getCompiled(function gotTemplate(err, template) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(template.interpret(variables));
	});

	return pledge;
});

/**
 * Render the first found compiled template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   variables
 *
 * @return   {Pledge}
 */
Templates.setMethod(function render(variables) {

	var that = this,
	    pledge = new Classes.Pledge();

	this.getCompiled(function gotTemplate(err, template) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(template.render(variables));
	});

	return pledge;
});