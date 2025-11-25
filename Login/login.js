/**
 * Login page script
 * Handles a two-step login/registration flow:
 *  - step1: collect basic info (name, email, userType)
 *  - step2: collect additional member-specific details
 *
 * Other notes:
 *  - Network calls include `credentials: 'include'` to send cookies/sessions.
 *  - Guest users are automatically logged in after registration.
 *  - Member registration currently shows a pending message and redirects.
 */

// API Base URL
/** Server API base URL. Update if backend host or port changes. */
const API_BASE_URL = 'http://localhost:5000/api';

// Get DOM elements (cached for reuse to avoid repeated DOM queries)
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const loginForm = document.getElementById('loginForm');
const memberForm = document.getElementById('memberForm');
const backBtn = document.getElementById('backBtn');

// Store collected user data between steps
/**
 * Mutable object to hold user input across the multi-step form.
 * Keeps the shape consistent and is sent to the backend on registration.
 */
let userData = {};

/**
 * Handler for the initial login/registration form.
 * - Prevents default form submit
 * - Collects `name`, `email`, and `userType`
 * - If `member`, shows the second step to gather member details
 * - If `guest`, registers and triggers auto-login flow
 */
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Collect basic user info
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;

    // Store basic user data for the next step or registration
    userData = { name, email, userType };

    if (userType === 'member') {
        // Show member details form with a simple fade transition
        step1.classList.add('fade-out');
        setTimeout(() => {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('fade-in');
        }, 300);
    } else {
        // Guest registration: send data to backend and then auto-login
        await registerUser(userData);
        // showHomepage is assumed to exist elsewhere in the codebase
        showHomepage('guest', userData);
    }
});

/**
 * Handler for the member details form (step 2).
 * - Adds supplemental member fields to `userData`
 * - Currently logs the data and navigates to homepage (replace with real flow)
 */
memberForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const batchName = document.getElementById('batchName').value;
    const cluster = document.getElementById('cluster').value;
    const position = document.getElementById('position').value;

    // Merge member-specific details into the same object
    userData.batchName = batchName;
    userData.cluster = cluster;
    userData.position = position;

    // Validate member fields before submit
    console.log('Member Login:', userData);

    // Redirect to homepage (placeholder). Replace with registerUser if members should register.
    showHomepage('member', userData);
});

/**
 * Handler for the back button on the member step.
 * Reverses the transition to return the user to step 1.
 */
backBtn.addEventListener('click', function() {
    step2.classList.add('fade-out');
    setTimeout(() => {
        step2.classList.add('hidden');
        step2.classList.remove('fade-in');
        step1.classList.remove('hidden');
        step1.classList.remove('fade-out');
    }, 300);
});

/**
 * Registers a user by POSTing `userData` to the backend.
 * - Uses JSON body and includes credentials (cookies/session)
 * - On success for guests, triggers `loginUser` to auto sign-in
 * - On success for members, shows a pending message and redirects
 */
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
                // Redirect to homepage (placeholder)
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

/**
 * Logs in a guest user by calling the auth endpoint.
 * - On success, redirects to `homepage.html`
 */
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