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

