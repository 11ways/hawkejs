const HAWKEJS = Symbol('hawkejs');

/**
 * The Base class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
const Base = Fn.inherits('Informer', 'Hawkejs', function Base() {});

/**
 * Add a method that can be used without `this` in the template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}     key
 * @param    {Function}   method
 *
 * @return   {Function}
 */
Base.setStatic(function setCommand(key, method) {
	var fnc = this.setMethod(key, method);
	fnc.is_command = true;
	return fnc;
});

/**
 * Set a property that can be accessed as a local variable
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}     key
 * @param    {Function}   getter
 * @param    {Function}   setter
 */
Base.setStatic(function setLocalProperty(key, getter, setter) {

	if (!this.local_properties) {
		this.local_properties = {};
	}

	if (typeof key == 'function') {
		setter = getter;
		getter = key;
		key = getter.name;
	}

	this.local_properties[key] = true;

	this.setProperty(key, getter, setter);
});

/**
 * Set a deprecated property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @param    {String}   old_key
 * @param    {String}   new_key
 */
Base.setStatic(function setDeprecatedProperty(old_key, new_key) {
	this.setProperty(old_key, function getter() {
		return this[new_key];
	}, function setter(val) {
		return this[new_key] = val;
	});
});

/**
 * Find a reference to the current hawkejs instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @type     {Hawkejs.Hawkejs}
 */
Base.setProperty(function hawkejs() {

	if (this[HAWKEJS]) {
		return this[HAWKEJS];
	}

	if (this.renderer && this.renderer.hawkejs) {
		return this.renderer.hawkejs;
	}

	if (Blast.isBrowser && typeof hawkejs != 'undefined') {
		return hawkejs;
	}

	return null;
}, function setHawkejs(value) {
	return this[HAWKEJS] = value;
});

// Some Symbols
Hawkejs.CREATED_MANUALLY = Symbol('created_manually');
Hawkejs.RENDER_CONTENT = Symbol('render_hawkejs_content');
Hawkejs.PRE_ASSEMBLE = Symbol('pre_assemble');
Hawkejs.SERIALIZING = Symbol('serializing');
Hawkejs.PRE_TASKS = Symbol('pre_tasks');
Hawkejs.PRE_CLONE = Symbol('pre_clone');
Hawkejs.RESULT = Symbol('result');