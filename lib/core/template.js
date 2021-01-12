var TARGET_NAME = Symbol('target_block_name'),
    RENDERER = Symbol('renderer');

/**
 * The Template class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Templates}  templates
 * @param    {String}             name
 * @param    {Object}             options
 */
const Template = Fn.inherits('Hawkejs.Base', function Template(templates, name, options) {

	// The parent templates instance
	this.parent = templates;

	// The renderer
	this[RENDERER] = null;

	// Set the name
	if (name) {
		if (typeof name == 'function') {
			this.fnc = name;
		} else {
			this.name = name;
		}
	}
});

Template.setDeprecatedProperty('expands', 'extends');

/**
 * The render pledge/promise
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Pledge}
 */
Template.setProperty('interpret_pledge', null);

/**
 * Get the origin template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Template}
 */
Template.setProperty(function origin_template() {
	if (this.parent) {
		return this.parent.origin_template;
	}
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
Template.setProperty(function is_subtemplate() {

	if (this.parent) {
		return this.parent.is_subtemplate;
	}

	return false;
});

/**
 * The block name modifier
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.setProperty(function main_name_modifier() {

	if (this._mnm) {
		return this._mnm;
	}

	if (this.parent) {
		return this.parent.main_name_modifier;
	}

	return '';

}, function setMainNameModifier(val) {
	return this._mnm = val;
});

/**
 * Set the template name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.enforceProperty(function name(name) {

	if (arguments.length == 0) {
		return '';
	}

	let type = typeof name;

	if (type == 'function') {
		throw new Error('Template functions need to be assigned to the .fnc property');
	}

	if (type != 'string') {
		return '';
	}

	return name;
});

/**
 * Set the wanted theme
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.setProperty(function theme() {

	if (this._theme) {
		return this._theme;
	}

	if (this.parent) {
		return this.parent.theme || '';
	}

	return '';
}, function setTheme(value) {

	let current = this._theme;

	if (!value || typeof value != 'string') {
		value = '';
	}

	if (current && current != value) {
		this.found_main = null;
		this.fnc = null;
	}

	return this._theme = value;
});

/**
 * Set the active theme
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.enforceProperty(function active_theme(value) {

	if (!value || typeof value != 'string') {
		return '';
	}

	return value;
});

/**
 * Set the template function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.3
 *
 * @type     {Function}
 */
Template.enforceProperty(function fnc(value) {

	if (arguments.length == 0 || typeof value != 'function') {
		return null;
	}

	if (!this.name) {
		this.name = value.source_name || value.name || 'precompiled';
	}

	return value;
});

/**
 * The other templates this should expand into
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Template.enforceProperty(function extensions(value) {
	if (!value || !Array.isArray(value)) {
		value = [];
	}

	return value;
});

/**
 * Other templates this should switch into
 * (It's like a forced expansion)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Template.enforceProperty(function switches(value) {
	if (!value || !Array.isArray(value)) {
		value = [];
	}

	return value;
});

/**
 * The finished extensions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Template.enforceProperty(function extended_templates(value) {
	if (!value || !Array.isArray(value)) {
		value = [];
	}

	return value;
});

/**
 * Get the renderer instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Template.setProperty(function renderer() {

	if (this[RENDERER]) {
		return this[RENDERER];
	}

	if (this.parent) {
		return this.parent.renderer;
	}

}, function setRenderer(renderer) {
	return this[RENDERER] = renderer
});

/**
 * Did we find the correct theme of this template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Template.setProperty(function found_correct_theme() {

	if (this.fnc && this.theme == this.active_theme) {
		return true;
	}

	return false;
});

/**
 * The filename of the found source
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.enforceProperty(function source_name(value) {

	if (value) {
		return value;
	}

	if (this.fnc) {
		return this.fnc.source_name || '';
	}

	return '';
});

/**
 * The name of the main block of this template
 * (This does not include extensions)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.setProperty(function main_block_name() {

	if (!this.source_name) {
		return '';
	}

	let result = this.source_name + '__main__';

	if (this.main_name_modifier) {
		result += this.main_name_modifier;
	}

	return result;
});

/**
 * The name of the target block (the block we extended into)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Template.setProperty(function target_block_name() {

	if (this[TARGET_NAME]) {
		return this[TARGET_NAME];
	}

	if (!this.extended_templates.length) {
		return this.main_block_name;
	}

	return this.extended_templates[this.extended_templates.length - 1].target_block_name;
}, function setTarget(value) {
	this[TARGET_NAME] = value;
});

/**
 * Get the actual block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.3
 *
 * @type     {Hawkejs.BlockBuffer}
 */
Template.setProperty(function target_block() {

	var name = this.target_block_name;

	return this.renderer.blocks.get(name);
});

/**
 * The optional specific variables to use for rendering
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Variables}
 */
Template.setProperty(function variables() {
	if (this.parent) {
		return this.parent.variables;
	}
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Hawkejs.Template}
 */
Template.setStatic(function unDry(obj) {

	var result;

	result = new Template();

	Object.assign(result, obj);

	return result;
});

/**
 * Return an object for json-drying this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Object}
 */
Template.setMethod(function toDry() {

	var value = {
		name       : this.name,
		theme      : this.theme,
		found_main : this.found_main,
		options    : this.options,
		scripts    : this.scripts,
	};

	if (this.active_theme) {
		value.active_theme = this.active_theme;
	}

	if (this.source_name) {
		value.source_name = this.source_name;
	}

	return {
		value: value
	};
});

/**
 * Get an array of filenames this template could be at
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  2.0.0
 *
 * @return   {Array}
 */
Template.setMethod(function getFilenames() {

	var files = Bound.Array.cast(this.name);

	// If a non-default theme is set, look for that first
	if (this.theme != 'default') {
		files.unshift(this.theme + '/' + this.name);
	}

	return files;
});

/**
 * Compile the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Function}   callback
 */
Template.setMethod(function compile(callback) {

	if (this.fnc) {
		return Blast.nextTick(callback);
	}

	let that = this,
	    files = this.getFilenames();

	this.hawkejs.getCompiled(files, function gotCompiledFile(err, fnc) {

		if (err != null) {
			return callback(err);
		}

		if (!fnc) {
			return callback(new Error('Error compiling template'));
		}

		if (files[0] == fnc.source_name) {
			that.active_theme = that.theme;
		}

		that.fnc = fnc;

		return callback();
	});
});

/**
 * Execute the compiled code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.0
 * @version  2.1.3
 *
 * @param    {Object}   variables
 */
Template.setMethod(function evaluate(variables) {

	let renderer = this.renderer;

	renderer.emit('executing_template', this.name, this);

	// Set the current active template
	renderer.current_template = this;

	// Create a new block buffer
	renderer.start(this.main_block_name);

	if (!variables) {
		variables = this.variables || renderer.variables;
	}

	// Set the variables that were used during rendering
	this.rendered_variables = variables;

	// Actually call the compiled function
	this.fnc.call(renderer, renderer, this, variables, renderer.helpers);

	// End the template's main block
	renderer.end(this.main_block_name);

	// Unset this as the current template
	renderer.current_template = null;

	// Set it as the last template
	renderer.last_template = this;

	if (this.change_main) {
		renderer.main_block_name = this.main_block_name;
	}

	renderer.emit('executed_template', this.name, this);
});

/**
 * Interpret the compiled code & start the extensions
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.0
 *
 * @param    {Object}   variables
 *
 * @return   {Pledge}
 */
Template.setMethod(function interpret(variables) {

	if (this.interpret_pledge) {
		return this.interpret_pledge;
	}

	let renderer = this.renderer;

	renderer.interpreted_templates.push(this);

	// Execute the compiled template
	try {
		this.evaluate(variables);
	} catch (err) {
		this.hawkejs.handleError(renderer, renderer.errName, renderer.errLine, err);
		this.interpret_pledge = Classes.Pledge.reject(err);
		return this.interpret_pledge;
	}

	let that = this;

	let pledge = Fn.series(function doExtensions(next) {

		if (!that.extensions.length) {
			return next();
		}

		that.doExtensions(variables).done(next);
	}, function done(err) {

		if (err) {
			return;
		}

		return that;
	});

	this.interpret_pledge = pledge;

	return pledge;
});

/**
 * Render the template:
 * Interpret the code & assemble the blocks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   variables
 *
 * @return   {Pledge}
 */
Template.setMethod(function render(variables) {

	var that = this;

	if (!variables) {
		variables = this.variables;
	} else if (this.variables && this.variables != variables) {
		variables = this.variables.overlay(variables);
	}

	let pledge = Fn.series(this.interpret(variables), function assemble(next) {
		that.assemble().done(next);
	}, function done(err, result) {

		if (err) {
			return;
		}

		return result[1];
	});

	return pledge;
});

/**
 * Is this template a child of the given template/placeholder?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.1.0
 *
 * @param    {Placeholder|Template}   instance
 *
 * @return   {Boolean}
 */
Template.setMethod(function isDescendantOf(instance) {

	if (!instance) {
		return false;
	}

	let template;

	if (instance instanceof Template) {
		template = instance;
	} else if (instance instanceof Hawkejs.Templates) {
		// Get the active template
		template = instance.active;
	} else if (instance.rendering_templates) {
		// The given instance was a placeholder implementing other templates,
		// we have to look for those!
		return this.isDescendantOf(instance.rendering_templates);
	}

	if (!template) {
		return false;
	}

	// It's the same template, so yes!
	if (template == this) {
		return true;
	}

	if (this.parent && this.parent.origin_template) {
		return this.parent.origin_template.isDescendantOf(instance);
	}

	return false;
});

/**
 * Assemble the interpreted code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.3
 *
 * @return   {Pledge}
 */
Template.setMethod(function assemble() {

	var that = this,
	    block = this.renderer.blocks.get(this.target_block_name),
	    pledge = new Classes.Pledge();

	if (!block) {
		return Pledge.reject(new Error('Could not find the template target block'));
	}

	block.assemble().done(function assembled(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		// If the target block has changed, assemble it again
		if (that.target_block_name != block.name) {
			pledge.resolve(that.assemble());
		} else {
			pledge.resolve(result);
		}
	});

	return pledge;
});

/**
 * Extend into another template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.3
 *
 * @param    {String|Array}   name
 */
Template.setCommand('extends', function _extends(name) {

	if (name && typeof name == 'object' && name.expression) {

		let args = this.renderer.parseExpressionAsArguments(name.expression);

		name = args[0];
	}

	this.extensions.push(new Hawkejs.Templates(this.renderer, name));
});

/**
 * Switch to another template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|Array}   name
 */
Template.setCommand(function switchTemplate(name, variables) {
	var templates = new Hawkejs.Templates(this.renderer, name);

	// The main block name should be modified,
	// so the same template can be implemented multiple times
	templates.main_name_modifier = String(++this.renderer.implement_count);

	if (variables) {
		templates.variables = variables;
	}

	templates.force_render = true;

	this.extensions.push(templates);
});