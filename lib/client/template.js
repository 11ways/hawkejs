window.hawkejs = (function(){

	var ClientSide = true,
	    clientFiles,
	    blastName,
	    instance,
	    Hawkejs,
	    initObj;

	// Don't execute this script twice, just return the previous value
	if (window.hawkejs) {
		return window.hawkejs;
	}

	// Get the init object
	if (window._initHawkejs) {
		initObj = window._initHawkejs;
	}

	// If protoblast is allowed to modify prototypes,
	// do it before starting hawkejs to reduce load times
	if (initObj[0].global_protoblast) {
		if (typeof initObj[0].global_protoblast === 'string') {
			blastName = initObj[0].global_protoblast;
		} else {
			blastName = 'Blast';
		}
	}

	function require(identifier) {

		if (identifier == 'path' || identifier == 'fs') {
			return {};
		}

		var path = require.resolve(identifier),
		    mod  = require.modules[identifier] || require.modules[path];

		if (!mod) throw new Error('failed to require "' + identifier + '"');

		if (!mod.exports) {
			mod.exports = {};
			mod.call(mod.exports, mod, mod.exports, require.relative(identifier));
		}

		return mod.exports;
	}

	require.modules = {};

	require.resolve = function resolve(path, recursive) {

		var orig = path,
		    reg = path + '.js',
		    index = path + '/index.js',
		    result;

		result = require.modules[reg] && reg
			|| require.modules[index] && index;

		if (!result && !recursive) {
			result = resolve('lib/class/' + orig, true);
		}

		return result || orig;
	};

	require.register = function register(path, fn) {
		require.modules[path] = fn;
	};

	require.relative = function relative(parent) {
		return function(p) {
			if ('.' != p.substr(0, 1)) return require(p);
			
			var path = parent.split('/'),
			    segs = p.split('/');

			path.pop();
			
			for (var i = 0; i < segs.length; i++) {
				var seg = segs[i];
				if ('..' == seg) path.pop();
				else if ('.' != seg) path.push(seg);
			}

			return require(path.join('/'));
		};
	};

	//_REGISTER_//

	Hawkejs = require('hawkejs');

	clientFiles.forEach(function(name) {
		require(name)(Hawkejs, Hawkejs.Blast);
	});

	instance = new Hawkejs();

	// Load the settings
	if (initObj) {

		if (blastName) {
			window[blastName] = __Protoblast;
		}

		window._initHawkejs = Hawkejs.Blast.Collection.JSON.undry(JSON.stringify(initObj));

		instance.loadSettings(window._initHawkejs[1]);
		instance.registerRender(window._initHawkejs[2]);
	}

	return instance;
}());