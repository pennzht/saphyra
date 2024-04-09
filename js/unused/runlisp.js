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
    const sexp = parseOne(t);
    console.log (sexp);
    const res = evaluate(sexp);
    $('output').innerText += res;
}
