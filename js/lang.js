function strMult (string, copies) {
    const ans = [];
    for (var i = 0; i < copies; i++) ans.push (string);
    return ans.join ('');
}

console.log (strMult ('hello, world!\n', 10));
