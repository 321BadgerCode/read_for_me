const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('saveKey');
const analyzeButton = document.getElementById('analyze');
const statusElement = document.getElementById('status');
const outputElement = document.getElementById('output');

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#b00020' : '#1b5e20';
}

function renderResult(payload) {
  outputElement.textContent = JSON.stringify(payload, null, 2);
}

async function loadSavedKey() {
  const { geminiApiKey } = await browser.storage.local.get('geminiApiKey');
  if (geminiApiKey) {
    apiKeyInput.value = geminiApiKey;
  }
}

saveButton.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  await browser.storage.local.set({ geminiApiKey: key });
  setStatus(key ? 'Gemini API key saved.' : 'Gemini API key cleared.');
});

analyzeButton.addEventListener('click', async () => {
  setStatus('Analyzing...');
  outputElement.textContent = '';

  try {
    const response = await browser.runtime.sendMessage({ action: 'analyzeCurrentTab' });
    if (!response || !response.ok) {
      throw new Error((response && response.error) || 'Failed to analyze tab.');
    }

    setStatus('Analysis complete.');
    renderResult(response.result);
  } catch (error) {
    setStatus(error.message, true);
  }
});

loadSavedKey().catch((error) => setStatus(error.message, true));
