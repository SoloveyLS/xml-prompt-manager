// ==================== Export / Import ====================
exportBtn.addEventListener('click', () => {
    const data = {
        app: 'xml-prompt-builder',
        version: 1,
        exportedAt: new Date().toISOString(),
        templates: {
            structures: structureTemplates,
            fields: fieldTemplates
        },
        session: {
            editorContent: editor.value,
            activeTab: structureTab.classList.contains('hidden') ? 'field' : 'structure'
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `xml-prompt-builder-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('Exported templates and session to file');
});

importBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (!data || data.app !== 'xml-prompt-builder') {
                alert('This file does not look like an XML Prompt Builder export.');
                setStatus('Import failed: invalid file');
                return;
            }

            // Merge templates (imported values override same-name existing ones)
            if (data.templates) {
                if (data.templates.structures && typeof data.templates.structures === 'object') {
                    structureTemplates = { ...structureTemplates, ...data.templates.structures };
                }
                if (data.templates.fields && typeof data.templates.fields === 'object') {
                    fieldTemplates = { ...fieldTemplates, ...data.templates.fields };
                }
                localStorage.setItem('xmlPromptBuilder_structures', JSON.stringify(structureTemplates));
                localStorage.setItem('xmlPromptBuilder_fields', JSON.stringify(fieldTemplates));
                renderStructureTemplates();
                renderFieldTemplates();
            }

            // Restore session state
            if (data.session) {
                if (typeof data.session.editorContent === 'string') {
                    editor.value = data.session.editorContent;
                }

                if (data.session.activeTab === 'field') {
                    fieldTabBtn.click();
                } else if (data.session.activeTab === 'structure') {
                    structureTabBtn.click();
                }
            }

            setStatus('Imported templates and session from file');
        } catch (err) {
            console.error(err);
            alert('Could not import file: invalid JSON format.');
            setStatus('Import failed: invalid JSON');
        } finally {
            // Allow re-importing the same file later
            importFileInput.value = '';
        }
    };

    reader.readAsText(file);
});