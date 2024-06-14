/**
 * state-value-test element
 */
const StateValueTest = Blast.Bound.Function.inherits('Hawkejs.Element', 'StateValueTest');

StateValueTest.setTemplateFile('elements/state_value_test');

StateValueTest.defineStateVariable('defbool', {
	type      : 'boolean',
	default   : false,
});