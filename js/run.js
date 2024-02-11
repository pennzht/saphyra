$ = (x) => document.getElementById(x);

$('input').oninput = execute;

window.onload = (e) => {
    /* example input */
    $('input').value = sampleDeriv1;
    execute(e);
}

$('command').onchange = $('command').oninput = (e) => {
    console.log ($("command").value);
}

function execute (e) {
    const inValue = $('input').value;

    try {
        console.log (ans = parse (inValue));
        console.log ('string:', str(ans));
        $('display').innerHTML = displayInRows (ans);
        const module = isValidDeriv (ans);
        $('visual').innerHTML = displayInRows(visualize(module));
        $('output').innerText = JSON.stringify (module, null, 2);
    } catch (e) {
        if (e instanceof SyntaxError) {
            $('output').innerText = 'parsing error';
        }
    }
}

