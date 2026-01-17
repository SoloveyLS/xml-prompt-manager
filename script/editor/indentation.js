// ==================== Prettify / Lessen ====================
lessenBtn.addEventListener('click', () => {
    // Convert actual newlines to literal "\n"
    const lessenedText = lessenXML(editor.value);
    const scrollTop = editor.scrollTop;
    editor.focus();
    editor.setSelectionRange(0, editor.value.length);
    document.execCommand('insertText', false, lessenedText);
    editor.scrollTop = scrollTop;
    modeIndicator.textContent = 'Mode: Lessened';
    setStatus('Converted newlines to literal \\n');
});

prettifyBtn.addEventListener('click', () => {
    // 1. Expand literal "\n" back to real newlines (protecting quotes)
    // 2. Apply XML Indentation
    let text = editor.value;
    text = restoreNewlines(text);
    text = prettifyXML(text);
    const scrollTop = editor.scrollTop;
    editor.focus();
    editor.setSelectionRange(0, editor.value.length);
    document.execCommand('insertText', false, text);
    editor.scrollTop = scrollTop;
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

        // Function to insert text while preserving undo history
        function insertTextWithUndo(textToInsert, replaceCount = 0) {
            editor.focus();
            if (replaceCount > 0) {
                // Select the text to replace
                editor.setSelectionRange(start - replaceCount, start);
            } else {
                editor.setSelectionRange(start, end);
            }
            document.execCommand('insertText', false, textToInsert);
        }

        // Helper function to get information about lines affected by selection
        function getAffectedLines(text, start, end) {
            const lines = text.split('\n');
            const lineStarts = [0]; // Position where each line starts

            // Calculate line start positions
            for (let i = 0; i < lines.length - 1; i++) {
                lineStarts.push(lineStarts[i] + lines[i].length + 1); // +1 for \n
            }

            // Find which line start and end fall on
            let startLineIndex = 0;
            let endLineIndex = 0;

            for (let i = 0; i < lineStarts.length; i++) {
                if (lineStarts[i] <= start) {
                    startLineIndex = i;
                }
                if (lineStarts[i] <= end) {
                    endLineIndex = i;
                }
            }

            // Calculate column positions within their lines
            const selectionStartCol = start - lineStarts[startLineIndex];
            const selectionEndCol = end - lineStarts[endLineIndex];

            return {
                startLineIndex,
                endLineIndex,
                lines,
                lineStarts,
                selectionStartCol,
                selectionEndCol
            };
        }

        // Helper function to indent/unindent lines to multiples of 4
        function indentLines(lines, indent = true) {
            const indentChanges = [];
            const modifiedLines = [];

            for (const line of lines) {
                // Count current leading spaces
                const match = line.match(/^( *)/);
                const currentSpaces = match ? match[1].length : 0;

                if (indent) {
                    // Add spaces to reach next multiple of 4
                    const spacesToAdd = 4 - (currentSpaces % 4);
                    modifiedLines.push(' '.repeat(spacesToAdd) + line);
                    indentChanges.push(spacesToAdd);
                } else {
                    // Remove spaces to reach previous multiple of 4
                    const spacesToRemove = currentSpaces % 4 || 4;
                    const actualRemove = Math.min(spacesToRemove, currentSpaces);
                    modifiedLines.push(line.substring(actualRemove));
                    indentChanges.push(-actualRemove);
                }
            }

            return { modifiedLines, indentChanges };
        }

        // Helper function to calculate new selection after indentation
        function calculateNewSelection(start, end, startLineIndex, endLineIndex, lineStarts, indentChanges, selectionStartCol, selectionEndCol) {
            const firstLineChange = indentChanges[0];

            // Calculate cumulative change for all affected lines
            let cumulativeChange = 0;
            for (let i = 0; i < indentChanges.length; i++) {
                cumulativeChange += indentChanges[i];
            }

            // Adjust start position
            let newStart;
            if (selectionStartCol === 0) {
                // Selection starts at beginning of line - keep it at beginning
                newStart = start;
            } else {
                // Selection starts mid-line - adjust by indent change
                newStart = start + firstLineChange;
            }

            // Adjust end position by cumulative changes
            let newEnd = end + cumulativeChange;

            // Ensure valid range
            newStart = Math.max(0, newStart);
            newEnd = Math.max(newStart, newEnd);

            return { newStart, newEnd };
        }

        // Handle Enter key for maintaining indentation
        if (e.key === 'Enter') {
            // Find the current line start and get its indentation
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(lineStart, start);
            const indentationMatch = currentLine.match(/^(\s*)/);
            const currentIndentation = indentationMatch ? indentationMatch[1] : '';

            // Insert newline with same indentation
            insertTextWithUndo('\n' + currentIndentation);

            setStatus('New line with preserved indentation');
            return;
        }

        // Check if we have any selection (single or multi-line)
        const hasSelection = start !== end;

        if (hasSelection) {
            // UNIFIED HANDLING: Treat all selections the same way
            // Find which lines are affected (even partially)
            const affectedInfo = getAffectedLines(text, start, end);
            const { startLineIndex, endLineIndex, lines, lineStarts, selectionStartCol, selectionEndCol } = affectedInfo;

            // Indent or unindent the affected lines
            const { modifiedLines, indentChanges } = indentLines(
                lines.slice(startLineIndex, endLineIndex + 1),
                !isUnindent
            );

            // Reconstruct the full text
            const beforeLines = lines.slice(0, startLineIndex);
            const afterLines = lines.slice(endLineIndex + 1);
            const newText = [...beforeLines, ...modifiedLines, ...afterLines].join('\n');

            // Calculate new selection position
            const { newStart, newEnd } = calculateNewSelection(
                start, end, startLineIndex, endLineIndex,
                lineStarts, indentChanges, selectionStartCol, selectionEndCol
            );

            // Use execCommand to preserve undo history
            const scrollTop = editor.scrollTop;
            editor.focus();
            editor.setSelectionRange(0, text.length);
            document.execCommand('insertText', false, newText);
            editor.setSelectionRange(newStart, newEnd);
            editor.scrollTop = scrollTop;

            // Status message
            const lineCount = endLineIndex - startLineIndex + 1;
            setStatus(isUnindent
                ? `Un-indented ${lineCount} line${lineCount > 1 ? 's' : ''}`
                : `Indented ${lineCount} line${lineCount > 1 ? 's' : ''}`);

        } else if (isUnindent) {
            // No selection, Shift+Tab: Remove spaces to reach previous multiple of 4
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(lineStart, start);
            const currentIndent = currentLine.length;

            // Calculate spaces to remove to reach previous multiple of 4
            const spacesToRemove = currentIndent % 4 || 4;

            // Only remove spaces that exist before cursor
            const before = text.substring(0, start);
            const spaceMatch = before.match(new RegExp(` {1,${spacesToRemove}}$`));

            if (spaceMatch) {
                const actualRemove = spaceMatch[0].length;
                insertTextWithUndo('', actualRemove);
                setStatus(`Removed ${actualRemove} space${actualRemove > 1 ? 's' : ''}`);
            } else {
                setStatus('No indentation to remove');
            }
        } else {
            // No selection, Tab: Insert spaces to next 4-space boundary
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const currentLine = text.substring(lineStart, start);
            const currentIndent = currentLine.length;
            const spacesToAdd = 4 - (currentIndent % 4);
            const spaces = ' '.repeat(spacesToAdd);

            insertTextWithUndo(spaces);
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