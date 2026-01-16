# Hawkejs Development Guide

## Overview

Hawkejs is an asynchronous templating engine with server-side and client-side rendering. Templates are compiled to JavaScript and can render on the server (first page load) or in the browser (subsequent navigations).

## Commands
- Run tests: `npm test`
- Run with coverage: `npm run coverage`

## Template Syntax

Templates use `.hwk` extension. Hawkejs parses HTML into a virtual DOM, so **valid HTML is required**.

### Output
```hawkejs
{{ variable }}                   {# HTML-escaped output (safe) #}
{%= variable %}                  {# raw/unescaped output #}
{% variable %}                   {# use in attributes/expressions #}

<p>{{ user.name }}</p>           {# text content (escaped) #}
<img src={% image.url %}>        {# attribute value #}
<div>{%= raw_html %}</div>       {# raw HTML injection #}
```

### Control Flow
```hawkejs
{% if condition %}...{% elseif other %}...{% else %}...{% /if %}

{% switch value %}
    {% case "a" %}...{% case "b" %}...{% default %}...
{% /switch %}

{% each items as index, item %}   {# key first, value second! #}
    {{ item.name }}
{% else %}
    No items found
{% /each %}

{% with users as user %}          {# conditional branches #}
    {% multiple %}Multiple users{% /multiple %}
    {% single %}One user: {{ user.name }}{% /single %}
    {% none %}No users{% /none %}
{% /with %}

{% set total = 0 %}               {# variable declaration #}
{% break %}                       {# break out of loop #}
```

**Loop auto-variables:** `$index`, `$key`, `$value`, `$amount`

**Operators:** `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `and`, `or`, `not`, `emptyhtml`

### Layout & Blocks
```hawkejs
{% extend "layouts/body" %}

{% block "main" %}
    content for the main block
{% /block %}

{% include "partials/header" %}
{% include "partials/item" with {item: my_item} %}
```

### Macros
```hawkejs
{% macro greeting name="World" %}
    Hello, {{ name }}!
{% /macro %}

{% run greeting name="User" %}
```

### Content Manipulation
```hawkejs
{% trim %}...{% /trim %}           {# remove surrounding whitespace #}
{% trim left %}...{% /trim %}      {# remove left whitespace #}
{% markdown %}# Title{% /markdown %} {# convert markdown to HTML #}
```

### JavaScript Execution
```hawkejs
<% $0.classList.add('active') %>   {# $0 = current element #}
<% let x = 5 + 3 %>                {# execute arbitrary JS #}
```

### Attribute Binding
```hawkejs
<my-element
    attr={% variable %}            {# HTML attribute #}
    #prop={% variable %}           {# JavaScript property binding #}
    !Route="Controller#action"     {# helper directive example #}
    +param="value"                 {# directive parameter #}
></my-element>
```

### Other
```hawkejs
{%t "translation_key" %}           {# translation #}
{# this is a comment #}
```

## Helpers & Directives

Helpers are classes that provide template functionality. Hawkejs has no built-in helpers - they are provided by the application (e.g., AlchemyMVC adds Router, Alchemy helpers).

Directives are helper methods invoked via `!` attributes, with `+` for parameters:

```hawkejs
{# Example: Alchemy's Router helper generates href from route name #}
<a !Route="Blogpost#view" +slug={% post.slug %}>View post</a>
{# Renders to: <a href="/blog/my-post">View post</a> #}
```

## Custom Elements

Elements are web components that work on both server and client:

```javascript
const MyElement = Function.inherits('Hawkejs.Element', function MyElement() {});

MyElement.setTemplateFile('elements/my_element');

// Attributes (reflected to HTML)
MyElement.setAttribute('item-id');

// Assigned properties (passed from parent, not reflected)
MyElement.setAssignedProperty('item');

// Methods available in template via self.methodName()
MyElement.setMethod(function getTitle() {
    return this.item?.title || 'Untitled';
});

// Client-side lifecycle - called when element enters DOM
MyElement.setMethod(function introduced() {
    this.onEventSelector('click', '.btn', e => this.handleClick(e));
});

// Re-render element (calls prepareRenderVariables, then renders)
MyElement.setMethod(async function refresh() {
    await this.rerender();
});
```

## Exposing Data to Client

```javascript
// Server-side: expose data to be available on the client
renderer.expose('my-data', {foo: 'bar'});

// Client-side: access exposed data
let data = hawkejs.scene.exposed['my-data'];
```

Static exposed data (same for all requests) goes in `_hawkejs_static_expose`. Request-specific data (like logged-in user) goes in `renderer.expose_to_scene`.

## Key Classes

- **Hawkejs** (`lib/core/hawkejs.js`) - Main instance, manages templates
- **Renderer** (`lib/core/renderer.js`) - Renders templates to HTML
- **Scene** (`lib/client/scene.js`) - Client-side singleton managing page state, exposed data, and navigation. Access via `hawkejs.scene`
- **Variables** (`lib/core/variables.js`) - Scoped variable storage with parent chain
- **Helper** (`lib/core/helper.js`) - Base class for template helpers. Can define `onScene(scene, renderer)` static method for client-side initialization
- **CustomElement** (`lib/element/custom_element.js`) - Base for custom elements

**Built-in elements:** `<he-block>`, `<he-placeholder>`, `<he-dynamic>`, `<he-dialog>`, `<he-context-menu>`

## Directory Structure

```
lib/
├── core/           # Core classes (Hawkejs, Renderer, Template, Helper)
├── element/        # Custom element base classes
├── expression/     # Template expressions (if, each, block, etc.)
├── parser/         # Template parser
├── dom/            # Virtual DOM implementation
├── client/         # Browser-specific code
└── server/         # Server-specific code
```

## Gotchas

1. **`{% each %}` order** - Key/index first, value second: `{% each arr as i, item %}`

2. **Output syntax:**
   - `{{ }}` - Text output (HTML-escaped, safe)
   - `{% %}` - Attribute values and expressions
   - `{%= %}` - Raw HTML output (unescaped, dangerous)

3. **Valid HTML required** - Templates are parsed as HTML; invalid markup causes errors

4. **`$0` in `<% %>`** - References the current element being processed

5. **Variable scope** - Variables set inside loops/blocks don't leak outward

6. **Async rendering** - `renderer.render()` returns a Pledge; always await it

7. **`emptyhtml` operator** - Checks if HTML has no visible content (different from falsy check)

8. **`Variables` class** - Uses internal Map storage; `Object.keys()` returns empty. Use `.get(key)`, `.has(key)`, or `.toJSON()` to access data

9. **`introduced()` fires once** - Use `reconnected()` for subsequent DOM insertions, `connected()` for every attachment

10. **`rerender()` cancels in-flight renders** - Calling `rerender()` while rendering cancels the previous render

11. **Sub-renderers share root state** - `styles`, `scripts`, `expose_to_scene` are proxied to root renderer

12. **Slot children removed during render** - Slotted children are temporarily extracted during template rendering

13. **`print()` parses HTML, `printUnsafe()` escapes** - Names are counterintuitive; `print()` is dangerous with user input

14. **`{% markdown %}` has no sanitization** - Never use with untrusted input; XSS vector

15. **`expose()` data is in page source** - Never expose tokens or sensitive data; it's serialized into HTML

16. **`introduced()` is async** - Fires via `sceneReady()`, not synchronously after DOM insertion

17. **`setAssignedProperty('foo')` creates callback** - Automatically calls `onFooAssignment(newVal, oldVal)` if defined

18. **`element.emit()` is client-only** - Events don't dispatch during SSR

19. **`Element.setAttribute()` (static) defines attributes** - Not the DOM method; use `this.setAttribute()` for DOM manipulation

20. **`scene.exposed` persists across navigations** - Old values remain unless explicitly overwritten

21. **`appears()` with `live: true` leaks** - Event listeners and intervals never cleaned up

22. **`introduced()` has retry limit** - Under load, retries 10 times then silently gives up

23. **Template errors return `undefined`** - `Template.interpret()`/`render()` swallow errors; check for undefined results

24. **`{{ }}` only for text content** - Use `{% %}` in attributes: `<div class={% var %}>` not `<div class="{{ var }}">`

25. **`{% elseif %}` not `{% else if %}`** - Space creates two separate statements

26. **`querySelector` on custom elements may trigger render** - Elements with templates render synchronously when queried

27. **`addElementGetter()` caches until rerender** - DOM changes externally won't update cached references
