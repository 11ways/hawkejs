/**
 * The "If" expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.9
 * @version  1.2.9
 */
var If = Hawkejs.Expression.getClass('If');

// If statements have arguments
If.setHasArguments(true);

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
		this.execExpressionFunction(this.fnc);
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
					this.execExpressionFunction(branch.fnc);
					performed_elseif = true;
					break;
				}
			}
		}

		if (!performed_elseif && this.branches.else) {
			this.execExpressionFunction(this.branches.else.fnc);
		}
	}

	return this;
});