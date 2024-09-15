function exportState() {
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

    // Add element and download.
    const a = elem('a', {
        href: 'data:text/plain;base64,' + window.btoa(json),
        download: 'saphyra_export.json',
    });
    a.click();
}

function importState(state) {
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
