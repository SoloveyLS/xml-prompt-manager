// ==================== Bottom Panel Functions ====================
function toggleBottomPanel() {
    bottomPanelVisible = !bottomPanelVisible;
    if (bottomPanelVisible) {
        bottomPanelContainer.style.display = 'flex';
        bottomPanelContainer.style.height = bottomPanelHeight + 'px';
        // Also show the resizer when panel is visible
        bottomResizer.style.display = 'flex';
        setStatus('Bottom panel shown');
    } else {
        bottomPanelContainer.style.display = 'none';
        // Hide resizer when panel is hidden
        bottomResizer.style.display = 'none';
        setStatus('Bottom panel hidden');
    }
    updateToggleButtonIcon();
    saveUIState('bottomPanelVisible', bottomPanelVisible);
}

function updateToggleButtonIcon() {
    const iconSvg = toggleBottomPanelBtn.querySelector('svg path');
    if (bottomPanelVisible) {
        // Chevron down to close panel
        iconSvg.setAttribute('d', 'M19 9l-7 7-7-7');
    } else {
        // Chevron up to open panel
        iconSvg.setAttribute('d', 'M5 15l7-7 7 7');
    }
}

function startResize(e) {
    isResizing = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    bottomResizer.style.backgroundColor = '#3b82f6';

    // Prevent text selection during resize
    e.preventDefault();
}

function resizePanel(e) {
    if (!isResizing) return;

    const windowHeight = window.innerHeight;
    const minHeight = 150; // Minimum panel height
    const maxHeight = windowHeight * 0.8; // Maximum 80% of window height

    // Calculate new height based on mouse position from top
    let newHeight = windowHeight - e.clientY;

    // Clamp height within min/max bounds
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    bottomPanelHeight = newHeight;
    bottomPanelContainer.style.height = newHeight + 'px';

    e.preventDefault();
}

function stopResize() {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        bottomResizer.style.backgroundColor = '';

        // Save panel height to localStorage
        localStorage.setItem('xmlPromptBuilder_bottomPanelHeight', bottomPanelHeight.toString());
    }
}

function switchBottomTab(tabName) {
    // Update tab active states
    const tabs = [promptQuestionsTab, promptUnderstandingTab, apiSetupTab];
    const panels = [promptQuestionsPanel, promptUnderstandingPanel, apiSetupPanel];

    tabs.forEach(tab => {
        tab.classList.remove('text-blue-400', 'bg-gray-600');
        tab.classList.add('text-gray-400');
    });

    panels.forEach(panel => panel.classList.add('hidden'));

    // Activate selected tab
    switch (tabName) {
        case 'prompt-questions':
            promptQuestionsTab.classList.remove('text-gray-400');
            promptQuestionsTab.classList.add('text-blue-400', 'bg-gray-600');
            promptQuestionsPanel.classList.remove('hidden');
            activeBottomTab = 'prompt-questions';
            // Focus input for immediate typing
            setTimeout(() => promptQuestionsInput.focus(), 100);
            break;
        case 'prompt-understanding':
            promptUnderstandingTab.classList.remove('text-gray-400');
            promptUnderstandingTab.classList.add('text-blue-400', 'bg-gray-600');
            promptUnderstandingPanel.classList.remove('hidden');
            activeBottomTab = 'prompt-understanding';
            setTimeout(() => promptUnderstandingInput.focus(), 100);
            break;
        case 'api-setup':
            apiSetupTab.classList.remove('text-gray-400');
            apiSetupTab.classList.add('text-blue-400', 'bg-gray-600');
            apiSetupPanel.classList.remove('hidden');
            activeBottomTab = 'api-setup';
            break;
    }
    saveUIState('activeBottomTab', activeBottomTab);
}

// ==================== API Settings ====================
function loadApiSettings() {
    // Load API settings from localStorage
    if (apiSettings.provider) apiProviderSelect.value = apiSettings.provider;
    if (apiSettings.model) modelInput.value = apiSettings.model;
    if (apiSettings.baseUrl) baseUrlInput.value = apiSettings.baseUrl;

    // Handle API key preservation
    const savedApiKey = localStorage.getItem('xmlPromptBuilder_apiKey');
    if (savedApiKey && apiSettings.apiKey) {
        apiKeyInput.value = savedApiKey;
        preserveApiKeyCheckbox.checked = true;
    } else {
        preserveApiKeyCheckbox.checked = false;
    }

    updateApiKeyReminder();
}

// Show/hide API key reminder
function updateApiKeyReminder() {
    const hasApiKeyInInput = apiKeyInput.value.trim();
    const hasProvider = apiProviderSelect.value;
    const hasModel = modelInput.value.trim();

    if (hasProvider && hasModel && !hasApiKeyInInput) {
        apiKeyReminder.classList.remove('hidden');
    } else {
        apiKeyReminder.classList.add('hidden');
    }
}

// Save API settings
function saveApiSettings() {
    apiSettings.provider = apiProviderSelect.value;
    apiSettings.model = modelInput.value.trim();
    apiSettings.baseUrl = baseUrlInput.value.trim();

    if (preserveApiKeyCheckbox.checked || hasEnteredApiKey) {
        apiSettings.apiKey = apiKeyInput.value.trim();
        localStorage.setItem('xmlPromptBuilder_apiKey', apiKeyInput.value.trim());
    } else {
        delete apiSettings.apiKey;
        localStorage.removeItem('xmlPromptBuilder_apiKey');
    }

    localStorage.setItem('xmlPromptBuilder_apiSettings', JSON.stringify(apiSettings));
    setStatus('API settings saved');
}

// ==================== Event Listeners for API Settings ====================
apiProviderSelect.addEventListener('change', () => {
    updateApiKeyReminder();
    saveApiSettings();
});

apiKeyInput.addEventListener('input', () => {
    hasEnteredApiKey = true;
    updateApiKeyReminder();
});

preserveApiKeyCheckbox.addEventListener('change', () => {
    saveApiSettings();
});

modelInput.addEventListener('input', () => {
    updateApiKeyReminder();
    saveApiSettings();
});

baseUrlInput.addEventListener('input', saveApiSettings);

// Make some functions globally available
window.loadApiSettings = loadApiSettings;
window.updateApiKeyReminder = updateApiKeyReminder;
window.saveApiSettings = saveApiSettings;

// ==================== Bottom Panel Event Listeners ====================
toggleBottomPanelBtn.addEventListener('click', toggleBottomPanel);

// Resize functionality
bottomResizer.addEventListener('mousedown', startResize);
document.addEventListener('mousemove', resizePanel);
document.addEventListener('mouseup', stopResize);

// Tab switching
promptQuestionsTab.addEventListener('click', () => switchBottomTab('prompt-questions'));
promptUnderstandingTab.addEventListener('click', () => switchBottomTab('prompt-understanding'));
apiSetupTab.addEventListener('click', () => switchBottomTab('api-setup'));