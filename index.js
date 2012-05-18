var burrito = require('burrito');
var json = typeof JSON === 'object' ? JSON : require('jsonify');
var vm = require('vm');
var EventEmitter = require('events').EventEmitter;

var exports = module.exports = function (src, opts) {
    if (typeof src === 'function') {
        src = '(' + src.toString() + ')()';
    }
    else if (src) {
        src = src.toString();
    }
    
    var stack = new Stack();
    if (src) stack.include(src, opts);
    return stack;
};

exports.Stack = Stack;

function Stack () {
    this.sources = [];
}

Stack.prototype.include = function (src, opts) {
    if (!opts) opts = {};
    
    if (typeof src === 'object') {
        opts = src;
    }
    else {
        opts.source = src;
    }
    
    if (!opts.filename) {
        opts.filename = '(memory#' + Math.floor(
            Math.random() * Math.pow(2,32)
        ).toString(16) + ')';
    }
    
    this.sources.push(opts);
};

Stack.prototype.compile = function (context, opts) {
    var self = this;
    var compiled = new EventEmitter;
    
    if (!context) context = {};
    if (!opts) opts = {};
    if (opts.stoppable === undefined) opts.stoppable = true;
    
    compiled.context = context;
    var nodes = compiled.nodes = [];
    
    var names = compiled.names = {
        call : burrito.generateName(6),
        stat : burrito.generateName(6),
        fn : burrito.generateName(6),
        stopped : burrito.generateName(6),
        exception : burrito.generateName(6),
        anonymous : burrito.generateName(6)
    };
    
    var stack = compiled.stack = [];
    var stacks = {};
    
    context[names.call] = function (ix, that, fn, args) {
        var node = nodes[ix];
        stack.unshift(node);
        var stack_ = stacks[ix] = stack.slice();
        
        function wrap (f) {
            if (typeof f !== 'function') return f;
            
            var f_ = function () {
                stack.splice(0);
                stack.push.apply(stack, stack_);
                if (f.apply) {
                    return f.apply(this, arguments);
                }
                else {
                    return apply(f, this, arguments);
                }
            };
            for (var key in f) f_[key] = wrap(f[key]);
            return f_;
        }
        
        for (var i = 0; i < args.length; i++) {
            args[i] = wrap(args[i])
        }
        
        var res;
        if (that) {
            res = that[fn].apply
                ? that[fn].apply(that, args)
                : apply(that[fn], that, args)
            ;
        }
        else if (opts.hasOwnProperty('global')) {
            res = fn.apply
                ? fn.apply(opts.global, args)
                : apply(fn, opts.global, args)
            ;
        }
        else {
            res = fn.apply
                ? fn.apply(that, args)
                : apply(fn, that, args)
            ;
        }
        
        stack.shift();
        return res;
    };
    
    context[names.fn] = function (ix, fn) {
        var node = nodes[ix];
        
        return function () {
            // already on the stack from `names.call`
            var already = stack[0] && stack[0].name === 'call'
                && stack[0].functionName
                && stack[0].functionName === node.functionName
            ;
            
            if (!already) stack.unshift(node);
            var res = fn.apply
                ? fn.apply(this, arguments)
                : apply(fn, this, arguments);
            ;
            if (!already) stack.shift();
            return res;
        };
    };
    
    context[names.exception] = function (ix, err) {
        compiled.emit('error', err, {
            stack : stacks[ix] || stack.slice(),
            current : compiled.current
        });
        return !stopped;
    };
    
    var intervals = [];
    var timeouts = [];
    var stopped = false;
    
    if (opts.stoppable) {
        context.setInterval = function () {
            var iv = setInterval.apply
                ? setInterval.apply(this, arguments)
                : apply(setInterval, this, arguments)
            ;
            intervals.push(iv);
            return iv;
        };
        
        context.clearInterval = function (iv) {
            var res = clearInterval.apply
                ? clearInterval.apply(this, arguments)
                : apply(clearInterval, this, arguments)
            ;
            var i = intervals.indexOf(iv);
            if (i >= 0) intervals.splice(i, 1);
            return res;
        };
        
        context.setTimeout = function () {
            var to = setTimeout.apply
                ? setTimeout.apply(this, arguments)
                : apply(setTimeout, this, arguments)
            ;
            timeouts.push(to);
            return to;
        };
        
        context.clearTimeout = function (to) {
            var res = clearTimeout.apply
                ? clearTimeout.apply(this, arguments)
                : apply(clearTimeout, this, arguments)
            ;
            var i = timeouts.indexOf(to);
            if (i >= 0) timeouts.splice(i, 1);
            return res;
        };
        
        compiled.stop = function () {
            stopped = true;
            intervals.forEach(function (iv) { clearInterval(iv) });
            timeouts.forEach(function (to) { clearTimeout(to) });
        };
    }
    else {
        compiled.stop = function () {
            throw new Error('execution not stoppable')
        };
    }
    
    compiled.current = null;
    context[names.stat] = function (i) {
        if (stopped) throw names.stopped;
        else compiled.current = nodes[i];
    };
    
    var ex = function (ix, s) {
        return 'try {' + s + '}'
        + 'catch (err) {'
            + 'if (err !== ' + json.stringify(names.stopped) + ') {'
                + 'if (' + names.exception + '(' + ix + ', err)) throw err'
            + '}'
        + '}'
    };
    
    function wrapper (filename, node, source) {
        var wrapper_ = function (n) { return wrapper(filename, n, source) };
        node.filename = filename;
        var ix = nodes.push(node) - 1;
        
        if (node.name === 'call') {
            node.functionName = burrito.label(node);
            
            var that = null;
            var fn = null;
            
            if (node.value[0][0] === 'name') {
                fn = node.value[0][1];
            }
            else if (node.value[0][0] === 'dot') {
                fn = json.stringify(node.value[0][node.value[0].length-1]);
                that = burrito(node.value[0][1], wrapper_).replace(/;$/, '');
            }
            else if (node.value[0][0].name === 'function') {
                // terrible hackfix for self-executing functions:
                if (node.value[0][1] === null) {
                    node.value[0][1] = names.anonymous;
                }
                
                fn = burrito(
                    [ node.value[0][0].name ].concat(node.value[0].slice(1)),
                    wrapper_
                ).replace(/;$/, '');
            }
            else {
                fn = burrito(node.value[0], wrapper_).replace(/;$/, '');
            }
            
            var args = burrito([ 'array', node.value[1] ], wrapper_)
                .replace(/;$/, '');
            node.wrap(
                names.call + '(' + ix + ',' + that + ',' + fn + ',' + args + ')'
            );
        }
        else if (node.name === 'stat' || node.name === 'throw') {
            node.wrap('{' + names.stat + '(' + ix + ');%s}');
        }
        else if (node.name === 'function') {
            node.functionName = burrito.label(node);
            var original = 'function ' + source.slice(
                node.start.pos, node.end.pos + 1
            );
            node.wrap(function (s) {
                var name = burrito.generateName(6);
                return '(function () {'
                    + 'var ' + name + ' = function () {'
                        + ex(ix, 'return ' + names.fn
                            + '(' + ix + ',' + s + ')'
                            + '.apply(this, arguments)'
                        ) + '};'
                    + name + '.toString = function () {'
                        + 'return ' + json.stringify(original)
                    + '};'
                    + 'return ' + name
                    + '})()'
                ;
            });
        }
        else if (node.name === 'defun') {
            var name = node.value[0];
            var vars = node.value[1].join(',');
            node.functionName = name;
            var original = 'function ' + source.slice(
                node.start.pos, node.end.pos + 1
            );
            
            node.wrap(function (s) {
                var src = s.replace(
                    /^function[^\(]*([^{]*\{)/,
                    function (_, x) { return 'function ' + x }
                );
                
                return '{'
                    + 'function ' + name + '(' + vars + '){'
                    + ex(ix, 'return ' + names.fn
                        + '(' + ix + ',' + src + ').apply(this, arguments)'
                    )
                    + '}; '
                    + name + '.toString = function () {'
                        + 'return ' + json.stringify(original)
                    + '}'
                    + '};'
                ;
            });
        }
    }
    
    compiled.source = (function () {
        var xs = [];
        for (var i = 0; i < self.sources.length; i++) {
            var s = self.sources[i];
            try {
                var src = burrito(
                    s.preFilter ? s.preFilter(s.source) : s.source,
                    function (n) { return wrapper(s.filename, n, s.source) }
                );
                xs.push(s.postFilter ? s.postFilter(src) : src);
            }
            catch (err) {
                process.nextTick(function () {
                    compiled.emit('error', err, {
                        stack : stack.slice(),
                        current : compiled.current
                    });
                });
            }
        }
        return xs.join('\n');
    })();
    
    return compiled;
};

Stack.prototype.run = function (context, opts) {
    if (!opts) opts = {};
    var runner = opts.runner || vm.runInNewContext;
    var self = this.compile(context || {}, opts);
    
    var _stop = self.stop;
    self.stop = function () {
        self.removeAllListeners('error');
        self.on('error', function () {});
        _stop();
        self.emit('stop');
    };
    
    process.nextTick(function () {
        try {
            var res = runner(
                '(function () {' + self.source + '})()',
                self.context
            );
            self.emit('result', res);
        }
        catch (err) {
            self.emit('error', err, {
                stack : self.stack.slice(),
                current : self.current
            });
        }
    });
    
    return self;
};

function apply (fn, that, args) {
    switch (args.length) {
        case 0 : return fn()
        case 1 : return fn(args[0])
        case 2 : return fn(args[0], args[1])
        case 3 : return fn(args[0], args[1], args[2])
        default :
            var sig = [];
            for (var i = 0; i < args.length; i++) sig.push('args[' + i + ']');
            return Function(
                [ 'fn', 'args' ],
                'return fn(' + sig.join(',') + ')'
            )(fn, args);
    }
}
