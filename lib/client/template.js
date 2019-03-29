const Template = Hawkejs.Template;

/**
 * Do the extensions that haven't been executed so far,
 * on the client side.
 *
 * When the last doExtensions is done this does NOT mean all the blocks are
 * done, either. (This is because we don't execute extensions already on the
 * page)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
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

		if (!templates.force_render && that.detectTemplate(templates)) {
			continue;
		}

		tasks.push(function executeExtension(next) {
			// Get the compiled template
			templates.getCompiled(function gotTemplate(err, template) {

				if (err) {
					return next(err);
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

	return Fn.parallel(tasks, function doneAllExtensions(err, template_s) {

		if (err) {
			return;
		}

		that.extended_templates = template_s;

		return true;
	});
});

/**
 * Detect if the given templateName is already in the root or its children
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  2.0.0
 *
 * @param    {Hawkejs.Templates}   templates
 * @param    {HTMLElement}         root
 */
Template.setMethod(function detectTemplate(templates, root) {

	var template,
	    elements,
	    element,
	    type,
	    list,
	    i,
	    j;

	if (!root) {
		root = this.root || document;

		if (typeof root == 'string') {
			root = document.querySelector(root);
		}
	}

	if (root && root.constructor && root.constructor.name == 'Placeholder') {
		return false;
	}

	list = templates.templates;

	// Get all the blocks
	elements = root.querySelectorAll('[data-he-template]');

	// Go over every possible templateName
	for (i = 0; i < list.length; i++) {

		for (j = 0; j < elements.length; j++) {
			element = elements[j];
			type = element.getAttribute('data-he-type');

			// Only `assign` blocks can be overwritten,
			// not implements or print_elements
			if (type && (type !== 'block' && type !== 'dialog')) {
				continue;
			}

			template = element.dataset.heTemplate;

			if (template === list[i].name) {
				return list[i].name;
			}
		}
	}

	return false;
});