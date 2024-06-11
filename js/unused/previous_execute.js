/*

const matchedRules = getMatchedRules(module, trace, content);
if (matchedRules.length === 0) return;

$('display').innerHTML = '';
$('display').appendChild(elem('div', [],
    matchedRules.map((mr) => {
        const [space, port, io, stmt, ruleName, ...args] = mr;
        const subinput = ruleName === 'add-goal' ?
            [
              elem('input', {type: 'text', id: 'add-goal'}),
              elem('div', {}, [text('Enter an expression in Lisp-like syntax, such as (-> (and _A _B) (-> _C _A))')]),
            ] : [];
        return elem('div',
            {class: 'matched-rule'},
            [
              dispStmt(stmt), text(ruleName), ...subinput, text(' '),
              elem('button', {'data-rule': str(mr), class: 'apply-rule'}, [text('Apply')]),
            ],
        );
    }),
));
for (const mrElement of document.getElementsByClassName('apply-rule')) {
    mrElement.onclick = (e) => {
        // New node.
        const additionalArgs = {};
        if ($('add-goal')) {
            additionalArgs.goalContent = $('add-goal').value;
        }

        // Updates state.

        const newCode =
            applyMatchedRule(
                code,
                parseOne(mrElement.getAttribute('data-rule')),
                additionalArgs,
            );

        const currentTabObj = state.tabs.get(state.currentTab);
        tabAddStep(currentTabObj, newCode);
        updateState();
    }
}
*/
