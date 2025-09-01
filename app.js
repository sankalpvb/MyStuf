/**
 * Main application logic for the poetry website.
 * This script handles functionality for all pages: Home, Gift, and Admin.
 */
document.addEventListener('DOMContentLoaded', () => {

    const GITHUB_API_URL = `https://api.github.com/repos/${config.username}/${config.repo}/contents/poems.json`;
    const POEMS_RAW_URL = `https://raw.githubusercontent.com/${config.username}/${config.repo}/${config.branch}/poems.json`;

    // Global state to hold poems and avoid re-fetching
    let allPoems = [];

    // --- Page-specific initializers ---
    const page = window.location.pathname.split("/").pop();

    if (page === 'index.html' || page === '') {
        initHomePage();
    } else if (page === 'gift.html') {
        initGiftPage();
    } else if (page === 'admin.html') {
        initAdminPage();
    }

    // --- DATA FETCHING ---

    /**
     * Fetches poems from the raw GitHub URL to ensure we always get the latest version.
     * @returns {Promise<Array>} A promise that resolves to an array of poem objects.
     */
    async function fetchPoems() {
        if (allPoems.length > 0) {
            return allPoems; // Return cached poems if available
        }
        try {
            // Use a cache-busting query parameter
            const response = await fetch(`${POEMS_RAW_URL}?t=${new Date().getTime()}`);
            if (response.status === 404) {
                console.warn("poems.json not found. It will be created when you save the first poem.");
                return [];
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allPoems = await response.json();
            return allPoems;
        } catch (error) {
            console.error("Error fetching poems:", error);
            return []; // Return empty array on error
        }
    }


    // --- HOME PAGE LOGIC ---

    function initHomePage() {
        const surpriseSection = document.getElementById('surprise-section');
        const blessingEl = document.getElementById('blessing');
        const placeholderEl = document.getElementById('blessing-placeholder');

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
        setupFiltering();
    }

    /**
     * Renders poems to the grid, optionally filtered by a search term and active tags.
     * @param {string} searchTerm - Text to filter poems by title or content.
     * @param {string[]} activeTags - An array of tags to filter poems by.
     */
    async function renderPoems(searchTerm = '', activeTags = []) {
        const poemsGrid = document.getElementById('poems-grid');
        poemsGrid.innerHTML = '<p>Loading poems...</p>';
        const poems = await fetchPoems();

        let filteredPoems = poems;

        // Apply search filter
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filteredPoems = filteredPoems.filter(poem =>
                poem.title.toLowerCase().includes(lowerCaseSearch) ||
                poem.content.toLowerCase().includes(lowerCaseSearch)
            );
        }

        // Apply tag filter
        if (activeTags.length > 0) {
            filteredPoems = filteredPoems.filter(poem =>
                activeTags.every(tag => poem.tags.includes(tag))
            );
        }

        poemsGrid.innerHTML = '';
        if (filteredPoems.length === 0) {
            poemsGrid.innerHTML = '<p>No poems found that match your criteria.</p>';
        } else {
            filteredPoems.forEach(poem => {
                const card = document.createElement('div');
                card.className = 'poem-card';
                // Create a snippet without cutting words
                const snippet = poem.content.split(' ').slice(0, 15).join(' ') + '...';
                card.innerHTML = `
                    <h3 class="poem-title">${poem.title}</h3>
                    <p class="poem-snippet">${snippet}</p>
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

    /**
     * Sets up search and tag filtering functionality.
     */
    async function setupFiltering() {
        const searchInput = document.getElementById('search-input');
        const tagFiltersContainer = document.getElementById('tag-filters');
        const poems = await fetchPoems();

        // Create tag filter buttons
        const allTags = new Set(poems.flatMap(p => p.tags || []));
        tagFiltersContainer.innerHTML = '<button class="tag-filter active" data-tag="all">All</button>';
        allTags.forEach(tag => {
            const button = document.createElement('button');
            button.className = 'tag-filter';
            button.dataset.tag = tag;
            button.textContent = tag;
            tagFiltersContainer.appendChild(button);
        });

        // Event listener for search and tags
        const applyFilters = () => {
            const searchTerm = searchInput.value;
            const activeTagEls = tagFiltersContainer.querySelectorAll('.tag-filter.active');
            let activeTags = Array.from(activeTagEls).map(el => el.dataset.tag);
            // If "All" is selected, treat as no tag filter
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
                    // If "All" is clicked, deactivate others and activate "All"
                    tagFiltersContainer.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                } else {
                    // Deactivate "All" if another tag is clicked
                    tagFiltersContainer.querySelector('[data-tag="all"]').classList.remove('active');
                    // Toggle the clicked tag's active state
                    e.target.classList.toggle('active');
                }
                // If no tags are active, activate "All"
                if (tagFiltersContainer.querySelectorAll('.tag-filter.active').length === 0) {
                    tagFiltersContainer.querySelector('[data-tag="all"]').classList.add('active');
                }
                applyFilters();
            }
        });
    }

    // --- MODAL LOGIC ---
    function openPoemModal(poemId) {
        const poem = allPoems.find(p => p.id.toString() === poemId.toString());
        if (!poem) return;

        document.getElementById('modal-title').textContent = poem.title;
        document.getElementById('modal-date').textContent = new Date(poem.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('modal-content').innerHTML = poem.content.replace(/\n/g, '<br>');
        
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

    // Close modal logic
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
                alert('Please enter a token.');
            }
        });

        // Check if token already exists in session storage
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
            
            // If editing, use the original date
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
        listContainer.innerHTML = '<p>Loading...</p>';
        const poems = await fetchPoems();

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
                    <strong>${poem.title}</strong>
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

        // Add event listeners for edit/delete buttons
        listContainer.addEventListener('click', async (e) => {
            const poemId = e.target.dataset.id;
            if (e.target.classList.contains('edit-btn')) {
                const poem = allPoems.find(p => p.id === poemId);
                document.getElementById('form-title').textContent = 'Edit Poem';
                document.getElementById('poem-id').value = poem.id;
                document.getElementById('title').value = poem.title;
                document.getElementById('content').value = poem.content;
                document.getElementById('tags').value = (poem.tags || []).join(', ');
                window.scrollTo(0,0);
            }
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this poem?')) {
                    await deletePoem(poemId, token);
                }
            }
        });
    }

    /**
     * Shows a feedback message to the user in the admin panel.
     * @param {string} message - The text to display.
     * @param {boolean} isError - If true, styles the message as an error.
     */
    function showFeedback(message, isError = false) {
        const feedbackEl = document.getElementById('feedback-message');
        feedbackEl.textContent = message;
        feedbackEl.className = 'feedback-message'; // Reset classes
        feedbackEl.classList.add(isError ? 'feedback-error' : 'feedback-success');
        feedbackEl.classList.remove('hidden');

        setTimeout(() => {
            feedbackEl.classList.add('hidden');
        }, 4000);
    }

    // --- GITHUB API LOGIC ---

    /**
     * Commits updated poem data to the GitHub repository.
     * @param {Array} poemsData - The full array of poem objects to save.
     * @param {string} token - The user's GitHub Personal Access Token.
     * @param {string} commitMessage - The message for the GitHub commit.
     * @returns {Promise<boolean>} True on success, false on failure.
     */
    async function commitPoemsToGitHub(poemsData, token, commitMessage) {
        try {
            // Step 1: Get the latest SHA of the file
            const fileResponse = await fetch(GITHUB_API_URL, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (!fileResponse.ok && fileResponse.status !== 404) {
                 throw new Error(`GitHub API error getting file SHA: ${fileResponse.statusText}`);
            }
            const fileData = fileResponse.status === 404 ? {} : await fileResponse.json();
            const sha = fileData.sha;

            // Step 2: Prepare the content and commit body
            const content = JSON.stringify(poemsData, null, 2);
            // Base64 encode the content
            const encodedContent = btoa(unescape(encodeURIComponent(content)));

            const body = {
                message: commitMessage,
                content: encodedContent,
                branch: config.branch,
            };
            if (sha) {
                body.sha = sha; // Include SHA if the file exists to update it
            }

            // Step 3: Make the PUT request to update/create the file
            const commitResponse = await fetch(GITHUB_API_URL, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!commitResponse.ok) {
                const errorData = await commitResponse.json();
                throw new Error(`GitHub commit failed: ${errorData.message}`);
            }
            
            // Clear local cache to force a re-fetch of the new data
            allPoems = [];
            return true;
        } catch (error) {
            console.error("Error committing to GitHub:", error);
            showFeedback(error.message, true);
            return false;
        }
    }
    
    async function savePoem(poemData, token) {
        let poems = await fetchPoems();
        const existingIndex = poems.findIndex(p => p.id === poemData.id);
        
        let commitMessage;
        if (existingIndex > -1) {
            // Update existing poem
            poems[existingIndex] = poemData;
            commitMessage = `Update poem: ${poemData.title}`;
        } else {
            // Add new poem to the beginning of the array
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
        const updatedPoems = poems.filter(p => p.id !== poemId);
        
        const commitMessage = `Delete poem: ${poemToDelete.title}`;
        const success = await commitPoemsToGitHub(updatedPoems, token, commitMessage);
        if (success) {
            showFeedback('Poem deleted successfully!');
            await renderAdminPoemList(token);
        }
    }
});

