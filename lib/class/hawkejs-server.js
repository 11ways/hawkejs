module.exports = function(Hawkejs) {

	var async = require('async'),
	    path  = require('path'),
	    fs    = require('fs');

	/**
	 * Register a view directory
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    dirpath
	 * @param    {Number}    weight
	 */
	Hawkejs.prototype.addViewDirectory = function addViewDirectory(dirpath, weight) {

		if (typeof weight !== 'number') {
			weight = 10;
		}

		if (!this.directories) {
			this.directories = new Hawkejs.Blast.Classes.Deck();
		}

		this.directories.push(dirpath, weight);
	};

	/**
	 * Get the preferred path of a certain template
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     templateName
	 * @param    {Number}    weight
	 */
	Hawkejs.prototype.getTemplatePath = function getTemplatePath(templateName, callback) {

		var foundPath,
		    iter;

		// Make sure the template path ends with .ejs
		templateName = this.Utils.String.postfix(templateName, '.ejs');

		if (!this.templatePathCache) {
			this.templatePathCache = {};
		}

		if (this.templatePathCache[templateName]) {
			return setImmediate(callback.bind(this, null, this.templatePathCache[templateName]));
		}

		iter = this.directories.createIterator();

		async.until(function test() {
			return !iter.hasNext() || foundPath;
		}, function fn(next) {

			// Get the next item
			var checkPath,
			    basePath = iter.next().value;

			// Construct the path to check
			checkPath = path.resolve(basePath, templateName);

			fs.exists(checkPath, function(exists) {

				if (exists) {
					foundPath = checkPath;
				}

				next();
			});

		}, function done(err) {
			callback(err, foundPath);
		});
	};

	/**
	 * Get the source of a template
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}     templateName
	 * @param    {Function}   callback
	 */
	Hawkejs.prototype.getSource = function getSource(templateName, callback) {

		if (!this.templateSourceCache) {
			this.templateSourceCache = {};
		}

		if (this.templateSourceCache[templateName]) {
			return setImmediate(callback.bind(this, null, this.templateSourceCache[templateName]));
		}

		this.getTemplatePath(templateName, function(err, templatePath) {

			if (err) {
				return callback(err);
			} else if (!templatePath) {
				return callback(new Error('Template path not found'));
			}

			fs.readFile(templatePath, {encoding: 'utf8'}, callback);
		});
	};

	/**
	 * Let Hawkejs handle the view lookup logic in Express
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.prototype.configureExpress = function configureExpress(app, express) {

		var that = this;

		// Enable caching
		app.set('view cache', true);

		app.set('view', function ViewFileWrapper(name) {return new ViewFile(that, name)});
	};

	/**
	 * ViewFile class, for express
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	function ViewFile(hawkejs, name) {

		// The hawkejs parent
		this.hawkejs = hawkejs;

		// Store the name of this view
		this.name = name;

		// Set the name as the path, let hawkejs do the rest
		this.path = name;
	};

	/**
	 * The render function express will call
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	ViewFile.prototype.render = function render(options, fn) {
		return this.hawkejs.render(this.name, options, fn);
	};

};