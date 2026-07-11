function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
}

function buildPrompt(pageData) {
  return [
    'You are analyzing a legal/policy style document for a non-lawyer user.',
    'Return JSON only with this schema:',
    '{"keyPoints": [string], "concerns": {"legality": [string], "ethical": [string], "security": [string]}}',
    'If a category has no concerns, return an empty array.',
    `Title: ${pageData.title}`,
    `URL: ${pageData.url}`,
    `Detected type: ${pageData.documentType || 'Unknown policy/legal document'}`,
    'Document text:',
    pageData.text
  ].join('\n');
}

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

async function requestGemini(apiKey, prompt, model) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, errorText };
  }

  const data = await response.json();
  return { ok: true, data };
}

async function callGemini(apiKey, prompt) {
  let lastError = null;
  let data = null;
  for (const model of GEMINI_MODELS) {
    const result = await requestGemini(apiKey, prompt, model);
    if (result.ok) {
      data = result.data;
      break;
    }

    lastError = `Gemini request failed (${result.status}) for model ${model}: ${result.errorText}`;
    if (result.status !== 404) {
      throw new Error(lastError);
    }
  }

  if (!data) {
    throw new Error(lastError || 'Gemini request failed for all configured models.');
  }

  const text = (data.candidates || [])
    .flatMap((candidate) => (((candidate || {}).content || {}).parts || []))
    .map((part) => part.text || '')
    .join('\n')
    .trim();

  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error('Gemini returned an unexpected response format.');
  }

  return {
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    concerns: {
      legality: Array.isArray((parsed.concerns || {}).legality) ? parsed.concerns.legality : [],
      ethical: Array.isArray((parsed.concerns || {}).ethical) ? parsed.concerns.ethical : [],
      security: Array.isArray((parsed.concerns || {}).security) ? parsed.concerns.security : []
    }
  };
}

async function analyzeCurrentTab() {
  const { geminiApiKey } = await browser.storage.local.get('geminiApiKey');
  if (!geminiApiKey) {
    throw new Error('Please save a Gemini API key in the extension popup first.');
  }

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length || !tabs[0].id) {
    throw new Error('Unable to find an active tab.');
  }

  const pageData = await browser.tabs.sendMessage(tabs[0].id, { action: 'extractPageContent' });
  if (!pageData || !pageData.text) {
    throw new Error('Could not read page content.');
  }

  if (!pageData.documentType) {
    throw new Error('This page does not look like terms, policy, or lease content.');
  }

  const prompt = buildPrompt(pageData);
  const analysis = await callGemini(geminiApiKey, prompt);
  return {
    page: {
      title: pageData.title,
      url: pageData.url,
      documentType: pageData.documentType
    },
    analysis
  };
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.action !== 'analyzeCurrentTab') {
    return false;
  }

  analyzeCurrentTab()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
