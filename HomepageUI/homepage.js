/**
 * Homepage UI script
 * Contains functions to load works, handle authentication state,
 * manage UI interactions (search, filters, dropdowns).
 */

// API Configuration
/** Base URL for backend API calls. Update if backend URL changes. */
const API_BASE_URL = 'http://localhost:5000/api';

/** Currently authenticated user object (null when not authenticated). */
let currentUser = null;

/** Currently selected category for filtering works. 'All' means no filter. */
let currentCategory = 'All';

// Check authentication on page load
/**
 * Entry point executed when the page finishes loading.
 * - Verifies authentication
 * - Loads featured works, works list, rankings and initializes search
 */
window.onload = async function() {
    await checkAuth();
    loadFeaturedWorks();
    loadWorks();
    loadRankings('All');
    setupSearch();
};

/**
 * Verifies whether the user is authenticated by calling the backend
 * endpoint `/auth/verify`. On success, sets `currentUser` and updates UI.
 * Uses `credentials: 'include'` to send cookies/session information.
 */
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateUIForLoggedInUser();
        }
    } catch (error) {
        // Unauthenticated users continue in guest mode
        console.log('Not authenticated');
    }
}

/**
 * Updates parts of the UI to reflect a logged-in user.
 * - Hides auth buttons
 * - Shows user dropdown
 * - Fills displayed username
 */
function updateUIForLoggedInUser() {
    document.getElementById('authButtons').classList.add('hidden');
    document.getElementById('userDropdown').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
}

/**
 * Toggles the visibility of the user dropdown menu.
 * Bound to the user button's onclick handler in the markup.
 */
function toggleDropdown() {
    document.getElementById('dropdownMenu').classList.toggle('show');
}

/**
 * Global click handler to close the user dropdown when clicking outside it.
 * Keeps UX tidy by ensuring the dropdown doesn't remain open unintentionally.
 */
window.onclick = function(event) {
    if (!event.target.matches('.user-button')) {
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

/**
 * Redirects the user to the login page. Kept as a named function to
 * make it easy to call from multiple UI elements (login button, links, etc.).
 */
function showAuthModal() {
    // Show the authentication modal
    document.getElementById('authModal').classList.add('show');
}

// Close auth modal when clicking the close button
function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
    document.getElementById('step1Form').classList.remove('hidden');
    document.getElementById('step2Form').classList.add('hidden');
}

// Handle Step 1 form submission
document.getElementById('step1Form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;

    // Validate email for members - must be UP mail that ends with @up.edu.ph
    if (userType === 'member' && !email.endsWith('@up.edu.ph')) {
        alert('Lente members must use their UP email address.');
        return;
    }

    // Store data temporarily
    window.tempUserData = { name, email, userType };

    if (userType === 'member') {
        // Show member details form
        document.getElementById('step1Form').classList.add('hidden');
        document.getElementById('step2Form').classList.remove('hidden');
        document.getElementById('modalTitle').textContent = 'Member Details';
    } else {
        // Register guest user directly
        await registerUser({name, email, userType});
    }
});

// Handle Step 2 form submission for members
document.getElementById('step2Form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const batchName = document.getElementById('batchName').value;
    const cluster = document.getElementById('cluster').value;
    const position = document.getElementById('position').value;

    const userData = {
        ...window.tempUserData,
        batchName,
        cluster,
        position
    };

    await registerUser(userData);
});

// Back to Step 1
function backToStep1() {
    document.getElementById('step2Form').classList.add('hidden');
    document.getElementById('step1Form').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = 'Sign Up / Log In';
}

// Register User
async function registerUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (data.success) {
            if (userData.userType === 'guest') {
                // Guest is auto-logged in by backend
                alert('Welcome! You are now logged in as a guest.');
                closeAuthModal();
                await checkAuth(); // Refresh auth state
                location.reload();
            } else {
                // Member needs approval
                alert(data.message);
                closeAuthModal();
            }
        } else {
            // Check if user already exists - allow login
            if (data.message && data.message.includes('already registered')) {
                if (confirm(data.message + '\n\nWould you like to log in instead?')) {
                    await loginUser(userData.email);
                }
            } else {
                alert(data.message || 'Registration failed');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Error during registration. Please try again.');
    }
}

/**
 * Sends login request to backend with `email` and `name`.
 * On success, sets `currentUser`, updates UI and reloads the page.
 * Uses cookies/session via `credentials: 'include'`.
 */
async function loginUser(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            alert('Login successful!');
            closeAuthModal();
            updateUIForLoggedInUser();
            location.reload();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error during login. Please try again.');
    }
}

/**
 * Logs out the current user after a confirmation prompt.
 * Calls backend `/auth/logout` to clear server session/cookie.
 */
async function logout() {
    if (!confirm('Are you sure you want to log out?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();
        if (data.success) {
            currentUser = null;
            location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error during logout. Please try again.');
    }
}

/**
 * Loads featured works (limited to 3) and renders them into `#featuredGrid`.
 * Falls back to an empty state message when none are returned.
 */
async function loadFeaturedWorks() {
    try {
        const response = await fetch(`${API_BASE_URL}/works?featured=true&limit=3`);
        const data = await response.json();

        const grid = document.getElementById('featuredGrid');
        if (data.works && data.works.length > 0) {
            grid.innerHTML = data.works.map(work => createWorkCard(work)).join('');
        } else {
            grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No featured works yet</p></div>';
        }
    } catch (error) {
        console.error('Error loading featured works:', error);
    }
}

/**
 * Loads a paginated list of works (limit 12) with optional category filter
 * and renders them into `#worksGrid`.
 */
async function loadWorks() {
    try {
        const categoryParam = currentCategory !== 'All' ? `&category=${currentCategory}` : '';
        const response = await fetch(`${API_BASE_URL}/works?limit=12${categoryParam}`);
        const data = await response.json();

        const grid = document.getElementById('worksGrid');
        if (data.works && data.works.length > 0) {
            grid.innerHTML = data.works.map(work => createWorkCard(work)).join('');
        } else {
            grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No works found</p></div>';
        }
    } catch (error) {
        console.error('Error loading works:', error);
    }
}

/**
 * Returns HTML for a single work card. This is a simple template helper
 * that keeps presentation logic in one place. The `onclick` uses `viewWork`.
 */
function createWorkCard(work) {
    const icon = work.category === 'Photos' ? '📷' : work.category === 'Graphics' ? '🎨' : '🎬';
    return `
        <div class="work-card" onclick="viewWork('${work._id}')">
            <div class="work-image">${icon}</div>
            <div class="work-info">
                <div class="work-title">${work.title}</div>
                <div class="work-author">by ${work.userId?.name || 'Unknown'}</div>
                <div class="work-stats">
                    <span>❤️ ${work.voteCount || 0} votes</span>
                    <span>${work.category}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Applies a category filter for displayed works and updates active tab.
 */
function filterByCategory(category) {
    currentCategory = category;
    
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });

    loadWorks();
}

/**
 * Loads ranking data for a given category and populates `#rankingList`.
 * Renders top 10 works with special medal icons for top 3.
 */
async function loadRankings(category) {
    try {
        const response = await fetch(`${API_BASE_URL}/works/rankings/${category}`);
        const data = await response.json();

        const list = document.getElementById('rankingList');
        if (data.works && data.works.length > 0) {
            list.innerHTML = data.works.slice(0, 10).map((work, index) => {
                const icon = work.category === 'Photos' ? '📷' : work.category === 'Graphics' ? '🎨' : '🎬';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                return `
                    <div class="ranking-item" onclick="viewWork('${work._id}')">
                        <div class="rank-number">${medal || (index + 1)}</div>
                        <div class="rank-image">${icon}</div>
                        <div class="rank-info">
                            <div class="work-title">${work.title}</div>
                            <div class="work-author">by ${work.userId?.name || 'Unknown'}</div>
                        </div>
                        <div class="rank-votes">${work.voteCount} ❤️</div>
                    </div>
                `;
            }).join('');
        } else {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><p>No rankings yet</p></div>';
        }
    } catch (error) {
        console.error('Error loading rankings:', error);
    }
}

/**
 * Handler invoked when a work card is clicked. Currently shows a placeholder
 * alert. Replace with navigation to a dedicated work detail page when ready.
 */
function viewWork(workId) {
    alert(`View work: ${workId}\n\nThis would open the work detail page.`);
    // TODO: Navigate to work detail page
    // window.location.href = `work.html?id=${workId}`;
}

/**
 * Opens the current user's portfolio. If no user is logged in this is a no-op.
 */
async function viewMyPortfolio() {
    if (!currentUser) {
        alert('Please log in first.');
        return;
    }

    if (currentUser.userType !== 'member') {
        alert('Only members can create portfolios.');
        return;
    }

    // Fetch the user's portfolio
    try {
        const response = await fetch(`${API_BASE_URL}/portfolios/user/${currentUser._id}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.portfolio) {
            // Redirect to their portfolio
            window.location.href = `portfolio_detail.html?id=${data.portfolio._id}`;
        } else {
            // Prompt to create portfolio
            if (confirm('You do not have a portfolio yet. Would you like to create one now?')) {
                window.location.href = 'portfolio.html';
            }
        }
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        alert('Error fetching your portfolio. Please try again later.');
    }
}

/**
 * Generic navigation stub for showing different site sections.
 * Replace alerts with real navigation when pages are implemented.
 */
function showSection(section) {
    if (section === 'about') {
        window.location.href = 'about.html';
    } else if (section === 'portfolios') {
        window.location.href = 'portfolio.html';  
    } else if (section === 'themes') {
        window.location.href = 'theme.html';
    } else if (section === 'photos') {
        window.location.href = 'photos.html';
    } else if (section === 'graphics') {
        window.location.href = 'graphics.html';
    } else if (section === 'videos') {
        window.location.href = 'videos.html';
    } else {
        alert(`Navigate to: ${section}\n\nThis would show the ${section} page.`);
    }
}

/**
 * Shows information about the organization. Currently a placeholder.
 */
function showAbout() {
    window.location.href = 'about.html';
}

/**
 * Reloads the homepage. Kept as a named function for clarity and testability.
 */
function loadHomepage() {
    location.reload();
}

/**
 * Attaches debounced input handling to the search bar. Waits 500ms
 * after the last keystroke before issuing a search to reduce API load.
 */
function setupSearch() {
    const searchBar = document.getElementById('searchBar');
    let searchTimeout;

    searchBar.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = this.value.trim();
            if (query) {
                searchWorks(query);
            } else {
                loadWorks();
            }
        }, 500);
    });
}

/**
 * Searches works using the backend API and renders results into `#worksGrid`.
 * Uses `encodeURIComponent` to safely include the query in the URL.    
 */
async function searchWorks(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/works?search=${encodeURIComponent(query)}`);
        const data = await response.json();

        const grid = document.getElementById('worksGrid');
        if (data.works && data.works.length > 0) {
            grid.innerHTML = data.works.map(work => createWorkCard(work)).join('');
        } else {
            grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No results found for "${query}"</p></div>`;
        }
    } catch (error) {
        console.error('Error searching works:', error);
    }
}