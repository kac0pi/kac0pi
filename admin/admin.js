
const OWNER = "kac0pi";
const REPO = "kac0pi";
const BRANCH = "main";

const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

let token = "";
let posts = [];
let selectedSlug = null;
let selectedSha = null;

const $ = id => document.getElementById(id);

$("year").textContent = new Date().getFullYear();
$("date").value = new Date().toISOString().slice(0, 10);

function showMessage(id, text, error = false) {
    const element = $(id);
    element.textContent = text;
    element.className = error ? "message error" : "message";
}

function headers(extra = {}) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...extra
    };
}

async function github(path, options = {}) {
    const response = await fetch(API + path, {
        ...options,
        headers: headers(options.headers || {})
    });

    const data = response.status === 204
        ? null
        : await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Nieprawidłowy lub wygasły token.");
        }

        if (response.status === 403) {
            throw new Error(
                "Brak uprawnień. Ustaw Contents: Read and write."
            );
        }

        if (response.status === 404) {
            throw new Error(
                "Nie znaleziono repozytorium lub gałęzi main."
            );
        }

        throw new Error(data.message || "Błąd GitHub API.");
    }

    return data;
}

function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";

    for (let i = 0; i < bytes.length; i += 32768) {
        binary += String.fromCharCode(
            ...bytes.subarray(i, i + 32768)
        );
    }

    return btoa(binary);
}

function decodeBase64(text) {
    const binary = atob(text.replace(/\n/g, ""));

    const bytes = Uint8Array.from(
        binary,
        character => character.charCodeAt(0)
    );

    return new TextDecoder("utf-8").decode(bytes);
}

function slugify(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70) || "nowy-wpis";
}

function parsePost(raw, slug) {
    const meta = {
        title: slug,
        date: "",
        description: "",
        category: "IT",
        tags: []
    };

    const match = raw.match(
        /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/
    );

    if (!match) {
        return { meta, body: raw };
    }

    let tagsMode = false;

    for (const line of match[1].split(/\r?\n/)) {
        const tag = line.match(/^\s+-\s*(.+)$/);

        if (tag && tagsMode) {
            meta.tags.push(tag[1].replace(/^["']|["']$/g, ""));
            continue;
        }

        const field = line.match(/^([\w-]+):\s*(.*)$/);

        if (!field) continue;

        const key = field[1];
        const value = field[2].trim();

        tagsMode = key === "tags" && !value;

        if (key === "tags" && value) {
            meta.tags = value
                .replace(/^\[|\]$/g, "")
                .split(",")
                .map(item => item.trim().replace(/^["']|["']$/g, ""));
        } else if (key !== "tags" && key in meta) {
            meta[key] = value.replace(/^["']|["']$/g, "");
        }
    }

    return {
        meta,
        body: raw.slice(match[0].length)
    };
}

function makeMarkdown() {
    const tags = $("tags").value
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean);

    const quote = value => JSON.stringify(value || "");

    return `---
title: ${quote($("title").value.trim())}
date: ${quote($("date").value)}
description: ${quote($("description").value.trim())}
tags:
${tags.map(tag => "  - " + quote(tag)).join("\n")}
category: ${quote($("category").value.trim() || "IT")}
---

${$("content").value.trim()}
`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function renderPosts() {
    const filter = $("search").value.toLowerCase();

    const filtered = posts.filter(post =>
        `${post.meta.title} ${post.slug} ${post.meta.tags.join(" ")}`
            .toLowerCase()
            .includes(filter)
    );

    $("postList").innerHTML = filtered.length
        ? filtered.map(post => `
            <button
                class="post-item ${post.slug === selectedSlug ? "active" : ""}"
                data-slug="${escapeHTML(post.slug)}"
                type="button"
            >
                <strong>${escapeHTML(post.meta.title)}</strong>
                <small>${escapeHTML(post.meta.date)}</small>
            </button>
        `).join("")
        : "<p class='muted'>Brak artykułów.</p>";

    $("postList").querySelectorAll("[data-slug]").forEach(button => {
        button.addEventListener("click", () => {
            const post = posts.find(item =>
                item.slug === button.dataset.slug
            );

            if (post) setEditor(post);
        });
    });
}

function setEditor(post = null) {
    selectedSlug = post?.slug || null;
    selectedSha = post?.sha || null;

    $("editorTitle").textContent = post
        ? "Edytuj artykuł"
        : "Nowy artykuł";

    $("title").value = post?.meta.title || "";
    $("date").value = post?.meta.date ||
        new Date().toISOString().slice(0, 10);

    $("category").value = post?.meta.category || "IT";
    $("description").value = post?.meta.description || "";
    $("tags").value = (post?.meta.tags || []).join(", ");
    $("content").value = post?.body || "";

    $("deletePost").hidden = !post;

    renderPosts();
}

async function loadPosts() {
    const files = await github(
        `/contents/posts?ref=${BRANCH}`
    );

    const markdownFiles = files.filter(file =>
        file.type === "file" && file.name.endsWith(".md")
    );

    posts = await Promise.all(markdownFiles.map(async file => {
        const data = await github(
            `/contents/posts/${encodeURIComponent(file.name)}?ref=${BRANCH}`
        );

        const raw = decodeBase64(data.content || "");
        const parsed = parsePost(
            raw,
            file.name.replace(/\.md$/i, "")
        );

        return {
            slug: file.name.replace(/\.md$/i, ""),
            sha: data.sha,
            meta: parsed.meta,
            body: parsed.body
        };
    }));

    posts.sort((a, b) =>
        (b.meta.date || "").localeCompare(a.meta.date || "")
    );

    renderPosts();
    setEditor(null);

    showMessage(
        "editorMessage",
        `Wczytano ${posts.length} artykułów.`
    );
}

$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    token = $("token").value.trim();

    if (!token) return;

    $("connect").disabled = true;

    showMessage("loginMessage", "Łączenie z GitHub...");

    try {
        const repo = await github("");

        $("login").hidden = true;
        $("workspace").hidden = false;
        $("token").value = "";

        $("connectionStatus").textContent =
            "Połączono · " + repo.default_branch;

        await loadPosts();

    } catch (error) {
        token = "";
        showMessage("loginMessage", error.message, true);

    } finally {
        $("connect").disabled = false;
    }
});

$("postForm").addEventListener("submit", async event => {
    event.preventDefault();

    const title = $("title").value.trim();
    const slug = selectedSlug || slugify(title);

    if (!selectedSlug && posts.some(post => post.slug === slug)) {
        showMessage(
            "editorMessage",
            "Wpis o takim adresie już istnieje.",
            true
        );
        return;
    }

    $("save").disabled = true;

    try {
        const payload = {
            message: `${selectedSlug ? "Update" : "Add"} blog post: ${slug}`,
            content: encodeBase64(makeMarkdown()),
            branch: BRANCH
        };

        if (selectedSha) payload.sha = selectedSha;

        await github(
            `/contents/posts/${encodeURIComponent(slug)}.md`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        selectedSlug = slug;

        showMessage(
            "editorMessage",
            "Zapisano artykuł w GitHub! Strona zaktualizuje się po wdrożeniu."
        );

        await loadPosts();

    } catch (error) {
        showMessage("editorMessage", error.message, true);

    } finally {
        $("save").disabled = false;
    }
});

$("deletePost").addEventListener("click", async () => {
    if (!selectedSlug || !selectedSha) return;

    if (!confirm("Czy na pewno usunąć ten artykuł?")) return;

    try {
        await github(
            `/contents/posts/${encodeURIComponent(selectedSlug)}.md`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Delete blog post: ${selectedSlug}`,
                    sha: selectedSha,
                    branch: BRANCH
                })
            }
        );

        selectedSlug = null;
        selectedSha = null;

        await loadPosts();

        showMessage("editorMessage", "Artykuł został usunięty.");

    } catch (error) {
        showMessage("editorMessage", error.message, true);
    }
});

$("newPost").addEventListener("click", () => setEditor(null));
$("search").addEventListener("input", renderPosts);

$("logout").addEventListener("click", () => {
    token = "";
    posts = [];
    selectedSlug = null;
    selectedSha = null;

    $("workspace").hidden = true;
    $("login").hidden = false;
    $("token").value = "";

    showMessage("loginMessage", "Rozłączono z GitHub.");
});

$("preview").addEventListener("click", () => {
    const markdown = $("content").value;

    $("previewContent").textContent = markdown;
    $("previewPanel").hidden = false;
});

$("closePreview").addEventListener("click", () => {
    $("previewPanel").hidden = true;
});
