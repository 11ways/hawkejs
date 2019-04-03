const Main = Hawkejs.Hawkejs,
      pledges = {};

/**
 * Get the closest element (up the dom tree)
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Main.setStatic(function closest(element, query) {

	var cur = element;

	for (; cur && cur !== document; cur = cur.parentNode) {
		if (cur.matches(query)) {
			return cur;
		}
	}
});

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
 * @version  2.0.0
 *
 * @param    {Array}      names
 * @param    {Function}   callback
 */
Main.setMethod(function getFirstAvailableInternalSource(names, callback) {

	var url;

	// Filter out duplicates
	Bound.Array.unique(names);

	url = Classes.RURL.parse('/hawkejs/templates');
	url.param('name', names);

	if (this.app_version) {
		url.param('v', this.app_version);
	}

	url = String(url);

	if (!pledges[url]) {
		pledges[url] = Blast.fetch(url);
	}

	pledges[url].done(callback);
});

/**
 * Actually initialize hawkejs on the client
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    2.0.0
 * @version  2.0.0
 */
Blast.afterOnce('requiring', function doHawkejsInit() {

	var instance = new Hawkejs(),
	    data = window._initHawkejs;

	window.hawkejs = instance;

	if (!data) {
		return console.warn('No hawkejs data was found, unable to create scene');
	}

	// Trick protoblast into executing the functions waiting for the loaded event
	Blast.doLoaded();

	// Emit the hawkejs_init event:   hawkejs,  variables,  settings,   renderer
	Blast.emit('hawkejs_initing',     instance, data[0],    data[1],    data[2]);

	try {
		window._initHawkejs = Bound.JSON.undry(data);
	} catch (err) {
		console.error('Failed to initialize hawkejs, data undry error:', err);
		return false;
	}

	instance.loadSettings(window._initHawkejs[1]);

	instance.registerServerRender(window._initHawkejs[2]);

	Blast.emit('hawkejs_init', instance, window._initHawkejs[0], window._initHawkejs[1], window._initHawkejs[2]);
});