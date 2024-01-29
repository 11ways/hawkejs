const WithPreparedVariables = Fn.inherits('Hawkejs.Element', 'WithPreparedVariables');

WithPreparedVariables.setTemplateFile('elements/with_prepared_variables');
WithPreparedVariables.setAttribute('date');

WithPreparedVariables.setMethod(async function prepareRenderVariables() {

	await Blast.Classes.Pledge.after(5);

	let result = [1, 2, 3];

	return {
		numbers: result
	};
});