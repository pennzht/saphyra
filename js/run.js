$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    $('input').value =
`[and-intro [A B] [[and A B]]]
[or-intro-1 [A] [[or A B]]]
[or-elim
  [
    [or X [and X Y]]
    [-> X M]
    [-> [and X Y] M]
  ]
  [M]
]
`;
    execute(e);
}

function execute (e) {
    inValue = $('input').value;
    console.log (ans = parseSexp (inValue));
    $('display').innerHTML = display (ans);
    $('output').innerText = ans.map (
        (row) => isValidStep (...row),
    );
}
