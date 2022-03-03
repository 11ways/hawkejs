const ErrorThrower = Fn.inherits('Hawkejs.Element', 'ErrorThrower');

ErrorThrower.setTemplate('Error Thrower Template');

ErrorThrower.setProperty(function value() {
	return null;
}, function setValue(value) {
	throw new Error('This should throw an error');
});
