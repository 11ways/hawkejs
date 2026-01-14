/**
 * Elements for testing slot content during parent re-renders
 */

// Child element that uses slots
var SlotChild = Blast.Bound.Function.inherits('Hawkejs.Element', function SlotChild() {
	SlotChild.super.call(this);
});

SlotChild.setTemplateFile('elements/slot_child');

// Set an attribute for testing
SlotChild.setAttribute('label');

// Parent element that creates multiple SlotChild instances
var SlotParent = Blast.Bound.Function.inherits('Hawkejs.Element', function SlotParent() {
	SlotParent.super.call(this);
});

SlotParent.setTemplateFile('elements/slot_parent');

// Attribute to control how many children to create
SlotParent.setAttribute('count', {type: 'number'});

// Method to trigger rerender for testing
SlotParent.setMethod(function triggerRerender() {
	return this.rerender();
});
