# Hawkejs

A Node.js templating engine, with server- and client-side rendering capabilities.

## Installation

    $ npm install hawkejs

## Dependencies

* protoblast

Protoblast is the only dependency, and is loaded without modifying native globals.

## What helper functions are there?

### start(name [, options]) & end(name [, options])

Define a new block.

The EJS code & HTML statements between these 2 functions will be executed immediately, but will not be printed out into the template yet.

They can be print out somewhere else using `assign()`

```ejs
<% start('my-block') %>
	<p>This content will be stored into the <b>my-block</b> block</p>
<% end('my-block') %>
```

### assign(name [, options]) [& assign_end(name [, options])]

Assign a block to this location.

When you use the assign_end() function, the content between these 2 functions will be used as default content, if no block was found.

Assignments are wrapped inside a `x-hawkejs` block.

**Simple assign**

```ejs
<div>
	<% assign('my-block') %>
</div>
```

**Assign with default content**

```ejs
<div>
	<% assign('my-block') %>
		<p>This is temporary, default content</p>
	<% end_assign('my-block') %>
</div>
```

### expands(names)

Indicate that the defined blocks in the current file should be assigned to any of the given layouts. Any HTML not inside a block is discarded.

If the layout is already rendered (on the client side), those blocks are replaced and rendering stops.

If it is not available, or this is a server-side render, that file is parsed and rendered.

**Single name**

```ejs
<% expands('layouts/base') %>

<% start('body') %>
	<p>This content will be assigned to the <b>body</b> block inside the <b>layouts/base</b> template</p>
<% end('body') %>
```

**Multiple names**

You can supply multiple names. The first template to be found will be used.
If none are found yet, the first one is rendered.

```ejs
<% expands(['layouts/base', 'layouts/mod']) %>

<% start('body') %>
	<p>This content will be assigned to the <b>body</b> block inside the <b>layouts/base</b> or the <b>layouts/mod</b> template</p>
<% end('body') %>
```

### foundation() and bottom()

The `foundation()` method needs to be put somewhere in the document `head` element.

It puts in all the required data for client-side renders, events, styles and scripts.

`bottom()` is used to place in extra html markup, like modals.

```ejs
<!DOCTYPE html>
<html>
	<head>
		<% foundation() %>
	</head>
	<body>
		<% assign('body') %>
		<% bottom() %>
	</body>
</html>
```

### style(url [, options]) & script(url [, options])

Load styles and scripts.

In this example, `website` and `first` start downloading at the same time, while `second` loads after the `first` file is complete.

Styles are all downloaded in parallel.

```ejs
// Load in the 'website.js' script file
<% script('website') %>

// Load in the 'first.js' script file and then the 'second.js' file serially
<% script(['first', 'second']) %>
```
