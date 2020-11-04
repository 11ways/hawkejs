/**
 * My-button custom element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var MyButton = Blast.Bound.Function.inherits('Hawkejs.Element', function MyButton() {
	MyButton.super.call(this);
});

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
MyButton.setTemplateFile('elements/my_button');

/**
 * The text attribute
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
MyButton.setAttribute('text');

/**
 * Set the text and rerender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
MyButton.setMethod(function setText(text) {
	this.text = text;
	return this.rerender();
});

var ContainsStyledButton = Blast.Bound.Function.inherits('Hawkejs.Element', function ContainsStyledButton() {
	ContainsStyledButton.super.call(this);
});

ContainsStyledButton.setTemplateFile('elements/contains_styled_button');

var MyStyledButton = Blast.Bound.Function.inherits('Hawkejs.Element', function MyStyledButton() {
	MyStyledButton.super.call(this);
});

MyStyledButton.setStylesheetFile('my_styled_button');