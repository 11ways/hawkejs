const TASK_GROUP = Symbol('task_group'),
      APPLIED_OPTIONS = Hawkejs.APPLIED_OPTIONS,
      SCOPE_ID = Symbol('scope_id'),
      OPTIONS = Symbol('options'),
      REACTIVE_QUEUE = Symbol('reactive_queue');

/**
 * The Renderer class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.4.0
 *
 * @param    {Hawkejs}   hawkejs
 */
const Renderer = Fn.inherits('Hawkejs.Base', function Renderer(hawkejs) {

	// The parent hawkejs instance
	this.hawkejs = hawkejs || Hawkejs.Hawkejs.getInstance();

	// The root renderer (itself by default)
	this.root_renderer = this;

	// Child renderers
	this.child_renderers = [];

	// Blocks
	this.blocks = new Hawkejs.Blocks();

	// The chain of blocknames
	this.chain = [];

	// The begin event pledges
	this.begin_event_pledges = [];

	// Assignments
	this.assigns = {};

	// Prefix id numbers
	this.prefix_id_numbers = {};

	// Template times
	this.times = {};

	// Templates to render
	this.queued_templates = [];

	// Created dialogs
	this.dialogs = [];

	// Capture the print() method?
	this.captured_print = null;
	this.capture_print = false;

	this[SCOPE_ID] = null;

	// The implement count
	this._implement_count = null;

	// Has this renderer finished?
	this.has_finished = false;

	// Hidden class things
	this._theme = null;
	this.layout = null;
	this.is_rendering = false;
	this.client_render = null;
	this.is_for_client_side = null;
	this.errLine = null;
	this.errName = null;
	this.current_block_name = '';
	this.current_template = null;
	this.has_bottom = null;
	this.expression_chain = null;
	this.start_template = null;
	this[Hawkejs.RESULT] = null;
	this.dialog_open = null;
	this.focus_block = null;
	this.active_variables = null;
	this.state = null;
	this.compiled_inlines = {};
	this.reactive_queue = null;
});

Renderer.setDeprecatedProperty('assign_end',      'assignEnd');
Renderer.setDeprecatedProperty('server_var',      'serverVar');
Renderer.setDeprecatedProperty('set_title',       'setTitle');
Renderer.setDeprecatedProperty('head_tag',        'addHeadTag');
Renderer.setDeprecatedProperty('meta_tag',        'addMetaTag');
Renderer.setDeprecatedProperty('create_element',  'createElement');
Renderer.setDeprecatedProperty('pageTitle',       'page_title');

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
 * Set an enforced property that should always be the same of children & parents
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.16
 *
 * @param    {String}     key
 * @param    {Function}   fnc
 */
Renderer.setStatic(function enforceRootProperty(key, fnc) {

	if (typeof key == 'function') {
		fnc = key;
		key = fnc.name;
	}

	this.enforceProperty(key, function doEnforcer(value, current) {

		if (!this.is_root_renderer) {
			return this.root_renderer[fnc.name];
		}

		return fnc.call(this, value, current);
	});
});

/**
 * Set a method that only executes on the root renderer
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {String}     key
 * @param    {Function}   fnc
 */
Renderer.setStatic(function setRootMethod(key, fnc) {

	if (typeof key == 'function') {
		fnc = key;
		key = fnc.name;
	}

	this.setMethod(key, function rootMethod(...args) {

		if (!this.is_root_renderer) {
			return this.root_renderer[key](...args);
		}

		return fnc.call(this, ...args);
	});
});

/**
 * Set a reference to a specific singleton element
 * (html, head, body)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @param    {String}   name
 */
Renderer.setStatic(function enforceSingletonElement(name) {

	let key = name + '_element';

	this.enforceRootProperty(key, function SingletonElementEnforcer(new_value) {

		if (!new_value && Blast.isBrowser) {
			new_value = document.getElementsByTagName(name)[0];
		}

		return new_value;
	});
});

Renderer.enforceSingletonElement('html');
Renderer.enforceSingletonElement('head');
Renderer.enforceSingletonElement('body');

/**
 * Split the input into keys & vlaues
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}  element
 * @param    {Object}       reactive
 */
Renderer.setStatic(function attachReactiveListeners(element, reactive) {

	if (!element || !reactive) {
		return;
	}

	if (reactive.body?.values?.length) {
		reactive.body.values.forEach(optional => optional.onChange(() => {
			queueReactiveTask(element, 'body', () => reactiveRerender(element));
		}));
	}

	if (reactive.attributes) {
		attachReactiveElementUpdaters(element, setAttribute, getAttribute, reactive.attributes);
	}

	if (reactive.properties) {
		attachReactiveElementUpdaters(element, setProperty, setAttribute, reactive.properties);
	}
});

/**
 * Helper methods for getting/setting certain things on an element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
const getProperty = (element, key) => element[key];
const setProperty = (element, key, val) => element[key] = val;
const getAttribute = (element, key) => element.getAttribute(key);
const setAttribute = (element, key, val) => {

	if (val == null) {
		element.removeAttribute(key);
		return;
	}

	return element.setAttribute(key, val)
};

/**
 * Attach reactive element updaters
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}          element
 * @param    {Function}             setter
 * @param    {Function}             getter
 * @param    {Object}               instructions
 */
const attachReactiveElementUpdaters = (element, setter, getter, instructions) => {

	for (let key in instructions) {
		let config = instructions[key];

		if (!config?.values?.length) {
			continue;
		}

		config.values.forEach(optional => optional.onChange(() => {
			return queueReactiveTask(element, 'property', () => updateElementProperty(element, setter, getter, optional, key, config));
		}));
	}
};

/**
 * Queue the given task
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement} element
 * @param    {string}      type 
 * @param    {Function}    task
 */
const queueReactiveTask = (element, type, task) => {

	// Make sure we have all the required info for a rerender
	if (type == 'body' && !element.is_custom_hawkejs_element && !element[Hawkejs.RENDER_INSTRUCTION]) {
		return;
	}

	return element.hawkejs_renderer.queueReactiveTask(element, type, task);
};

/**
 * Perform the given reactive property update
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}          element
 * @param    {Function}             setter
 * @param    {Function}             getter
 * @param    {Develry.Optional}     optional
 * @param    {string}               key
 * @param    {Object}               config
 */
const updateElementProperty = (element, setter, getter, optional, attribute_name, config) => {

	let current_value = getter(element, attribute_name);

	// We have to execute the expression to get the new value
	let renderer = new Hawkejs.Renderer(element.hawkejs);
	renderer.active_variables = element[Hawkejs.VARIABLES];

	let new_value = renderer.parseRuntimeExpression(config.expression);

	// Skip if the values are the same
	if (current_value == new_value) {
		return;
	}

	setter(element, attribute_name, new_value);
};

/**
 * Rerender the given element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}          element
 */
function reactiveRerender(element) {

	// Make sure we have all the required info for a rerender
	if (!element.is_custom_hawkejs_element && !element[Hawkejs.RENDER_INSTRUCTION]) {
		return;
	}

	return Hawkejs.Element.Element.prototype.rerender.call(element);
}

/**
 * The variables to use when rendering
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Variables}
 */
Renderer.enforceProperty(function variables(value) {
	return Hawkejs.Variables.cast(value, this);
});

/**
 * Elements that should be rendered last
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @type     {Array}
 */
Renderer.enforceRootProperty(function delayed_elements(value) {
	if (!value) {
		value = [];
	}

	return value;
});

/**
 * The variables to expose to the scene
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Variables}
 */
Renderer.enforceRootProperty(function expose_to_scene(value) {
	return Hawkejs.Variables.cast(value, this);
});

/**
 * The weakmap used for cloning variables
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @type     {WeakMap}
 */
Renderer.enforceRootProperty(function weakmap_for_cloning(value) {
	return value || new WeakMap();
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
 * Ensured styles
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.18
 * @version  2.2.18
 *
 * @type     {Map}
 */
Renderer.enforceRootProperty(function ensured_css_files(value) {
	return value || new Map();
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
	return Hawkejs.Variables.cast(value, this);
});

/**
 * Styles
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.9
 *
 * @type     {HashSet}
 */
Renderer.enforceRootProperty(function styles(value) {
	return value || new Blast.Classes.HashSet();
});

/**
 * Scripts
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.9
 *
 * @type     {HashSet}
 */
Renderer.enforceRootProperty(function scripts(value) {
	return value || new Blast.Classes.HashSet();
});

/**
 * Extra tags to add to the <head> tag
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.9
 *
 * @type     {HashSet}
 */
Renderer.enforceRootProperty(function head_tags(value) {
	return value || new Blast.Classes.HashSet();
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
 * Enforce the language property
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.2.16
 *
 * @type     {String}
 */
Renderer.enforceProperty(function language(value) {

	if (this.is_root_renderer && this.html_element) {
		if (!value) {
			this.html_element.removeAttribute('lang');
		} else {
			this.html_element.setAttribute('lang', value);
		}
	}

	return value;
});

/**
 * The scope id (id of the element to use as root)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.16
 *
 * @type     {String}
 */
Renderer.setProperty(function scope_id() {

	if (this[SCOPE_ID]) {
		return this[SCOPE_ID];
	}

	if (!this.is_root_renderer) {
		return this.root_renderer.scope_id;
	}

}, function setScopeId(id) {
	this[SCOPE_ID] = id;
});

/**
 * Get the variables that are currently in use
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 *
 * @type     {Hawkejs.Variables}
 */
Renderer.setProperty(function current_variables() {

	if (this.current_template) {
		return this.current_template.rendered_variables;
	}

	if (this.active_variables) {
		return this.active_variables;
	}

	return this.variables;
});

/**
 * Are we in the root level of the current template?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 *
 * @type     {Boolean}
 */
Renderer.setProperty(function on_template_root_level() {

	if (!this.current_block	|| !this.current_block.elements.length) {

		if (this.current_block && !this.current_block.is_template_root) {
			return false;
		}

		return true;
	}

	return false;
});

/**
 * Are we in the root level of the current block?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.3
 * @version  2.2.3
 *
 * @type     {Boolean}
 */
Renderer.setProperty(function on_block_root_level() {

	if (!this.current_block	|| !this.current_block.elements.length) {
		return true;
	}

	return false;
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
 * @version  2.2.16
 *
 * @type     {String}
 */
Renderer.setProperty(function theme() {

	if (this._theme) {
		return this._theme;
	}

	if (!this.is_root_renderer) {
		return this.root_renderer.theme;
	}

	return '';
}, function setTheme(value) {
	return this._theme = value;
});

/**
 * Get the current active element
 * (Without doing anything to it)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.15
 * @version  2.4.0
 *
 * @type     {HTMLElement}
 */
Renderer.setProperty(function current_element() {

	if (this.on_template_root_level) {
		if (this.current_variables.has('$ancestor_element')) {
			return this.current_variables.get('$ancestor_element');
		}
		
		return;
	}

	return this.current_block.elements[this.current_block.elements.length - 1];
});

/**
 * The current active element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.15
 *
 * @type     {HTMLElement}
 */
Renderer.setLocalProperty(function $0() {

	let element = this.current_element;

	// As soon as the element is referred in some way, we have to actually
	// make sure all the options are applied
	this.ensureElementOptions(element);

	return element;
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
 * Is this the root renderer?
 * (It can still be considered to be a "follower" in another context though)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.16
 * @version  2.2.16
 *
 * @type     {Boolean}
 */
Renderer.setProperty(function is_root_renderer() {
	return this.root_renderer === this;
});

/**
 * Is this a follower render of some kind?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.16
 * @version  2.2.16
 *
 * @type     {Boolean}
 */
 Renderer.setProperty(function is_follower_renderer() {

	if (this._is_follower_renderer != null) {
		return this._is_follower_renderer;
	}

	if (this.is_root_renderer) {
		return false;
	}

	return true;
}, function setValue(value) {
	this._is_follower_renderer = value;
});

/**
 * Keep track of amount of `implements` made
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.16
 *
 * @type     {Number}
 */
Renderer.setProperty(function implement_count() {

	if (!this.is_root_renderer) {
		return this.root_renderer.implement_count;
	}

	if (this._implement_count == null) {
		this._implement_count = 0;
	}

	return this._implement_count;
}, function setImplementCount(value) {

	if (!this.is_root_renderer) {
		return this.root_renderer.implement_count = value;
	}

	return this._implement_count = value;
});

/**
 * The current active block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.3
 *
 * @type     {Hawkejs.BlockBuffer}
 */
Renderer.setProperty(function current_block() {
	return this.blocks.get(this.current_block_name);
});

/**
 * The main template (the last template queued)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.1.3
 *
 * @type     {Hawkejs.Template}
 */
Renderer.setProperty(function main_template() {

	var result;

	if (this.queued_templates && this.queued_templates.length) {
		result = this.queued_templates[this.queued_templates.length - 1];
	}

	// Make sure we have the Template instance, not the Templates one
	if (result && result instanceof Hawkejs.Templates && result.active) {
		result = result.active;
	}

	return result;
});

/**
 * Get the main block name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 *
 * @type     {String}
 */
Renderer.setProperty(function main_block_name() {

	let template = this.main_template;

	if (template) {
		return template.main_block_name;
	}
});

/**
 * The basis for block ids
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.1
 *
 * @type     {String}
 */
Renderer.enforceProperty(function base_id(value) {

	if (!value) {
		if (Blast.isNode && !this.is_for_client_side) {
			value = 'serverside';
		} else {
			value = ''+Date.now();
		}
	}

	return value;
});

/**
 * Execute the given function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Renderer.setMethod(function execExpressionFunction(fnc, variables, expression) {

	let previous_variables = this.active_variables;

	this.active_variables = variables;

	let __template = this.current_template;

	if (!expression && this.expression_chain && this.expression_chain.length) {
		expression = Bound.Array.last(this.expression_chain);
	}

	fnc.call(this, this, __template, variables, this.helpers, expression);

	this.active_variables = previous_variables;
});

/**
 * Set the current state
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.1.3
 */
Renderer.setMethod(function setState(state) {
	this.state = state;
});

/**
 * Create a clone
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.11
 * @version  2.2.11
 */
Renderer.setMethod(function dryClone(wm, custom_method) {

	let prepared_values = this._prepareClone(wm, custom_method);

	// Clone the value,
	// because returned objects aren't necesarilly cloned yet
	let cloned_values = Blast.Bound.JSON.clone(prepared_values, custom_method, wm);

	let result = Renderer.unDry(cloned_values);

	return result;
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
 * Queue a reactive task
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}   element   The element in question
 * @param    {string}        type      What will be affected: property or body
 * @param    {Function}      task      The actual task
 */
Renderer.setRootMethod(function queueReactiveTask(element, type, task) {

	if (!this[REACTIVE_QUEUE]) {
		this[REACTIVE_QUEUE] = [];

		Blast.nextGroupedImmediate(() => {
			// Get the current queue
			let queue = this[REACTIVE_QUEUE];

			// Remove the queue so new tasks can be added
			this[REACTIVE_QUEUE] = null;

			// Now we have to take a look at all the queued elements.
			// Any element that has a task queued while it's in another element
			// that will completely rerender its contents should be skipped
			let allowed_queue = [],
			    elements_to_rerender = new Set();

			// First pass: get all the elements to re-render
			for (let item of queue) {
				if (item.type == 'body') {
					elements_to_rerender.add(item.element);
				}
			}

			// Second pass: skip elements inside elements that will be re-rendered
			for (let item of queue) {
				let is_allowed = true;

				for (let ancestor of elements_to_rerender) {
					if (ancestor != item.element && ancestor.contains(item.element)) {
						is_allowed = false;
						break;
					}
				}

				if (is_allowed) {
					allowed_queue.push(item);
				}
			}

			for (let item of allowed_queue) {
				try {
					item.task.call(this, item.element);
				} catch (err) {
					console.error(err);
				}
			}
		});
	}

	this[REACTIVE_QUEUE].push({element, task, type});
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.11
 */
Renderer.setMethod(function toJSON() {
	return this._prepareClone();
});

/**
 * Prepare clone values
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.11
 * @version  2.4.0
 */
Renderer.setMethod(function _prepareClone(wm, custom_method) {

	if (!wm) {
		wm = new WeakMap();
	}

	let blocks = this.blocks._prepareClone(this, wm, custom_method);

	const result = {
		variables        : this.variables,
		expose_to_scene  : this.expose_to_scene,
		request          : this.request,
		blocks           : blocks,
		page_title       : this.page_title,
		last_template    : this.last_template,
		focus_block      : this.focus_block,
		assigns          : this.assigns,
		theme            : this.theme,
		history          : this.history,
		queued_templates : this.queued_templates,
		dialogs          : this.dialogs,
		base_id          : null,
		scripts          : null,
		styles           : null,
		language         : this.language,

		is_for_client_side : this.is_for_client_side,
		enableClientRender : this.enableClientRender,
		live_bindings      : this.live_bindings,
		inlineEvents       : this.inlineEvents,
		headTags           : this.headTags
	};

	if (this._is_follower_renderer != null) {
		result.is_follower_renderer = this._is_follower_renderer;
	}

	// base_id is always "hserverside" on the server,
	// we don't want to force that on the client-side
	// if the render is meant to take place there
	if (!this.is_for_client_side) {
		result.base_id = this.base_id;
	}

	if (this.scripts.size) {
		result.scripts = this.scripts;
	}

	if (this.styles.size) {
		result.styles = this.styles;
	}

	return result;

});

/**
 * Handle an error
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.16
 * @version  2.3.16
 *
 * @return   {string}
 */
Renderer.setMethod(function handleError(error) {

	if (!error) {
		error = new Error('Unknown error');
	}

	let template_name = this.current_template?.name || this.errName;
	let line_nr = this.errLine;

	return this.hawkejs.handleError(this, template_name, line_nr, error);
});

/**
 * Flag this renderer (and all its children) as finished
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.11
 * @version  2.3.11
 */
Renderer.setMethod(function makeFinished() {
	this.has_finished = true;

	if (this.child_renderers) {
		for (let child of this.child_renderers) {
			child.makeFinished();
		}
	}
});

/**
 * Create a sub renderer
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.3
 * @version  2.3.11
 *
 * @return   {Hawkejs.Renderer}
 */
Renderer.setMethod(function createSubRenderer() {

	// Create the new instance
	let renderer = new Renderer(this.hawkejs);

	// Set the root renderer
	renderer.root_renderer = this.root_renderer;

	// Make sure this parent remembers its children
	this.child_renderers.push(renderer);

	return renderer;
});

/**
 * Get a clone of the given object, but cache it
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {Object}   variables
 *
 * @return   {Hawkejs.Variables}
 */
Renderer.setMethod(function prepareVariables(variables) {
	return Hawkejs.Variables.cast(variables, this);
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

	let templates;

	if (names instanceof Hawkejs.Templates) {
		templates = names;
		templates.renderer = this;
	} else {
		templates = new Hawkejs.Templates(this, names);
	}

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
 * @version  2.3.15
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function renderHTML(names, variables) {

	var that = this,
	    pledge = new Classes.Pledge.Swift();

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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.3.15
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function _renderQueue() {

	var that = this,
	    tasks = [],
	    pledge = new Classes.Pledge.Swift(),
	    i;

	this.emit('rendering_queue');

	for (i = 0; i < this.queued_templates.length; i++) {
		let templates = this.queued_templates[i];
		tasks.push(this.renderTemplate(templates));
	}

	// The series has to remain true-asynchronous,
	// or the unit tests fail
	Hawkejs.series(Hawkejs.parallel(false, tasks), function doLayout(next) {

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
			finish_pledge = Hawkejs.series(finish_pledge, function finishRest(next) {
				that.finishOnBrowser().done(next);
			}, function done(err, result) {

				that.emit('rendered_templates');

				if (err) {
					return err;
				}

				return result[0];
			});
		}

		finish_pledge.done(function doneFinish(err, result) {

			if (err) {
				return pledge.reject(err);
			}

			if (that.is_root_renderer && that.delayed_elements.length) {
				let tasks = [];

				Hawkejs.recurseLineTasks(that.delayed_elements, tasks, tasks, that);

				Hawkejs.parallel(false, tasks, function done(err) {

					if (err) {
						pledge.reject(err);
					}

					pledge.resolve(result);
				});
			} else {
				pledge.resolve(result);
			}

		});
	});

	pledge.then(() => {
		this.emit('rendered_queue');
	});

	return pledge;
});

/**
 * Finish blocks on the browser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.10
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function finishOnBrowser() {

	let tasks = [],
	    block,
	    el;

	for (block of this.blocks) {
		el = hawkejs.scene.getBlockElement(block.name);

		if (!el) {
			continue;
		}

		tasks.push(block.assemble());
	}

	// These dialogs were created using the `showDialog()` method
	// and need to be prepared separately
	if (this.dialogs) {
		tasks = tasks.concat(Hawkejs.prepareLineTasks(this.dialogs, this, true));
	}

	return Hawkejs.parallel(false, tasks);
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
 * @version  2.4.0
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
		templates.variables = Hawkejs.Variables.cast(variables, this);
	}

	// This still has to remain async for now
	let pledge = Hawkejs.series(true, this._emitBegin(templates), function doRender(next) {

		// Return early if this is meant for the browser
		if (that.client_render && Blast.isNode) {
			return next();
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
 * Do the given tasks in parallel,
 * but try to group multiple calls together.
 * This should improve render performance in the browser
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.16
 * @version  2.3.15
 *
 * @param    {Array}   tasks
 */
Renderer.setMethod(function doTasksGrouped(task_limit, tasks, callback) {

	if (typeof task_limit != 'number') {
		callback = tasks;
		tasks = task_limit;
		task_limit = this.hawkejs.parallel_task_limit;
	}

	// No need to group tasks on the server-side, it can handle them fast enough
	// and the grouping actually makes it slower
	if (Blast.isNode) {
		Hawkejs.parallel(false, task_limit, tasks).done(callback);
		return;
	}

	if (!this.is_root_renderer) {
		return this.root_renderer.doTasksGrouped(tasks, callback);
	}

	let grouped_tasks = this[TASK_GROUP];

	// A task group already exist, so add the new tasks to that
	if (grouped_tasks) {
		grouped_tasks.push([tasks, callback]);

		return;
	}

	// If there are more than 3 tasks already, do them immediately
	if (tasks.length > 3) {
		Hawkejs.parallel(false, task_limit, tasks).done(callback);
		return;
	}

	// Let's create new grouped tasks
	grouped_tasks = [[tasks, callback]];
	this[TASK_GROUP] = grouped_tasks;

	setTimeout(() => {

		this[TASK_GROUP] = null;

		// Do the grouped tasks
		for (let pair of grouped_tasks) {
			Hawkejs.parallel(false, task_limit, pair[0]).done(pair[1]);
		}
	});
});

/**
 * Do queued pre-finish tasks
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.15
 *
 * @return   {Pledge|undefined}
 */
Renderer.setMethod(function doQueuedTasks() {

	if (this.has_pre_finish_tasks) {

		let tasks = Hawkejs.consume(this.pre_finish_tasks, (entry) => {
			return next => Hawkejs.doNextSync(entry(), next);
		});

		if (!tasks) {
			return;
		}

		return Hawkejs.parallel(false, tasks, err => {return err || true});
	}
});

/**
 * Finish the given block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.15
 *
 * @param    {String}   name   The name of the block to finish
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function finish(name) {

	let block = this.blocks.get(name);

	if (!block) {
		return Classes.Pledge.Swift.resolve(null);
	}

	return block.assemble();
});

/**
 * Render the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.15
 *
 * @param    {Hawkejs.Templates}   templates
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function _emitBegin(templates) {

	let that = this,
	    tasks = this.begin_event_pledges.slice(0),
	    pledge;

	tasks.push(function onHawkejs(next) {
		that.hawkejs.emit({
			type   : 'renderer',
			status : 'begin',
			client : !!that.client_render,
		}, that, templates, next);
	});

	tasks.push(function onRenderer(next) {
		that.emit('begin', templates, next);
	});

	pledge = Hawkejs.parallel(false, tasks);

	// We don't start any other renders until all the 'begin' events
	// of this template have finished, otherwise race conditions might happen
	this.begin_event_pledges = [pledge];

	return pledge;
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
 * Adopt elements coming from another renderer
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 *
 * @param    {HTMLElement}   element
 */
Renderer.setMethod(function adoptElement(element) {

	if (!element) {
		return;
	}

	let has_been_registered = element.hawkejs_renderer?.hasBeenRegistered(element);

	if (element.hawkejs_renderer) {
		this.blocks.adopt(element.hawkejs_renderer.blocks, this);
	}

	element.hawkejs = this.hawkejs;

	if (element.hawkejs_renderer) {
		element.hawkejs_renderer = this;
	}

	if (element.hawkejs_id || element.dataset?.hid) {
		element.setIdentifier(this.getId());
	}

	if (has_been_registered) {
		this.registerElementInstance(element);
	}

	if (element.childNodes && element.childNodes.length) {
		let i;
		
		for (i = 0; i < element.childNodes.length; i++) {
			this.adoptElement(element.childNodes[i]);
		}
	}
});

/**
 * Create a block:
 * Create a new BlockBuffer if it doesn't exist already.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.3
 *
 * @param    {String}   blockName
 * @param    {Object}   options
 */
Renderer.setMethod(function createBlock(block_name, options) {

	let result = this.blocks.get(block_name);

	if (!options) {
		options = {};
	}

	// Just Create the block if it doesn't exist already
	if (result == null) {
		result = new Hawkejs.BlockBuffer(this, block_name, options);
		this.blocks.set(block_name, result);
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
 * @version  2.0.3
 *
 * @param    {String}   block_name
 *
 * @return   {Hawkejs.BlockBuffer}
 */
Renderer.setMethod(function getBlockByName(block_name) {

	if (!block_name) {
		block_name = this.current_block_name || '__main__';
	}

	let block = this.blocks.get(block_name);

	if (!block) {
		block = new Hawkejs.BlockBuffer(this, block_name);
		this.blocks.set(block_name, block);
	}

	return block;
});

/**
 * Get a unique string for use as ID
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.12
 *
 * @param    {String}   prefix
 *
 * @return   {String}
 */
Renderer.setCommand(function getId(prefix) {

	let result;

	if (!prefix) {
		result = 'h' + this.base_id + '-' + this.root_renderer.id_count++;
	} else {

		if (!this.root_renderer.prefix_id_numbers[prefix]) {
			this.root_renderer.prefix_id_numbers[prefix] = 0;
		}

		result = prefix + '-' + this.root_renderer.prefix_id_numbers[prefix]++;
	}

	// If we're already on the browser, make sure the ID isn't already used
	// by an element. (This is especially needed when using a custom prefix)
	if (Blast.isBrowser) {
		let existing_element = document.getElementById(result);

		if (existing_element) {
			return this.getId(prefix);
		}
	}

	return result;
});

/**
 * Print content to the given block.
 * This can contain HTML, so it will get parsed first.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.11
 *
 * @param    {String}   content
 *
 * @return   {Number}   The index of the pushed line
 */
Renderer.setCommand(function print(content, block) {

	if (this.shouldPrintThennable(content, false)) {
		return;
	}

	return this.actualPrint(content, block);
});

/**
 * Intercept thenables
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.11
 * @version  2.3.15
 *
 * @param    {String}   content
 *
 * @return   {Boolean}
 */
Renderer.setMethod(function shouldPrintThennable(content, should_be_escaped) {

	if (!Blast.Classes.Pledge.isThenable(content)) {
		return false;
	}

	// Print a placeholder
	this.async(next => {

		// Resolve the thennable
		Classes.Pledge.Swift.done(content, (err, result) => {

			if (err) {
				return next(err);
			}

			if (typeof result != 'string') {
				try {
					result = Hawkejs.getElementContent(result, this);
				} catch (second_err) {
					return next(second_err);
				}
			}

			if (typeof result == 'string') {
				if (should_be_escaped) {
					result = Hawkejs.Hawkejs.createTextNodeFromUnsafe(result, true);
				} else {
					result = Hawkejs.Hawkejs.createTextNode(result);
				}
			}

			next(null, result);
		});
	});

	return true;
});

/**
 * Do the actual printing
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.3.11
 *
 * @param    {String}   content
 *
 * @return   {Number}   The index of the pushed line
 */
Renderer.setMethod(function actualPrint(content, block) {

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

	block = this.getBlockByName(block);

	if (typeof content == 'string') {

		let line_nr = this.errLine,
		    renderer = this.createSubRenderer(),
		    nodes,
		    node,
			i;

		try {
			nodes = renderer.evaluate(content, null, true);
		} catch (err) {
			// There error lines will actually use the wrong name & line
			let pre = renderer.createElement('pre');

			// Yes, we pass `this` renderer, to get some source code results showing
			pre.textContent = this.hawkejs.handleError(this, this.errName, line_nr, err);
			nodes = [pre];
		}

		for (i = 0; i < nodes.length; i++) {
			node = nodes[i];

			// Text nodes in the root should NOT be escaped!
			if (node.nodeType === 3) {
				node.textContent = Bound.String.decodeHTML(node.textContent);
			}

			block.push(node);
		}
	} else {
		block.push(content);
	}
});

/**
 * Print unsafe text
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.2
 * @version  2.3.11
 *
 * @param    {String}   content
 *
 * @return   {Number}   The index of the pushed line
 */
Renderer.setCommand(function printUnsafe(content) {

	if (typeof content != 'string') {

		if (this.shouldPrintThennable(content, false)) {
			return;
		}

		return this.actualPrint(content);
	}

	content = Hawkejs.Hawkejs.createTextNodeFromUnsafe(content, true);

	return this.actualPrint(content);
});

/**
 * Print the string as a text node
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {String}   content
 *
 * @return   {Number}   The index of the pushed line
 */
Renderer.setMethod(function printTextNode(content) {
	content = Hawkejs.Hawkejs.createTextNode(content);
	return this.actualPrint(content);
});

/**
 * Safely print the contents
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.2
 * @version  2.1.0
 *
 * @param    {String}   content
 *
 * @return   {Number}   The index of the pushed line
 */
Renderer.setCommand(function printSafe(content) {

	if (content == null) {
		return;
	}

	if (typeof content != 'string') {

		if (this.shouldPrintThennable(content, true)) {
			return;
		}

		return this.actualPrint(content);
	}

	content = Hawkejs.Hawkejs.createTextNode(content);

	return this.actualPrint(content);
});

/**
 * Create and print an HTML element.
 * (Do not confuse with the deprecated `print_element`)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.17
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
		// Don't register any elements by default
		add_identifier = false;
	}

	element = this.createOpenElement(name, add_identifier);

	if (!element) {
		return;
	}

	if (Blast.isBrowser) {
		element[Hawkejs.CREATED_MANUALLY] = false;
	}

	let skip_print = false;

	if (options) {
		element[OPTIONS] = options;

		if (options.print === false) {
			skip_print = true;
		}
	}

	if (!this.current_block) {
		this.getBlockByName();
	}

	if (name[0] == '!') {
		// Don't add as a parent element
		this.current_block.push(element);
		this.ensureElementOptions(element);
		return;
	} else if (name == 'html') {

		this.html_element = element;

		if (this.language && !element.hasAttribute('lang')) {
			element.setAttribute('lang', this.language);
		}
	} else if (name == 'body') {

		this.body_element = element;

		element.dataset.heTemplate = this.current_template.name;
		element.dataset.heName = this.current_template.main_block_name;

		// @TODO: Similar to the implementation in Scene#setBodyOrigin
		if (this.queued_templates && this.queued_templates.length) {
			let template = this.queued_templates[this.queued_templates.length - 1];
			element.dataset.heLastTemplate = template.name;
		}

		if (this.current_template.active_theme) {
			element.dataset.heTheme = this.current_template.active_theme;
		}
	} else if (name == 'head') {
		this.head_element = element;
	} else if (name == 'img') {
		if (options && options.attributes && options.attributes.src) {
			let src_value = this.parseRuntimeExpression(options.attributes.src);

			if (src_value) {
				this.preload(src_value, 'image');
			}
		}
	} else if (name == 'he-bottom') {
		this.has_bottom = true;
	}

	if (skip_print || (!this.current_block && name == 'he-placeholder')) {
		element.skipped_print = true;
		return element;
	}

	const node_name = element.nodeName;

	if (Hawkejs.Hawkejs.STRICT_ELEMENT_PARENTAGE[node_name]) {
		let parent_element = this.current_element;
		let allowed_parents = Hawkejs.Hawkejs.STRICT_ELEMENT_PARENTAGE[node_name];
		let need_to_close = [];
		let found_parent = false;

		while (parent_element) {

			if (allowed_parents.indexOf(parent_element.nodeName) > -1) {
				found_parent = true;
				break;
			}

			need_to_close.push(parent_element.nodeName);
			parent_element = parent_element.parentElement;
		}

		if (found_parent && need_to_close.length) {
			for (let node_name of need_to_close) {
				this.closeElement(node_name);
			}
		}
	}

	if (Hawkejs.Hawkejs.OPTIONAL_CLOSING_ELEMENTS[node_name]) {
		let parent_element = this.current_element;

		if (parent_element && parent_element.nodeName == node_name) {
			this.closeElement(node_name);
		}
	}

	// Only push the new element if a block is active
	// (A renderer has no active block outside of the Template#interpret method)
	if (this.current_block) {
		this.current_block.pushElement(element);
	}

	if (Hawkejs.Hawkejs.VOID_ELEMENTS[node_name]) {
		this.closeElement(name);
	}

	if (options && options.body) {

		let variables = this.active_variables;

		if (!variables && this.current_template) {
			variables = this.current_template.rendered_variables;
		}

		if (!variables) {
			variables = this.variables;
		}

		this.execExpressionFunction(options.body, variables);

		this.closeElement(name);
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

	Hawkejs.markBranchAsDirty(element);
});

/**
 * Make sure the element options have been applied once
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.3.18
 *
 * @param    {HTMLElement}   element
 */
Renderer.setMethod(function ensureElementOptions(element) {

	if (!element || element[APPLIED_OPTIONS]) {
		return;
	}

	let ElClass = element.constructor,
	    options = element[OPTIONS];

	element[APPLIED_OPTIONS] = true;

	// Call the custom element constructor only when closing the element
	if (Hawkejs.Hawkejs.isCustomElement(element)) {

		let need_sync_render = false;

		// If this needs a sync render,
		// make sure the constructor does not call it before we set the element options
		if (options && ElClass.compiled_template && ElClass.compiled_template.render_immediate !== false) {
			if (!element.hasAttribute('he-rendered')) {
				need_sync_render = true;
				element[Hawkejs.DELAY_SYNC_RENDER] = true;
			}
		}

		// Manually created elements will have already called this
		if (!element[Hawkejs.CREATED_MANUALLY]) {
			Hawkejs.CustomElementConstructor.call(element);
			ElClass.call(element);
		}

		if (need_sync_render) {

			if (options) {
				this.applySynchronousRenderElementOptions(element, options);
				options = null;
			}

			// Make sure it hasn't rendered already
			if (!element.has_rendered) {
				element._renderTemplateSynchronously();
			}
		}
	}

	if (options) {
		this.applyElementOptions(element, options);
	}
});

/**
 * Apply element options before a synchronous template render
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.5
 * @version  2.1.5
 *
 * @param    {Element}   element
 * @param    {Object}    options
 */
Renderer.setMethod(function applySynchronousRenderElementOptions(element, options) {
	return this.applyElementOptions(element, options, true);
});

/**
 * Register possible reactive info
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {Object}    data         Where to store the reactive info in
 * @param    {string}    type         The target type (attribute, property, ...)
 * @param    {string}    key          The key of the target type
 * @param    {Object}    expression   The actual expression
 *
 * @return   {boolean}
 */
Renderer.setMethod(function trackReactiveKeyExpression(data, type, key, expression) {

	// If there are no references anyway, don't bother
	if (!expression?.$references?.length) {
		return false;
	}

	// See if any of the references are actually available
	let reference_values = this.active_variables.getAllPaths(expression.$references).filter(entry => entry instanceof Classes.Develry.Optional);

	if (!reference_values?.length) {
		return false;
	}

	data.$count++;

	if (!data[type]) {
		data[type] = {};
	}

	data[type][key] = {
		expression,
		values: reference_values
	};

	return true;
});

/**
 * Apply element options
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {Element}   element
 * @param    {Object}    options
 * @param    {boolean}   for_sync_render
 */
Renderer.setMethod(function applyElementOptions(element, options, for_sync_render) {

	let reactive = {$count: 0},
	    key,
	    val,
	    i;

	element[APPLIED_OPTIONS] = true;

	for (let key in options.attributes) {
		let expression = options.attributes[key];
		val = this.parseRuntimeExpression(expression);

		this.trackReactiveKeyExpression(reactive, 'attributes', key, expression);

		if (val == null) {
			continue;
		}

		let needs_async_work = Hawkejs.needsToDoAsyncWork(val);

		if (needs_async_work) {
			Hawkejs.markBranchAsDirty(val);
		}

		// If a value is being set that is not yet ready,
		// an async task will have to be added
		if (needs_async_work && !for_sync_render) {

			let renderer = this,
				value = val,
				value_key = key;

			Hawkejs.getRenderTasks(element).addPreTask(function prepareValue() {

				var that = this,
					final_tasks = [],
					pre_tasks = [],
					tasks = [];

				Hawkejs.recurseLineTasks([value], pre_tasks, tasks, renderer);

				final_tasks = final_tasks.concat(pre_tasks).concat(tasks);

				return Hawkejs.series(final_tasks, function done(err) {

					if (err) {
						return;
					}

					if (typeof value.toAttributeValue == 'function') {
						value = value.toAttributeValue();
					}

					try {
						that.setAttribute(value_key, value);
					} catch (err) {
						// Ignore attribute name errors
					}
				});
			});
		} else if (for_sync_render) {
			Hawkejs.Element.Element.prototype.setAttributeSilent.call(element, key, val);
		} else {
			try {
				element.setAttribute(key, val);
			} catch (err) {
				// Ignore attribute name errors
			}

			if (key == 'data-he-name') {

				if (!options.attributes['data-hid']) {
					Hawkejs.Element.Element.prototype.setIdentifier.call(element, this.getId());
				}

				this.registerAssign(val, element, options);

				if (element.tagName != 'HE-BLOCK') {
					// Regular elements that have the `data-he-name` attribute
					// will get the special block content renderer
					Hawkejs.setCachedMethod(element, Hawkejs.RENDER_CONTENT, Hawkejs.Element.HeBlock.prototype[Hawkejs.RENDER_CONTENT]);
				}
			}
		}
	}

	if (options.properties) {
		for (i = 0; i < options.properties.length; i++) {
			let entry = options.properties[i];
			let expression = entry.value;
			let key = entry.name;

			val = this.parseRuntimeExpression(expression);

			this.trackReactiveKeyExpression(reactive, 'properties', key, expression);

			element[key] = val;
		}
	}

	if (options.variables) {

		if (!element[Hawkejs.VARIABLES]) {
			element[Hawkejs.VARIABLES] = this.prepareVariables();
		}

		for (i = 0; i < options.variables.length; i++) {
			let entry = options.variables[i];
			let expression = entry.value;
			let key = entry.name;

			val = this.parseRuntimeExpression(expression);

			element[Hawkejs.VARIABLES].set(key, val);
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
				try {
					element.setAttribute(key, obj[key]);
				} catch (err) {
					// Ignore attribute name errors
				}
			}
		}
	}

	if (options.directives && !for_sync_render) {
		let context,
		    method;

		for (i = 0; i < options.directives.length; i++) {
			val = options.directives[i];
			method = val.method || 'applyDirective';

			context = Obj.path(this.helpers, val.context);

			if (!context) {
				throw new Error('Unable to find "' + val.context.join('.') + '" directive context');
			}

			if (!context[method]) {
				throw new Error('Unable to find "' + val.context.join('.') + '#' + method + '" directive');
			}

			let value = this.parseRuntimeExpression(val.value);
			let promise = context[method](element, value, options);

			if (promise && Blast.Classes.Pledge.hasPromiseInterface(promise)) {
				Hawkejs.getRenderTasks(element).addPreTask(promise);
			}
		}
	}

	if (options.hooks?.length) {
		for (let hook of options.hooks) {
			if (hook.name === 'ref') {
				let value = this.parseRuntimeExpression(hook.value);

				if (value) {
					value.value = element;
				}
			}
		}
	}

	// If the element body is rendered using reference variables,
	// the element has to be registered so the browser knows about it
	if (options.reference_count > 0 && options.references?.length) {

		let values = this.active_variables.getAllPaths(options.references).filter(entry => entry instanceof Classes.Develry.Optional);

		if (values.length) {
			reactive.$count += options.reference_count;
			reactive.body = {values};
		}
	}

	if (reactive.$count && this.attachReactiveReferences(element, reactive)) {

		if (options.variables && element[Hawkejs.VARIABLES]) {
			let new_variables = this.active_variables.overlay(element[Hawkejs.VARIABLES]);
			element[Hawkejs.VARIABLES] = new_variables;
		} else if (!element[Hawkejs.VARIABLES]) {
			element[Hawkejs.VARIABLES] = this.active_variables;
		}

		if (reactive.body && !element.is_custom_hawkejs_element && options.body) {
			let instruction = {};

			if (options.body.source_name) {
				instruction.template = options.body.source_name;
				instruction.function = options.body.name;
			} else {
				instruction.source = options.body.source_code;
			}

			element[Hawkejs.RENDER_INSTRUCTION] = instruction;
		}
	}
});

/**
 * Attach reactive references
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {HTMLElement}   element
 * @param    {Object}        reactive
 */
Renderer.setMethod(function attachReactiveReferences(element, reactive) {

	// Only bother registering the element if there are values
	if (!element || !reactive?.$count) {
		return;
	}

	// Set the reactive info first
	element[Hawkejs.REACTIVE_VALUES] = reactive;

	// Make sure the element is registered
	this.registerElementInstance(element);

	// Add the reactive listeners
	Hawkejs.Renderer.attachReactiveListeners(element, reactive);

	return true;
});

/**
 * Close an element placeholder
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.15
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

	let upper_name;

	if (name) {
		upper_name = name.toUpperCase();

		// Ignore attempts to try to close a void tag
		// (They are already closed, so this would cause a mismatch)
		if (el.nodeName != upper_name && Hawkejs.Hawkejs.VOID_ELEMENTS[upper_name]) {
			if (Hawkejs.Hawkejs.VOID_ELEMENTS[upper_name]) {
				this.current_block.elements.push(el);
				return;
			}
		}
	}

	this.ensureElementOptions(el);

	// @TODO: Why is name sometimes not a string?
	if (name && el.nodeName != upper_name) {

		// Some elements don't require closing tags
		// (These are NOT void elements though, those should never have a closing tag)
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

	if (el.is_custom_hawkejs_element) {
		el.onHawkejsCloseElement();
	}
});

/**
 * Prepare content of all items
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.0
 * @version  2.2.10
 *
 * @param    {Object}   obj
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function prepareContent(obj) {

	var that = this,
	    tasks = [];

	Obj.walk(obj, function eachValue(val, key, parent) {

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

	return Hawkejs.parallel(false, tasks);
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
 * Parse a runtime expression
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {Object}   config
 *
 * @return   {*}
 */
Renderer.setMethod(function parseRuntimeExpression(config) {

	let type = typeof config;

	if (type == 'string' || type == 'number' || type == 'boolean') {
		return config;
	}

	if (!config) {
		return;
	}

	if (typeof config.$value !== 'undefined') {
		return config.$value;
	}

	if (config.$concat) {
		let pieces = [];

		for (let entry of config.$concat) {
			pieces.push(this.parseRuntimeExpression(entry));
		}

		return pieces.join('');
	}

	if (config.$expression) {
		let unwrap_optionals = config.$unwrap_optionals !== false;
		return this.parseExpression(config.$expression, this.active_variables, unwrap_optionals);
	}
});

/**
 * Execute an inline expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.3
 * @version  2.4.0
 */
Renderer.setMethod(function parseExpression(tokens, vars, unwrap_optionals = true) {
	let expression = new Hawkejs.Expression.Expression(this);
	expression.unwrap_optionals = unwrap_optionals;
	return expression.parseExpression(tokens, vars);
});

/**
 * Parse expression arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.3
 * @version  2.4.0
 */
Renderer.setMethod(function parseExpressionAsArguments(tokens, vars, unwrap_optionals = true) {
	let expression = new Hawkejs.Expression.Expression(this);
	expression.unwrap_optionals = unwrap_optionals;
	return expression.getTokenValuesArray(tokens, vars);
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
 * @version  2.2.9
 *
 * @param    {Array}   instructions
 *
 * @return   {String}
 */
Renderer.setMethod(function createStyleHtml(instructions) {

	let html = '';

	if (!instructions?.size) {
		return html;
	}

	let seen_urls = new Map(),
	    styles,
	    config,
	    style,
	    url;

	for (let parameters of instructions) {
		styles = parameters[0];
		config = parameters[1];

		for (style of styles) {

			if (config.inline) {

				html += '\t\t<style data-style-name="' + style + '" type="text/css">';
				html += config.source;
				html += '</style>\n';

				continue;
			}

			url = '' + this.hawkejs.createStyleUrl(style, config);

			if (seen_urls.has(url)) {
				continue;
			}

			html += '\t\t<link href="' + url + '" rel="stylesheet">\n';
			seen_urls.set(url, true);
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
 * Is the given element registered?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.9
 * @version  2.2.9
 *
 * @param    {Element}   element
 *
 * @return   {Boolean}
 */
Renderer.setMethod(function hasBeenRegistered(element) {

	if (!element) {
		return false;
	}

	let id = element.hawkejs_id || element.dataset.hid;

	if (!id) {
		return false;
	}

	let variables = this.root_renderer.variables;

	if (!variables || !variables.has('__he_elements')) {
		return false;
	}

	return variables.get('__he_elements').indexOf(element) > -1;
});

/**
 * Register an element that needs to be dried
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {Element}   element
 */
Renderer.setMethod(function registerElementInstance(element) {

	let he_elements,
	    variables = this.root_renderer.variables,
	    id = element.hawkejs_id || element.dataset.hid;

	if (!variables.has('__he_elements')) {
		he_elements = [];
		variables.set('__he_elements', he_elements);
	} else {
		he_elements = variables.get('__he_elements');
	}

	if (!id) {
		id = this.getId();

		// Set the id
		element.setIdentifier(id);
	} else {
		if (he_elements.indexOf(element) > -1) {
			return;
		}
	}

	he_elements.push(element);
});

/**
 * Make an AJAX request
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.15
 *
 * @param    {String}    href        The url to go to
 * @param    {Object}    options     Options
 * @param    {Function}  callback    The function to callback to
 *
 * @return   {Pledge}
 */
Renderer.setMethod(function fetch(href, options, callback) {

	var that = this,
	    request = new Classes.Develry.Request(),
	    pledge,
	    url;

	if (typeof href == 'object' && !Classes.RURL.isUrl(href)) {
		callback = options;
		options = href;
		href = options.href;
	}

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	if (!options) {
		options = {};
	}

	// Fix url property
	url = Classes.RURL.parse(options.url || href || options.href);

	if (!options.headers) {
		options.headers = {};
	}

	if (Blast.isBrowser) {

		if (Blast.isIE) {
			url.param('hajax', Date.now());
		} else {
			url.param('hajax', 1);
		}

		// Add time-on-page to post requests
		if (options.post && options.cache == null) {
			url.param('htop', ~~Blast.performanceNow());
		}

		options.headers['x-scene-id'] = hawkejs.scene.getSceneId();
	}

	options.url = url;

	request.setOptions(options);

	pledge = request.start();
	pledge.request = request;

	if (callback) {
		pledge.done(function done(err, result) {

			if (err) {
				callback(err, err.result, request);
			} else {
				callback(null, result, request);
			}
		});
	}

	return pledge;
});

/**
 * Put the hawkejs client foundation here
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.1.3
 *
 * @return   {Pledge}
 */
function getFoundationContent() {

	var that = this,
	    options = this[OPTIONS] || {},
	    pledge = new Classes.Pledge(),
	    renderer = this.hawkejs_renderer;

	_getFoundationContent.call(this, pledge, renderer, renderer.hawkejs, options);

	return pledge;
};

/**
 * Evaluate the string as a template
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.0
 * @version  2.2.0
 *
 * @param    {String}   source
 *
 * @return   {Array}
 */
Renderer.setMethod(function evaluate(source, variables, html_only) {

	let compiled;

	if (typeof source == 'string') {
		compiled = this.hawkejs.compile({
			template       : source,
			template_name  : 'eval_' + Date.now() + '_' + this.getId('eval_compile'),
			cache          : false,
			html_only      : html_only,
		});
	} else {
		compiled = source;
	}

	// @TODO: create sub renderer if really needed?
	let renderer = this;

	let template = new Hawkejs.Template(null, compiled);

	// Set a main block name modifier, otherwise multiple evaluations of the
	// same source would get cached
	template.main_name_modifier = this.getId('evaluation');

	// Set the renderer
	template.renderer = renderer;

	// Evaluate the template code
	template.evaluate(variables);

	return template.target_block.lines;
});

/**
 * Put the hawkejs client foundation here
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.3.16
 *
 * @param    {Pledge}   pledge
 */
function _getFoundationContent(pledge, renderer, hawkejs, options) {

	var result = '<title>',
	    title;

	if (renderer.page_title) {

		title = Hawkejs.getTextContent(renderer.page_title, renderer);

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

	let variables = renderer.prepareVariables(renderer.variables);

	// Add all variables to a single array
	packed_variables = [variables, settings, renderer];

	dry = hawkejs.stringifyToExpression(packed_variables);

	// Get the serialized settings & view variables
	if (hawkejs._debug) {
		// Don't let google index this page
		html += '\t\t<meta name="robots" content="noindex">\n';
	}

	// Add things we can preload
	html += renderer.createPreloadHtml();

	// Add all the head tags
	for (let entry of renderer.head_tags) {
		html += '\t\t<' + entry.name;

		let attributes = entry.attributes || entry.attr;

		if (attributes) {
			let key;

			for (key in attributes) {
				html += ' ' + key + '="' +  Bound.String.encodeHTML(attributes[key]) + '"';
			}
		}

		html += '>';

		if (entry.content) {
			html += entry.content;
		}

		html += '</' + entry.name + '>\n';
	}

	// Set the static exposed variables string
	html += '\t\t<!-- Static hawkejs variables -->\n\t\t';
	html += hawkejs.static_exposed_js_string + '\n\n';

	html += '\t\t<!-- Request specific variables -->\n';

	// Set the data first (async defer doesn't always do what it should)
	html += '\t\t<script>window._initHawkejs = ' + dry + ';</script>\n';

	hs_path = hawkejs.createScriptUrl(hawkejs.client_path, {root_path: hawkejs.root_path});

	// If debugging, don't load the script yet
	// (Causes issues with sourcemap)
	if (hawkejs._debug) {
		// Ignore
		if (!renderer.has_bottom) {
			html += '\t\t<script src="' + hs_path + '"></script>\n';
		}
	} else if (hawkejs.strategy == 'defer') {
		// Load the hawkejs client file according to the strategy
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

	this.delayed_elements.push(placeholder);

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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.4.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        options
 * @param    {Object}        variables
 *
 * @return   {Hawkejs.Element.HePlaceholder}
 */
Renderer.setMethod(function addSubtemplate(names, options, variables) {

	let current_template = this.current_template,
	    placeholder,
	    templates = new Hawkejs.Templates(this, names);

	// Get the variables that are currently active
	let base_variables = Hawkejs.Variables.cast(this.active_variables || this.variables, this);

	// We need to get the variables as they are at THIS point in time
	// (Because the included template will be rendered later)
	base_variables = base_variables.getShallowClone();

	variables = base_variables.overlay(this.prepareVariables(variables));

	// The main block name should be modified,
	// so the same template can be implemented multiple times
	templates.main_name_modifier = String(++this.implement_count);

	// Indicate this is a subtemplate
	templates.is_subtemplate = true;

	// Get the current element
	const ancestor_element = this.$0;

	placeholder = this.async(function renderSubtemplate(next) {

		// The Templates render method expects fully prepared variables.
		variables = this.prepareVariables(variables);
		variables.setFromTemplate('$ancestor_element', ancestor_element);

		templates.render(variables).done(function done(err, block) {

			if (err) {
				return next(err);
			}

			if (!options) {
				return next(null, block);
			}

			// The template's target_block_name can be changed,
			// but this isn't ideal at this stage and `switchTemplate`
			// now hooks into the extension code
			if (block && options.change_main) {
				current_template.target_block_name = block.name;
			}

			if (block && options.set_template_info) {
				block.addInfoToElement(options.set_template_info);
			}

			next(null, block);
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
 * @version  2.2.2
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        variables
 */
Renderer.setCommand(function implement(names, variables) {

	// Reverse compatibility with Hawkejs v1
	if (arguments.length == 3) {
		if (arguments[1] == null) {
			variables = arguments[2];
		} else {
			throw new Error('Renderer#implement(names, variables) now only takes 2 arguments');
		}
	}

	let placeholder = this.addSubtemplate(names, {force_call: true}, variables);

	if (this.current_template) {
		this.current_template.implementations.push(placeholder);
	}

	return placeholder;
});

/**
 * Render a partial in the current Renderer scope.
 * Only gets executed if in a used block
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        options
 * @param    {Object}        variables
 */
Renderer.setCommand(function include(names, variables) {

	if (names == null && variables) {
		if (typeof variables == 'string') {
			names = variables;
			variables = null;
		} else {
			names = variables[0];
			variables = variables[1];
		}
	}

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
 * Deprecated method that also prints out the partial
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Array|String}  names       The partial to render
 * @param    {Object}        variables
 * @param    {Object}        options
 */
Renderer.setCommand(function print_partial(names, variables, options) {
	var placeholder = this.partial(names, variables, options);
	this.print(placeholder);
});

/**
 * Render a partial in a new Renderer scope and print it out.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.2.8
 *
 * @param    {Array|String|Function}  names       The partial to render
 * @param    {Object}                 variables
 * @param    {Object}                 options
 *
 * @return   {Hawkejs.Element.Placeholder}
 */
Renderer.setCommand(function partial(names, variables, options) {

	var that = this,
	    placeholder,
	    templates,
	    t_vars,
	    ic = ++this.implement_count;

	// Create a new renderer instance
	let renderer = this.createSubRenderer();

	// Create the templates object
	templates = new Hawkejs.Templates(renderer, names);

	if (typeof names == 'function') {
		names = names.source_name;
	}

	if (!options) {
		options = {};
	}

	if (options.scope_id) {
		renderer.scope_id = options.scope_id;
	}

	if (this.current_template) {
		t_vars = this.current_template.variables;
	}

	let base_variables = Hawkejs.Variables.cast(this.active_variables || this.variables, this);

	if (variables) {
		variables = base_variables.overlay(variables);
	} else {
		variables = base_variables;
	}

	if (t_vars) {
		variables = variables.overlay(t_vars);
	}

	renderer.variables = variables;

	if (options.force_call == null) {
		options.force_call = false;
	}

	this.emit('sub_render', renderer, names);

	placeholder = this.async(function doPartial(next) {

		placeholder.he_templates = templates;

		that.emit('rendering_sub_render', renderer, names);

		templates.render(variables).done(function done(err, result) {

			if (!err) {
				let block;

				// Blocks created in a new scope need to be added to the root renderer,
				// otherwise those blocks won't get emitted
				for (block of renderer.blocks) {
					that.root_renderer.blocks.set(block.name + '_' + ic, block);
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
 * @param    {Object}   options
 *
 * @return   {BlockPlaceholder}
 */
Renderer.setCommand(function assign(name, options) {

	if (!options) {
		options = {
			tag       : 'he-block',
			className : null,
		};
	} else {
		if (!options.tag) {
			options.tag = 'he-block';
		}
	}

	return this._assign(name, options);
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
 * @param    {Object}   options
 *
 * @return   {BlockPlaceholder}
 */
Renderer.setMethod(function _assign(name, options) {

	var tag_name = options.tag,
	    element = this.printElement(tag_name, {add_identifier: true});

	// Store the name of the block
	element.dataset.heName = name;

	if (options.className) {
		Hawkejs.addClasses(element, options.className);
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
 * Add a class to the current block
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.4
 * @version  2.0.4
 *
 * @param    {String|Array}   names
 */
Renderer.setCommand(function addClass(names) {

	let block = this.current_block;

	if (!block) {
		throw new Error('Unable to add classes to block: no block is currently active');
	}

	if (!Array.isArray(names)) {
		names = names.split(/\s/);
	}

	if (!block.options.className) {
		block.options.className = [];
	}

	Blast.Bound.Array.include(block.options.className, names);
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

	if (!block_name && block_name !== '') {
		throw new Error('Unable to start block with an invalid name');
	}

	if (typeof block_name == 'object' && block_name.expression) {
		block_name = this.parseExpression(block_name.expression);
	}

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

	var chain = this.chain,
	    index;

	if (block_name) {

		if (typeof block_name == 'object' && block_name.expression) {
			block_name = this.parseExpression(block_name.expression);
		}

		if (this.dialog_open) {
			block_name = this.dialog_open + '_' + block_name;
		}

		index = chain.lastIndexOf(block_name);

		if (index > -1) {
			// If the block was found, remove it and everything after
			chain.splice(index);
		} else {
			// If the block wasn't found, just remove the last block
			chain.pop();
		}

	} else {
		chain.pop();
	}

	if (chain.length) {
		this.current_block_name = chain[chain.length - 1];
	} else {
		this.current_block_name = '';
	}
});

/**
 * Create an element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  2.3.13
 *
 * @param    {String}   name
 *
 * @return   {HTMLElement}
 */
Renderer.setCommand(function createElement(name, add_identifier) {

	// An "open" element is created, but the constructors are called on it immediately
	let element = this.createOpenElement(name, add_identifier);

	// Call custom element cosntructor when it's a custom element
	if (Hawkejs.Hawkejs.isCustomElement(element)) {
		element[Hawkejs.CREATED_MANUALLY] = true;
		element.constructor.call(element);
		Hawkejs.CustomElementConstructor.call(element);
	}

	// For server-side renders, elements that are created & then appended to
	// another element directly (using `appendChild` or so) will undergo
	// a dirty check. But this is because the server-side element class is our
	// own custom class, containing custom logic.
	// This does not happen on the browser, so no dirty check is made when
	// creating & appending elements programatically.
	// Because of this, we have to mark the elements as dirty
	// as soon as they are created.
	if (Blast.isBrowser && Hawkejs.canBeMarkedAsDirty(element)) {
		Hawkejs.markBranchAsDirty(element);
	}

	return element;
});

/**
 * Create an element, but consider it "open"
 * (Constructor won't be called until the close tag is seen)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.1.0
 * @version  2.3.16
 *
 * @param    {String}   name
 *
 * @return   {HTMLElement}
 */
Renderer.setMethod(function createOpenElement(name, add_identifier) {

	let element = Hawkejs._createUnconstructedElement(name);

	if (!element) {
		return;
	}

	if (add_identifier == null) {
		add_identifier = false;
	}

	if (add_identifier && element.setIdentifier) {
		this.registerElementInstance(element);
	}

	if (element.is_custom_hawkejs_element) {
		element.start_template = this.current_template;
		element.start_line_nr = this.errLine;

		if (name == 'he-placeholder') {
			this.root_renderer.placeholder_elements.push(element);
		}
	}

	// Allow the custom element to use this renderer
	element.hawkejs_renderer = this;

	if (this.on_template_root_level) {
		this.addFallbackParentElementGetter(element);
	}

	return element;
});

/**
 * Overlay parentElement getter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.3
 * @version  2.4.0
 *
 * @param    {HTMLElement}   element
 */
Renderer.setMethod(function addFallbackParentElementGetter(element) {

	if (!this.current_variables) {
		return;
	}

	// See if an ancestor element has been defined
	let $ancestor_element = this.current_variables.get('$ancestor_element');

	if (!$ancestor_element) {
		return;
	}

	const originalParentElementDescriptor = Blast.Collection.Object.getPropertyDescriptor(element, 'parentElement');
	const originaRemoveDescriptor = Blast.Collection.Object.getPropertyDescriptor(element, 'remove');

	// Monkey-patch the element with a custom parentElement getter & setter
	// (This method is fastest + works on node & in the browser.
	//  Object.create & Proxy elements do not work)
	Object.defineProperty(element, 'parentElement', {
		get: function getParentElement() {

			let parent = originalParentElementDescriptor.get.call(element);

			if (parent == null) {
				parent = $ancestor_element;
			}
	
			return parent;
		},
		set: function setParentElement(new_parent) {

			$ancestor_element = new_parent;

			if (Blast.isNode) {
				return originalParentElementDescriptor.set.call(element, new_parent);
			}
		}
	});

	// Catch remove calls too
	Object.defineProperty(element, 'remove', {
		value: function remove() {
			$ancestor_element = null;
			return originaRemoveDescriptor.value.call(element);
		}
	});
});

/**
 * Set the title for the page
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.1
 *
 * @param    {String}   title
 */
Renderer.setCommand(function setTitle(title) {

	if (title && typeof title != 'string' && Hawkejs.canBeMarkedAsDirty(title)) {
		const that = this;

		Hawkejs.markBranchAsDirty(title);

		this.pre_finish_tasks.push(function getTitleContent() {
			let tasks = [];
			Hawkejs.recurseLineTasks([title], tasks, tasks, that);

			return Hawkejs.parallel(tasks);
		});
	}

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

	if (!href) {
		return;
	}

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

	let href_string = href.href,
	    entry,
	    i;

	options.href = href;
	options.href_string = href_string;

	for (i = 0; i < this.items_to_preload.length; i++) {
		entry = this.items_to_preload[i];

		// If this was already in the items to preload,
		// overwrite it with the new options
		if (entry.href_string == href_string) {
			this.items_to_preload[i] = options;
			return;
		}
	}

	this.items_to_preload.push(options);
});

/**
 * Indicate this script is needed for this render
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.9
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
		let url,
		    i;

		for (i = 0; i < instructions.length; i++) {
			this.preload(this.hawkejs.createScriptUrl(instructions[i], options), 'script');
		}
	}

	if (Blast.isBrowser && this === hawkejs.scene.general_renderer) {

		if (!instructions || !instructions.length) {
			return;
		}

		// Immediately load the script if this is the general renderer
		hawkejs.scene.loadScripts([[instructions, options]]);
	} else {
		this.scripts.add([instructions, options]);
	}
});

/**
 * Indicate this style is needed for this render
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.0.0
 * @version  2.2.17
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
		if (!options.inline) {
			let i;

			for (i = 0; i < instructions.length; i++) {
				this.preload(this.hawkejs.createStyleUrl(instructions[i], options), 'style');
			}
		}
	}

	if (Blast.isBrowser) {

		if (!hawkejs.scene) {
			// If the scene hasn't been created yet, delay loading this style
			Blast.setImmediate(() => {
				this.style(instructions, options);
			});
			return;
		} else if (this.root_renderer === hawkejs.scene.general_renderer) {

			if (!instructions || !instructions.length) {
				return;
			}

			// Immediately load the style if this is the general renderer
			hawkejs.scene.enableStyle(instructions, options);

			return;
		}
	}

	this.styles.add([instructions, options]);
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
 * @version  2.4.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function set(name, value) {

	if (arguments.length == 1) {

		if (this.current_template && this.current_template.variables && this.current_template.variables.has(name)) {
			return this.current_template.variables.get(name);
		}

		// If there is a parent renderer, look there if this does not have it
		if (!this.is_root_renderer && !this.variables.has(name)) {
			return this.root_renderer.set(name);
		}

		return this.variables.get(name);
	}

	this.variables.setShouldTransform(name, value);
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

	this.head_tags.add({
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
 * @version  2.4.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function expose(name, value) {

	if (arguments.length == 1) {

		// Look inside the viewrender first
		if (this.expose_to_scene.has(name)) {
			return this.expose_to_scene.get(name);
		}

		// If the item hasn't been found yet, look in the scene
		if (typeof hawkejs != 'undefined' && hawkejs && hawkejs.scene) {
			return hawkejs.scene.exposed[name];
		}

		if (this.hawkejs.expose_static && typeof this.hawkejs.expose_static[name] != 'undefined') {
			return this.hawkejs.expose_static[name];
		}

		return;
	}

	this.expose_to_scene.setShouldTransform(name, value);
});

/**
 * Set this variable to be used on the server side only.
 * These variables will not be cloned.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.1
 * @version  2.4.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Renderer.setCommand(function serverVar(name, value) {

	if (arguments.length == 1) {

		// If there is a parent renderer, look there if this does not have it
		if (!this.is_root_renderer && !this.server_variables.has(name)) {
			return this.root_renderer.serverVar(name);
		}

		return this.server_variables.get(name);
	}

	this.server_variables.setRaw(name, value);
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
 * @version  2.2.16
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
	if (!this.is_root_renderer) {
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
 * @version  2.0.1
 */
Renderer.setCommand(function showDialog(name, variables, options) {

	let dialog = this.createElement('he-dialog');

	dialog.template = name;
	dialog.variables = variables;

	this.dialogs.push(dialog);

	return dialog;
});

/**
 * Execute asynchronous code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.3.15
 *
 * @param    {Function}   fnc
 * @param    {Object}     options
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

	if (options.wrap === false || options.print === false) {
		placeholder = this.createElement('he-placeholder');
	} else {
		placeholder = this.printElement('he-placeholder');
		this.closeElement('he-placeholder');
	}

	if (options.force_call) {

		if (!this.pre_finish_tasks) {
			throw new Error('Renderer#pre_finish_tasks does not seem to be an array');
		}

		this.pre_finish_tasks.push(getAsyncValue);
	}

	Hawkejs.getRenderTasks(placeholder).setPreAssembler(getAsyncValue);

	// Remember these in case something goes wrong
	let err_name = this.errName,
	    err_line = this.errLine;

	function getAsyncValue() {

		if (!promise) {
			promise = new Classes.Pledge.Swift();

			fnc.call(that, function getResult(err, result) {

				if (err) {
					result = that.createElement('pre');
					result.textContent = that.hawkejs.handleError(that, err_name, err_line, err);
				}

				placeholder[Hawkejs.RESULT] = result;
				promise.resolve();
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
 * (Similar to the Renderer#evaluate() method)
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