require("dotenv").config();

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const app = express();
app.use(express.static("public"));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function cleanJsonText(text) {
    return text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

app.post("/analyze", upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Please upload a PDF resume." });
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Only PDF files are allowed." });
        }

        const data = await pdfParse(req.file.buffer);
        const resumeText = data.text?.trim();

        if (!resumeText) {
            return res.status(400).json({ error: "No readable text found in PDF." });
        }

        const prompt = `
You are an expert ATS resume reviewer and Java Full Stack hiring mentor.

Analyze the resume below. Return ONLY valid JSON. Do not use Markdown fences.
Use exactly this structure:
{
  "score": 0,
  "scoreReason": "short explanation",
  "candidateSummary": "2-3 sentence summary",
  "skills": {
    "programming": [],
    "frontend": [],
    "backend": [],
    "databases": [],
    "tools": [],
    "other": []
  },
  "strengths": [],
  "missingSkills": [],
  "improvements": [],
  "interviewQuestions": [
    {"question": "", "why": ""}
  ],
  "recommendedRoles": []
}

Rules:
- score must be an integer from 0 to 100.
- Base the analysis only on information present in the resume.
- Do not invent experience, projects, qualifications, or skills.
- For missingSkills, focus on skills useful for a Java Full Stack Developer role.
- Provide 3-6 items for lists where appropriate.
- Provide exactly 5 interview questions.
- Keep the response practical and constructive.

Resume:
${resumeText}
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Gemini API Error:", errorData);
            return res.status(response.status).json({
                error: "Gemini API request failed.",
                details: errorData
            });
        }

        const result = await response.json();
        const rawAnalysis = result.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("") || "";

        if (!rawAnalysis) {
            return res.status(500).json({ error: "Gemini returned no analysis." });
        }

        let analysis;
        try {
            analysis = JSON.parse(cleanJsonText(rawAnalysis));
        } catch {
            return res.status(500).json({
                error: "The AI returned an unexpected format. Please try again.",
                raw: rawAnalysis
            });
        }

        res.json({
            message: "Resume analyzed successfully",
            analysis
        });
    } catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: error.message || "Unexpected server error." });
    }
});

app.listen(3000, () => {
    console.log(`Server running at http://localhost:3000`);
    console.log(`Gemini model: ${MODEL}`);
});
