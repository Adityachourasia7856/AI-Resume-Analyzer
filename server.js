require("dotenv").config();
const OpenAI = require("openai");
const groq = new OpenAI({
    apiKey:process.env.GROQ_API_KEY,
    baseURL:"https://api.groq.com/openai/v1"
})

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const app = express();
app.use(express.static("public"));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

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

        const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
        {
            role: "user",
            content: prompt
        }
    ],
    temperature: 0.3
});

const rawAnalysis = completion.choices[0]?.message?.content || "";

if (!rawAnalysis) {
    return res.status(500).json({
        error: "Groq returned no analysis."
    });
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
