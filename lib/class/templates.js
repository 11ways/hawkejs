module.exports = function hawkTemplates(Hawkejs, Blast) {

	var Templates,
	    Template;

	/**
	 * The Templates class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Object}   options
	 */
	Templates = Blast.Classes.Informer.extend(function Templates(renderer, names, options) {

		var temp,
		    obj,
		    i;

		this.renderer = renderer;
		this.hawkejs = Object.create(renderer.hawkejs);

		// Create the options object
		this.options = options || {};

		if (names instanceof Templates) {
			this.templates = names.templates.slice(0);
		} else {

			if (!Array.isArray(names)) {
				names = [names];
			} else {
				names = Blast.Bound.Array.flatten(names);
			}

			// Create the templates object
			this.templates = new Array(names.length);

			for (i = 0; i < names.length; i++) {
				if (names[i] instanceof Template) {
					this.templates[i] = names[i];
				} else {
					this.templates[i] = new Template(renderer, names[i]);
				}
			}
		}

		if (this.options.diversion) {
			for (i = 0; i < this.templates.length; i += 2) {
				temp = this.templates[i];
				obj = new Template(renderer, temp.name + '_' + this.options.diversion);

				// Include this diverted name BEFORE the original
				Blast.Bound.Array.include(this.templates, i, obj);
			}
		}

		// If the renderer has a theme set, set it on the templates too
		if (renderer.theme) {
			for (i = 0; i < this.templates.length; i++) {
				this.templates[i].setTheme(renderer.theme);
			}
		}

		// Store the active, found template
		this.active = null;
	});

	/**
	 * unDry an object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Object}
	 */
	Templates.setStatic(function unDry(obj) {

		var result,
		    inst;

		if (typeof hawkejs != 'undefined') {
			inst = hawkejs;
		} else {
			inst = {};
		}

		result = Object.create(Templates.prototype, {
			hawkejs: {
				enumerable: false,
				value: inst
			},
			renderer: {
				enumerable: false,
				value: {}
			}
		});

		Blast.Bound.Object.assign(result, obj);

		return result;
	});

	/**
	 * Return an object for json-drying this object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Object}
	 */
	Templates.setMethod(function toDry() {
		return {
			value: {
				templates: this.templates,
				active: this.active,
				options: this.options,
				theme: this.theme
			},
			path: '__Protoblast.Classes.Templates'
		};
	});

	/**
	 * Return a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {String}
	 */
	Templates.setMethod(function toString() {
		if (this.active) {
			return this.active.toString();
		} else if (this.templates[0]) {
			return this.templates[0].toString();
		}

		return this.templates[0];
	});

	/**
	 * Get the template names
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Templates.setMethod(function getNames() {

		var result = '',
		    i;

		for (i = 0; i < this.templates.length; i++) {
			result += this.templates[i].name + ', ';
		}

		return result;
	});

	/**
	 * Set a theme
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Templates.setMethod(function setTheme(name) {

		var i;

		for (i = 0; i < this.templates.length; i++) {
			this.templates[i].setTheme(name);
		}

		this.theme = name;
	});

	/**
	 * Get the first available compiled template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Function}   callback
	 */
	Templates.setMethod(function getCompiled(callback) {

		var that = this,
		    found,
		    iter;

		if (this.active && this.active.fnc) {
			return callback(null, this.active.fnc, this.active);
		}

		iter = new Blast.Classes.Iterator(this.templates);

		Blast.Bound.Function.while(function test() {
			return iter.hasNext() && !found;
		}, function task(next) {
			var template = iter.next().value;

			template.getCompiled(function gotCompiled(err, fnc) {

				if (err != null || !fnc) {
					return next();
				}

				found = template;
				next();
			});
		}, function done(err) {

			if (err != null) {
				return callback(err);
			}

			if (!found) {
				return callback(new Error('Could not find any template file for "' + that.templates.join('" or "') + '"'));
			}

			// Set the active template
			that.active = found;

			callback(null, found.fnc, found);
		});
	});

	/**
	 * The Template class
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 * @param    {Object}   options
	 */
	Template = Blast.Classes.Informer.extend(function Template(renderer, name, options) {

		this.renderer = renderer;
		this.hawkejs = Object.create(renderer.hawkejs);

		// Store the name of this template
		this.name = name;

		// Store the sourcename of this template
		this.sourceName = null;

		this.options = options || {};

		// Set wanted theme to default
		this.theme = 'default';

		// Set the active theme
		this.activeTheme = 'default';

		// Did we find the main element
		this.foundMain = null;

		// The found function
		this.fnc = null;
	});

	/**
	 * unDry an object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Object}
	 */
	Template.setStatic(function unDry(obj) {

		var result,
		    inst;

		if (typeof hawkejs != 'undefined') {
			inst = hawkejs;
		} else {
			inst = {};
		}

		result = Object.create(Template.prototype, {
			hawkejs: {
				enumerable: false,
				value: inst
			},
			renderer: {
				enumerable: false,
				value: {}
			}
		});

		Blast.Bound.Object.assign(result, obj);

		return result;
	});

	/**
	 * Return an object for json-drying this object
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {Object}
	 */
	Template.setMethod(function toDry() {
		return {
			value: {
				name: this.name,
				sourceName: this.sourceName,
				options: this.options,
				theme: this.theme,
				activeTheme: this.activeTheme,
				foundMain: this.foundMain,
				scripts: this.scripts
			},
			path: '__Protoblast.Classes.Template'
		};
	});

	/**
	 * Return a string
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @return   {String}
	 */
	Template.setMethod(function toString() {
		return this.name;
	});

	/**
	 * Set a theme
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Template.setMethod(function setTheme(name) {

		if (this.theme != name) {
			this.foundMain = null;
			this.fnc = null;
		}

		this.theme = name;
	});

	/**
	 * Get the compiled template
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Function}   callback
	 */
	Template.setMethod(function getCompiled(callback) {

		var that = this,
		    files = Blast.Collection.Array.cast(this.name),
		    themeName;

		if (this.theme && this.theme != 'default') {
			themeName = this.theme + '/' + this.name;
			files.unshift(themeName);
		}

		this.hawkejs.getCompiled(files, function gotCompiledFile(err, fnc) {

			if (err != null) {
				return callback(err);
			}

			if (!fnc) {
				return callback(new Error('Error compiling template'));
			}

			if (files[0] == fnc.sourceName) {
				that.foundMain = true;
				that.activeTheme = that.theme;
			}

			that.fnc = fnc;
			that.sourceName = fnc.sourceName;

			return callback(null, fnc, that);
		});
	});

	Hawkejs.Templates = Templates;
	Hawkejs.Template = Template;
};