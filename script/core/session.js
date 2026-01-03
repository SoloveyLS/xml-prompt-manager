// ==================== Session Persistence ====================

// Save editor content to localStorage (efficient - only saves if changed)
function saveEditorContent() {
    try {
        if (editor.value !== lastSavedContent) {
            localStorage.setItem('xmlPromptBuilder_editorContent', editor.value);
            lastSavedContent = editor.value;
        }
    } catch (error) {
        console.warn('Failed to save editor content to localStorage:', error);
    }
}

// Save UI state to localStorage
function saveUIState(stateKey, value) {
    try {
        localStorage.setItem(`xmlPromptBuilder_${stateKey}`, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to save ${stateKey} to localStorage:`, error);
    }
}