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

  for (const key of /*Object.keys(tacticRules)*/ ['replace-sub']) {
    const fn = tacticRules[key];
    const ans = fn (root, hls);
    console.log ('Run result', key);
    console.log (JSON.stringify (ans, null, 2));
    console.log ('================================================================');
  }
}

function tacticAxiom (root, hls, opts = {}) {
  // opts: {axiom}

  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (! opts.axiom) return {fail: true, reason: 'no axiom specified'};

  const [vars, assumptions, conclusions] = allAxiomsMap.get(opts.axiom);
  
  /*
    Find all ways to match
    froms -> assumptions,
    tos -> conclusions,
  */

  // Allows partial matching, but avoid cases where there are more selected than required.
  if (froms.length > assumptions.length || tos.length > conclusions.length) {
    return {fail: true, reason: 'Type mismatch'};
  }

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
    // Extend map by using generated statement names.
    const [matchMap, generatedSyms] = extendMatchMap(match.map, vars, [
      froms, tos, assumptions, conclusions,
    ]);

    if (match.success) {
      // console.log('subnode is', findSubnodeByPath(getCurrentRootNode(), subnode),);

      const newNodeName = gensyms(
        /*avoid*/ findSubnodeByPath(getCurrentRootNode(), subnode),
        /*count*/ 1,
        /*prefix*/ '#',
        /*suffix*/ '',
      ) [0];

      const newNode = [
        'node', newNodeName, replaceAll(assumptions, matchMap),
        replaceAll(conclusions, matchMap),
        // Fixed: Justification should be a list.
        [axiomName], [] /*subs*/,
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

      const thisAns = {
        map: matchMap,
        rule: axiomName,
        ins: newNode[Ins],
        outs: newNode[Outs],
        subnode,
        addnodes: [
          newNode,
          ... links,
        ],
        hls,
        args: generatedSyms,
      };
      ans.push(thisAns);
    }
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
    requestArgs: {varName: 'text'},
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
  // TODO1020 opts.rule: [axiom axiom-name] or [path [...path]]
  // TODO1020 opts.direction: -> / <-
  // TODO1020 opts.occurrence-index: 0, 1, 2, 3, ...

  const target = tos[0];
  const stmt = target.sexp;
  const targetNode = target.path.slice (0, target.path.length - 2);

  // Name available targets. Equational only.
  const namedTargets = new Map();  // targetName => [axiom axiom-name ∀-vars lhs rhs] or [path [...path] ∀-vars lhs rhs]
  if ('List named targets') {
    for (const [axiomName, [vars, ins, outs]] of allAxiomsMap.entries()) {
      if (! (ins.length === 0 && outs.length === 1 && outs[0][0] === '=')) continue;
      namedTargets.set(axiomName, ['axiom', axiomName, vars, outs[0][1], outs[0][2]]);
    }

    // Give a name to each listed input.

    for (const condition of froms) {
      // Skip non-equalities. TODO1020 - include forall's
      if (condition.sexp[0] !== '=') continue;

      const [_eq, lhs, rhs] = condition.sexp;

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
      namedTargets.set(ruleName, ['path', condition.path, [], lhs, rhs]);
    }
  }

  return {
    success: true,
    rule: 'replace-sub',
    target,
    targetNode,
    fromNodes: froms.map((a) => a.path),
    stmt,
    userInput: parse('[Statement stmt]'),
    namedTargets: [... namedTargets],
  };
}

function tacticAddJoin (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (froms.length === 0 && tos.length === 0) {
    return {fail: true, reason: 'too few froms/tos'};
  }

    const newNodeName = gensyms(
      /*avoid*/ findSubnodeByPath(getCurrentRootNode(), subnode),
      /*count*/ 1,
      /*prefix*/ '#',
      /*suffix*/ '',
    ) [0];

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

    const addnodes = [newNode, ...fromLinks, ...toLinks];

  return {
    success: true,
    actions: [{type: 'add-to-node', subnode, added: addnodes}],
    newHls: 0  /* TODO - add newHls */
  };
}

function tacticImportStmt (root, hls, opts = {}) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  // need: froms > 0, nodes > 0
  if (froms.length > 0 && nodes.length === 1) {
    // Goes to 'subnode', and for every subnode of it,
    //     sees if the node path is between from.path[:-2] and nodes[0].path
    // And if yes, add this stmt as ^a, and add a link (in parent).

    const node = parseOne(str(getCurrentRootNode()));

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
            n[Subs].push(['link', '^a', targetNode[length]/*next index*/, stmt]);
          }
        } else {
          // Add special link for first.
          n[Subs].push(['link', theoremIndex, targetNode[length]/*next index*/, stmt]);
        }
      }
    }

    ans.push({
      rule: 'import-stmt',
      newRoot: node,
    });
  }
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
      requestArgs: {newName: 'text'},
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
    return {listen: true, requestArgs: {script: 'text'}};
  }

  const script = parse (opts.script);

  

  // TODO - complete this.
}

