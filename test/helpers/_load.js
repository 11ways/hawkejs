module.exports = function loadHawkejs(hawkejs) {
	const libpath = require('path');
	let test_base = libpath.resolve(__dirname, '..');
	hawkejs.addViewDirectory(test_base + '/templates');
	hawkejs.load(test_base + '/helpers/assign_test.js');
	hawkejs.load(test_base + '/helpers/html_in_constructor.js');
	hawkejs.load(test_base + '/helpers/my_button.js');
	hawkejs.load(test_base + '/helpers/my_sync_span.js');
	hawkejs.load(test_base + '/helpers/my_text.js');
	hawkejs.load(test_base + '/helpers/retain_test.js');
	hawkejs.load(test_base + '/helpers/html_resolver.js');
	hawkejs.load(test_base + '/helpers/render_after_attributes.js');
	hawkejs.load(test_base + '/helpers/element_specific_variables.js');
	hawkejs.load(test_base + '/helpers/rendered_counter.js');
	hawkejs.load(test_base + '/helpers/parent_element_test.js');
	hawkejs.load(test_base + '/helpers/error_thrower.js');
	hawkejs.load(test_base + '/helpers/nested_template_elements.js');
	hawkejs.load(test_base + '/helpers/render_looper.js');
}