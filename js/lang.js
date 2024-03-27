// Sexp operations. Sync with sexp.js

function parse (input) {
    input = input.replaceAll ('(', ' [ ');
    input = input.replaceAll (')', ' ] ');
    input = input.replaceAll ('[', ' [ ');
    input = input.replaceAll (']', ' ] ');
    input = input.trim();
    if (input.length === 0) return [];
    input = input.split(/[ \t\n]+/);
    input = input.map((token) => (
        token === '[' ? token :
            token === ']' ? token + ',' :
            '"' + token + '",'))
        .join(' ');
    input = '[' + input + ']';
    input = input.replaceAll (/, *\]/g, ' ]');
    return JSON.parse (input);
}

function translateLiteral(expr) {
  if (expr instanceof Array) {
    return expr.map(translateLiteral);
  } else if (typeof(expr) === 'string') {
    if (expr.match(/^[-]?[0-9]+$/)) return BigInt(expr);
    if (['true', 'false', 'null'].includes(expr)) return {'true': true, 'false': false, 'null': null}[expr];
    return expr;
  } else {
    return expr;
  }
}

function deepParse(input) { return translateLiteral(parse(input)); }

/// Performs a simple match between pattern and sexp.
function simpleMatch (pattern, sexp) {
    if (isVar (pattern)) {
        return {success: true, map: new Map([[pattern, sexp]])};
    } else if (isAtom (pattern)) {
        if (eq (pattern, sexp)) {
            return {success: true, map: new Map([])};
        } else {
            return {success: false, cause: `${pattern} -> ${sexp} atom_mismatch`};
        }
    } else {
        // isList
        if (isAtom (sexp)) {
            return {success: false, cause: `${pattern} -> ${sexp} atom`};
        } else if (pattern.length !== sexp.length) {
            return {success: false, cause: `${pattern} -> ${sexp} length_mismatch`};
        } else {
            var totalMatch = {success: true, map: new Map([])};
            for (var i = 0; i < pattern.length; i++) {
                const match = simpleMatch (pattern[i], sexp[i]);
                combineMatch (totalMatch, match);
                if (! totalMatch.success) {
                    return totalMatch;
                }
            }
            return totalMatch;
        }
    }
}

function combineMatch (oldMatch, newMatch) {
    if (! oldMatch.success) return;
    if (! newMatch.success) {
        oldMatch.success = false;
        oldMatch.cause = newMatch.cause;
        return;
    }
    for (const x of newMatch.map.keys ()) {
        if (oldMatch.map.has(x)) {
            if (eq(oldMatch.map.get(x), newMatch.map.get(x))) { /*good*/ }
            else {
                oldMatch.success = false;
                oldMatch.cause = `${x} -> ${oldMatch.map.get(x)}, ${newMatch.map.get(x)}`;
                return;
            }
        } else {
            oldMatch.map.set(x, newMatch.map.get(x));
        }
    }
}

function replaceAll (sexp, map) {
    if (isAtom (sexp)) {
        return map.has (sexp) ? map.get(sexp) : sexp;
    } else {
        return sexp.map ((child) => replaceAll (child, map));
    }
}

/// If two sexps are equal.
function eq (a, b) {
    return str(a) === str(b);
}

// Sexp to string.
function str (obj) {
    if (isAtom(obj)) return obj;
    else return '[' + obj.map (str).join(' ') + ']';
}

function isVar (obj) { return isAtom(obj) && obj.startsWith('_'); }

function isAtom (obj) { return typeof obj === 'string'; }

function isList (obj) { return ! isAtom (obj); }

console.log (
    simpleMatch (
        parse ('[_A _B [and _A _B]]'),
        parse ('[_x:P [-> _x:P _y:P] [and _x:P [-> _x:P _y:P]]]'),
    )
);
