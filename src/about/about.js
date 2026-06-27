const aboutVersionEl = document.getElementById("aboutVersion");
const aboutAuthorEl = document.getElementById("aboutAuthor");
const aboutTitleEl = document.getElementById("aboutTitle");
const aboutSubtitleEl = document.getElementById("aboutSubtitle");
const aboutStatusEl = document.getElementById("aboutStatus");
const aboutContentEl = document.getElementById("aboutContent");

const ABOUT_SECTIONS = [
  "Features",
  "Safety behavior",
  "Requirements",
  "Credits",
  "Disclaimer",
];

const manifest = globalThis?.chrome?.runtime?.getManifest?.() || {};
const version = manifest.version || "unknown";
const author = manifest.author || "unknown";

if (aboutVersionEl) {
  aboutVersionEl.textContent = version;
}

if (aboutAuthorEl) {
  aboutAuthorEl.textContent = author;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHttpUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function renderInline(text) {
  const markdownLinkTokens = [];
  const inlineCodeTokens = [];

  let tokenized = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) => {
      const safeUrl = sanitizeHttpUrl(url);
      if (!safeUrl) {
        return label;
      }

      const token = `@@MD_LINK_${markdownLinkTokens.length}@@`;
      markdownLinkTokens.push({ label, url: safeUrl });
      return token;
    },
  );

  tokenized = tokenized.replace(/`([^`]+)`/g, (_, codeText) => {
    const token = `@@INLINE_CODE_${inlineCodeTokens.length}@@`;
    inlineCodeTokens.push(codeText);
    return token;
  });

  let html = escapeHtml(tokenized);

  html = html
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<![A-Za-z0-9])__([^_\n]+?)__(?![A-Za-z0-9])/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g, "<em>$1</em>");

  html = html.replace(/https?:\/\/[^\s<)]+/g, (rawUrl) => {
    const safeUrl = sanitizeHttpUrl(rawUrl);
    if (!safeUrl) {
      return rawUrl;
    }
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>`;
  });

  html = html.replace(/@@MD_LINK_(\d+)@@/g, (_, indexText) => {
    const index = Number(indexText);
    const link = markdownLinkTokens[index];
    if (!link) {
      return "";
    }
    return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
  });

  html = html.replace(/@@INLINE_CODE_(\d+)@@/g, (_, indexText) => {
    const index = Number(indexText);
    const codeText = inlineCodeTokens[index];
    if (typeof codeText !== "string") {
      return "";
    }
    return `<code>${escapeHtml(codeText)}</code>`;
  });

  return html;
}

function parseReadmeSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  let title = "About";
  let subtitle = "";
  let inIntro = false;
  const sections = new Map();
  let currentSection = null;

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      title = h1Match[1].trim();
      inIntro = true;
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      currentSection = h2Match[1].trim();
      sections.set(currentSection, []);
      inIntro = false;
      continue;
    }

    if (inIntro) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (subtitle) {
          inIntro = false;
        }
        continue;
      }
      if (!subtitle) {
        subtitle = trimmed;
      }
      continue;
    }

    if (currentSection) {
      sections.get(currentSection).push(line);
    }
  }

  return { title, subtitle, sections };
}

function consumeParagraph(lines, startIndex) {
  const parts = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      break;
    }
    if (/^(-|\d+\.)\s+/.test(trimmed) || /^```/.test(trimmed)) {
      break;
    }
    parts.push(trimmed);
    index += 1;
  }

  return { html: `<p>${renderInline(parts.join(" "))}</p>`, nextIndex: index };
}

function consumeList(lines, startIndex) {
  const firstLine = lines[startIndex].trim();
  const ordered = /^\d+\.\s+/.test(firstLine);

  if (ordered) {
    const pattern = /^\d+\.\s+(.+)$/;
    const items = [];
    let index = startIndex;

    while (index < lines.length) {
      const trimmed = lines[index].trim();
      const match = trimmed.match(pattern);
      if (!match) {
        break;
      }
      items.push(`<li>${renderInline(match[1].trim())}</li>`);
      index += 1;
    }

    return {
      html: `<ol>${items.join("")}</ol>`,
      nextIndex: index,
    };
  }

  const normalizedIndentSize = 2;

  const parseUnorderedMatch = (line) => {
    const match = line.match(/^(\s*)-\s+(.+)$/);
    if (!match) {
      return null;
    }

    const indent = match[1].replaceAll("\t", " ".repeat(normalizedIndentSize)).length;
    return { indent, text: match[2].trim() };
  };

  const consumeUnorderedTree = (treeStartIndex, baseIndent) => {
    const items = [];
    let index = treeStartIndex;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        break;
      }

      const current = parseUnorderedMatch(line);
      if (!current || current.indent < baseIndent || current.indent > baseIndent) {
        break;
      }

      let itemHtml = renderInline(current.text);
      index += 1;

      while (index < lines.length) {
        const nestedLine = lines[index];
        if (!nestedLine.trim()) {
          break;
        }

        const nested = parseUnorderedMatch(nestedLine);
        if (!nested || nested.indent <= baseIndent) {
          break;
        }

        const nestedList = consumeUnorderedTree(index, nested.indent);
        itemHtml += nestedList.html;
        index = nestedList.nextIndex;
      }

      items.push(`<li>${itemHtml}</li>`);
    }

    return {
      html: `<ul>${items.join("")}</ul>`,
      nextIndex: index,
    };
  };

  const firstUnordered = parseUnorderedMatch(lines[startIndex]);
  if (!firstUnordered) {
    return {
      html: "",
      nextIndex: startIndex + 1,
    };
  }

  return consumeUnorderedTree(startIndex, firstUnordered.indent);
}

function renderSectionContent(lines) {
  const blocks = [];

  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      continue;
    }

    if (/^-\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const { html, nextIndex } = consumeList(lines, index);
      blocks.push(html);
      index = nextIndex;
      continue;
    }

    const { html, nextIndex } = consumeParagraph(lines, index);
    blocks.push(html);
    index = nextIndex;
  }

  return blocks.join("\n");
}

function renderAboutFromReadme(markdown) {
  const { title, subtitle, sections } = parseReadmeSections(markdown);

  if (aboutTitleEl) {
    aboutTitleEl.textContent = `About ${title}`;
  }
  if (aboutSubtitleEl) {
    aboutSubtitleEl.textContent = subtitle;
  }

  const renderedSections = [];
  for (const sectionName of ABOUT_SECTIONS) {
    const lines = sections.get(sectionName);
    if (!lines || !lines.length) {
      continue;
    }

    renderedSections.push(`
      <section class="section">
        <h2>${escapeHtml(sectionName)}</h2>
        ${renderSectionContent(lines)}
      </section>
    `);
  }

  if (!renderedSections.length) {
    throw new Error("README sections not found for About page.");
  }

  aboutContentEl.innerHTML = renderedSections.join("\n");
  aboutContentEl.classList.remove("hidden");
  aboutStatusEl.classList.add("hidden");
}

function renderLoadFailure(error) {
  const message = error?.message || String(error);
  const localReadmeHref = chrome.runtime.getURL("README.md");
  aboutStatusEl.innerHTML =
    "Could not load About content from README. " +
    `<a href="${localReadmeHref}" target="_blank" rel="noopener noreferrer">Open local README</a>.`;
  aboutStatusEl.title = message;
}

async function initializeAboutContent() {
  try {
    const readmeUrl = chrome.runtime.getURL("README.md");
    const response = await fetch(readmeUrl);
    if (!response.ok) {
      throw new Error(`Failed to load README.md (${response.status}).`);
    }
    const markdown = await response.text();
    renderAboutFromReadme(markdown);
  } catch (error) {
    renderLoadFailure(error);
  }
}

initializeAboutContent();
