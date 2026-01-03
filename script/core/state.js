// ==================== State Management ====================

// Template storage
window.structureTemplates = JSON.parse(localStorage.getItem('xmlPromptBuilder_structures') || '{}');
window.fieldTemplates = JSON.parse(localStorage.getItem('xmlPromptBuilder_fields') || '{}');
window.deleteTarget = { type: null, name: null };

// Session persistence state
window.lastSavedContent = ''; // Track for efficient auto-save
window.autoSaveTimer = null; // 30-second auto-save timer

window.apiSettings = JSON.parse(localStorage.getItem('xmlPromptBuilder_apiSettings') || '{}');
window.bottomPanelVisible = JSON.parse(localStorage.getItem('xmlPromptBuilder_bottomPanelVisible') || 'true');
window.activeSidebarTab = localStorage.getItem('xmlPromptBuilder_activeSidebarTab') || 'structures';
window.activeBottomTab = localStorage.getItem('xmlPromptBuilder_activeBottomTab') || 'prompt-questions';
window.bottomPanelHeight = 300; // Default height in pixels
window.isResizing = false;

// Tag tracking for live sync
window.tagPairMap = new Map(); // Maps tag positions to their pairs
window.isUpdatingPair = false; // Prevent infinite loops
window.lastTagEditInfo = null; // Track which tag was last edited

// Track if user has started entering API key after refresh
window.hasEnteredApiKey = false;