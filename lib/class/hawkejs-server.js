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
			return process.nextTick(callback.bind(this, null, this.templatePathCache[templateName]));
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
			return process.nextTick(callback.bind(this, null, this.templateSourceCache[templateName]));
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
	 * Export the express render function through this simple closure
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.prototype.createExpressRenderer = function createExpressRenderer() {
		return this.express.bind(this);
	};

	/**
	 * 
	 *
	 * "options" this object from Express will always contain these elements
	 *
	 * - cache          {boolean}
	 * - settings       {object}
	 * -- env                 {string}
	 * -- json spaces         {integer}
	 * -- jsonp callback name {string}
	 * -- view engine         {string}
	 * -- views               {string}  The path to the views
	 * -- x-powered-by        {boolean} If true, express will send this header
	 * 
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}    path
	 * @param    {Object}    options
	 * @param    {Function}  callback
	 */
	Hawkejs.prototype.express = function express(path, options, callback) {

		return this.render(path, options, function(err, html) {
			console.log('Error: ' + err)
			console.log(html)

			callback(err, html)
		});
	};

};