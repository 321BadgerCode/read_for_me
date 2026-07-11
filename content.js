const DOCUMENT_PATTERNS = [
  { label: 'Terms of Service', terms: ['terms of service', 'terms and conditions', 'user agreement'] },
  { label: 'Privacy Policy', terms: ['privacy policy', 'data policy', 'cookie policy'] },
  { label: 'Lease Agreement', terms: ['lease agreement', 'rental agreement', 'tenant', 'landlord'] },
  { label: 'Policy', terms: ['acceptable use policy', 'refund policy', 'community guidelines'] }
];

function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function detectDocumentType(title, url, text) {
  const sample = `${normalizeText(title)} ${normalizeText(url)} ${normalizeText(text).slice(0, 3000)}`;
  for (const pattern of DOCUMENT_PATTERNS) {
    if (pattern.terms.some((term) => sample.includes(term))) {
      return pattern.label;
    }
  }
  return null;
}

function extractPageContent() {
  const bodyText = document.body ? document.body.innerText || document.body.textContent || '' : '';
  const text = bodyText.replace(/\s+/g, ' ').trim().slice(0, 12000);
  const title = document.title || '';
  const url = window.location.href;
  const documentType = detectDocumentType(title, url, text);

  return { title, url, text, documentType };
}

browser.runtime.onMessage.addListener((message) => {
  if (message && message.action === 'extractPageContent') {
    return Promise.resolve(extractPageContent());
  }
  return undefined;
});
