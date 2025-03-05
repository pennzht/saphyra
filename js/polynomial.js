Q = (...args) => document.querySelectorAll(...args);

Global = {data: 0n};

function setData (newData) {
    Global.data = newData;
    $('display').innerHTML = '';
    $('display').innerText = str (Global.data);
}

function Mod (m, n) {return {modified: m, value: n}}

function _makeConsts(expr) {
    if (typeof (expr) === 'string' && expr.match(/^[0-9]+$/g)) {
        return BigInt (expr);
    }
    if (typeof (expr) === 'string') return expr;
    return expr.map (_makeConsts);
}

function infixParseWConsts (expr) { return _makeConsts (infixParse (expr)); }

function addFlatten (e) {
    if (! isList(e) || e[0] !== '+') return Mod (false, e);

    const ans = ['+'];
    let modified = false;
    for (const p of e.slice(1)) {
        if (isList(p) && p[0] === '+') {
            modified = true;
            for (const pp of p.slice(1)) ans.push(pp);
        } else ans.push(p);
    }

    return Mod (modified, ans);
}

/* function addSort (e) {
    if (! isList(e) || e[0] !== '+') return Mod(false, e);

    const part = e.slice(1);
    const m = sortTerms(part);
    if (m.modified) return Mod(true, ['+', ...m.value]);
    else return Mod (false, e);
} */

function addCombine (e) {
    if (! isList(e) || e[0] !== '+') return Mod(false, e);

    const parts = [];

    function coeffTerm (a) {
        if (typeof a === 'bigint') return [a, 1n];
        if (isList(a) && a[0] === '*') {
            if (typeof a[1] === 'bigint') {
                let tail = ['*', ... a.slice(2)];
                if (tail.length <= 1) tail = 1n;
                else if (tail.length <= 2) tail = tail[1];
                return [a[1], tail];
            } else {
                return [1n, a];
            }
        }
        return [1n, a];
    }

    let coeffs = {};
    let partInst = {};

    for (const p of e.slice(1)) {
        const [c, t] = coeffTerm (p);
        const s = str(t);
        if (partInst[s]) {
            coeffs[s] += c;
        } else {
            partInst[s] = t;
            coeffs[s] = c;
        }
    }

    const ans = ['+'];
    const keys = Object.keys(partInst);
    keys.sort();
    for (const s of keys) {
        const c = coeffs[s], t = partInst[s];
        if (eq (t, 1n)) {
            ans.push (c);
        } else if (c === 1n) {
            ans.push (t);
        } else {
            ans.push (['*', c, t]);
        }
    }

    return Mod (! eq(ans, e), ans);
}

function multFlatten (e) {
    if (! isList(e) || e[0] !== '*') return Mod (false, e);

    const ans = ['*'];
    let modified = false;
    for (const p of e.slice(1)) {
        if (isList(p) && p[0] === '*') {
            modified = true;
            for (const pp of p.slice(1)) ans.push(pp);
        } else ans.push(p);
    }

    return Mod (modified, ans);
}

function multCombine (e) {
    if (! isList(e) || e[0] !== '*') return Mod(false, e);

    const parts = [];

    function exptBase (a) {
        if (typeof a === 'bigint') return [a, '!const'];
        if (isList(a) && a[0] === '^') {
            return [a[2], a[1]];
        }
        return [1n, a];
    }

    let coeffs = {'!const': 1n};
    let partInst = {'!const': '!const'};

    for (const p of e.slice(1)) {
        const [c, t] = exptBase (p);
        const s = str(t);

        if (t === '!const') {coeffs['!const'] *= c; continue;}

        if (partInst[s]) {
            coeffs[s] += c;
        } else {
            partInst[s] = t;
            coeffs[s] = c;
        }
    }

    const ans = ['*'];
    const keys = Object.keys(partInst);
    keys.sort();
    for (const s of keys) {
        const c = coeffs[s], t = partInst[s];
        if (eq (s, '!const')) {
            if (c !== 1n) ans.push (c);
        } else if (c === 1n) {
            ans.push (t);
        } else {
            ans.push (['^', t, c]);
        }
    }

    return Mod (! eq(ans, e), ans);
}

function multDistr (e) {
    function getTerms (a) {
        if (isList (a) && a[0] === '+') return a.slice(1);
        return [a];
    }

    if (isList(e) && e[0] === '*' && e.length >= 3) {
        const termsList = e.slice(1).map (getTerms);
        if (termsList.every ((a) => a.length === 1)) {
            return Mod (false, e);
        }

        const ans = ['+'];

        const indices = termsList.map ((a) => 0);
        while (indices[0] < termsList[0].length) {
            const thisTerm = ['*'];
            for (let i = 0; i < indices.length; i++) {
                thisTerm.push (termsList[i][indices[i]]);
            }
            ans.push(thisTerm);

            // increase indices

            for (let i = indices.length-1; i >= 0; i--){
                indices[i] ++;
                if (i > 0 && indices[i] < termsList[i].length) break;
                if (i > 0) indices[i] = 0;
            }
        }

        return Mod (true, ans);
    }

    return Mod (false, e);
}

function expandExpt (e) {
    if (isList(e) && e[0] == '^' &&
        isList(e[1]) && e[1][0] == '+' &&
        typeof e[2] === 'bigint' && e[2] > 1n){
        // convert
        const ans = ['*'];
        for (let i=0n; i<e[2]; i++) {
            ans.push (e[1]);
        }
        return Mod (true, ans);
    }
    return Mod (false, e);
}

function normalizeSimp (e) {
    if (isList(e)) {
        if (e[0] === '+' && e.length === 1) {
            return Mod (true, 0n);
        } else if (e[0] === '+' && e.length === 2) {
            return Mod (true, e[1]);
        } else if (e[0] === '*' && e.length === 1) {
            return Mod (true, 1n);
        } else if (e[0] === '*' && e.length === 2) {
            return Mod (true, e[1]);
        } else if (e[0] === '^' && e[1] === 1n) {
            return Mod (true, 1n);
        } else if (e[0] === '^' && e[2] === 0n) {
            return Mod (true, 1n);
        } else if (e[0] === '^' && e[2] === 1n) {
            return Mod (true, e[1]);
        }
    }
    return Mod (false, e);
}

function exptR1 (e) {
    if (isList (e) && e[0] == '^' && isList(e[1]) && e[1][0] == '*' && e[1].length >= 3) {
        // Expand by rule 1

        return Mod(true,  ['*', ... e[1].slice(1).map ((t) => ['^', t, e[2]])]);
    }
    return Mod (false, e);
}

function exptR2 (e) {
    if (isList (e) && e[0] == '^' && isList (e[1]) && e[1][0] == '^') {
        return Mod (true, ['^', e[1][1], ['*', e[1][2], e[2]]]);
    }
    return Mod (false, e);
}

function arith (e) {
    if (isList (e) && ['+', '*', '^'].includes (e[0])) {
        if (e[0] === '+') {
            return Mod (true, e.slice(1).reduce ((a, b) => a+b));
        } else if (e[0] === '*') {
            return Mod (true, e.slice(1).reduce ((a, b) => a*b));
        } else if (e[0] === '^') {
            return Mod (true, e[1] ** e[2]);
        }
    }
    return Mod (false, e);
}

function sortTerms (arr) {
    const arrWStr1 = arr.map ((a) => [a, str(a)]);
    const arrWStr2 = arrWStr1.concat();
    arrWStr2.sort((a, b) => {
        if (a[1] < b[1]) return -1;
        if (a[1] > b[1]) return +1;
        return 0;
    });
    let modified = false;
    for (let i=0;i<arr.length;i++) {
        if (arrWStr1[i] !== arrWStr2[i]) {
            modified = true; break;
        }
    }
    const sarr = arrWStr2.map ((a) => a[0]);
    return Mod (modified, sarr);
}

/*
General format;
expr = [+ const(nat) term1 ... termN]
term = [* coeff(nat) [^ base1 exp1] [^ base2 exp2] ... [^ baseN expN]]
base, exp : expr

sum normalization: combine like terms
term normalization: combine like powers
exponentiation normalization: move powers as high as possible; split out constant exponents
    (a b) ^ n ⇒ a^n b^n
    (a ^ n) ^ m ⇒ a ^ (nm)
    a ^ n · a ^ m ⇒ a ^ (n+m)
    a ^ (n+K) ⇒ a ^ n · a ^ K
    expand (a + b) ^ K
*/

$('text').oninput = (e) => {
    setData (infixParseWConsts (e.target.value));
}

FNS = [
    ['addFlatten', addFlatten],
    ['addCombine', addCombine],
    ['multFlatten', multFlatten],
    ['multCombine', multCombine],
    ['multDistr', multDistr],
    ['normalizeSimp', normalizeSimp],
    ['expandExpt', expandExpt],
    ['exptR1', exptR1],
    ['exptR2', exptR2],
    ['arith', arith],
];

function firstIterate (fn, data) {
    if (isList(data)) {
        for (let i = 1; i < data.length; i++) {
            const m = fn (data[i]);
            if (m.modified) {
                return Mod (true, [... data.slice (0, i), m.value, ... data.slice(i+1)]);
            }
        }
    }
    return fn (data);
}

function executeFn (fn) {
    const m = firstIterate (fn, Global.data);
    console.log (m);
    if (m.modified) {
        setData (m.value);
    }
}

for (const [name, fn] of FNS) {
    const button = document.createElement('input');
    button.setAttribute ('type', 'button');
    button.setAttribute ('value', name);
    button.onclick = () => {executeFn (fn)};
    $('fns').appendChild(button);
}
