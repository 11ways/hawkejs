const Main = Hawkejs.Hawkejs,
      template_cache = new Map(),
      pledges = {};

let can_query_body = false,
    already_loaded = false;

/**
 * Return a pledge that waits for all this renderer's scripts to have loaded
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 *
 * @return   {Pledge}
 */
Hawkejs.Renderer.setMethod(function waitForScripts() {

	if (!this._wait_for_scripts) {
		this._wait_for_scripts = this.hawkejs.require(this.scripts);
	}

	return this._wait_for_scripts;
});

/**
 * Basic 'require' for JS files
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Array}    names
 * @param    {Function} callback
 *
 * @return   {Pledge}
 */
Main.setMethod(function require(names, callback) {

	if (!this.scene) {
		return Classes.Pledge.reject(new Error('Scene is not ready'));
	}

	let pledge = this.scene.getScript(names);

	pledge.done(callback);

	return pledge;
});


/**
 * Get the source of a template
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.3
 * @version  2.3.15
 *
 * @param    {Array}      names
 * @param    {Function}   callback
 */
Main.setMethod(function getFirstAvailableInternalSource(names, callback) {

	let key = Bound.Object.checksum(names);

	if (template_cache.has(key)) {
		return callback(null, template_cache.get(key));
	}

	if (!pledges[key]) {
		let url = Classes.RURL.parse('/hawkejs/templates');
		url.param('name', names);

		if (this.app_version) {
			url.param('v', this.app_version);
		}

		let swift = pledges[key] = new Classes.Pledge.Swift();

		Blast.fetch(url).done((err, result) => {
			if (!err) {
				template_cache.set(key, result);
				pledges[key] = null;
				swift.resolve(result);
			} else {
				swift.reject(err)
			}
		});
	}

	pledges[key].done(callback);
});

/**
 * Can we query the document already?
 * (Sometimes the document can already be queried while the readyState is "loading")
 * 
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 *
 * @return   {Boolean}
 */
Hawkejs.canQueryBody = function canQueryBody() {

	if (!can_query_body) {
		try {
			can_query_body = document.readyState == 'interactive' || document.readyState == 'complete' || document.querySelectorAll('body he-bottom').length > 0;
		} catch (err) {
			// Ignore
		}
	}

	return can_query_body;
};

/**
 * Actually load hawkejs
 * 
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.22
 * @version  2.2.22
 */
Hawkejs.loadHawkejs = function loadHawkejs(force) {

	if (already_loaded) {
		return;
	}

	if (!force && !Hawkejs.canQueryBody()) {
		document.addEventListener('DOMContentLoaded', () => Hawkejs.loadHawkejs());
		return;
	}

	let instance = window.hawkejs,
	    data = window._initHawkejs;

	already_loaded = true;

	// Emit the hawkejs_init event:   hawkejs,  variables,  settings,   renderer
	Blast.emit('hawkejs_initing',     instance, data[0],    data[1],    data[2]);

	try {
		window._initHawkejs = Bound.JSON.undry(data);
	} catch (err) {
		Hawkejs.logError('Failed to initialize hawkejs, data undry error:', err);
		return false;
	}

	instance.loadSettings(window._initHawkejs[1]);

	instance.registerServerRender(window._initHawkejs[2]);

	Blast.emit('hawkejs_init', instance, window._initHawkejs[0], window._initHawkejs[1], window._initHawkejs[2]);
};

/**
 * Actually initialize hawkejs on the client
 * 
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.22
 */
Blast.afterOnce('requiring', function doHawkejsInit() {

	var instance = new Hawkejs(),
	    data = window._initHawkejs;

	window.hawkejs = instance;

	if (!data) {
		return Hawkejs.logWarn('No hawkejs data was found, unable to create scene');
	}

	// Trick protoblast into executing the functions waiting for the loaded event
	try {
		Blast.doLoaded();
	} catch (err) {
		Hawkejs.logWarn('Error during loading of Protoblast:', err);
	}

	Hawkejs.loadHawkejs(false);
});