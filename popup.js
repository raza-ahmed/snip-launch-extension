const STORAGE_DOMAIN_DESELECTED = "bookmarkDomainDeselectedIds";
const STORAGE_FOLDER_DESELECTED = "bookmarkFolderDeselectedIds";
const STORAGE_OPEN_COUNT = "openRandomTabCount";

const domainList = document.getElementById("domainList");
const bookmarkFolderList = document.getElementById("bookmarkFolderList");
const openCountInput = document.getElementById("openCount");
const openRandom = document.getElementById("openRandom");
const domainSelectAll = document.getElementById("domainSelectAll");
const domainSelectNone = document.getElementById("domainSelectNone");
const folderSelectAll = document.getElementById("folderSelectAll");
const folderSelectNone = document.getElementById("folderSelectNone");

/** @type {string[]} */
let cachedDomains = [];
/** @type {{ id: string, title: string, path: string }[]} */
let cachedFolders = [];

function hostnameFromUrl(url) {
  try {
    const u = new URL(url);
    const h = u.hostname;
    return h || null;
  } catch {
    return null;
  }
}

function walkBookmarkNodes(nodes, parentPath) {
  const urls = [];
  const folders = [];
  for (const n of nodes) {
    if (n.url) {
      urls.push({
        id: n.id,
        title: n.title || "(untitled)",
        url: n.url,
        path: parentPath || "Bookmarks",
      });
    } else if (n.children) {
      const segment = n.title || "(folder)";
      const path = parentPath ? `${parentPath} / ${segment}` : segment;
      if (n.id !== "0") {
        folders.push({ id: n.id, title: segment, path });
      }
      const sub = walkBookmarkNodes(n.children, path);
      urls.push(...sub.urls);
      folders.push(...sub.folders);
    }
  }
  return { urls, folders };
}

function uniqueDomainsFromUrls(urls) {
  const set = new Set();
  for (const u of urls) {
    const h = hostnameFromUrl(u.url);
    if (h) set.add(h);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function loadBookmarkTree() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((tree) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      const { urls, folders } = walkBookmarkNodes(tree, "");
      resolve({ urls, folders });
    });
  });
}

function pruneDeselectedIds(deselected, validIds) {
  const valid = new Set(validIds);
  return deselected.filter((id) => valid.has(id));
}

function getStorageDeselected(key, validIds, callback) {
  chrome.storage.sync.get(key, (data) => {
    const raw = data[key];
    const deselected = Array.isArray(raw) ? pruneDeselectedIds(raw, validIds) : [];
    callback(deselected);
  });
}

function setStorageDeselected(key, deselected, callback) {
  chrome.storage.sync.set({ [key]: deselected }, callback);
}

function renderDomainRows(domains, domainDeselected) {
  domainList.replaceChildren();
  const deselected = new Set(domainDeselected);
  if (!domains.length) {
    const empty = document.createElement("div");
    empty.className = "empty-msg";
    empty.textContent = "No domains found in bookmarks (add http(s) bookmarks).";
    domainList.appendChild(empty);
    return;
  }
  for (const d of domains) {
    const row = document.createElement("div");
    row.className = "check-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `domain-${d.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    cb.checked = !deselected.has(d);
    cb.addEventListener("change", () => {
      const next = new Set(domainDeselected);
      if (cb.checked) {
        next.delete(d);
      } else {
        next.add(d);
      }
      const arr = [...next];
      domainDeselected.length = 0;
      domainDeselected.push(...arr);
      setStorageDeselected(STORAGE_DOMAIN_DESELECTED, arr);
    });
    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = d;
    row.appendChild(cb);
    row.appendChild(label);
    domainList.appendChild(row);
  }
}

function renderFolderRows(folders, folderDeselected) {
  bookmarkFolderList.replaceChildren();
  const deselected = new Set(folderDeselected);
  if (!folders.length) {
    const empty = document.createElement("div");
    empty.className = "empty-msg";
    empty.textContent = "No folders found.";
    bookmarkFolderList.appendChild(empty);
    return;
  }
  for (const f of folders) {
    const row = document.createElement("div");
    row.className = "check-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `folder-${f.id}`;
    cb.checked = !deselected.has(f.id);
    cb.addEventListener("change", () => {
      const next = new Set(folderDeselected);
      if (cb.checked) {
        next.delete(f.id);
      } else {
        next.add(f.id);
      }
      const arr = [...next];
      folderDeselected.length = 0;
      folderDeselected.push(...arr);
      setStorageDeselected(STORAGE_FOLDER_DESELECTED, arr);
    });
    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = f.title;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = f.path;
    label.appendChild(meta);
    row.appendChild(cb);
    row.appendChild(label);
    bookmarkFolderList.appendChild(row);
  }
}

/** @type {string[]} */
let domainDeselectedRef = [];
/** @type {string[]} */
let folderDeselectedRef = [];

async function refreshBookmarks() {
  try {
    const { urls, folders } = await loadBookmarkTree();
    cachedDomains = uniqueDomainsFromUrls(urls);
    cachedFolders = folders;

    const folderIds = folders.map((f) => f.id);

    getStorageDeselected(STORAGE_DOMAIN_DESELECTED, cachedDomains, (d) => {
      domainDeselectedRef = d;
      renderDomainRows(cachedDomains, domainDeselectedRef);
    });
    getStorageDeselected(STORAGE_FOLDER_DESELECTED, folderIds, (d) => {
      folderDeselectedRef = d;
      renderFolderRows(folders, folderDeselectedRef);
    });
  } catch (e) {
    domainList.replaceChildren();
    bookmarkFolderList.replaceChildren();
    const msg = document.createElement("div");
    msg.className = "empty-msg";
    msg.textContent = e.message || String(e);
    domainList.appendChild(msg);
  }
}

domainSelectAll.addEventListener("click", () => {
  setStorageDeselected(STORAGE_DOMAIN_DESELECTED, [], () => {
    domainDeselectedRef = [];
    renderDomainRows(cachedDomains, domainDeselectedRef);
  });
});

domainSelectNone.addEventListener("click", () => {
  const all = [...cachedDomains];
  setStorageDeselected(STORAGE_DOMAIN_DESELECTED, all, () => {
    domainDeselectedRef = [...all];
    renderDomainRows(cachedDomains, domainDeselectedRef);
  });
});

folderSelectAll.addEventListener("click", () => {
  setStorageDeselected(STORAGE_FOLDER_DESELECTED, [], () => {
    folderDeselectedRef = [];
    renderFolderRows(cachedFolders, folderDeselectedRef);
  });
});

folderSelectNone.addEventListener("click", () => {
  const all = cachedFolders.map((f) => f.id);
  setStorageDeselected(STORAGE_FOLDER_DESELECTED, all, () => {
    folderDeselectedRef = [...all];
    renderFolderRows(cachedFolders, folderDeselectedRef);
  });
});

function collectUrlsFromSubTree(nodes, out) {
  for (const n of nodes) {
    if (n.url) {
      out.push(n.url);
    } else if (n.children) {
      collectUrlsFromSubTree(n.children, out);
    }
  }
}

function isOpenableUrl(u) {
  return (
    u &&
    !u.startsWith("javascript:") &&
    (/^https?:\/\//i.test(u) ||
      u.startsWith("chrome://") ||
      u.startsWith("edge://") ||
      u.startsWith("file://"))
  );
}

function parseOpenCount(raw) {
  const n = Math.floor(Number(String(raw).trim()));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(100, n);
}

/** Shuffle copy of `urls` (already unique) and return up to `count` items. */
function pickRandomUniqueUrls(urls, count) {
  if (!urls.length || count < 1) return [];
  const copy = [...urls];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

/**
 * @param {string[]} folderIds
 * @param {Set<string>} allowedHosts
 * @param {(urls: string[] | null) => void} callback
 */
function getMatchingUrlsFromFoldersAndDomains(folderIds, allowedHosts, callback) {
  if (!folderIds.length || !allowedHosts.size) {
    callback(null);
    return;
  }
  const urls = [];
  let pending = folderIds.length;
  if (pending === 0) {
    callback(null);
    return;
  }
  for (const fid of folderIds) {
    chrome.bookmarks.getSubTree(fid, (nodes) => {
      const err = chrome.runtime.lastError;
      if (!err && nodes && nodes[0]) {
        collectUrlsFromSubTree(nodes[0].children || [], urls);
      }
      pending -= 1;
      if (pending === 0) {
        const filtered = [];
        for (const u of urls) {
          if (!isOpenableUrl(u)) continue;
          const host = hostnameFromUrl(u);
          if (host && allowedHosts.has(host)) {
            filtered.push(u);
          }
        }
        const unique = [...new Set(filtered)];
        if (!unique.length) {
          callback(null);
          return;
        }
        callback(unique);
      }
    });
  }
}

openRandom.addEventListener("click", () => {
  const want = parseOpenCount(openCountInput.value);
  openCountInput.value = String(want);
  chrome.storage.sync.set({ [STORAGE_OPEN_COUNT]: want });

  const domainDeselected = new Set(domainDeselectedRef);
  const allowedHosts = new Set(
    cachedDomains.filter((d) => !domainDeselected.has(d))
  );
  if (!allowedHosts.size) {
    alert("Select at least one domain, or use All.");
    return;
  }

  const folderDeselected = new Set(folderDeselectedRef);
  const selectedFolderIds = cachedFolders.map((f) => f.id).filter((id) => !folderDeselected.has(id));
  if (!selectedFolderIds.length) {
    alert("Select at least one folder, or use All.");
    return;
  }

  getMatchingUrlsFromFoldersAndDomains(selectedFolderIds, allowedHosts, (pool) => {
    if (!pool) {
      alert("No links found under the selected folders that match the selected domains.");
      return;
    }
    const picks = pickRandomUniqueUrls(pool, want);
    if (!picks.length) {
      alert("No links found under the selected folders that match the selected domains.");
      return;
    }
    picks.forEach((url, i) => {
      chrome.tabs.create({ url, active: i === 0 });
    });
    if (picks.length < want) {
      alert(
        `Only ${picks.length} unique matching link(s) available; opened that many.`
      );
    }
  });
});

chrome.storage.sync.get(STORAGE_OPEN_COUNT, (data) => {
  const v = data[STORAGE_OPEN_COUNT];
  if (typeof v === "number" && Number.isFinite(v) && v >= 1) {
    openCountInput.value = String(Math.min(100, Math.floor(v)));
  }
});

openCountInput.addEventListener("change", () => {
  const n = parseOpenCount(openCountInput.value);
  openCountInput.value = String(n);
  chrome.storage.sync.set({ [STORAGE_OPEN_COUNT]: n });
});

refreshBookmarks();
