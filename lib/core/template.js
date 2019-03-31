var TARGET_NAME = Symbol('target_block_name');

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
 * @version  2.0.0
 *
 * @type     {Function}
 */
Template.enforceProperty(function fnc(value) {

	if (arguments.length == 0 || typeof value != 'function') {
		return null;
	}

	if (!this.name) {
		this.name = value.name || 'precompiled';
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

	if (this._renderer) {
		return this._renderer;
	}

	if (this.parent) {
		return this.parent.renderer;
	}

}, function setRenderer(renderer) {
	return this._renderer = renderer
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
 * @version  2.0.0
 *
 * @type     {Hawkejs.BlockBuffer}
 */
Template.setProperty(function target_block() {

	var name = this.target_block_name;

	return this.renderer.blocks[name];
});

/**
 * The optional specific variables to use for rendering
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Object}
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
 * @version  1.2.2
 *
 * @return   {Object}
 */
Template.setMethod(function toDry() {
	return {
		value: {
			name         : this.name,
			options      : this.options,
			theme        : this.theme,
			active_theme : this.active_theme,
			found_main   : this.found_main,
			scripts      : this.scripts,
			source_name  : this.source_name
		}
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
 * Interpret the compiled code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   variables
 *
 * @return   {Pledge}
 */
Template.setMethod(function interpret(variables) {

	if (this.interpret_pledge) {
		return this.interpret_pledge;
	}

	this.renderer.interpreted_templates.push(this);

	let renderer = this.renderer;

	// Set the current active template
	renderer.current_template = this;

	// Create a new block buffer
	renderer.start(this.main_block_name);

	if (!variables) {
		variables = this.variables || renderer.variables;
	}

	// Set the variables that were used during rendering
	this.rendered_variables = variables;

	// Execute the compiled template
	try {
		this.fnc.call(renderer, renderer, this, variables, renderer.helpers);
	} catch (err) {
		this.hawkejs.handleError(renderer, renderer.errName, renderer.errLine, err);
		this.interpret_pledge = Classes.Pledge.reject(err);
		return this.interpret_pledge;
	}

	// End the template's main block
	renderer.end(this.main_block_name);

	// Unset this as the current template
	renderer.current_template = null;

	// Set it as the last template
	renderer.last_template = this;

	if (this.change_main) {
		renderer.main_block_name = this.main_block_name;
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
 * This method returns a pledge that'll resolve when
 * all placeholders in other templates have resolved.
 * Mainly used for the hawkejs foundation tag.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Template.setMethod(function waitForOtherTemplates() {

	var that = this,
	    placeholder,
	    force_wait,
	    template,
	    pledge = new Classes.Pledge(),
	    length = this.renderer.placeholder_elements.length,
	    tasks = [],
	    i;

	for (i = 0; i < length; i++) {
		placeholder = this.renderer.placeholder_elements[i];

		if (placeholder.start_template == this) {
			continue;
		}

		if (placeholder[Hawkejs.RESULT] != null) {
			continue;
		}

		// Don't wait for Renderer#addSubtemplate() promises,
		// or we could be waiting for ourselves
		if (placeholder.rendering_templates) {
			continue;
		}

		if (!placeholder.async_value_promise) {
			if (placeholder[Hawkejs.PRE_ASSEMBLE]) {

				// We can't start the PRE_ASSEMBLE function here, because
				// it might mess things up. So we add a pledge that should get
				// resolved later on
				if (!placeholder._resolve_me_too) {
					placeholder._resolve_me_too = new Classes.Pledge();
				}

				tasks.push(placeholder._resolve_me_too);
			}

			continue;
		}

		console.log('Waiting for', placeholder, placeholder.rendering_templates)

		tasks.push(placeholder.async_value_promise);
	}

	if (tasks.length == 0) {
		pledge.resolve();
	} else {
		console.log('Waiting for', tasks.length, tasks)
		Fn.series(tasks).done(function done(err) {

			if (err) {
				return pledge.reject(err);
			}

			console.log('Waiting again...')

			pledge.resolve(that.waitForOtherTemplates());
		});
	}

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

	var that = this,
	    pledge;

	if (!variables) {
		variables = this.variables;
	} else if (this.variables && this.variables != variables) {
		variables = Object.assign({}, this.variables, variables);
	}

	pledge = Fn.series(this.interpret(variables), function assemble(next) {
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
 * Assemble the interpreted code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Template.setMethod(function assemble() {

	var that = this,
	    block = this.renderer.blocks[this.target_block_name],
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
 * @version  2.0.0
 *
 * @param    {String|Array}   name
 */
Template.setCommand('extends', function _extends(name) {
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