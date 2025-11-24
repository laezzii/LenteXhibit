// Function to show homepage
function showHomepage(userType, userData) {
    const loginContainer = document.getElementById('loginContainer');
    
    loginContainer.classList.add('fade-out');
    setTimeout(() => {
        loginContainer.innerHTML = `
            <div class="login-header fade-in">
                <h1>Welcome to LenteXhibit!</h1>
                <p>Hello, ${userData.name}</p>
            </div>
            <div class="homepage-content fade-in" style="text-align: center; padding: 20px 0;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="margin-bottom: 10px;">🎉 Login Successful!</h2>
                    <p style="font-size: 14px; opacity: 0.9;">You are logged in as a ${userType === 'guest' ? 'Guest' : 'Member'}</p>
                </div>
                
                ${userType === 'member' ? `
                <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; text-align: left; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Your Profile</h3>
                    <p style="margin: 8px 0; color: #666;"><strong>Email:</strong> ${userData.email}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>Batch:</strong> ${userData.batchName}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>Cluster:</strong> ${userData.cluster}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>Position:</strong> ${userData.position}</p>
                </div>
                ` : `
                <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; text-align: left; margin-bottom: 20px;">
                    <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">Your Profile</h3>
                    <p style="margin: 8px 0; color: #666;"><strong>Email:</strong> ${userData.email}</p>
                    <p style="margin: 8px 0; color: #666;"><strong>Account Type:</strong> Guest</p>
                </div>
                `}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="homepage-tile" onclick="navigateTo('dashboard')">
                        <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
                        <h4 style="color: #333; font-size: 14px;">Dashboard</h4>
                    </div>
                    <div class="homepage-tile" onclick="navigateTo('community')">
                        <div style="font-size: 32px; margin-bottom: 10px;">👥</div>
                        <h4 style="color: #333; font-size: 14px;">Community</h4>
                    </div>
                    <div class="homepage-tile" onclick="navigateTo('settings')">
                        <div style="font-size: 32px; margin-bottom: 10px;">⚙️</div>
                        <h4 style="color: #333; font-size: 14px;">Settings</h4>
                    </div>
                    <div class="homepage-tile" onclick="navigateTo('messages')">
                        <div style="font-size: 32px; margin-bottom: 10px;">💬</div>
                        <h4 style="color: #333; font-size: 14px;">Messages</h4>
                    </div>
                </div>
            </div>
        `;

        // Add tile styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .homepage-tile {
                background: white;
                padding: 20px;
                border-radius: 10px;
                border: 2px solid #e0e0e0;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .homepage-tile:hover {
                border-color: #667eea;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
            }
        `;
        document.head.appendChild(style);
        
        loginContainer.classList.remove('fade-out');
    }, 300);
}

// Navigation function for homepage tiles
function navigateTo(page) {
    console.log(`Navigating to: ${page}`);
    alert(`You clicked on ${page}!\n\nThis would navigate to the ${page} page.`);
    // You can add actual navigation logic here
    // window.location.href = page + '.html';
}