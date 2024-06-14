const addToNs = Blast.createStaticDefiner(Hawkejs, true);
const HAWKEJS = Symbol('hawkejs');
const GLOBALS = Symbol('globals');

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
FN_NEXT_IMMEDIATE[Blast.flowPledgeClass] = Classes.Pledge.Swift;

const FN_SYNC = Object.create(Fn);
FN_SYNC[Blast.asyncScheduler] = Blast.callNow;
FN_SYNC[Blast.flowPledgeClass] = Classes.Pledge.Swift;

/**
 * Split the input into keys & vlaues
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.19
 * @version  2.3.19
 *
 * @param    {*}   input
 *
 * @return   {Object}
 */
addToNs(function splitIntoKeysAndValues(input) {

	let keys = [],
	    values = [];

	if (!input) {
		return {keys, values, length: 0};
	}

	let key,
	    val;

	if (input instanceof Map) {
		for (let [key, val] of input) {
			keys.push(key);
			values.push(val);
		}
	} else if (input instanceof Set) {
		let i = -1;

		for (val of input) {
			i++;
			keys.push(i);
			values.push(val);
		}
	} else if (Array.isArray(input)) {
		for (key = 0; key < input.length; key++) {
			keys.push(key);
			values.push(input[key]);
		}
	} else if (input instanceof Classes.Deck) {
		let items = input.getSortedItems(false),
		    entry;

		for (entry of items) {
			keys.push(entry.key);
			values.push(entry.value);
		}
	} else if (typeof input[Symbol.iterator] == 'function') {
		let i = -1;

		for (val of input) {
			i++;
			keys.push(i);
			values.push(val);
		}
	} else {
		for (key in input) {
			keys.push(key);
			values.push(input[key]);
		}
	}

	return {keys, values, length: keys.length};
});

/**
 * Tokenize Hawkejs code
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.3.3
 * @version  2.3.3
 *
 * @param    {String}   source
 * @param    {Object}   config
 *
 * @return   {Array}
 */
addToNs(function tokenize(source, config) {

	let safe_print = config?.wrap_method === 'printSafe',
	    entry,
	    prev,
	    next;

	source = Fn.tokenize(source, true);

	let parser = new Hawkejs.Parser.Token(source);

	do {
		prev = entry;
		entry = parser.current;
		next = parser.next();

		// Make sure the keyword is actually a keyword in this context
		if (entry.type == 'keyword') {
			if (entry.value == 'false' || entry.value == 'true') {
				continue;
			}

			// Certain keywords are valid variable names, like when doing `class="name"`
			if (next && next.type == 'punct') {
				entry.type = 'name';
			} else if (prev) {

				if (prev) {
					if (prev.type == 'punct') {
						entry.type = 'name';
					} else if (prev.value == 'set' && next && next.value == 'to') {
						entry.type = 'name';
					}
				}

			} else if (!prev && safe_print) {
				// This allows for something like `{{ class }}`
				entry.type = 'name';
			}
		}
	} while (!parser.is_eof)

	return source;
});

/**
 * A Function namespace with the grouped immediate scheduler
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.15
 * @version  2.3.15
 */
addToNs('FN_NEXT_IMMEDIATE', FN_NEXT_IMMEDIATE);

/**
 * A Function namespace with the sync scheduler
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.15
 * @version  2.3.15
 */
addToNs('FN_SYNC', FN_SYNC);

/**
 * Perform actions in series
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.10
 * @version  2.2.15
 */
addToNs(function series(...args) {

	let type = typeof args[0];

	// Implicitly set the `force_async` option
	if (type != 'boolean') {
		args.unshift(false);
	}

	return FN_NEXT_IMMEDIATE.series(...args);
});

/**
 * Perform actions in parallel
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.10
 * @version  2.3.15
 */
addToNs(function parallel(...args) {

	let type = typeof args[0];

	// Implicitly set the `force_async` option
	// (To true for now)
	if (type != 'boolean') {
		args.unshift(true);
	}

	type = typeof args[1];

	if (type != 'number') {
		args.splice(1, 0, Hawkejs.Hawkejs.prototype.parallel_task_limit);
	}

	return FN_NEXT_IMMEDIATE.parallel(...args);
});

/**
 * Extract a result from an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.18
 * @version  2.3.18
 */
addToNs(function extractResult(input) {

	if (!input) {
		return;
	}

	let result = input[Hawkejs.RESULT];

	if (result) {
		let seen = new Set(),
		    temp;

		do {

			if (seen.has(result)) {
				break;
			} else {
				seen.add(result);
			}

			if (typeof result == 'function') {
				result = result();
				continue;
			}

			temp = result[Hawkejs.RESULT];

			if (temp) {
				result = temp;
			} else {
				break;
			}
		} while (true);
	}

	return result;
});

/**
 * Create a map for Hawkejs specific "globals"
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.18
 * @version  2.3.18
 */
addToNs(GLOBALS, new Map());

/**
 * Set a global variable for use inside the templates
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.18
 * @version  2.3.18
 */
addToNs(function setGlobal(name, value) {
	this[GLOBALS].set(name, value);
});

/**
 * Does this global exist?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.18
 * @version  2.3.18
 */
addToNs(function hasGlobal(name) {
	return this[GLOBALS].has(name);
});

/**
 * Get a global variable for use inside the templates
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.3.18
 * @version  2.3.18
 */
addToNs(function getGlobal(name) {
	return this[GLOBALS].get(name);
});

/**
 * Log an error
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
addToNs(function logError(...args) {
	return logLog('error', args);
});

/**
 * Log a warning
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
addToNs(function logWarn(...args) {
	return logLog('warn', args);
});

/**
 * Log a normal message
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.21
 * @version  2.2.21
 */
addToNs(function logMessage(...args) {
	return logLog('warn', args);
});

/**
 * Log a timestamp
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
addToNs(function logTimestamp(name) {
	Hawkejs.logTimeStart(name);
	Hawkejs.logTimeEnd(name);
});

/**
 * Start a time log
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
addToNs(function logTimeStart(name) {
	Blast.Globals['console'].time(name);
});

/**
 * End a time log
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
addToNs(function logTimeEnd(name) {
	Blast.Globals['console'].timeEnd(name);
});

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
Hawkejs.RENDER_INSTRUCTION = Symbol('render_instruction');
Hawkejs.DELAY_SYNC_RENDER = Symbol('delay_sync_render');
Hawkejs.CREATED_MANUALLY = Symbol('created_manually');
Hawkejs.REACTIVE_VALUES = Symbol('reactive_values');
Hawkejs.APPLIED_OPTIONS = Symbol('applied_options');
Hawkejs.EVENT_HANDLERS = Symbol('event_handlers');
Hawkejs.RENDER_CONTENT = Symbol('render_hawkejs_content');
Hawkejs.SERIALIZE_FORM = Symbol('serialize_form');
Hawkejs.GET_FORM_DATA = Symbol('get_form_data');
Hawkejs.STATE_VALUES = Symbol('state_values');
Hawkejs.CONSTRUCTED = Symbol('constructed');
Hawkejs.SERIALIZING = Symbol('serializing');
Hawkejs.VARIABLES = Symbol('variables');
Hawkejs.PRE_TASKS = Symbol('pre_tasks');
Hawkejs.RC_CACHE = Symbol('rc_cache');
Hawkejs.RESULT = Symbol('result');
Hawkejs.BLOCK = Symbol('block');
Hawkejs.RENDER_TASKS = Symbol('render_tasks');
Hawkejs.DIRTY_INFO = Symbol('dirty_info');