window.hawkejs = (function(){

	var ClientSide = true,
	    Hawkejs,
	    clientFiles,
	    instance;

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
		require(name)(Hawkejs);
	});

	instance = new Hawkejs();

	return instance;
}());