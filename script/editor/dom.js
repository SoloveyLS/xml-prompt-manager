// ==================== DOM Elements ====================
window.editor = document.getElementById('editor');
window.prettifyBtn = document.getElementById('prettifyBtn');
window.saveStructureBtn = document.getElementById('saveStructureBtn');
window.saveFieldBtn = document.getElementById('saveFieldBtn');
window.structureTabBtn = document.getElementById('structureTabBtn');
window.fieldTabBtn = document.getElementById('fieldTabBtn');
window.structureTab = document.getElementById('structureTab');
window.fieldTab = document.getElementById('fieldTab');
window.structureSaveArea = document.getElementById('structureSaveArea');
window.fieldSaveArea = document.getElementById('fieldSaveArea');
window.structureList = document.getElementById('structureList');
window.fieldList = document.getElementById('fieldList');
window.structureEmpty = document.getElementById('structureEmpty');
window.fieldEmpty = document.getElementById('fieldEmpty');
window.exportBtn = document.getElementById('exportBtn');
window.importBtn = document.getElementById('importBtn');
window.importFileInput = document.getElementById('importFileInput');

// Bottom Panel Elements
window.bottomPanelContainer = document.querySelector('.bottom-panel-container');
window.bottomResizer = document.getElementById('bottomResizer');
window.toggleBottomPanelBtn = document.getElementById('toggleBottomPanelBtn');
window.promptQuestionsTab = document.getElementById('promptQuestionsTab');
window.promptUnderstandingTab = document.getElementById('promptUnderstandingTab');
window.apiSetupTab = document.getElementById('apiSetupTab');
window.promptQuestionsPanel = document.getElementById('promptQuestionsPanel');
window.promptUnderstandingPanel = document.getElementById('promptUnderstandingPanel');
window.apiSetupPanel = document.getElementById('apiSetupPanel');
window.promptQuestionsInput = document.getElementById('promptQuestionsInput');
window.promptUnderstandingInput = document.getElementById('promptUnderstandingInput');
window.promptQuestionsOutput = document.getElementById('promptQuestionsOutput');
window.promptUnderstandingOutput = document.getElementById('promptUnderstandingOutput');

// API Setup Elements
window.apiProviderSelect = document.getElementById('apiProviderSelect');
window.apiKeyInput = document.getElementById('apiKeyInput');
window.preserveApiKeyCheckbox = document.getElementById('preserveApiKeyCheckbox');
window.apiKeyReminder = document.getElementById('apiKeyReminder');
window.modelInput = document.getElementById('modelInput');
window.baseUrlInput = document.getElementById('baseUrlInput');

// Structure modal elements
window.saveStructureModal = document.getElementById('saveStructureModal');
window.structureNameInput = document.getElementById('structureNameInput');
window.structureModalError = document.getElementById('structureModalError');
window.cancelStructureSaveBtn = document.getElementById('cancelStructureSaveBtn');
window.confirmStructureSaveBtn = document.getElementById('confirmStructureSaveBtn');

// Field modal elements
window.saveFieldModal = document.getElementById('saveFieldModal');
window.fieldNameInput = document.getElementById('fieldNameInput');
window.fieldContentInput = document.getElementById('fieldContentInput');
window.pasteFromEditorBtn = document.getElementById('pasteFromEditorBtn');
window.fieldModalError = document.getElementById('fieldModalError');
window.cancelFieldSaveBtn = document.getElementById('cancelFieldSaveBtn');
window.confirmFieldSaveBtn = document.getElementById('confirmFieldSaveBtn');

// Delete modal elements
window.deleteModal = document.getElementById('deleteModal');
window.deleteTemplateName = document.getElementById('deleteTemplateName');
window.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
window.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

window.statusMsg = document.getElementById('statusMsg');