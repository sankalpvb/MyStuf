document.addEventListener('DOMContentLoaded', () => {
    const POEMS_PATH = 'poems.json';

    // --- General Site Logic ---
    const page = window.location.pathname.split("/").pop();

    if (page === 'index.html' || page === '') {
        loadFeaturedPoems();
        handleSurpriseSection();
    }

    if (page === 'gift.html') {
        loadAllPoems();
    }

    if (page === 'admin.html') {
        handleAdmin();
    }

    async function fetchPoems() {
        try {
            const response = await fetch(POEMS_PATH);
            if (!response.ok) {
                console.error('poems.json not found. Please create it in your repository.');
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching poems:', error);
            return [];
        }
    }

    function createPoemCard(poem) {
        const card = document.createElement('div');
        card.className = 'poem-card';
        card.innerHTML = `
            <h3 class="poem-title">${poem.title}</h3>
            <p class="poem-date">${poem.date}</p>
            <div class="poem-content">${poem.content}</div>
        `;
        return card;
    }

    async function loadFeaturedPoems() {
        const container = document.getElementById('featured-poems');
        if (!container) return;
        
        const poems = await fetchPoems();
        container.innerHTML = ''; // Clear existing
        // Show latest 3 poems
        poems.slice(0, 3).forEach(poem => {
            container.appendChild(createPoemCard(poem));
        });
    }

    async function loadAllPoems() {
        const container = document.getElementById('all-poems');
        if (!container) return;
        
        const poems = await fetchPoems();
        container.innerHTML = ''; // Clear existing
        poems.forEach(poem => {
            container.appendChild(createPoemCard(poem));
        });
    }

    function handleSurpriseSection() {
        const section = document.getElementById('surprise-section');
        const blessingEl = document.getElementById('blessing');
        if (!section || !blessingEl) return;

        const blessings = [
            "May your heart be a garden of peace.",
            "Let every breath you take be a prayer of gratitude.",
            "In the silence of your soul, may you find a universe of love.",
            "May you walk the path of life with a light and joyful spirit.",
            "Let the ink of your soul write a story of kindness and wonder."
        ];

        section.addEventListener('click', () => {
            const randomIndex = Math.floor(Math.random() * blessings.length);
            blessingEl.textContent = blessings[randomIndex];
            blessingEl.classList.remove('hidden');
        });
    }


    // --- Admin Panel Logic ---
    function handleAdmin() {
        const loginSection = document.getElementById('login-section');
        const dashboard = document.getElementById('admin-dashboard');
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        let githubConfig = {};

        // Check for saved credentials
        if (sessionStorage.getItem('github_token')) {
            githubConfig = {
                username: sessionStorage.getItem('github_username'),
                repo: sessionStorage.getItem('github_repo'),
                token: sessionStorage.getItem('github_token'),
            };
            showDashboard();
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            githubConfig = {
                username: document.getElementById('username').value,
                repo: document.getElementById('repo').value,
                token: document.getElementById('token').value,
            };
            sessionStorage.setItem('github_username', githubConfig.username);
            sessionStorage.setItem('github_repo', githubConfig.repo);
            sessionStorage.setItem('github_token', githubConfig.token);
            showDashboard();
        });

        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
        });

        function showDashboard() {
            loginSection.classList.add('hidden');
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
                commitMsg.textContent = 'Saving...';
                
                const poem = {
                    id: poemIdInput.value || Date.now().toString(),
                    title: titleInput.value,
                    date: dateInput.value,
                    content: contentInput.value,
                };
                
                let poems = await getPoemsFromGitHub();
                const existingIndex = poems.findIndex(p => p.id === poem.id);

                if (existingIndex > -1) {
                    poems[existingIndex] = poem;
                } else {
                    poems.unshift(poem);
                }

                await updatePoemsOnGitHub(poems);
                commitMsg.textContent = 'Poem saved successfully!';
                setTimeout(() => commitMsg.textContent = '', 3000);
                
                loadAdminPoemList();
                clearPoemForm();
            });

            clearBtn.addEventListener('click', clearPoemForm);
        }

        function clearPoemForm() {
            poemForm.reset();
            poemIdInput.value = '';
            formTitle.textContent = 'Add a New Poem';
        }

        async function loadAdminPoemList() {
            const listContainer = document.getElementById('poem-list');
            listContainer.innerHTML = '<p>Loading poems...</p>';
            let poems = await getPoemsFromGitHub();
            
            listContainer.innerHTML = '';
            if (poems.length === 0) {
                 listContainer.innerHTML = '<p>No poems found. Add one above!</p>';
                 return;
            }
            
            poems.forEach(poem => {
                const poemEl = document.createElement('div');
                poemEl.className = 'flex justify-between items-center p-3 bg-gray-100 rounded';
                poemEl.innerHTML = `
                    <div>
                        <p class="font-bold">${poem.title}</p>
                        <p class="text-sm text-gray-600">${poem.date}</p>
                    </div>
                    <div>
                        <button class="edit-btn text-blue-500 hover:underline mr-4" data-id="${poem.id}">Edit</button>
                        <button class="delete-btn text-red-500 hover:underline" data-id="${poem.id}">Delete</button>
                    </div>
                `;
                listContainer.appendChild(poemEl);
            });
            
            // Add event listeners for edit/delete
            listContainer.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    let poems = await getPoemsFromGitHub();
                    const poemToEdit = poems.find(p => p.id === id);
                    if(poemToEdit) {
                        poemIdInput.value = poemToEdit.id;
                        titleInput.value = poemToEdit.title;
                        dateInput.value = poemToEdit.date;
                        contentInput.value = poemToEdit.content;
                        formTitle.textContent = 'Edit Poem';
                        window.scrollTo(0,0);
                    }
                });
            });

            listContainer.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!confirm('Are you sure you want to delete this poem?')) return;
                    commitMsg.textContent = 'Deleting...';
                    const id = e.target.getAttribute('data-id');
                    let poems = await getPoemsFromGitHub();
                    const updatedPoems = poems.filter(p => p.id !== id);
                    await updatePoemsOnGitHub(updatedPoems);
                    commitMsg.textContent = 'Poem deleted!';
                    setTimeout(() => commitMsg.textContent = '', 3000);
                    loadAdminPoemList();
                });
            });
        }
        
        // --- GitHub API Integration ---
        const API_URL = 'https://api.github.com';

        async function getFileSha(path) {
            const url = `${API_URL}/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`;
            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `token ${githubConfig.token}` }
                });
                if (!response.ok) return null; // File might not exist yet
                const data = await response.json();
                return data.sha;
            } catch (error) {
                console.error("Error getting file SHA:", error);
                return null;
            }
        }

        async function getPoemsFromGitHub() {
            const url = `https://raw.githubusercontent.com/${githubConfig.username}/${githubConfig.repo}/main/poems.json`;
            try {
                const response = await fetch(`${url}?t=${new Date().getTime()}`); // Cache-busting
                if (!response.ok) return [];
                return await response.json();
            } catch (error) {
                console.error("Error fetching poems from GitHub:", error);
                return [];
            }
        }
        
        async function updatePoemsOnGitHub(poems) {
            const path = 'poems.json';
            const url = `${API_URL}/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`;
            const content = JSON.stringify(poems, null, 2);
            
            const sha = await getFileSha(path);

            const body = {
                message: `Update poems: ${new Date().toISOString()}`,
                content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
                sha: sha,
            };

            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubConfig.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error('GitHub API Error:', error.message);
                    commitMsg.textContent = `Error: ${error.message}`;
                }
            } catch (error) {
                console.error("Error updating poems on GitHub:", error);
                 commitMsg.textContent = `Error: ${error.message}`;
            }
        }
    }
});
