var AssignTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function AssignTest() {
	AssignTest.super.call(this);

	if (this.assigned_data.title_element && !this.assigned_data.title_element.parentElement) {
		this.append(this.assigned_data.title_element);
	}

});

AssignTest.setAssignedProperty(function stopped(value) {
	return value;
}, function setStoppedValue(value) {

	if (value) {
		this.classList.add('stopped');
	} else {
		this.classList.remove('stopped');
	}

	return value;
});

AssignTest.setProperty(function title_element() {

	if (!this.assigned_data.title_element) {
		let element = this.createElement('div');
		element.classList.add('title');
		this.assigned_data.title_element = element;
		this.append(element);
	}

	return this.assigned_data.title_element;
}, function setTitleElement(element) {

	if (this.assigned_data.title_element) {
		this.assigned_data.title_element.remove();
	}

	this.append(element);

	return this.assigned_data.title_element = element
});

AssignTest.setAssignedProperty(function title(value) {
	return this.title_element.innerText;
}, function setTitle(value) {

	if (value) {
		this.title_element.innerText = value;
	} else {
		this.title_element.innerText = '';
	}

	return this.title_element.innerText;
});

AssignTest.setAssignedProperty('custom_element');

var AssignTestWrapper = __Protoblast.Bound.Function.inherits('Hawkejs.Element', 'AssignTestWrapper');

AssignTestWrapper.setTemplate(`
This is an assign test!
<% include('partials/assign_test_wrapper', {wrapper_element: self}) %>
`);