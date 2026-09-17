const fileInput = document.getElementById("resume");
const fileName = document.getElementById("fileName");

fileInput.addEventListener("change", () => {
    fileName.textContent = fileInput.files.length
        ? fileInput.files[0].name
        : "No file selected";
});

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function listHtml(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return "<li>No items returned.</li>";
    }
    return items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderSkills(skills = {}) {
    const labels = {
        programming: "Programming",
        frontend: "Frontend",
        backend: "Backend",
        databases: "Databases",
        tools: "Tools",
        other: "Other"
    };

    return Object.entries(labels).map(([key, label]) => {
        const values = Array.isArray(skills[key]) ? skills[key] : [];
        if (!values.length) return "";
        return `<div class="skill-group">
            <strong>${label}</strong>
            <div class="chips">${values.map(v => `<span class="chip">${escapeHtml(v)}</span>`).join("")}</div>
        </div>`;
    }).join("") || "<p>No skills identified.</p>";
}

function show(id) {
    document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
    document.getElementById(id).classList.add("hidden");
}

async function analyzeResume() {
    const result = document.getElementById("dashboard");
    const loading = document.getElementById("loading");
    const button = document.getElementById("analyzeBtn");
    const errorBox = document.getElementById("error");

    hide("error");
    hide("dashboard");

    if (!fileInput.files.length) {
        errorBox.textContent = "Please select a PDF resume first.";
        show("error");
        return;
    }

    const formData = new FormData();
    formData.append("resume", fileInput.files[0]);

    loading.textContent = "Analyzing your resume... This may take a few seconds.";
    button.disabled = true;
    button.textContent = "Analyzing...";

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Analysis failed.");
        }

        const a = data.analysis || {};
        document.getElementById("score").textContent = Number(a.score ?? 0);
        document.getElementById("scoreReason").textContent = a.scoreReason || "";
        document.getElementById("candidateSummary").textContent = a.candidateSummary || "";
        document.getElementById("skills").innerHTML = renderSkills(a.skills);
        document.getElementById("strengths").innerHTML = listHtml(a.strengths);
        document.getElementById("missingSkills").innerHTML = listHtml(a.missingSkills);
        document.getElementById("improvements").innerHTML = listHtml(a.improvements);
        document.getElementById("roles").innerHTML = (a.recommendedRoles || [])
            .map(role => `<span class="chip">${escapeHtml(role)}</span>`).join("");

        document.getElementById("questions").innerHTML = (a.interviewQuestions || [])
            .map((item, index) => `
                <article class="question">
                    <h3>${index + 1}. ${escapeHtml(item.question)}</h3>
                    <p>${escapeHtml(item.why || "")}</p>
                </article>
            `).join("");

        show("dashboard");
    } catch (error) {
        errorBox.textContent = "Error: " + error.message;
        show("error");
    } finally {
        loading.textContent = "";
        button.disabled = false;
        button.textContent = "Analyze Resume";
    }
}
