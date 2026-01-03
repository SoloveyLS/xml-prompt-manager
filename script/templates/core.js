// ==================== Tab Switching ====================
structureTabBtn.addEventListener('click', () => {
    structureTabBtn.classList.add('tab-active');
    structureTabBtn.classList.remove('text-gray-400');
    fieldTabBtn.classList.remove('tab-active');
    fieldTabBtn.classList.add('text-gray-400');
    structureTab.classList.remove('hidden');
    fieldTab.classList.add('hidden');
    structureSaveArea.classList.remove('hidden');
    fieldSaveArea.classList.add('hidden');
    saveUIState('activeSidebarTab', 'structures');
});

fieldTabBtn.addEventListener('click', () => {
    fieldTabBtn.classList.add('tab-active');
    fieldTabBtn.classList.remove('text-gray-400');
    structureTabBtn.classList.remove('tab-active');
    structureTabBtn.classList.add('text-gray-400');
    fieldTab.classList.remove('hidden');
    structureTab.classList.add('hidden');
    fieldSaveArea.classList.remove('hidden');
    structureSaveArea.classList.add('hidden');
    saveUIState('activeSidebarTab', 'fields');
});

// ==================== Save Structure Templates ====================
saveStructureBtn.addEventListener('click', () => {
    structureModalError.classList.add('hidden');
    structureNameInput.value = '';
    saveStructureModal.classList.remove('hidden');
    setTimeout(() => structureNameInput.focus(), 100);
});

cancelStructureSaveBtn.addEventListener('click', () => {
    saveStructureModal.classList.add('hidden');
});

confirmStructureSaveBtn.addEventListener('click', saveStructureTemplate);
structureNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveStructureTemplate();
    if (e.key === 'Escape') saveStructureModal.classList.add('hidden');
});

function saveStructureTemplate() {
    const name = structureNameInput.value.trim();
    if (!name) {
        structureModalError.textContent = 'Please enter a template name';
        structureModalError.classList.remove('hidden');
        return;
    }

    const content = editor.value.trim();
    const validation = validateXMLStructure(content);

    if (!validation.valid) {
        structureModalError.textContent = validation.error;
        structureModalError.classList.remove('hidden');
        return;
    }

    structureTemplates[name] = content;
    localStorage.setItem('xmlPromptBuilder_structures', JSON.stringify(structureTemplates));
    renderStructureTemplates();
    setStatus(`Structure template "${name}" saved`);
    saveStructureModal.classList.add('hidden');
}

// ==================== Save Field Templates ====================
saveFieldBtn.addEventListener('click', () => {
    fieldModalError.classList.add('hidden');
    fieldNameInput.value = '';
    fieldContentInput.value = '';
    saveFieldModal.classList.remove('hidden');
    setTimeout(() => fieldNameInput.focus(), 100);
});

pasteFromEditorBtn.addEventListener('click', () => {
    fieldContentInput.value = editor.value;
    fieldContentInput.focus();
    setStatus('Content pasted from editor');
});

cancelFieldSaveBtn.addEventListener('click', () => {
    saveFieldModal.classList.add('hidden');
});

confirmFieldSaveBtn.addEventListener('click', saveFieldTemplate);
fieldNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') saveFieldModal.classList.add('hidden');
});
fieldContentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') saveFieldModal.classList.add('hidden');
});

function saveFieldTemplate() {
    const name = fieldNameInput.value.trim();
    if (!name) {
        fieldModalError.textContent = 'Please enter a template name';
        fieldModalError.classList.remove('hidden');
        return;
    }

    const content = fieldContentInput.value.trim();
    const validation = validateSingleRoot(content);

    if (!validation.valid) {
        fieldModalError.textContent = validation.error;
        fieldModalError.classList.remove('hidden');
        return;
    }

    fieldTemplates[name] = content;
    localStorage.setItem('xmlPromptBuilder_fields', JSON.stringify(fieldTemplates));
    renderFieldTemplates();
    setStatus(`Field template "${name}" saved`);
    saveFieldModal.classList.add('hidden');
}

// ==================== Render Templates ====================
function renderStructureTemplates() {
    structureList.innerHTML = '';
    const names = Object.keys(structureTemplates);
    structureEmpty.classList.toggle('hidden', names.length > 0);

    names.forEach(name => {
        const item = createTemplateItem(name, 'structure', structureTemplates[name]);
        structureList.appendChild(item);
    });
}

function renderFieldTemplates() {
    fieldList.innerHTML = '';
    const names = Object.keys(fieldTemplates);
    fieldEmpty.classList.toggle('hidden', names.length > 0);

    names.forEach(name => {
        const item = createTemplateItem(name, 'field', fieldTemplates[name]);
        fieldList.appendChild(item);
    });
}

function createTemplateItem(name, type, content) {
    const div = document.createElement('div');
    div.className = 'template-item flex items-center justify-between p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer group transition';

    const leftPart = document.createElement('div');
    leftPart.className = 'flex items-center gap-2 flex-1 min-w-0';

    const icon = document.createElement('span');
    icon.className = type === 'structure' ? 'text-green-400' : 'text-purple-400';
    icon.innerHTML = type === 'structure'
        ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>'
        : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm truncate';
    nameSpan.textContent = name;

    leftPart.appendChild(icon);
    leftPart.appendChild(nameSpan);

    leftPart.addEventListener('click', () => {
        if (type === 'structure') {
            editor.value = content;
            setStatus(`Loaded structure template "${name}"`);
        } else {
            insertAtCursor(content);
            setStatus(`Inserted field template "${name}"`);
        }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn text-red-400 hover:text-red-300 opacity-0 ml-2 p-1 rounded hover:bg-gray-500 transition';
    deleteBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTarget = { type, name };
        deleteTemplateName.textContent = name;
        deleteModal.classList.remove('hidden');
    });

    div.appendChild(leftPart);
    div.appendChild(deleteBtn);
    return div;
}

// ==================== Delete Templates ====================
cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
});

confirmDeleteBtn.addEventListener('click', () => {
    if (deleteTarget.type === 'structure') {
        delete structureTemplates[deleteTarget.name];
        localStorage.setItem('xmlPromptBuilder_structures', JSON.stringify(structureTemplates));
        renderStructureTemplates();
    } else {
        delete fieldTemplates[deleteTarget.name];
        localStorage.setItem('xmlPromptBuilder_fields', JSON.stringify(fieldTemplates));
        renderFieldTemplates();
    }
    setStatus(`Deleted template "${deleteTarget.name}"`);
    deleteModal.classList.add('hidden');
});

// ==================== Utilities ====================
function insertAtCursor(text) {
    editor.focus();
    document.execCommand('insertText', false, text);
}

window.setStatus = function(message) {
    statusMsg.textContent = message;
    setTimeout(() => {
        statusMsg.textContent = 'Ready';
    }, 3000);
}

window.renderStructureTemplates = renderStructureTemplates;
window.renderFieldTemplates = renderFieldTemplates;
window.insertAtCursor = insertAtCursor;

// Close modals on outside click
saveStructureModal.addEventListener('click', (e) => {
    if (e.target === saveStructureModal) saveStructureModal.classList.add('hidden');
});

saveFieldModal.addEventListener('click', (e) => {
    if (e.target === saveFieldModal) saveFieldModal.classList.add('hidden');
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.classList.add('hidden');
});