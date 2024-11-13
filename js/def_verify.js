// Verification of 'def' rules.

// For simplicity: we allow "clearly ∃!" definitions, in the form of
// ∀v1 ∀v2 ... ∀vN FunctionSymbol[v1, v2, ..., vN] = (expr. involving v1, v2, ..., vN)
// where all fn symbols on the RHS are already defined

// Returns {success: bool, reason, functionSymbol, prereqs}

function judgeDefiningRule (
  pStmt,  // property statement
  eStmt = null,  // existential statement: TODO
) {
  let functionSymbol = null;
  
  // eStmt example ∀x ∀y ∃!z: z = x + y
  // pStmt example ∀x ∀y sum(x, y) = x + y

  // eStmt example ∀P ∀x ∀y ∃!z: (P and x = z) or (not P and y = z)
  // pStmt example ∀P ∀x ∀y (P and x = If[P, x, y]) or (not P and y = If[P, x, y])

  // Conditions:
  // [1] No free variables anywhere
  // [2] Prefixed by ∀v1 ∀v2 ... ∀vN
  // [3] eStmt inner: ∃! valfn
  // [4] pStmt inner: valfn @ FunctionSymbol[v1, v2, ..., vN]

  // Priority conditions:
  // [11] All "non-_, non-builtin" atoms must be predefined
  // [12] Defines a "defined" statement.

  ////////////////////////////////////////////////////////////////
  // Test free variables

  if (getFreeVars (pStmt).length > 0) {
    return {success: false, reason: '#err/free-vars-in-stmt'};
  }

  // Extract varnames

  const vars = [];
  while (true) {
    const m = simpleMatch (['forall', [':', '_v', '_body']], pStmt);
    if (m.success) {
      const vn = m.map.get('_v'), body = m.map.get('_body');
      if (vars.includes(vn)) return {success: false, reason: '#err/duplicate-var-names'};
      vars.push(vn);
      pStmt = body;
    } else break;
  }

  // Test if format expected.

  const eqm = simpleMatch (
    /*pattern*/ ['=', '_lhs', '_rhs'],
    /*body*/ pStmt,
  );

  if (! eqm.success) return {success: false, reason: '#err/stmt-not-equality'};
  const lhs = eqm.map.get('_lhs'), rhs = eqm.map.get('_rhs');
  if (isList (lhs) && eq(lhs.slice(1), vars) && isAtom(lhs[0]) && ! isVar(lhs[0])) {
    functionSymbol = lhs[0];
  } else return {success: false, reason: '#err/lhs-syntax-error'};

  // Collect all function symbols in RHS.

  const atoms = getAllAtoms (rhs);
  const builtins = [... builtinSymbols.keys(), ':', '=', 'forall', 'exists', 'exists1'];
  const consts = atoms.filter ((a) => !isVar(a) && !(builtins.includes(a)));

  if (consts.includes (functionSymbol)) return {success: false, reason: '#err/circular-def'};

  return {success: true, reason: '#good', functionSymbol, prereqs: consts};
}

/* function generateDefinition (
  inputVars,
  outputExpr,
) {
  // TODO1113
  //
  //
} */

if ('debug') {
  console.log ('is good definition', judgeDefiningRule (parseOne (
    '[forall [: _x:O [= (comp:<OOO> _x:O _y:O) (* (S _x:O) (S _y:O))]]]'
  )));

  console.log ('is good definition', judgeDefiningRule (parseOne (
    '[forall [: _x:O [forall [: _y:O [= (comp:<OOO> _x:O _y:O) (* (S _x:O) (S _y:O))]]]]]'
  )));

  console.log ('is good definition', judgeDefiningRule (parseOne (
    '[forall [: _x:O [forall [: _y:O [= (c2:<OOO> _x:O _y:O) (* (comp:<OOO> _x:O O) (S _y:O))]]]]]'
  )));

  console.log ('is good definition', judgeDefiningRule (parseOne (
    '[forall [: _x:O [= (isEven:<OP> _x:O) (isEven:<OP> _x:O)]]]'
  )));

  console.log ('is good definition', judgeDefiningRule (parseOne (
    `[forall [: _x:O [= (isEven:<OP> _x:O)
                        (exists [: _h:O (= _x:O (+ _h:O _h:O))])
    ]]]`
  )));
}
