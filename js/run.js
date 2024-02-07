$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    /* example input */
    $('input').value = sampleDeriv2;
    execute(e);
}

function execute (e) {
    inValue = $('input').value;
    console.log (ans = parseSexp (inValue));
    $('display').innerHTML = display (ans);
    $('output').innerText = ans.map (
        (row) => row.length === 4 && isValidStepInAnyRule (row[2], row[3]),
    );
    isValidDeriv (ans);
}
