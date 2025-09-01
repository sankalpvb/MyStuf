/**
 * Main application logic for the poetry website.
 * Version 2.1: Combined config and app logic to prevent race conditions on live servers.
 * Includes enhanced error handling, UI feedback, and state management.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- ‼️ IMPORTANT CONFIGURATION ‼️ ---
    // This object now lives directly inside app.js.
    // Edit the values below to match your GitHub repository details.
    const config = {
        // Your GitHub username.
        username: "sankalpvb",

        // The name of the repository where your poems.json is stored.
        repo: "MyStuf",

        // The branch where your poems.json is stored (usually "main" or "master").
        branch: "main",
    };
    // -----------------------------------------

    const GITHUB_API_URL = `https://api.github.com/repos/${config.username}/${config.repo}/contents/poems.json`;
    const POEMS_RAW_URL = `https://raw.githubusercontent.com/${config.username}/${config.repo}/${config.branch}/poems.json`;

    // Global state to hold poems and avoid re-fetching within a single page load
    let allPoems = [];

    // --- Page-specific initializers ---
    const page = window.location.pathname.split("/").pop();

    if (page === 'index.html' || page === '' || page === 'MyStuf') {
        initHomePage();
    } else if (page === 'gift.html') {
        initGiftPage();
    } else if (page === 'admin.html') {
        initAdminPage();
    }

    // --- DATA FETCHING ---
    async function fetchPoems(forceRefetch = false) {
        if (forceRefetch) {
            allPoems = [];
        }
        if (allPoems.length > 0) {
            return allPoems;
        }
        try {
            const response = await fetch(`${POEMS_RAW_URL}?t=${new Date().getTime()}`);
            if (response.status === 404) {
                console.warn("poems.json not found. It will be created when you save the first poem.");
                return [];
            }
            if (!response.ok) {
                throw new Error(`Could not load poems. Status: ${response.status}`);
            }
            allPoems = await response.json();
            return allPoems;
        } catch (error) {
            console.error("Error fetching poems:", error);
            const poemsGrid = document.getElementById('poems-grid');
            if (poemsGrid) {
                poemsGrid.innerHTML = `<p class="feedback-error" style="text-align: center;">Error: Could not load poems. Please check the repository configuration at the top of app.js.</p>`;
            }
            return [];
        }
    }


    // --- HOME PAGE LOGIC ---
    function initHomePage() {
        const surpriseSection = document.getElementById('surprise-section');
        const blessingEl = document.getElementById('blessing');
        const placeholderEl = document.getElementById('blessing-placeholder');

        if (!surpriseSection) return;

        const blessings = [
            "May your heart be a quiet garden.",
            "Let every breath be a prayer of gratitude.",
            "In the silence of your soul, find a universe of love.",
            "Walk with a light spirit, for you are made of stardust.",
            "May kindness be the ink with which you write your story."
        ];

        surpriseSection.addEventListener('click', () => {
            const randomIndex = Math.floor(Math.random() * blessings.length);
            blessingEl.textContent = `"${blessings[randomIndex]}"`;
            placeholderEl.classList.add('hidden');
            blessingEl.classList.remove('hidden');
        });
    }


    // --- GIFT PAGE LOGIC ---
    async function initGiftPage() {
        await renderPoems();
        await setupFiltering();
    }
    
    function sanitizeHTML(str) {
        if (!str) return "";
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    async function renderPoems(searchTerm = '', activeTags = []) {
        const poemsGrid = document.getElementById('poems-grid');
        if (!poemsGrid) return;
        poemsGrid.innerHTML = '<p style="text-align: center;">Loading poems...</p>';
        const poems = await fetchPoems();

        let filteredPoems = poems;

        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filteredPoems = filteredPoems.filter(poem =>
                poem.title.toLowerCase().includes(lowerCaseSearch) ||
                poem.content.toLowerCase().includes(lowerCaseSearch)
            );
        }

        if (activeTags.length > 0) {
            filteredPoems = filteredPoems.filter(poem =>
                poem.tags && activeTags.every(tag => poem.tags.includes(tag))
            );
        }

        poemsGrid.innerHTML = '';
        if (filteredPoems.length === 0) {
            poemsGrid.innerHTML = '<p style="text-align: center;">No poems found that match your criteria.</p>';
        } else {
            filteredPoems.forEach(poem => {
                const card = document.createElement('div');
                card.className = 'poem-card';
                const snippet = poem.content.split(' ').slice(0, 15).join(' ') + '...';
                card.innerHTML = `
                    <h3 class="poem-title">${sanitizeHTML(poem.title)}</h3>
                    <p class="poem-snippet">${sanitizeHTML(snippet)}</p>
                    <a href="#" class="read-more-btn" data-id="${poem.id}">Read More</a>
                `;
                card.querySelector('.read-more-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    openPoemModal(poem.id);
                });
                poemsGrid.appendChild(card);
            });
        }
    }

    async function setupFiltering() {
        const searchInput = document.getElementById('search-input');
        const tagFiltersContainer = document.getElementById('tag-filters');
        if (!searchInput) return;

        const poems = await fetchPoems();

        const allTags = new Set(poems.flatMap(p => p.tags || []));
        tagFiltersContainer.innerHTML = '<button class="tag-filter active" data-tag="all">All</button>';
        allTags.forEach(tag => {
            if(!tag) return;
            const button = document.createElement('button');
            button.className = 'tag-filter';
            button.dataset.tag = tag;
            button.textContent = tag;
            tagFiltersContainer.appendChild(button);
        });

        const applyFilters = () => {
            const searchTerm = searchInput.value;
            const activeTagEls = tagFiltersContainer.querySelectorAll('.tag-filter.active');
            let activeTags = Array.from(activeTagEls).map(el => el.dataset.tag);
            if (activeTags.includes('all')) {
                activeTags = [];
            }
            renderPoems(searchTerm, activeTags);
        };

        searchInput.addEventListener('input', applyFilters);

        tagFiltersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-filter')) {
                const clickedTag = e.target.dataset.tag;
                if (clickedTag === 'all') {
                    tagFiltersContainer.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                } else {
                    tagFiltersContainer.querySelector('[data-tag="all"]').classList.remove('active');
                    e.target.classList.toggle('active');
                }
                if (tagFiltersContainer.querySelectorAll('.tag-filter.active').length === 0) {
                    tagFiltersContainer.querySelector('[data-tag="all"]').classList.add('active');
                }
                applyFilters();
            }
        });
    }

    function openPoemModal(poemId) {
        const poem = allPoems.find(p => p.id.toString() === poemId.toString());
        if (!poem) return;

        document.getElementById('modal-title').textContent = poem.title;
        document.getElementById('modal-date').textContent = new Date(poem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('modal-content').innerHTML = sanitizeHTML(poem.content).replace(/\n/g, '<br>');
        
        const tagsContainer = document.getElementById('modal-tags');
        tagsContainer.innerHTML = '';
        if (poem.tags && poem.tags.length > 0) {
            poem.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tag;
                tagsContainer.appendChild(tagEl);
            });
        }
        
        document.getElementById('poem-modal').classList.remove('hidden');
    }

    const modal = document.getElementById('poem-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'poem-modal' || e.target.id === 'close-modal') {
                modal.classList.add('hidden');
            }
        });
    }

    // --- ADMIN PAGE LOGIC ---
    function initAdminPage() {
        const unlockBtn = document.getElementById('unlock-btn');
        const tokenInput = document.getElementById('github-token-input');

        unlockBtn.addEventListener('click', () => {
            const token = tokenInput.value.trim();
            if (token) {
                sessionStorage.setItem('github_token', token);
                document.getElementById('secure-gate').classList.add('hidden');
                document.getElementById('admin-dashboard').classList.remove('hidden');
                loadAdminData(token);
            } else {
                showFeedback("Please enter a token.", true);
            }
        });

        const storedToken = sessionStorage.getItem('github_token');
        if (storedToken) {
            tokenInput.value = storedToken;
            unlockBtn.click();
        }
    }
    
    async function loadAdminData(token) {
        setupAdminForm(token);
        await renderAdminPoemList(token);
    }
    
    function setupAdminForm(token) {
        const form = document.getElementById('poem-form');
        const clearBtn = document.getElementById('clear-form-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('poem-id').value;
            const newPoem = {
                id: id || Date.now().toString(),
                title: document.getElementById('title').value,
                content: document.getElementById('content').value,
                tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
                date: new Date().toISOString()
            };
            
            if(id) {
                const originalPoem = allPoems.find(p => p.id === id);
                if (originalPoem) newPoem.date = originalPoem.date;
            }
            await savePoem(newPoem, token);
        });
        
        clearBtn.addEventListener('click', () => resetForm());
    }
    
    function resetForm() {
        document.getElementById('poem-form').reset();
        document.getElementById('poem-id').value = '';
        document.getElementById('form-title').textContent = 'Add a New Poem';
    }
    
    async function renderAdminPoemList(token) {
        const listContainer = document.getElementById('existing-poems-list');
        listContainer.innerHTML = '<p>Loading poems...</p>';
        const poems = await fetchPoems(true); // Force refetch

        listContainer.innerHTML = '';
        if (poems.length === 0) {
            listContainer.innerHTML = '<p>No poems yet. Add one above!</p>';
            return;
        }

        poems.forEach(poem => {
            const item = document.createElement('div');
            item.className = 'existing-poem-item';
            item.innerHTML = `
                <div>
                    <strong>${sanitizeHTML(poem.title)}</strong>
                    <br>
                    <small>${new Date(poem.date).toLocaleDateString()}</small>
                </div>
                <div class="poem-item-actions">
                    <button class="edit-btn" data-id="${poem.id}">Edit</button>
                    <button class="delete-btn" data-id="${poem.id}">Delete</button>
                </div>
            `;
            listContainer.appendChild(item);
        });

        listContainer.addEventListener('click', async (e) => {
            const poemId = e.target.dataset.id;
            if (e.target.classList.contains('edit-btn')) {
                const poem = allPoems.find(p => p.id === poemId);
                if (poem) {
                    document.getElementById('form-title').textContent = 'Edit Poem';
                    document.getElementById('poem-id').value = poem.id;
                    document.getElementById('title').value = poem.title;
                    document.getElementById('content').value = poem.content;
                    document.getElementById('tags').value = (poem.tags || []).join(', ');
                    window.scrollTo(0,0);
                }
            }
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this poem?')) {
                    await deletePoem(poemId, token);
                }
            }
        });
    }

    function showFeedback(message, isError = false) {
        const feedbackEl = document.getElementById('feedback-message');
        if (!feedbackEl) return;
        feedbackEl.textContent = message;
        feedbackEl.className = 'feedback-message';
        feedbackEl.classList.add(isError ? 'feedback-error' : 'feedback-success');
        feedbackEl.classList.remove('hidden');

        setTimeout(() => {
            feedbackEl.classList.add('hidden');
        }, 4000);
    }

    function setFormBusy(isBusy) {
        const saveButton = document.querySelector('#poem-form button[type="submit"]');
        const clearButton = document.getElementById('clear-form-btn');
        if (!saveButton) return;
        
        if (isBusy) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            clearButton.disabled = true;
        } else {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Poem';
            clearButton.disabled = false;
        }
    }

    // --- GITHUB API LOGIC ---
    async function commitPoemsToGitHub(poemsData, token, commitMessage) {
        setFormBusy(true);
        try {
            const fileResponse = await fetch(GITHUB_API_URL, { headers: { 'Authorization': `token ${token}` } });
            if (!fileResponse.ok && fileResponse.status !== 404) {
                 throw new Error(`GitHub API (SHA fetch): ${fileResponse.statusText}`);
            }
            const fileData = fileResponse.status === 404 ? {} : await fileResponse.json();
            const sha = fileData.sha;

            const content = JSON.stringify(poemsData, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(content)));

            const body = { message: commitMessage, content: encodedContent, branch: config.branch };
            if (sha) body.sha = sha;

            const commitResponse = await fetch(GITHUB_API_URL, {
                method: 'PUT',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!commitResponse.ok) {
                const errorData = await commitResponse.json();
                throw new Error(`GitHub commit failed: ${errorData.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        } catch (error) {
            console.error("Error committing to GitHub:", error);
            showFeedback(error.message, true);
            return false;
        } finally {
            setFormBusy(false);
        }
    }
    
    async function savePoem(poemData, token) {
        let poems = await fetchPoems();
        const existingIndex = poems.findIndex(p => p.id === poemData.id);
        
        let commitMessage;
        if (existingIndex > -1) {
            poems[existingIndex] = poemData;
            commitMessage = `Update poem: ${poemData.title}`;
        } else {
            poems.unshift(poemData);
            commitMessage = `Add new poem: ${poemData.title}`;
        }
        
        const success = await commitPoemsToGitHub(poems, token, commitMessage);
        if (success) {
            showFeedback('Poem saved successfully!');
            resetForm();
            await renderAdminPoemList(token);
        }
    }

    async function deletePoem(poemId, token) {
        let poems = await fetchPoems();
        const poemToDelete = poems.find(p => p.id === poemId);
        if (!poemToDelete) return;

        const updatedPoems = poems.filter(p => p.id !== poemId);
        
        const commitMessage = `Delete poem: ${poemToDelete.title}`;
        const success = await commitPoemsToGitHub(updatedPoems, token, commitMessage);
        if (success) {
            showFeedback('Poem deleted successfully!');
            await renderAdminPoemList(token);
        }
    }
});

