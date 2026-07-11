# read_for_me

Firefox WebExtension that detects policy/legal pages (terms of service, privacy policy, leases, etc.) and uses Google Gemini to produce key points plus legality/ethical/security concerns.

## Usage

1. Open Firefox and go to `about:debugging` -> **This Firefox** -> **Load Temporary Add-on**.
2. Choose `/home/runner/work/read_for_me/read_for_me/manifest.json`.
3. Open the extension popup, paste your Gemini API key, and click **Save**.
4. Visit a terms/policy/lease page and click **Analyze this tab**.
