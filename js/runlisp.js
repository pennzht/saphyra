import * as lisp from './lisp.js';
import * as lang from './lang.js';

const $ = (x) => document.getElementById(x);

const tests = [
    "(+ 3 4)",
    "(* (+ 1 2) [- 9 3])",
    "(set 1 666 [list: 333 444 555])",
    "(' a)",
    "(map: (' a) 3 (' b) 4)",
    "(set (' b) #red (map:))",
    "(if false 3 false (+ 3 1) 5)",
]

for (const t of tests) {
    const sexp = lang.parse(t)[0];
    console.log (sexp);
    const res = lisp.evaluate(sexp);
    $('output').innerText += res;
}
