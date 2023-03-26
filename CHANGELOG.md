## 2.3.7 (WIP)

* Add more `ElementInternals` property getters to the server-side `HTMLElement` implementation
* Add the `Element#hideForAssistiveTechnology(value)` method
* Add the `Element#hideForEveryone(value)` method, which will set both `hidden` and `aria-hidden`
* Implement the server-side `Style#removeProperty(name)` method
* Let the `Builder` keep track of the original source code
* Also use custom variables defined on an element (using `+`) inside the template

## 2.3.6 (2023-02-26)

* Fix History API issues

## 2.3.5 (2023-02-17)

* Fix `isDataString()` method not working in the `Element` base class
* Upgrade dependencies

## 2.3.4 (2023-02-11)

* Extract some functionality from the `HTMLElement` class and put it into the new parent `Element` class
* Add the `Hawkejs.Builder` class to easily create HTML & XML trees programmatically

## 2.3.3 (2023-01-30)

* Force move the focus when clicking on anchor links
* Let `Scene#pushToHistory(data, url)` normalize the url value first
* Allow keywords as property names

## 2.3.2 (2023-01-24)

* Fix elements being added with `insertBefore()` and `insertAfter()` not being marked as dirty
* Wrap `pushState` calls in a try-catch block

## 2.3.1 (2023-01-23)

* Allow paths to begin with a function call
* Optimize server-side `HTMLElement`'s `children` property implementation
* Optimize the `Hawkejs.normalizeChildren(element)` method
* Optimize `HTMLElement#innerHTML` property
* Optimize `Hawkejs.recurseLineTasks()`
* Optimize by letting the `_initHawkejs` value be an object again
* Add the `RenderTasks` class
* Make `Hawkejs.recurseLineTasks()` method skip elements that are certain to be finished already
* Don't let `BlockBuffer#makeNode(line)` return strings
* Don't loop over every element when informing them of assembly

## 2.3.0 (2023-01-14)

* Upgrade to Protoblast v0.8.0
* Upgrade Marked to v4.2.12

## 2.2.23 (2022-12-23)

* Prefer heading elements when a readable element should be focused
* Improve performance of setting/setting text content
* Add `LinkedTokenList#contains(value)` method

## 2.2.22 (2022-12-14)

* Ignore setting `Renderer` instances on custom elements that have not been undried yet
* Ignore attribute name errors during rendering
* Wait for the document to be queryable before initing Hawkejs on the browser
* Fix extra `head_tags` not being added to the generated HTML

## 2.2.21 (2022-12-09)

* Fix server-side `Node#replaceWith()` method failing when the node has no next siblings
* Use fast custom method to check for `data-` attributes server-side
* Add 'Hawkejs.logError()` methods, which will not get culled by minifying
* Fix server-side `DOMStringMap` class accepting dasherized keys, when it should throw an error
* Link the `role` property to the `role` attribute for custom elements
* Fix bug where `delayed_elements` (like the foundation content) were actually rendered in the first sub-renderer

## 2.2.20 (2022-12-06)

* Do not automatically scroll when opening a URL without history
* Use `toDryObject` instead of `dry` for storing history states
* Remember & restore scroll position when using the history api
* Fix the initial server-side render not being able to be re-rendered by the history api
* Fix issue where assigning something other than a string to `className` caused an error
* Allow setting form/link submission scroll behaviour explicitly to true

## 2.2.19 (2022-12-03)

* Fix issue in error handler when `code` is a number
* Fix css_styles not being set for client-side added elements that do not have a template

## 2.2.18 (2022-10-29)

* Ensure custom element css only once per request
* Position the `he-bottom` element as fixed
* Allow creating `DOMTokenList` instances on the fly with `Hawkejs.DOMTokenList`
* Also call `attributeChangedCallback` after removing an attribute on the server side
* Add some missing methods & properties to the server-side `DOMTokenList` implementation
* Add support for custom `DOMTokenList` attributes

## 2.2.17 (2022-10-22)

* Improve context-menu behaviour
* Fix optionally-closed elements never being able to be nested
* Make `LI` element placement when used near other optionally closed elements
* Add `Node#contains(other_node)` method to the server-side DOM implementation
* Fix false-y default attribute values never being set
* Fix error because styles try to load before scene is created
* Allow setting a custom tag name manually on a custom element
* Fix `Element.addObservedAttribute()` attributes not inheriting properly
* Add `Element#addIntervalListener()` to add an interval listener that will only run while the element is connected
* Ignore history change when `renderer.history` is explicitly false
* Fix `Scene#enableStyle()` creating too many pledges
* Make `break number` actually work as expected

## 2.2.16 (2022-10-08)

* Make `ClassList#add()` and `ClassList#remove()` behave the same way as in the browser
* Add `Renderer#is_root_renderer` getter
* Add `Renderer#is_follower_renderer` getter
* Try to group certain parallel operations together in the browser

## 2.2.15 (2022-10-06)

* Add support for elements that can optionally be closed
* Make custom-element slots work with synchronous & plain-html templates
* Use a higher `parallel_task_limit` in the browser
* Make client-side style loading a bit more performant

## 2.2.14 (2022-10-02)

* Revert early error throwing in `Scene#openUrl()`
* Make sure variables are prepared before rendering a subtemplate

## 2.2.13 (2022-08-25)

* Fix `Template#source_name` property being set to empty string after serializing
* Don't re-use stale `Variables` clones
* Don't ignore error in `Scene#openUrl()`

## 2.2.12 (2022-07-23)

* Add `has_finished` property to `Renderer` so (inline) styles don't get added to dormant renderers
* Fix template names not getting deduplicated when requesting sources from the server

## 2.2.11 (2022-07-09)

* Fix custom element styles sometimes not being loaded when rendering element in the browser
* Fix `Renderer` sometimes causing an infinite loop when being cloned

## 2.2.10 (2022-07-06)

* Use fixed version for `nwsapi` dependency because latest minor version update is broken
* Try to use as few true-async `Function.parallel` and `Function.series` calls as possible
* Remove some `nextTick` calls too to get more speed
* Call `Element#attributeChangedCallback()` later if the scene instance isn't ready
* Use much faster checksum to cache client-side use of `getFirstAvailableInternalSource()`
* Use grouped versions `Blast.nextGroupedTick()` and `Blast.nextGroupedImmediate()`
* Add `Hawkejs.series()` and `Hawkejs.parallel()` which uses a grouped-queue to minimize async overhead
* Use new Hawkejs function flow methods for remaining calls that couldn't be synchronized
* Replace all remaining `Fn.parallel` and `Fn.series` calls with the Hawkejs equivalent

## 2.2.9 (2022-07-04)

* Add `Hawkejs.getInstance()` so hawkejs can be worked with as a singleton
* Define custom elements in the browser as soon as they have been fully constituted
* Add `Hawkejs.isCustomElement(input)` to check if something is a custom element
* Fix not calling custom element constructors when created with `Hawkej.createElement()`
* Make new renderer instances get the main hawkejs instance as a fallback
* Move the `createElement` method to the main Hawkejs class
* Add `Renderer#ensureHawkejsRenderer()` which will always return a valid renderer
* Make a renderer "adopt" elements coming from another renderer
* Allow running the unit test server on a specific port
* Make sure custom elements created outside of a renderer are properly constructed
* Don't capture clicks when holding down ctrl or meta key
* Wait for elements to be fully constructed before calling connected callbacks
* Also clone variables fetched via `prepareRenderVariables` before rendering
* Use `HashSet` for keeping track of added scripts & styles

## 2.2.8 (2022-06-29)

* Also register custom elements when `assignData()` method is used
* Fix interpreted templates also being executed as an event handler

## 2.2.7 (2022-06-23)

* Make `Element#moveAfterElement` and `Element#moveBeforeElement` work for non-siblings too
* Make context menus fit on the screen

## 2.2.6 (2022-05-31)

* Fix undeclared variable in `Templates#themes` setter
* Make sure inlined custom-element css has been added
* Add `CustomElement#waitForTasks()` to wait for the element to have finished all rendering tasks
* Make sure custom elements with inlined, plain html templates do not render twice
* Fix expressions sometimes not finding correct variable to work with
* Add `<he-context-menu>` element

## 2.2.5 (2022-03-21)

* Throw an error when an open tag isn't valid
* Make assigning `undefined` to an element's `innerHTML` property behave the same was as in the browser
* Fix evaluated code in print commands breaking the current render

## 2.2.4 (2022-03-19)

* Make `macro` expression work again, add `run` expression to use it
* Do not re-render a CustomElement's synchronous template if it has already been rendered

## 2.2.3 (2022-03-16)

* Fix pushing null values to a BlockBuffer throwing an error
* Add `Renderer#current_variables` property which always point to the current active variables
* Set the correct ancestor element for root elements in partials
* Render custom element contents as soon as it's being queried
* Don't load hawkejs-client file via javascript when debugging to fix sourcemap issues
* Make callbacks scheduled with `afterRender` call immediately if already rendered
* Store the URL being opened on the `Scene#opening_url` pledge
* Fix SVG void elements not closing properly
* Fix issue where getting the `getStaticExposedPath` in the wrong order causes it to remain empty

## 2.2.2 (2022-01-11)

* Make the template wait for `implement` calls when switching to a different template

## 2.2.1 (2022-01-07)

* `Hawkejs.handleError()` will now pass previously handled errors without changing them
* Don't throw an error when trying to close a void tag
* Closing wrong tags in html-only mode should not throw an error
* Do not render code inside HTML comments
* Do not parse hawkejs code when setting innerText/innerHTML of an element
* Fix `Hawkejs.removeChildren(element)` not removing children of `<form>` element

## 2.2.0 (2021-09-12)

* Change the way templates are compiled (part of the "variable references" work)

## 2.1.8 (2022-01-11)

* Make the template wait for `implement` calls when switching to a different template

## 2.1.6 (2021-09-12)

* Fix `getElementContent()` still using `Blast.parseHTML()`
* Add `set` expression
* Do not use `xhr` property of a `Develry.Request` instance
* Put the static exposed variables in a temporary javascript file
* A single Hawkejs syntax block can now contain multiple expressions, separated by either a newline or a semicolon
* Parsing HTML elements & hawkejs syntax now happen in the same step
* Reworked mapping errors to the original template source

## 2.1.5 (2021-07-10)

* Renderer#closeElement() should work fine when called with no arguments
* Calling `Blast.doLoaded()` should catch errors
* `Scene#openUrl()` should mark source elements as not-busy after a request has been intercepted
* Custom elements with a simple HTML template should render their contents BEFORE applying element options
* Fix `he-placeholder` elements sometimes causing an infinite loop
* Set custom element render variables from within the element tag using the `+` sign
* Apply certain element options before rendering a custom element's template synchronously

## 2.1.4 (2021-04-29)

* Delay custom element constructor until readyState is "loaded"
* Make sure stylesheets of custom elements are loaded when rendered on the client side
* Add `switch` expression
* Add `transpose` option to the `markdown` expression
* Allow using plus & minus token at the start of an expression
* `Hawkejs.parseHTML(html)` now also works in the browser
* Use Protoblast's `Branch` class as the basis for the server-side `Node` implementation
* Fix `preTasks` not being run before other tasks
* Don't throw an error when closing void elements

## 2.1.3 (2021-01-21)

* Add new events for debug purposes
* Fix `<!DOCTYPE>` never having attributes
* Set the `data-he-last-template` body attribute on the server-side too
* Add `assertPropertyName(name)` function to make sure added custom element properties are allowed
* Allow setting default custom element attribute values
* Add `Element.setRole(value)` method
* Fix server-side `Node#compareDocumentPosition()` returning the reversed result
* Fix the `root` option in `Scene#openUrl()`
* Look for a `toAttribute()` method when assigning a value to an element's attribute during render
* Add a `state` property to the `Renderer` class
* Expressions can now check the `state` property and change their behaviour when an element is being created, for example
* Assigning a value to an attribute will triger their `toAttributeValue` method
* Let the `Renderer` class keep track of the html, head & body elements
* Add a `language` property to the `Renderer` class, which also sets the html `lang` attribute
* Fix location hash not changing when clicking a link
* Call the deprecated `renderHawkejsContent` methods with `Hawkejs.callDeprecatedRenderContent()` so they don't get called multiple times
* Using `Scene#openUrl()` with a specific root element will no longer interfere with the current opening url request
* Add `Hawkejs#parallel_task_limit` property to limit amount of concurrent parallel tasks (especially needed for unit tests)
* Fix custom element boolean attribute setters
* `Hawkejs.recurseLineTasks()` will now also prepare printed blocks
* Fix setting the page title using asynchronous values on the client side
* Add `Renderer#createSubRenderer()`
* `Helper` directive methods can now return promises
* When `async()` calls return an error, print the stacktrace instead of hanging
* Non-node objects are now also wrapped in a placeholder on the server-side
* Remove `Template#waitForOtherTemplates()` method, the foundation is now rendered differently
* Add `CustomElement#rendered()` callback method
* Fix the client-script being loaded twice
* Implement the `neq` operator

## 2.1.2 (2020-12-10)

* Don't stringify function templates before rendering them in `HTMLElement#_setInnerHTML`
* Fix `Hawkejs#rewriteVariableReferences()` triggering getters
* Implement `Node#compareDocumentPosition(other)`
* Make EJS `<%= %>` print commands unsafe
* Add server-side `Node#replaceChild()` and `Node#replaceWith()` implementation
* Fix slots not being filled in subtemplated of custom elements

## 2.1.1 (2020-11-21)

* Fix `Hawkejs.getTextContent()` not returning correct text value for text nodes in the browser
* Fix `Renderer#makeDialog()` not working when rendering from inside the browser
* Add the `{% include "template" %}` expression
* Add SVG elements to the VOID_ELEMENTS object
* Stringify objects before setting them as the innerHTML

## 2.1.0 (2020-11-12)

* Add `Hawkejs#evaluate(source, variables)` to synchronously render a simple template
* Parse `HTMLElement#innerHTML` assignments to actual elements on-the-fly on the server
* Allow plain HTML custom Element templates to be rendered synchronously upon creation
* During a render, element options are only applied when closing the element, or the current element is accessed using `$0`
* Fix `Hawkejs.getFirstElement(entries)` returning text nodes
* Fix the `assigned_data` property not always being sent to the client-side
* `Hawkejs.addPreTask(element, task)` now also accepts a promise
* Add `CustomElement#delayAssemble(task, delay_foundation = true)` which will immediately start the task, but delay the assembly of the element until it finishes (and also delay the "foundation" by default)
* Added `Renderer#foundation_delays` property so it can wait on extra promises before creating the foundation
* Allow setting multiple getters with an object in `CustomElement#addElementGetter` and `CustomElement#addElementsGetter`

## 2.0.4 (2020-10-22)

* Add `Scene#render(template, variables)` to render & apply to the current scene
* Add `Renderer#addClass(names)` command to add CSS classes to the current block
* `Scene#getScript()` will now reject the returned promise if an error occurs
* Custom elements now emit a `rendered` event after their template has been rendered

## 2.0.3 (2020-10-20)

* `Scene#onFormSubmit()` will now also check for the target & data-he-link attribute
* Add the `Blocks` class
* Fix the `Renderer#makeDialog()` method

## 2.0.2 (2020-10-08)

* Fix "back" functionality
* Fix toggling the `Scene#allow_back_button` property
* Remove the `Hawkejs.closest()` method
* Allow safe-printing variables with single curly brackets only, like `{{my_variable}}`
* Implement option notation (`a="something"`) as an alternative way to make an object
* Add `Scene#detectDoubleClick(request, min_duration=1000)`
* Allow opening redirects in a popup window with `x-hawkejs-popup` header

## 2.0.1 (2020-07-24)

* Fix `Scene#scrollTo()` always assuming the second parameter are options
* Fix `Element#getScrollContainer()` returning the wrong scrollable container
* Allow custom elements to define CSS with the `Element.setStylesheet()` static method
* Add `BlockBuffer#addInfoToElement(el)` to set block info & attributes on the given element
* Fully serialize an element when `JSON-Dry`-ing it for a client-side render
* Add `Hawkejs.appendChildren(target, children)` method
* Fix Element instances with only a dried `outerHTML` value not being properly undried
* Move the `BlockBuffer#prepareLineTasks()` logic to `Hawkejs.prepareLineTasks(lines, renderer)` so it can be re-used
* Re-implement dialog support using custom `he-dialog` element

## 2.0.0 (2020-07-21)

* Code rewrite
* Templates are now built with a virtual dom
* `var`, `let` and `const` can now safely be used inside templates
* Added `CustomElement#setAttributeSilent()` in order to not trigger a setter
* Added `CustomElement#prepareRenderVariables()` which allows you to add variables before rendering the contents
* `CustomElement#setAttribute(name)` calls will now normalize the attribute & property name
* Added `nwsapi` dependency so querying methods can also work on the server

## 1.3.3 (2019-06-18)

* Fix `BlockBuffer#push()` not returning the index of the pushed line
* Backport element attribute serialization fix from 2.0.0
* Allow using simple expressions in templates, without print
* Methods can now be called from within hawkejs expressions

## 1.3.2 (2019-02-18)

* Fix using OR & AND operators in expressions
* Fix adding multiple operators
* Added `HelperCollection` class: helper classes are now only initialized when they're needed
* `BlockBuffer` is no longer a descendant of Array, but has a `lines` array property
* Calling multiple `start()` for the same block with `content: push` on will do as expected
* Fix undrying elements that are not included in the dom
* Call the `retained` method of a custom-element when it's being rendered in a view

## 1.3.1 (2019-01-12)

* Attempt to register the server-side render during scene initialization
* `CustomElement#emit(name, options)` now takes an option object as second argument
* Add `HTMLElement#append()` method
* Add `HTMLElement#insertAdjacentHTML()` method
* Fix `HTMLElement#value` property
* Fix `HTMLElement#innerText` and `HTMLElement#textContent` properties
* Fix `data-` attributes not being removed when changing `dataset` property
* Add `HTMLElement#children` property & fix `#getSiblingByIndex()` and `#insertAfter()`

## 1.3.0 (2018-12-06)

* Add support for native v1 custom-element implementation
* Add `Expression.isTruthy()` method to check if a variable is truthy
* Add `Element#createElement(tag_name)` to create any element with a hawkejs_id
* The basic `HTMLElement` instances can now also be revived when they have a `hawkejs_id`
* Use Protoblast's `Request` class for `Scene#fetch` & `Scene#openUrl`
* Add `Element#enableFocusWithinEvent` & `Element#enableHtmlChangeEvent`
* Fix server-side HTMLElement `value` property implementation
* Add `ViewRender#getBlockByName()` and `ViewRender#active_block`
* Add `trim` expression, to trim away whitespace on left and/or right side
* Make `print` expression smarter
* Don't add the "result" html when json-ifying Placeholder instances
* If `version_info` is available, add it as a GET parameter to stylesheet & template requests
* Use `Blast.fetch` for getting the templates on the client-side
* Make `Scene#serverResponse()` work without an actual XHR instance
* Add server-side `Element#insertAdjacentElement()` and fix `appendChild` and `insertBefore` from not adding the same element twice
* Add server-side `Element#hidden` property support
* Allow calling `CustomElement#setAssignedProperty` with only a function argument
* The on-assigned-data method callbacks will no longer replace the value if it returns a thennable

## 1.2.9 (2018-10-18)

* Fix `CustomElement#setAssignedProperty` with custom setters not having their value set
* Forward some errors to `Scene#handleError(err)`, if it is set
* Only remove custom elements from the browser store a few seconds after it has been introduced
* Don't print whitespaces after code blocks ending with a dash, like `<% -%>`
* Add new, additional template syntax: `{% %}`
* Prevent `CustomElement#attributeChangedCallback()` from firing twice
* Add `Helper#createElement(name)` method
* Emit `opening_url` event when executing `Scene#openUrl()`
* Handle hawkejs-client script loading before the `_initHawkejs` object is present
* Fix `Scene#disableStyle()` to also work on Firefox
* Make `Scene#serverResponse()` callback with an error if response status >= 500

## 1.2.8 (2018-08-27)

* Calling `CustomElement#setAttribute` method will now add itself as a constitutor
* Add `Node` class, let `Element` inherit from it
* Add `Element#queryTabbableElements`
* `hawkejs_init` will now emit with the revived variables, `hawkejs_initing` will emit with the dried variables
* Recursively perform `getContent` on finished blocks & on HTMLElement childnodes
* Fix `setAssignedProperty` replacing the wrong value when a setter is given
* Allow element with class `js-he-unlink` to prevent a custom `js-he-link` from being fired when clicking on it
* Allow disabling moving browser focus by passing `move_browser_focus: false` to `Scene#openUrl`

## 1.2.7 (2018-07-14)

* Upgrade FormData polyfill which fixes some IE11 issues

## 1.2.6 (2018-07-12)

* Fix `Scene#serialize_form(form)` so it correctly serialize checkboxes
* Make `Scene#fetch()` accept with FormData
* Fix exporting the Hawkejs namespace
* `Hawkejs#compile()` now accepts a single string with a template source again

## 1.2.5 (2018-07-04)

* Set `nodeName` and `tagName` in the correct case when using `Hawkejs#createElement`

## 1.2.4 (2018-07-01)

* Add `HTMLElement#isFocusable()` and `HTMLElement#isTabbable()` methods
* Add `HTMLElement#forceFocus()` to force setting focus to an element
* Change focus to the first created block on a page after an AJAX browse
* Use new `RURL` class from `protoblast` version 0.5.7

## 1.2.3 (2018-06-18)

* Emit `hawkejs_scene` event on the Blast object when the scene is being made
* Emit `hawkejs_init` event with the new instance and non-undried init objects
* The temp file created for the client file will now have a 'hawkejs_' prefix and a '.js' suffix
* When manually adding helper files you can now pass the `make_commonjs` option, which will wrap it in a function with `Hawkejs, Blast` arguments
* `JSON-dry` can now directly undry an object, no need to stringify it first
* You can add a `interceptOpenUrl` method on the `Scene` class to intercept open urls
* Add client-side connection checking
* Add `use strict` to all helpers
* Add `module.exports` headers to helpers automatically
* Added `HTMLElement#hasAttribute` method
* Added `HTMLElement#insertBefore` method
* Also wait for objects that have a `whenFinishedOrTimeout` method
* `isVisible` fix: `overflow: auto` also makes a view context
* Custom elements are now stored in the `Hawkejs.Element` namespace
* Allow the use of custom default prefixes in custom elements, instead of "he"
* Helpers are now stored in the `Hawkejs.Helper` namespace
* Prefer "partial" over "element", so added methods like 'ViewRender#print_partial'

## 1.2.2 (2018-01-05)

* Make sure `registerRender` doesn't fail when there is no url
* Fix `Hawkejs.removeClasses` and `Hawkejs.addClasses` so it doesn't crash on a class_name with only whitespace
* Use `decodeURI` when using a `x-history-url` as new url
* Put every class under the `Hawkejs` namespace
* Custom element instances created during a client side render will no longer be re-created when finally inserted into the DOM
* `ViewRender#getId(prefix)` now accepts a prefix, which starts a new number sequence
* Added `Hawkejs.elementHasBeenRegistered(name)`
* `Hawkejs#getSource` will no longer cache template when debugging
* Fix `Hawkejs#load` using `browser` property instead of `client`
* Add dataset polyfill for ancient browsers
* Fix `getFirstAvailableInternalSource` on the client not returning an object
* Use `useragent#lookup` for faster parsing of useragents
* The `Scene#generalView` property is created even before the document is ready
* Custom elements now have a `hawkejs_view` property, so a ViewRender instance can always be accessed
* Custom elements also have a `hawkejs_helpers` property
* Hawkejs block elements are now identified by the 'x-hawkejs' class instead of tag name
* `isVisible` should now work correctly, even in nested scrolls. When no padding is given, it'll even do an occlusion check

## 1.2.1 (2017-08-27)

* Add `Hawkejs.addAttributes(element, attributes)`
* `Scene#fetch` and `Scene#openUrl` will no longer try to parse empty "json" responses. (This happened on Firefox, not on chrome)
* Cookies will use the `secure` flag by default when on a secure page
* Fix memory leak in history implementation
* The 'scene_start' cookie will be set on the url's pathname, not just path (which includes queries)
* `x-history-url` header value will be encoded using `encodeURI`
* The `_initHawkejs` json variable will now escape "</script>" tags

## 1.2.0 (2017-08-11)

* Creating a Helper instance without a view on the server side will no longer throw an error
* `Scene#serverResponse` will now callback with the `ViewRender` instance
* When a dialog is closed by clicking on the wrapper "dialog_close" event will be emitted on the ViewRender instance
* Catch errors made by `Scene#fetch` during `xhr#send`
* `style` calls can now be full urls
* Added `Scene#render` method, which applies the render results to the current scene (`Hawkejs#render` will only render them, without applying)
* Make `js-he-form`s use the `method` attribute, instead of `type`
* The `get` option can now also be a `FormData` instance
* `add_class` calls will now also work in blocks that have been turned into a dialog
* Forms and links with `js-he-close-dialog` as a CSS class will close the parent dialog after their successful request
* `Scene#render` now returns the created ViewRender instance
* Fix: `ViewRender#beginRender` now actually waits for the emitted 'begin' events to finish. This used to cause race conditions.
* Setting a pagetitle can now be done with an object supporting `getContent` and `toHawkejsString`
* Fix `Scene#scrollTo` not working at all
* Don't scroll to anything when an openUrl call results in a dialog being made.
* Add `ViewRender#showDialog` which can add dialogs from the server side
* Call `Scene#ajaxify` after emitting the created events (so clicks can be prevented)
* Strip HTML tags before setting the page title element
* Dialog wrappers will now use z-index of 998, 9000 less than before
* The client-side `doExtensions` method will now also `changeMain` block when extending
* Client-side extensions will now also work when extending a dialog
* Hawkejs elements now can also have a "data-entry-template", indicating which templated was the original entry point
* Bump version to 1.2.0, as there are too many breaking changes
* Also remove `h_diversion` and `htop` from history urls
* When using `Scene#scrollTo` without any parameters, just scroll to the top immediately
* Add `Hawkejs#delayReady` which is intended to be used in "onclick" attributes
* Fix some isVisible handling
* Fix the `Helper#parseURL` method
* Add simple code to get rid of dialogs when using back button (needs rework)
* Added another attempt to fix scrollTo
* The default `scrollTo` duration can be overwritten by exposing `default_scrollto_duration`

## 1.1.3 (2017-04-17)

* Add `Templates#name` property
* Add `assigns` property to `ViewRender#toJson()`
* Add `Hawkejs.removeClasses`
* `className`s set in `assign()` options will remain on the block,
  `className`s set in a `start()` call will be removed when a new `start()` is issued
* `querySelectorAll` results don't have a `forEach` method in Edge, so fix that
* Fix race condition in `Hawkejs#createClientFile`
* Fix `Hawkejs#require` not honouring path property on the client side
* Add dialog css as style element
* Bundle client-side template requests

## 1.1.2 (2017-01-21)

* Added `add_class` method to add CSS classnames to a Hawkejs element
* `Element#reload` will now render the correct theme of template
* Elements with the `data-update-request` attribute will only get the
  click/change listener once
* CustomElements will be registered once all the Hawkejs code has executed
* Fixed calling of `CustomElement#undried`
* Renamed CustomElements `attachments` to `assigned_data`
* `CustomElement#attach` is now `CustomElement#assignData`
* Added `CustomElement#emit` to emit a custom browser event
* Added `CustomElement#connectedCallback` functionality
* Scene view helpers will be created before scripts are requested
* `Scene#appears` now also accepts elements and array of elements
* History url can also be changed on initial page load with exposed `redirected_to`
* Input elements with `data-update-location` will `openUrl` on change
* Make `wheel` and `click` listeners passive

## 1.1.1 (2016-10-04)

* Stylesheet theme support
* Client files: remove code between "//HAWKEJS START CUT" and "//HAWKEJS END CUT"
* Client files can now be non-commonjs formatted (using `is_commonjs` set to false)
* Client files no longer use the entire file path as an identifier

## 1.1.0 (2016-06-27)

* Improve template error reporting
* Integrate custom elements
* Work with HTMLElements

## 1.0.0

* Complete rewrite
* Remove DOM-style rendering from the server
* Live-data binding

## 0.1.1 (2014-06-10)

* Add custom 'x-hawkejs-request' header to GETs and POST requests
* Add Mozilla's localforage library
* Expose the ejs renderer via hawkejs.ejs
* Upgrade the History library to version 4.0.9
* Add LZ-String and use it to compresses History API payloads that are too big
  for certain browsers (IE & Firefox).
  This slows down the browser, an asynchronous web-worker solution should be
  sought after next.
* If it is given, use the 'X-History-Url' response header as the url to
  register with the HTML5 History API.
* Emit viewready event after render or pageload
* Upgrade DOMSpot to 0.1.0
* Don't use the History API on forms that have the 'data-no-history' attribute
* Update History.js to version v4.1.0, fixes some Firefox security errors

## 0.1.0 (2014-03-12)

* Submit POSTs as JSON instead of urlencoded strings
* Use TJ Holowaychuk's querystring code to convert a form to an object.
  This makes it perfectly compatible to express, where the same code is used.

## 0.0.15 (2014-03-11)

* Add events for created 'implementations'. Still need to add them for destroyed
  ones, too.
* Revert to jQuery 1.8 on the server side
* Add DOMSpot for ClientSide usage

## 0.0.14 (2014-02-28)

* Upgrade ejs from 0.8.3 to 0.8.5, an upgrade that needed some tweaking.
* Also upgrade cheerio, entities and jquery

## 0.0.13 (2014-02-18)

* Don't thrown an error when _EjsRender returns an empty string after render,
  sometimes that's just what needs to happen.
* Fix the History API implementation.
  Some functions were modified in a way nothing happened anymore on pressing the
  back & next buttons.
  The 'historyChange' event is also emitted after the state has been applied.

## 0.0.12 (2014-02-16)

* Add getObjectPath function, which takes an object and a string and uses that
  string as a path to look for in the object

## 0.0.11 (2014-02-05)

* Add uneval function. Right now it only correctly uneval's functions,
  but more is to come.
* Script tag names are no longer prefixed with 'hawkejs' because it messed up
  encoding of chars like '<'. To not have the scripts run too soon,
  jQuery's .parseHTML is used.
* Replace hawkejs.µ with hawkejs.utils, as it caused encoding problems.
* Add a new jQuery converter setting for json-dry strings
* Hawkejs event listener now allows you to pass an array of queries or strings
* Add hawkejs.downloadAjax function, which allows the user to POST data to the
  server and download the file, as if via AJAX. Even allows callback functions
  (for when download begins) if the server supports it.
  Inspired by this stackoverflow question:
  http://stackoverflow.com/questions/1106377/detect-when-browser-receives-file-download
* Add formify function, which turns an object into key-value pairs fitted for
  form submission

## 0.0.10 (2014-01-21)

* Many new functions & helpers
* Partial rewrite of the script & asset helpers
* Expose vendor folder for client side
* The expands() helper now accepts an array of string
* Add serial drones
* Allow links to have no content text
* Improve url matching & add greedy matching
* Make sure links created by add_link have unique ids
* Emit events when a script is added
* Make ejsrender return more data if requested
* Add order & treeify functions
* Add json-dry functions (json with support for dates & regexes)
* Add pr() function for debugging

## 0.0.9 (2013-10-15)

* Use cheerio 0.12.2 because of a bug in 0.12.3

## 0.0.2 (2013-01-21)

* client side rendering produces the same html code as the server

## 0.0.1 (2013-01-21)

* first push to npm after +/- 31 hours of development