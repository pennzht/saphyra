function exportState() {
    const tabs = [...state.tabs].map ((pair) => {
        const [name, [activeStep, ...steps]] = pair;
        const stepsTranslated = steps.map((s) => str(s));
        return [name, [activeStep, stepsTranslated]];
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
}

