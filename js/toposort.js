/// Toposort.

/**
    nodes: list of atoms
    edges: list of pairs of atoms
 **/

function toposort (nodes, edges) {
    // Initialize.
    const descendants = new Map();
    const indegree = new Map();
    for (const n of nodes) {
        descendants.set(n, []);
        indegree.set(n, 0n);
    }

    // Populate.
    for (const [a, b] of edges) {
        if (! indegree.has(a)) {
            return {success: false, reason: `Unknown node ${a}`};
        }
        if (! indegree.has(b)) {
            return {success: false, reason: `Unknown node ${b}`};
        }
        descendants.get(a).push(b);
        indegree.set(b, indegree.get(b) + 1n);
    }

    const heads = [];
    for (const a of nodes) {
        if (indegree.get(a) === 0n) heads.push(a);
    }
    heads.reverse();

    const order = [];

    while (heads.length > 0 && order.length < nodes.length) {
        const validNode = heads.pop();
        order.push(validNode);
        const nextNodes = descendants.get(validNode);
        console.log(heads, validNode, descendants, indegree);
        nextNodes.reverse();
        for (const nn of nextNodes) {
            indegree.set(nn, indegree.get(nn) - 1n);
            if (indegree.get(nn) === 0n) {
                heads.push(nn);
            }
        }
        descendants.set(validNode, []);
    }

    // Success!
    if (order.length >= nodes.length) {
        return {success: true, order};
    }

    // Otherwise, return a loop.
    const unresolved = [];
    for (const [n, degree] of indegree.entries()) {
        if (degree > 0n) unresolved.push(n);
    }
    const unresolvedSet = new Set(unresolved);

    const ancestor = new Map();
    for (const [a, b] of edges) {
        if (unresolvedSet.has(a) && unresolvedSet.has(b) && ! ancestor.has(b))
            ancestor.set(b, a);
    }

    let ptr = unresolved[0];
    const covered = new Set();

    while(! covered.has(ptr)) {
        covered.add(ptr);
        ptr = ancestor.get(ptr);
    }

    // Loop found
    const loop = [];
    while (loop.length < nodes.length) {
        loop.push(ptr);
        ptr = ancestor.get(ptr);
        if (ptr === loop[0]) break;
    }

    // Loop complete
    loop.reverse();
    return {success: false, loop};
}

if (false) {
  console.log('Toposort result',
    toposort(
      deepParse(`2 3 5 7 8 9 10 11`),
      deepParse(`[5 11] [11 2] [11 9] [8 9] [11 10] [3 8] [3 10] [7 8] [7 11]`),
    ),
  );

  console.log('Toposort result',
    toposort(
      deepParse(`a b c d`),
      deepParse(`[c d] [a b] [b c] [c b]`),
    ),
  );

  console.log('Toposort result',
    toposort(
      deepParse(`a b c d`),
      deepParse(`[c d] [a b] [b c] [d a]`),
    ),
  );
}
