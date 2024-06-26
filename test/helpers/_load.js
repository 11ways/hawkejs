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
	hawkejs.load(test_base + '/helpers/print_attribute.js');
	hawkejs.load(test_base + '/helpers/with_prepared_variables.js');
	hawkejs.load(test_base + '/helpers/print_variables_element.js');
	hawkejs.load(test_base + '/helpers/state_value_test.js');
	hawkejs.load(test_base + '/helpers/test_ref_button.js');
	hawkejs.load(test_base + '/helpers/prop_passing_down.js');
	hawkejs.load(test_base + '/helpers/state_passing_down.js');
}