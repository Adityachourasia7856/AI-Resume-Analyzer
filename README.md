# AI Resume Analyzer (Groq)

A Node.js/Express resume analyzer that extracts text from PDF files and uses Groq's OpenAI-compatible chat completions API to generate ATS-style feedback.

## Run locally

1. Install Node.js (18 or newer is recommended).
2. Open this project folder in VS Code.
3. Run `npm install` in the VS Code terminal.
4. Copy `.env.example` to a new file named `.env`.
5. Get a Groq API key from https://console.groq.com/keys and put it in `.env`:

   ```env
   GROQ_API_KEY=your_actual_key
   GROQ_MODEL=llama-3.3-70b-versatile
   PORT=3000
   ```

6. Start the app with `npm start`.
7. Open http://localhost:3000 in your browser.

## Deploying

Set `GROQ_API_KEY` and (optionally) `GROQ_MODEL` in your hosting provider's environment-variable settings. Do not commit `.env` or expose the key in frontend JavaScript. The server reads the key from the environment.

## Notes

- Uploads must be PDF files and are limited to 5 MB.
- The current PDF parser extracts selectable text; scanned/image-only PDFs need OCR before analysis.
- The default model can be changed using `GROQ_MODEL` if Groq changes model availability.
