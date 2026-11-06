
"use strict";

/* KONFIGURACJA REPOZYTORIUM */
const OWNER = "kac0pi";
const REPO = "kac0pi";
const BRANCH = "main";

const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

let token = "";
let posts = [];
let selectedSlug = null;
let selectedSha = null;
let busy = false;

const $ = id => document.getElementById(id);

/* DATA W CZASIE LOKALNYM */
function today() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

$("year").textContent = new Date().getFullYear();
$("date").value = today();

/* KOMUNIKATY */
function showMessage(id, message, error = false) {
    const element = $(id);

    element.textContent = message;
    element.className = error ? "message error" : "message";
}

function setBusy(value) {
    busy = value;

    $("save").disabled = value;
    $("deletePost").disabled = value;
    $("newPost").disabled = value;
    $("logout").disabled = value;
}

/* GITHUB API */
function authHeaders(extra = {}) {
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
        headers: authHeaders(options.headers || {})
    });

    const data = response.status === 204
        ? null
        : await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Token GitHub jest nieprawidłowy lub wygasł.");
        }

        if (response.status === 403) {
            throw new Error(
                "Brak uprawnień. Sprawdź Contents: Read and write. Możliwy jest też limit API."
            );
        }

        if (response.status === 404) {
            throw new Error(
                "Nie znaleziono repozytorium, gałęzi lub pliku."
            );
        }

        if (response.status === 409 || response.status === 422) {
            throw new Error(
                data?.message ||
                "Konflikt wersji pliku. Odśwież listę artykułów i spróbuj ponownie."
            );
        }

        throw new Error(
            data?.message || `Błąd GitHub API (${response.status}).`
        );
    }

    return data;
}

/* KODOWANIE UTF-8 DO BASE64 */
function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";

    for (let i = 0; i < bytes.length; i += 32768) {
        binary += String.fromCharCode(
            ...bytes.subarray(i, i + 32768)
        );
    }

    return btoa(binary);
}

function decodeBase64(value) {
    const binary = atob(value.replace(/\n/g, ""));

    const bytes = Uint8Array.from(
        binary,
        character => character.charCodeAt(0)
    );

    return new TextDecoder("utf-8").decode(bytes);
}

/* TWORZENIE ADRESU ARTYKUŁU */
function slugify(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70) || "nowy-wpis";
}

/* ODCZYTYWANIE METADANYCH MARKDOWN */
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
            meta.tags.push(
                tag[1].replace(/^["']|["']$/g, "")
            );
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
                .map(item =>
                    item.trim().replace(/^["']|["']$/g, "")
                );
        } else if (key !== "tags" && key in meta) {
            meta[key] = value.replace(/^["']|["']$/g, "");
        }
    }

    return {
        meta,
        body: raw.slice(match[0].length)
    };
}

/* TWORZENIE PLIKU MARKDOWN */
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

/* BEZPIECZNE WYŚWIETLANIE TEKSTU */
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

/* LISTA ARTYKUŁÓW */
function renderPosts() {
    const filter = $("search").value.toLowerCase().trim();

    const filtered = posts.filter(post =>
        `${post.meta.title} ${post.slug} ${(post.meta.tags || []).join(" ")}`
            .toLowerCase()
            .includes(filter)
    );

    $("postList").innerHTML = filtered.length
        ? filtered.map(post => `
            <button
                class="post-item ${post.slug === selectedSlug ? "active" : ""}"
                data-slug="${escapeHTML(post.slug)}"
                type="button">

                <strong>${escapeHTML(post.meta.title)}</strong>
                <small>${escapeHTML(post.meta.date)}</small>
            </button>
        `).join("")
        : "<p class='muted'>Nie znaleziono artykułów.</p>";

    $("postList").querySelectorAll("[data-slug]").forEach(button => {
        button.addEventListener("click", () => {
            const post = posts.find(
                item => item.slug === button.dataset.slug
            );

            if (post) {
                setEditor(post);
            }
        });
    });
}

/* USTAWIANIE EDYTORA */
function setEditor(post = null) {
    selectedSlug = post?.slug || null;
    selectedSha = post?.sha || null;

    $("editorTitle").textContent = post
        ? "Edytuj artykuł"
        : "Nowy artykuł";

    $("title").value = post?.meta.title || "";
    $("date").value = post?.meta.date || today();
    $("category").value = post?.meta.category || "IT";
    $("description").value = post?.meta.description || "";
    $("tags").value = (post?.meta.tags || []).join(", ");
    $("content").value = post?.body || "";

    $("deletePost").hidden = !post;
    $("previewPanel").hidden = true;

    renderPosts();
}

/* WCZYTYWANIE ARTYKUŁÓW Z GITHUBA */
async function loadPosts() {
    const files = await github(
        `/contents/posts?ref=${BRANCH}`
    );

    if (!Array.isArray(files)) {
        throw new Error(
            "GitHub nie zwrócił listy plików z folderu posts."
        );
    }

    const markdownFiles = files.filter(file =>
        file.type === "file" && /\.md$/i.test(file.name)
    );

    const loadedPosts = await Promise.all(
        markdownFiles.map(async file => {
            const data = await github(
                `/contents/posts/${encodeURIComponent(file.name)}?ref=${BRANCH}`
            );

            const raw = decodeBase64(data.content || "");
            const slug = file.name.replace(/\.md$/i, "");
            const parsed = parsePost(raw, slug);

            return {
                slug,
                sha: data.sha,
                meta: parsed.meta,
                body: parsed.body
            };
        })
    );

    posts = loadedPosts.sort((a, b) =>
        (b.meta.date || "").localeCompare(a.meta.date || "")
    );

    renderPosts();

    if (selectedSlug) {
        const current = posts.find(
            post => post.slug === selectedSlug
        );

        if (current) {
            setEditor(current);
            return;
        }
    }

    setEditor(null);
}

/* AKTUALIZACJA INDEKSU BLOGA */
async function updatePostsIndex() {
    const currentIndex = await github(
        `/contents/posts/posts.json?ref=${BRANCH}`
    );

    const index = posts.map(post => ({
        slug: post.slug,
        title: post.meta.title || post.slug,
        description: post.meta.description || "",
        date: post.meta.date || "",
        tags: post.meta.tags || [],
        category: post.meta.category || "IT",
        file: `posts/${post.slug}.md`
    }));

    await github("/contents/posts/posts.json", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Update blog posts index",
            content: encodeBase64(
                JSON.stringify(index, null, 2) + "\n"
            ),
            sha: currentIndex.sha,
            branch: BRANCH
        })
    });
}

/* LOGOWANIE */
$("loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    token = $("token").value.trim();

    if (!token) return;

    $("connect").disabled = true;
    showMessage("loginMessage", "Łączenie z GitHub...");

    try {
        const repo = await github("");

        if (repo.default_branch !== BRANCH) {
            throw new Error(
                `Repozytorium używa gałęzi ${repo.default_branch}, a panel ma ustawioną ${BRANCH}.`
            );
        }

        await loadPosts();

        $("login").hidden = true;
        $("workspace").hidden = false;
        $("token").value = "";

        $("connectionStatus").textContent =
            `Połączono · ${repo.default_branch}`;

        showMessage(
            "editorMessage",
            `Połączono poprawnie. Wczytano ${posts.length} artykułów.`
        );

    } catch (error) {
        token = "";
        showMessage("loginMessage", error.message, true);

    } finally {
        $("connect").disabled = false;
    }
});

/* DODAWANIE I EDYTOWANIE */
$("postForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (busy) return;

    const title = $("title").value.trim();

    if (!title) {
        showMessage("editorMessage", "Podaj tytuł artykułu.", true);
        return;
    }

    if (!$("content").value.trim()) {
        showMessage("editorMessage", "Wpisz treść artykułu.", true);
        return;
    }

    const slug = selectedSlug || slugify(title);

    if (
        !selectedSlug &&
        posts.some(post => post.slug === slug)
    ) {
        showMessage(
            "editorMessage",
            "Artykuł o takim adresie już istnieje.",
            true
        );
        return;
    }

    setBusy(true);
    showMessage("editorMessage", "Zapisywanie artykułu na GitHubie...");

    try {
        const payload = {
            message: `${selectedSlug ? "Update" : "Add"} blog post: ${slug}`,
            content: encodeBase64(makeMarkdown()),
            branch: BRANCH
        };

        if (selectedSha) {
            payload.sha = selectedSha;
        }

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

        await loadPosts();
        await updatePostsIndex();

        showMessage(
            "editorMessage",
            "Sukces! Artykuł zapisano i dodano do indeksu bloga."
        );

    } catch (error) {
        showMessage("editorMessage", error.message, true);

    } finally {
        setBusy(false);
    }
});

/* USUWANIE ARTYKUŁU */
$("deletePost").addEventListener("click", async () => {
    if (busy) return;

    if (!selectedSlug || !selectedSha) {
        showMessage(
            "editorMessage",
            "Najpierw wybierz artykuł z listy.",
            true
        );
        return;
    }

    const slugToDelete = selectedSlug;
    const shaToDelete = selectedSha;

    const confirmed = confirm(
        `Czy na pewno usunąć artykuł "${slugToDelete}"?\n\nTej operacji nie można cofnąć z panelu.`
    );

    if (!confirmed) return;

    setBusy(true);
    showMessage("editorMessage", "Usuwanie artykułu...");

    try {
        await github(
            `/contents/posts/${encodeURIComponent(slugToDelete)}.md`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Delete blog post: ${slugToDelete}`,
                    sha: shaToDelete,
                    branch: BRANCH
                })
            }
        );

        selectedSlug = null;
        selectedSha = null;

        await loadPosts();
        await updatePostsIndex();

        showMessage(
            "editorMessage",
            "Artykuł został usunięty, a indeks bloga zaktualizowany."
        );

    } catch (error) {
        showMessage("editorMessage", error.message, true);

    } finally {
        setBusy(false);
    }
});

/* NOWY ARTYKUŁ */
$("newPost").addEventListener("click", () => {
    if (busy) return;

    setEditor(null);

    showMessage(
        "editorMessage",
        "Wpisz dane nowego artykułu."
    );
});

/* WYSZUKIWANIE */
$("search").addEventListener("input", renderPosts);

/* WYLOGOWANIE */
$("logout").addEventListener("click", () => {
    if (busy) return;

    token = "";
    posts = [];
    selectedSlug = null;
    selectedSha = null;

    $("workspace").hidden = true;
    $("login").hidden = false;
    $("token").value = "";

    setEditor(null);

    showMessage("loginMessage", "Rozłączono z GitHubem.");
});

/* PODGLĄD TEKSTU */
$("preview").addEventListener("click", () => {
    const title = $("title").value.trim();
    const content = $("content").value;

    $("previewContent").textContent =
        `${title}\n\n${content}`;

    $("previewPanel").hidden = false;
});

$("closePreview").addEventListener("click", () => {
    $("previewPanel").hidden = true;
});
