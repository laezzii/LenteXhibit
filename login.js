// Get DOM elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const loginForm = document.getElementById('loginForm');
const memberForm = document.getElementById('memberForm');
const backBtn = document.getElementById('backBtn');

// Store user data
let userData = {};

// Handle initial login form submission
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
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
        // Guest login - redirect to homepage
        console.log('Guest Login:', userData);
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