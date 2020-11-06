const RetainWrapper = Fn.inherits('Hawkejs.Element', 'RetainWrapper');

RetainWrapper.setMethod(function makeItWait() {
	let pledge = __Protoblast.Classes.Pledge.after(10);
	this.delayAssemble(pledge);
});

RetainWrapper.setAssignedProperty('my_value');

RetainWrapper.setMethod(function retained() {

	let el = this.createElement('retain-test-one');

	el.dataset.foo = 'bar';
	el.my_value = 48;

	let alpha = this.querySelector('div.alpha');

	alpha.append(el);
});

RetainWrapper.setTemplate('<div class="alpha">\n</div>');

const RetainTestOne = Fn.inherits('Hawkejs.Element', 'RetainTestOne');

RetainTestOne.setAssignedProperty('my_value');

RetainTestOne.setTemplate('Contents: <%= self.dataset.foo %>');
