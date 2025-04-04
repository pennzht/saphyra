// Tactics.

// `showMatchedRules` takes a `join` and a statement (e.g. an unproven statement, together with its port / block)
// and reports a few potential ways to modify the `join` to make the new module.

// `applyMatchedRule` takes a matched rule and applies it to a module, returning a new code.

// Matched rule format:
// [space, port, io, stmt, rule, map-as-list] (for block applications)
// [space, port, io, stmt, 'exact-match', other, otherIo] (for direct links)
// [space, port, io, stmt, 'add-input'] (request input from parent)
// [space, port, io, stmt, 'add-output'] (add output of proven stmt)
// [space, ----, --, ----, 'add-goal'] (add goal to prove)
// [space, ----, --, ----, 'add-goal', stmt] (add goal to prove)
// [space, port, 'in', stmt, 'impl-intro'] (apply special rule: impl-intro)

function getMatchedRules(module, trace, stmt){
  // Destruct: [...space, port, io] = trace
  // Trace is something like [#root #1 #2 #innernode in]

  const space = [...trace];
  const tail = space[space.length - 1];

  if (['in', 'out'].includes(tail)) {
    const io = space.pop();
    const port = space.pop();
    return getMatchedRulesByPort(module, space, port, io, stmt);
  } else {
    return getMatchedRulesBySpace(module, space, stmt);
  }
}

function getMatchedRulesBySpace(module, space, stmt) {
  const applicableRules = [];

  applicableRules.push([space, null, null, stmt, 'add-goal']);

  return applicableRules;
}

function getMatchedRulesByPort(module, space, port, io, stmt) {
  const applicableRules = [];

  // Check if exact match exists.

  const spaceNode = locateNode(module, space);

  // In both cases, allow beta-expansion or beta-reduction.
  applicableRules.push([
    space, port, io, stmt, 'beta-expansion-stmt',
  ]);

  applicableRules.push([
    space, port, io, stmt, 'beta-reduction-stmt',
  ]);

  if (io === 'in') {
    // Match exact outs.
    for (const sub of spaceNode[Subs]) if (sub[0] === 'node') {
      for (const out of sub[Outs]) {
        if (eq (out, stmt)) {
          applicableRules.push([
            space, port, io, stmt, 'exact-match', sub[Label], 'out'
          ]);
        }
      }
    }
    // Match parent assumptions.
    for (const assumption of spaceNode[Ins]) {
      if (eq (assumption, stmt)) {
        applicableRules.push([space, port, io, stmt, 'exact-match', '^a', 'out']);
      }
    }
    // Add input.
    applicableRules.push([space, port, io, stmt, 'add-input']);
    // Match impl.
    if (simpleMatch(parse('-> _A _B'), stmt).success) {
      // Can apply impl.
      applicableRules.push([space, port, 'in', stmt, 'impl-intro']);
    }
    // Match forall-intro.
    if (simpleMatch(parse('forall _P'), stmt).success) {
      applicableRules.push([space, port, 'in', stmt, 'forall-intro']);
    }


    // Attempt tautology.
    applicableRules.push([space, port, io, stmt, 'tauto']);
  }

  if (io === 'out') {
    // Match exact outs.
    for (const sub of spaceNode[Subs]) if (sub[0] === 'node') {
      for (const inn of sub[Ins]) {
        if (eq (inn, stmt)) {
          applicableRules.push([
            space, port, io, stmt, 'exact-match', sub[1], 'in'
          ]);
        }
      }
    }
    // Match parent assumptions.
    for (const consequent of spaceNode[Outs]) {
      if (eq (consequent, stmt)) {
        applicableRules.push([space, port, io, stmt, 'exact-match', '^c', 'in']);
      }
    }
    // Add output.
    applicableRules.push([space, port, io, stmt, 'add-output']);
  }

  // Get FOL rules possible matches.

  for (const [ruleName, [vars, ins, outs]] of allAxiomsMap.entries()) {
    const targets = io === 'in' ? outs : ins;

    for (const pattern of targets) {
      let match = simpleMatch(pattern, stmt);
      if (match.success) {
        applicableRules.push(
          [space, port, io, stmt, ruleName, [...match.map]],
        );
      }
    }
  }

  return applicableRules;
}

function applyMatchedRule(code, matchedRule, additionalArgs) {
  const [space, port, io, stmt, ruleName, ...args] = matchedRule;

  if (ruleName === 'exact-match') {
    // Add exact match.

    const [other, polarity] = args;

    let newLink;
    if (io === 'in') {
      newLink = ['link', other, port, stmt];
    } else {
      newLink = ['link', port, other, stmt];
    }

    return addBlocksToNode(code, space, [newLink]);
  }

  if (ruleName === 'add-goal') {
    const goal = parseOneLenient(additionalArgs.goalContent);
    if (!goal) return code; // Application failed

    return replaceNodeAdjustImplIntro(code, space,
                                      (node) => {
                                        const [_, label, ins, outs, justification, subs, ...__]
                                              = node;
                                        const newNode = [
                                          'node', label, ins, outs.concat([goal]),
                                          justification,
                                          subs, ...__,
                                        ];
                                        return newNode;
                                      }
                                     );
  }

  if (ruleName === 'add-output') {
    return replaceNodeAdjustImplIntro(code, space,
                                      (node) => {
                                        const [_, label, ins, outs, justification, subs, ...__]
                                              = node;
                                        const newLink = ['link', port, '^c', stmt];
                                        const newNode = [
                                          'node', label, ins, outs.concat([stmt]),
                                          justification,
                                          subs.concat([newLink]), ...__,
                                        ];
                                        return newNode;
                                      }
                                     )
  }

  if (ruleName === 'impl-intro') {
    const spaceIns = locateNode(code, space)[Ins];
    const [label1, label2] = gensyms(code, 2);
    const subBlock = ['node', label1, [...spaceIns, stmt[1]], [stmt[2]], ['join'], []];
    const mainBlock = ['node', label2, spaceIns, [stmt], ['impl-intro'], [
      subBlock,
    ]];
    const newLink = ['link', mainBlock[Label], port, stmt];
    // Connect links to imputs.
    const newIncomingLinks = spaceIns.map((i) => ['link', '^a', mainBlock[1], i]);
    return addBlocksToNode(code, space, [mainBlock, ...newIncomingLinks, newLink]);
  }

  if (ruleName === 'forall-intro') {
    const spaceIns = locateNode(code, space)[Ins];
    const newVar = genVar(getFreeVars(spaceIns), typeToString(getType(stmt[1][1])));
    const [label1, label2] = gensyms(code, 2);
    const subBlock = ['node', label1, spaceIns, [[stmt[1], newVar]], ['join'], []];
    const mainBlock = ['node', label2, spaceIns, [stmt], ['forall-intro'], [
      subBlock,
    ]];
    const newLink = ['link', mainBlock[Label], port, stmt];
    return addBlocksToNode(code, space, [mainBlock, newLink]);
  }

  if (ruleName === 'tauto') {
    // Attempts to prove by tautology.
    const newNode = tryProveTautology(stmt);
    if (newNode === null) {
      alert('Tautology tactic failed.'); return code;
    } else {
      if (eq (newNode[Outs][0], stmt)) {
        // If positive is proven ...
        const [newLabel] = gensyms(code, 1);
        const renamedNode = [...newNode];
        renamedNode[Label] = newLabel;
        const newLink = ['link', newLabel, '^c', stmt];
        return addBlocksToNode(code, space, [renamedNode, newLink]);
      } else {
        alert('This statement is always false.'); return code;
      }
    }
  }

  if (ruleName === 'beta-expansion-stmt') {
    // TODO.
    /*
      if (io === 'in') {
      return applyBeta(code, space, port, io, lam, arg, reduced, 'type-reduce');
      } else {
      return applyBeta(code, space, port, io, lam, arg, reduced, 'type-expand');
      }
    */
  }

  if (ruleName === 'beta-reduction-stmt') {
    return applyBeta(code, space, port, io, stmt);
  }

  if (ruleName === 'add-input') {
    return replaceNodeAdjustImplIntro(code, space,
                                      (node) => {
                                        const [_, label, ins, outs, justification, subs, ...__]
                                              = node;
                                        const newNode = [
                                          'node', label, ins.concat([stmt]), outs,
                                          justification,
                                          subs.concat([['link', '^a', port, stmt]]),
                                        ];
                                        return newNode;
                                      }
                                     );
  }

  // Default case: add a block

  const [replacementList] = args;

  const rule = allAxiomsMap.get(ruleName);
  [ruleVars, ruleIns, ruleOuts] = rule;

  const replacementMap = new Map(replacementList);

  // Beginning with "?" for holes. Allows better unification.
  const newSymbols = gensyms(
    code, ruleVars.length, '_?P', ''
  );
  for (const vn of ruleVars) {
    if (! replacementMap.has(vn)) {
      const typeSuffix = typeString(vn) ?
            ':' + typeString(vn) :
            '';
      const thisSymbol = newSymbols.pop() + typeSuffix;
      replacementMap.set(vn, thisSymbol);
    }
  }

  // Compute replacements.
  [ins, outs] = replaceAll([ruleIns, ruleOuts], replacementMap);

  const newNode = ['node', gensyms(code)[0], ins, outs, [ruleName], []];
  let link;
  if (io === 'in') {
    link = ['link', newNode[Label], port, stmt];
  } else {
    link = ['link', port, newNode[Label], stmt];
  }

  return addBlocksToNode(code, space, [newNode, link]);
}

function addBlocksToNode(node, path, addedBlocks) {
  if (node[0] !== 'node') {
    return node;   // No replacement
  }
  const [_, label, ins, outs, just, subs, ...__] = node;
  if (eq ([label], path)) {
    return trimId(
      [_, label, ins, outs, just, subs.concat(addedBlocks)],
    );
  } else if (path[0] === label) {
    return [_, label, ins, outs, just, subs.map((n) => addBlocksToNode(n, path.slice(1), addedBlocks))];
  } else {
    return node;
  }
}

// Replaces a `join` node, adjusting all parent impl-intro's, if there exist any.
function replaceNodeAdjustImplIntro(node, path, updateFn) {
  if (node[0] !== 'node') return node;
  const [_, label, ins, outs, just, subs, ...__] = node;
  if (eq([label], path)) {
    // Found node!
    return updateFn(node);
  } else if (path[0] === label) {
    const newSubs = subs.map((s) => replaceNodeAdjustImplIntro(s, path.slice(1), updateFn));
    if (just[0] === 'impl-intro') {
      // Adjust ins/outs.
      const [sub] = newSubs;
      const subIns = sub[Ins], subOuts = sub[Outs];
      const [[_arrow, A, B]] = outs;
      const newIns = delMember(subIns, A);
      return ['node', label, newIns, outs, just, newSubs, ...__];
    } else {
      return ['node', label, ins, outs, just, newSubs, ...__];
    }
  } else return node;
}

function locateNode(node, path) {
  const [_, label, ins, outs, just, subs, ...__] = node;
  if (eq([label], path)) {
    return node;
  } else {
    for (const sub of subs) {
      if (sub[0] === 'node' && sub[Label] === path[1]) {
        return locateNode(sub, path.slice(1));
      }
    }
  }
}

function applyBeta(code, space, port, io, stmt) {
  const redux = stmt;
  const reduced = lambdaFullReduce(stmt);

  const prior = io === 'in' ? reduced : redux;
  const posterior = io === 'in' ? redux : reduced;

  const addedBlocks = [];

  const [label1, label2] = gensyms(code, 2);

  const betaBlock = ['node', label1, [], [
    ['=', prior, posterior],
  ], ['beta'], []];
  const elimBlock = ['node', label2, [
    ['=', prior, posterior],
    prior,
  ], [
    posterior,
  ], ['equiv-elim'], []];
  // Apply links

  addedBlocks.push(
    betaBlock, elimBlock,
    ['link', betaBlock[Label], elimBlock[Label], betaBlock[Outs][0]],
  )

  if (io === 'in') {
    addedBlocks.push(
      ['link', elimBlock[Label], port, posterior]
    )
  } else {
    addedBlocks.push(
      ['link', port, elimBlock[Label], prior]
    )
  }

  return addBlocksToNode(code, space, addedBlocks);
}

/// If there are any `id` blocks connected to other blocks, remove them.
/// `id` blocks are blocks of the form [node ... [X] [X] [id] []], which are
/// used as temporary helper blocks to expose a statement.
function trimId(originalCode) {
  const originalSubs = originalCode[Subs];
  const idBlocks = originalSubs.filter((x) => isList(x) && x[0] === 'node' && x[Just].includes('id'));

  let subs = originalSubs;
  for (const block of idBlocks) {
    const idn = block[1];
    const nodesTo     = subs.filter((x) => x[0] === 'link' && x[Lto] === idn).map((x) => x[Lfrom]);
    const nodesFrom   = subs.filter((x) => x[0] === 'link' && x[Lfrom] === idn).map((x) => x[Lto]);
    const linkedParts = (nodesTo.length > 0 ? 1 : 0) + (nodesFrom.length > 0 ? 1 : 0);
    if (linkedParts === 1) {
      // Remove all dependencies.
      subs = subs.filter((x) =>
        (x[0] === 'node' && x[Label] !== idn) ||
          (x[0] === 'link' && x[Lfrom] !== idn && x[Lto] !== idn)
      );
    } else if (linkedParts === 0) {
      // pass; leave it as is for now.
    } else {
      // remove.
      const incomingNode = nodesTo[0];
      const outgoingNodes = nodesFrom;
      const stmt = block[2][0];
      subs = subs.filter((x) =>
        (x[0] === 'node' && x[Label] !== idn) ||
          (x[0] === 'link' && x[Lfrom] !== idn && x[Lto] !== idn)
      );
      // Add new linkings
      for (const n of outgoingNodes) {
        subs.push(['link', incomingNode, n, stmt]);
      }
    }
  }

  const newCode = [...originalCode];
  newCode[Subs] = subs;
  return newCode;
}

/// Constructs a `join` node using nothing but those subnodes.
/// May rename subnodes if necessary.
///
/// This function is used to generate proofs of readily-evaluable statements
/// such as [A, not B, C] |- []
/// breadcrumb NODES are used because while building evaluative nodes,
/// intermediary NODES are always built.
function autoCompleteNode(
  ins, outs, breadcrumbNodes,
) {
  const currentSubs = [];
  const statementParents = new Map();  // statement -> parent statement
  const labelToNode = new Map();  // Map of label -> renamed node

  for (let i = 0; i < breadcrumbNodes.length; i++) {
    const newNode = [...breadcrumbNodes[i]];
    newNode[Label] = '#' + i;
    labelToNode.set('#' + i, newNode);
  }

  const remainingLabels = new Set([... labelToNode.keys()]);

  // Set successful nodes.
  for (const stmt of ins) {
    statementParents.set(str(stmt), '^a');
  }

  // Try to link valid nodes.
  for (let i = 0; i < breadcrumbNodes.length; i++) {
    const nowProvenNodes = [... remainingLabels].filter((label) => {
      const node = labelToNode.get(label);
      const availableNow = node[Ins].every((stmt) => statementParents.has(str(stmt)));
      return availableNow;
    });

    if (nowProvenNodes.length === 0) {
      // No more nodes available.
      break;
    }

    for (const label of nowProvenNodes) {
      // Add pre and post links.
      const node = labelToNode.get(label);
      for (const inn of node[Ins]) {
        currentSubs.push(['link', statementParents.get(str(inn)), node[Label], inn]);
      }
      currentSubs.push(node);
      for (const out of node[Outs]) if (! statementParents.has(str(out))){
        statementParents.set(str(out), node[Label]);
      }
      remainingLabels.delete(node[Label]);
    }
  }

  let success = true;

  // No more proven. Is everything resolved?
  for (const stmt of outs) {
    if (statementParents.has(str(stmt))) {
      currentSubs.push(['link', statementParents.get(str(stmt)), '^c', stmt]);
    } else {
      success = false;
    }
  }

  // Ignore remainign nodes.
  const finalNode = [
    'node', '#', ins, outs, ['join'], currentSubs
  ];

  return {
    node: finalNode,
    success,
  };
}

// TODO - tries to construct a node that proves `stmt`.
function tryProveTautology(stmt) {
  function collectAtomicStatements(stmt, set) {
    if (['true', 'false'].includes(stmt)) {
      ;
    } else if (isList(stmt) && ['->', 'and', 'or'].includes(stmt[0])) {
      for (sub of [stmt[1], stmt[2]]) {
        collectAtomicStatements(sub, set);
      }
    } else {
      set.add(str(stmt));
    }
    return set;
  }

  // Returns a node of either stmt or (not stmt).
  // If not always-true or always-false, return null.
  // When merging nodes, just test if outs are equal.
  function proveJudgment(ins, polarities, upcoming, stmt) {
    const polarizedIns = ins.map((inn, index) => polarities[index] > 0 ? inn : ['->', inn, 'false']);

    if (upcoming.length <= 0) {
      // Can prove things.
      const res = evaluateSingleStmtWithValue(
        stmt,
        new Map(ins.map((inn, index) => [str (inn), polarities[index]])),
      );

      if (res.value !== 0) {
        const trueOut = res.value > 0 ? stmt : ['->', stmt, 'false'];
        return autoCompleteNode(polarizedIns, [trueOut], res.nodes).node;
      } else return null;
    }

    // Split into two cases and prove them separately.
    const next = upcoming[0], rest = upcoming.slice(1);
    const case1 = proveJudgment(
      ins.concat([next]), polarities.concat([+1]), rest, stmt
    );
    if (case1 === null) return null;

    const case2 = proveJudgment(
      ins.concat([next]), polarities.concat([-1]), rest, stmt
    );
    if (case2 === null) return null;

    if (! eq(case1[Outs], case2[Outs])) {
      console.log('outs mismatch');
      return null;
    }

    const judgment = case1[Outs][0];

    // Successful match.
    const branch1node = [
      'node', '#1',
      polarizedIns, [['->', next, judgment]],
      ['impl-intro'], [case1],
    ];
    const branch2node = [
      'node', '#2',
      polarizedIns, [['->', ['->', next, 'false'], judgment]],
      ['impl-intro'], [case2],
    ];
    const tnd = [
      'node',
      '#tnd', [],
      [['or', next, ['->', next, 'false']]],
      ['tnd'], [],
    ];
    const stem = [
      'node', '#0',
      [... branch1node[Outs], ... branch2node[Outs], ...tnd[Outs]],
      [judgment], ['or-elim'],
      [],
    ];

    const mergedNode = autoCompleteNode(
      polarizedIns, [judgment], [branch1node, branch2node, tnd, stem],
    );

    if (mergedNode.success) return mergedNode.node;
    return null;

    /** ['node', '#', ins, [judgment], ['join'], [
        branch1node,
        branch2node,
        ... (ins.map( (inn) => ['link', '^a', '#1', inn] )),
        ... (ins.map( (inn) => ['link', '^a', '#2', inn] )),
        tnd,
        ['node', '#0', [tnd[Outs][0], branch1node[Outs][0], branch2node[Outs][0]], [judgment], ['tnd'], []],
        ['link', '']
        ]]; **/
  }

  const atomics = [... collectAtomicStatements(stmt, new Set())];

  if (atomics.length > 6) {
    // Too many statements, stop to avoid space explosion.
    return null;
  }

  const proven = proveJudgment(
    /* ins */ [],
    /* polarities */ [],
    /* upcoming */ atomics,
    /* statement */ stmt,
  );

  if (proven === null) return null;
  const commentNode = parseOne(`[comment This tautology is proven automatically.]`);
  proven[Subs] = [commentNode, ...proven[Subs]];
  proven[Just].push('folded');
  return proven;
}

/// Example input:
/// stmt = (-> (and _A _B) _C)
/// assignments = {_A: +1, _B: -1, _C: +1}
/// Allows 0 for "unknown"; using ternary logic.
/// Returns a collection of nodes if it is provable/disprovable, together with the value of the statement.
function evaluateSingleStmtWithValue(
  stmt, assignments,
) {
  const neg = (s) => ['->', s, 'false'];

  if (assignments.has(str(stmt))) {
    return {
      nodes: [],
      value: assignments.get(str(stmt)),
    };
  } else if (stmt === 'true') {
    return {
      nodes: [['node', '#', [], ['true'], ['true-intro'], []]],
      value: +1,
    };
  } else if (stmt === 'false') {
    return {
      nodes: [ ['node', '#', [], parse(`(-> false false)`), ['impl-intro'],
                [ // subs
                  ['node', '#', ['false'], ['false'], ['id'], []],
                ],
               ] ],
      value: -1,
    };
  } else if (simpleMatch(parseOne(`(and _A _B)`), stmt).success) {
    const [_, A, B] = stmt;
    const resA = evaluateSingleStmtWithValue(A, assignments);
    const resB = evaluateSingleStmtWithValue(B, assignments);
    // For each case, generate subnodes.
    const nodes = [];
    if (resA.value === -1) {
      nodes.push(['node', '#', [neg(A)], [neg(stmt)], ['and-negate-1'], []]); // TODO: expand.
    } else if (resB.value === -1) {
      nodes.push(['node', '#', [neg(B)], [neg(stmt)], ['and-negate-2'], []]); // TODO: expand.
    } else if (resA.value === 1 && resB.value === 1) {
      nodes.push(['node', '#', [A, B], [stmt], ['and-intro'], []]);
    }
    return {
      nodes: [...resA.nodes, ...resB.nodes, ...nodes],
      value: Math.min(resA.value, resB.value),
    }
  } else if (simpleMatch(parseOne(`(or _A _B)`), stmt).success) {
    const [_, A, B] = stmt;
    const resA = evaluateSingleStmtWithValue(A, assignments);
    const resB = evaluateSingleStmtWithValue(B, assignments);
    // For each case, generate subnodes.
    const nodes = [];
    if (resA.value === 1) {
      nodes.push(['node', '#', [A], [stmt], ['or-intro-1'], []]);
    } else if (resB.value === 1) {
      nodes.push(['node', '#', [B], [stmt], ['or-intro-2'], []]);
    } else if (resA.value === -1 && resB.value === -1) {
      nodes.push(['node', '#', [neg(A), neg(B)], [neg(stmt)], ['or-negate'], []]); // TODO: expand.
    }
    return {
      nodes: [...resA.nodes, ...resB.nodes, ...nodes],
      value: Math.max(resA.value, resB.value),
    }
  } else if (simpleMatch(parseOne(`(-> _A _B)`), stmt).success) {
    const [_, A, B] = stmt;
    const resA = evaluateSingleStmtWithValue(A, assignments);
    const resB = evaluateSingleStmtWithValue(B, assignments);
    // For each case, generate subnodes.
    const nodes = [];
    if (resA.value === -1) {
      nodes.push(['node', '#', [neg(A)], [stmt], ['ex-falso'], []]); // TODO: expand.
    } else if (resB.value === 1) {
      nodes.push(['node', '#', [B], [stmt], ['veritas-aeterna'], []]); // TODO: expand.
    } else if (resA.value === 1 && resB.value === -1) {
      nodes.push(['node', '#', [A, neg(B)], [neg(stmt)], ['impl-negate'], []]); // TODO: expand.
    }
    return {
      nodes: [...resA.nodes, ...resB.nodes, ...nodes],
      value: Math.max(0 - resA.value, resB.value),
    }
  } else {
    return {nodes: [], value: 0};
  }
  /// TODO: generate nodes for each sub.
  /// TODO: add "simple evaluation" to get sub-evaluations.
}

/// Example input:
/// stmt = (-> (and _A _B) _C)
/// assignments = {_A: true, _B: false, _C: true}
/// Allows 0 for "unknown"; using ternary logic.
function getBooleanValue(
  stmt, assignments,
) {
  console.log(stmt);
  if (stmt === 'true') {
    return +1;
  } else if (stmt === 'false') {
    return -1;
  } else if (simpleMatch(parseOne(`(and _A _B)`), stmt).success) {
    return Math.min(
      getBooleanValue(stmt[1], assignments),
      getBooleanValue(stmt[2], assignments),
    )
  } else if (simpleMatch(parseOne(`(or _A _B)`), stmt).success) {
    return Math.max(
      getBooleanValue(stmt[1], assignments),
      getBooleanValue(stmt[2], assignments),
    )
  } else if (simpleMatch(parseOne(`(-> _A _B)`), stmt).success) {
    return Math.max(
      0 - getBooleanValue(stmt[1], assignments),
      getBooleanValue(stmt[2], assignments),
    )
  } else {
    return assignments.has(str(stmt)) ? assignments.get(str(stmt)) : 0;
  }
}

if (! 'Debug') {
  const evaluation = evaluateSingleStmtWithValue(
    parseOne(`(-> (and _A _B) _C)`),
    new Map([[`_A`, +1], [`_B`, -1], [`_C`, -1]]),
  );

  console.log(evaluation.value);
  console.log(evaluation.nodes.map(str));

  console.log(autoCompleteNode(
    /* ins */ parse(`_A (-> _B false) (-> _C false)`),
    /* outs */ parse(`(-> (and _A _B) _C)`),
    /* bc */ evaluation.nodes,
  ));

  console.log(tryProveTautology(parseOne(`
    (-> _A (-> _B (and _A _B)))
  `)))
}

if (0){
  console.log(trimId(parseOne(`
    [node #r [_A] [_B] [join] [
      [link ^a #a _A]
      [node #a [_A] [_C] [xyz] []]
      [link #a #c _C]
      [node #c [_C] [_C] [id] []]
      [link #c #b _C]
      [node #b [_C] [_B] [xyz] []]
      [link #b ^c _B]
    ]]
  `)))

  console.log(trimId(parseOne(`
    [node #r [_A] [_B] [join] [
      [link ^a #a _A]
      [node #a [_A] [_C] [xyz] []]
      [link #a #c _C]
      [node #c [_C] [_C] [id] []]
      [link #c #b _C]
      [node #b [_C] [_B] [xyz] []]
      [link #b ^c _B]
      [node #goal [_C] [_C] [id] []]
    ]]
  `)))
}
