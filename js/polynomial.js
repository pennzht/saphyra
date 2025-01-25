Q = (...args) => document.querySelectorAll(...args);

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

function addSort (e) {
    if (! isList(e) || e[0] !== '+') return Mod(false, e);

    const part = e.slice(1);
    const m = sortTerms(part);
    if (m.modified) return Mod(true, ['+', ...m.value]);
    else return Mod (false, e);
}

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

    function alike (a, b) {
        let [cA, tA] = coeffTerm(a);
        let [cB, tB] = coeffTerm(b);
        return eq (tA, tB);
    }

    function mergeTerms (a, b) {
        let [cA, tA] = coeffTerm(a);
        let [cB, tB] = coeffTerm(b);
        return ['*', (cA + cB), tA];
    }

    for (const p of e.slice(1)) {
        if (parts.length > 0 && alike (parts.at(-1), p)) {
            parts.push (mergeTerms(parts.pop(), p));
        } else parts.push(p);
    }

    return ['+', ...parts];
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

$('text').oninput = (e) => {
    $('display').innerHTML = '';
    $('display').appendChild (infixFormat (infixParseWConsts (
        e.target.value
    )));
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

