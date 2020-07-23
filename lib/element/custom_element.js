var has_premature_undried_elements,
    originalCreateElement,
    creating_element,
    observed_attributes = Symbol('observed_attributes'),
    weak_properties = new WeakMap(),
    browser_store = {},
    Element,
    has_v1 = typeof customElements == 'object',
    render_counter = 0;

if (Blast.isBrowser) {
	Hawkejs.browser_store = browser_store;
}

/**
 * Base element constructor
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 */
function ElementConstructor() {

	var attr,
	    i;

	// Trigger an initial attribute change
	for (i = 0; i < this.attributes.length; i++) {
		attr = this.attributes[i];
		this.attributeChangedCallback(attr.name, null, attr.value, true);
	}
}

if (Blast.isNode) {
	Element = Fn.inherits('Hawkejs.HTMLElement', 'Hawkejs.Element', function Element() {
		Element.super.call(this);
		ElementConstructor.call(this);
	});
} else {

	// IE & Edge fix
	if (typeof HTMLElement === 'object') {
		let Element = function HTMLElement(){};
		Element.prototype = HTMLElement.prototype;
		HTMLElement = Element;
	}

	Element = Blast.Bound.Function.inherits('HTMLElement', 'Hawkejs.Element', function Element() {
		ElementConstructor.call(this);
	});

	if (typeof customElements != 'undefined') {
		let originalCreateElement = document.createElement;

		document.createElement = function createElement(name) {

			var element;

			creating_element = true;
			element = originalCreateElement.apply(document, arguments);
			creating_element = false;

			// If it has constitutors, it's a custom element of ours!
			if (element.constructor.constitutors) {
				element[Hawkejs.CREATED_MANUALLY] = true;
				element.constructor.call(element);
			}

			return element;
		};
	}
}

/**
 * Create a private variable for the given instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.1
 * @version  1.1.1
 *
 * @param    {Element}   instance
 *
 * @return   {Object}
 */
function getPrivate(instance) {

	var map = weak_properties.get(instance);

	if (!map) {
		map = {
			// Attribute configurations
			attributes  : {},

			// Attribute values for use in property getters
			prop_values : {},

			// Attribute string values
			values      : {},

			// New values that are beign set
			new_values  : {}
		};

		weak_properties.set(instance, map);
	}

	return map;
}

/**
 * Register the element in the browser
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 */
Element.constitute(function registerElement() {

	if (this.is_abstract_class) {
		return;
	}

	let name = this.name;

	if (Bound.String.endsWith(name, 'Element')) {
		name = Bound.String.before(name, 'Element');
	}

	// If the name is just "Element", ignore it
	if (!name) {
		return;
	}

	const that = this;

	let upper_name,
	    upper_tag,
	    options;

	// Add underscores
	name = Bound.String.underscore(name);

	// Turn underscores into dashes
	name = Bound.String.dasherize(name);

	// See if a prefix *needs* to be added
	let prefix = this.custom_element_prefix;

	// Make sure the name contains a dash
	if (prefix || name.indexOf('-') < 1) {

		// If no custom prefix was found, see if a default one exists
		if (!prefix) {
			prefix = this.default_element_prefix;
		}

		// Still nothing? Look in the namespace
		if (!prefix) {
			let ns;

			if (this.namespace) {
				ns = Bound.Function.getNamespace(this.namespace);
			}

			if (ns && ns.default_element_prefix) {
				prefix = ns.default_element_prefix;
			}
		}

		if (!prefix) {
			prefix = 'he';
		}

		name = prefix + '-' + name;
	}

	upper_name = name.toUpperCase();

	if (this.prototype.parent_element) {
		upper_tag = this.prototype.parent_element.toUpperCase();
	} else {
		upper_tag = upper_name;
	}

	this.setProperty('nodeName', upper_name);
	this.setProperty('tagName', upper_tag);
	this.setProperty('_l_node_name', name);
	this.setProperty('_l_tag_name', upper_tag.toLowerCase());

	if (Blast.isNode) {
		// No need to mess with any `define` stuff on the server
	} else if (typeof customElements == 'undefined') {

		options = {
			prototype: Object.create(this.prototype, {createdCallback: {value: this}})
		};

		// If a parent element is set, the 'is=""' attribute needs to be used
		if (this.prototype.parent_element) {
			options.extends = this.prototype.parent_element;
		}

		// Register the element in the browser
		Blast.afterOnce('requiring', function registerElement() {
			that.ElementConstructor = document.registerElement(name, options);
		});
	} else {

		options = {};

		// If a parent element is set, the 'is=""' attribute needs to be used
		if (this.prototype.parent_element) {
			options.extends = this.prototype.parent_element;
		}

		// Create a wrapper function that'll be used to actually create the element
		// using the v1 custom-element structure
		let ClassSyntaxFixer = function ClassSyntaxFixer() {
			var instance = Reflect.construct(HTMLElement, [], ClassSyntaxFixer);

			if (creating_element) {
				// Do nothing, constructor will be called later
			} else if (typeof hawkejs == 'undefined') {
				Blast.nextTick(function callWithHawkejsOnNextTick() {
					that.call(instance);
				});
			} else {
				that.call(instance);
			}

			return instance;
		}

		// Needed to make onAttributeChanged work
		Fn.setStaticProperty(ClassSyntaxFixer, function observedAttributes() {
			return that.observedAttributes;
		});

		// Make sure to completely replace the wrapper's prototype
		// with our own
		ClassSyntaxFixer.prototype = that.prototype;

		Blast.afterOnce('hawkejs_init', function defineElement() {
			customElements.define(name, ClassSyntaxFixer, options);
		});
	}

	// Register with hawkejs
	Hawkejs.Hawkejs.elements[name] = this;
	Hawkejs.Hawkejs.elements[upper_name] = this;
});

/**
 * Do something when the scene is ready
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.2
 * @version  1.3.2
 *
 * @param    {Function}
 */
Element.setStatic(function sceneReady(fnc) {

	if (Blast.hasBeenSeen('hawkejs_registered')) {
		return Blast.nextTick(fnc);
	}

	Blast.afterOnce('hawkejs_registered', function waitForScene() {
		fnc();
	});
}, false);

/**
 * Revive this object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 */
Element.setStatic(function unDry(obj, force) {

	var that = this,
	    element,
	    temp,
	    key;

	if (Blast.isBrowser) {
		if (obj.hawkejs_id) {
			element = document.querySelector('[data-hid="' + obj.hawkejs_id + '"]');
		}

		// No id was given, or it wasn't found (yet)
		// So create a temporary element
		if (!element) {

			if (!obj.hawkejs_id || document.readyState == 'interactive' || document.readyState == 'complete') {
				force = true;
			}

			// If force is enabled, a new element is made
			if (force) {
				if (obj.tag_name || has_v1) {
					element = document.createElement(obj.tag_name || this.prototype.nodeName);
				} else if (this.ElementConstructor) {
					element = new this.ElementConstructor;
				} else {
					throw new Error('Custom element ' + this.name + ' has no ElementConstructor');
				}
			} else {
				has_premature_undried_elements = true;

				// Return an object the Scene instance will replace
				// once the DOM is ready
				temp = {
					__delay_undry: function delayUndry() {

						if (temp.revived == null) {
							temp.revived = that.unDry(obj, true);
						}

						return temp.revived;
					},
					revived: null,
					obj: obj
				};

				return temp;
			}
		}
	} else {
		element = new this;
	}

	for (key in obj) {
		temp = obj[key];
		element[key] = temp;
	}

	// Delay this so the object is fully undried
	Element.sceneReady(function() {
		if (typeof element.undried == 'function') {
			element.undried();
		}
	});

	return element;
});

/**
 * Fix premature undried elements
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Element.setStatic(function fixPrematureUndriedElements(scene, renderer) {

	if (!has_premature_undried_elements) {
		return;
	}

	// This shouldn't take too long, unless lots of debug data is set
	Blast.Bound.Object.walk(renderer.variables, function eachEntry(value, key, parent) {
		if (value && typeof value == 'object' && value.__delay_undry) {
			parent[key] = value.__delay_undry();
		}
	});
});

/**
 * Add an attribute setter/getter
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.8
 * @version  1.2.8
 */
Element.setStatic(function setAttribute(name, getter, setter, config) {
	this.constitute(function setAttribute() {
		this._setAttribute(name, getter, setter, config);
	});
});

/**
 * Add an attribute setter/getter
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.1
 * @version  2.0.0
 */
Element.setStatic(function _setAttribute(name, getter, setter, config) {

	if (typeof name == 'function') {
		config = setter;
		setter = getter;
		getter = name;
		name = getter.name;
	}

	if (!name) {
		throw new Error('No name was given for attribute');
	}

	if (getter && typeof getter == 'object') {
		config = getter;
		getter = null;
		setter = null;
	}

	if (setter && typeof setter == 'object') {
		config = setter;
		setter = null;
	}

	if (!config) {
		config = {};
	}

	// Store the custom getters and setters
	config.getter = getter;
	config.setter = setter;

	// Create an object on the constructor
	// so we know which attributes are configured
	if (!this._attributes) {
		this._attributes = {};
	}

	let different_prop_type = false,
	    attribute_name = name,
	    property_name = name;

	if (name.indexOf('_') > -1) {
		attribute_name = name.replace(/_/g, '-');
	}

	if (name.indexOf('-') > -1) {
		property_name = name.replace(/-/g, '_');
	}

	if (config.boolean || config.number) {
		different_prop_type = true;
	}

	if (setter || different_prop_type) {
		this.addObservedAttribute(attribute_name);
	}

	// Store the attribute configuration
	this._attributes[attribute_name] = config;

	let names = [attribute_name];

	if (attribute_name != property_name) {
		names.push(property_name);
	}

	// Set the instance property getter/setter
	this.setProperty(names, function attrGetter() {

		var val;

		if (this.constructor.prototype == this) {
			return;
		}

		if (different_prop_type) {
			let map = getPrivate(this);

			if (map) {
				val = map.prop_values[attribute_name];
			}
		} else {
			val = this.getAttribute(attribute_name);
		}

		// Custom getters can modify the attribute string
		if (getter) {
			val = getter.call(this, val);
		}

		return val;
	}, function attrSetter(value) {

		if (this.constructor.prototype == this) {
			throw new Error('Unable to assign to setter outside of object instance');
		}

		let newval;

		if (setter) {
			newval = setter.call(this, value);

			// If there was no return value, use the original value
			if (typeof newval == 'undefined') {
				newval = value;
			}
		} else {
			newval = value;
		}

		if (config.boolean) {
			newval = !!newval;

			if (newval) {
				this.setAttributeSilent(attribute_name, newval);
			} else {
				let new_values = getPrivate(this).new_values;
				new_values[attribute_name] = newval;

				this.removeAttribute(attribute_name);
			}
		} else {
			this.setAttributeSilent(attribute_name, newval);
		}

		return newval;
	});
});

/**
 * Monitor a value for changes
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setStatic(function monitor(name, callback) {

	if (!this._monitors) this._monitors = {};
	if (!this._monitors[name]) this._monitors[name] = [];

	this._monitors[name].push(callback);
});

/**
 * Add a property that is stored in assigned_data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 */
Element.setStatic(function setAssignedProperty(name, getter, setter) {

	if (typeof name == 'function') {
		setter = getter;
		getter = name;
		name = getter.name;
	}

	let listener_method = 'on' + Bound.String.camelize(name) + 'Assignment';

	this.setProperty(name, function assignedGetter() {

		var val;

		if (this.constructor.prototype == this) {
			return;
		}

		val = this.assigned_data[name];

		if (getter) {
			val = getter.call(this, val);
		}

		return val;
	}, function assignedSetter(value) {

		var oldval,
		    newval,
		    replace;

		if (this.constructor.prototype == this) {
			throw new Error('Unable to assign to setter outside of object instance');
		}

		if (setter) {
			newval = setter.call(this, value);

			if (typeof newval == 'undefined') {
				newval = value;
			}
		} else {
			newval = value;
		}

		oldval = this.assigned_data[name];

		if (Blast.isNode && oldval == null && this._hawkejs_renderer) {
			this._hawkejs_renderer.registerElementInstance(this);
		}

		this.assigned_data[name] = newval;

		if (typeof this[listener_method] == 'function') {
			replace = this[listener_method](newval, oldval);

			if (typeof replace !== 'undefined' && !(replace && replace.then)) {
				newval = replace;
				this.assigned_data[name] = replace;
			}
		}

		return newval;
	});
});

/**
 * Add a getter with a query selector
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Element.setStatic(function addElementGetter(name, query) {

	var symbol = Symbol(name);

	this.setProperty(name, function performQuery() {

		if (this[symbol] == null) {
			this[symbol] = this.querySelector(query);
		}

		return this[symbol];
	});
});

/**
 * Add a getter with a query selector for multiple elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Element.setStatic(function addElementsGetter(name, query) {

	var symbol = Symbol(name);

	this.setProperty(name, function performQuery() {

		if (this[symbol] == null) {
			this[symbol] = this.querySelectorAll(query);
		}

		return this[symbol];
	});

});

/**
 * Add a custom template renderer to the given element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Function}   element_class
 */
function addTemplateRenderer(element_class) {
	// Add the method to force rendering the template
	Hawkejs.setCachedMethod(element_class, Hawkejs.RENDER_CONTENT, renderCustomTemplate);
}

/**
 * The custom template render function
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Boolean}   re_render   Is this a render done from outside a normal render?
 */
function renderCustomTemplate(re_render) {

	var template = this.inner_template;

	if (!template) {
		if (this._resolve_me_too) {
			this._resolve_me_too.resolve(false);
		}
		return;
	}

	let that = this,
	    child_nodes,
	    render_vars,
	    renderer = this.hawkejs_renderer,
	    child,
	    vars = {},
	    i;

	if (this.constructor.use_new_renderer_scope) {
		renderer = new Hawkejs.Renderer(this.hawkejs_renderer.hawkejs);
		renderer.root_renderer = this.hawkejs_renderer;
		renderer.scope_id = this.hawkejs_renderer.getId();
	}

	for (i = 0; i < this.children.length; i++) {
		child = this.children[i];

		if (!child.getAttribute) {
			continue;
		}

		if (child.getAttribute('slot')) {
			vars[child.getAttribute('slot')] = child;
		}
	}

	// Set the original child nodes
	child_nodes = Bound.Array.cast(this.childNodes).slice(0);

	// Now remove them from the actual element
	Hawkejs.removeChildren(this);

	return Fn.series(function getRenderVariables(next) {

		if (!that.prepareRenderVariables) {
			return next();
		}

		let result = that.prepareRenderVariables();

		if (result && result.then && typeof result.then == 'function') {
			result.then(function gotVars(result) {
				render_vars = result;
				next();
			}).catch(function gotErr(err) {
				next(err);
			});
		} else {
			render_vars = result;
			next();
		}
	}, function renderTemplate(next) {

		if (!render_vars) {
			render_vars = {};
		}

		render_vars.self = that;
		render_vars.child_nodes = child_nodes;

		renderer.renderTemplate(template, render_vars, String(render_counter++)).done(next);
	}, function assembleBlock(next, template) {

		template.target_block.assemble().done(next);

		// The styles() have to be handled here
		// because not all renders pass handleRendererStyles
		if (Blast.isBrowser) {
			hawkejs.scene.handleRendererStyles(renderer);
		}

	}, function assembledBlock(next, block) {

		var lines = block.lines,
		    slots,
		    slot,
		    name,
		    i;

		// Make sure we get valid elements when rendering in the browser
		if (re_render || Blast.isBrowser) {
			lines = block.toElements();
		}

		// This works fine on the server, because the lines will be normalized later
		for (i = 0; i < lines.length; i++) {
			that.append(lines[i]);
		}

		slots = Hawkejs.getElementsByAttribute(that, 'data-he-slot');

		for (i = 0; i < slots.length; i++) {
			slot = slots[i];
			name = slot.dataset.heSlot;

			if (vars[name]) {
				Hawkejs.replaceChildren(slot, vars[name].childNodes);
			}
		}

		if (typeof that.renderedTemplate == 'function') {
			that.renderedTemplate();
		}

		next();
	}, function resolved(err) {

		let render_time;

		if (Blast.isBrowser) {
			render_time = ~~Blast.performanceNow();
		} else {
			render_time = 1;
		}

		that.setAttribute('he-rendered', render_time);

		if (that._resolve_me_too) {
			that._resolve_me_too.resolve(!err);
		}

	});
}

/**
 * Set the template file used to render the inner HTML
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   path
 */
Element.setStatic(function setTemplateFile(path) {

	this.template_file = path;

	addTemplateRenderer(this);
});

/**
 * Set the stylesheet to use for this element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   path
 */
Element.setStatic(function setStylesheetFile(path) {
	this.setProperty('css_file', path);
});

/**
 * Set the template to use for the content
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   template
 */
Element.setStatic(function setTemplate(template) {

	var hawkejs = new Hawkejs.Hawkejs();

	let compiled = hawkejs.compile({
		template_name : this.name + '_template',
		template      : template,
		cache         : false
	});

	this.compiled_template = compiled;

	addTemplateRenderer(this);
});

/**
 * Set the stylesheet contents to use for this element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.1
 * @version  2.0.1
 *
 * @param    {String}   styles
 */
Element.setStatic(function setStylesheet(styles) {
	this.css_style = styles;
});

/**
 * Add an attribute to the observedAttributes getter
 * (Attribute names in this property will then make a call to
 * attributeChangedCallback on change)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   name   Name of the attribute to observe
 * @param    {Function} fnc    Optional function to call
 */
Element.setStatic(function addObservedAttribute(name, fnc) {

	var attributes = this[observed_attributes];

	if (!attributes) {

		attributes = this[observed_attributes] = {
			attributes : [],
			callbacks  : {}
		};

		this.setStaticProperty(function observedAttributes() {
			return attributes.attributes.slice(0);
		});
	}

	attributes.attributes.push(name);

	if (fnc) {
		if (!attributes.callbacks[name]) {
			attributes.callbacks[name] = [];
		}

		attributes.callbacks[name].push(fnc);
	}
});

/**
 * The view this was made in (if applicable)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Element.setProperty(function hawkejs_view() {
	return this.hawkejs_renderer;
}, function setView(value) {
	return this.hawkejs_renderer = value;
});

/**
 * Remember this is a custom element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Boolean}
 */
Element.setProperty('is_custom_hawkejs_element', true);

/**
 * The view this was made in (if applicable)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 *
 * @type     {Hawkejs.Renderer}
 */
Element.setProperty(function hawkejs_renderer() {

	if (this._hawkejs_renderer) {
		return this._hawkejs_renderer;
	}

	if (Blast.isBrowser) {
		return hawkejs.scene.general_renderer;
	}

}, function setHawkejsRenderer(view) {

	if (!this._hawkejs_renderer && this.css_file && view) {
		// If there is a CSS path set, require it now
		// @TODO: Should be possible in the onHawkejsAssembly method,
		// but that gets fired AFTER the createstyles one, so ...
		// @TODO: Style should just bubble up, no need to use root_renderer
		view.root_renderer.style(this.css_file);
	}

	this._hawkejs_renderer = view;
});

/**
 * A link to useable helpers
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.2
 * @version  2.0.0
 *
 * @type     {Hawkejs.HelperCollection}
 */
Element.setProperty(function hawkejs_helpers() {

	if (this._hawkejs_renderer) {
		return this._hawkejs_renderer.helpers;
	}

	if (Blast.isBrowser) {
		return hawkejs.scene.helpers;
	}
});

/**
 * Real assigned data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.9
 *
 * @type     {Object}
 */
Element.setProperty(function assigned_data() {

	if (this.constructor.prototype == this) {
		return;
	}

	if (this._assigned_data) {
		return this._assigned_data;
	}

	if (this._assigned_data == null) {
		this._assigned_data = {};
	}

	return this._assigned_data;
}, function set_assigned_data(value) {

	if (this.constructor.prototype == this) {
		throw new Error('Unable to assign to setter outside of object instance');
	}

	this._assigned_data = value;
});

/**
 * Get the template to use
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {String}
 */
Element.setProperty(function inner_template() {

	if (this.compiled_template) {
		return this.compiled_template;
	}

	if (this.template_file) {
		return this.template_file;
	}

	return this.constructor.compiled_template || this.constructor.template_file;
}, function setInnerTemplate(value) {

	if (typeof value == 'function') {
		this.compiled_template = value;
	} else if (this.compiled_template) {
		this.compiled_template = null;
	}

	this.template_file = value;
});

if (!Blast.isBrowser) {
	/**
	 * Content
	 *
	 * @author   Jelle De Loecker <jelle@develry.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 *
	 * @type     {Object}
	 */
	Element.prepareProperty('contents', Array);
}

/**
 * Cloning an element needs to be done using `cloneNode`,
 * otherwise the same reference is returned.
 * This dummy function is added so JSON-Dry keeps the wanted link.
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setMethod(function dryClone() {
	return this;
});

/**
 * Dry this object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Element.setMethod(function toDry() {
	return {
		value: {
			hawkejs_id: this.hawkejs_id,
			assigned_data: this.assigned_data
		}
	};
});

/**
 * Get all child elements that are of the given node name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name   The name of the node type (or null for all)
 */
Element.setMethod(function getElementsByNodeName(name) {

	var result = [],
	    upper_node,
	    entry,
	    i;

	if (name) {
		upper_node = name.toUpperCase();
	}

	for (i = 0; i < this.childNodes.length; i++) {
		entry = this.childNodes[i];

		if (entry && entry.nodeName) {

			if (!name || entry.nodeName == upper_node) {
				result.push(entry);
			}

			// Do recursive search
			result = result.concat(getElementsByNodeName.call(entry, name));
		}
	}

	return result;
});

/**
 * Set an attribute without triggering a setter
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   attribute_name
 * @param    {String}   value
 */
Element.setMethod(function setAttributeSilent(attribute_name, value) {

	// Remember this value so the setter isn't called again later
	// in the `attributeChangedCallback`
	var new_values = getPrivate(this).new_values;

	new_values[attribute_name] = value;

	// Set the attribute on the element
	this.setAttribute(attribute_name, value);
});

/**
 * Grab (get or create) child element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.2
 */
Element.setMethod(function grab(node_name, class_name) {

	var list = Element.prototype.getElementsByNodeName.call(this, node_name),
	    element,
	    entry,
	    i;

	if (list.length) {
		if (class_name) {
			for (i = 0; i < list.length; i++) {
				entry = list[i];

				if (entry.classList.contains(class_name)) {
					element = entry;
					break;
				}
			}
		} else {
			// If no class name is given, use the first entry
			element = list[0];
		}
	}

	if (!element) {
		// No items with this name were found, so create one
		element = Hawkejs.Hawkejs.createElement(node_name);

		// Add the new child
		this.appendChild(element);

		// If a class name was wanted, set that too
		if (class_name) {
			element.classList.add(class_name);
		}
	}

	return element;
});

/**
 * This method will be called when the element is used in a block assemble
 * (Or on a getTextContent or getElementContent call)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Element.setMethod(function onHawkejsAssemble(renderer) {

	if (typeof this.retained == 'function') {
		this.retained();
	}

	if (typeof this.constructor.css_style != 'undefined') {
		renderer.style(this.tagName, {
			inline : true,
			source : this.constructor.css_style
		});
	}

});

/**
 * If the current element has no `Hawkejs.RESULT` symbol set,
 * this method is executed when getting the HTML
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Renderer}   renderer
 */
Element.setMethod(function toHawkejsString(renderer) {

	if (this.hawkejs_id) {
		this.dataset.hid = this.hawkejs_id;

		// Don't stringify the element now, only to recreate it later
		// (possibly breaking any other references)
		// Instead: put a placeholder that'll insert this element
		// as soon as it is inserted in the DOM
		if (Blast.isBrowser) {
			browser_store[this.hawkejs_id] = this;

			return '<he-element-placeholder data-hid="' + this.hawkejs_id + '"></he-element-placeholder>';
		}
	}

	return this.outerHTML;
});

/**
 * Set the hawkejs identifier
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.8
 *
 * @param    {String}   id
 */
Element.setMethod(function setIdentifier(id) {
	this.hawkejs_id = id;
	this.dataset.hid = id;

	if (Blast.isBrowser) {
		browser_store[id] = this;
	}
});

/**
 * Fire binding callbacks
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name   The name of the binding that was updated
 */
Element.setMethod(function updateBindings(name) {

	var value,
	    list,
	    i;

	if (!this.constructor._monitors) return;

	list = this.constructor._monitors[name];

	if (!list || !list.length) {
		return;
	}

	value = this.assigned_data[name];

	for (i = 0; i < list.length; i++) {
		list[i].call(this, value);
	}
});

/**
 * Attach an object to this element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name      The name of the attribute
 * @param    {Object}   data
 */
Element.setMethod(function assignData(name, data) {

	if (arguments.length == 1) {
		return this.assigned_data[name];
	}

	this.assigned_data[name] = data;

	this.updateBindings(name);
});

/**
 * Emit an event
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.2
 * @version  1.3.1
 *
 * @param    {String}   name
 * @param    {Object}   options
 */
Element.setMethod(function emit(name, options) {

	var event;

	// Ignore events on server
	if (Blast.isNode) {
		return;
	}

	if (!options) {
		options = {};
	}

	event = new CustomEvent(name, options);
	this.dispatchEvent(event);
});

/**
 * Append an element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.2
 *
 * @param    {HTMLElement}   element
 */
Element.setMethod(function appendChild(element) {
	return appendChild.super.call(this, element);
});

/**
 * attachedCallback was renamed to connectedCallback
 * in the web component spec
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.2
 * @version  1.1.2
 */
Element.setMethod(function attachedCallback() {
	return this.connectedCallback();
});

/**
 * Callback when attached to the DOM
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.2
 * @version  2.0.0
 */
Element.setMethod(function connectedCallback() {

	var has_introduced = typeof this.introduced == 'function',
	    has_template = !!this.inner_template,
	    that = this,
	    data;

	if (typeof this[Hawkejs.CREATED_MANUALLY] == 'undefined') {

		if (document.readyState == 'loading' || this.hasAttribute('he-rendered')) {
			// It's not created manually, it comes from the server
			this[Hawkejs.CREATED_MANUALLY] = false;
		} else {
			// It's probably made manually, since elements made
			// during a render have this set to false
			this[Hawkejs.CREATED_MANUALLY] = true;
		}
	}

	if (has_introduced || has_template) {

		// Delay by a little bit so all the other custom elements
		// can get registered in time
		Element.sceneReady(function whenReady() {

			var data = getPrivate(that);

			// The introduced function should only be called once!
			if (data.has_been_introduced) {
				return;
			}

			if (has_template && that[Hawkejs.CREATED_MANUALLY]) {

				let rendering = that[Hawkejs.RENDER_CONTENT]();

				if (!that.hasAttribute('he-rendered')) {
					let render_time = 1;

					if (Blast.isBrowser) {
						render_time = ~~Blast.performanceNow();
					}

					that.setAttribute('he-rendered', render_time);
				}

				data.has_been_introduced = true;

				if (has_introduced && rendering && rendering.then) {
					Classes.Pledge.done(rendering, function done() {
						that.introduced();
					});
				}
			} else {
				data.has_been_introduced = true;

				if (has_introduced) {
					that.introduced();
				}
			}
		});
	}

	if (typeof this.reconnected == 'function') {
		data = getPrivate(that);

		if (data.has_been_introduced) {
			this.reconnected();
		}
	}

	if (typeof this.connected == 'function') {
		// Delay by a little bit so all the other custom elements
		// can get registered in time
		Element.sceneReady(function whenReady() {
			that.connected();
		});
	}
});

/**
 * Callback when removed from the DOM
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 */
Element.setMethod(function disconnectedCallback() {
	if (typeof this.disconnected == 'function') {
		this.disconnected();
	}
});

/**
 * Listen to changing attributes
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  2.0.0
 *
 * @param    {String}   name      The name of the attribute
 * @param    {String}   prev      The previous value
 * @param    {String}   val       The new value
 * @param    {Boolean}  created   If this attribute was set on creation
 */
Element.setMethod(function attributeChangedCallback(name, prev, val, created) {

	var prop_val,
	    changed,
	    config,
	    map;

	// If the attribute is configured, add it as a property too
	if (this.constructor._attributes && this.constructor._attributes[name]) {
		config = this.constructor._attributes[name];
	} else if (!this.constructor[observed_attributes] || !this.constructor[observed_attributes].callbacks[name]) {
		return;
	}

	// Get the private instance variable
	map = getPrivate(this);

	// Store the new attribute value
	map.values[name] = val;

	// Normalize the attribute string
	if (config) {
		if (config.boolean) {
			if (val === 'false') {
				val = false;
			} else if (val === 'null') {
				val = null;
			} else {
				val = true;
			}
		} else if (config.number) {
			val = Number(val);
		}
	}

	// If there is a setter, call it now
	if (config == null || config.setter) {
		if (map.new_values[name] !== val) {
			changed = true;

			// Is there an explicit setter?
			if (config && config.setter) {
				prop_val = config.setter.call(this, val);
			}
		}

		map.new_values[name] = undefined;
	}

	if (this.constructor[observed_attributes] && this.constructor[observed_attributes].callbacks[name]) {
		if (changed) {
			let i;

			for (i = 0; i < this.constructor[observed_attributes].callbacks[name].length; i++) {
				this.constructor[observed_attributes].callbacks[name][i].call(this, val);
			}
		}

		// If there is no setter, remember this new value
		if (!config) {
			map.new_values[name] = val;
		}
	}

	if (config) {

		// We need a prop val, and it should not be undefined
		// If there was no setter, or if there was a setter but it
		// returned nothing, we use the input val
		if (typeof prop_val === 'undefined') {
			prop_val = val;
		}

		// Store the property representation of this value
		map.prop_values[name] = prop_val;
	}
});

/**
 * Create an element
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Element.setMethod(function createElement(name) {

	if (this.hawkejs_view) {
		return this.hawkejs_view.create_element(name);
	}

	return Hawkejs.Hawkejs.createElement(name);
});

/**
 * Claim the content up until the current render point
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {Boolean}   only_if_empty
 */
Element.setMethod(function _claimSiblings(only_if_empty) {
	return Hawkejs.claimSiblings(this, only_if_empty);
});

/**
 * Re-render this element if possible
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Element.setMethod(function rerender() {

	if (!this.constructor.template_file && !this.constructor.compiled_template) {
		return;
	}

	let pledge = renderCustomTemplate.call(this, true);

	return pledge;
});