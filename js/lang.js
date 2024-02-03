function strMult (string, copies) {
    const ans = [];
    for (var i = 0; i < copies; i++) ans.push (string);
    return ans.join ('');
}

console.log (strMult ('hello, world!\n', 10));

// Parsing a sexp, using only square brackets

function parseSexp (input) {
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

