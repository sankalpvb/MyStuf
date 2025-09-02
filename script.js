document.addEventListener('DOMContentLoaded', () => {
    
    // --- ‼️ CONFIGURATION (UNCHANGED) ‼️ ---
    const config = {
        githubUsername: "sankalpvb",
        githubRepo: "MyStuf",
        githubBranch: "main",
        poemsFilePath: "poems.json"
    };
    const adminCredentials = { username: "admin", password: "123" };
    
    // --- ✨ NEW: UI & FEATURE CONFIG ✨ ---
    const POEMS_PER_PAGE = 9; // Number of poems to load at a time
    const POETIC_WORDS = ['दिल', 'इश्क़', 'प्रेम', 'love', 'heart', 'soul'];


    // --- GLOBAL VARIABLES ---
    let allPoems = [];
    let favoritePoemIds = new Set(JSON.parse(localStorage.getItem('favoritePoems')) || []);
    let currentPage = 1;
    let currentFilter = { type: 'all', value: '' }; // { type: 'all'|'tag'|'search'|'favorites', value: '...' }
    let isLoading = false;
    const GITHUB_API_BASE_URL = `https://api.github.com/repos/${config.githubUsername}/${config.githubRepo}/contents/`;
    const POEMS_RAW_URL = `https://raw.githubusercontent.com/${config.githubUsername}/${config.githubRepo}/${config.githubBranch}/${config.poemsFilePath}`;

    // --- PAGE ROUTER ---
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
        setupThemeToggle();
        setupFavorites();
        setupInfiniteScroll();
    }
    
    function initGiftPage() {
        const container = document.getElementById('particle-container');
        if (!container) return;
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 15 + 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 25}s`;
            container.appendChild(particle);
        }
    }

    // --- ✨ NEW & ENHANCED UI FUNCTIONS ✨ ---
    function setupThemeToggle() {
        const checkbox = document.getElementById('theme-checkbox');
        if(!checkbox) return;
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.className = `theme-${currentTheme}`;
        if (currentTheme === 'dark') checkbox.checked = true;

        checkbox.addEventListener('change', () => {
            const theme = checkbox.checked ? 'dark' : 'light';
            document.body.className = `theme-${theme}`;
            localStorage.setItem('theme', theme);
        });
    }

    function setupFavorites() {
        const viewFavoritesBtn = document.getElementById('view-favorites-btn');
        const favoritesCountEl = document.getElementById('favorites-count');
        if(!viewFavoritesBtn || !favoritesCountEl) return;
        
        const updateFavoritesView = () => {
            favoritesCountEl.textContent = favoritePoemIds.size;
            if (currentFilter.type === 'favorites') {
                viewFavoritesBtn.classList.add('active');
            } else {
                viewFavoritesBtn.classList.remove('active');
            }
        };

        viewFavoritesBtn.addEventListener('click', () => {
            if (currentFilter.type === 'favorites') {
                currentFilter = { type: 'all', value: '' };
                document.querySelector('#tag-filters .active')?.classList.remove('active');
                document.querySelector('#tag-filters [data-tag="all"]')?.classList.add('active');
            } else {
                currentFilter = { type: 'favorites', value: '' };
                document.querySelector('#tag-filters .active')?.classList.remove('active');
            }
            applyFiltersAndRender(true);
            updateFavoritesView();
        });

        document.getElementById('poems-grid').addEventListener('click', e => {
            const favoriteBtn = e.target.closest('.favorite-btn');
            if (favoriteBtn) {
                const poemId = favoriteBtn.dataset.id;
                if (favoritePoemIds.has(poemId)) {
                    favoritePoemIds.delete(poemId);
                } else {
                    favoritePoemIds.add(poemId);
                }
                localStorage.setItem('favoritePoems', JSON.stringify(Array.from(favoritePoemIds)));
                favoriteBtn.classList.toggle('favorited', favoritePoemIds.has(poemId));
                updateFavoritesView();

                if (currentFilter.type === 'favorites') {
                    applyFiltersAndRender(true);
                }
            }
        });
        
        updateFavoritesView();
    }
    
    function highlightPoeticWords(text) {
        if (!text) return '';
        const regex = new RegExp(`\\b(${POETIC_WORDS.join('|')})\\b`, 'gi');
        return text.replace(regex, `<span class="highlight">$1</span>`);
    }

    function setupInfiniteScroll() {
        const trigger = document.getElementById('infinite-scroll-trigger');
        if (!trigger) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading) {
                const filteredPoems = getFilteredPoems();
                if (document.querySelectorAll('.poem-card').length < filteredPoems.length) {
                    currentPage++;
                    applyFiltersAndRender(false);
                }
            }
        }, { threshold: 1.0 });
        observer.observe(trigger);
    }
    
    // --- CORE DATA & RENDERING LOGIC ---
    async function fetchPoems() {
        if (allPoems.length > 0) return allPoems;
        try {
            isLoading = true;
            const response = await fetch(`${POEMS_RAW_URL}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Poems file not found.');
            allPoems = (await response.json()).sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
            return allPoems;
        } catch (error) { console.error('Failed to fetch poems:', error); return []; }
        finally { isLoading = false; }
    }

    function getFilteredPoems() {
        let filtered = allPoems;
        if (currentFilter.type === 'tag') {
            filtered = allPoems.filter(p => p.tags && p.tags.includes(currentFilter.value));
        } else if (currentFilter.type === 'search') {
            filtered = allPoems.filter(p => 
                p.title.toLowerCase().includes(currentFilter.value) || 
                p.content.toLowerCase().includes(currentFilter.value)
            );
        } else if (currentFilter.type === 'favorites') {
            filtered = allPoems.filter(p => favoritePoemIds.has(p.id));
        }
        return filtered;
    }

    function applyFiltersAndRender(isNewFilter) {
        if (isNewFilter) currentPage = 1;
        
        const filteredPoems = getFilteredPoems();
        const poemsToRender = filteredPoems.slice(0, currentPage * POEMS_PER_PAGE);
        renderPoems(poemsToRender, isNewFilter);
    }

    function renderPoems(poemsToRender, isNewFilter) {
        const grid = document.getElementById('poems-grid');
        if (!grid) return;
        
        const renderAction = () => {
            if (isNewFilter) grid.innerHTML = '';

            if (poemsToRender.length === 0 && isNewFilter) {
                grid.innerHTML = `<p class="section-subtitle">No poems found.</p>`;
            } else {
                const fragment = document.createDocumentFragment();
                const startIndex = isNewFilter ? 0 : (currentPage - 1) * POEMS_PER_PAGE;
                poemsToRender.slice(startIndex).forEach(poem => fragment.appendChild(createPoemCard(poem)));
                grid.appendChild(fragment);
            }
            setupScrollAnimations();
        };

        if (isNewFilter) {
            grid.style.opacity = 0;
            setTimeout(() => {
                renderAction();
                grid.style.opacity = 1;
            }, 200);
        } else {
            renderAction();
        }
    }

    function createPoemCard(poem) {
        const card = document.createElement('div');
        card.className = 'poem-card';
        const snippet = poem.content.split('\n').slice(0, 3).join('\n');
        const isFavorited = favoritePoemIds.has(poem.id);

        card.innerHTML = `
            <div class="poem-card-header">
                <h3 class="poem-card-title">${poem.title}</h3>
                <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${poem.id}" aria-label="Favorite this poem">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 4.248c-3.148-5.402-12-3.825-12 2.942 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.942z"/></svg>
                </button>
            </div>
            <div class="poem-card-preview">${highlightPoeticWords(snippet)}${poem.content.length > snippet.length ? '...' : ''}</div>
            <a class="read-more-btn" data-id="${poem.id}">Read More</a>`;
        return card;
    }
    
    async function loadAndDisplayPoems() {
        await fetchPoems();
        applyFiltersAndRender(true);
        displayLastUpdated(allPoems);
        setupTagFilter(allPoems);
    }
    
    function setupTagFilter(poems) {
        const container = document.getElementById('tag-filters');
        if (!container) return;
        const tagCounts = {};
        poems.forEach(p => (p.tags || []).forEach(tag => tagCounts[tag] = (tagCounts[tag] || 0) + 1));
        const uniqueTags = Object.keys(tagCounts).sort();

        container.innerHTML = `<button class="tag-button active" data-tag="all">All (${poems.length})</button>`;
        uniqueTags.forEach(tag => container.innerHTML += `<button class="tag-button" data-tag="${tag}">${tag} (${tagCounts[tag]})</button>`);

        container.addEventListener('click', e => {
            if (e.target.classList.contains('tag-button')) {
                container.querySelector('.active')?.classList.remove('active');
                document.getElementById('view-favorites-btn').classList.remove('active');
                e.target.classList.add('active');
                const selectedTag = e.target.dataset.tag;
                currentFilter = selectedTag === 'all' ? { type: 'all', value: '' } : { type: 'tag', value: selectedTag };
                applyFiltersAndRender(true);
            }
        });
    }

    function setupSearch() {
        document.getElementById('search-bar')?.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            currentFilter = { type: 'search', value: searchTerm };
            applyFiltersAndRender(true);
            document.querySelector('#tag-filters .active')?.classList.remove('active');
            document.getElementById('view-favorites-btn').classList.remove('active');
        });
    }

    function setupModal() {
        const modal = document.getElementById('poem-modal');
        const poemsGrid = document.getElementById('poems-grid');
        const closeModalBtn = document.getElementById('close-modal-btn');

        if (!modal || !poemsGrid || !closeModalBtn) return;

        poemsGrid.addEventListener('click', e => {
            if (e.target.classList.contains('read-more-btn')) {
                const poem = allPoems.find(p => p.id === e.target.dataset.id);
                if (poem) {
                    document.getElementById('modal-title').textContent = poem.title;
                    document.getElementById('modal-date').textContent = new Date(poem.lastUpdated).toLocaleDateString();
                    document.getElementById('modal-body').innerHTML = highlightPoeticWords(poem.content.replace(/\n/g, '<br>'));
                    modal.classList.remove('hidden');
                }
            }
        });

        const closeModal = () => modal.classList.add('hidden');
        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    }

    // --- HELPER FUNCTIONS ---
    function displayLastUpdated(poems) {
        const el = document.getElementById('last-updated');
        if (el && poems.length > 0) {
            el.textContent = `Last Updated: ${new Date(poems[0].lastUpdated).toLocaleDateString()}`;
        }
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

    function setupNavbar() {
        const header = document.getElementById('main-header');
        if (header) {
            window.addEventListener('scroll', () => {
                header.classList.toggle('scrolled', window.scrollY > 50);
            });
        }
    }

    // --- ADMIN PAGE LOGIC (UNCHANGED) ---
    function initAdminPage() { const dashboard = document.getElementById('dashboard'); const loginSection = document.getElementById('login-section'); if (sessionStorage.getItem('isAdminAuthenticated')) { dashboard.classList.remove('hidden'); loginSection.classList.add('hidden'); loadAdminDashboard(); } document.getElementById('login-form').addEventListener('submit', handleLogin); document.getElementById('logout-btn')?.addEventListener('click', handleLogout); }
    function handleLogin(e) { e.preventDefault(); const u = document.getElementById('username').value; const p = document.getElementById('password').value; const t = document.getElementById('github-token').value; if (u === adminCredentials.username && p === adminCredentials.password && t) { sessionStorage.setItem('isAdminAuthenticated', 'true'); sessionStorage.setItem('githubToken', t); document.getElementById('dashboard').classList.remove('hidden'); document.getElementById('login-section').classList.add('hidden'); loadAdminDashboard(); } else { document.getElementById('login-error').textContent = 'Invalid credentials or missing token.'; } }
    function handleLogout() { sessionStorage.clear(); window.location.reload(); }
    async function loadAdminDashboard() { const list = document.getElementById('poems-list'); list.innerHTML = `<p>Loading...</p>`; await fetchPoems(true); list.innerHTML = ''; allPoems.forEach(p => { const item = document.createElement('div'); item.className = 'existing-poem-item'; item.innerHTML = `<div><strong>${p.title}</strong><p style="font-size:0.8rem;color:#6b7280;">${(p.tags||[]).join(', ')}</p></div><div class="poem-item-actions"><button class="edit-btn" data-id="${p.id}">Edit</button><button class="delete-btn" data-id="${p.id}">Delete</button></div>`; list.appendChild(item); }); setupAdminEventListeners(); }
    function setupAdminEventListeners() { document.getElementById('poem-form').addEventListener('submit', handleSavePoem); document.getElementById('clear-btn').addEventListener('click', clearForm); document.getElementById('poems-list').addEventListener('click', e => { if (e.target.classList.contains('edit-btn')) handleEditPoem(e.target.dataset.id); if (e.target.classList.contains('delete-btn')) handleDeletePoem(e.target.dataset.id); }); }
    function clearForm() { document.getElementById('poem-form').reset(); document.getElementById('poem-id').value = ''; document.getElementById('form-title').textContent = 'Add New Poem'; }
    function handleEditPoem(id) { const poem = allPoems.find(p => p.id === id); if (poem) { document.getElementById('form-title').textContent = 'Edit Poem'; document.getElementById('poem-id').value = poem.id; document.getElementById('title').value = poem.title; document.getElementById('content').value = poem.content; document.getElementById('tags').value = (poem.tags || []).join(', '); window.scrollTo(0, 0); } }
    async function handleDeletePoem(id) { if (confirm('Are you sure you want to delete this poem?')) { const poemToDelete = allPoems.find(p => p.id === id); const updatedPoems = allPoems.filter(p => p.id !== id); await commitPoemsToGitHub(updatedPoems, `Delete poem: ${poemToDelete.title}`); } }
    async function handleSavePoem(e) { e.preventDefault(); const id = document.getElementById('poem-id').value; const title = document.getElementById('title').value; const content = document.getElementById('content').value; const tags = document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean); const lastUpdated = new Date().toISOString(); let updatedPoems, commitMessage; if (id) { updatedPoems = allPoems.map(p => p.id === id ? { ...p, title, content, tags, lastUpdated } : p); commitMessage = `Update poem: ${title}`; } else { const newPoem = { id: Date.now().toString(), title, content, tags, lastUpdated }; updatedPoems = [newPoem, ...allPoems]; commitMessage = `Add new poem: ${title}`; } await commitPoemsToGitHub(updatedPoems, commitMessage); }
    async function commitPoemsToGitHub(poemsData, commitMessage) { const token = sessionStorage.getItem('githubToken'); if (!token) { alert('Authentication token not found.'); return; } const btn = document.getElementById('save-btn'); btn.disabled = true; btn.textContent = 'Saving...'; try { const url = `${GITHUB_API_BASE_URL}${config.poemsFilePath}`; let sha; try { const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } }); if (res.ok) sha = (await res.json()).sha; } catch (e) { console.warn("Could not get file SHA. This may be the first commit.")} const content = btoa(unescape(encodeURIComponent(JSON.stringify(poemsData, null, 2)))); const body = { message: commitMessage, content, branch: config.githubBranch }; if (sha) body.sha = sha; const commitRes = await fetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }, body: JSON.stringify(body) }); if (!commitRes.ok) throw new Error((await commitRes.json()).message); alert('Success!'); clearForm(); await loadAdminDashboard(); } catch (error) { alert(`Error: ${error.message}`); } finally { btn.disabled = false; btn.textContent = 'Save Poem'; } }
});

