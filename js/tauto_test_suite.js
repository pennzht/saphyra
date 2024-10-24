// A test suite for tautologies. Each line is a tautology.

tautos = {
  intuitionistic: [
    'true',
    'false -> false',
    'false -> _A',
    '(true -> false) -> false',
    '_A -> ((_A -> false) -> false)',
    '_A -> _A',
    '_A -> _A -> _A',
    '_A -> _B -> _A',
    '_A -> _B -> _C -> _D -> _E -> _C',
    '_A -> _B -> (_A and _B)',
    '_A -> _B -> (_B and _A)',
    '_A -> (_A and _A)',
    '(_A and _B) -> _A',
    '(_A and _B) -> _B',
    '(_A and _B) -> (_B and _A)',
    '(_A and _B and _C and _D) -> (_C and _A and _A and _A)',
    '_A -> (_A -> _B) -> _B',
    '((_A -> _B) and _A) -> _B',
    '((_A -> _B) and (_B -> _C)) -> (_A -> _C)',
    '(((_A and _B) -> _C) and (_A -> _B) and _A) -> (_A and _B and _C)',
    '(((_A -> false) -> false) -> false) -> (_A -> false)',
    '_A -> (_A and true)',
    '(_A and true) -> _A',
    'true and true and true and true and true',
    '_A -> (_A or _B)',
    '_B -> (_A or _B)',
    '_C -> (_A or _B or _C or _D or _E)',
    '(_A or _B) -> (_B or _A)',
    '(_A or _B) -> (_B -> _C) -> (_A -> _C) -> _C',
    '(_A or _B) -> (_A -> _X) -> (_B -> _Y) -> (_Y or _X)',
    '(_A or _B or _C or _D) -> ((_D or _A) or (_C or _B))',
    '(_A and (_B or _C)) -> (_C or _A)',
    '(_A and (_B or _C)) -> ((_A and _B) or (_A and _C))',
    '(_A or (_B and _C)) -> ((_A or _B) and (_A or _C))',
    '(_A and _X) -> (_A -> _B) -> (_B and _X)',
    '(_A or _X) -> (_A -> _B) -> (_B or _X)',
    '(_X -> _A) -> (_A -> _B) -> (_X -> _B)',
    '(_B -> _X) -> (_A -> _B) -> (_A -> _X)',
    '((_A and _X) or (_Y and _Z)) -> (_A -> _B) -> ((_B and _X) or (_Y and _Z))',
    '(_A -> _B -> _C) -> ((_A and _B) -> _C)',
    '((_A and _B) -> _C) -> (_A -> _B -> _C)',
    '(_A -> _A -> _B) -> (_A -> _B)',
    '(((_A -> false) or _A) -> false) -> false',
    '_A -> (false or _A)',
    '(false or _A) -> _A',
    '(_A -> false) -> (_A -> _B)',
    '_A = _A',
    'true = true',
    'false = false',
    '(_A = _A) = true',
    '(_A = _B) -> (_A -> _B)',
    '(_A = _B) -> (_B -> _A)',
    '((_A = _B) and (_B = _C) and (_C = _D)) -> _A = _D',
    '((_A -> _B) and (_B -> _C) and (_C -> _A)) -> ((_A = _B) and (_A = _C))',
    '(_A -> false) = (_A = false)',
    '_A = (_A = true)',
    '(_A and (_B and _C)) = ((_A and _B) and _C)',
    '(_A or (_B or _C)) = ((_A or _B) or _C)',
  ],
  classical: [
    '((_A -> _B) -> _A) -> _A',
    '_A or (_A -> false)',
    '((_A -> false) -> false) -> _A',
    '(_A -> _B) -> ((_A -> false) or _B)',
    '((_A -> false) or _B) -> (_A -> _B)',
    '(_A = true) or (_A = false)',
    '(_A -> _B) or (_B -> _A)',
    '(_A = _B) or (_B = _C) or (_C = _A)',
    '((_A = _B) = _C) = (_A = (_B = _C))',
  ],
};

// parse each stmt.

function getTautologyStatements () {
  const ans = tautos.intuitionistic.concat (tautos.classical).map ((a) => infixParse(a));
  return ans;
}

function getTautologyNodes () {
  const subs = [];
  const outs = [];
  let count = 1;
  const allTautos = getTautologyStatements();
  for (const s of allTautos) {
    outs.push (s);
    const name = '#' + count;    count++;
    subs.push (['node', name, [], [s], ['join'], []]);
    subs.push (['link', name, '^c', s]);
  }
  return ['node', '#root', [], allTautos, ['join'], subs];
}
