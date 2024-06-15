/**
 * state-passing-down element
 */
const StatePassingDown = Blast.Bound.Function.inherits('Hawkejs.Element', 'StatePassingDown');

StatePassingDown.setTemplateFile('elements/state_passing_down');

StatePassingDown.defineStateVariable('message', {
	type      : 'string',
});

StatePassingDown.defineStateVariable('times', {
	type      : 'integer',
	default   : 0
});