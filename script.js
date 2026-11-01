
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const STORAGE_KEY = "resumora_v2";

    const defaults = {
        name: "",
        jobTitle: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        summary: "",
        skills: "",
        template: "modern",
        experience: [],
        education: [],
        projects: [],
        showDeclaration: true,
        declarationText: "I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.",
        showSignature: true,
        signature: "",
        portfolio: {
            headline: "Designer & Developer",
            about: "",
            email: "",
            projects: []
        }
    };

    const clone = obj => JSON.parse(JSON.stringify(obj));

    function loadData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (!saved || typeof saved !== "object") {
                return clone(defaults);
            }

            return {
                ...clone(defaults),
                ...saved,
                experience: Array.isArray(saved.experience) ? saved.experience : [],
                education: Array.isArray(saved.education) ? saved.education : [],
                projects: Array.isArray(saved.projects) ? saved.projects : [],
                portfolio: {
                    ...clone(defaults.portfolio),
                    ...(saved.portfolio || {}),
                    projects: Array.isArray(saved.portfolio?.projects)
                        ? saved.portfolio.projects
                        : []
                }
            };
        } catch (error) {
            console.error("Load error:", error);
            return clone(defaults);
        }
    }

    let data = loadData();

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

            if ($("saveStatus")) {
                $("saveStatus").textContent = "✓ Saved locally";
            }
        } catch (error) {
            if ($("saveStatus")) {
                $("saveStatus").textContent = "Storage full";
            }

            console.error("Save error:", error);
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function safeURL(value) {
        try {
            const url = new URL(value);

            if (["https:", "http:"].includes(url.protocol)) {
                return escapeHTML(url.href);
            }
        } catch (error) {}

        return "";
    }

    function setSectionVisible(id, visible) {
        $(id).classList.toggle("hidden", !visible);
    }

    // PERSONAL INFORMATION
    const personalFields = [
        "name", "jobTitle", "email", "phone",
        "location", "website", "summary", "skills"
    ];

    personalFields.forEach(id => {
        $(id).value = data[id] || "";

        $(id).addEventListener("input", () => {
            data[id] = $(id).value;
            renderAll();
            saveData();
        });
    });

    // TEMPLATE
    $("template").value = data.template;

    $("template").addEventListener("change", event => {
        data.template = event.target.value;
        renderResume();
        saveData();
    });

    // DECLARATION SETTINGS
    $("showDeclaration").checked = data.showDeclaration;
    $("showSignature").checked = data.showSignature;
    $("declarationText").value = data.declarationText;

    $("showDeclaration").addEventListener("change", event => {
        data.showDeclaration = event.target.checked;
        renderResume();
        saveData();
    });

    $("showSignature").addEventListener("change", event => {
        data.showSignature = event.target.checked;
        renderResume();
        saveData();
    });

    $("declarationText").addEventListener("input", event => {
        data.declarationText = event.target.value;
        renderResume();
        saveData();
    });

    // SIGNATURE AUTO BACKGROUND REMOVER
async function processSignature(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please upload a valid image.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5 MB.");
        return;
    }

    const imageURL = URL.createObjectURL(file);

    try {
        const img = new Image();

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageURL;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d", {
            willReadFrequently: true
        });

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(
            0, 0, canvas.width, canvas.height
        );

        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            const brightness = (r + g + b) / 3;
            const difference =
                Math.max(r, g, b) - Math.min(r, g, b);

            if (brightness > 235 && difference < 45) {
                pixels[i + 3] = 0;
            } else if (brightness > 205 && difference < 35) {
                pixels[i + 3] = Math.round(
                    pixels[i + 3] * (235 - brightness) / 30
                );
            }
        }

        ctx.putImageData(imageData, 0, 0);

        data.signature = canvas.toDataURL("image/png");

        renderResume();
        saveData();

        alert("Signature background processed!");

    } catch (error) {
        console.error(error);
        alert("Signature processing failed.");
    } finally {
        URL.revokeObjectURL(imageURL);
    }
}

// SIGNATURE UPLOAD EVENT
$("signatureUpload").addEventListener("change", event => {
    processSignature(event.target.files[0]);
});

    // SIGNATURE UPLOAD
    $("signatureUpload").addEventListener("change", event => {
        const file = event.target.files[0];

        if (file) {
            processSignature(file);
        }
    });

    // REMOVE SIGNATURE
    $("removeSignature").addEventListener("click", () => {
        data.signature = "";

        $("signatureUpload").value = "";

        renderResume();
        saveData();
    });

    // PORTFOLIO INPUTS
    const portfolioInputs = {
        portfolioHeadline: "headline",
        portfolioAbout: "about",
        portfolioEmail: "email"
    };

    Object.entries(portfolioInputs).forEach(([id, key]) => {
        $(id).value = data.portfolio[key] || "";

        $(id).addEventListener("input", () => {
            data.portfolio[key] = $(id).value;
            renderPortfolio();
            saveData();
        });
    });

    // REPEATING FORM SECTIONS
    const config = {
        experience: {
            container: "experienceFields",
            title: "Experience",
            fields: [
                ["role", "Job Title"],
                ["company", "Company"],
                ["dates", "Duration"],
                ["description", "Description"]
            ]
        },

        education: {
            container: "educationFields",
            title: "Education",
            fields: [
                ["degree", "Degree / Qualification"],
                ["school", "Institution"],
                ["dates", "Duration"],
                ["details", "Details"]
            ]
        },

        projects: {
            container: "projectFields",
            title: "Project",
            fields: [
                ["name", "Project Name"],
                ["link", "Project Link"],
                ["description", "Description"]
            ]
        },

        portfolio: {
            container: "portfolioFields",
            title: "Portfolio Project",
            fields: [
                ["name", "Project Name"],
                ["link", "Project Link"],
                ["description", "Description"]
            ]
        }
    };

    const blankItems = {
        experience: {
            role: "",
            company: "",
            dates: "",
            description: ""
        },

        education: {
            degree: "",
            school: "",
            dates: "",
            details: ""
        },

        projects: {
            name: "",
            link: "",
            description: ""
        },

        portfolio: {
            name: "",
            link: "",
            description: ""
        }
    };

    function getItems(type) {
        return type === "portfolio"
            ? data.portfolio.projects
            : data[type];
    }

    function addItem(type) {
        getItems(type).push(clone(blankItems[type]));

        renderFields();
        renderAll();
        saveData();
    }

    function createCard(type, item, index) {
        const card = document.createElement("div");
        card.className = "repeat-card";

        const header = document.createElement("div");
        header.className = "repeat-header";

        const title = document.createElement("strong");
        title.textContent = config[type].title + " " + (index + 1);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-btn";
        remove.textContent = "✕ Remove";

        remove.addEventListener("click", () => {
            getItems(type).splice(index, 1);

            renderFields();
            renderAll();
            saveData();
        });

        header.append(title, remove);
        card.appendChild(header);

        config[type].fields.forEach(([key, label]) => {
            const wrapper = document.createElement("label");
            wrapper.textContent = label;

            const input =
                key === "description" || key === "details"
                    ? document.createElement("textarea")
                    : document.createElement("input");

            if (input.tagName === "TEXTAREA") {
                input.rows = 3;
            }

            input.placeholder = label;
            input.value = item[key] || "";

            input.addEventListener("input", () => {
                item[key] = input.value;

                renderAll();
                saveData();
            });

            wrapper.appendChild(input);
            card.appendChild(wrapper);
        });

        return card;
    }

    function renderFields() {
        [
            ["experience", data.experience],
            ["education", data.education],
            ["projects", data.projects],
            ["portfolio", data.portfolio.projects]
        ].forEach(([type, items]) => {
            const container = $(config[type].container);

            container.replaceChildren();

            items.forEach((item, index) => {
                container.appendChild(
                    createCard(type, item, index)
                );
            });
        });
    }

    // RESUME ENTRY RENDERING
    function renderEntries(items, type) {
        const fields = {
            experience: ["role", "company", "description"],
            education: ["degree", "school", "details"],
            projects: ["name", "link", "description"]
        };

        const keys = fields[type];

        const valid = items.filter(item =>
            keys.some(key => String(item[key] || "").trim()) ||
            String(item.dates || "").trim()
        );

        return valid.map(item => {
            const title = item[keys[0]] || "";
            const subtitle = item[keys[1]] || "";
            const description = item[keys[2]] || "";

            return `
                <div class="entry">
                    <div class="entry-top">
                        <span>${escapeHTML(title)}</span>
                        <span>${escapeHTML(item.dates || "")}</span>
                    </div>

                    ${subtitle
                        ? `<div class="entry-sub">${escapeHTML(subtitle)}</div>`
                        : ""}

                    ${description
                        ? `<p class="entry-description">${escapeHTML(description)}</p>`
                        : ""}
                </div>
            `;
        }).join("");
    }

    // RESUME PREVIEW
    function renderResume() {
        $("pName").textContent = data.name || "Your Name";
        $("pJob").textContent = data.jobTitle || "Professional Title";

        const contacts = [
            data.email,
            data.phone,
            data.location,
            data.website
        ].filter(Boolean);

        $("pContact").textContent = contacts.join(" | ");

        $("pSummary").textContent = data.summary;

        setSectionVisible(
            "summarySection",
            Boolean(data.summary.trim())
        );

        const experienceHTML = renderEntries(
            data.experience,
            "experience"
        );

        $("pExperience").innerHTML = experienceHTML;

        setSectionVisible(
            "experienceSection",
            Boolean(experienceHTML)
        );

        const educationHTML = renderEntries(
            data.education,
            "education"
        );

        $("pEducation").innerHTML = educationHTML;

        setSectionVisible(
            "educationSection",
            Boolean(educationHTML)
        );

        const projectHTML = renderEntries(
            data.projects,
            "projects"
        );

        $("pProjects").innerHTML = projectHTML;

        setSectionVisible(
            "projectsSection",
            Boolean(projectHTML)
        );

        const skills = data.skills
            .split(",")
            .map(skill => skill.trim())
            .filter(Boolean);

        $("pSkills").innerHTML = skills.map(skill =>
            `<span class="skill-chip">${escapeHTML(skill)}</span>`
        ).join("");

        setSectionVisible(
            "skillsSection",
            skills.length > 0
        );

        // DECLARATION
        $("pDeclaration").textContent = data.declarationText;

        const declarationVisible =
            data.showDeclaration &&
            Boolean(data.declarationText.trim());

        setSectionVisible(
            "declarationSection",
            declarationVisible
        );

        // SIGNATURE
        const signatureVisible =
            data.showSignature &&
            Boolean(data.signature);

        $("signatureArea").classList.toggle(
            "hidden",
            !signatureVisible
        );

        if (signatureVisible) {
            $("pSignature").src = data.signature;

            $("pSignatureName").textContent =
                data.name || "";
        } else {
            $("pSignature").removeAttribute("src");

            $("pSignatureName").textContent = "";
        }

        $("resumePaper").className =
            "resume-paper " + data.template;
    }

    // PORTFOLIO PREVIEW
    function renderPortfolio() {
        $("ppName").textContent =
            data.name || "Your Name";

        $("ppHeadline").textContent =
            data.portfolio.headline || "Designer & Developer";

        $("ppAbout").textContent =
            data.portfolio.about ||
            "Your introduction will appear here.";

        const email =
            data.portfolio.email || data.email;

        $("ppContact").href = email
            ? "mailto:" + encodeURIComponent(email)
            : "mailto:hello@example.com";

        const projects = data.portfolio.projects.filter(project =>
            project.name ||
            project.description ||
            project.link
        );

        $("ppProjects").innerHTML = projects.length
            ? projects.map(project => {
                const url = safeURL(project.link);

                return `
                    <div class="portfolio-card">
                        <h3>${escapeHTML(project.name || "Project")}</h3>

                        <p>${escapeHTML(project.description || "")}</p>

                        ${url
                            ? `<a href="${url}" target="_blank" rel="noopener noreferrer">View Project ↗</a>`
                            : ""}
                    </div>
                `;
            }).join("")
            : `
                <div class="portfolio-card">
                    <h3>Your First Project</h3>
                    <p>Add your projects to showcase your work.</p>
                </div>
            `;
    }

    function renderAll() {
        renderResume();
        renderPortfolio();
    }

    // PAGE SWITCHING
    function switchPage(page) {
        const isPortfolio = page === "portfolio";

        $("resumePage").classList.toggle(
            "hidden",
            isPortfolio
        );

        $("portfolioPage").classList.toggle(
            "hidden",
            !isPortfolio
        );

        document.querySelectorAll(".nav-btn").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });

        $("heroTitle").innerHTML = isPortfolio
            ? 'Showcase Your <span>Creative Work.</span>'
            : 'Create Your <span>Professional Resume.</span>';

        $("heroText").textContent = isPortfolio
            ? "Build your personal portfolio and showcase your best projects."
            : "Build, customize and download your resume in minutes.";

        $("downloadBtn").textContent = isPortfolio
            ? "Download Portfolio"
            : "Download PDF";
    }

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.addEventListener("click", () => {
            switchPage(button.dataset.page);
        });
    });

    // ADD BUTTONS
    $("addExperience").addEventListener("click", () =>
        addItem("experience")
    );

    $("addEducation").addEventListener("click", () =>
        addItem("education")
    );

    $("addProject").addEventListener("click", () =>
        addItem("projects")
    );

    $("addPortfolio").addEventListener("click", () =>
        addItem("portfolio")
    );

    // PDF PRINT
    $("downloadBtn").addEventListener("click", () => {
        const isPortfolio =
            !$("portfolioPage").classList.contains("hidden");

        document.body.dataset.print =
            isPortfolio ? "portfolio" : "resume";

        window.print();
    });

    window.addEventListener("afterprint", () => {
        delete document.body.dataset.print;
    });

    // RESET ALL DATA
    $("resetBtn").addEventListener("click", () => {
        if (!confirm("Are you sure you want to clear all RESUMORA data?")) {
            return;
        }

        data = clone(defaults);

        localStorage.removeItem(STORAGE_KEY);

        personalFields.forEach(id => {
            $(id).value = "";
        });

        Object.entries(portfolioInputs).forEach(([id, key]) => {
            $(id).value = data.portfolio[key];
        });

        $("template").value = "modern";

        $("showDeclaration").checked = true;
        $("showSignature").checked = true;

        $("declarationText").value =
            data.declarationText;

        $("signatureUpload").value = "";

        renderFields();
        renderAll();
        saveData();
    });

    // INITIALIZE
    $("year").textContent = new Date().getFullYear();

    renderFields();
    renderAll();
    saveData();

    console.log("RESUMORA initialized successfully.");
});
