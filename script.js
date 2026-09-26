const urlInput = document.getElementById('urlInput');
const loadButton = document.getElementById('loadButton');
const backButton = document.getElementById('backButton');
const forwardButton = document.getElementById('forwardButton');
const refreshButton = document.getElementById('refreshButton');
const clearButton = document.getElementById('clearButton');
const previewFrame = document.getElementById('previewFrame');
const statusBox = document.getElementById('status');

const historyStack = [];
let historyIndex = -1;

function setStatus(message, kind = '') {
  statusBox.textContent = message;
  statusBox.className = 'status';
  if (kind) {
    statusBox.classList.add(kind);
  }
}

function normalizeUrl(rawValue) {
  const value = rawValue.trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function saveHistory(url) {
  const lastUrl = historyStack[historyIndex];
  if (lastUrl !== url) {
    const trimmed = historyStack.slice(0, historyIndex + 1);
    trimmed.push(url);
    historyStack.length = 0;
    historyStack.push(...trimmed);
    historyIndex = historyStack.length - 1;
  }

  backButton.disabled = historyIndex <= 0;
  forwardButton.disabled = historyIndex >= historyStack.length - 1;
}

async function loadWebsite() {
  const normalizedUrl = normalizeUrl(urlInput.value);

  if (!normalizedUrl) {
    setStatus('Please enter a URL.', 'error');
    return;
  }

  try {
    setStatus('Loading website...', 'loading');

    const response = await fetch(`/proxy?url=${encodeURIComponent(normalizedUrl)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch page');
    }

    saveHistory(normalizedUrl);
    previewFrame.srcdoc = data.html || '<html><body>Empty response</body></html>';
    setStatus(`Loaded: ${normalizedUrl}`);
  } catch (error) {
    console.error(error);
    previewFrame.srcdoc = `<html><body style="font-family:sans-serif;padding:24px;color:#222"><h2>Unable to load page</h2><p>${error.message}</p></body></html>`;
    setStatus(error.message, 'error');
  }
}

function goBack() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  const prevUrl = historyStack[historyIndex];
  urlInput.value = prevUrl;
  loadWebsite();
}

function goForward() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex += 1;
  const nextUrl = historyStack[historyIndex];
  urlInput.value = nextUrl;
  loadWebsite();
}

function refreshPage() {
  if (!urlInput.value.trim()) return;
  loadWebsite();
}

function clearView() {
  urlInput.value = '';
  previewFrame.srcdoc = '<html><body style="font-family:sans-serif;padding:24px;color:#222">Preview cleared.</body></html>';
  setStatus('Ready');
  historyStack.length = 0;
  historyIndex = -1;
  backButton.disabled = true;
  forwardButton.disabled = true;
}

loadButton.addEventListener('click', loadWebsite);
urlInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadWebsite();
});
backButton.addEventListener('click', goBack);
forwardButton.addEventListener('click', goForward);
refreshButton.addEventListener('click', refreshPage);
clearButton.addEventListener('click', clearView);

backButton.disabled = true;
forwardButton.disabled = true;
setStatus('Ready');
loadWebsite();
