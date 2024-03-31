/// A balanced-list implementation.

window.onload = main;

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

function joinAll(listOfLists) {
  return [].concat(...listOfLists);
}

function dispLayer(layer) {
  const children = layer.map((node) =>
    elem('td', {colspan: node.size}, [
      node.type === 'branch' ?
      `\u25be ${node.depth}` :
      `${node.data}`
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

globals = {
  list: branch(
    leaf(2), leaf(3), leaf(5)
  )
};

function main() {
  console.log(globals.list);
  $('output').appendChild(dispTree(globals.list));
}
