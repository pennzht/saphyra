$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    $('input').value =
`[|- [A B] [[and A B]]]
[|- [A] [[or A B]]]
`;
    execute(e);
}

function execute (e) {
    inValue = $('input').value;
    // fn = new Function (`return ${inValue}`);
    // $('output').innerText = fn();
    console.log (ans = parseSexp (inValue));
    $('display').innerHTML = display (ans);
    $('output').innerText = JSON.stringify (ans, null, 2);
}
