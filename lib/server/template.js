const libpath  = require('path'),
      Template = Hawkejs.Template,
      fs       = require('fs');

/**
 * Do the extensions that haven't been executed so far,
 * on the server side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.2.10
 *
 * @param    {Object}   variables
 *
 * @return   {Pledge}
 */
Template.setMethod(function doExtensions(variables) {

	var that  = this,
	    tasks = [];

	while (this.extensions.length) {
		let extension = this.extensions.shift(),
		    templates;

		// Expansion paths can be arrays, on the server we always use the first one
		if (Array.isArray(extension)) {
			extension = extension[0];
			templates = new Hawkejs.Templates(this.renderer, extension);
		} else if (extension instanceof Hawkejs.Templates) {
			templates = extension;
		}

		tasks.push(function executeExtension(next) {

			// Get the compiled template
			templates.getCompiled(function gotTemplate(err, template) {

				if (err) {
					return next(err);
				}

				if (that.change_main) {
					template.change_main = true;
				}

				template.render(variables).done(function done(err) {

					if (err) {
						return next(err);
					}

					next(null, template);
				});
			});
		});
	}

	return Fn.parallel(false, tasks, function doneAllExtensions(err, template_s) {

		if (err) {
			return;
		}

		that.extended_templates = template_s;

		return true;
	});
});
