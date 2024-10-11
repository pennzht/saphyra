/** Application of tactics, interactive (pausable).
A tactic is basically a function with a partial input, which is progressively fed with more info.

root, hls (=== highlights), opts (=== options)
 */

function tacticAxiom (root, hls, opts = null) {
  // opts: {axiom}
  // returns: {fail, reason}
  // returns: {success, newRoot, newHls}
  // returns: {which, [{newRoot, newHls}]}

  const [froms, to, nodes, subnode] = parseHls(root, hls);

  const [vars, assumptions, conclusions] = folAxiomsMap.get(opts.axiom);
  
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
        labels,
        args: generatedSyms,
      };
      ans.push(thisAns);
    }
  }
}

function tacticImplIntro (root, hls, opts = null) {
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

function tacticForallIntro (root, hls, opts = null) {
  const [froms, tos, nodes, subnode] = parseHls(root, hls);

  if (tos.length === 1) {
    // froms, tos : {path, sexp}
    const m = simpleMatch(
      ['forall', '_P'], tos[0].sexp
    );

    if (m.success) {
      const p = m.map.get('_P');

      const joinNode = [
        'node', '#0',
        froms.map((a) => a.sexp),
        [[p, '_?P0']],
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
        newHls: 0 /* TODO - add new highlights*/,
        requestArgs: [['_?P0', 'text']],
      };
    } else {
      return {fail: true, reason: 'not forall'};
    }
  } else {
    return {fail: true, reason: 'arg diff'};
  }
}

function tacticExistsElim (root, hls, opts = null) {

}

function tacticBeta (root, hls, opts = null) {

}

function tacticReplaceSub (root, hls, opts = null) {

}

function tacticAddJoin (root, hls, opts = null) {

}

function tacticImportStmt (root, hls, opts = null) {

}

function tacticAddNodeInput (root, hls, opts = null) {

}

function tacticAddNodeOutput (root, hls, opts = null) {

}

function tacticRenameNode (root, hls, opts = null) {

}

function tacticAddComment (root, hls, opts = null) {

}

function parseHls (root, hls) {
  // in each pathAndSexp, path is something like [#root #1 ^a in].
  // they should satisfy a condition that they are all subpaths of some full path, which is where we'll add new blocks.
  const froms = [], tos = [], nodes = [];
  for (const label of hls) {
    const tail = _last_elem(label.path);
    if (tail === 'out') froms.push(label);
    else if (tail === 'in') tos.push(label);
    else nodes.push(label);
  }

  const nodePaths = nodes.map ((n) => n.path);

  const subnode = findSubnodeFromPorts(hls.map((x) => x.path));

  return [froms, tos, nodePaths, subnode];
}
