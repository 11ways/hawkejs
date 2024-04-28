const WithReactiveAttributes = Fn.inherits('Hawkejs.Element', 'WithReactiveAttributes');

WithReactiveAttributes.setTemplate(`
	<div class="first-div {% @is_active ? "active" : "" %}">
		{% if @is_active %}
			Active!
		{% else %}
			Not active!
		{% /if %}
	</div>
`);