// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentCategory = 'All';

// Check authentication on page load
window.onload = async function() {
    await checkAuth();
    loadFeaturedWorks();
    loadWorks();
    loadRankings('All');
    setupSearch();
};

// Check if user is authenticated
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
        console.log('Not authenticated');
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    document.getElementById('authButtons').classList.add('hidden');
    document.getElementById('userDropdown').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
}

// Show/Hide dropdown
function toggleDropdown() {
    document.getElementById('dropdownMenu').classList.toggle('show');
}

// Close dropdown when clicking outside
window.onclick = function(event) {
    if (!event.target.matches('.user-button')) {
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

// Show auth modal - Redirect to login page
function showAuthModal() {
    // Redirect to login page 
    window.location.href = 'login.html';
}

// Login user
async function loginUser(email, name) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, name })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            updateUIForLoggedInUser();
            location.reload();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
    }
}

// Logout
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
    }
}

// Load featured works
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

// Load works
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

// Create work card HTML
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

// Filter by category
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

// Load rankings
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

// View work details
function viewWork(workId) {
    alert(`View work: ${workId}\n\nThis would open the work detail page.`);
    // TODO: Navigate to work detail page
    // window.location.href = `work.html?id=${workId}`;
}

// View my portfolio
function viewMyPortfolio() {
    if (currentUser) {
        alert(`View portfolio for: ${currentUser.name}\n\nThis would open your portfolio page.`);
        // TODO: Navigate to portfolio page
        // window.location.href = `portfolio.html?userId=${currentUser._id}`;
    }
}

// Show section
function showSection(section) {
    alert(`Navigate to: ${section}\n\nThis would show the ${section} page.`);
    // TODO: Implement section navigation
}

// Show about
function showAbout() {
    alert('About UP Lente\n\nThis would show information about UP Lente organization.');
    // TODO: Implement about page
    // window.location.href = 'about.html';
}

// Load homepage
function loadHomepage() {
    location.reload();
}

// Setup search
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

// Search works
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