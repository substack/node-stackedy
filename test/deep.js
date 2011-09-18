var stackedy = require('../');
var test = require('tap').test;

var fs = require('fs');
var src = fs.readFileSync(__dirname + '/sources/deep.js', 'utf8');

test('nestDelay', function (t) {
    t.plan(2);
    var stack = stackedy(src).run({ process : process });
    
    stack.on('error', function (err, c) {
        t.equal(err, 'moo');
        t.deepEqual(
            c.stack.map(function (s) { return s.functionName }),
            [ null, 'zzz', null, 'yyy', 'xxx', 'setTimeout', 'h', 'g', 'f' ]
        );
        t.end();
    });
});
