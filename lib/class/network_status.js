var online_change_symbol = Symbol('online_change'),
    set_online_symbol = Symbol('set_online'),
    visibility_symbol = Symbol('visibility'),
    save_data_symbol = Symbol('save_data'),
    endpoint_symbol = Symbol('endpoint'),
    online_symbol = Symbol('online'),
    busy_symbol = Symbol('busy'),
    same_symbol = Symbol('same'),
    nav;

if (typeof navigator != 'undefined') {
	nav = navigator;
}

/**
 * NetworkStatus class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
var Status = Blast.Bound.Function.inherits('Informer', 'Hawkejs', function NetworkStatus() {
	this.init();
});

/**
 * Should we save data?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Boolean}
 */
Status.setProperty(function save_data() {

	if (this[save_data_symbol] != null) {
		return this[save_data_symbol];
	}

	if (nav && nav.connection) {
		return nav.connection.saveData;
	}

	return false;
});

/**
 * The round-trip-type in ms
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Number}
 */
Status.setProperty(function rtt() {

	if (nav && nav.connection && nav.connection.rtt != null) {
		return nav.connection.rtt;
	}

	// Generous 50ms
	return 50;
});

/**
 * The estimated downlink in mbit/s
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Number}
 */
Status.setProperty(function downlink() {

	if (nav && nav.connection && nav.connection.downlink != null) {
		return nav.connection.downlink;
	}

	// 10 mbits
	return 10;
});

/**
 * Are we on-line?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Boolean}
 */
Status.setProperty(function online() {
	return !!this[online_symbol];
}, function setOnline(value) {
	return this[set_online_symbol](!!value);
});

/**
 * Are we off-line?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Boolean}
 */
Status.setProperty(function offline() {
	return !this[online_symbol];
}, function setOffline(value) {
	return !this[set_online_symbol](!value);
});

/**
 * Get the duration of the current online status
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.3
 * @version  1.2.3
 *
 * @type     {Number}
 */
Status.setProperty(function online_status_duration() {

	if (!this[online_change_symbol]) {
		return ~~Blast.performanceNow();
	}

	return Date.now() - this[online_change_symbol];
});

/**
 * The website endpoint to check
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {String}
 */
Status.setProperty(function website_endpoint() {

	if (this[endpoint_symbol] != null) {
		return this[endpoint_symbol];
	}

	return '';
}, function setWebsiteEndpoint(value) {
	return this[endpoint_symbol] = value;
});

/**
 * Is the current tab visible?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Boolean}
 */
Status.setProperty(function is_visible() {

	if (this._hidden_property_name && typeof document != 'undefined') {
		return !document[this._hidden_property_name];
	}

	// Default to true
	return true;
});

/**
 * Set the online status
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Boolean}   value
 */
Status.setMethod(set_online_symbol, function setOnline(value) {

	var was_online = this[online_symbol];

	value = !!value;
	this[online_symbol] = value;

	if (value && (!was_online || was_online == null)) {
		this.unsee('offline');
		this.emit('online');
	} else if (!value && (was_online || was_online == null)) {
		this.unsee('online');
		this.emit('offline');
	}

	if (was_online !== value) {
		this[online_change_symbol] = Date.now();
		this[same_symbol] = 0;
	} else {
		this[same_symbol]++;
	}

	return value;
});

/**
 * Initialize the checker
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Status.setMethod(function init() {

	var that = this;

	if (this[same_symbol] != null) {
		return;
	}

	this.initVisibilityChange();

	// Default to true
	this.online = true;

	// Keep count on how many times the current value has been seen
	this[same_symbol] = 0;

	// Check the connection
	that.checkConnection(function done() {

		var timeout;

		if (that.offline) {
			timeout = 2500 + (that[same_symbol] * 2500);

			if (timeout > 60 * 1000) {
				timeout = 60 * 1000;
			}
		} else {
			timeout = 30 * 1000;
		}

		setTimeout(function doCheck() {
			that.checkConnection(done);
		}, timeout);
	});

	if (typeof window == 'undefined' || typeof window.addEventListener == 'undefined') {
		return false;
	}

	window.addEventListener('offline', function onOffline() {
		that.offline = true;
	});

	window.addEventListener('online', function onOnline() {
		that.checkConnection();
	});

	// Check the connection as soon as the tab becomes visible again
	this.on('visible', function onVisible() {
		that.checkConnection();
	});
});

/**
 * Initialize the visibility checker
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Status.setMethod(function initVisibilityChange() {

	var that = this,
	    visibility_change,
	    hidden;

	if (typeof document == 'undefined') {
		return;
	}

	if (document.hidden != null) {
		hidden = 'hidden';
		visibility_change = 'visibilitychange';
	} else if (document.msHidden != null) {
		hidden = 'msHidden';
		visibility_change = 'msvisibilitychange';
	} else if (document.webkitHidden != null) {
		hidden = 'webkitHidden';
		visibility_change = 'webkitvisibilitychange';
	}

	this._hidden_property_name = hidden;
	this._visibility_change_property_name = visibility_change;

	// Do a first visibility check
	this.checkVisibilityChange();

	document.addEventListener(visibility_change, function handleVisibilityChange() {
		that.checkVisibilityChange();
	}, false);
});

/**
 * Check visibility change
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Status.setMethod(function checkVisibilityChange() {

	var old_value = this[visibility_symbol],
	    new_value = this.is_visible;

	if (old_value != new_value) {
		if (new_value) {
			this.unsee('hidden');
			this.emit('visible');
		} else {
			this.unsee('visible');
			this.emit('hidden');
		}

		this[visibility_symbol] = new_value;
	}
});

/**
 * Check the current connection
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Status.setMethod(function checkConnection(callback) {

	var that = this,
	    timeout,
	    pledge = new Pledge(),
	    bomb,
	    url;

	pledge.done(callback);

	// Use browser navigator object to see if it's absolutely off-line
	if (nav && nav.onLine === false) {
		this.online = false;
		pledge.resolve(false);
		return pledge;
	}

	if (this[busy_symbol]) {
		this[busy_symbol].done(callback);
		return this[busy_symbol];
	}

	if (typeof hawkejs != 'undefined' && this.website_endpoint) {
		timeout = this.rtt;

		if (!timeout) {
			timeout = 2500;
		} else if (timeout < 1000) {
			timeout = 1000;
		} else if (timeout > 5000) {
			timeout = 5000;
		}

		this[busy_symbol] = pledge;

		bomb = Blast.Bound.Function.timebomb(timeout, function timeout() {
			that[busy_symbol] = false;
			that.online = false;
			pledge.resolve(false);
		});

		url = this.website_endpoint;

		if (url.indexOf('?') > -1) {
			url += '&';
		} else {
			url += '?';
		}

		url += 'hajax=' + Date.now();

		hawkejs.scene.fetch(url, {head: true}, function done(err, body, xhr) {

			that[busy_symbol] = false;

			if (err && (!xhr.status || xhr.status < 400)) {
				that.online = false;
			} else {
				bomb.defuse();
				that.online = true;
			}

			pledge.resolve(that.online);
		});
	} else {
		this.online = true;
		pledge.resolve(true);
	}

	return pledge;
});