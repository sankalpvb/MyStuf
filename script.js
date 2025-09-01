document.addEventListener('DOMContentLoaded', () => {
    
    // --- ‼️ CONFIGURATION ‼️ ---
    // This configuration remains untouched, as requested.
    const config = {
        githubUsername: "sankalpvb",
        githubRepo: "MyStuf",
        githubBranch: "main",
        poemsFilePath: "poems.json"
    };

    const adminCredentials = {
        username: "sankalp",
        password: "prachi"
    };
    // ----------------------------


    // --- Global Variables ---
    let allPoems = [];
    const GITHUB_API_BASE_URL = `https://api.github.com/repos/${config.githubUsername}/${config.githubRepo}/contents/`;
    const POEMS_RAW_URL = `https://raw.githubusercontent.com/${config.githubUsername}/${config.githubRepo}/${config.githubBranch}/${config.poemsFilePath}`;

    // --- Page Router ---
    const page = window.location.pathname.split("/").pop();
    if (page === 'index.html' || page === '' || page === 'MyStuf') {
        initIndexPage();
    } else if (page === 'gift.html') {
        initGiftPage();
    } else if (page === 'admin.html') {
        initAdminPage();
    }

    // --- INITIALIZATION ---
    function initIndexPage() {
        setupNavbar();
        loadAndDisplayPoems();
        setupSearch();
        setupModal();
    }
    
    function initGiftPage() {
        createParticles();
    }

    function initAdminPage() {
        const dashboard = document.getElementById('dashboard');
        const loginSection = document.getElementById('login-section');

        if (sessionStorage.getItem('isAdminAuthenticated')) {
            dashboard.classList.remove('hidden');
            loginSection.classList.add('hidden');
            loadAdminDashboard();
        }

        document.getElementById('login-form').addEventListener('submit', handleLogin);
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    }
    
    // --- ✨ NEW & ENHANCED UI FUNCTIONS ✨ ---
    function createParticles() {
        const container = document.getElementById('particle-container');
        if (!container) return;
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 3 + 1;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}vw`;
            particle.style.animationDuration = `${Math.random() * 15 + 10}s`;
            particle.style.animationDelay = `${Math.random() * 10}s`;
            container.appendChild(particle);
        }
    }
    
    function setupNavbar() {
        const header = document.getElementById('main-header');
        if (!header) return;
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
    
    function setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.poem-card:not(.is-visible)').forEach(card => {
            observer.observe(card);
        });
    }
    
    // --- CORE LOGIC (UNCHANGED, BUT WITH ADDITIONS) ---
    async function fetchPoems(forceRefetch = false) {
        if (allPoems.length > 0 && !forceRefetch) return allPoems;
        try {
            const response = await fetch(`${POEMS_RAW_URL}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Poems file not found.');
            allPoems = (await response.json()).sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
            return allPoems;
        } catch (error) { console.error('Failed to fetch poems:', error); return []; }
    }

    function renderPoems(poemsToRender) {
        const grid = document.getElementById('poems-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (poemsToRender.length === 0) {
            grid.innerHTML = `<p class="section-subtitle">No poems found.</p>`;
            return;
        }
        poemsToRender.forEach(poem => {
            const card = document.createElement('div');
            card.className = 'poem-card';
            const snippet = poem.content.split('\n').slice(0, 4).join('\n');
            card.innerHTML = `
                <h3>${poem.title}</h3>
                <p>${snippet}${poem.content.length > snippet.length ? '...' : ''}</p>
                <a class="read-more-btn" data-id="${poem.id}">Read More</a>`;
            grid.appendChild(card);
        });
        setupScrollAnimations();
    }

    async function loadAndDisplayPoems() {
        const poems = await fetchPoems();
        renderPoems(poems);
        displayLastUpdated(poems);
        setupTagFilter(poems); // ✨ Setup tags after poems are loaded
    }
    
    function displayLastUpdated(poems) {
        const el = document.getElementById('last-updated');
        if (!el || poems.length === 0) return;
        const mostRecentDate = new Date(poems[0].lastUpdated);
        el.textContent = `Last Updated: ${mostRecentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
    
    // ✨ NEW: Poem Tag Filter Logic
    function setupTagFilter(poems) {
        const container = document.getElementById('tag-filters');
        if (!container) return;
        const tags = [...new Set(poems.flatMap(p => p.tags || []))];
        container.innerHTML = `<button class="tag-button active" data-tag="all">All</button>`;
        tags.forEach(tag => {
            container.innerHTML += `<button class="tag-button" data-tag="${tag}">${tag}</button>`;
        });

        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-button')) {
                container.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                const selectedTag = e.target.dataset.tag;
                const filteredPoems = selectedTag === 'all' 
                    ? allPoems 
                    : allPoems.filter(p => p.tags && p.tags.includes(selectedTag));
                renderPoems(filteredPoems);
            }
        });
    }

    function setupSearch() {
        document.getElementById('search-bar')?.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredPoems = allPoems.filter(p => 
                p.title.toLowerCase().includes(searchTerm) || 
                p.content.toLowerCase().includes(searchTerm)
            );
            renderPoems(filteredPoems);
            // Deactivate tag filter when searching
            const activeTag = document.querySelector('#tag-filters .active');
            if(activeTag) activeTag.classList.remove('active');
        });
    }

    function setupModal() {
        const modal = document.getElementById('poem-modal');
        document.getElementById('poems-grid')?.addEventListener('click', e => {
            if (e.target.classList.contains('read-more-btn')) {
                const poem = allPoems.find(p => p.id === e.target.dataset.id);
                if (poem) {
                    document.getElementById('modal-title').textContent = poem.title;
                    document.getElementById('modal-date').textContent = new Date(poem.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    document.getElementById('modal-body').textContent = poem.content;
                    modal.classList.remove('hidden');
                }
            }
        });
        document.getElementById('close-modal-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
        modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    }

    // --- ADMIN LOGIC (UNCHANGED FUNCTIONALITY, ADDED TAGS SUPPORT) ---
    function handleLogin(e) { /* Unchanged */ }
    function handleLogout() { /* Unchanged */ }
    async function loadAdminDashboard() { /* Unchanged */ }
    function setupAdminEventListeners() { /* Unchanged */ }
    function clearForm() { /* Unchanged */ }
    
    function handleEditPoem(id) {
        const poem = allPoems.find(p => p.id === id);
        if (poem) {
            document.getElementById('form-title').textContent = 'Edit Poem';
            document.getElementById('poem-id').value = poem.id;
            document.getElementById('title').value = poem.title;
            document.getElementById('content').value = poem.content;
            document.getElementById('tags').value = (poem.tags || []).join(', '); // ✨ Edit tags
            window.scrollTo(0, 0);
        }
    }

    async function handleDeletePoem(id) { /* Unchanged */ }
    
    async function handleSavePoem(e) {
        e.preventDefault();
        const id = document.getElementById('poem-id').value;
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean); // ✨ Save tags
        const lastUpdated = new Date().toISOString();
        let updatedPoems, commitMessage;

        if (id) {
            updatedPoems = allPoems.map(p => p.id === id ? { ...p, title, content, tags, lastUpdated } : p);
            commitMessage = `Update poem: ${title}`;
        } else {
            const newPoem = { id: Date.now().toString(), title, content, tags, lastUpdated };
            updatedPoems = [newPoem, ...allPoems];
            commitMessage = `Add new poem: ${title}`;
        }
        await commitPoemsToGitHub(updatedPoems, commitMessage);
    }
    async function commitPoemsToGitHub(poemsData, commitMessage) { /* Unchanged */ }
    
    // --- Helper stubs for unchanged functions ---
    function handleLogin(e) { e.preventDefault(); const u = document.getElementById('username').value, p = document.getElementById('password').value, t = document.getElementById('github-token').value; if (u === adminCredentials.username && p === adminCredentials.password && t) { sessionStorage.setItem('isAdminAuthenticated', 'true'); sessionStorage.setItem('githubToken', t); document.getElementById('dashboard').classList.remove('hidden'); document.getElementById('login-section').classList.add('hidden'); loadAdminDashboard(); } else { document.getElementById('login-error').textContent = 'Invalid credentials or missing token.'; } }
    function handleLogout() { sessionStorage.clear(); window.location.reload(); }
    async function loadAdminDashboard() { const list = document.getElementById('poems-list'); list.innerHTML = `<p>Loading...</p>`; const poems = await fetchPoems(true); list.innerHTML = ''; poems.forEach(p => { const item = document.createElement('div'); item.className = 'existing-poem-item'; item.innerHTML = `<div><strong>${p.title}</strong><p style="font-size:0.8rem;color:#6b7280;">${(p.tags||[]).join(', ')}</p></div><div class="poem-item-actions"><button class="edit-btn" data-id="${p.id}">Edit</button><button class="delete-btn" data-id="${p.id}">Delete</button></div>`; list.appendChild(item); }); setupAdminEventListeners(); }
    function setupAdminEventListeners() { document.getElementById('poem-form').addEventListener('submit', handleSavePoem); document.getElementById('clear-btn').addEventListener('click', clearForm); document.getElementById('poems-list').addEventListener('click', e => { if (e.target.classList.contains('edit-btn')) handleEditPoem(e.target.dataset.id); if (e.target.classList.contains('delete-btn')) handleDeletePoem(e.target.dataset.id); }); }
    function clearForm() { document.getElementById('poem-form').reset(); document.getElementById('poem-id').value = ''; document.getElementById('form-title').textContent = 'Add New Poem'; }
    async function handleDeletePoem(id) { if (confirm('Are you sure?')) { const p = allPoems.find(p=>p.id===id); const updated = allPoems.filter(p => p.id !== id); await commitPoemsToGitHub(updated, `Delete poem: ${p.title}`); } }
    async function commitPoemsToGitHub(poemsData, commitMessage) { const token = sessionStorage.getItem('githubToken'); if (!token) return; const btn = document.getElementById('save-btn'); btn.disabled = true; btn.textContent = 'Saving...'; try { const url = `${GITHUB_API_BASE_URL}${config.poemsFilePath}`; let sha; const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } }); if (res.ok) sha = (await res.json()).sha; const content = btoa(unescape(encodeURIComponent(JSON.stringify(poemsData, null, 2)))); const body = { message: commitMessage, content, branch: config.githubBranch }; if (sha) body.sha = sha; const commitRes = await fetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}` }, body: JSON.stringify(body) }); if (!commitRes.ok) throw new Error((await commitRes.json()).message); alert('Success!'); clearForm(); await loadAdminDashboard(); } catch (error) { alert(`Error: ${error.message}`); } finally { btn.disabled = false; btn.textContent = 'Save Poem'; } }
});

