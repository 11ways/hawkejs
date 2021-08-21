/**
 * The "If" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var If = Hawkejs.Expression.getClass('If');

/**
 * Parse arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
If.setStatic(function parseArguments(options) {

	let result = options.tokens.getExpression();

	return result;
});

/**
 * Execute the code
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  2.0.0
 */
If.setMethod(function execute() {

	var variable = this.parseExpression(this.options, this.vars);

	if (this.isTruthy(variable)) {
		this.view.execExpressionFunction(this.fnc, this.vars);
	} else if (this.branches) {

		let performed_elseif,
		    branch,
		    i;

		if (this.branches.elseif) {
			for (i = 0; i < this.branches.elseif.length; i++) {
				branch = this.branches.elseif[i];

				// Parse the expression of this elseif branch
				variable = this.parseExpression(branch.pieces, this.vars);

				if (this.isTruthy(variable)) {
					this.view.execExpressionFunction(branch.fnc, this.vars);
					performed_elseif = true;
					break;
				}
			}
		}

		if (!performed_elseif && this.branches.else) {
			this.view.execExpressionFunction(this.branches.else.fnc, this.vars);
		}
	}

	return this;
});