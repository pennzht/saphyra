$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    /* example input */
    $('input').value = sampleDeriv1;
    execute(e);
}

function execute (e) {
    const inValue = $('input').value;
    console.log (ans = parse (inValue));
    console.log ('string:', str(ans));
    $('display').innerHTML = displayInRows (ans);

    const module = isValidDeriv (ans);
    $('visual').innerHTML = displayInRows(visualize(module));

    $('command').onchange = $('command').oninput = (e) => {
        console.log ($("command").value);
    }
}
