const PARENT = Symbol('parent'),
      RENDERER = Symbol('renderer'),
      TRAPLESS = Symbol('trapless'),
      PROXY = Symbol('proxy'),
      VALUES = Symbol('values'),
      GETTERS = Symbol('getters');

/**
 * This way we can skip transforming ejs `my_value = 1`
 * into complicated calls.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
const TRAPS = {
	get(target, name) {

		if (typeof name == 'symbol') {
			return target[name];
		}

		if (target[VALUES].has(name)) {
			return target[VALUES].get(name);
		}

		if (target[GETTERS] && target[GETTERS].has(name)) {
			return target[GETTERS].get(name)();
		}

		if (target[PARENT] && target[PARENT].has(name)) {
			return target[PARENT].get(name);
		}

		return target[name];
	},
	set(target, name, value) {

		if (typeof name == 'symbol') {
			target[name] = value;
		} else {
			target.setFromTemplate(name, value);
		}

		return true;
	}
};

/**
 * Simple class to use for storing variables
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Variables = Fn.inherits('Hawkejs.Base', function Variables(renderer, variables) {
	this[PARENT] = null;
	this[RENDERER] = renderer;
	this[TRAPLESS] = this;

	if (variables && typeof variables == 'object') {
		if (variables instanceof Map) {
			this[VALUES] = new Map(variables);
		} else if (variables instanceof Variables) {
			this[VALUES] = new Map(variables[TRAPLESS][VALUES]);
			this[PARENT] = variables;
		} else {
			this[VALUES] = new Map();

			for (let key in variables) {
				this.setShouldTransform(key, variables[key]);
			}
		}
	} else {
		this[VALUES] = new Map();
	}
});

/**
 * Make sure the result is a valid Variables instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.3.16
 *
 * @param    {Mixed}      value
 * @param    {Renderer}   renderer
 *
 * @return   {Hawkejs.Variables}
 */
Variables.setStatic(function cast(value, renderer) {

	if (!renderer) {
		throw new Error('Unable to cast to Variables without renderer instance');
	}

	if (!value || typeof value != 'object') {
		return new Variables(renderer);
	}

	if (value instanceof Variables) {
		return value;
	}

	return new Variables(renderer, value);
});

/**
 * Get the amount of variables in this instance.
 * This ignores the parent's variables.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.13
 * @version  2.2.13
 */
Variables.setProperty(function length() {
	return this[VALUES].size;
});

/**
 * Get the proxy of this instance.
 * This allows us to set variables without having to use the `set` method.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function getProxy() {

	if (this[PROXY] == null) {
		this[PROXY] = new Proxy(this, TRAPS);
		this[PROXY][TRAPLESS] = this;
	}

	return this[PROXY];
});

/**
 * Is the given key available?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   key
 *
 * @return   {boolean}
 */
Variables.setMethod(function has(key) {

	if (this[VALUES].has(key)) {
		return true;
	}

	if (this[GETTERS] && this[GETTERS].has(key)) {
		return true;
	}

	if (this[PARENT]) {
		return this[PARENT].has(key);
	}

	return false;
});

/**
 * Get a specific variable
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function get(key) {

	if (this[VALUES].has(key)) {
		return this[VALUES].get(key);
	}

	if (this[GETTERS] && this[GETTERS].has(key)) {
		return this[GETTERS].get(key)();
	}

	if (this[PARENT]) {
		return this[PARENT].get(key);
	}
});

/**
 * Set a getter.
 * These are functions that will be called when the value is requested.
 * These values will not survive a clone.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   key
 * @param    {Function} getter
 */
Variables.setMethod(function setEphemeralGetter(key, getter) {
	
	if (!this[GETTERS]) {
		this[GETTERS] = new Map();
	}

	this[GETTERS].set(key, getter);
});

/**
 * Set a variable by name.
 * The variable will be stored as is.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function setRaw(key, value) {
	this[VALUES].set(key, value);
	return value;
});

/**
 * Set a variable by name.
 * The variable will be stored as is.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   key
 * @param    {*}        value
 */
Variables.setMethod(function set(key, value) {
	return this.setRaw(key, value);
});

/**
 * Set a variable by name.
 * The variable will be converted to the proper hawkejs representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 *
 * @param    {string}   key
 * @param    {*}        value
 */
Variables.setMethod(function setShouldTransform(key, value) {

	if (!value || typeof value != 'object') {
		return this.setRaw(key, value);
	}

	const renderer = this[RENDERER],
	      weakmap = renderer.weakmap_for_cloning;

	let cloned = Bound.JSON.clone(value, 'toHawkejs', [renderer], weakmap);

	return this.setRaw(key, cloned);
});

/**
 * Set a specific variable from a template
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.4.0
 * @version  2.4.0
 */
Variables.setMethod(function setFromTemplate(key, value) {
	return this.setRaw(key, value);
});

/**
 * Get this instance's own key-values
 * (Skipping symbols)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function getOwnDict() {
	return Object.fromEntries(this[VALUES]);
});

/**
 * Does this have a valid clone?
 * A clone would become invalid if the parent is changed.
 * Currently we only check key length to check this.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.2.13
 * @version  2.3.16
 *
 * @param    {symbol}   clone_name
 */
Variables.setMethod(function getExistingCloneIfValid(clone_name) {

	if (!Object.hasOwn(this, clone_name)) {
		return;
	}

	let result = this[clone_name];

	if (!result) {
		return;
	}

	if (result.length == this.length) {
		return result;
	}
});

/**
 * Clone the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Hawkejs.Variables}
 */
Variables.setMethod(function toHawkejs(wm) {

	let result = new Variables(this[RENDERER]);

	if (!wm) {
		wm = new WeakMap();
	}

	// Other values might reference this document too,
	// make sure it doesn't clone the same document twice
	wm.set(this, result);

	// Get all the values, of this and all its parents
	let dict = this.toJSON();

	// Clone them
	dict = Bound.JSON.clone(dict, 'toHawkejs', wm);

	// Put the cloned values back into the result
	result[VALUES] = new Map(Object.entries(dict))

	return result;
});

/**
 * Get a shallow clone: create a new object with the same keys,
 * and the same primitive values.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.7
 * @version  2.4.0
 */
Variables.setMethod(function getShallowClone() {
	let result = new Variables(this[RENDERER], new Map(Object.entries(this.toJSON())));
	return result;
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function toJSON() {

	let result = this.getOwnDict();

	if (this[PARENT]) {
		result = {...this[PARENT].toJSON(), ...result};
	}

	return result;
});

/**
 * Create a new shim
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function createShim(new_variables) {
	let result = new Variables(this[RENDERER], new_variables);
	result[PARENT] = this[TRAPLESS];
	return result;
});

/**
 * Overlay the given new_variables over these ones
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.4.0
 */
Variables.setMethod(function overlay(new_variables) {
	return this.createShim(new_variables);
});