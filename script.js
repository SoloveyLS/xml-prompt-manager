// ==================== State ====================
let structureTemplates = JSON.parse(localStorage.getItem('xmlPromptBuilder_structures') || '{}');
let fieldTemplates = JSON.parse(localStorage.getItem('xmlPromptBuilder_fields') || '{}');
let deleteTarget = { type: null, name: null };

// Session persistence state
let lastSavedContent = ''; // Track for efficient auto-save
let autoSaveTimer = null; // 30-second auto-save timer

let apiSettings = JSON.parse(localStorage.getItem('xmlPromptBuilder_apiSettings') || '{}');
let bottomPanelVisible = JSON.parse(localStorage.getItem('xmlPromptBuilder_bottomPanelVisible') || 'true');
let activeSidebarTab = localStorage.getItem('xmlPromptBuilder_activeSidebarTab') || 'structures';
let activeBottomTab = localStorage.getItem('xmlPromptBuilder_activeBottomTab') || 'prompt-questions';
let bottomPanelHeight = 300; // Default height in pixels
let isResizing = false;

// Tag tracking for live sync
let tagPairMap = new Map(); // Maps tag positions to their pairs
let isUpdatingPair = false; // Prevent infinite loops
let lastTagEditInfo = null; // Track which tag was last edited

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

// ==================== DOM Elements ====================
const editor = document.getElementById('editor');
const lessenBtn = document.getElementById('lessenBtn');
const prettifyBtn = document.getElementById('prettifyBtn');
const saveStructureBtn = document.getElementById('saveStructureBtn');
const saveFieldBtn = document.getElementById('saveFieldBtn');
const structureTabBtn = document.getElementById('structureTabBtn');
const fieldTabBtn = document.getElementById('fieldTabBtn');
const structureTab = document.getElementById('structureTab');
const fieldTab = document.getElementById('fieldTab');
const structureSaveArea = document.getElementById('structureSaveArea');
const fieldSaveArea = document.getElementById('fieldSaveArea');
const structureList = document.getElementById('structureList');
const fieldList = document.getElementById('fieldList');
const structureEmpty = document.getElementById('structureEmpty');
const fieldEmpty = document.getElementById('fieldEmpty');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

// Bottom Panel Elements
const bottomPanelContainer = document.querySelector('.bottom-panel-container');
const bottomResizer = document.getElementById('bottomResizer');
const toggleBottomPanelBtn = document.getElementById('toggleBottomPanelBtn');
const promptQuestionsTab = document.getElementById('promptQuestionsTab');
const promptUnderstandingTab = document.getElementById('promptUnderstandingTab');
const apiSetupTab = document.getElementById('apiSetupTab');
const promptQuestionsPanel = document.getElementById('promptQuestionsPanel');
const promptUnderstandingPanel = document.getElementById('promptUnderstandingPanel');
const apiSetupPanel = document.getElementById('apiSetupPanel');
const promptQuestionsInput = document.getElementById('promptQuestionsInput');
const promptUnderstandingInput = document.getElementById('promptUnderstandingInput');
const promptQuestionsOutput = document.getElementById('promptQuestionsOutput');
const promptUnderstandingOutput = document.getElementById('promptUnderstandingOutput');

// API Setup Elements
const apiProviderSelect = document.getElementById('apiProviderSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const preserveApiKeyCheckbox = document.getElementById('preserveApiKeyCheckbox');
const modelInput = document.getElementById('modelInput');
const baseUrlInput = document.getElementById('baseUrlInput');

// Structure modal elements
const saveStructureModal = document.getElementById('saveStructureModal');
const structureNameInput = document.getElementById('structureNameInput');
const structureModalError = document.getElementById('structureModalError');
const cancelStructureSaveBtn = document.getElementById('cancelStructureSaveBtn');
const confirmStructureSaveBtn = document.getElementById('confirmStructureSaveBtn');

// Field modal elements
const saveFieldModal = document.getElementById('saveFieldModal');
const fieldNameInput = document.getElementById('fieldNameInput');
const fieldContentInput = document.getElementById('fieldContentInput');
const pasteFromEditorBtn = document.getElementById('pasteFromEditorBtn');
const fieldModalError = document.getElementById('fieldModalError');
const cancelFieldSaveBtn = document.getElementById('cancelFieldSaveBtn');
const confirmFieldSaveBtn = document.getElementById('confirmFieldSaveBtn');

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const deleteTemplateName = document.getElementById('deleteTemplateName');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

const statusMsg = document.getElementById('statusMsg');
const modeIndicator = document.getElementById('modeIndicator');

// ==================== Tag Parsing Utilities ====================
function parseAllTags(text) {
    const tags = [];
    const tagRegex = /<\/?([a-zA-Z_][a-zA-Z0-9_]*)\s*>/g;
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];
        const isClosing = fullTag.startsWith('</');
        const isSelfClosing = fullTag.endsWith('/>');
        
        if (!isSelfClosing) {
            tags.push({
                name: tagName,
                isClosing,
                start: match.index,
                end: match.index + fullTag.length,
                nameStart: match.index + (isClosing ? 2 : 1),
                nameEnd: match.index + (isClosing ? 2 : 1) + tagName.length
            });
        }
    }
    
    return tags;
}

function findTagPairs(tags) {
    const pairs = [];
    const stack = [];
    
    for (const tag of tags) {
        if (!tag.isClosing) {
            stack.push(tag);
        } else {
            if (stack.length > 0) {
                const openTag = stack.pop();
                pairs.push({ open: openTag, close: tag });
            }
        }
    }
    
    return pairs;
}

function findTagAtCursor(text, cursorPos) {
    const tags = parseAllTags(text);
    
    for (const tag of tags) {
        // Check if cursor is within the tag name part
        if (cursorPos >= tag.nameStart && cursorPos <= tag.nameEnd) {
            return tag;
        }
        // Also check if cursor is right after editing the tag name (before >)
        if (cursorPos > tag.nameStart && cursorPos <= tag.end - 1) {
            return tag;
        }
    }
    
    return null;
}

function findPairForTag(tag, pairs) {
    for (const pair of pairs) {
        if (pair.open === tag) return pair.close;
        if (pair.close === tag) return pair.open;
    }
    return null;
}

// ==================== Live Tag Synchronization ====================
function syncTagPair(text, editedTag, pairs) {
    const pairTag = findPairForTag(editedTag, pairs);
    if (!pairTag) return text;
    
    // Get the current name from the edited tag
    const newName = text.substring(editedTag.nameStart, editedTag.nameEnd);
    
    // Validate tag name
    if (!newName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        return text; // Invalid tag name, don't sync
    }
    
    // Calculate the new text
    const before = text.substring(0, pairTag.nameStart);
    const after = text.substring(pairTag.nameEnd);
    
    return before + newName + after;
}

let syncTimeout = null;

editor.addEventListener('input', (e) => {
    // Handle <> pattern for new tag creation
    if (e.inputType === 'insertText' && e.data === '>') {
        const cursorPos = editor.selectionStart;
        const text = editor.value;
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        
        // Check for '<>' pattern - empty tag being created
        if (beforeCursor.endsWith('<>')) {
            const tagName = 'tag_name';
            const startPos = cursorPos - 2;
            const newText = text.substring(0, startPos) + 
                            `<${tagName}></${tagName}>` + 
                            afterCursor;
            editor.value = newText;
            // Select the tag name for easy editing
            const selectStart = startPos + 1;
            const selectEnd = selectStart + tagName.length;
            editor.setSelectionRange(selectStart, selectEnd);
            setStatus('Created new tag pair - edit the selected tag name');
            return;
        }
        
        // Check for '<tagname>' pattern without closing tag nearby
        const openTagMatch = beforeCursor.match(/<([a-zA-Z_][a-zA-Z0-9_]*)>$/);
        if (openTagMatch) {
            const tagName = openTagMatch[1];
            // Check if there's already a closing tag after
            const closingTagPattern = new RegExp(`^\\s*</${tagName}>`);
            if (!closingTagPattern.test(afterCursor)) {
                const beforeTag = beforeCursor.slice(0, -openTagMatch[0].length);
                if (!beforeTag.endsWith('/')) {
                    const newText = beforeCursor + `</${tagName}>` + afterCursor;
                    editor.value = newText;
                    editor.setSelectionRange(cursorPos, cursorPos);
                }
            }
        }
        return;
    }
    
    // Live tag synchronization
    if (isUpdatingPair) return;
    
    // Debounce the sync to avoid too many updates
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        performLiveSync();
    }, 50);
});

function performLiveSync() {
    if (isUpdatingPair) return;
    
    const cursorPos = editor.selectionStart;
    const text = editor.value;
    
    // Find which tag the cursor is in
    const tags = parseAllTags(text);
    const pairs = findTagPairs(tags);
    
    // Find the tag being edited
    let editedTag = null;
    for (const tag of tags) {
        if (cursorPos >= tag.nameStart && cursorPos <= tag.nameEnd + 1) {
            editedTag = tag;
            break;
        }
    }
    
    if (!editedTag) return;
    
    // Find its pair
    const pairTag = findPairForTag(editedTag, pairs);
    if (!pairTag) return;
    
    // Check if names differ
    const editedName = text.substring(editedTag.nameStart, editedTag.nameEnd);
    const pairName = text.substring(pairTag.nameStart, pairTag.nameEnd);
    
    if (editedName === pairName) return;
    if (!editedName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) return;
    
    // Calculate offset for cursor position after replacement
    const lengthDiff = editedName.length - pairName.length;
    const pairIsBeforeCursor = pairTag.nameStart < cursorPos;
    
    // Sync the pair tag
    isUpdatingPair = true;
    
    const before = text.substring(0, pairTag.nameStart);
    const after = text.substring(pairTag.nameEnd);
    editor.value = before + editedName + after;
    
    // Adjust cursor position if the pair tag was before the cursor
    let newCursorPos = cursorPos;
    if (pairIsBeforeCursor) {
        newCursorPos = cursorPos + lengthDiff;
    }
    
    editor.setSelectionRange(newCursorPos, newCursorPos);
    
    isUpdatingPair = false;
    setStatus('Tag synchronized');
}

// ==================== Keyboard Handlers (Drag Line / Underscore) ====================
editor.addEventListener('keydown', (e) => {
    // Ctrl+/ to toggle bottom panel (like VSCode)
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        toggleBottomPanel();
        return;
    }

    // Tab key for indentation (Shift+Tab for un-indentation)
    if (e.key === 'Tab') {
        e.preventDefault(); // Prevent default TAB focus cycling

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const isUnindent = e.shiftKey;

        // Check if we have a selection spanning multiple lines
        const hasMultiLineSelection = start !== end && text.substring(start, end).includes('\n');

        if (hasMultiLineSelection) {
            // Multi-line tab indentation/un-indentation
            const beforeSelection = text.substring(0, start);
            const selectedText = text.substring(start, end);
            const afterSelection = text.substring(end);

            // Find the line boundaries
            const beforeLines = beforeSelection.split('\n');
            const selectedLines = selectedText.split('\n');
            const afterLines = afterSelection.split('\n');

            let modifiedLines;
            let indentChange = 0;

            if (isUnindent) {
                // Remove up to 4 spaces from the beginning of each selected line
                modifiedLines = selectedLines.map(line => {
                    const match = line.match(/^ {1,4}/);
                    if (match) {
                        indentChange -= match[0].length;
                        return line.substring(match[0].length);
                    }
                    return line;
                });
                setStatus(`Un-indented ${selectedLines.length} lines`);
            } else {
                // Add tab (4 spaces) to the beginning of each selected line
                modifiedLines = selectedLines.map(line => '    ' + line);
                indentChange = 4;
                setStatus(`Indented ${selectedLines.length} lines`);
            }

            const newText = beforeLines.slice(0, -1).join('\n') + '\n' +
                           modifiedLines.join('\n') + '\n' +
                           (afterLines.length > 0 ? afterLines[0] : '') +
                           (afterLines.length > 1 ? '\n' + afterLines.slice(1).join('\n') : '');

            editor.value = newText;

            // Preserve (shift) the selection range
            let newSelectionStart = start;
            let newSelectionEnd = end + (indentChange * selectedLines.length);

            // Adjust for the fact that we're modifying the text
            if (isUnindent) {
                // For un-indent, we need to move selection start left by removed spaces
                const spacesRemoved = selectedLines.reduce((total, line) => {
                    const match = line.match(/^ {1,4}/);
                    return total + (match ? match[0].length : 0);
                }, 0);
                newSelectionStart = Math.max(0, start - spacesRemoved);
                newSelectionEnd = Math.max(0, end - spacesRemoved);
            }

            editor.setSelectionRange(newSelectionStart, newSelectionEnd);

        } else if (isUnindent) {
            // Single line un-indentation - remove up to 4 spaces before cursor
            const before = text.substring(0, start);
            const after = text.substring(end);

            // Check if there are spaces before the cursor
            const spaceMatch = before.match(/ {1,4}$/);
            if (spaceMatch) {
                const spacesToRemove = spaceMatch[0].length;
                const newBefore = before.substring(0, before.length - spacesToRemove);
                editor.value = newBefore + after;
                editor.setSelectionRange(start - spacesToRemove, start - spacesToRemove);
                setStatus(`Removed ${spacesToRemove} spaces`);
            } else {
                setStatus('No indentation to remove');
            }
        } else {
            // Single line or no selection - insert 4 spaces
            const spaces = '    ';
            const before = text.substring(0, start);
            const after = text.substring(end);

            editor.value = before + spaces + after;
            editor.setSelectionRange(start + spaces.length, start + spaces.length);
            setStatus('Inserted 4 spaces');
        }
        return;
    }

    // Alt + Up/Down to move lines
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        moveSelection(e.key === 'ArrowUp' ? -1 : 1);
        return;
    }

    // Space to underscore in tags
    if (e.key === ' ') {
        const cursorPos = editor.selectionStart;
        const text = editor.value;
        const beforeCursor = text.substring(0, cursorPos);

        // Check if we're inside a tag name (opening or closing)
        const inOpeningTag = beforeCursor.match(/<([a-zA-Z_][a-zA-Z0-9_]*)$/);
        const inClosingTag = beforeCursor.match(/<\/([a-zA-Z_][a-zA-Z0-9_]*)$/);

        if (inOpeningTag || inClosingTag) {
            e.preventDefault();
            const newText = text.substring(0, cursorPos) + '_' + text.substring(cursorPos);
            editor.value = newText;
            editor.setSelectionRange(cursorPos + 1, cursorPos + 1);
            setStatus('Space converted to underscore in tag name');

            // Trigger sync after underscore insertion
            setTimeout(() => performLiveSync(), 10);
        }
    }
});

function moveSelection(direction) {
    const text = editor.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    // Find start of the line containing selection start
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    
    // Find end of the line containing selection end
    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;

    const contentToMove = text.substring(lineStart, lineEnd);
    
    // Calculate positions of lines before or after
    if (direction === -1) { // Move Up
        // If we are at the top, cannot move up
        if (lineStart === 0) return;
        
        const prevLineStart = text.lastIndexOf('\n', lineStart - 2) + 1;
        const prevLineEnd = lineStart - 1;
        const prevLineContent = text.substring(prevLineStart, prevLineEnd);
        
        const newText = text.substring(0, prevLineStart) + 
                        contentToMove + '\n' + prevLineContent + 
                        text.substring(lineEnd);
        
        editor.value = newText;
        // Restore selection
        const newStart = prevLineStart + (start - lineStart);
        const newEnd = prevLineStart + contentToMove.length - (lineEnd - end);
        editor.setSelectionRange(newStart, newEnd);
        
    } else { // Move Down
        // If we are at the bottom, cannot move down
        if (lineEnd === text.length) return;
        
        const nextLineStart = lineEnd + 1;
        let nextLineEnd = text.indexOf('\n', nextLineStart);
        if (nextLineEnd === -1) nextLineEnd = text.length;
        const nextLineContent = text.substring(nextLineStart, nextLineEnd);
        
        const newText = text.substring(0, lineStart) + 
                        nextLineContent + '\n' + contentToMove + 
                        text.substring(nextLineEnd);
                        
        editor.value = newText;
        // Restore selection
        const offset = nextLineContent.length + 1;
        editor.setSelectionRange(start + offset, end + offset);
    }
}

// ==================== Prettify / Lessen ====================
lessenBtn.addEventListener('click', () => {
    // Convert actual newlines to literal "\n"
    editor.value = lessenXML(editor.value);
    modeIndicator.textContent = 'Mode: Lessened';
    setStatus('Converted newlines to literal \\n');
});

prettifyBtn.addEventListener('click', () => {
    // 1. Expand literal "\n" back to real newlines (protecting quotes)
    // 2. Apply XML Indentation
    let text = editor.value;
    text = restoreNewlines(text); 
    text = prettifyXML(text);
    editor.value = text;
    modeIndicator.textContent = 'Mode: Prettified';
    setStatus('Restored newlines and indented XML');
});

function lessenXML(xml) {
    // Replace actual newline characters with literal "\n"
    // Note: This creates a single long line (unless word wrap is on in CSS)
    return xml.replace(/\n/g, '\\n');
}

function restoreNewlines(text) {
    // Converts literal "\n" back to real newlines, 
    // UNLESS they appear inside quotes (', ", `, ```).
    
    let res = "";
    let i = 0;
    let len = text.length;
    let stack = null; // null, "'", '"', '`', '```'

    while (i < len) {
        // Check for triple backtick
        if (text.startsWith('```', i)) {
            res += '```'; 
            i += 3;
            if (stack === '```') stack = null;
            else if (stack === null) stack = '```';
            continue;
        }
        
        let char = text[i];
        
        // Handle Escaping inside quotes (to skip \", etc)
        if (stack !== null && char === '\\') {
            res += char + (text[i+1] || '');
            i += 2;
            continue;
        }
        
        // Handle State Change (Start/End quote)
        // Only enter quote state if we aren't already in one (stack === null)
        if (stack === null && (char === '"' || char === "'" || char === '`')) {
            stack = char;
            res += char;
            i++;
            continue;
        }
        // Exit quote state if we find the matching closer
        if (stack === char) {
            stack = null;
            res += char;
            i++;
            continue;
        }
        
        // Handle Transformation (Only if NOT in a quote)
        // Look for literal backslash followed by 'n'
        if (stack === null && char === '\\' && text[i+1] === 'n') {
            res += '\n'; // Convert to real newline
            i += 2;
            continue;
        }
        
        res += char;
        i++;
    }
    return res;
}

function prettifyXML(xml) {
    // Preserve original line breaks in content for multiline detection
    let text = xml.trim();
    if (!text) return '';
    
    const INDENT = '    '; // 4 spaces
    
    // Tokenize the XML while preserving content structure
    const tokens = [];
    let i = 0;
    
    while (i < text.length) {
        if (text[i] === '<') {
            const end = text.indexOf('>', i);
            if (end === -1) break;
            const tag = text.substring(i, end + 1);
            const isClosing = tag.startsWith('</');
            const isSelfClosing = tag.endsWith('/>');
            const match = tag.match(/<\/?([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (match) {
                tokens.push({ 
                    type: 'tag', 
                    value: tag, 
                    isClosing, 
                    isSelfClosing,
                    tagName: match[1] 
                });
            }
            i = end + 1;
        } else {
            const nextTag = text.indexOf('<', i);
            const content = nextTag === -1 ? text.substring(i) : text.substring(i, nextTag);
            if (content) {
                tokens.push({ type: 'text', value: content });
            }
            i = nextTag === -1 ? text.length : nextTag;
        }
    }
    
    // Format tokens
    let result = '';
    let indent = 0;
    
    for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];
        
        if (token.type === 'tag' && !token.isClosing) {
            // Opening tag
            if (result && !result.endsWith('\n')) result += '\n';
            result += INDENT.repeat(indent) + token.value;
            
            if (token.isSelfClosing) continue;
            
            // Look ahead: check for <tag>single-line-text</tag> pattern
            const next = tokens[j + 1];
            const nextNext = tokens[j + 2];
            
            if (next && next.type === 'text' && 
                nextNext && nextNext.type === 'tag' && 
                nextNext.isClosing && nextNext.tagName === token.tagName) {
                
                const trimmed = next.value.trim();
                const hasNewlines = next.value.includes('\n');
                
                if (trimmed && !hasNewlines) {
                    // Single line content - keep inline: <tag>text</tag>
                    result += trimmed + nextNext.value;
                    j += 2; // Skip text and closing tag
                    continue;
                }
            }
            
            indent++;
            
        } else if (token.type === 'tag' && token.isClosing) {
            // Closing tag
            indent = Math.max(0, indent - 1);
            if (result && !result.endsWith('\n')) result += '\n';
            result += INDENT.repeat(indent) + token.value;
            
        } else if (token.type === 'text') {
            // Text content
            const trimmed = token.value.trim();
            if (!trimmed) continue;
            
            const hasNewlines = token.value.includes('\n');
            
            if (hasNewlines) {
                // Multiline content - each line on its own line with indentation
                const lines = trimmed.split('\n');
                for (const line of lines) {
                    const lineTrimmed = line.trim(); // Optional: we could preserve inner indent
                    // For protected quotes (lines kept together via \n literal), they will appear as one line here
                    if (lineTrimmed) {
                        if (result && !result.endsWith('\n')) result += '\n';
                        result += INDENT.repeat(indent) + line; // Keep original internal spacing?
                    }
                }
            } else {
                // Single line that wasn't caught by inline pattern (e.g., between nested tags)
                if (result && !result.endsWith('\n')) result += '\n';
                result += INDENT.repeat(indent) + trimmed;
            }
        }
    }
    
    return result.trim();
}

// ==================== Validation ====================
function validateXMLStructure(xml) {
    if (!xml.trim()) {
        return { valid: false, error: 'Content is empty' };
    }
    
    const tagRegex = /<\/?([a-zA-Z_][a-zA-Z0-9_]*)[^>]*>/g;
    const stack = [];
    let match;
    let hasAnyTags = false;
    
    while ((match = tagRegex.exec(xml)) !== null) {
        hasAnyTags = true;
        const fullTag = match[0];
        const tagName = match[1];
        
        if (fullTag.endsWith('/>')) {
            continue; // Self-closing tag
        }
        
        if (fullTag.startsWith('</')) {
            if (stack.length === 0) {
                return { valid: false, error: `Unexpected closing tag: </${tagName}>` };
            }
            const expected = stack.pop();
            if (expected !== tagName) {
                return { valid: false, error: `Mismatched tags: expected </${expected}>, found </${tagName}>` };
            }
        } else {
            stack.push(tagName);
        }
    }
    
    if (!hasAnyTags) {
        return { valid: false, error: 'No XML tags found in content' };
    }
    
    if (stack.length > 0) {
        return { valid: false, error: `Unclosed tags: <${stack.join('>, <')}>` };
    }
    
    return { valid: true };
}

function validateSingleRoot(xml) {
    if (!xml.trim()) {
        return { valid: false, error: 'Content is empty' };
    }
    
    const structureValid = validateXMLStructure(xml);
    if (!structureValid.valid) {
        return structureValid;
    }
    
    const tagRegex = /<\/?([a-zA-Z_][a-zA-Z0-9_]*)[^>]*>/g;
    const stack = [];
    let rootCount = 0;
    let match;
    
    while ((match = tagRegex.exec(xml)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];
        
        if (fullTag.endsWith('/>')) {
            if (stack.length === 0) rootCount++;
            continue;
        }
        
        if (fullTag.startsWith('</')) {
            stack.pop();
        } else {
            if (stack.length === 0) rootCount++;
            stack.push(tagName);
        }
    }
    
    if (rootCount === 0) {
        return { valid: false, error: 'No root field found' };
    }
    
    if (rootCount > 1) {
        return { valid: false, error: `Expected 1 root field, found ${rootCount}. Field templates must have a single root element.` };
    }
    
    return { valid: true };
}

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

// ==================== Utilities ====================
function insertAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);
    editor.value = before + text + after;
    const newPos = start + text.length;
    editor.setSelectionRange(newPos, newPos);
    editor.focus();
}

function setStatus(message) {
    statusMsg.textContent = message;
    setTimeout(() => {
        statusMsg.textContent = 'Ready';
    }, 3000);
}

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

async function handlePromptQuestions(input) {
    const promptText = editor.value.trim();
    if (!promptText) {
        promptQuestionsOutput.textContent = 'No prompt content found in editor.';
        return;
    }

    // Check API configuration - check both settings and form values
    const hasApiKey = apiSettings.apiKey || apiKeyInput.value.trim();
    const hasModel = apiSettings.model || modelInput.value.trim();
    if (!hasApiKey || !hasModel) {
        promptQuestionsOutput.textContent = 'Please configure API settings in the API Setup tab first.\n\nGo to the "API Setup" tab and:\n1. Select your AI provider\n2. Enter your API key\n3. Specify the model name';
        return;
    }

    // Ensure current form values are in apiSettings for the API call
    if (!apiSettings.apiKey && apiKeyInput.value.trim()) {
        apiSettings.apiKey = apiKeyInput.value.trim();
    }
    if (!apiSettings.model && modelInput.value.trim()) {
        apiSettings.model = modelInput.value.trim();
    }
    if (!apiSettings.provider) {
        apiSettings.provider = apiProviderSelect.value;
    }
    if (!apiSettings.baseUrl) {
        apiSettings.baseUrl = baseUrlInput.value.trim() || null;
    }

    // Show processing indicator
    promptQuestionsOutput.textContent = 'Analyzing prompt and generating questions...';
    promptQuestionsInput.disabled = true;

    try {
        let questions;
        if (input.trim()) {
            // Generate specific questions based on user input
            questions = await generateQuestions(promptText, input.trim());
        } else {
            // Generate general questions about the prompt
            questions = await generateDefaultQuestions(promptText);
        }

        promptQuestionsOutput.textContent = questions;
    } catch (error) {
        console.error('Error generating questions:', error);
        promptQuestionsOutput.textContent = `Error: ${error.message}\n\nPlease check your API configuration and try again.`;
    } finally {
        promptQuestionsInput.disabled = false;
        promptQuestionsInput.value = '';
    }
}

async function handlePromptUnderstanding(input) {
    const promptText = editor.value.trim();
    if (!promptText) {
        promptUnderstandingOutput.textContent = 'No prompt content found in editor.';
        return;
    }

    // Check API configuration - check both settings and form values
    const hasApiKey = apiSettings.apiKey || apiKeyInput.value.trim();
    const hasModel = apiSettings.model || modelInput.value.trim();
    if (!hasApiKey || !hasModel) {
        promptUnderstandingOutput.textContent = 'Please configure API settings in the API Setup tab first.\n\nGo to the "API Setup" tab and:\n1. Select your AI provider\n2. Enter your API key\n3. Specify the model name';
        return;
    }

    // Ensure current form values are in apiSettings for the API call
    if (!apiSettings.apiKey && apiKeyInput.value.trim()) {
        apiSettings.apiKey = apiKeyInput.value.trim();
    }
    if (!apiSettings.model && modelInput.value.trim()) {
        apiSettings.model = modelInput.value.trim();
    }
    if (!apiSettings.provider) {
        apiSettings.provider = apiProviderSelect.value;
    }
    if (!apiSettings.baseUrl) {
        apiSettings.baseUrl = baseUrlInput.value.trim() || null;
    }

    // Show processing indicator
    promptUnderstandingOutput.textContent = 'Analyzing prompt interpretation...';
    promptUnderstandingInput.disabled = true;

    try {
        let analysis;
        if (input.trim()) {
            // Generate specific analysis based on user focus
            analysis = await generateAnalysis(promptText, input.trim());
        } else {
            // Generate default analysis of prompt
            analysis = await generateDefaultAnalysis(promptText);
        }

        promptUnderstandingOutput.textContent = analysis;
    } catch (error) {
        console.error('Error generating analysis:', error);
        promptUnderstandingOutput.textContent = `Error: ${error.message}\n\nPlease check your API configuration and try again.`;
    } finally {
        promptUnderstandingInput.disabled = false;
        promptUnderstandingInput.value = '';
    }
}

// ==================== AI API Integration ====================
async function callAIAPI(messages) {
    const provider = apiSettings.provider;
    const baseUrl = apiSettings.baseUrl || getDefaultBaseUrl(provider);

    switch (provider) {
        case 'openai':
            return await callOpenAI(messages, baseUrl);
        case 'anthropic':
            return await callAnthropic(messages, baseUrl);
        case 'google':
            return await callGoogle(messages, baseUrl);
        case 'ollama':
            return await callOllama(messages, baseUrl);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

function getDefaultBaseUrl(provider) {
    switch (provider) {
        case 'openai':
            return 'https://api.openai.com/v1';
        case 'anthropic':
            return 'https://api.anthropic.com/v1';
        case 'google':
            return 'https://generativelanguage.googleapis.com';
        case 'ollama':
            return 'http://localhost:11434';
        default:
            return '';
    }
}

async function callOpenAI(messages, baseUrl) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSettings.apiKey}`
        },
        body: JSON.stringify({
            model: apiSettings.model,
            messages: messages,
            max_tokens: 1000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callAnthropic(messages, baseUrl) {
    const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiSettings.apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: apiSettings.model,
            messages: messages,
            max_tokens: 1000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function callGoogle(messages, baseUrl) {
    // Convert messages to Google format
    const contents = messages.map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'assistant' ? 'model' : 'user'
    }));

    const response = await fetch(`${baseUrl}/v1beta/models/${apiSettings.model}:generateContent?key=${apiSettings.apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: contents,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

async function callOllama(messages, baseUrl) {
    const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: apiSettings.model,
            messages: messages,
            stream: false,
            options: {
                temperature: 0.3,
                num_predict: 1000
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
}

async function generateDefaultQuestions(promptText) {
    const messages = [
        {
            role: 'system',
            content: 'You are an expert at analyzing XML prompts for AI models. Generate targeted questions that help users improve their prompts by identifying unclear parts, missing constraints, or areas that could be more specific.'
        },
        {
            role: 'user',
            content: `Analyze this XML prompt and generate 5-8 targeted questions that would help the user improve or clarify their prompt. Focus on questions about:\n- Missing constraints or requirements\n- Unclear instructions or ambiguous elements\n- Potential edge cases not considered\n- Areas where more specificity would help\n- Possible misunderstanding of intent\n\nPrompt to analyze:\n\n${promptText}\n\nFormat your response as a numbered list of questions that are specific to this prompt's content and context.`
        }
    ];

    return await callAIAPI(messages);
}

async function generateQuestions(promptText, userInput) {
    const messages = [
        {
            role: 'system',
            content: 'You are an expert at analyzing XML prompts for AI models. Help users improve their prompts by generating targeted questions based on their specific concerns or focus areas.'
        },
        {
            role: 'user',
            content: `The user is analyzing this XML prompt and has a specific question or concern: "${userInput}"\n\nPrompt being analyzed:\n\n${promptText}\n\nBased on the user's concern and the prompt content, generate 3-5 specific, thoughtful questions that would help clarify their concern or improve the prompt in the area they've mentioned. Focus on being practical and actionable.`
        }
    ];

    const result = await callAIAPI(messages);
    saveEditorContent(); // Auto-save after AI call
    return result;
}

async function generateDefaultAnalysis(promptText) {
    const messages = [
        {
            role: 'system',
            content: 'You are an expert at analyzing how AI models interpret XML prompts. Provide clear, insightful analysis of what the model would understand from different parts of the prompt.'
        },
        {
            role: 'user',
            content: `Analyze how an AI model would interpret this XML prompt. Break it down into key components and explain:\n\n1. What the model would understand as the main task/goal\n2. How the model would interpret any constraints or requirements\n3. What assumptions the model might make if elements are unclear\n4. How different sections of the prompt might interact or conflict\n5. Suggestions for clarity if any parts seem ambiguous\n\nPrompt to analyze:\n\n${promptText}\n\nProvide a structured analysis with clear explanations.`
        }
    ];

    const result = await callAIAPI(messages);
    saveEditorContent(); // Auto-save after AI call
    return result;
}

async function generateAnalysis(promptText, focusInput) {
    const messages = [
        {
            role: 'system',
            content: 'You are an expert at analyzing how AI models interpret XML prompts. Provide detailed analysis focusing on specific aspects that users are concerned about.'
        },
        {
            role: 'user',
            content: `The user wants to understand how an AI model would interpret this XML prompt, with specific focus on: "${focusInput}"\n\nPrompt being analyzed:\n\n${promptText}\n\nProvide a detailed analysis that addresses the user's specific focus area. Explain what the model would likely understand, what might be unclear, and how this could affect the model's response quality.`
        }
    ];

    const result = await callAIAPI(messages);
    saveEditorContent(); // Auto-save after AI call
    return result;
}

function loadApiSettings() {
    const stored = JSON.parse(localStorage.getItem('xmlPromptBuilder_apiSettings') || '{}');

    // Restore checkbox state, or auto-enable if API key was previously stored
    preserveApiKeyCheckbox.checked = stored.preserveApiKey || (stored.apiKey ? true : false);

    // Load stored settings properly restoring all fields
    if (stored.provider) {
        apiProviderSelect.value = stored.provider;
        apiSettings.provider = stored.provider;
    }
    if (stored.model) {
        modelInput.value = stored.model;
        apiSettings.model = stored.model;
    }
    if (stored.baseUrl) {
        baseUrlInput.value = stored.baseUrl;
        apiSettings.baseUrl = stored.baseUrl;
    }
    // Handle API key restoration (either from new format or backwards compatibility)
    if (stored.apiKey && preserveApiKeyCheckbox.checked) {
        apiSettings.apiKey = stored.apiKey;
        apiKeyInput.value = '••••••••'; // Show dots for security but preserve the key in settings
    } else if (stored.hasApiKey || stored.apiKey) {
        // Show that a key was configured previously (backwards compatibility)
        apiKeyInput.value = '••••••••';
        // Note: apiSettings.apiKey remains undefined until user saves again with preservation enabled
    }
}

function saveApiSettings() {
    const settings = {
        provider: apiProviderSelect.value,
        model: modelInput.value,
        baseUrl: baseUrlInput.value ? baseUrlInput.value : null,
        preserveApiKey: preserveApiKeyCheckbox.checked
    };

    if (preserveApiKeyCheckbox.checked) {
        settings.apiKey = apiKeyInput.value;
    } else if (apiKeyInput.value) {
        settings.hasApiKey = true; // Mark that key was entered previously
    }

    localStorage.setItem('xmlPromptBuilder_apiSettings', JSON.stringify(settings));
    apiSettings = {
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        apiKey: preserveApiKeyCheckbox.checked ? apiKeyInput.value : undefined
    };
    setStatus('API settings saved');
}

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

// Prompt Questions input handling
promptQuestionsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handlePromptQuestions(promptQuestionsInput.value.trim());
    }
});

// Prompt Understanding input handling
promptUnderstandingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handlePromptUnderstanding(promptUnderstandingInput.value.trim());
    }
});

// API Settings - auto-save on field changes
apiProviderSelect.addEventListener('change', saveApiSettings);
apiKeyInput.addEventListener('input', saveApiSettings);
preserveApiKeyCheckbox.addEventListener('change', saveApiSettings);
modelInput.addEventListener('blur', saveApiSettings);
baseUrlInput.addEventListener('blur', saveApiSettings);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        saveStructureModal.classList.add('hidden');
        saveFieldModal.classList.add('hidden');
        deleteModal.classList.add('hidden');
    }

    // Ctrl+/ to toggle bottom panel (like VSCode)
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        toggleBottomPanel();
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