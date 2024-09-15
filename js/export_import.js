function exportState() {
    const tabs = [...state.tabs];
    const highlighted = [...state.highlighted];
    const json = JSON.stringify({
        tabs,
        currentTab: state.currentTab,
        highlighted,
    }, null, 2);

    console.log('exported', json);
}

function importState(state) {
}

