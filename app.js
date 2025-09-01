document.addEventListener('DOMContentLoaded', () => {
    // --- ‼️ IMPORTANT CONFIGURATION ‼️ ---
    // Edit the values below to match your GitHub repository details.
    const config = {
        username: "sankalpvb", // <-- 1. EDIT THIS
        repo: "MyStuf",     // <-- 2. EDIT THIS
        branch: "main",                  // <-- 3. EDIT THIS (usually "main" or "master")
    };
    // -----------------------------------------

    const POEMS_PATH = 'poems.json';
    const poemsUrl = `https://raw.githubusercontent.com/${config.username}/${config.repo}/${config.branch}/${POEMS_PATH}`;

    // --- General Site Logic ---
    const page = window.location.pathname.split("/").pop();

    if (page === 'index.html' || page === '') {
        loadFeaturedPoems();
        handleSurpriseSection();
    } else if (page === 'gift.html') {
        loadAllPoems();
    } else if (page === 'admin.html') {
        handleAdmin();
    }

    async function fetchPoems() {
        try {
            // Add a timestamp to prevent the browser from caching the file
            const response = await fetch(`${poemsUrl}?t=${new Date().getTime()}`);
            if (response.status === 404) {
                console.warn('poems.json not found. It will be created when you save your first poem.');
                return []; // Return an empty array if the file doesn't exist yet
            }
            if (!response.ok) {
                console.error(`Error fetching poems: ${response.statusText}`);
                // Display error to the user on the page if possible
                const listContainer = document.getElementById('poem-list') || document.getElementById('all-poems');
                if(listContainer) listContainer.innerHTML = `<p class="text-red-500">Error: Could not load poems. Check your repository configuration in app.js.</p>`;
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch poems:', error);
            return [];
        }
    }

    function createPoemCard(poem) {
        const card = document.createElement('div');
        card.className = 'poem-card';
        // Sanitize content before displaying it to prevent potential XSS issues
        const safeContent = poem.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
        card.innerHTML = `
            <h3 class="poem-title">${poem.title.replace(/</g, "&lt;")}</h3>
            <p class="poem-date">${poem.date.replace(/</g, "&lt;")}</p>
            <div class="poem-content">${safeContent}</div>
        `;
        return card;
    }

    async function loadFeaturedPoems() {
        const container = document.getElementById('featured-poems');
        if (!container) return;
        container.innerHTML = '<p>Loading poems...</p>';
        const poems = await fetchPoems();
        container.innerHTML = '';
        if (poems.length > 0) {
            poems.slice(0, 3).forEach(poem => container.appendChild(createPoemCard(poem)));
        } else {
            container.innerHTML = '<p>No poems have been published yet.</p>';
        }
    }

    async function loadAllPoems() {
        const container = document.getElementById('all-poems');
        if (!container) return;
        container.innerHTML = '<p>Loading poems...</p>';
        const poems = await fetchPoems();
        container.innerHTML = '';
         if (poems.length > 0) {
            poems.forEach(poem => container.appendChild(createPoemCard(poem)));
        } else {
            container.innerHTML = '<p>No poems have been published yet.</p>';
        }
    }

    function handleSurpriseSection() {
        const section = document.getElementById('surprise-section');
        const blessingEl = document.getElementById('blessing');
        if (!section || !blessingEl) return;
        const blessings = [ "May your heart be a garden of peace.", "Let every breath you take be a prayer of gratitude.", "In the silence of your soul, may you find a universe of love." ];
        section.addEventListener('click', () => {
            const randomIndex = Math.floor(Math.random() * blessings.length);
            blessingEl.textContent = `"${blessings[randomIndex]}"`;
            blessingEl.classList.remove('hidden');
        });
    }

    // --- Admin Panel Logic ---
    function handleAdmin() {
        const tokenSection = document.getElementById('token-section');
        const dashboard = document.getElementById('admin-dashboard');
        const tokenForm = document.getElementById('token-form');
        const logoutBtn = document.getElementById('logout-btn');
        const loginMessage = document.getElementById('login-message');
        let accessToken = '';

        if (sessionStorage.getItem('github_token')) {
            accessToken = sessionStorage.getItem('github_token');
            showDashboard();
        }

        tokenForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const tokenInput = document.getElementById('token').value.trim();
            if (tokenInput) {
                accessToken = tokenInput;
                sessionStorage.setItem('github_token', accessToken);
                showDashboard();
            }
        });

        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('github_token');
            accessToken = '';
            tokenSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
            loginMessage.textContent = "Panel locked.";
        });

        function showDashboard() {
            tokenSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            loadAdminPoemList();
            setupPoemForm();
        }
        
        const poemForm = document.getElementById('poem-form');
        const poemIdInput = document.getElementById('poem-id');
        const titleInput = document.getElementById('title');
        const dateInput = document.getElementById('date');
        const contentInput = document.getElementById('content');
        const formTitle = document.getElementById('form-title');
        const clearBtn = document.getElementById('clear-btn');
        const commitMsg = document.getElementById('commit-message');

        function setupPoemForm() {
            poemForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                setCommitMessage('Saving...', 'text-blue-500');
                const poemData = { id: poemIdInput.value || Date.now().toString(), title: titleInput.value, date: dateInput.value, content: contentInput.value };
                let currentPoems = await fetchPoems();
                const existingIndex = currentPoems.findIndex(p => p.id === poemData.id);
                if (existingIndex > -1) currentPoems[existingIndex] = poemData;
                else currentPoems.unshift(poemData);
                const success = await updatePoemsOnGitHub(currentPoems);
                if (success) {
                    setCommitMessage('Poem saved successfully!', 'text-green-500');
                    await loadAdminPoemList(); // Use await to ensure list is reloaded
                    clearPoemForm();
                }
            });
            clearBtn.addEventListener('click', clearPoemForm);
        }
        
        function setCommitMessage(message, colorClass) {
            commitMsg.textContent = message;
            commitMsg.className = `text-center my-4 ${colorClass}`;
            setTimeout(() => { if (commitMsg.textContent === message) commitMsg.textContent = ''; }, 5000);
        }

        function clearPoemForm() {
            poemForm.reset();
            poemIdInput.value = '';
            formTitle.textContent = 'Add a New Poem';
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        async function loadAdminPoemList() {
            const listContainer = document.getElementById('poem-list');
            listContainer.innerHTML = '<p>Loading poems...</p>';
            let poems = await fetchPoems();
            listContainer.innerHTML = '';
            if (poems.length === 0) {
                listContainer.innerHTML = '<p>No poems found. Add your first one using the form above!</p>';
                return;
            }
            poems.forEach(poem => {
                const poemEl = document.createElement('div');
                poemEl.className = 'flex justify-between items-center p-3 bg-gray-100 rounded';
                poemEl.innerHTML = `<div><p class="font-bold">${poem.title.replace(/</g, "&lt;")}</p><p class="text-sm text-gray-600">${poem.date}</p></div><div><button class="edit-btn text-blue-500 hover:underline mr-4" data-id="${poem.id}">Edit</button><button class="delete-btn text-red-500 hover:underline" data-id="${poem.id}">Delete</button></div>`;
                listContainer.appendChild(poemEl);
            });
            listContainer.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
                const poemToEdit = poems.find(p => p.id === e.target.dataset.id);
                if (poemToEdit) {
                    poemIdInput.value = poemToEdit.id;
                    titleInput.value = poemToEdit.title;
                    dateInput.value = poemToEdit.date;
                    contentInput.value = poemToEdit.content;
                    formTitle.textContent = 'Edit Poem';
                    window.scrollTo(0, 0);
                }
            }));
            listContainer.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                if (!confirm('Are you sure you want to delete this poem?')) return;
                setCommitMessage('Deleting...', 'text-blue-500');
                const idToDelete = e.target.dataset.id;
                let currentPoems = await fetchPoems();
                const updatedPoems = currentPoems.filter(p => p.id !== idToDelete);
                const success = await updatePoemsOnGitHub(updatedPoems);
                if (success) {
                    setCommitMessage('Poem deleted successfully!', 'text-green-500');
                    await loadAdminPoemList(); // Use await to ensure list is reloaded
                }
            }));
        }
        
        const API_URL = 'https://api.github.com';

        async function githubApiRequest(url, options = {}) {
            const response = await fetch(url, { ...options, headers: { 'Authorization': `token ${accessToken}`, 'Accept': 'application/vnd.github.v3+json', ...options.headers } });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.message || `HTTP error! Status: ${response.status}`;
                setCommitMessage(`GitHub Error: ${errorMessage}`, 'text-red-500');
                throw new Error(errorMessage);
            }
            return response.status === 204 ? null : response.json();
        }
        
        async function getFileSha(path) {
            const url = `${API_URL}/repos/${config.username}/${config.repo}/contents/${path}?ref=${config.branch}`;
            try {
                const data = await githubApiRequest(url);
                return data.sha;
            } catch (error) {
                if (error.message.includes("Not Found")) return null;
                throw error;
            }
        }
        
        async function updatePoemsOnGitHub(poems) {
            const url = `${API_URL}/repos/${config.username}/${config.repo}/contents/${POEMS_PATH}`;
            const content = JSON.stringify(poems, null, 2);
            try {
                const sha = await getFileSha(POEMS_PATH);
                const body = { message: `Update poems: ${new Date().toISOString()}`, content: btoa(unescape(encodeURIComponent(content))), branch: config.branch };
                if (sha) body.sha = sha;
                await githubApiRequest(url, { method: 'PUT', body: JSON.stringify(body) });
                // After a successful update, we need to wait a moment for GitHub's cache to clear
                await new Promise(resolve => setTimeout(resolve, 2000));
                return true;
            } catch (error) {
                return false;
            }
        }
    }
});

