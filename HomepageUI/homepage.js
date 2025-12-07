/**
 * Homepage UI script - FIXED UI UPDATE
 * Contains functions to load works, handle authentication state,
 * manage UI interactions (search, filters, dropdowns).
 */

// ============================================
// API CONFIGURATION - PRODUCTION READY
// ============================================
const PRODUCTION_API_URL = 'https://lentexhibit.onrender.com/api';
const DEVELOPMENT_API = 'http://localhost:5000/api';

const API_BASE_URL = (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1')
    ? DEVELOPMENT_API
    : PRODUCTION_API_URL;

console.log('🔍 Script loaded successfully!');
console.log('🌐 Using API:', API_BASE_URL);
console.log('🏠 Hostname:', window.location.hostname);
console.log('🎯 Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');

// ============================================
// GLOBAL VARIABLES
// ============================================

/** Currently authenticated user object (null when not authenticated). */
let currentUser = null;

/** Currently selected category for filtering works. 'All' means no filter. */
let currentCategory = 'All';

// ============================================
// PAGE INITIALIZATION
// ============================================

// Check authentication on page load
window.onload = async function() {
    await checkAuth();
    loadFeaturedWorks();
    loadWorks();
    loadRankings('All');
    setupSearch();
};

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

async function checkAuth() {
    try {
        console.log('🔍 Checking authentication...');
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            credentials: 'include'
        });
        const data = await response.json();
        console.log('📋 Verify response:', data);
        
        if (data.success) {
            currentUser = data.user;
            console.log('✅ User authenticated:', currentUser.name);
            updateUIForLoggedInUser();
        } else {
            console.log('❌ Not authenticated:', data.message);
            currentUser = null;
        }
    } catch (error) {
        console.log('❌ Auth check error:', error);
        currentUser = null;
    }
}

function updateUIForLoggedInUser() {
    console.log('🔄 Updating UI for logged in user:', currentUser.name);
    
    // Hide auth buttons
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.add('hidden');
    }
    
    // Show user dropdown
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.remove('hidden');
    }
    
    // Set username
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = currentUser.name;
    }
    
    console.log('✅ UI updated successfully');
}

function toggleDropdown() {
    document.getElementById('dropdownMenu').classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.user-button')) {
        const dropdown = document.getElementById('dropdownMenu');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
};

// ============================================
// MODAL FUNCTIONS
// ============================================

function showAuthModal() {
    document.getElementById('authModal').classList.add('show');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
    document.getElementById('step1Form').classList.remove('hidden');
    document.getElementById('step2Form').classList.add('hidden');
}

function backToStep1() {
    document.getElementById('step2Form').classList.add('hidden');
    document.getElementById('step1Form').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = 'Sign Up / Log In';
}

// ============================================
// FORM HANDLERS
// ============================================

document.getElementById('step1Form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;

    if (userType === 'member' && !email.endsWith('@up.edu.ph')) {
        alert('Lente members must use their UP email address.');
        return;
    }

    window.tempUserData = { name, email, userType };

    if (userType === 'member') {
        document.getElementById('step1Form').classList.add('hidden');
        document.getElementById('step2Form').classList.remove('hidden');
        document.getElementById('modalTitle').textContent = 'Member Details';
    } else {
        await registerUser({name, email, userType});
    }
});

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

// ============================================
// REGISTRATION & LOGIN
// ============================================

async function registerUser(userData) {
    try {
        console.log('📝 Registering user:', userData.email);
        
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        console.log('📨 Registration response:', data);

        if (data.success) {
            console.log('✅ Registration successful!');
            
            if (userData.userType === 'guest' || userData.userType === 'member') {
                // Close modal first
                closeAuthModal();

                // Show welcome message
                alert(`Welcome, ${data.user.name}! You are now logged in.`);
                
                // Reload page - checkAuth() will run on page load and verify session
                setTimeout(() => {
                    location.reload();
                }, 500);
            } else {
                alert(data.message);
                closeAuthModal();
            }
        } else {
            console.log('❌ Registration failed:', data.message);
            
            if (data.message && data.message.includes('already')) {
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

async function loginUser(email) {
    try {
        console.log('🔐 Logging in user:', email);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        console.log('📨 Login response:', data);

        if (data.success) {
            console.log('✅ Login successful!');

            // Close modal
            closeAuthModal();

            // Show welcome message
            alert('Login successful!');
            
            // Reload page - checkAuth() will run on page load and verify session
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error during login. Please try again.');
    }
}

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

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadFeaturedWorks() {
    try {
        const response = await fetch(`${API_BASE_URL}/works?featured=true&limit=3`, {
            credentials: 'include'
        });
        const data = await response.json();

        const grid = document.getElementById('featuredGrid');
        if (!grid) return; // Element doesn't exist on this page
        
        if (data.works && data.works.length > 0) {
            grid.innerHTML = data.works.map(work => createWorkCard(work)).join('');
        } else {
            grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No featured works yet</p></div>';
        }
    } catch (error) {
        console.error('Error loading featured works:', error);
    }
}

async function loadWorks() {
    try {
        const categoryParam = currentCategory !== 'All' ? `&category=${currentCategory}` : '';
        const response = await fetch(`${API_BASE_URL}/works?limit=12${categoryParam}`, {
            credentials: 'include'
        });
        const data = await response.json();

        const grid = document.getElementById('worksGrid');
        if (!grid) return; // Element doesn't exist on this page
        
        if (data.works && data.works.length > 0) {
            grid.innerHTML = data.works.map(work => createWorkCard(work)).join('');
        } else {
            grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No works found</p></div>';
        }
    } catch (error) {
        console.error('Error loading works:', error);
    }
}

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

function filterByCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });

    loadWorks();
}

async function loadRankings(category) {
    try {
        const response = await fetch(`${API_BASE_URL}/works/rankings/${category}`, {
            credentials: 'include'
        });
        const data = await response.json();

        const list = document.getElementById('rankingList');
        if (!list) return; // Element doesn't exist on this page
        
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

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function viewWork(workId) {
    alert(`View work: ${workId}\n\nThis would open the work detail page.`);
}

async function viewMyPortfolio() {
    if (!currentUser) {
        alert('Please log in first.');
        return;
    }

    if (currentUser.userType !== 'member') {
        alert('Only members can create portfolios.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/portfolios/user/${currentUser._id}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.portfolio) {
            window.location.href = `portfolio_detail.html?id=${data.portfolio._id}`;
        } else {
            if (confirm('You do not have a portfolio yet. Would you like to create one now?')) {
                window.location.href = 'portfolio.html';
            }
        }
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        alert('Error fetching your portfolio. Please try again later.');
    }
}

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

function showAbout() {
    window.location.href = 'about.html';
}

function loadHomepage() {
    location.reload();
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function setupSearch() {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) return; // Element doesn't exist on this page
    
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

async function searchWorks(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/works?search=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });
        const data = await response.json();

        const grid = document.getElementById('worksGrid');
        if (!grid) return;
        
        if (data.works && data.works.length > 0) {
            grid.innerHTML = data.works.map(work => createWorkCard(work)).join('');
        } else {
            grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No results found for "${query}"</p></div>`;
        }
    } catch (error) {
        console.error('Error searching works:', error);
    }
}