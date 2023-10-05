/**
 * The alchemy-context-menu custom element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.6
 */
const ContextMenu = Fn.inherits('Hawkejs.Element', 'HeContextMenu');

/**
 * The stylesheet to load for this element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.3.14
 */
ContextMenu.setStylesheet(`
he-context-menu:before {
	content: "";
	display: inline-block;
	height: 100%;
	vertical-align: middle;
	width: 100%;
}
he-context-menu {
	display: block;
	position: fixed;
	width: 100vw;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 99999;
}
.he-context-contents {
	position: fixed;
	display: flex;
	flex-flow: column;
	padding: 8px 0;
	background: #ffffff;
	box-shadow: 1px 1px 10px #999;
	border-radius: 3px;
	z-index: 999999;
	max-height: 80vh;
	overflow: auto;
}
he-context-menu .hcm-item {
	padding: 5px 16px 5px 8px;
	cursor: default;
}
he-context-menu .hcm-item:hover {
	background: #b4e6ff;
}
he-context-menu al-ico,
he-context-menu .hcm-icon-placeholder {
	min-width: 20px;
	margin-right: 5px;
}
he-context-menu.hcm-no-icons .hcm-icon-placeholder {
	display: none;
}
`);

/**
 * Give this element the default role of "menubar"
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.6
 */
ContextMenu.setRole('menubar');

/**
 * Add a new entry
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.17
 *
 * @param    {Object|String}   config     The config (or title)
 * @param    {Function}        callback   The function to call
 *
 * @return   {HTMLElement}
 */
ContextMenu.setMethod(function addEntry(config, callback) {

	let wrapper = this.getContentsWrapper();

	if (typeof config == 'string') {
		config = {title: config};
	}

	let entry = this.createElement('div');
	entry.classList.add('hcm-item');

	if (config.icon) {
		entry.classList.add('hcm-has-icon');

		let alico = this.createElement('al-ico');
		alico.setAttribute('type', config.icon);
		entry.append(alico);
	} else {
		let empty_icon = this.createElement('span');
		empty_icon.classList.add('hcm-icon-placeholder');
		entry.append(empty_icon);
	}

	let title = this.createElement('span');
	title.classList.add('hcm-title');
	title.textContent = config.title || config.name;
	entry.append(title);

	entry.setAttribute('role', 'menuitem');

	entry.addEventListener('click', e => {
		this.remove();
		callback(e);
	});

	wrapper.append(entry);

	return entry;
});

/**
 * Get the contents element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.17
 * @version  2.2.17
 */
ContextMenu.setMethod(function getContentsWrapper() {

	let wrapper = this.querySelector('.he-context-contents');

	if (!wrapper) {
		wrapper = this.createElement('div');
		wrapper.classList.add('he-context-contents');
		this.append(wrapper);
	}

	return wrapper;
});

/**
 * Show in response to the given event
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.17
 */
ContextMenu.setMethod(function show(event) {

	// Get a live list of context menus
	let all_menus = document.getElementsByTagName('he-context-menu');

	while (all_menus.length) {
		all_menus[0].remove();
	}

	let left = 0,
	    top = 0;

	if (event) {
		event.preventDefault();
		event.stopPropagation();

		left = event.clientX;
		top = event.clientY;
	}

	hawkejs.scene.bottom_element.append(this);
	let wrapper = this.getContentsWrapper();

	let max_left = window.innerWidth - wrapper.clientWidth,
	    max_top = window.innerHeight - wrapper.clientHeight;

	if (left > max_left) {
		left -= wrapper.clientWidth;

		if (left < 0) {
			left = max_left;
		}
	}

	if (top > max_top) {
		top -= wrapper.clientHeight;

		if (top < 0) {
			top = max_top;
		}
	}

	wrapper.style.left = left + 'px';
	wrapper.style.top = top + 'px';

	let has_icons = this.querySelectorAll('al-ico');

	if (has_icons && has_icons.length) {
		this.classList.add('hcm-has-icons');
	} else {
		this.classList.add('hcm-no-icons');
	}
});

/**
 * Added to the dom
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    2.2.6
 * @version  2.2.17
 */
ContextMenu.setMethod(function introduced() {

	// Don't allow context menus on context menus
	this.addEventListener('contextmenu', e => {
		e.preventDefault();
	});

	this.addEventListener('click', e => {
		if (e.target === this) {
			this.remove();
		}
	});
});