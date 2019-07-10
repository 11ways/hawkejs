const SCOPE_ID = Symbol('scope_id'),
      OPTIONS = Symbol('options');

/**
 * The Renderer class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs}   hawkejs
 */
const Renderer = Fn.inherits('Hawkejs.Base', function Renderer(hawkejs) {

	// The parent hawkejs instance
	this.hawkejs = hawkejs;

	// The root renderer (itself by default)
	this.root_renderer = this;

	// Blocks
	this.blocks = {};

	// The chain of blocknames
	this.chain = [];

	// Assignments
	this.assigns = {};

	// Prefix id numbers
	this.prefix_id_numbers = {};

	// Template times
	this.times = {};

	// Templates to render
	this.queued_templates = [];

	// The clone symbol
	this.clone_symbol = Symbol('clone');

	// Created dialogs
	this.dialogs = [];

	// The implement count
	this._implement_count = null;

	// Capture the print() method?
	this.captured_print = null;
	this.capture_print = false;

	this[SCOPE_ID] = null;
});

Renderer.setDeprecatedProperty('assign_end',      'assignEnd');
Renderer.setDeprecatedProperty('server_var',      'serverVar');
Renderer.setDeprecatedProperty('set_title',       'setTitle');
Renderer.setDeprecatedProperty('head_tag',        'addHeadTag');
Renderer.setDeprecatedProperty('meta_tag',        'addMetaTag');
Renderer.setDeprecatedProperty('create_element',  'createElement');
Renderer.setDeprecatedProperty('pageTitle',       'page_title');
Renderer.setDeprecatedProperty('print_partial',   'partial');

/**
 * Revive the object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Renderer.setStatic(function unDry(value) {

	var result = new Renderer(Blast.Globals.hawkejs);

	Object.assign(result, value);

	return result;
});

/**
 * Set a shared property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Function}   fnc
 */
Renderer.setStatic(function enforceRootProperty(fnc) {
	this.enforceProperty(fnc.name, function doEnforcer(value, current) {

		if (this.root_renderer !== this) {
			return this.root_renderer[fnc.name];
		}

		return fnc.call(this, value, current);
	});
});

/**
 * The variables to use when rendering
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Object}
 */
Renderer.enforceProperty(function variables(value) {
	return value || {};
});

/**
 * The variables to expose to the scene
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Object}
 */
Renderer.enforceRootProperty(function expose_to_scene(value) {
	return value || {};
});

/**
 * Items to preload
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function items_to_preload(value) {

	if (!Array.isArray(value)) {
		value = [];
	}

	return value;
});

/**
 * Server-side variables
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Object}
 */
Renderer.enforceProperty(function server_variables(value) {
	return value || {};
});

/**
 * Styles
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function styles(value) {
	return value || [];
});

/**
 * Scripts
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function scripts(value) {
	return value || [];
});

/**
 * Extra tags to add to the <head> tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function head_tags(value) {
	return value || [];
});

/**
 * Array of all template instances we have interpreted
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function interpreted_templates(value) {
	return value || [];
});

/**
 * Array of all placeholder elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function placeholder_elements(value) {
	return value || [];
});

/**
 * The available helper instances
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {HelperCollection}
 */
Renderer.enforceProperty(function helpers(value) {

	if (!value) {
		value = new Hawkejs.HelperCollection(this);
	}

	return value;
});

/**
 * Pre-finish tasks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function pre_finish_tasks(value) {

	if (!value || !Array.isArray(value)) {
		value = [];
	}

	this.root_renderer._has_pre_finish_tasks = true;

	return value;
});

/**
 * The scope id (id of the element to use as root)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Renderer.setProperty(function scope_id() {

	if (this[SCOPE_ID]) {
		return this[SCOPE_ID];
	}

	if (this.root_renderer !== this) {
		return this.root_renderer.scope_id;
	}

}, function setScopeId(id) {
	this[SCOPE_ID] = id;
});

/**
 * Add a reference to protoblast
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Object}
 */
Renderer.setProperty('Blast', Blast);

/**
 * Are there pre_finish_tasks to do?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Renderer.setProperty(function has_pre_finish_tasks() {

	if (!this.root_renderer._has_pre_finish_tasks) {
		return false;
	}

	return this.pre_finish_tasks.length > 0;
});

/**
 * The theme property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Renderer.setProperty(function theme() {

	if (this._theme) {
		return this._theme;
	}

	if (this != this.root_renderer) {
		return this.root_renderer.theme;
	}

	return '';
}, function setTheme(value) {
	return this._theme = value;
});

/**
 * The current active element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {HTMLElement}
 */
Renderer.setLocalProperty(function $0() {

	if (!this.current_block || !this.current_block.elements.length) {
		return;
	}

	return this.current_block.elements[this.current_block.elements.length - 1];
});

/**
 * The layout to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Renderer.setProperty('layout', '');

/**
 * An id counter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Number}
 */
Renderer.setProperty('id_count', 0);

/**
 * Will get set to true if the render is meant to take place on the client-side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Renderer.setProperty('is_for_client_side', false);

/**
 * Keep track of amount of `implements` made
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Number}
 */
Renderer.setProperty(function implement_count() {

	if (this.root_renderer !== this) {
		return this.root_renderer.implement_count;
	}

	if (this._implement_count == null) {
		this._implement_count = 0;
	}

	return this._implement_count;
}, function setImplementCount(value) {

	if (this.root_renderer !== this) {
		return this.root_renderer.implement_count = value;
	}

	return this._implement_count = value;
});

/**
 * The current active block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.BlockBuffer}
 */
Renderer.setProperty(function current_block() {
	return this.blocks[this.current_block_name];
});

/**
 * The main template (the last template queued)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Template}
 */
Renderer.setProperty(function main_template() {

	var result;

	if (this.queued_templates && this.queued_templates.length) {
		result = this.queued_templates[this.queued_templates.length - 1];
	}

	return result;
});

/**
 * The basis for block ids
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Renderer.enforceProperty(function base_id(value) {

	if (!value) {
		if (Blast.isNode) {
			value = 'serverside';
		} else {
			value = Date.now();
		}
	}

	return value;
});

/**
 * Dry this object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Renderer.setMethod(function toDry() {

	var result = {
		value : this.toJSON()
	};

	return result;
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Renderer.setMethod(function toJSON() {

	var result = {
		variables        : this.prepareVariables(this.variables),
		expose_to_scene  : this.prepareVariables(this.expose_to_scene),
		request          : this.request,
		blocks           : this.blocks,
		page_title       : this.page_title,
		last_template    : this.last_template,
		focus_block      : this.focus_block,
		assigns          : this.assigns,
		theme            : this.theme,
		history          : this.history,
		queued_templates : this.queued_templates,

		enableClientRender: this.enableClientRender,
		live_bindings: this.live_bindings,
		inlineEvents: this.inlineEvents,

		headTags: this.headTags
	};

	// base_id is always "hserverside" on the server,
	// we don't want to force that on the client-side
	// if the render is meant to take place there
	if (!this.is_for_client_side) {
		result.base_id = this.base_id;
	}

	// if (this.scriptBlocks.length) {
	// 	result.scriptBlocks = this.scriptBlocks;
	// }

	// if (this.styleBlocks.length) {
	// 	result.styleBlocks = this.styleBlocks;
	// }

	if (this.scripts.length) {
		result.scripts = this.scripts;
	}

	if (this.styles.length) {
		result.styles = this.styles;
	}

	return result;
});

/**
 * Get a clone of the given object, but cache it
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Object}   variables
 *
 * @return   {Object}
 */
Renderer.setMethod(function prepareVariables(variables) {

	if (!variables) {
		return null;
	}

	if (variables[Hawkejs.PRE_CLONE]) {
		return variables[Hawkejs.PRE_CLONE];
	}

	if (variables[this.clone_symbol]) {
		return variables[this.clone_symbol];
	}

	let clone = Bound.JSON.clone(variables, 'toHawkejs', [this]);

	variables[this.clone_symbol] = clone;
	clone[this.clone_symbol] = clone;

	return clone;
});

/**
 * Queue a template to render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String|Array}   names       The template to render (first found)
 * @param    {Object}         variables   The variables to pass to the template
 *
 * @return   {Hawkejs.Templates}
 */
Renderer.setMethod(function add(names, variables) {

	if (!names || !names.length) {
		return;
	}

	let templates = new Hawkejs.Templates(this, names);

	if (variables) {
		templates.variables = variables;
	}

	this.queued_templates.push(templates);

	return templates;
});

/**
 * Render the queue
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function render(names, variables) {

	if (this.is_rendering) {
		return Classes.Pledge.reject(new Error('This renderer has already started, unable to render "' + names + '"'));
	}

	if (names) {
		this.add(names, variables);
	}

	this.is_rendering = true;

	if (!this.queued_templates.length) {
		return Classes.Pledge.reject(new Error('No templates were given to render'));
	}

	return this._renderQueue();
});

/**
 * Render the queue and resolve to HTML.
 * (Unless this is for a client-side render, then it'll resolve to the renderer)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function renderHTML(names, variables) {

	var that = this,
	    pledge = new Classes.Pledge();

	this.render(names, variables).done(function rendered(err, block) {

		if (err) {
			return pledge.reject(err);
		}

		if (block == that) {
			return pledge.resolve(that);
		}

		pledge.resolve(block.toHTML());
	});

	return pledge;
});

/**
 * Render the queued templates
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function _renderQueue() {

	var that = this,
	    tasks = [],
	    pledge = new Classes.Pledge(),
	    i;

	for (i = 0; i < this.queued_templates.length; i++) {
		let templates = this.queued_templates[i];
		tasks.push(this.renderTemplate(templates));
	}

	Fn.series(Fn.parallel(tasks), function doLayout(next) {

		// See if there is still a layout file to do
		if (that.layout) {
			that.renderTemplate(that.layout).done(next);
		} else {
			next();
		}
	}, function done(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		// Send the renderer object if it's meant for the browser
		if (that.client_render && Blast.isNode) {
			return pledge.resolve(that.serializeForClientSideRender());
		}

		let last = result[1] || result[0][result[0].length - 1],
		    finish_pledge = that.finish(last.target_block_name);

		if (Blast.isBrowser) {
			finish_pledge = Fn.series(finish_pledge, function finishRest(next) {
				that.finishOnBrowser().done(next);
			}, function done(err, result) {

				that.emit('rendered_templates');

				if (err) {
					return err;
				}

				return result[0];
			});
		}

		pledge.resolve(finish_pledge);
	});

	return pledge;
});

/**
 * Finish blocks on the browser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function finishOnBrowser() {

	var tasks = [],
	    name,
	    el;

	for (name in this.blocks) {
		el = hawkejs.scene.getBlockElement(name);

		if (!el) {
			continue;
		}

		tasks.push(this.blocks[name].assemble());
	}

	return Fn.parallel(tasks);
});

/**
 * Serialize for the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Renderer.setMethod(function serializeForClientSideRender() {

	this.is_for_client_side = true;

	return this;
});

/**
 * Render the given templates object and return HTML
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Templates}   templates
 * @param    {Object}              variables
 * @param    {String}              main_name_modifier
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function renderTemplate(templates, variables, main_name_modifier) {

	let that = this,
	    found_template;

	if (typeof templates == 'string' || !(templates instanceof Hawkejs.Templates)) {
		templates = new Hawkejs.Templates(this, templates);
	} else {
		templates.renderer = this;
	}

	if (main_name_modifier) {
		templates.main_name_modifier = main_name_modifier;
	}

	if (variables) {
		templates.variables = variables;
	}

	let pledge = Fn.series(this._emitBegin(templates), function doRender(next) {

		// Return early if this is meant for the browser
		if (that.client_render && Blast.isNode) {
			return next();
		}

		that.variables = that.prepareVariables(that.variables);

		if (templates.variables) {
			that.prepareVariables(templates.variables);
		}

		// Clone the variables, use the toHawkejs method if available
		let variables = templates.variables || that.variables;

		// Get the compiled template
		templates.getCompiled(function gotTemplate(err, template) {

			if (err) {
				return next(err);
			}

			found_template = template;

			// Render the found template
			template.interpret(variables).done(next);
		});

	}, function done(err, result) {

		if (err) {
			return;
		}

		return found_template;
	});

	return pledge;
});

/**
 * Do queued pre-finish tasks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Pledge|undefined}
 */
Renderer.setMethod(function doQueuedTasks() {

	if (this.has_pre_finish_tasks) {
		let that = this,
		    tasks = [];

		while (this.pre_finish_tasks.length) {
			let entry = this.pre_finish_tasks.shift();

			tasks.push(function doEntry(next) {
				Hawkejs.doNext(entry(), next);
			});
		}

		return Fn.parallel(tasks, function donePreFinishTasks(err) {

			if (err) {
				return err;
			}

			return true;
		});
	}
});

/**
 * Finish the given block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name   The name of the block to finish
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function finish(name) {

	var block = this.blocks[name];

	if (!block) {
		return Classes.Pledge.resolve(null);
	}

	return block.assemble();
});

/**
 * Render the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Templates}   templates
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function _emitBegin(templates) {

	var that = this;

	return Fn.parallel([function onHawkejs(next) {
		that.hawkejs.emit({
			type   : 'renderer',
			status : 'begin',
			client : !!that.client_render,
		}, that, templates, next);
	}, function onRenderer(next) {
		that.emit('begin', templates, next);
	}]);
});

/**
 * Set the start time for the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The template name that has started rendering
 */
Renderer.setMethod(function timeStart(name) {

	if (!this.times[name]) {
		this.times[name] = {};
	}

	// Set the start time
	this.times[name].start = Blast.hrtime();
});

/**
 * Set the end time for the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The template name that has ended rendering
 */
Renderer.setMethod(function timeEnd(name) {

	var end;

	if (!this.times[name]) {
		throw new Error('Illegal timeEnd call for template ' + name);
	}

	// Get the end time
	end = Blast.hrtime(this.times[name].start);

	// Calculate the duration in nanoseconds
	this.times[name].duration = end[0] * 1e9 + end[1];

	// If an error occurs, it's outside of the view
	this.errName = 'post';

	//console.log("Compiled execution of " + name + " took %d milliseconds", ~~(this.times[name].duration/1000)/1000);
});

/**
 * Set error information
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name    The template being rendered
 * @param    {Number}   line    The line nr in the original ejs file
 */
Renderer.setMethod(function setErr(name, line) {
	this.errLine = line;
	this.errName = name;
});

/**
 * Set the theme to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name    The theme name
 */
Renderer.setMethod(function setTheme(name) {
	this.theme = name;
});

/**
 * Create a block:
 * Create a new BlockBuffer if it doesn't exist already.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   blockName
 * @param    {Object}   options
 */
Renderer.setMethod(function createBlock(block_name, options) {

	var result = this.blocks[block_name];

	if (!options) {
		options = {};
	}

	// Just Create the block if it doesn't exist already
	if (result == null) {
		result = this.blocks[block_name] = new Hawkejs.BlockBuffer(this, block_name, options);
	} else if (result.options.created_manually) {
		// Use manually created block as if it were new
	} else if (options.start_call && !options.append) {
		// This was requested using `start()`

		let sub_options = Object.assign({}, options);
		sub_options.start_call = null;
		sub_options.ancestor = result;

		block_name = block_name + '__expanded__';
		let new_block = this.createBlock(block_name, sub_options);

		result.other_instances.push(new_block);

		return new_block;
	}

	return result;
});

/**
 * Get or create the wanted block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String}   block_name
 *
 * @return   {Hawkejs.BlockBuffer}
 */
Renderer.setMethod(function getBlockByName(block_name) {

	if (!block_name) {
		block_name = this.current_block_name || '__main__';
	}

	if (!this.blocks[block_name]) {
		this.blocks[block_name] = new Hawkejs.BlockBuffer(this, block_name);
	}

	return this.blocks[block_name];
});

/**
 * Get a unique string for use as ID
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   prefix
 *
 * @return   {String}
 */
Renderer.setCommand(function getId(prefix) {

	if (!prefix) {
		return 'h' + this.base_id + '-' + this.root_renderer.id_count++;
	}

	if (!this.prefix_id_numbers[prefix]) {
		this.prefix_id_numbers[prefix] = 0;
	}

	return prefix + '-' + this.prefix_id_numbers[prefix]++;
});

/**
 * Print content to the given block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   content
 *
 * @return   {Number}   The index of the pushed line
 */
Renderer.setCommand(function print(content, block) {

	if (content == null) {
		return;
	}

	if (this.capture_print) {
		if (!this.captured_print) {
			this.captured_print = [];
		}

		this.captured_print.push(content);
		return;
	}

	this.getBlockByName(block).push(content);
});

/**
 * Create and print an HTML element.
 * (Do not confuse with the deprecated `print_element`)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 * @param    {Object}   options
 *
 * @return   {HTMLElement}
 */
Renderer.setMethod(function printElement(name, options) {

	var add_identifier,
	    element;

	if (options && options.add_identifier != null) {
		add_identifier = options.add_identifier;
	} else {
		add_identifier = false;
	}

	element = this.createElement(name, add_identifier);

	if (!element) {
		return;
	}

	let skip_print = false;

	if (options) {
		element[OPTIONS] = options;

		if (options.print === false) {
			skip_print = true;
		}

		this.applyElementOptions(element, options);
	}

	if (name[0] == '!') {
		// Don't add as a parent element
		this.current_block.push(element);
		return;
	} else if (name == 'body') {

		element.dataset.heTemplate = this.current_template.name;
		element.dataset.heName = this.current_template.main_block_name;

		if (this.current_template.active_theme) {
			element.dataset.heTheme = this.current_template.active_theme;
		}
	} else if (name == 'img') {
		if (options && options.attributes && options.attributes.src) {
			this.preload(options.attributes.src, 'image');
		}
	} else if (name == 'he-bottom') {
		this.has_bottom = true;
	}

	if (skip_print || (!this.current_block && name == 'he-placeholder')) {
		element.skipped_print = true;
		return element;
	}

	if (name == 'he-placeholder') {
		element.start_template = this.current_template;
		this.placeholder_elements.push(element);
	}

	// Only push the new element if a block is active
	// (A renderer has no active block outside of the Template#interpret method)
	if (this.current_block) {
		this.current_block.pushElement(element);

		if (Hawkejs.Hawkejs.VOID_ELEMENTS[element.nodeName]) {
			this.closeElement(name);
		}
	}

	return element;
});

/**
 * Register an element we can assign content to
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 * @param    {Element}  element
 * @param    {Object}   config
 */
Renderer.setMethod(function registerAssign(name, element, config) {

	var options,
	    assign;

	if (config) {
		if (config.attributes) {
			options = {
				className : config.attributes.class
			};
		} else {
			options = config;
		}
	}

	this.assigns[name] = {
		element : element,
		options : options
	};
});

/**
 * Apply element options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Renderer.setMethod(function applyElementOptions(element, options) {

	let key,
	    val,
	    i;

	for (key in options.attributes) {
		val = options.attributes[key];

		if (val != null) {
			element.setAttribute(key, val);

			if (key == 'data-he-name') {

				if (!options.attributes['data-hid']) {
					Hawkejs.Element.Element.prototype.setIdentifier.call(element, this.getId());
				}

				this.registerAssign(val, element, options);

				Hawkejs.setCachedMethod(element, Hawkejs.RENDER_CONTENT, Hawkejs.Element.HeBlock.prototype.renderHawkejsContent);
			}
		}
	}

	if (options.properties) {
		for (i = 0; i < options.properties.length; i++) {
			val = options.properties[i];
			element[val.name] = val.value;
		}
	}

	if (options.codes) {
		let output,
		    obj,
		    fnc,
		    i;

		for (i = 0; i < options.codes.length; i++) {
			fnc = options.codes[i];
			output = this.returnPrint(fnc, element);

			if (output) {
				output = String(output).trim();
			}

			if (!output) {
				continue;
			}

			obj = Bound.String.decodeAttributes(output);

			for (key in obj) {
				element.setAttribute(key, obj[key]);
			}
		}
	}

	if (options.directives) {
		let context,
		    method;

		for (i = 0; i < options.directives.length; i++) {
			val = options.directives[i];
			method = val.method || 'applyDirective';

			context = Bound.Object.path(this.helpers, val.context);

			if (!context) {
				throw new Error('Unable to find "' + val.context.join('.') + '" directive context');
			}

			if (!context[method]) {
				throw new Error('Unable to find "' + val.context.join('.') + '#' + method + '" directive');
			}

			context[method](element, val.value, options);
		}
	}
});

/**
 * Close an element placeholder
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Renderer.setMethod(function closeElement(name) {

	if (!this.current_block) {
		if (name == 'he-placeholder') {
			return;
		}

		throw new Error('Unable to close element "' + name + '", no current block active');
	}

	let el = this.current_block.elements.pop();

	if (!el) {
		throw new Error('Trying to close tag "' + name + '", but no elements were found');
	}

	// @TODO: Why is name sometimes not a string?
	if (name && el.nodeName != name.toUpperCase()) {

		// Some elements don't require closing tags
		switch (el.nodeName) {
			case 'P':
			case 'LI':
			case 'HTML':
			case 'HEAD':
			case 'BODY':
			case 'DT':
			case 'DD':
			case 'OPTION':
			case 'THEAD':
			case 'TH':
			case 'TBODY':
			case 'TR':
			case 'TD':
			case 'TFOOT':
			case 'COLGROUP':
				return this.closeElement(name);
		}

		throw new Error('Trying to close tag "' + name + '", but found ' + el.nodeName + ' instead');
	}
});

/**
 * Prepare content of all items
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.0
 * @version  2.0.0
 *
 * @param    {Object}   obj
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function prepareContent(obj) {

	var that = this,
	    tasks = [];

	Bound.Object.walk(obj, function eachValue(val, key, parent) {

		if (!val || typeof val != 'object') {
			return false;
		}

		let method = val[Hawkejs.RENDER_CONTENT] || val.renderHawkejsContent;

		if (typeof method != 'function') {
			return;
		}

		tasks.push(function doGetContent(next) {

			var pledge = method.call(val, that);

			if (!pledge) {
				return next();
			}

			pledge.done(function gotContent(err) {

				var result;

				if (err) {
					return next();
				}

				if (typeof val.toHawkejsString == 'function') {
					result = val.toHawkejsString(that);
					parent[key] = val;
				}

				next();
			});
		});

		// content render function was found, so don't do children
		return false;
	}, 2);

	return Fn.parallel(tasks);
});

/**
 * Start an expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
Renderer.setMethod(function startExpression(name, options, vars, fnc) {

	var instance = new Hawkejs.Expression[name](this);

	if (!this.expression_chain) {
		this.expression_chain = [];
	}

	instance.options = options;
	instance.vars = vars;
	instance.fnc = fnc;

	this.expression_chain.push(instance);

	return instance;
});

/**
 * Execute an inline expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.3
 * @version  2.0.0
 */
Renderer.setMethod(function parseExpression(tokens, vars) {
	return Hawkejs.Expression.Expression.parseExpression(this, tokens, vars);
});

/**
 * Preload items sorter:
 * images must be preloaded last
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {String}
 */
function sortPreloadItems(a, b) {

	if (a.as == b.as) {
		return 0;
	}

	// Images should go down
	if (a.as == 'image') {
		return 1
	}

	// The rest should go up
	return -1;
}

/**
 * Create link preload html elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {String}
 */
Renderer.setMethod(function createPreloadHtml() {

	var hawkejs = this.hawkejs,
	    items = this.items_to_preload,
	    html = '',
	    item,
	    i;

	// Always add client-script as the first link to preload
	html += '\t\t<link rel="preload" href="' + hawkejs.createScriptUrl(hawkejs.client_path, {root_path: hawkejs.root_path}) + '" as="script">\n';

	items.sort(sortPreloadItems);

	for (i = 0; i < items.length; i++) {
		item = items[i];

		html += '\t\t<link rel="preload" href="' + item.href + '"';

		if (item.as) {
			html += ' as="' + item.as + '"';
		}

		if (item.type) {
			html += ' type="' + item.type + '"';
		}

		if (item.as == 'font' && typeof item.href == 'object' && (item.href.hostname && !item.href.usedBaseProperty('hostname'))) {
			html += ' crossorigin';
		}

		html += '>\n';
	}

	return html;
});

/**
 * Create style html elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array}   instructions
 *
 * @return   {String}
 */
Renderer.setMethod(function createStyleHtml(instructions) {

	var styles,
	    config,
	    style,
	    html = '',
	    url,
	    i,
	    j;

	if (!instructions || !instructions.length) {
		return html;
	}

	for (i = 0; i < instructions.length; i++) {
		styles = instructions[i][0];
		config = instructions[i][1];

		for (j = 0; j < styles.length; j++) {
			style = styles[j];
			url = this.hawkejs.createStyleUrl(style, config);
			html += '\t\t<link href="' + url + '" rel="stylesheet">\n';
		}
	}

	return html;
});

/**
 * Catch `print` calls in the given function and return them
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Function}   fnc
 * @param    {Mixed}      arg2
 *
 * @return   {String}
 */
Renderer.setMethod(function returnPrint(fnc, arg2) {

	var result;

	this.capture_print = true;

	try {
		fnc(function print(arg) {
			result = arg;
		}, arg2);
	} catch (err) {
		this.capture_print = false;
		throw err;
	}

	if (result == null && this.captured_print != null) {
		result = this.captured_print.join(' ');
		this.captured_print = null;
	}

	this.capture_print = false;

	return result;
});

/**
 * Put the hawkejs client foundation here
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
function getFoundationContent() {

	var that = this,
	    options = this[OPTIONS] || {},
	    pledge = new Classes.Pledge(),
	    renderer = this.hawkejs_renderer;

	this.start_template.waitForOtherTemplates().then(function waited() {
		_getFoundationContent.call(that, pledge, renderer, renderer.hawkejs, options);
	});

	return pledge;
};


/**
 * Put the hawkejs client foundation here
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Pledge}   pledge
 */
function _getFoundationContent(pledge, renderer, hawkejs, options) {

	var result = '<title>',
	    title;

	if (renderer.page_title) {
		if (typeof renderer.page_title == 'string') {
			title = renderer.page_title;
		} else if (renderer.page_title.toHawkejsString) {
			title = renderer.page_title.toHawkejsString(renderer);
		}

		if (title) {
			title = Bound.String.stripTags(title);
			title = Bound.String.encodeHTML(title);
		}

		if (title) {
			result += title;
		}
	}

	result += '</title>\n';

	if (Blast.isNode && hawkejs.raw_code != null) {
		result += hawkejs.raw_code;
	}

	let packed_variables,
	    settings,
	    hs_path,
	    entry,
	    html = result,
	    dry,
	    url,
	    i;

	settings = {
		root              : hawkejs.root,
		script_path       : hawkejs.script_path,
		style_path        : hawkejs.style_path,
		app_version       : hawkejs.app_version,
		withRenderContext : hawkejs.withRenderContext,
		global_protoblast : options.protoblast
	};

	// Add all variables to a single array
	packed_variables = [renderer.variables, settings, renderer];

	// Get the serialized settings & view variables
	if (hawkejs._debug) {
		dry = Bound.JSON.dry(packed_variables, null, '\t');

		// Don't let google index this page
		html += '\t\t<meta name="robots" content="noindex">\n';
	} else {
		dry = Bound.JSON.dry(packed_variables);
	}

	// Add things we can preload
	html += renderer.createPreloadHtml();

	// Set the static exposed variables string
	html += '\t\t<!-- Static hawkejs variables -->\n\t\t';
	html += hawkejs.static_exposed_js_string + '\n\n';

	html += '\t\t<!-- Request specific variables -->\n';

	// Set the data first (async defer doesn't always do what it should)
	html += '\t\t<script>window._initHawkejs = ' + dry.replace(/\<\/script/g, '</s" + "cript') + ';</script>\n';

	hs_path = hawkejs.createScriptUrl(hawkejs.client_path, {root_path: hawkejs.root_path});

	// Load the hawkejs client file according to the strategy
	if (hawkejs.strategy == 'defer') {
		html += '\t\t<script defer src="' + hs_path + '"></script>\n';
	} else if (hawkejs.strategy == 'preventing' && renderer.has_bottom) {
		html += '\t\t<script async defer src="' + hs_path + '"></script>\n';
	}

	html += '\t\t<script>';
	html += 'if (typeof _initHawkejsFunction == "function") {window.hawkejs = _initHawkejsFunction()}';
	html += '</script>\n';

	html += renderer.createStyleHtml(renderer.styles);

	// Load the hawkejs client file according to the blocking strategy
	if (hawkejs.strategy == 'blocking' || !renderer.has_bottom) {
		html += '\t\t<script src="' + hs_path + '"></script>\n';
	}

	this[Hawkejs.RESULT] = html;

	pledge.resolve(html);
}

/**
 * Put the hawkejs client foundation here
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   options
 */
Renderer.setCommand(function foundation(options) {

	var placeholder = this.printElement('he-placeholder');

	Hawkejs.setCachedMethod(placeholder, Hawkejs.RENDER_CONTENT, getFoundationContent);

	placeholder[OPTIONS] = options || {};

	placeholder.toHawkejsString = function toHawkejsString() {
		return this[Hawkejs.RESULT];
	};

	this.closeElement('he-placeholder');

	return placeholder;
});

/**
 * Place to put extra stuff, like dialog html
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 */
Renderer.setCommand(function bottom() {

	var element = this.printElement('he-bottom');

	this.closeElement('he-bottom');

	this.has_bottom = true;

	return element;
});

/**
 * Include a partial
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        options
 * @param    {Object}        variables
 */
Renderer.setMethod(function addSubtemplate(names, options, variables) {

	var that = this,
	    current_template = this.current_template,
	    placeholder,
	    templates = new Hawkejs.Templates(this, names),
	    renderer;

	variables = Object.assign({}, this.variables, variables);

	// The main block name should be modified,
	// so the same template can be implemented multiple times
	templates.main_name_modifier = String(++this.implement_count);

	// Indicate this is a subtemplate
	templates.is_subtemplate = true;

	placeholder = this.async(function renderSubtemplate(next) {
		templates.render(variables).done(function done(err, result) {

			if (err) {
				return next(err);
			}

			// The template's target_block_name can be changed,
			// but this isn't ideal at this stage and `switchTemplate`
			// now hooks into the extension code
			if (result && options.change_main) {
				current_template.target_block_name = result.name;
			}

			next(null, result);
		});
	}, options);

	// Indicate what template we're trying to render
	placeholder.rendering_templates = templates;

	return placeholder;
});

/**
 * Render a partial in the current Renderer scope.
 * Always gets executed, even outside of used blocks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        variables
 */
Renderer.setCommand(function implement(names, variables) {
	return this.addSubtemplate(names, {force_call: true}, variables);
});

/**
 * Render a partial in the current Renderer scope.
 * Only gets executed if in a used block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        options
 * @param    {Object}        variables
 */
Renderer.setCommand(function include(names, variables) {
	return this.addSubtemplate(names, {force_call: false}, variables);
});

/**
 * This is a very confusing relic of older hawkejs versions.
 * It's like `partial`, but always adds a custom wrapper.
 * This is something TOTALLY different from `printElement`
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        variables
 * @param    {Object}        options
 *
 * @return   {HePlaceholder}
 */
Renderer.setCommand(function print_element(names, variables, options) {

	if (!options) {
		options = {};
	}

	if (variables && variables.wrap != null) {
		options.wrap = variables.wrap;
	}

	if (options.wrap != null && !options.wrap) {
		return this.partial(names, variables);
	}

	let element = this.printElement('x-hawkejs'),
	    id = this.getId();

	element.id = id;

	let placeholder = this.partial(names, variables, {scope_id: id});

	placeholder.__callback = function rendered(err, result) {

		if (err) {
			return;
		}

		element.classList.add('x-hawkejs');

		if (options.className) {
			Hawkejs.addClasses(element, options.className);
		}

		element.dataset.heName = result.name;
		element.dataset.heTemplate = result.start_template.name;

		if (result.start_template.theme) {
			element.dataset.theme = result.start_template.theme;
		}

		// Set the template where this print_element started
		element.dataset.heEntryTemplate = placeholder.he_templates.active.name;
	};

	if (this.current_block) {
		this.closeElement('x-hawkejs');
	}

	placeholder.element = element;

	return placeholder;
});

/**
 * Render a partial in a new Renderer scope and print it out.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        variables
 * @param    {Object}        options
 */
Renderer.setCommand(function partial(names, variables, options) {

	var that = this,
	    placeholder,
	    templates,
	    renderer,
	    t_vars,
	    ic = ++this.implement_count;

	// Create a new renderer instance
	renderer = new Renderer(this.hawkejs);

	// Set the root renderer
	renderer.root_renderer = this.root_renderer;

	// Create the templates object
	templates = new Hawkejs.Templates(renderer, names);

	if (!options) {
		options = {};
	}

	if (options.scope_id) {
		renderer.scope_id = options.scope_id;
	}

	if (this.current_template) {
		t_vars = this.current_template.variables;
	}

	variables = Object.assign({}, this.variables, variables, t_vars);

	renderer.variables = variables;

	if (options.force_call == null) {
		options.force_call = false;
	}

	this.emit('sub_render', renderer, names);

	placeholder = this.async(function doPartial(next) {

		placeholder.he_templates = templates;

		that.emit('rendering_sub_render', renderer, names);

		templates.render(variables).done(function done(err, result) {

			var block,
			    key;

			if (!err) {
				// Blocks created in a new scope need to be added to the root renderer,
				// otherwise those blocks won't get emitted
				for (key in renderer.blocks) {

					block = renderer.blocks[key];

					// Main blocks will get emitted, don't duplicate them
					if (Bound.String.endsWith(key, '__main__')) {
						continue;
					}

					that.root_renderer.blocks[key + '_' + ic] = block;
				}
			}

			if (placeholder.__callback) {
				placeholder.__callback(err, result);
			}

			that.emit('rendered_sub_render', renderer, names);

			next(err, result);
		});
	}, options);

	placeholder.renderer = renderer;

	return placeholder;
});

/**
 * Assign a block here,
 * also used for 'script' and 'style' blocks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 *
 * @return   {BlockPlaceholder}
 */
Renderer.setCommand(function assign(name, options) {

	var tag_name,
	    element;

	if (options && options.tag) {
		tag_name = options.tag;
	} else {
		tag_name = 'he-block';
	}

	element = this.printElement(tag_name, {add_identifier: true});

	// Store the name of the block
	element.dataset.heName = name;

	if (options) {
		Hawkejs.addClasses(element, options.className);
	} else {
		options = {};
	}

	// Store the element, so we can actually add block content to it later
	this.registerAssign(name, element, options);

	// Set the current block as the parent block
	element.parent_block = this.current_block;

	// Already close the element
	this.closeElement(tag_name);

	return element;
});

/**
 * End an assignment
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Renderer.setCommand(function assignEnd(name) {

	var element = this.assigns[name].element;

	element._claimSiblings(true);
});

/**
 * Start a block:
 * Create a new BlockBuffer if it doesn't exist already,
 * and make it the current active one (grab any further outputs).
 * If the block was already made, do nothing.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   block_name
 * @param    {Object}   options
 */
Renderer.setCommand(function start(block_name, options) {

	var block;

	if (!options) {
		options = {};
	}

	options.start_call = true;

	if (this.dialog_open) {
		block_name = this.dialog_open + '_' + block_name;
	}

	// Create the block (if it doesn't exist yet)
	block = this.createBlock(block_name, options);

	// The block could have changed its name
	block_name = block.name;

	// Set the current active block name
	this.current_block_name = block_name;
	this.chain.push(block_name);

	if (block.start_template == null) {
		block.start_template = this.current_template;
	}

	// Store the variables as they were when this block started
	if (!block.variables) {
		//block.variables = Object.assign({}, this.variables);
	}

	return block;
});

/**
 * End a block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   block_name
 */
Renderer.setCommand(function end(block_name) {

	var index;

	if (block_name) {

		if (this.dialog_open) {
			block_name = this.dialog_open + '_' + block_name;
		}

		index = this.chain.lastIndexOf(block_name);

		if (index > -1) {
			// If the block was found, remove it and everything after
			this.chain.splice(index);
		} else {
			// If the block wasn't found, just remove the last block
			this.chain.pop();
		}

	} else {
		this.chain.pop();
	}

	this.current_block_name = this.chain[this.chain.length - 1];
});

/**
 * Create an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @param    {String}   name
 *
 * @return   {HTMLElement}
 */
Renderer.setCommand(function createElement(name, add_identifier) {

	let result = Hawkejs.Hawkejs.createElement(name);

	if (!result) {
		return;
	}

	if (add_identifier == null) {
		add_identifier = true;
	}

	if (add_identifier && result.setIdentifier) {

		// Set the id
		result.setIdentifier(this.getId());

		if (!this.root_renderer.variables.__he_elements) {
			this.root_renderer.variables.__he_elements = [];
		}

		this.root_renderer.variables.__he_elements.push(result);
	}

	// Allow the custom element to use this renderer
	result.hawkejs_renderer = this;

	return result;
});

/**
 * Set the title for the page
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   title
 */
Renderer.setCommand(function setTitle(title) {
	this.page_title = title;
});

/**
 * Preload the given link
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   href
 * @param    {Object}   options
 */
Renderer.setCommand(function preload(href, options) {

	if (typeof options == 'string') {
		options = {as: options};
	}

	if (!options) {
		options = {};
	}

	if (Array.isArray(href)) {

		if (href.length == 1) {
			href = href[0];
		} else {
			let entry,
			    i;

			for (i = 0; i < href.length; i++) {
				entry = href[i];

				this.preload(entry, Object.assign({}, options));
			}

			return;
		}
	}

	if (typeof href == 'string') {
		href = Classes.RURL.parse(href);
	}

	options.href = href;
	this.items_to_preload.push(options);
});

/**
 * Indicate this script is needed for this render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|Array}  instructions   Where / what script to get
 * @param    {Object}        options
 */
Renderer.setCommand(function script(instructions, options) {

	if (!options || typeof options !== 'object') {
		options = {};
	}

	instructions = Bound.Array.cast(instructions);

	// Remember where this script came from
	options.origin_block_name = this.current_block_name;
	options.origin_template = this.current_template;
	options.theme = this.theme;

	if (Blast.isNode) {
		let i;

		for (i = 0; i < instructions.length; i++) {
			this.preload(this.hawkejs.createScriptUrl(instructions[i], options), 'script');
		}
	}

	this.scripts.push([instructions, options]);
});

/**
 * Indicate this style is needed for this render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String|Array}   instructions   Where / what style to get
 * @param    {Object}         options
 */
Renderer.setCommand(function style(instructions, options) {

	if (!options || typeof options !== 'object') {
		options = {};
	}

	instructions = Bound.Array.cast(instructions);

	// Remember where this style came from
	options.origin_block_name = this.current_block_name;
	options.origin_template = this.current_template;
	options.theme = this.theme;

	if (Blast.isNode) {
		let i;

		for (i = 0; i < instructions.length; i++) {
			this.preload(this.hawkejs.createStyleUrl(instructions[i], options), 'style');
		}
	}

	this.styles.push([instructions, options]);
});

/**
 * Add an anchor
 * @deprecated
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  2.0.0
 *
 * @param    {String}   href
 */
Renderer.setMethod(function add_link(href, options) {

	var classList = [],
	    content,
	    source,
	    anchor = this.createElement('a'),
	    html,
	    name,
	    i;

	if (!options || typeof options !== 'object') {
		options = {};
	}

	// Set the optional id
	options.id && (anchor.id = options.id);

	options.name && anchor.setAttribute('name', options.name);
	anchor.setAttribute('title', options.title||options.name);

	if (options.history === false) {
		anchor.setAttribute('data-history', false);
	}

	// Store the original href
	source = href;

	// Fill in possible url values
	href = Bound.String.fillPlaceholders(href, options.urlvars);

	// And set the anchor link
	anchor.setAttribute('href', href);

	Hawkejs.addClasses(anchor, options.class);

	for (name in options.attributes) {

		if (name == 'class' || name == 'className') {
			Hawkejs.addClasses(anchor, options.attributes[name]);
		} else {
			anchor.setAttribute(name, options.attributes[name]);
		}
	}

	// Get the content of the anchor
	content = (options.content || '') || anchor.getAttribute('title') || href;

	// Add all the CSS classes
	for (i = 0; i < classList.length; i++) {
		name = classList[i];

		if (!name) {
			continue;
		}

		anchor.classList.add(name);
	}

	html = '';

	if (options.prepend) html += options.prepend;
	if (content) html += content;
	if (options.append) html += options.append;

	if (options.escape) {
		anchor.innerText = html;
	} else {
		anchor.innerHTML = html;
	}

	return anchor;
});

/**
 * Set the variable to be used inside the view.
 * Or get if only a name is given.
 *
 * Caution: variables are always sent to the client and can even be
 * accessed in post-render callbacks, they are just not kept around.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function set(name, value) {

	if (arguments.length == 1) {

		if (this.current_template && this.current_template.variables && typeof this.current_template.variables[name] != 'undefined') {
			return this.current_template.variables[name];
		}

		// If there is a parent renderer, look there if this does not have it
		if (this.root_renderer !== this && typeof this.variables[name] == 'undefined') {
			return this.root_renderer.set(name);
		}

		return this.variables[name];
	}

	this.variables[name] = value;
});

/**
 * Add a tag to the head element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   tag_name
 * @param    {Object}   attributes
 * @param    {String}   content
 */
Renderer.setCommand(function addHeadTag(tag_name, attributes, content) {

	if (typeof attributes == 'string') {
		content = attributes;
		attributes = null;
	}

	this.head_tags.push({
		name    : tag_name,
		attr    : attributes,
		content : content
	});
});

/**
 * Add a meta tag
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Object}   attributes
 */
Renderer.setCommand(function addMetaTag(attributes) {
	this.addHeadTag('meta', attributes);
});

/**
 * Set this variable to be used inside the view,
 * but mostly for internal things, so prefix it.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function internal(name, value) {

	name = '__' + name;

	if (arguments.length == 1) {
		return this.set(name);
	} else {
		return this.set(name, value);
	}
});

/**
 * Store the value in the client's scene.
 * Or get if only a name is given.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function expose(name, value) {

	if (arguments.length == 1) {

		// Look inside the viewrender first
		if (typeof this.expose_to_scene[name] !== 'undefined') {
			return this.expose_to_scene[name];
		}

		// If the item hasn't been found yet, look in the scene
		if (typeof hawkejs != 'undefined' && hawkejs && hawkejs.scene) {
			return hawkejs.scene.exposed[name];
		}

		return;
	}

	this.expose_to_scene[name] = value;
});

/**
 * Set this variable to be used on the server side only
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.1
 * @version  2.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function serverVar(name, value) {

	if (arguments.length == 1) {

		// If there is a parent renderer, look there if this does not have it
		if (this.root_renderer !== this && typeof this.server_variables[name] == 'undefined') {
			return this.root_renderer.serverVar(name);
		}

		return this.server_variables[name];
	}

	this.server_variables[name] = value;
});

/**
 * Change the layout to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name
 */
Renderer.setCommand(function setLayout(name) {
	this.layout = name;
});

/**
 * Set the focus on a given block,
 * the browser will scroll there upon ajax navigation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {String}   name    The optional block name
 */
Renderer.setCommand(function setFocus(name) {

	if (!name) {
		if (this.assigned_id) {
			name = this.assigned_id;
		} else {
			name = this.current_block_name;
		}
	}

	// If this is a subrender (implement/print_partial) bubble it up
	if (this.root_renderer != this) {
		return this.root_renderer.setFocus(name);
	}

	this.focus_block = name;
});


/**
 * Make this the target of a dialog
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Renderer.setCommand(function makeDialog() {
	this.dialog = true;
	this.dialog_open = 'dialog-' + this.getId();
});

/**
 * Show a dialog
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.0
 * @version  1.2.0
 */
Renderer.setCommand(function showDialog(name, variables, options) {

	var placeholder;

	if (!variables) {
		variables = {};
	}

	if (!options) {
		options = {};
	}

	// Force a new render scope
	options.newscope = true;

	// Don't print the placeholder
	options.print = false;

	// Make sure the placeholder content is wrapped
	options.wrap = true;

	// Make sure it's called
	options.force_call = true;

	// Get the placeholder
	//placeholder = this.implement(name, options, variables);
	//placeholder = this.addSubtemplate(name, options, variables);
	placeholder = this.partial(name, variables, options);

	// Add dialog stuff to the wrapper
	placeholder.element.classList.add('js-he-dialog');
	placeholder.element.dataset.type = 'dialog';
	placeholder.element.dataset.role = 'dialog';

	this.dialogs.push(placeholder);
});

/**
 * Execute asynchronous code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Function}   fnc
 *
 * @return   {Hawkejs.Element.HePlaceholder}
 */
Renderer.setCommand(function async(fnc, options) {

	var that = this,
	    placeholder,
	    promise;

	if (!options) {
		options = {};
	}

	if (options.wrap === false) {
		placeholder = this.createElement('he-placeholder');
	} else {
		placeholder = this.printElement('he-placeholder')
		this.closeElement('he-placeholder');
	}

	if (options.force_call) {
		this.pre_finish_tasks.push(getAsyncValue);
	}

	Hawkejs.setCachedMethod(placeholder, Hawkejs.PRE_ASSEMBLE, getAsyncValue);

	function getAsyncValue() {

		if (!promise) {
			promise = new Promise(function doAsyncFnc(resolve, reject) {
				fnc(function getResult(err, result) {
					if (err) {
						reject(err);
					} else {
						placeholder[Hawkejs.RESULT] = result;
						resolve();
					}

					if (placeholder._resolve_me_too) {
						placeholder._resolve_me_too.resolve();
					}
				});
			});

			placeholder.async_value_promise = promise;
		}

		return promise;
	};

	placeholder.toHawkejsString = function asyncToString() {
		return this[Hawkejs.RESULT];
	};

	return placeholder;
});

/**
 * Interpret string as a template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   input
 */
Renderer.setCommand(function interpret(input) {

	if (typeof input == 'string') {
		input = input.trim();
	}

	if (!input) {
		return;
	}

	let templates,
	    hash = Object.checksum(input),
	    name = 'interpret_' + hash,
	    fnc;

	if (this.hawkejs.templates[name]) {
		fnc = this.hawkejs.templates[name];
	} else {
		fnc = this.hawkejs.compile({
			template_name : name,
			template      : input
		});
	}

	return this.partial(fnc);
});