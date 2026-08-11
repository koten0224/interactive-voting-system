document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loading');
    const votingState = document.getElementById('voting-state');
    const resultsState = document.getElementById('results-state');
    
    // Modal
    const headerLoginBtn = document.getElementById('header-login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');

    const voteBtns = document.querySelectorAll('.vote-btn');
    const errorMessage = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    
    const adminControls = document.getElementById('admin-controls');
    const resetBtn = document.getElementById('reset-btn');
    
    const userControls = document.getElementById('user-controls');
    const revoteBtn = document.getElementById('revote-btn');

    // Centralized mapping for option display names (Now injected by EJS into window)
    let displayNames = window.displayNames || {};

    let pollInterval = null;
    let currentUserRole = 'user';

    // Initialize App
    async function init() {
        try {
            // Check auth status
            const authRes = await fetch('/api/auth/status');
            const authData = await authRes.json();

            if (authData.authenticated && authData.role === 'admin') {
                currentUserRole = 'admin';
                updateHeaderButtonState(true);
            }

            await proceedToApp();
        } catch (error) {
            console.error('Error initializing:', error);
            showError('無法連線至伺服器 (Cannot connect to server)', errorMessage);
        }
    }

    // Modal Events
    headerLoginBtn.addEventListener('click', async () => {
        if (currentUserRole === 'admin') {
            // Logout
            try {
                await fetch('/api/logout', { method: 'POST' });
                currentUserRole = 'user';
                updateHeaderButtonState(false);
                adminControls.classList.add('hidden');
                userControls.classList.remove('hidden');
                
                // Proceed based on voting status
                await proceedToApp();
            } catch (error) {
                console.error('Logout failed:', error);
            }
        } else {
            // Open Modal
            loginModal.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
            loginError.classList.add('hidden');
        }
    });

    closeModalBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });

    function updateHeaderButtonState(isAdmin) {
        if (isAdmin) {
            headerLoginBtn.classList.add('logged-in');
            headerLoginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                <span>已登入 (Admin)</span>
            `;
            if (!resultsState.classList.contains('hidden')) {
                adminControls.classList.remove('hidden');
            }
        } else {
            headerLoginBtn.classList.remove('logged-in');
            headerLoginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span>管理員登入</span>
            `;
        }
    }

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = passwordInput.value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (data.success) {
                currentUserRole = 'admin';
                loginModal.classList.add('hidden');
                updateHeaderButtonState(true);
                
                // Admin directly views results and skips voting form
                await proceedToApp();
            } else {
                showError(data.message, loginError);
            }
        } catch (error) {
            showError('登入失敗，請稍後再試', loginError);
        }
    });

    // Check if user has voted and show correct state
    async function proceedToApp() {
        loadingState.classList.remove('hidden');
        votingState.classList.add('hidden');
        resultsState.classList.add('hidden');

        try {
            const res = await fetch('/api/results');
            const data = await res.json();

            // Admin forces result view; User views results if voted
            if (currentUserRole === 'admin' || data.hasVoted) {
                showResultsState(data.votes);
                startPolling();
            } else {
                if (pollInterval) clearInterval(pollInterval); // Stop polling if returning to vote
                
                restoreVotingButtons(); // Ensure buttons are clickable and not stuck on spinner

                // Show voting state directly
                loadingState.classList.add('hidden');
                votingState.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error proceeding:', error);
        }
    }

    function restoreVotingButtons() {
        voteBtns.forEach(b => {
            b.disabled = false;
            const option = b.getAttribute('data-option');
            if (displayNames[option]) {
                b.innerHTML = `
                    <div class="btn-content">
                        <span>${displayNames[option].title}</span>
                        <small>${displayNames[option].subtitle}</small>
                    </div>
                `;
            }
        });
    }

    // Revote Button
    revoteBtn.addEventListener('click', () => {
        if (pollInterval) clearInterval(pollInterval);
        
        restoreVotingButtons();
        
        resultsState.classList.add('hidden');
        votingState.classList.remove('hidden');
    });

    // Handle Vote Button Clicks
    voteBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (currentUserRole === 'admin') {
                showError('管理員無法投票 (Admins cannot vote)', errorMessage);
                return;
            }

            const option = btn.getAttribute('data-option');
            
            // Disable buttons to prevent double click
            voteBtns.forEach(b => b.disabled = true);
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0; border-width: 2px;"></div>';

            try {
                const res = await fetch('/api/vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ option })
                });

                const data = await res.json();

                if (data.success) {
                    await proceedToApp();
                } else {
                    showError(data.message, errorMessage);
                    btn.innerHTML = originalHTML;
                    voteBtns.forEach(b => b.disabled = false);
                }
            } catch (error) {
                showError('投票失敗，請稍後再試', errorMessage);
                btn.innerHTML = originalHTML;
                voteBtns.forEach(b => b.disabled = false);
            }
        });
    });

    // Show Results State
    function showResultsState(votes) {
        loadingState.classList.add('hidden');
        votingState.classList.add('hidden');
        resultsState.classList.remove('hidden');
        updateResultsUI(votes);

        // Show Admin controls if role is admin
        if (currentUserRole === 'admin') {
            adminControls.classList.remove('hidden');
            userControls.classList.add('hidden');
        } else {
            adminControls.classList.add('hidden');
            userControls.classList.remove('hidden');
        }
    }

    // Reset Votes (Admin only)
    resetBtn.addEventListener('click', async () => {
        if (!confirm('確定要重置所有票數嗎？(Are you sure you want to reset all votes?)')) return;
        
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            const data = await res.json();
            
            if (data.success) {
                // Refresh results immediately
                const resultsRes = await fetch('/api/results');
                const resultsData = await resultsRes.json();
                updateResultsUI(resultsData.votes);
                alert('重置成功！');
            } else {
                alert('重置失敗: ' + data.message);
            }
        } catch (error) {
            alert('發生錯誤');
        }
    });

    // Update Results UI
    function updateResultsUI(votes) {
        let totalVotes = 0;
        for (const key in votes) {
            totalVotes += votes[key];
        }

        const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);

        sortedVotes.forEach(([option, count], index) => {
            const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
            const nameData = displayNames[option] || { title: option, subtitle: '' };
            const displayName = `${nameData.title}：${nameData.subtitle}`.trim();
            
            // Try to find existing element to avoid re-rendering and animation reset
            let resultItem = document.getElementById(`result-${option}`);
            
            if (!resultItem) {
                // First time rendering this option
                let gradientClass = '';
                if (option === 'red') {
                    gradientClass = 'background: linear-gradient(90deg, #f87171, #ef4444);';
                } else if (option === 'green') {
                    gradientClass = 'background: linear-gradient(90deg, #34d399, #10b981);';
                }

                resultItem = document.createElement('div');
                resultItem.id = `result-${option}`;
                resultItem.className = 'result-item';
                // Use a transition for smooth reordering
                resultItem.style.transition = 'order 0.5s ease, transform 0.5s ease';
                resultItem.innerHTML = `
                    <div class="result-info">
                        <span class="result-name"></span>
                        <span class="result-count"></span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar" style="width: 0%; ${gradientClass}"></div>
                    </div>
                `;
                resultsContainer.appendChild(resultItem);
            }

            // Update content and styling
            resultItem.style.order = index; // CSS Flexbox order for sorting without DOM manipulation
            resultItem.querySelector('.result-name').textContent = displayName;
            resultItem.querySelector('.result-count').textContent = `${count} 票 (${percentage}%)`;

            // Update progress bar width (CSS transition will animate the slide smoothly)
            setTimeout(() => {
                const bar = resultItem.querySelector('.progress-bar');
                if (bar) bar.style.width = `${percentage}%`;
            }, 10);
        });
    }

    // Poll for real-time updates
    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        
        pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/results');
                const data = await res.json();
                updateResultsUI(data.votes);
            } catch (error) {
                console.error('Error polling results:', error);
            }
        }, 3000);
    }

    function showError(msg, element) {
        element.textContent = msg;
        element.classList.remove('hidden');
        setTimeout(() => {
            element.classList.add('hidden');
        }, 3000);
    }

    // Start
    init();
});
