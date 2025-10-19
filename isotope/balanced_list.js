// A balanced-list implementation.
// From saphyra/js/unused

function sum(arr) {
  let ans = 0;
  for (const x of arr) ans += x;
  return ans;
}

function branch(... children) {
  return {type: 'branch', children, depth:  children[0].depth + 1,
  size: sum(children.map((x) => x.size))};
}

function leaf(data) {
  return {type: 'leaf', data, depth: 0, size: 1};
}

function empty() {
  return {type: 'empty', depth: -1, size: 0};
}

function addElem(node, index, data) {
  if (node.type === 'empty') {
    return leaf(data);
  } else if (node.type === 'leaf') {
    return index === 0 ? branch(
      leaf(data), leaf(node.data)
    ) : branch (
      leaf(node.data), leaf(data)
    );
  } else {
    const children = [...node.children];

    let acc = 0, targetci = -1;
    // See which children to add to.
    for (let ci = 0; ci < children.length; ci++) {
      if (acc + children[ci].size > index) {
        targetci = ci; break;
      }
      acc += children[ci].size;
    }

    if (targetci < 0) targetci = children.length - 1;

    children[targetci] = addElem (children[targetci], index - acc, data);

    if (children[targetci].depth >= node.depth) {
      // Needs reorganizing.
      const newChildren = [];
      for (ch of children) {
        if (ch.depth < node.depth) newChildren.push(ch);
        else newChildren.push(... ch.children);
      }

      return recombineNodes(newChildren, false);
    } else {
      // Still balanced. Good.
      return branch(...children);
    }
  }
}

// After removing, try to "merge" thinner node with its neighbor.
// If resolves in another "thin" node, keep going upwards.
function delElem(node, index) {
  if (node.type === 'empty') {return node}
  else if (node.type === 'leaf') {return empty()}
  else {
    const children = [...node.children];

    let acc = 0, targetci = -1;
    // See which children to add to.
    for (let ci = 0; ci < children.length; ci++) {
      if (acc + children[ci].size > index) {
        targetci = ci; break;
      }
      acc += children[ci].size;
    }

    if (targetci < 0) targetci = children.length - 1;

    children[targetci] = delElem(children[targetci], index - acc);
    const chosenChild = children[targetci];

    // Check rebalance
    if (chosenChild.type === 'empty') {
      const newChildren = children.filter((x) => x.type !== 'empty');
      return newChildren.length > 1 ?
        branch(...newChildren) :
        newChildren[0];
    } else if (chosenChild.depth === node.depth - 1) {
      // Still balanced, good
      return branch(...children);
    } else {
      // Chosen child is shallower, need to recombine with siblings' children
      const newChildren = [];
      for (const child of children) {
        if (child.depth === node.depth - 1) {
          newChildren.push(... child.children);
        } else {
          newChildren.push(child);
        }
      }

      // Depending on the size (3 ~ 7), set new nodes.
      return recombineNodes(newChildren, true);
    }
  }
}

function recombineNodes(nodes, preferDeep) {
  const size = nodes.length;
  const [a, b, c, d, e, f, g, h, i, ..._else] =
      [...nodes, null, null, null, null, null, null, null, null];

  if (size === 1) {
    return a;
  } else if (size === 2) {
    return branch(a, b);
  } else if (size === 3) {
    return branch(a, b, c);
  } else if (size === 4) {
    return branch(branch(a, b), branch(c, d));
  } else if (size === 5) {
    return branch(branch(a, b), branch(c, d, e));
  } else if (size === 6) {
    return branch(branch(a, b, c), branch(d, e, f));
  } else if (size === 7) {
    return branch(branch(a, b), branch(c, d), branch(e, f, g));
  } else if (size === 8) {
    return preferDeep ?
      branch(
        branch(
          branch(a, b), branch(c, d),
        ),
        branch(
          branch(e, f), branch(g, h),
        ),
      ) :
      branch(
        branch(a, b, c),
        branch(d, e, f),
        branch(g, h),
      );
  } else {
    return preferDeep ?
      branch(
        branch(
          branch(a, b), branch(c, d),
        ),
        branch(
          branch(e, f), branch(g, h, i),
        ),
      ) :
      branch(
        branch(a, b, c),
        branch(d, e, f),
        branch(g, h, i),
      );
  }
}

function joinAll(listOfLists) {
  return [].concat(...listOfLists);
}

function dispLayer(layer) {
  const children = layer.map((node) =>
    node.type === 'empty'
      ? elem('td', {}, [text('(empty)')])
      : elem('td', {colspan: node.size}, [
        node.type === 'branch' ?
        text(`\u25be ${node.depth}`) :
        text(`${node.data}`)
      ])
  );
  return elem('tr', null, children);
}

function dispTree(tree) {
  let level = [tree];
  const ans = [dispLayer(level)];
  const depth = tree.depth;

  for (let i = 0; i < depth; i++) {
    level = joinAll(level.map((node) => {
      if (node.type === 'branch') {
        return node.children;
      } else {
        return [node];
      }
    }));
    ans.push(dispLayer(level));
  }

  return elem('table', null, ans);
}

/*
complete - use actual insert/delete
? - add markers for sorted insertion
TODO - add slice / merge

For merge, just act as if you're adding a depth=n node to a tree. Balance as you go after adding the node.
For slice, first create a sequence of decreasing-depth nodes, such as
    [depth=9 depth=9 depth=7 depth=4 depth=4 depth=2 depth=1]
and then "roll out" higher depths into lower depths, so that each level has between 1 and 3 nodes.
You can also "roll out" as you go, so you don't have to keep a separate stack of partial nodes.
Finally, "roll in" from the shallower end and balance as you go.
*/
