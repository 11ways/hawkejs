var HtmlInConstructor = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function HtmlInConstructor() {
	HtmlInConstructor.super.call(this);
	this.innerHTML = '<bold>This is a test</bold>';
	this.setAttribute('my-test', 47);
});

HtmlInConstructor.setMethod(function introduced() {
	let bold = this.querySelector('bold');
	bold.setAttribute('data-test', '47');
});

HtmlInConstructor.setMethod(function addDeep(text) {

	let el = this.createElement('html-in-constructor');

	el.querySelector('bold').textContent = text;

	this.append(el);

	return el;
});

var AssignInConstructor = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function AssignInConstructor() {
	AssignInConstructor.super.call(this);

	if (Blast.isNode) {
		this.setAttribute('created-on-server', 'true');
		this.assigned_in_constructor = 47;
	}
});

AssignInConstructor.setAssignedProperty('assigned_in_constructor')
AssignInConstructor.setAssignedProperty('assigned_in_addchild')

AssignInConstructor.setMethod(function addChild(text) {

	let child = this.createElement('assign-in-constructor');

	this.assigned_data.added_child = true;
	child.assigned_in_addchild = 48;

	child.textContent = text;

	this.append(child);
});

var SyncTemplateTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function SyncTemplateTest() {
	return SyncTemplateTest.super.call(this);
});

SyncTemplateTest.setStylesheetFile('sync_template_test_style');

SyncTemplateTest.setTemplate('<span class="test">This is a test!!</span>', true);

SyncTemplateTest.setMethod(function addNumber(nr) {
	let span = this.querySelector('span');
	span.append(String(nr));
});

var InnerCustomTest = __Protoblast.Bound.Function.inherits('Hawkejs.Element', function InnerCustomTest() {
	return InnerCustomTest.super.call(this);
});

InnerCustomTest.setTemplate('<sync-template-test></sync-template-test>', true);