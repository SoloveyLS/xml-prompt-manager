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