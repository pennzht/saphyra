// Typing support for simply-typed lambda calculus.

// O: object; P: proposition
// <ABC>: (A, B -> C)
builtinSymbols = new Map([
  ['and', '<PPP>'],
  ['or', '<PPP>'],
  ['->', '<PPP>'],
  ['false', 'P'],
  ['true', 'P'],
  [false, 'P'],
  [true, 'P'],
  ['O', 'O'],
  ['S', '<OO>'],
  ['+', '<OOO>'],
  ['*', '<OOO>'],
  ['^', '<OOO>'],
])
// :, =, ∀, ∃ are polymorphic; needs per-case judgment.

function typeString (atom) {
  if (! isAtomic(atom)) return null;
  if (builtinSymbols.has(atom)) return builtinSymbols.get(atom);
  if (typeof atom !== 'string') return null;

  const colonLocation = atom.lastIndexOf(':');
  if (colonLocation < 0) return null;

  return atom.slice(colonLocation+1);
}

function nameAndTypeString (atom) {
  if (! isAtomic(atom)) return [atom, null];
  if (builtinSymbols.has(atom)) return [atom, builtinSymbols.get(atom)];
  if (typeof atom !== 'string') return [atom, null];

  const colonLocation = atom.lastIndexOf(':');
  if (colonLocation < 0) return [atom, null];

  return [atom.slice(0, colonLocation), atom.slice(colonLocation+1)];
}

function typeSignature (atom) {
  const ts = typeString(atom);
  if (!ts) return ts;

  const stack = [[]];
  for (const char of [...ts]) {
    if (char === '<') {
      stack.push([]);
    } else if (char === '>') {
      const last = stack.pop();
      if (stack.length <= 0) {
        return null;
      } else {
        stack[stack.length-1].push(last);
      }
    } else {
      stack[stack.length-1].push(char);
    }
  }

  while(stack.length > 1) {
    const last = stack.pop();
    stack[stack.length-1].push(last);
  }
  return stack[0][0];
}

// TODO - use actual type checking.
function wellTyped (sexp) {
  if (isAtom(sexp)) {
    return ['true', 'false'].includes (sexp) || isVar(sexp);
  } else if (sexp.length === 3) {
    const [head, a, b] = sexp;
    return ['and', 'or', '->'].includes (head) && [a, b].every (wellTyped);
  }
  return false;
}

// TODO - return the type of `sexp`, any `null` if failing.
function getType (sexp) {
  if (isAtomic(sexp)) return typeSignature(sexp);

  // Other kind: application
  if (!isList(sexp)) return null;
  if (sexp.length <= 0) return null;

  const [head, ...args] = sexp;
  const [headType, ...argsType] = sexp.map(getType);

  if (argsType.includes(null)) return null;

  // Special cases
  if (head === '=') {
    const valid = args.length === 2 && eq(argsType[0], argsType[1]);
    return valid ? 'P' : null;
  }

  if (head === ':') {
    const valid = args.length === 2;
    return valid ? argsType : null;
  }

  if (head === 'forall' || head === 'exists' || head === 'exists1') {
    if (argsType.length !== 1) return null;
    if (argsType[0].length !== 2) return null;
    return argsType[0].at(-1);
  }

  // headType = [...argsType, returnType]

  const valid = isList(headType) && eq(argsType, headType.slice(0, headType.length-1));
  return valid ? headType[headType.length-1] : null;
}

function typeToString(type) {
  if (isAtomic(type)) return type;
  else return '<' + type.map(typeToString).join('') + '>';
}

if (false) {
  console.log(`Type 1 ${str(getType(parseOne("([: _x:P [: _y:O _z:P]] false)")))}`);  // [O P]
  console.log(`Type 2 ${str(getType(parseOne("[: _x:O (+ _x:O _x:O)]")))}`);  // [O O]
  console.log(`Type 3 ${str(getType(parseOne("[: _x:P (= _x:P _x:P)]")))}`);  // [P P]
}

if (! 'debug') {
  console.log(`Type 4 ${str(getType(parseOne("(-> _x:P _x:P)")))}`);
  console.log(`Type 4 ${str(getType(parseOne("[: _x:P (-> _x:P _x:P)]")))}`);
  console.log(`Type 4 ${str(getType(parseOne("[forall [: _x:P (-> _x:P _x:P)]]")))}`);
}
