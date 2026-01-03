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

// ==================== Keyboard Handlers ====================
editor.addEventListener('keydown', (e) => {
    // Ctrl+/ to toggle bottom panel (like VSCode)
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setTimeout(() => toggleBottomPanel(), 0);
        return;
    }

    // Tab key for indentation (Shift+Tab for un-indentation) and Enter for line continuation
    if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault(); // Prevent default TAB focus cycling

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const isUnindent = e.shiftKey && e.key === 'Tab';

        // Handle Enter key for maintaining indentation
        if (e.key === 'Enter') {
            // Find the current line start and get its indentation
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(lineStart, start);
            const indentationMatch = currentLine.match(/^(\s*)/);
            const currentIndentation = indentationMatch ? indentationMatch[1] : '';

            // Insert newline with same indentation
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + '\n' + currentIndentation + after;
            editor.value = newText;

            // Position cursor after the indentation
            const newCursorPos = start + 1 + currentIndentation.length;
            editor.setSelectionRange(newCursorPos, newCursorPos);
            setStatus('New line with preserved indentation');
            return;
        }

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
            // Single line or no selection - insert spaces to next 4-space boundary
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(lineStart, start);
            const currentIndent = currentLine.length; // Length up to cursor = column

            // Calculate spaces needed to reach next 4-space boundary
            const spacesToAdd = 4 - (currentIndent % 4);
            const spaces = ' '.repeat(spacesToAdd);

            const before = text.substring(0, start);
            const after = text.substring(end);

            editor.value = before + spaces + after;
            editor.setSelectionRange(start + spaces.length, start + spaces.length);
            setStatus(`Inserted ${spacesToAdd} spaces`);
        }
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