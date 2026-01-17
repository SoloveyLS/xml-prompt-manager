// ==================== Prompt Question Functions ====================
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
    if (!apiSettings.apiKey && apiKeyInput.value.trim() && apiKeyInput.value !== '••••••••') {
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
    if (!apiSettings.apiKey && apiKeyInput.value.trim() && apiKeyInput.value !== '••••••••') {
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
            max_tokens: 3000,
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
            max_tokens: 3000,
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
                maxOutputTokens: 3000
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
                num_predict: 3000
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

function updateApiKeyReminder() {
    if (preserveApiKeyCheckbox.checked || hasEnteredApiKey) {
        apiKeyReminder.classList.add('hidden');
    } else {
        apiKeyReminder.classList.remove('hidden');
    }
}

function loadApiSettings() {
    const stored = JSON.parse(localStorage.getItem('xmlPromptBuilder_apiSettings') || '{}');

    // Restore checkbox state, or auto-enable if API key was previously stored
    preserveApiKeyCheckbox.checked = stored.preserveApiKey || (stored.apiKey ? true : false);

    // Initialize API key entry flag - true if preservation is enabled or key was already entered
    hasEnteredApiKey = preserveApiKeyCheckbox.checked || (stored.apiKey ? true : false);

    // Update reminder visibility based on checkbox state and key entry status
    updateApiKeyReminder();

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
        // Keep API key in memory for current session, even if not persisting to localStorage
        // But don't use dots placeholder - keep the real key from previous setting if dots are shown
        apiKey: apiKeyInput.value && apiKeyInput.value !== '••••••••' ? apiKeyInput.value : apiSettings.apiKey
    };
    setStatus('API settings saved');
}

// API Event listeners
promptQuestionsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handlePromptQuestions(promptQuestionsInput.value.trim());
    }
});

promptUnderstandingInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handlePromptUnderstanding(promptUnderstandingInput.value.trim());
    }
});

// API Settings - auto-save on field changes
apiProviderSelect.addEventListener('change', saveApiSettings);
apiKeyInput.addEventListener('input', () => {
    if (!hasEnteredApiKey && apiKeyInput.value.trim()) {
        hasEnteredApiKey = true;
        updateApiKeyReminder();
    }
    saveApiSettings();
});
preserveApiKeyCheckbox.addEventListener('change', () => {
    saveApiSettings();
    updateApiKeyReminder();
});
modelInput.addEventListener('blur', saveApiSettings);
baseUrlInput.addEventListener('blur', saveApiSettings);