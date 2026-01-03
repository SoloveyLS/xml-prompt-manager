// Main entry point - loads all modules

// Load all modules (order is important for dependencies)
const modules = [
    'script/core/state.js',
    'script/core/session.js',
    'script/editor/dom.js',
    'script/editor/tag-parsing.js',
    'script/editor/indentation.js',
    'script/templates/validation.js',
    'script/templates/core.js',
    'script/templates/export-import.js',
    'script/ui/ui.js',
    'script/ai/api-integration.js'
];

// Load modules dynamically (to maintain execution order)
let loadedCount = 0;

function loadScript(src) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
        loadedCount++;
        if (loadedCount === modules.length) {
            initializeApp();
        }
    };
    script.onerror = () => {
        console.error(`Failed to load ${src}`);
    };
    document.head.appendChild(script);
}

// Load all modules
modules.forEach(module => loadScript(module));

function initializeApp() {
    // ==================== Global Event Listeners ====================

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            saveStructureModal.classList.add('hidden');
            saveFieldModal.classList.add('hidden');
            deleteModal.classList.add('hidden');
        }
    });

    // ==================== Initialize ====================

    // Load session persistence state
    const savedEditorContent = localStorage.getItem('xmlPromptBuilder_editorContent');
    if (savedEditorContent !== null) {
        editor.value = savedEditorContent;
        lastSavedContent = savedEditorContent;
    }

    // Load bottom panel settings
    const savedHeight = localStorage.getItem('xmlPromptBuilder_bottomPanelHeight');
    if (savedHeight) {
        bottomPanelHeight = parseInt(savedHeight, 10);
        bottomPanelContainer.style.height = bottomPanelHeight + 'px';
    }

    // Hide resizer initially if panel is not visible
    if (!bottomPanelVisible) {
        bottomResizer.style.display = 'none';
    }

    renderStructureTemplates();
    renderFieldTemplates();
    loadApiSettings();
    switchBottomTab(activeBottomTab); // Initialize with first tab active

    // Add some example templates if none exist
    if (Object.keys(structureTemplates).length === 0) {
        structureTemplates['Basic Prompt'] = '<system_prompt>\n    <role>You are a helpful assistant.</role>\n    <instructions>\n        <instruction>Be concise and clear.</instruction>\n        <instruction>Provide accurate information.</instruction>\n    </instructions>\n</system_prompt>';
        structureTemplates['Task Template'] = '<task>\n    <context></context>\n    <goal></goal>\n    <constraints>\n        <constraint></constraint>\n    </constraints>\n    <output_format></output_format>\n</task>';
        localStorage.setItem('xmlPromptBuilder_structures', JSON.stringify(structureTemplates));
        renderStructureTemplates();
    }

    if (Object.keys(fieldTemplates).length === 0) {
        fieldTemplates['Example Field'] = '<example>\n    <input></input>\n    <output></output>\n</example>';
        fieldTemplates['Step Field'] = '<step>\n    <action></action>\n    <expected_result></expected_result>\n</step>';
        localStorage.setItem('xmlPromptBuilder_fields', JSON.stringify(fieldTemplates));
        renderFieldTemplates();
    }

    updateToggleButtonIcon(); // Set initial button icon

    // Initialize UI state based on saved values
    if (activeSidebarTab === 'fields') {
        fieldTabBtn.click(); // Switch to field tab
    }
    // Bottom panel tab is already handled by switchBottomTab(activeBottomTab) above

    // Setup auto-save timer (30 seconds)
    autoSaveTimer = setInterval(saveEditorContent, 30000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(autoSaveTimer);
        saveEditorContent(); // Final save on exit
    });
}