require("dotenv").config();

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
<<<<<<< HEAD
=======
const OpenAI = require("openai");
>>>>>>> eeefe0b (Integrate Groq API)

const app = express();
app.use(express.static("public"));

const upload = multer({
    storage: multer.memoryStorage(),
<<<<<<< HEAD
    limits: { fileSize: 5 * 1024 * 1024 }
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function cleanJsonText(text) {
    return text
=======
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed."));
        }
        cb(null, true);
    }
});

// Groq provides an OpenAI-compatible API. Keep the key on the server only.
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function cleanJsonText(text) {
    return String(text || "")
>>>>>>> eeefe0b (Integrate Groq API)
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

app.post("/analyze", upload.single("resume"), async (req, res) => {
    try {
<<<<<<< HEAD
        if (!req.file) {
            return res.status(400).json({ error: "Please upload a PDF resume." });
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Only PDF files are allowed." });
=======
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                error: "Groq API key is not configured. Add GROQ_API_KEY to your .env file or hosting environment variables."
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Please upload a PDF resume." });
>>>>>>> eeefe0b (Integrate Groq API)
        }

        const data = await pdfParse(req.file.buffer);
        const resumeText = data.text?.trim();

        if (!resumeText) {
<<<<<<< HEAD
            return res.status(400).json({ error: "No readable text found in PDF." });
=======
            return res.status(400).json({ error: "No readable text found in PDF. If this is a scanned resume, use an OCR-readable PDF." });
>>>>>>> eeefe0b (Integrate Groq API)
        }

        const prompt = `
You are an expert ATS resume reviewer and Java Full Stack hiring mentor.

<<<<<<< HEAD
Analyze the resume below. Return ONLY valid JSON. Do not use Markdown fences.
=======
Analyze the resume below. Return ONLY valid JSON, with no Markdown fences.
>>>>>>> eeefe0b (Integrate Groq API)
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

<<<<<<< HEAD
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
=======
        const completion = await groq.chat.completions.create({
            model: MODEL,
            messages: [
                { role: "system", content: "You analyze resumes and return strictly valid JSON matching the requested schema." },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const rawAnalysis = completion.choices?.[0]?.message?.content || "";
        if (!rawAnalysis) {
            return res.status(502).json({ error: "Groq returned an empty analysis. Please try again." });
>>>>>>> eeefe0b (Integrate Groq API)
        }

        let analysis;
        try {
            analysis = JSON.parse(cleanJsonText(rawAnalysis));
<<<<<<< HEAD
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

=======
        } catch (parseError) {
            console.error("Could not parse Groq JSON response:", rawAnalysis);
            return res.status(502).json({ error: "The AI returned an unexpected format. Please try again." });
        }

        // Keep the response shape predictable for the frontend.
        analysis.score = Math.max(0, Math.min(100, Number.parseInt(analysis.score, 10) || 0));
        analysis.skills = analysis.skills || {};
        for (const key of ["programming", "frontend", "backend", "databases", "tools", "other"]) {
            if (!Array.isArray(analysis.skills[key])) analysis.skills[key] = [];
        }
        for (const key of ["strengths", "missingSkills", "improvements", "recommendedRoles", "interviewQuestions"]) {
            if (!Array.isArray(analysis[key])) analysis[key] = [];
        }

        res.json({ message: "Resume analyzed successfully", analysis });
    } catch (error) {
        console.error("Analysis Error:", error);
        if (error.status === 401) {
            return res.status(502).json({ error: "Groq rejected the API key. Check that GROQ_API_KEY is correct." });
        }
        if (error.status === 429) {
            return res.status(429).json({ error: "Groq rate limit or quota reached. Please wait and try again later." });
        }
        res.status(500).json({ error: "Resume analysis failed. Please try again." });
    }
});

// Multer/file validation errors should be returned as readable JSON.
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "PDF must be 5 MB or smaller." : error.message });
    }
    if (error) return res.status(400).json({ error: error.message || "Invalid upload." });
    next();
});

const PORT = process.env.PORT || 3000;
>>>>>>> eeefe0b (Integrate Groq API)
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
