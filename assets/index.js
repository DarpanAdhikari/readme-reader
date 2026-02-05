// --- State ---
let files = [
    {
        name: 'Welcome.md',
        html: `
<h1>Welcome to Document Reader</h1>
<p>This is a study-focused viewer. We have hidden the code editor to help you focus.</p>
<h2>How to Highlight?</h2>
<p>1. <strong>Select any text</strong> with your mouse.</p>
<p>2. A floating menu will appear.</p>
<p>3. Pick a color to <span class="highlight-yellow">highlight the text</span> instantly.</p>
<h2>Math & Code Support</h2>
<pre><code class="language-python">def study_hard():
return "Success"</code></pre>
<p>Math equation: $$E = mc^2$$</p>
`
    }
];
let activeIndex = 0;

const reader = document.getElementById('reader');
const tabBar = document.getElementById('tab-bar');
const menu = document.getElementById('highlight-menu');

// --- Init ---
function init() {
    renderTabs();
    loadActiveFile();

    // Setup Highlight Menu Listeners
    document.addEventListener('selectionchange', handleSelection);
    
    // Prevent typing but allow selection/shortcuts
    reader.addEventListener('keydown', (e) => {
        // Allow Copy (Ctrl+C), Select All (Ctrl+A)
        if ((e.ctrlKey || e.metaKey) && ['c', 'a', 'x'].includes(e.key.toLowerCase())) {
            return;
        }
        // Block typing content
        e.preventDefault();
    });

    // Save state on modification
    reader.addEventListener('input', () => {
        files[activeIndex].html = reader.innerHTML;
    });
}

// --- File & Tab System ---
function renderTabs() {
    tabBar.innerHTML = '';
    files.forEach((file, index) => {
        const tab = document.createElement('div');
        tab.className = `tab ${index === activeIndex ? 'active' : ''}`;
        tab.innerHTML = `${file.name} <span class="close-tab" onclick="closeTab(event, ${index})">×</span>`;
        tab.onclick = (e) => {
            if(!e.target.classList.contains('close-tab')) switchTab(index);
        };
        tabBar.appendChild(tab);
    });
}

function switchTab(index) {
    // Save current work before switching
    files[activeIndex].html = reader.innerHTML;
    
    activeIndex = index;
    renderTabs();
    loadActiveFile();
}

function closeTab(e, index) {
    e.stopPropagation();
    if (files.length === 1) return alert("Keep at least one file open.");
    files.splice(index, 1);
    if (activeIndex >= files.length) activeIndex = files.length - 1;
    renderTabs();
    loadActiveFile();
}

function loadActiveFile() {
    reader.innerHTML = files[activeIndex].html;
    renderMathInElement(reader, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ]
    });
    hljs.highlightAll();
}

function handleFileUpload(input) {
    const uploadedFiles = Array.from(input.files);
    if (uploadedFiles.length === 0) return;

    let loadedCount = 0;
    uploadedFiles.forEach(file => {
        const r = new FileReader();
        r.onload = (e) => {
            // Convert MD to HTML immediately upon upload
            const rawHtml = marked.parse(e.target.result);
            files.push({ name: file.name, html: rawHtml });
            loadedCount++;
            if (loadedCount === uploadedFiles.length) {
                switchTab(files.length - uploadedFiles.length);
            }
        };
        r.readAsText(file);
    });
    input.value = '';
}

// --- Highlight Logic ---
function handleSelection() {
    const selection = window.getSelection();
    
    // 1. Basic check if selection is valid and inside reader
    if (selection.isCollapsed || !reader.contains(selection.anchorNode)) {
        menu.style.display = 'none';
        return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 2. Position Menu above selection
    menu.style.display = 'flex';
    menu.style.top = `${rect.top + window.scrollY - 50}px`;
    menu.style.left = `${rect.left + (rect.width / 2) - (menu.offsetWidth / 2)}px`;
}

function applyHighlight(className, event) {
    event.preventDefault(); // Stop menu from stealing focus
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    // We use span wrapping for highlights
    // Note: execCommand is deprecated but handles cross-block highlighting 
    // much better than custom Range logic for this scale of app.
    // Alternatively, we use a span wrapper.
    
    const range = selection.getRangeAt(0);
    
    // Create a span
    const span = document.createElement("span");
    span.className = className;
    
    try {
        // simple case: inside one node
        range.surroundContents(span);
    } catch (e) {
        // complex case: selection spans multiple paragraphs
        // Fallback to execCommand for robust cross-block handling
        document.designMode = "on";
        // We use backColor as a proxy then switch class, 
        // but simpler is just using inline style for robustness here
        const colorMap = {
            'highlight-yellow': '#fde047',
            'highlight-green': '#86efac',
            'highlight-blue': '#93c5fd',
            'highlight-pink': '#f9a8d4'
        };
        document.execCommand("hiliteColor", false, colorMap[className]);
        document.designMode = "off";
    }
    
    // Clear selection after highlight
    selection.removeAllRanges();
    menu.style.display = 'none';
    
    // Save state
    files[activeIndex].html = reader.innerHTML;
}

function removeHighlight(event) {
    event.preventDefault();
    document.designMode = "on";
    document.execCommand("removeFormat", false, null);
    document.designMode = "off";
    menu.style.display = 'none';
    files[activeIndex].html = reader.innerHTML;
}

function exportHTML() {
    // Save state first
    files[activeIndex].html = reader.innerHTML;
    
    const content = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${files[activeIndex].name}</title>
<style>
body{font-family:sans-serif;max-width:800px;margin:2rem auto;line-height:1.6;color:#333}
.highlight-yellow{background:#fde047} .highlight-green{background:#86efac}
.highlight-blue{background:#93c5fd} .highlight-pink{background:#f9a8d4}
blockquote{border-left:4px solid #ccc;padding-left:1em;color:#666}
pre{background:#f4f4f4;padding:1em;border-radius:5px;overflow-x:auto}
img{max-width:100%}
</style>
</head>
<body>
${files[activeIndex].html}
</body>
</html>`;

    const blob = new Blob([content], {type: 'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = files[activeIndex].name.replace('.md', '.html');
    a.click();
}

init();