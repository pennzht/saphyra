function exportState(target /*file, server*/) {
    const tabs = [...state.tabs].map ((pair) => {
        const [name, [activeStep, ...steps]] = pair;
        const stepsTranslated = steps.map((s) => str(s));
        return [name, [activeStep, ...stepsTranslated]];
    });
    const highlighted = [...state.highlighted];
    const json = JSON.stringify({
        currentTab: state.currentTab,
        highlighted,
        tabs,
    }, null, 2);

    // JSON is a string representing the current state.

    if (target === 'file') {
        // Add element and download.
        const a = elem('a', {
            href: 'data:text/plain;base64,' + window.btoa(json),
            download: 'saphyra_export.json',
        });
        a.click();
    } else if (target === 'server') {
        fetch ('http://0.0.0.0:8000/saphyra-upload/', {
            method: 'POST',
            body: json,
        }).then ((response) => {
            if (response.ok) {
                alert('Response ok');
            } else {
                alert('Response not ok ' + response.status);
            }
        });
    }
}

function importState(target /*file, server*/) {
    const fileInput = elem('input', {
        type: 'file',
    });
    fileInput.click();

    fileInput.onchange = (e) => {
        console.log('file', e.target.files[0]);

        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e2) => {setEditorState(reader.result);};
        reader.readAsText(file);
    }
}

function setEditorState(result) {
    console.log('Finished reading', result);
    const data = JSON.parse(result);

    state.tabs = new Map(data.tabs.map ((pair) => {
        const [name, [activeStep, ...stepsTranslated]] = pair;
        const steps = stepsTranslated.map((s) => parseOne(s));
        return [name, [activeStep, ...steps]];
    }));
    state.highlighted = new Set(data.highlighted);
    state.currentTab = data.currentTab;
    updateState();
}
