stackedy
========

Roll your own stack traces and control program execution through AST
manipulation.

[![build status](https://secure.travis-ci.org/substack/node-stackedy.png)](http://travis-ci.org/substack/node-stackedy)

examples
========

simple custom stacktrace
------------------------

example/simple/run.js:

````javascript
var stackedy = require('stackedy');
var fs = require('fs');

var src = fs.readFileSync(__dirname + '/src.js');
var stack = stackedy(src, { filename : 'stax.js' }).run();

stack.on('error', function (err, c) {
    stack.stop();
    console.log('Error: ' + err);
    
    var cur = c.current;
    console.log('  in ' + cur.filename + ' at line ' + cur.start.line);
    
    c.stack.forEach(function (s) {
        console.log('  in ' + s.filename + ', '
            + s.functionName + '() at line ' + s.start.line
        );
    });
});
````

output:

    Error: moo
      in stax.js at line 2
      in stax.js, h() at line 1
      in stax.js, g() at line 0
      in stax.js, f() at line 4

methods
=======

````javascript
var stackedy = require('stackedy');
````

var stack = stackedy(src='', opts={})
-------------------------------------

Create a new stack object.

stack.include(src, opts={})
---------------------------

Include a source file body `src` into the current bundle.

`opts.filename` will augment the stack with filename information.

`opts.postFilter` transforms the source after transformation.

`opts.preFilter` transforms the source before transformation.

stack.run(context={}, opts)
---------------------------

Execute the compiled source with the given context using `vm.runInNewContext()`.

`opts.stoppable` defaults to `true` and controls whether the execution can be
stopped with `.stop()`.

`opts.runner(src, context)` is the function used to run the transformed source.
It defaults to `vm.runInNewContext`.

`opts.global` is the context to use when `this` is `null`, such as `window` in a
browser environment.

stack.compile(context={}, opts)
-------------------------------

Compile the sources into a single file with the transformations in place.

Returns an object with source, augmented context, current and others.

`opts.stoppable` controls whether the execution can be stopped with `.stop()`.
