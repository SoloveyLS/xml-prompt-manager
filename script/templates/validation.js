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

// Make validation functions globally available
window.validateXMLStructure = validateXMLStructure;
window.validateSingleRoot = validateSingleRoot;