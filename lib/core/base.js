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

const FN_NEXT_IMMEDIATE = Object.create(Fn);
FN_NEXT_IMMEDIATE[Blast.asyncScheduler] = Blast.nextGroupedImmediate;

/**
 * Perform actions in series
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.10
 * @version  2.2.10
 */
Hawkejs.series = function series(...args) {
	return FN_NEXT_IMMEDIATE.series(...args);
};

/**
 * Perform actions in parallel
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.10
 * @version  2.2.10
 */
Hawkejs.parallel = function parallel(...args) {
	return FN_NEXT_IMMEDIATE.parallel(...args);
};

/**
 * Log an error
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
Hawkejs.logError = function logError(...args) {
	return logLog('error', args);
};

/**
 * Log a warning
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
 Hawkejs.logWarn = function logWarn(...args) {
	return logLog('warn', args);
};

/**
 * Log a normal message
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
Hawkejs.logMessage = function logMessage(...args) {
	return logLog('warn', args);
};

/**
 * Log a timestamp
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
Hawkejs.logTimestamp = function logTimestamp(name) {
	Hawkejs.logTimeStart(name);
	Hawkejs.logTimeEnd(name);
};

/**
 * Start a time log
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
Hawkejs.logTimeStart = function logTimeStart(name) {
	Blast.Globals['console'].time(name);
};

/**
 * End a time log
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
Hawkejs.logTimeEnd = function logTimeEnd(name) {
	Blast.Globals['console'].timeEnd(name);
};

/**
 * Log something
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
function logLog(type, args) {
	Blast.Globals['console'][type](...args);
}

// Some Symbols
Hawkejs.DELAY_SYNC_RENDER = Symbol('delay_sync_render');
Hawkejs.CREATED_MANUALLY = Symbol('created_manually');
Hawkejs.RENDER_CONTENT = Symbol('render_hawkejs_content');
Hawkejs.SERIALIZE_FORM = Symbol('serialize_form');
Hawkejs.GET_FORM_DATA = Symbol('get_form_data');
Hawkejs.PRE_ASSEMBLE = Symbol('pre_assemble');
Hawkejs.CONSTRUCTED = Symbol('constructed');
Hawkejs.SERIALIZING = Symbol('serializing');
Hawkejs.VARIABLES = Symbol('variables');
Hawkejs.PRE_TASKS = Symbol('pre_tasks');
Hawkejs.PRE_CLONE = Symbol('pre_clone');
Hawkejs.RC_CACHE = Symbol('rc_cache');
Hawkejs.RESULT = Symbol('result');
Hawkejs.BLOCK = Symbol('block');