/**
 * The "Switch" expression
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.4
 * @version  2.1.4
 */
let Switch = Hawkejs.Expression.getClass('If', 'Switch');

/**
 * Execute the code
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.1.4
 * @version  2.1.4
 *
 * @param    {String}  name
 * @param    {Array}   pieces
 */
Switch.setMethod(function execute() {

	let variable = this.parseExpression(this.options, this.vars),
	    found_case = false;

	if (this.branches && this.branches.cases) {
		let branch,
		    value;

		for (branch of this.branches.cases) {
			value = this.parseExpression(branch.pieces, this.vars);

			if (value == variable) {
				this.execExpressionFunction(branch.fnc);
				found_case = true;
				break;
			}
		}
	}

	if (!found_case && this.branches && this.branches.default) {
		this.execExpressionFunction(this.branches.default.fnc);
	}

	return this;
});