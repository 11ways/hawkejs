# Hawkejs
A Node.js templating engine built upon TJ Holowaychuk's EJS.

## Installation

    $ npm install hawkejs

## Why did you fork EJS?

I didn't. EJS is a dependency of Hawkejs.

In essence, Hawkejs is a wrapper around EJS that adds some features (like blocks) as simple function helpers.

Original EJS templates can be used as Hawkejs templates, and the other way around (though Hawkejs functions should be removed, then)

## What other dependencies are there?

* Cheerio

For DOM manipulation. It's lightning fast in comparison to server-side jQuery or JSDOM.

* jQuery

Only used for its $.extend() function.

* uglify-js

Used for minifying the client side javascript files.

* mkdirp

Used for creating a temporary folder to store the views in.

* async

Also used for creating a temporary folder to store the views in.

## What helper functions are there?

### expands(element_to_expand [, options])

Indicate that the working element blocks should be "injected" into the given element_to_expand.

Any HTML not inside a block is discarded.

(This element_to_expand is relative to the main base dir, without the extension.)

### implement(element_to_implement [,options])

The reverse of expands(), the element_to_implement will be rendered and fully injected into the current element.

This *INCLUDES* any HTML not inside a block, and wraps them inside a hawkejs div.

New blocks are also added to the current scope.

Even though they look alike, implement() is different than print_element().

### print_element(element_to_print [, options])

Render the element_to_print in its own scope, but with the given variables of the current element, and print it out immediately.

So any blocks created inside this print_element() *CAN NOT* be used outside of it.

In order to do that, you need implement()

### parse_element(element_to_parse [, options])

Any blocks found in the element are added to the current scope.

Any HTML not inside a block is discarded.

So, this function does not inject new HTML into the current, working element.

### start(name [, options]) & end(name [, options])

Define a new block content.

The EJS code & HTML statements between these 2 functions will be executed immediately, but will not be printed out into the template yet.

They can be print out somewhere else using assign()

### assign(name [, options]) [& assign_end(name [, options])]

Assign a new space.

Blocks with the same name will be written out in here. You can assign spaces before you create blocks.

When you use the assign_end() function, the content between these 2 functions will be used as default content, if no block was found.

When you only use assign(), no other content on that line (except a newline, ofcourse) should follow it.

Assign leaves behind some extra html:

    <div id="hawkejs-space-name" data-hawkejs-space="name" data-remove="false"></div>

### style(url [, options]) & script(url [, options])

Add style & script tags.

These tags are not printed out immediately.
You can give a destination-option as to where you want them.

If none is given, they are put into the <head> element.

### print(string)

Simply print something out (by pushing it into the buffer).

### print_block(name [, options])

Unlike assign(), print_block() will get the block content *right now* and print it out, with no extra wrapper divs.

So if you use this to get a block *before* defining it, it will return nothing.

### add_link(href [, options])

Add an anchor tag to the buffer.

This function takes in a bunch of options:

* name    {string}   The text inside the anchor tag. Uses the href if absent
* title   {string}   The title (hover) text. Uses name if absent
* id      {string}   The id of the tag. Empty if absent
* class   {string}   The classes of the tag. Empty if absent
* match   {object}   CSS attributes to apply when the url matches the href

	- Any attribute is allowed, and will be replaced with the given. These are special, though:

	- css        =    This css class will be ADDED to the current classes
	
	- replaceCss =    The current css classes will be replaced with these
	
	- content    =    The inner html will be replaced with this
	
	- parent     =    Recursively apply the attributes in THIS object to the parent. For example, when you do: {parent: {css: "test"}}, the parent item's css will be appended with "test"
	
	- ... any other attribute will just be set to the given value, for example:
	
	- title      =    The title attribute will be set to this
	


* return  {string}   What this function should return. Defaults to 'print'

	- print   = The function will add the html to the buffer and return nothing

	- options = The function will return the options array WITH a new html property with the result and WILL NOT add anything to the buffer. This is useful for building other helpers on top of this one.

	- string  = The function will return the html and print out nothing.

	- all     = The function will add the html & return the options
	