$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    /* example input */
    $('input').value = sampleDeriv1;
    execute(e);
}

function execute (e) {
    inValue = $('input').value;
    console.log (ans = parseSexp (inValue));
    console.log ('string:', str(ans));
    $('display').innerHTML = displayInRows (ans);
    $('output').innerText = ans.map (
        (row) => row.length === 4 && isValidStepInAnyRule (row[2], row[3]),
    );
    isValidDeriv (ans);
}
