// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Get DOM elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const loginForm = document.getElementById('loginForm');
const memberForm = document.getElementById('memberForm');
const backBtn = document.getElementById('backBtn');

// Store user data
let userData = {};

// Handle initial login form submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Collect basic user info
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;
    
    // Store basic user data
    userData = { name, email, userType };
    
    if (userType === 'member') {
        // Show member details form
        step1.classList.add('fade-out');
        setTimeout(() => {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('fade-in');
        }, 300);
    } else {
        // Guest registration
        await registerUser(userData);
        showHomepage('guest', userData);
    }
});

// Handle member details form submission
memberForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const batchName = document.getElementById('batchName').value;
    const cluster = document.getElementById('cluster').value;
    const position = document.getElementById('position').value;
    
    // Add member details to user data
    userData.batchName = batchName;
    userData.cluster = cluster;
    userData.position = position;
    
    console.log('Member Login:', userData);
    
    // Redirect to homepage
    showHomepage('member', userData);
});

// Handle back button
backBtn.addEventListener('click', function() {
    step2.classList.add('fade-out');
    setTimeout(() => {
        step2.classList.add('hidden');
        step2.classList.remove('fade-in');
        step1.classList.remove('hidden');
        step1.classList.remove('fade-out');
    }, 300);
});

// Register user function
async function registerUser(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            console.log('User registered:', result);
            
            if (userData.userType === 'guest') {
                // Guest - Auto login and redirect to homepage
                await loginUser(userData.email, userData.name);
            } else {
                // Member - Show pending approval message
                alert(result.message);
                // Redirect to homepage
                window.location.href = 'homepage.html';
            }
        } else {
            alert(result.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('Error during registration. Please check your connection and try again.');
    }
}

// Login user function (for guests)
async function loginUser(email, name) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, name })
        });

        const result = await response.json();

        if (result.success) {
            console.log('Login successful:', result);
            // Redirect to homepage
            window.location.href = 'homepage.html';
        } else {
            alert(result.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('Error during login. Please try again.');
    }
}