const Main = Hawkejs.Hawkejs,
      template_cache = new Map(),
      pledges = {};

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
 * @version  2.2.10
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

		pledges[key] = Blast.fetch(url);
		pledges[key].done((err, result) => {
			if (!err) {
				template_cache.set(key, result);
				pledges[key] = null;
			}
		});
	}

	pledges[key].done(callback);
});

/**
 * Actually initialize hawkejs on the client
 * 
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.0.0
 * @version  2.2.21
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
});