/** Application of tactics, interactive (pausable).
A tactic is basically a function with a partial input, which is progressively fed with more info.

root, hls (=== highlights), opts (=== options)
*/

// Tactics not included here: rename-space

// returns: {fail, reason}
// returns: {success, actions: [{type, subnode, added/...}], newHls: [[path, stmt]]}
// returns: {listen, requestArgs: {key: type as string}}

tacticRules = {
  'axiom': tacticAxiom,
  'impl-intro': tacticImplIntro,
  'forall-intro': tacticForallIntro,
  'exists-elim': tacticExistsElim,
  'beta-equiv': tacticBetaEquiv,
  'replace-sub': tacticReplaceSub,
  'add-join': tacticAddJoin,
  'import-stmt': tacticImportStmt,
  'add-node-input': tacticAddNodeInput,
  'add-node-output': tacticAddNodeOutput,
  'rename-node': tacticRenameNode,
  'add-comment': tacticAddComment,
  'script': tacticScript,
};

function runTacticRules () {
  const root = getCurrentRootNode();
  const hls = [...state.highlighted].map(parse).map((pair) => {
    return ({
      path: pair[0],
      sexp: pair[1],
    });
  });

  const matchingRules = [];

  for (const key of /*Object.keys(tacticRules)*/ [
    'axiom',
    'add-node-input',
    'add-node-output',
    'add-join',
    'import-stmt',
  ]) {
    const fn = tacticRules[key];
    const ans = fn (root, hls);
    ans.rule = key;  // Just in case
    matchingRules.push(ans);
    console.log ('Run result', key);
    console.log (JSON.stringify (ans, null, 2));
    console.log ('================================================================');
  }

  return matchingRules;
}

function tacticApplyRule (root, hls, opts = {}) {
  const rule = opts.rule;
  const ruleFn = tacticRules[rule];
  return ruleFn (root, hls, opts);
}

function tacticAxiom (root, hls, opts = {}) {
  // opts: {axiom}

  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  const axiomList = opts.axioms ? [... opts.axioms] : opts.axiom ? [opts.axiom] : [... allAxiomsMap.keys()];

  const matchList = [];    // Collect all matching cases.

  for (const axiom of axiomList) {
    const [vars, assumptions, conclusions] = allAxiomsMap.get(axiom);

    // TODO1020 continue here.
    
    // Find all ways to match froms -> assumptions, tos -> conclusions.

    // Allows partial matching, but avoid cases where there are more selected than required.
    if (froms.length > assumptions.length || tos.length > conclusions.length) { continue; }

    // Finds all ways to pair pattern and statement.

    const fromsMatch = tmFindMatches(assumptions, froms);
    const tosMatch = tmFindMatches(conclusions, tos);

    // For each pair, attempt to find a match for the block.
    for (const fm of fromsMatch) for (const tm of tosMatch) {
      // A list of {slot, sexpWithPath}
      const pairs = fm.concat(tm);

      const pattern = pairs.map((x) => x.slot);
      const content = pairs.map((x) => x.sexpWithPath.sexp);

      const match = simpleMatch(pattern, content);

      if (match.success) {
        // Extend map by using generated statement names.
        const [matchMap, generatedSyms] = extendMatchMap(match.map, vars, [
          froms, tos, assumptions, conclusions,
        ]);

        const [newNodeName] = genNodeNames (findSubnodeByPath(root, subnode));

        const newNode = [
          'node', newNodeName, replaceAll(assumptions, matchMap),
          replaceAll(conclusions, matchMap),
          // Fixed: Justification should be a list.
          [axiom], [] /*subs*/,
        ];

        const links = [];
        for (const matchPair of fm.concat(tm)) {
          const previousPort = [... matchPair.sexpWithPath.path];
          const outOrIn = previousPort.pop();
          const portName = previousPort.pop();
          if (outOrIn === 'out') {
            links.push(['link', portName, newNodeName, matchPair.sexpWithPath.sexp]);
          } else {
            links.push(['link', newNodeName, portName, matchPair.sexpWithPath.sexp]);
          }
        }

        // Compute new highlights.
        const highlightInputs = new Set(newNode[Ins].map(str));
        const highlightOutputs = new Set(newNode[Outs].map(str));

        for (const f of froms) highlightInputs.delete(str(f.sexp));
        for (const t of tos) highlightInputs.delete(str(t.sexp));

        const newHls = [
          ... [...highlightInputs].map((sexp) => ({
            path: [...subnode, newNodeName, 'in'],
            sexp,
          })),
          ... [...highlightOutputs].map((sexp) => ({
            path: [...subnode, newNodeName, 'out'],
            sexp,
          })),
        ];

        const thisAns = {
          map: matchMap,
          extraArgs: generatedSyms,

          axiom,
          ins: newNode[Ins],
          outs: newNode[Outs],

          subnode,
          newHls,
          addnodes: [
            newNode,
            ... links,
          ],
          // new highlights: ?
        };
        matchList.push(thisAns);
      }
    }
  }

  if (matchList.length === 1) {
    const ans = {success: true, matchList};
    for (const x of Object.keys(matchList[0])) {
      ans[x] = matchList[0][x];
    }
  } else if (matchList.length > 1) {
    return {listen: true, matchList};
  } else {
    return {fail: true, reason: 'No matches found'};
  }
}

function tacticImplIntro (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (! (tos.length === 1 && tos[0].sexp[0] === '->')) {
    return {fail: true, reason: 'arg diff'};
  }

  const newSym = '#' + Math.random();

  const [_arrow, a, b] = tos[0].sexp;

  // Construct an impl-intro node.
  const implIntroNode = [
    'node', newSym,
    froms.map((a) => a.sexp),
    tos.map((a) => a.sexp),
    ['impl-intro'],
    // Subs: [join].
    [[
      'node', '#0',
      froms.map((f) => f.sexp).concat([a]),
      [b],
      ['join'],
      [],
    ]],
  ];

  const linksIn = froms.map((a) => ['link', a.path[a.path.length-2], newSym, a.sexp]);
  const linksOut = tos.map((a) => ['link', newSym, a.path[a.path.length-2], a.sexp]);

  return {
    success: true,
    actions: [
      {type: 'add-to-node', subnode, added: [implIntroNode, ...linksIn, ...linksOut]}
    ],
    newHls: froms.map((f) => f.sexp).concat([a]).map((stmt) =>
      [[...subnode, newSym, '#0', '^a', 'out'], stmt])
      .concat([[...subnode, newSym, '#0', '^c', 'in'], b]),
  };
}

function tacticForallIntro (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (tos.length !== 1) {
    return {fail: true, reason: 'arg diff'};
  }

  const m = simpleMatch(
    ['forall', '_P'], tos[0].sexp
  );

  if (! m.success) {
    return {fail: true, reason: 'not a forall stmt'};
  }

  const p = m.map.get('_P');
  const lamMatch = simpleMatch([':', '_v', '_body'], p);

  const twoLevel = lamMatch.success;

  const joinNode = [
    'node', '#0',
    froms.map((a) => a.sexp),
    [[p, '_?P0']],
    ['join'],
    [],
  ];
  
  if (lamMatch.success) {
    const v = lamMatch.map.get('_v');
    const [n, typ] = nameAndTypeString(v);
    // If not in assumptions ...
    const avoids = getFreeVars (froms.map ((a) => a.sexp));

    let v2 = v;
    if (avoids.includes (v)) {
      // Generate new var.
      v2 = gensyms (avoids, 1, n, ':'+typ)[0];
    } // otherwise, v2 = v.

    // Replaces out with actual variable.
    joinNode[Outs][0] = [p, v2];

    // Adds beta-replaced, then link.
    const beta = lambdaFullReduce([p, v2]);
    joinNode[Subs].push(['node', '#b', [beta], [[p, v2]], ['beta-equiv'], []]);
    joinNode[Subs].push(['link', '#b', '^c', [p, v2]]);
  }

  const innerNode = [
    'node', '#'+Math.random(),
    froms.map((a) => a.sexp),
    tos.map((a) => a.sexp),
    ['forall-intro'],
    // Subs: [join].
    [joinNode],
  ];
  const linksIn = froms.map((a) => ['link', a.path[a.path.length-2], innerNode[Label], a.sexp]);
  const linksOut = tos.map((a) => ['link', innerNode[Label], a.path[a.path.length-2], a.sexp]);

  return {
    success: true,
    actions: [
      {type: 'add-to-node', subnode, added: [innerNode, ...linksIn, ...linksOut]}
    ],
    newHls: [], /* TODO - add new highlights*/
    requestArgs: {varName: 'string'},
  };
}

function tacticExistsElim (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length < 1) {
    return {fail: true, reason: 'too few froms'};
  }

  const m = simpleMatch(
    ['exists', '_P'], froms[0].sexp
  );

  if (! m.success) {
    return {fail: true, reason: 'not an exists stmt'};
  }

  const p = m.map.get('_P');

  const joinNode = [
    'node', '#0',
    [[p, '_?P0']].concat(froms.slice(1).map((a) => a.sexp)),
    tos.map((a) => a.sexp),
    ['join'],
    [],
  ];
  
  const lamMatch = simpleMatch([':', '_v', '_body'], p);
  if (lamMatch.success) {
    const v = lamMatch.map.get('_v');
    const [n, typ] = nameAndTypeString(v);
    // If not in assumptions ...
    const avoids = getFreeVars (froms.map ((a) => a.sexp));

    let v2 = v;
    if (avoids.includes (v)) {
      // Generate new var.
      v2 = gensyms (avoids, 1, n, ':'+typ)[0];
    } // otherwise, v2 = v.

    // Replaces out with actual variable.
    joinNode[Ins][0] = [p, v2];

    // Adds beta-replaced, then link.
    const beta = lambdaFullReduce([p, v2]);
    joinNode[Subs].push(['node', '#b', [[p, v2]], [beta], ['beta-equiv'], []]);
    joinNode[Subs].push(['link', '^a', '#b', [p, v2]]);
  }

  const innerNode = [
    'node', '#'+Math.random(),
    froms.map((a) => a.sexp),
    tos.map((a) => a.sexp),
    ['exists-elim'],
    // Subs: [join].
    [joinNode],
  ];
  const linksIn = froms.map((a) => ['link', a.path[a.path.length-2], innerNode[Label], a.sexp]);
  const linksOut = tos.map((a) => ['link', innerNode[Label], a.path[a.path.length-2], a.sexp]);
  ans.push ({
    rule: 'exists-elim',
    ins: innerNode[Ins],
    outs: innerNode[Outs],
    subnode,
    addnodes: [innerNode, ...linksIn, ...linksOut],
    args: ['_?P0'],
  });
}

function tacticBetaEquiv (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  // need: froms + tos = 1
  if (froms.length + tos.length !== 1) {
    return {fail: true, reason: 'arg diff'};
  }

  let downward, stmt, parentNode, port;
  if (froms.length > 0) {
    downward = true;
    stmt = froms[0].sexp;
    const path = froms[0].path;
    parentNode = path.slice(0, path.length - 2);
    port = path[path.length - 2];
  } else {
    downward = false;
    stmt = tos[0].sexp;
    const path = tos[0].path;
    parentNode = path.slice(0, path.length - 2);
    port = path[path.length - 2];
  }

  const reduced = lambdaFullReduce(stmt);

  if (eq (reduced, stmt)) {
    return {fail: true, reason: 'no operation'};
  }

  const newNode = [
    'node', '#'+Math.random(),
    /*ins*/ [downward ? stmt : reduced],
    /*outs*/ [downward ? reduced : stmt],
    /*justification*/ ['beta-equiv'],
    /*subs*/ [],
    /*additional*/ [],
  ];
  const link = [
    'link',
    downward ? port : newNode[Label],
    downward ? newNode[Label] : port,
    stmt,
  ];
  
  return {
    success: true,
    actions: [
      {type: 'add-to-node', subnode, added: [newNode, link]}
    ],
    newHls: [
      [...subnode, newNode[Label], downward ? 'out' : 'in'],
      stmt,
    ],
  };
}

function tacticReplaceSub (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (tos.length !== 1) {
    return {fail: true, reason: 'arg diff'};
  }

  // <skip> find accessible stmts at each level
  //     - add to toposort: list descendants of a special node
  //     - see also: findMatchingPaths in tactics_multi.js
  //     - use only chosen "in" stmts + axioms
  // For now: only consider upwards-reasoning (start from goal)
  // opts.rule: [axiom axiom-name] or [path [...path]]
  // opts.direction: -> / <-
  // opts.vars: Map([varname, varreplace])
  // opts.occurrenceIndex: 0, 1, 2, 3, ... ("replace the Nth index of ... with these vars")

  const target = tos[0];
  const stmt = target.sexp;
  const targetNode = target.path.slice (0, target.path.length - 2);

  // Name available targets. Equational only.
  const namedTargets = new Map();  // targetName => [axiom axiom-name ∀-vars lhs rhs] or [path [...path] ∀-vars lhs rhs]
  if ('List named targets') {
    for (const [axiomName, [vars, ins, outs]] of allAxiomsMap.entries()) {
      if (! (ins.length === 0 && outs.length === 1 && outs[0][0] === '=')) continue;

      // Skips trivial axiom (for now).
      if (axiomName === '=-intro') continue;

      namedTargets.set(axiomName, ['axiom', axiomName, vars, outs[0][1], outs[0][2]]);
    }

    // Give a name to each listed input.

    for (const condition of froms) {
      // Checks if `condition` is a universal equality; skips if it isn't one.
      const vars = [];
      let body = condition.sexp;
      while (body[0] === 'forall') {
        const match = simpleMatch (['forall', [':', '_var', '_body']], body);
        if (! match.success) break;

        vars.push (match.map.get('_var'));
        body = match.map.get('_body');
      }

      if (body[0] !== '=') continue;

      const [_eq, lhs, rhs] = body;

      let ruleName = condition.path.at(-2);
      // Gensym in namedTargets.
      if (namedTargets.has(ruleName)) {
        // Create new name
        ruleName = gensyms (
          /*avoid*/ [...namedTargets.keys()],
          /*count*/ 1,
          /*prefix*/ ruleName + '_',  /*suffix = ''*/
        );
      }

      // Add to named targets
      namedTargets.set(ruleName, ['path', condition.path, vars, lhs, rhs]);
    }
  }

  // A list of matching results.
  const matchingResults = [];

  for (const [ruleName, [ruleType, axiomNameOrPath, vars, lhs, rhs]] of namedTargets.entries()) {
    for (const [startSide, direction] of [[lhs, '->'], [rhs, '<-']]) {
      // Try matching startSide with substring.
      for (const [indices, subsexp] of sexpWalk(stmt)) {
        // console.log ('try matching', str(indices), str(subsexp), 'with', ruleName, ruleType);

        const m = simpleMatch (startSide, subsexp, vars);
        if (m.success) {
          console.log ('found match', ruleName, str(indices), str(subsexp), str([...m.map]));
          matchingResults.push ({
            ruleName,
            vars, lhs, rhs,
            direction,
            indices,
            subsexp,
            map: [...m.map],
          });
        }

        // TODO1020 - add matching parts to suggestions.
      }
    }
  }

  const readyToApply = opts.axiomOrTheorem && opts.direction;

  if (! readyToApply) return {
    listen: true,
    rule: 'replace-sub',
    targetNode,
    stmt,
    fromNodes: froms.map((a) => a.path),
    namedTargets: [... namedTargets],
    matchingResults,
    requestArgs: {
      axiomOrTheorem: ['oneof', ... namedTargets.keys()],
      direction: ['oneof', '->', '<-'],
      vars: 'sexp',
      occurrenceIndex: 'int',
    },
  };

  // readyToApply
  {
    console.log ('opts are', opts);

    opts.vars = opts.vars || [];  // Empty var application
    opts.occurrenceIndex = parseInt(opts.occurrenceIndex || '0', 10);  // Apply to first if unspecified.
    
    // Find which theorem it is.
    const [_type, axiomNameOrPath, freeVarsList, lhs, rhs] = namedTargets.get(opts.axiomOrTheorem);
    const fromSexp = opts.direction == '->' ? lhs : rhs;
    const toSexp = opts.direction == '->' ? rhs : lhs;

    const freeVars = new Set(freeVarsList);
    // use replaceAll(sexp, map)
    const fromSexpRepl = replaceAll(fromSexp, new Map(opts.vars));
    const toSexpRepl = replaceAll(toSexp, new Map(opts.vars));

    for (const [a, b] of opts.vars.entries()) freeVars.delete(a);
    const replaceableVars = [... freeVars];

    // Walk the tree for matchings
    
    let matchingIndex = 0;

    for (const [indices, subsexp] of sexpWalk(stmt)) {
      const m = simpleMatch(fromSexpRepl, subsexp, replaceableVars);
      if (m.success) {

        // Only use the [occurrenceIndex]th index.
        if (matchingIndex !== opts.occurrenceIndex) {
          matchingIndex ++; continue;
        }

        const matchingMap = m.map;
        for (const [a, b] of opts.vars) {m.set(a, b);}

        const fromSexpFinal = replaceAll(fromSexp, matchingMap);
        const toSexpFinal = replaceAll(toSexp, matchingMap);

        console.log (`replacing ${str(fromSexpFinal)} with ${str(toSexpFinal)} at ${indices} with maps ${str([...matchingMap])}`);

        const [lambdaHoleVar] = gensyms(stmt, 1, '_lh', ':O');  // TODO - use actual type (not necessarily O)

        const lambdaHole = replaceByPath(stmt, indices, lambdaHoleVar);
        const newStmt = replaceByPath(stmt, indices, toSexpFinal);

        console.log (`lambdaHole = ${str(lambdaHole)}; newStmt = ${str(newStmt)}.`);

        const inName = gensyms(findSubnodeByPath (root, targetNode), 1, '#')[0];
        const intermediateNode = ['node', inName, [newStmt], [stmt], ['join'], []];
        const isub = intermediateNode[Subs];

        let subnodeCount = 0;

        // ...
        // TODO - coding like this is too painful. You need to modularize it even thinner.
        // For example, “apply value X onto ∀...” should be an individual tactic.
        // Beta-reduce should be an individual tactic.
        // And this huge tactic should be a composition of individual tactics.
        // YOU NEED TO REFACTOR!!! Don't dismiss your refactoring needs!!!

        // TODO1020 - generate all intermediate nodes (=-sym and all).

        // TODO1020 - automate import for all statements from outside.

        // TODO1020 - treat axioms / assumptions / external theorems differently.

        return 0;
      }
    }
  } // closes readyToApply
}

function tacticAddJoin (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length === 0 && tos.length === 0) {
    return {fail: true, reason: 'too few froms/tos'};
  }

  const [newNodeName] = genNodeNames(findSubnodeByPath(root, subnode));

  const newNode = [
    'node', newNodeName,
    /*ins*/ froms.map ((a) => a.sexp),
    /*outs*/ tos.map ((a) => a.sexp),
    ['join'], [] /*subs*/,
  ];

  const getNodeName = (path) => {
    if (['in', 'out'].includes(path[path.length - 1])) {
      return path[path.length - 2];
    } else return path[path.length - 1];
  };
  const fromLinks = froms.map ((a) => ['link', getNodeName(a.path), newNodeName, a.sexp]);
  const toLinks = tos.map ((a) => ['link', newNodeName, getNodeName(a.path), a.sexp]);

  const newNodes = [newNode, ...fromLinks, ...toLinks];

  const newNodePath = subnode.concat([newNodeName]);

  const newHls = [];
  for (const inStmt of newNode[Ins]) newHls.push({path: newNodePath.concat(['^a', 'out']), sexp: inStmt});
  for (const outStmt of newNode[Outs]) newHls.push({path: newNodePath.concat(['^c', 'in']), sexp: outStmt});

  return {
    success: true,
    actions: [{type: 'add-to-node', subnode, added: newNodes}],
    newRoot: addToSubnode(root, subnode, newNodes),
    newHls,
  };
}

function tacticImportStmt (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length <= 0 || nodes.length <= 0) {
    // No statements to import, or nowhere to import it to.
    return {fail: true, reason: 'No input or no node provided.'};
  }

  // Goes to 'subnode', and for every subnode of it,
  //     sees if the node path is between from.path[:-2] and nodes[0].path
  // And if yes, add this stmt as ^a, and add a link (in parent).

  const transformRoot = (node, path, recur) => {
    // First, decide whether this node is affected.
    if (! nodes.some ((n) => isPrefix(path, n))) return node;

    const children = [];
    for (const child of (node[Subs] || [])) {
      // Process child and add to children.
      if (child[0] !== 'node') {children.push(child); continue;}
      path.push(child[Label]);
      const childTr = recur (child, path, recur);
      children.push(childTr);
      path.pop();
    }

    // See if anything is needed for this.

    const newInputs = [... node[Ins]];

    for (const f of froms) {
      // Do we need to add input to this node?
      const fromParent = f.path.slice(0, f.path.length - 2);
      if (isProperPrefix(fromParent, path)) newInputs.push(f.sexp);

      // Do we need to add a link?
      if (isPrefix(fromParent, path)) {
        const upperLink = eq (fromParent, path) ? f.path.at(-2) : '^a';

        // Determine which nodes need this link.
        for (const n of nodes) {
          const nshort = n.slice(0, path.length + 1);
          if (isProperPrefix (path, nshort)) {
            const lowerLink = nshort.at(path.length);  // nshort.at(-1);
            children.push (['link', upperLink, lowerLink, f.sexp]);
          }
        }
      }
    }

    return ['node', node[Label], newInputs, node[Outs], node[Just], children, node.slice(6)];
  };

  const newRoot = transformRoot (root, [root[Label]], transformRoot);

  console.log('new root is', newRoot);

  const newHls = [];
  for (const f of froms) for (const n of nodes) {
    newHls.push ({path: n.concat(['^a', 'out']), sexp: f.sexp});
  }

  return {
    success: true,
    newRoot,
    newHls,
  };

  ////////////////////////////////////////////////////////////////

  /*
  for (const from of froms) {
    const path = from.path, stmt = from.sexp;
    const targetNode = nodes[0].path;

    const theoremParentPath = path.slice(0, path.length - 2);
    const theoremIndex = path[path.length - 2];

    for (let length = theoremParentPath.length;
         length <= targetNode.length;
         length++) {
      const currentPath = targetNode.slice(0, length);
      console.log('import-stmt, at', currentPath);

      const n = findSubnodeByPath (node, currentPath);

      // If not first: add input.
      if (length > theoremParentPath.length) {
        n[Ins].push(stmt);

        // If also not last: add link
        if (length < targetNode.length) {
          n[Subs].push(['link', '^a', targetNode[length] next index, stmt]);
        }
      } else {
        // Add special link for first.
        n[Subs].push(['link', theoremIndex, targetNode[length] next index, stmt]);
      }
    }
  }

  ans.push({
    rule: 'import-stmt',
    newRoot: node,
  });
  */
}

function tacticAddNodeInput (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length > 0) {
    return {fail: true, reason: 'too many inputs'};
  }
  if (tos.length > 0) {
    return {fail: true, reason: 'too many outputs'};
  }
  if (nodes.length === 0) {
    return {fail: true, reason: 'node count = 0'};
  }

  if (! opts.stmt) {
    return {
      listen: true,
      requestArgs: {stmt: 'stmt'},
    };
  }

  return {
    success: true,
    actions: nodes.map ((node) => 
      ({type: 'add-to-node', subnode: node, newInputs: [opts.stmt]})
    ),
    newRoot: applyIOToSubnodes(root, nodes, /*rule*/null, [opts.stmt], [], /*newLabel*/null),
    newHls: nodes.map((node) => ({path: node.concat(['^a', 'out']), sexp: opts.stmt})),
  };
}

function tacticAddNodeOutput (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length > 0) {
    return {fail: true, reason: 'too many inputs'};
  }
  if (tos.length > 0) {
    return {fail: true, reason: 'too many outputs'};
  }
  if (nodes.length === 0) {
    return {fail: true, reason: 'node count = 0'};
  }

  if (! opts.stmt) {
    return {
      listen: true,
      requestArgs: {stmt: 'stmt'},
    };
  }

  return {
    success: true,
    actions: nodes.map ((node) => 
      ({type: 'add-to-node', subnode: node, newOutputs: [opts.stmt]})
    ),
    newRoot: applyIOToSubnodes(root, nodes, /*rule*/null, [], [opts.stmt], /*newLabel*/null),
    newHls: nodes.map((node) => ({path: node.concat(['^c', 'in']), sexp: opts.stmt})),
  };
}

function tacticAddNodeHelper (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length > 0) {
    return {fail: true, reason: 'too many inputs'};
  }
  if (tos.length > 0) {
    return {fail: true, reason: 'too many outputs'};
  }
  if (nodes.length === 0) {
    return {fail: true, reason: 'node count = 0'};
  }

  if (! opts.stmt) {
    return {
      listen: true,
      requestArgs: {stmt: 'stmt'},
    };
  }

  const newNodeName = gensyms(
    /*avoid*/ findSubnodeByPath(root, nodes[0]),
    /*count*/ 1,
    /*prefix*/ '#helper',
    /*suffix*/ '',
  ) [0];

  const idBlock = ['node', newNodeName, [stmt], [stmt], ['id'], []];

  return {
    success: true,
    actions: nodes.map ((node) => 
      ({type: 'add-to-node', subnode: node, added: [idBlock]})
    ),
  };
}

function tacticRenameNode (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length > 0) {
    return {fail: true, reason: 'too many inputs'};
  }
  if (tos.length > 0) {
    return {fail: true, reason: 'too many outputs'};
  }
  if (nodes.length !== 1) {
    return {fail: true, reason: 'node count != 1'};
  }

  if (! opts.newName) {
    return {
      listen: true,
      requestArgs: {newName: 'string'},
    };
  }

  return {
    success: true,
    actions: [
      {type: 'change-node-name', subnode: nodes[0], newName: opts.newName},
    ],
  };
}

function tacticAddComment (root, hls, opts = {}) {
  return {fail: true, reason: 'not yet implemented'};
}

function tacticScript (root, hls, opts = {}) {
  if (! opts.script) {
    return {listen: true, requestArgs: {script: 'sexp'}};
  }

  const script = parse (opts.script);

  

  // TODO - complete this.
}

