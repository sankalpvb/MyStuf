document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const POEMS_PATH = 'poems.json'; // The path to your poems file in the repository

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

    /**
     * Fetches poems from the poems.json file.
     * Uses a cache-busting query parameter to ensure the latest version is fetched.
     */
    async function fetchPoems() {
        try {
            // Add a timestamp to prevent the browser from caching the poems file
            const response = await fetch(`${POEMS_PATH}?t=${new Date().getTime()}`);
            if (response.status === 404) {
                console.error('poems.json not found. A new one will be created when you save your first poem.');
                return [];
            }
            if (!response.ok) {
                console.error(`Error fetching poems. Status: ${response.status}`);
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching poems:', error);
            return [];
        }
    }

    /**
     * Creates an HTML element for a single poem.
     * @param {object} poem - The poem object with title, date, and content.
     * @returns {HTMLElement} - The div element representing the poem card.
     */
    function createPoemCard(poem) {
        const card = document.createElement('div');
        card.className = 'poem-card';
        card.innerHTML = `
            <h3 class="poem-title">${poem.title}</h3>
            <p class="poem-date">${poem.date}</p>
            <div class="poem-content">${poem.content.replace(/\n/g, '<br>')}</div>
        `;
        return card;
    }

    /**
     * Loads the latest 3 poems into the featured poems section on the homepage.
     */
    async function loadFeaturedPoems() {
        const container = document.getElementById('featured-poems');
        if (!container) return;
        
        const poems = await fetchPoems();
        container.innerHTML = ''; // Clear existing
        poems.slice(0, 3).forEach(poem => {
            container.appendChild(createPoemCard(poem));
        });
    }

    /**
     * Loads all poems into the gift section page.
     */
    async function loadAllPoems() {
        const container = document.getElementById('all-poems');
        if (!container) return;
        
        const poems = await fetchPoems();
        container.innerHTML = ''; // Clear existing
        poems.forEach(poem => {
            container.appendChild(createPoemCard(poem));
        });
    }

    /**
     * Handles the logic for the "Surprise Section" on the homepage.
     */
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
            blessingEl.textContent = `"${blessings[randomIndex]}"`;
            blessingEl.classList.remove('hidden');
        });
    }

    // --- Admin Panel Logic ---

    /**
     * Initializes all functionality for the admin page.
     */
    function handleAdmin() {
        const loginSection = document.getElementById('login-section');
        const dashboard = document.getElementById('admin-dashboard');
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');
        const loginMessage = document.getElementById('login-message');

        let githubConfig = {};

        // Check for saved credentials in session storage
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
                username: document.getElementById('username').value.trim(),
                repo: document.getElementById('repo').value.trim(),
                token: document.getElementById('token').value.trim(),
            };
            // Simple validation
            if(githubConfig.username && githubConfig.repo && githubConfig.token){
                sessionStorage.setItem('github_username', githubConfig.username);
                sessionStorage.setItem('github_repo', githubConfig.repo);
                sessionStorage.setItem('github_token', githubConfig.token);
                showDashboard();
            } else {
                loginMessage.textContent = "Please fill in all fields.";
            }
        });

        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            loginSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
            loginMessage.textContent = "You have been logged out.";
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
                setCommitMessage('Saving...', 'text-blue-500');
                
                const poemData = {
                    id: poemIdInput.value || Date.now().toString(),
                    title: titleInput.value,
                    date: dateInput.value,
                    content: contentInput.value,
                };
                
                let currentPoems = await getPoemsFromGitHub();
                const existingIndex = currentPoems.findIndex(p => p.id === poemData.id);

                if (existingIndex > -1) {
                    currentPoems[existingIndex] = poemData; // Update existing
                } else {
                    currentPoems.unshift(poemData); // Add new
                }

                const success = await updatePoemsOnGitHub(currentPoems);
                if (success) {
                    setCommitMessage('Poem saved successfully!', 'text-green-500');
                    loadAdminPoemList();
                    clearPoemForm();
                } 
                // Error message is set within the update function
            });

            clearBtn.addEventListener('click', clearPoemForm);
        }
        
        function setCommitMessage(message, colorClass) {
            commitMsg.textContent = message;
            commitMsg.className = `text-center my-4 ${colorClass}`;
            setTimeout(() => commitMsg.textContent = '', 4000);
        }

        function clearPoemForm() {
            poemForm.reset();
            poemIdInput.value = '';
            formTitle.textContent = 'Add a New Poem';
            // Set date to today by default for new poems
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        async function loadAdminPoemList() {
            const listContainer = document.getElementById('poem-list');
            listContainer.innerHTML = '<p>Loading poems...</p>';
            let poems = await getPoemsFromGitHub();
            
            listContainer.innerHTML = '';
            if (poems.length === 0) {
                 listContainer.innerHTML = '<p>No poems found. Add your first one above!</p>';
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
            
            listContainer.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    let allPoems = await getPoemsFromGitHub();
                    const poemToEdit = allPoems.find(p => p.id === id);
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
                    setCommitMessage('Deleting...', 'text-blue-500');
                    const id = e.target.getAttribute('data-id');
                    let allPoems = await getPoemsFromGitHub();
                    const updatedPoems = allPoems.filter(p => p.id !== id);
                    const success = await updatePoemsOnGitHub(updatedPoems);
                    if (success) {
                        setCommitMessage('Poem deleted successfully!', 'text-green-500');
                        loadAdminPoemList();
                    }
                });
            });
        }
        
        // --- GitHub API Integration ---
        const API_URL = 'https://api.github.com';

        async function githubApiRequest(url, options = {}) {
            const defaultOptions = {
                headers: {
                    'Authorization': `token ${githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                }
            };
            const response = await fetch(url, { ...defaultOptions, ...options });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
                console.error('GitHub API Error:', errorMessage);
                setCommitMessage(`GitHub Error: ${errorMessage}`, 'text-red-500');
                throw new Error(errorMessage);
            }
            // For 204 No Content response, which can happen.
            if (response.status === 204) return null;
            return response.json();
        }
        
        async function getFileSha(path) {
            const url = `${API_URL}/repos/${githubConfig.username}/${githubConfig.repo}/contents/${path}`;
            try {
                const data = await githubApiRequest(url);
                return data.sha;
            } catch (error) {
                // If the error message includes "Not Found", it means the file doesn't exist yet.
                if (error.message.includes("Not Found")) {
                    console.log("poems.json not found. Will create a new one.");
                    return null;
                }
                // For other errors (like auth issues), the error is already displayed by githubApiRequest.
                return null;
            }
        }

        async function getPoemsFromGitHub() {
            // This function intentionally avoids the authenticated API to always get the latest public version
            const url = `https://raw.githubusercontent.com/${githubConfig.username}/${githubConfig.repo}/main/${POEMS_PATH}`;
            try {
                const response = await fetch(`${url}?t=${new Date().getTime()}`); // Cache-busting
                if (!response.ok) return [];
                return await response.json();
            } catch (error) {
                return [];
            }
        }
        
        async function updatePoemsOnGitHub(poems) {
            const url = `${API_URL}/repos/${githubConfig.username}/${githubConfig.repo}/contents/${POEMS_PATH}`;
            const content = JSON.stringify(poems, null, 2);
            
            try {
                const sha = await getFileSha(POEMS_PATH);

                const body = {
                    message: `Update poems: ${new Date().toISOString()}`,
                    content: btoa(unescape(encodeURIComponent(content))), // Base64 encode
                };
                
                // **CRITICAL FIX**: Only include SHA if the file already exists.
                // The GitHub API requires the SHA for updates but not for new file creation.
                if (sha) {
                    body.sha = sha;
                }

                await githubApiRequest(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                return true; // Success
            } catch (error) {
                // Error is displayed by the helper functions
                return false; // Failure
            }
        }
    }
});

