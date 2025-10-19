// Data Storage Management
class StorageManager {
    constructor() {
        this.usersKey = 'smarttani_users';
        this.currentUserKey = 'smarttani_current_user';
        this.plantsKey = 'smarttani_plants';
        this.initStorage();
    }

    initStorage() {
        // Initialize users if not exists
        if (!localStorage.getItem(this.usersKey)) {
            const defaultUsers = [
                {
                    id: 1,
                    name: 'Petani',
                    email: 'petani@gmail.com',
                    password: 'petani123'
                }
            ];
            localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
        }

        // Initialize plants if not exists
        if (!localStorage.getItem(this.plantsKey)) {
            const defaultPlants = [
                {
                    id: 1,
                    userId: 1,
                    name: 'Padi Sawah',
                    type: 'padi',
                    plantingDate: new Date().toISOString().split('T')[0],
                    wateringSchedule: 2,
                    fertilizingSchedule: 14,
                    harvestDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    notes: 'Padi varietas unggul',
                    lastWatered: new Date().toISOString().split('T')[0],
                    lastFertilized: new Date().toISOString().split('T')[0],
                    status: 'active'
                }
            ];
            localStorage.setItem(this.plantsKey, JSON.stringify(defaultPlants));
        }
    }

    // User management
    getUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey)) || [];
    }

    saveUsers(users) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
    }

    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }

    setCurrentUser(user) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    }

    clearCurrentUser() {
        localStorage.removeItem(this.currentUserKey);
    }

    // Plant management
    getPlants() {
        return JSON.parse(localStorage.getItem(this.plantsKey)) || [];
    }

    savePlants(plants) {
        localStorage.setItem(this.plantsKey, JSON.stringify(plants));
    }

    getPlantsByUser(userId) {
        const plants = this.getPlants();
        return plants.filter(plant => plant.userId === userId && plant.status === 'active');
    }

    addPlant(plant) {
        const plants = this.getPlants();
        plant.id = plants.length > 0 ? Math.max(...plants.map(p => p.id)) + 1 : 1;
        plants.push(plant);
        this.savePlants(plants);
        return plant;
    }

    updatePlant(updatedPlant) {
        const plants = this.getPlants();
        const index = plants.findIndex(p => p.id === updatedPlant.id);
        if (index !== -1) {
            plants[index] = updatedPlant;
            this.savePlants(plants);
            return true;
        }
        return false;
    }

    deletePlant(plantId) {
        const plants = this.getPlants();
        const index = plants.findIndex(p => p.id === plantId);
        if (index !== -1) {
            plants[index].status = 'deleted';
            this.savePlants(plants);
            return true;
        }
        return false;
    }
}

// Notification System
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Set icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        this.container.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
        
        // Allow manual close on click
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Updated Google Sign-In Manager with Email Verification
class GoogleSignInManager {
    constructor() {
        this.isInitialized = false;
        this.availableAccounts = [];
    }

    init() {
        this.loadGoogleAccounts();
        this.isInitialized = true;
    }

    async loadGoogleAccounts() {
        try {
            // Method 1: Try to get accounts from browser's password manager
            this.availableAccounts = await this.getAccountsFromBrowser();
            
            // Method 2: Check for previously used Google accounts in our app
            const storage = new StorageManager();
            const users = storage.getUsers();
            const googleUsers = users.filter(user => 
                user.email.includes('@gmail.com') || 
                user.email.includes('@googlemail.com') ||
                user.isGoogleUser
            );
            
            googleUsers.forEach(user => {
                if (!this.availableAccounts.find(acc => acc.email === user.email)) {
                    this.availableAccounts.push({
                        name: user.name,
                        email: user.email,
                        picture: user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4285F4&color=fff`,
                        isExistingUser: true,
                        userId: user.id
                    });
                }
            });

            // Method 3: If no accounts found, check for common patterns
            if (this.availableAccounts.length === 0) {
                this.detectPotentialGmailAccounts();
            }
            
        } catch (error) {
            console.error('Error loading Google accounts:', error);
            this.availableAccounts = [];
        }
    }

    async getAccountsFromBrowser() {
        const accounts = [];
        
        // Try to use Credential Management API if available
        if (navigator.credentials && navigator.credentials.get) {
            try {
                const credential = await navigator.credentials.get({
                    password: true,
                    mediation: 'optional'
                });
                
                if (credential && credential.id) {
                    // Check if it's a Gmail account
                    if (this.isValidGmail(credential.id)) {
                        accounts.push({
                            name: this.extractNameFromEmail(credential.id),
                            email: credential.id,
                            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.extractNameFromEmail(credential.id))}&background=4285F4&color=fff`,
                            source: 'browser'
                        });
                    }
                }
            } catch (error) {
                console.log('Credential Management API not available or user denied:', error);
            }
        }
        
        return accounts;
    }

    detectPotentialGmailAccounts() {
        // Check localStorage for any signs of Google account usage
        const hasGoogleHistory = Object.keys(localStorage).some(key => 
            key.toLowerCase().includes('google') || 
            key.toLowerCase().includes('gmail')
        );
        
        if (hasGoogleHistory) {
            this.availableAccounts.push({
                name: 'Akun Google Anda',
                email: '',
                picture: 'https://ui-avatars.com/api/?name=Google&background=4285F4&color=fff',
                isManual: true
            });
        }
    }

    extractNameFromEmail(email) {
        const username = email.split('@')[0];
        // Convert username to proper name format
        return username
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }

    isValidGmail(email) {
        const gmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(gmail|googlemail)\.com$/;
        return gmailRegex.test(email);
    }

    showGoogleAccountSelection() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        if (this.availableAccounts.length > 0) {
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fab fa-google" style="color: #4285F4;"></i> Pilih Akun Google</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Pilih akun Google untuk login:</p>
                        <div class="google-account-list" id="google-account-list">
                            ${this.availableAccounts.map((account, index) => `
                                <div class="google-account-item" data-index="${index}">
                                    <img src="${account.picture}" alt="${account.name}" onerror="this.src='https://ui-avatars.com/api/?name=G&background=4285F4&color=fff'">
                                    <div class="google-account-info">
                                        <div class="google-account-name">${account.name}</div>
                                        <div class="google-account-email">${account.email || 'Klik untuk memasukkan email'}</div>
                                    </div>
                                    ${account.isExistingUser ? '<div class="account-badge">Terdaftar</div>' : ''}
                                    ${account.isManual ? '<div class="account-badge manual">Manual</div>' : ''}
                                    ${account.isExistingUser ? `
                                        <button class="delete-account-btn" data-account-index="${index}" title="Hapus akun">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <div style="text-align: center; margin-top: 15px;">
                            <button class="btn-secondary" id="use-different-account">
                                <i class="fas fa-plus"></i> Gunakan Akun Lain
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancel-google">Batal</button>
                        <button class="btn-primary" id="confirm-google" disabled>Pilih Akun</button>
                    </div>
                </div>
            `;
        } else {
            // If no accounts detected, show manual input directly
            this.showManualGoogleInput(modal);
            return;
        }

        document.body.appendChild(modal);
        this.setupGoogleModalListeners(modal);
    }

    setupGoogleModalListeners(modal) {
        const closeModal = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('#cancel-google');
        const confirmBtn = modal.querySelector('#confirm-google');
        const accountItems = modal.querySelectorAll('.google-account-item');
        const useDifferentBtn = modal.querySelector('#use-different-account');
        const deleteButtons = modal.querySelectorAll('.delete-account-btn');

        let selectedAccount = null;

        // Account selection
        accountItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger selection if delete button was clicked
                if (e.target.closest('.delete-account-btn')) {
                    return;
                }
                
                accountItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const accountIndex = parseInt(item.dataset.index);
                selectedAccount = this.availableAccounts[accountIndex];
                
                // If it's a manual account, show input field
                if (selectedAccount.isManual) {
                    this.showManualGoogleInput(modal);
                    return;
                }
                
                confirmBtn.disabled = false;
            });
        });

        // Delete account functionality
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering account selection
                const accountIndex = parseInt(button.dataset.accountIndex);
                const account = this.availableAccounts[accountIndex];
                this.showDeleteConfirmation(account, accountIndex, modal);
            });
        });

        // Button events
        closeModal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        confirmBtn.addEventListener('click', () => {
            if (selectedAccount) {
                this.processGoogleSignIn(selectedAccount);
                document.body.removeChild(modal);
            }
        });

        if (useDifferentBtn) {
            useDifferentBtn.addEventListener('click', () => {
                this.showManualGoogleInput(modal);
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showDeleteConfirmation(account, accountIndex, parentModal) {
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'modal confirmation-modal';
        confirmationModal.style.display = 'block';
        
        confirmationModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i> Hapus Akun</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Apakah Anda yakin ingin menghapus akun <strong>${account.name}</strong> (${account.email}) dari daftar akun terdaftar?</p>
                    <p style="font-size: 14px; color: var(--text-light); margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> Akun akan dihapus dari daftar login Google, tetapi data tanaman yang terkait akan tetap tersimpan.
                    </p>
                </div>
                <div class="modal-footer">
                    <div class="confirmation-actions">
                        <button class="btn-secondary" id="cancel-delete">Batal</button>
                        <button class="btn-danger" id="confirm-delete">Hapus Akun</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(confirmationModal);

        const closeModal = confirmationModal.querySelector('.close-modal');
        const cancelBtn = confirmationModal.querySelector('#cancel-delete');
        const confirmBtn = confirmationModal.querySelector('#confirm-delete');

        closeModal.addEventListener('click', () => {
            document.body.removeChild(confirmationModal);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(confirmationModal);
        });

        confirmBtn.addEventListener('click', () => {
            this.deleteGoogleAccount(account, accountIndex);
            document.body.removeChild(confirmationModal);
            document.body.removeChild(parentModal);
            this.showGoogleAccountSelection(); // Refresh the account list
        });

        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) {
                document.body.removeChild(confirmationModal);
            }
        });
    }

    deleteGoogleAccount(account, accountIndex) {
        const storage = new StorageManager();
        const users = storage.getUsers();
        
        // Remove the Google user from users list
        const updatedUsers = users.filter(user => 
            !(user.email === account.email && user.isGoogleUser)
        );
        
        storage.saveUsers(updatedUsers);
        
        // Remove from available accounts
        this.availableAccounts.splice(accountIndex, 1);
        
        const notification = new NotificationManager();
        notification.show(`Akun ${account.email} berhasil dihapus dari daftar`, 'success');
    }

    showManualGoogleInput(modal) {
        if (!modal.parentNode) {
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fab fa-google" style="color: #4285F4;"></i> Masuk dengan Google</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Masukkan email Google Anda:</p>
                        <div class="form-group">
                            <div class="input-with-icon">
                                <i class="fab fa-google" style="color: #4285F4;"></i>
                                <input type="email" id="manual-google-email" placeholder="email@gmail.com" required>
                            </div>
                        </div>
                        <div class="google-info">
                            <p><small>Anda akan diarahkan ke halaman autentikasi Google</small></p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancel-google">Batal</button>
                        <button class="btn-primary" id="confirm-google">Lanjutkan</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.querySelector('.modal-body').innerHTML = `
                <p>Masukkan email Google Anda:</p>
                <div class="form-group">
                    <div class="input-with-icon">
                        <i class="fab fa-google" style="color: #4285F4;"></i>
                        <input type="email" id="manual-google-email" placeholder="email@gmail.com" required>
                    </div>
                </div>
                <div class="google-info">
                    <p><small>Anda akan diarahkan ke halaman autentikasi Google</small></p>
                </div>
                ${this.availableAccounts.length > 0 ? `
                <div style="text-align: center; margin-top: 15px;">
                    <button class="btn-secondary" id="back-to-accounts">
                        <i class="fas fa-arrow-left"></i> Kembali ke Daftar Akun
                    </button>
                </div>
                ` : ''}
            `;
        }

        const backBtn = modal.querySelector('#back-to-accounts');
        const emailInput = modal.querySelector('#manual-google-email');
        const confirmBtn = modal.querySelector('#confirm-google');
        const closeModal = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('#cancel-google');

        confirmBtn.disabled = true;

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showGoogleAccountSelection();
                document.body.removeChild(modal);
            });
        }

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                confirmBtn.disabled = !this.isValidGmail(emailInput.value);
            });

            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && this.isValidGmail(emailInput.value)) {
                    this.processManualGoogleSignIn(emailInput.value);
                    document.body.removeChild(modal);
                }
            });

            emailInput.focus();
        }

        confirmBtn.addEventListener('click', () => {
            const email = emailInput?.value;
            if (email && this.isValidGmail(email)) {
                this.processManualGoogleSignIn(email);
                document.body.removeChild(modal);
            } else {
                this.showError(modal, 'Harap masukkan email Google yang valid');
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showError(modal, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            color: #d32f2f;
            background: #ffebee;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 14px;
            border-left: 4px solid #d32f2f;
        `;
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        const existingError = modal.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        const modalBody = modal.querySelector('.modal-body');
        modalBody.appendChild(errorDiv);
    }

    processManualGoogleSignIn(email) {
        const manualAccount = {
            name: this.extractNameFromEmail(email),
            email: email,
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.extractNameFromEmail(email))}&background=4285F4&color=fff`
        };

        this.processGoogleSignIn(manualAccount);
    }

    processGoogleSignIn(account) {
        // Simulate Google OAuth flow with email verification
        this.showGoogleVerification(account);
    }
    
    showGoogleVerification(account) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fab fa-google" style="color: #4285F4;"></i> Verifikasi Email</h3>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 20px 0;">
                        <div class="loading-spinner" style="font-size: 48px; color: #4285F4; margin-bottom: 20px;">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <h4>Verifikasi Email Google</h4>
                        <p>Kami telah mengirimkan tautan verifikasi ke <strong>${account.email}</strong></p>
                        <p>Silakan buka email Anda dan klik tautan verifikasi untuk melanjutkan login.</p>
                        <div class="verification-info" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <p><strong>Email:</strong> ${account.email}</p>
                            <p><small>Jika tidak menemukan email, periksa folder spam atau junk mail.</small></p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancel-verification">Batal</button>
                    <button class="btn-primary" id="resend-verification">Kirim Ulang</button>
                    <button class="btn-primary" id="continue-after-verification" style="display: none;">Lanjutkan</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const cancelBtn = modal.querySelector('#cancel-verification');
        const resendBtn = modal.querySelector('#resend-verification');
        const continueBtn = modal.querySelector('#continue-after-verification');
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        resendBtn.addEventListener('click', () => {
            this.notification.show('Tautan verifikasi telah dikirim ulang', 'info');
        });
        
        // Simulate email verification process
        setTimeout(() => {
            resendBtn.style.display = 'none';
            continueBtn.style.display = 'block';
            
            continueBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                this.finalizeGoogleSignIn(account);
            });
        }, 3000);
    }

    finalizeGoogleSignIn(account) {
        const user = {
            id: 'google_' + Date.now(),
            name: account.name,
            email: account.email,
            isGoogleUser: true,
            picture: account.picture
        };

        const storage = new StorageManager();
        const users = storage.getUsers();
        
        // Check if user exists, if not create new
        let existingUser = users.find(u => u.email === user.email);
        if (!existingUser) {
            user.id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
            users.push(user);
            storage.saveUsers(users);
            existingUser = user;
        }
        
        storage.setCurrentUser(existingUser);
        
        const notification = new NotificationManager();
        notification.show(`Berhasil masuk dengan Google! Selamat datang ${user.name}`, 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // Google Sign-In entry point
    demoGoogleSignIn() {
        this.showGoogleAccountSelection();
    }
}

// Updated Forgot Password Manager - Email Only Verification
class ForgotPasswordManager {
    constructor() {
        this.modal = document.getElementById('forgot-password-modal');
        this.currentStep = 1;
        this.resetEmail = '';
        this.init();
    }

    init() {
        const forgotLink = document.getElementById('forgot-password-link');
        if (!forgotLink || !this.modal) return;

        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal();
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    }

    showModal() {
        if (this.modal) {
            this.modal.style.display = 'block';
            this.resetToStep1();
        }
    }

    hideModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.resetToStep1();
        }
    }

    resetToStep1() {
        this.currentStep = 1;
        this.resetEmail = '';
        this.updateModalContent();
    }

    updateModalContent() {
        const modalBody = this.modal.querySelector('.modal-body');
        const modalFooter = this.modal.querySelector('.modal-footer');
        const modalHeader = this.modal.querySelector('.modal-header h3');

        if (this.currentStep === 1) {
            modalHeader.textContent = 'Reset Password';
            modalBody.innerHTML = `
                <div class="reset-steps">
                    <div class="step active">
                        <div class="step-number">1</div>
                        <div class="step-text">Verifikasi Email</div>
                    </div>
                    <div class="step-connector"></div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-text">Password Baru</div>
                    </div>
                </div>
                <p>Masukkan email yang terdaftar:</p>
                <div class="form-group">
                    <div class="input-with-icon">
                        <i class="fas fa-envelope"></i>
                        <input type="email" id="reset-email" placeholder="Email Anda" class="full-width" required>
                    </div>
                </div>
                <div class="form-help">
                    <small>Masukkan email yang Anda gunakan saat mendaftar</small>
                </div>
            `;
            modalFooter.innerHTML = `
                <button class="btn-secondary" id="cancel-reset">Batal</button>
                <button class="btn-primary" id="send-reset">Verifikasi Email</button>
            `;

            this.setupStep1Listeners();
        } else if (this.currentStep === 2) {
            modalHeader.textContent = 'Buat Password Baru';
            modalBody.innerHTML = `
                <div class="reset-steps">
                    <div class="step active">
                        <div class="step-number">1</div>
                        <div class="step-text">Verifikasi Email</div>
                    </div>
                    <div class="step-connector active"></div>
                    <div class="step active">
                        <div class="step-number">2</div>
                        <div class="step-text">Password Baru</div>
                    </div>
                </div>
                <p>Buat password baru untuk akun <strong>${this.resetEmail}</strong></p>
                <div class="reset-form">
                    <div class="form-group">
                        <label for="new-password">Password Baru</label>
                        <div class="input-with-icon password-container">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="new-password" placeholder="Masukkan password baru" required>
                            <button type="button" class="toggle-password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="confirm-new-password">Konfirmasi Password Baru</label>
                        <div class="input-with-icon password-container">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="confirm-new-password" placeholder="Konfirmasi password baru" required>
                            <button type="button" class="toggle-password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="password-requirements">
                        <h4>Password harus memenuhi:</h4>
                        <ul>
                            <li id="req-length">Minimal 8 karakter</li>
                            <li id="req-uppercase">Minimal 1 huruf besar</li>
                            <li id="req-lowercase">Minimal 1 huruf kecil</li>
                            <li id="req-number">Minimal 1 angka</li>
                        </ul>
                    </div>
                </div>
            `;
            modalFooter.innerHTML = `
                <button class="btn-secondary" id="back-to-email">Kembali</button>
                <button class="btn-primary" id="save-new-password" disabled>Simpan Password</button>
            `;

            this.setupStep2Listeners();
        } else if (this.currentStep === 3) {
            modalHeader.textContent = 'Password Berhasil Diubah';
            modalBody.innerHTML = `
                <div class="reset-success">
                    <i class="fas fa-check-circle"></i>
                    <h3>Berhasil!</h3>
                    <p>Password Anda telah berhasil diubah. Silakan login dengan password baru Anda.</p>
                </div>
            `;
            modalFooter.innerHTML = `
                <button class="btn-primary" id="close-success">Tutup</button>
            `;

            this.setupStep3Listeners();
        }
    }

    setupStep1Listeners() {
        const cancelBtn = document.getElementById('cancel-reset');
        const sendBtn = document.getElementById('send-reset');
        const emailInput = document.getElementById('reset-email');
        const closeModal = this.modal.querySelector('.close-modal');

        if (closeModal) closeModal.addEventListener('click', () => this.hideModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal());
        if (sendBtn) sendBtn.addEventListener('click', () => this.verifyEmail());
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyEmail();
                }
            });
            emailInput.focus();
        }
    }

    setupStep2Listeners() {
        const backBtn = document.getElementById('back-to-email');
        const saveBtn = document.getElementById('save-new-password');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');
        const closeModal = this.modal.querySelector('.close-modal');

        if (closeModal) closeModal.addEventListener('click', () => this.hideModal());
        if (backBtn) backBtn.addEventListener('click', () => {
            this.currentStep = 1;
            this.updateModalContent();
        });

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveNewPassword());

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => this.validatePassword());
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePassword());
        }

        // Toggle password visibility akan ditangani oleh event delegation di SmartTaniApp
        if (newPasswordInput) newPasswordInput.focus();
    }

    setupStep3Listeners() {
        const closeBtn = document.getElementById('close-success');
        const closeModal = this.modal.querySelector('.close-modal');

        if (closeModal) closeModal.addEventListener('click', () => this.hideModal());
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
                window.location.href = 'login.html';
            });
        }
    }

    verifyEmail() {
        const email = document.getElementById('reset-email')?.value;
        const notification = new NotificationManager();

        if (!email) {
            notification.show('Harap masukkan email', 'error');
            return;
        }

        // Check if email exists in users
        const storage = new StorageManager();
        const users = storage.getUsers();
        
        // Check by email only
        const userExists = users.some(user => user.email === email);

        if (!userExists) {
            notification.show('Email tidak terdaftar dalam sistem', 'error');
            return;
        }

        this.resetEmail = email;
        this.currentStep = 2;
        this.updateModalContent();
    }

    validatePassword() {
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-new-password')?.value;
        const saveBtn = document.getElementById('save-new-password');
        
        const requirements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            lowercase: document.getElementById('req-lowercase'),
            number: document.getElementById('req-number')
        };

        let isValid = true;

        if (newPassword) {
            // Check length
            if (newPassword.length >= 8) {
                requirements.length.classList.add('valid');
            } else {
                requirements.length.classList.remove('valid');
                isValid = false;
            }

            // Check uppercase
            if (/[A-Z]/.test(newPassword)) {
                requirements.uppercase.classList.add('valid');
            } else {
                requirements.uppercase.classList.remove('valid');
                isValid = false;
            }

            // Check lowercase
            if (/[a-z]/.test(newPassword)) {
                requirements.lowercase.classList.add('valid');
            } else {
                requirements.lowercase.classList.remove('valid');
                isValid = false;
            }

            // Check number
            if (/[0-9]/.test(newPassword)) {
                requirements.number.classList.add('valid');
            } else {
                requirements.number.classList.remove('valid');
                isValid = false;
            }
        }

        // Check if passwords match and all requirements are met
        if (newPassword && confirmPassword) {
            if (newPassword === confirmPassword && isValid) {
                saveBtn.disabled = false;
            } else {
                saveBtn.disabled = true;
            }
        } else {
            saveBtn.disabled = true;
        }
    }

    saveNewPassword() {
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-new-password')?.value;
        const notification = new NotificationManager();

        if (!newPassword || !confirmPassword) {
            notification.show('Harap isi semua field', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            notification.show('Password tidak cocok', 'error');
            return;
        }

        // Check password strength
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || 
            !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            notification.show('Password harus memenuhi semua persyaratan keamanan', 'error');
            return;
        }

        // Update password in storage
        const storage = new StorageManager();
        const users = storage.getUsers();
        const userIndex = users.findIndex(user => user.email === this.resetEmail);

        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            storage.saveUsers(users);
            
            this.currentStep = 3;
            this.updateModalContent();
            
            // Show success notification
            notification.show('Password berhasil diubah! Silakan login dengan password baru.', 'success');
        } else {
            notification.show('Terjadi kesalahan saat mengubah password', 'error');
        }
    }
}

// Calendar Management
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.events = [];
    }

    generateCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        const calendar = [];
        let dayCount = 1;
        
        for (let i = 0; i < 6; i++) {
            const week = [];
            
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < startingDay) {
                    week.push({ day: null });
                } else if (dayCount > daysInMonth) {
                    week.push({ day: null });
                } else {
                    const date = new Date(year, month, dayCount);
                    const dateString = date.toISOString().split('T')[0];
                    const events = this.getEventsForDate(dateString);
                    
                    week.push({
                        day: dayCount,
                        date: dateString,
                        isToday: this.isToday(date),
                        events: events
                    });
                    
                    dayCount++;
                }
            }
            
            calendar.push(week);
            if (dayCount > daysInMonth) break;
        }
        
        return calendar;
    }

    setEvents(events) {
        this.events = events;
    }

    getEventsForDate(dateString) {
        return this.events.filter(event => event.date === dateString);
    }

    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    getMonthName(month) {
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return months[month];
    }
}

// Plant Status Calculator
class PlantStatusCalculator {
    static calculateStatus(plant) {
        const today = new Date();
        const lastWatered = new Date(plant.lastWatered);
        const lastFertilized = new Date(plant.lastFertilized);
        const harvestDate = new Date(plant.harvestDate);
        
        const daysSinceWatered = Math.floor((today - lastWatered) / (1000 * 60 * 60 * 24));
        const daysSinceFertilized = Math.floor((today - lastFertilized) / (1000 * 60 * 60 * 24));
        const daysToHarvest = Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24));
        
        const needsWater = daysSinceWatered >= plant.wateringSchedule;
        const needsFertilizer = daysSinceFertilized >= plant.fertilizingSchedule;
        const isHarvestClose = daysToHarvest <= 7 && daysToHarvest >= 0;
        const isHarvestOverdue = daysToHarvest < 0;
        
        return {
            needsWater,
            needsFertilizer,
            isHarvestClose,
            isHarvestOverdue,
            daysToHarvest
        };
    }
    
    static getNextWateringDate(plant) {
        const lastWatered = new Date(plant.lastWatered);
        const nextWatering = new Date(lastWatered);
        nextWatering.setDate(nextWatering.getDate() + plant.wateringSchedule);
        return nextWatering.toISOString().split('T')[0];
    }
    
    static getNextFertilizingDate(plant) {
        const lastFertilized = new Date(plant.lastFertilized);
        const nextFertilizing = new Date(lastFertilized);
        nextFertilizing.setDate(nextFertilizing.getDate() + plant.fertilizingSchedule);
        return nextFertilizing.toISOString().split('T')[0];
    }
}

// Main Application
class SmartTaniApp {
    constructor() {
        this.storage = new StorageManager();
        this.notification = new NotificationManager();
        this.calendar = new CalendarManager();
        this.googleSignIn = new GoogleSignInManager();
        this.forgotPasswordManager = new ForgotPasswordManager();
        this.currentUser = this.storage.getCurrentUser();
        
        this.init();
    }

    init() {
        // Check authentication for protected pages
        this.checkAuthentication();
        
        // Initialize page-specific functionality
        this.initPage();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check for notifications
        this.checkNotifications();
    }

    checkAuthentication() {
        const protectedPages = ['index.html', 'tambah.html', 'edukasi.html'];
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (protectedPages.includes(currentPage) && !this.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        // Redirect to dashboard if already logged in and on auth pages
        const authPages = ['login.html', 'register.html'];
        if (authPages.includes(currentPage) && this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
    }

    initPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        switch(currentPage) {
            case 'index.html':
                this.initDashboard();
                break;
            case 'login.html':
                this.initLogin();
                break;
            case 'register.html':
                this.initRegister();
                break;
            case 'tambah.html':
                this.initAddPlant();
                break;
            case 'edukasi.html':
                this.initEducation();
                break;
        }
    }

    setupEventListeners() {
        // Global logout functionality
        const logoutButtons = document.querySelectorAll('#logout-btn');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
        
        // Toggle password visibility - FIXED: Tidak duplikat menggunakan event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-password')) {
                const button = e.target.closest('.toggle-password');
                const input = button.parentNode.querySelector('input');
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    }

    // Dashboard Initialization
    initDashboard() {
        if (!this.currentUser) return;
        
        this.updateUserInfo();
        this.loadPlants();
        this.loadCalendar();
        this.updateStats();
    }

    updateUserInfo() {
        const userNameElements = document.querySelectorAll('#user-name, #welcome-name');
        userNameElements.forEach(element => {
            if (this.currentUser) {
                element.textContent = this.currentUser.name;
                
                // Update avatar if Google user
                if (this.currentUser.isGoogleUser) {
                    const avatar = document.querySelector('.user-avatar');
                    if (avatar) {
                        avatar.src = this.currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.name)}&background=4CAF50&color=fff`;
                    }
                }
            }
        });
    }

    loadPlants() {
        const plantsGrid = document.getElementById('plants-grid');
        if (!plantsGrid) return;
        
        const plants = this.storage.getPlantsByUser(this.currentUser.id);
        
        if (plants.length === 0) {
            plantsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="fas fa-seedling" style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: #333;">Belum ada tanaman</h3>
                    <p style="margin-bottom: 20px; color: #666;">Tambahkan tanaman pertama Anda untuk mulai mengelola jadwal perawatan</p>
                    <a href="tambah.html" class="btn-primary">Tambah Tanaman</a>
                </div>
            `;
            return;
        }
        
        plantsGrid.innerHTML = '';
        
        plants.forEach(plant => {
            const status = PlantStatusCalculator.calculateStatus(plant);
            
            const plantCard = document.createElement('div');
            plantCard.className = 'plant-card';
            plantCard.innerHTML = `
                <div class="plant-header">
                    <div class="plant-name">${plant.name}</div>
                    <div class="plant-type">${this.getPlantTypeName(plant.type)}</div>
                </div>
                <div class="plant-body">
                    <div class="plant-details">
                        <div class="plant-detail">
                            <span>Tanggal Tanam:</span>
                            <span>${this.formatDate(plant.plantingDate)}</span>
                        </div>
                        <div class="plant-detail">
                            <span>Perkiraan Panen:</span>
                            <span>${this.formatDate(plant.harvestDate)}</span>
                        </div>
                    </div>
                    <div class="plant-status">
                        <div class="status-item">
                            <i class="fas fa-tint"></i>
                            <span>Penyiraman:</span>
                            <span class="status-badge ${status.needsWater ? 'warning' : 'completed'}">
                                ${status.needsWater ? 'Perlu Disiram' : 'Sudah Disiram'}
                            </span>
                        </div>
                        <div class="status-item">
                            <i class="fas fa-flask"></i>
                            <span>Pemupukan:</span>
                            <span class="status-badge ${status.needsFertilizer ? 'warning' : 'completed'}">
                                ${status.needsFertilizer ? 'Perlu Dipupuk' : 'Sudah Dipupuk'}
                            </span>
                        </div>
                        <div class="status-item">
                            <i class="fas fa-shopping-basket"></i>
                            <span>Panen:</span>
                            <span class="status-badge ${status.isHarvestClose || status.isHarvestOverdue ? 'warning' : 'completed'}">
                                ${status.isHarvestOverdue ? 'Siap Panen' : status.isHarvestClose ? 'Mendekati Panen' : 'Belum Waktunya'}
                            </span>
                        </div>
                    </div>
                    <div class="plant-actions">
                        <button class="btn-secondary mark-watered" data-plant-id="${plant.id}">
                            <i class="fas fa-tint"></i> Tandai Disiram
                        </button>
                        <button class="btn-secondary mark-fertilized" data-plant-id="${plant.id}">
                            <i class="fas fa-flask"></i> Tandai Dipupuk
                        </button>
                    </div>
                </div>
            `;
            
            plantsGrid.appendChild(plantCard);
        });
        
        this.setupPlantActionListeners();
    }

    setupPlantActionListeners() {
        const waterButtons = document.querySelectorAll('.mark-watered');
        waterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const plantId = parseInt(e.target.closest('button').dataset.plantId);
                this.markAsWatered(plantId);
            });
        });
        
        const fertilizeButtons = document.querySelectorAll('.mark-fertilized');
        fertilizeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const plantId = parseInt(e.target.closest('button').dataset.plantId);
                this.markAsFertilized(plantId);
            });
        });
    }

    markAsWatered(plantId) {
        const plants = this.storage.getPlants();
        const plant = plants.find(p => p.id === plantId);
        
        if (plant) {
            plant.lastWatered = new Date().toISOString().split('T')[0];
            this.storage.savePlants(plants);
            this.notification.show(`Tanaman ${plant.name} telah ditandai sebagai sudah disiram`, 'success');
            this.loadPlants();
            this.updateStats();
            this.loadCalendar();
        }
    }

    markAsFertilized(plantId) {
        const plants = this.storage.getPlants();
        const plant = plants.find(p => p.id === plantId);
        
        if (plant) {
            plant.lastFertilized = new Date().toISOString().split('T')[0];
            this.storage.savePlants(plants);
            this.notification.show(`Tanaman ${plant.name} telah ditandai sebagai sudah dipupuk`, 'success');
            this.loadPlants();
            this.updateStats();
            this.loadCalendar();
        }
    }

    updateStats() {
        const plants = this.storage.getPlantsByUser(this.currentUser.id);
        
        let needWaterCount = 0;
        let needFertilizerCount = 0;
        let harvestCloseCount = 0;
        
        plants.forEach(plant => {
            const status = PlantStatusCalculator.calculateStatus(plant);
            if (status.needsWater) needWaterCount++;
            if (status.needsFertilizer) needFertilizerCount++;
            if (status.isHarvestClose || status.isHarvestOverdue) harvestCloseCount++;
        });
        
        const totalPlants = document.getElementById('total-tanaman');
        const perluSiram = document.getElementById('perlu-siram');
        const perluPupuk = document.getElementById('perlu-pupuk');
        const hampirPanen = document.getElementById('hampir-panen');
        
        if (totalPlants) totalPlants.textContent = plants.length;
        if (perluSiram) perluSiram.textContent = needWaterCount;
        if (perluPupuk) perluPupuk.textContent = needFertilizerCount;
        if (hampirPanen) hampirPanen.textContent = harvestCloseCount;
    }

    loadCalendar() {
        const calendarElement = document.getElementById('calendar');
        const currentMonthElement = document.getElementById('current-month');
        
        if (!calendarElement || !currentMonthElement) return;
        
        const plants = this.storage.getPlantsByUser(this.currentUser.id);
        const events = [];
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        plants.forEach(plant => {
            // Watering events
            const lastWatered = new Date(plant.lastWatered);
            let nextWatering = new Date(lastWatered);
            
            while (nextWatering <= nextMonth) {
                nextWatering.setDate(nextWatering.getDate() + plant.wateringSchedule);
                if (nextWatering > today) {
                    events.push({
                        date: nextWatering.toISOString().split('T')[0],
                        type: 'siram',
                        plantName: plant.name
                    });
                }
            }
            
            // Fertilizing events
            const lastFertilized = new Date(plant.lastFertilized);
            let nextFertilizing = new Date(lastFertilized);
            
            while (nextFertilizing <= nextMonth) {
                nextFertilizing.setDate(nextFertilizing.getDate() + plant.fertilizingSchedule);
                if (nextFertilizing > today) {
                    events.push({
                        date: nextFertilizing.toISOString().split('T')[0],
                        type: 'pupuk',
                        plantName: plant.name
                    });
                }
            }
            
            // Harvest events
            const harvestDate = new Date(plant.harvestDate);
            if (harvestDate >= today && harvestDate <= nextMonth) {
                events.push({
                    date: harvestDate.toISOString().split('T')[0],
                    type: 'panen',
                    plantName: plant.name
                });
            }
        });
        
        this.calendar.setEvents(events);
        const calendar = this.calendar.generateCalendar(
            this.calendar.currentDate.getFullYear(),
            this.calendar.currentDate.getMonth()
        );
        
        currentMonthElement.textContent = 
            `${this.calendar.getMonthName(this.calendar.currentDate.getMonth())} ${this.calendar.currentDate.getFullYear()}`;
        
        calendarElement.innerHTML = '';
        
        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        days.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            calendarElement.appendChild(dayElement);
        });
        
        calendar.forEach(week => {
            week.forEach(day => {
                const dateElement = document.createElement('div');
                dateElement.className = 'calendar-date';
                
                if (day.day) {
                    dateElement.textContent = day.day;
                    
                    if (day.isToday) {
                        dateElement.classList.add('today');
                    }
                    
                    if (day.events && day.events.length > 0) {
                        const eventTypes = [...new Set(day.events.map(event => event.type))];
                        eventTypes.forEach(type => {
                            dateElement.classList.add(`event-${type}`);
                        });
                        dateElement.classList.add('has-event');
                        
                        const tooltip = day.events.map(event => {
                            const action = event.type === 'siram' ? 'Siram' : 
                                          event.type === 'pupuk' ? 'Pupuk' : 'Panen';
                            return `${action} ${event.plantName}`;
                        }).join('\n');
                        dateElement.title = tooltip;
                    }
                }
                
                calendarElement.appendChild(dateElement);
            });
        });
        
        const prevMonthButton = document.getElementById('prev-month');
        const nextMonthButton = document.getElementById('next-month');
        
        if (prevMonthButton) {
            prevMonthButton.addEventListener('click', () => {
                this.calendar.currentDate.setMonth(this.calendar.currentDate.getMonth() - 1);
                this.loadCalendar();
            });
        }
        
        if (nextMonthButton) {
            nextMonthButton.addEventListener('click', () => {
                this.calendar.currentDate.setMonth(this.calendar.currentDate.getMonth() + 1);
                this.loadCalendar();
            });
        }
    }

    // Login Page Initialization - DIPERBARUI DENGAN VALIDASI KETAT
    initLogin() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;
        
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            
            // Validasi field kosong
            if (!email || !password) {
                this.notification.show('Harap isi email dan password', 'error');
                return;
            }
            
            // Validasi centang "Ingat Saya" - HARUS DICENTANG
            if (!rememberMe) {
                this.notification.show('Harap centang "Ingat Saya" untuk melanjutkan login', 'error');
                
                // Highlight checkbox untuk perhatian user
                const rememberMeCheckbox = document.getElementById('remember-me');
                rememberMeCheckbox.parentElement.style.color = 'var(--danger)';
                rememberMeCheckbox.parentElement.style.fontWeight = '600';
                
                // Kembali ke warna normal setelah 3 detik
                setTimeout(() => {
                    rememberMeCheckbox.parentElement.style.color = '';
                    rememberMeCheckbox.parentElement.style.fontWeight = '';
                }, 3000);
                
                return;
            }
            
            // Jika semua validasi lolos, lanjutkan login
            this.login(email, password);
        });
        
        // Initialize Google Sign-In
        this.googleSignIn.init();
        
        // Google login button
        const googleButton = document.getElementById('google-login-btn');
        if (googleButton) {
            googleButton.addEventListener('click', () => {
                this.googleSignIn.demoGoogleSignIn();
            });
        }
    }

    // Login Function - DIPERBARUI
    login(email, password) {
        const users = this.storage.getUsers();
        
        // Cek apakah email terdaftar
        const userExists = users.find(u => u.email === email);
        
        if (!userExists) {
            this.notification.show('Maaf email Anda tidak terdaftar, harap daftar akun terlebih dahulu', 'error');
            return;
        }
        
        // Cek password jika email terdaftar
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            this.storage.setCurrentUser(user);
            this.notification.show('Login berhasil!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            this.notification.show('Password yang Anda masukkan salah', 'error');
        }
    }

    // Register Page Initialization
    initRegister() {
        const registerForm = document.getElementById('register-form');
        if (!registerForm) return;
        
        // Password strength indicator
        const passwordInput = document.getElementById('password');
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        
        if (passwordInput && strengthFill && strengthText) {
            passwordInput.addEventListener('input', () => {
                this.checkPasswordStrength(passwordInput.value, strengthFill, strengthText);
            });
        }
        
        // Password confirmation check
        const confirmPasswordInput = document.getElementById('confirm-password');
        const passwordMatch = document.getElementById('password-match');
        
        if (confirmPasswordInput && passwordMatch) {
            confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordMatch(
                    passwordInput.value, 
                    confirmPasswordInput.value, 
                    passwordMatch
                );
            });
        }
        
        // Terms and conditions modal
        const termsLink = document.getElementById('terms-link');
        const termsModal = document.getElementById('terms-modal');
        const agreeTermsBtn = document.getElementById('agree-terms-btn');
        
        if (termsLink && termsModal) {
            termsLink.addEventListener('click', (e) => {
                e.preventDefault();
                termsModal.style.display = 'block';
            });
        }
        
        if (agreeTermsBtn && termsModal) {
            agreeTermsBtn.addEventListener('click', () => {
                document.getElementById('agree-terms').checked = true;
                termsModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking X or outside
        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (termsModal) termsModal.style.display = 'none';
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === termsModal) {
                termsModal.style.display = 'none';
            }
        });
        
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const agreeTerms = document.getElementById('agree-terms').checked;
            
            this.register(email, password, confirmPassword, agreeTerms);
        });
    }

    register(email, password, confirmPassword, agreeTerms) {
        if (!email || !password) {
            this.notification.show('Harap isi semua field yang diperlukan', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.notification.show('Password tidak cocok', 'error');
            return;
        }
        
        if (!agreeTerms) {
            this.notification.show('Anda harus menyetujui syarat dan ketentuan', 'error');
            return;
        }
        
        const users = this.storage.getUsers();
        
        if (users.find(u => u.email === email)) {
            this.notification.show('Email sudah terdaftar', 'error');
            return;
        }
        
        // Generate nama dari email (username sebelum @)
        const nameFromEmail = email.split('@')[0];
        const name = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
        
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            name: name, // Generate nama dari email
            email: email,
            password: password
        };
        
        users.push(newUser);
        this.storage.saveUsers(users);
        this.storage.setCurrentUser(newUser);
        
        this.notification.show('Pendaftaran berhasil!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    checkPasswordStrength(password, strengthFill, strengthText) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        strengthFill.className = 'strength-fill';
        
        if (password.length === 0) {
            strengthText.textContent = 'Kekuatan password';
        } else if (strength <= 2) {
            strengthFill.classList.add('weak');
            strengthText.textContent = 'Lemah';
        } else if (strength <= 4) {
            strengthFill.classList.add('medium');
            strengthText.textContent = 'Sedang';
        } else {
            strengthFill.classList.add('strong');
            strengthText.textContent = 'Kuat';
        }
    }

    checkPasswordMatch(password, confirmPassword, matchElement) {
        if (confirmPassword === '') {
            matchElement.textContent = '';
            matchElement.className = 'validation-message';
        } else if (password === confirmPassword) {
            matchElement.textContent = 'Password cocok';
            matchElement.className = 'validation-message success';
        } else {
            matchElement.textContent = 'Password tidak cocok';
            matchElement.className = 'validation-message error';
        }
    }

    // Add Plant Page Initialization
    initAddPlant() {
        const addPlantForm = document.getElementById('add-plant-form');
        if (!addPlantForm) return;
        
        const plantingDateInput = document.getElementById('planting-date');
        const harvestDateInput = document.getElementById('harvest-date');
        
        if (plantingDateInput) {
            const today = new Date().toISOString().split('T')[0];
            plantingDateInput.min = today;
            plantingDateInput.value = today;
        }
        
        if (harvestDateInput) {
            const defaultHarvestDate = new Date();
            defaultHarvestDate.setDate(defaultHarvestDate.getDate() + 60);
            harvestDateInput.min = new Date().toISOString().split('T')[0];
            harvestDateInput.value = defaultHarvestDate.toISOString().split('T')[0];
        }
        
        addPlantForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const plantName = document.getElementById('plant-name').value;
            const plantType = document.getElementById('plant-type').value;
            const plantingDate = document.getElementById('planting-date').value;
            const wateringSchedule = parseInt(document.getElementById('watering-schedule').value);
            const fertilizingSchedule = parseInt(document.getElementById('fertilizing-schedule').value);
            const harvestDate = document.getElementById('harvest-date').value;
            const notes = document.getElementById('notes').value;
            
            if (!plantName || !plantType || !plantingDate || !harvestDate) {
                this.notification.show('Harap isi semua field yang diperlukan', 'error');
                return;
            }
            
            this.addPlant(plantName, plantType, plantingDate, wateringSchedule, fertilizingSchedule, harvestDate, notes);
        });
    }

    addPlant(name, type, plantingDate, wateringSchedule, fertilizingSchedule, harvestDate, notes) {
        if (!this.currentUser) {
            this.notification.show('Anda harus login untuk menambah tanaman', 'error');
            return;
        }
        
        const newPlant = {
            userId: this.currentUser.id,
            name: name,
            type: type,
            plantingDate: plantingDate,
            wateringSchedule: wateringSchedule,
            fertilizingSchedule: fertilizingSchedule,
            harvestDate: harvestDate,
            notes: notes,
            lastWatered: plantingDate,
            lastFertilized: plantingDate,
            status: 'active'
        };
        
        this.storage.addPlant(newPlant);
        this.notification.show(`Tanaman ${name} berhasil ditambahkan`, 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // Education Page Initialization
    initEducation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === tabId) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    // Check for notifications
    checkNotifications() {
        if (!this.currentUser) return;
        
        const plants = this.storage.getPlantsByUser(this.currentUser.id);
        
        plants.forEach(plant => {
            const status = PlantStatusCalculator.calculateStatus(plant);
            
            if (status.needsWater) {
                setTimeout(() => {
                    this.notification.show(`Waktunya menyiram tanaman ${plant.name}`, 'warning', 10000);
                }, 1000);
            }
            
            if (status.needsFertilizer) {
                setTimeout(() => {
                    this.notification.show(`Waktunya memupuk tanaman ${plant.name}`, 'warning', 10000);
                }, 2000);
            }
            
            if (status.isHarvestClose && !status.isHarvestOverdue) {
                setTimeout(() => {
                    this.notification.show(`Tanaman ${plant.name} hampir panen (${status.daysToHarvest} hari lagi)`, 'info', 10000);
                }, 3000);
            }
            
            if (status.isHarvestOverdue) {
                setTimeout(() => {
                    this.notification.show(`Tanaman ${plant.name} siap panen!`, 'success', 10000);
                }, 4000);
            }
        });
    }

    // Utility Methods
    getPlantTypeName(type) {
        const types = {
            'padi': 'Padi',
            'jagung': 'Jagung',
            'cabai': 'Cabai',
            'tomat': 'Tomat',
            'terong': 'Terong',
            'kentang': 'Kentang',
            'wortel': 'Wortel',
            'bayam': 'Bayam',
            'kangkung': 'Kangkung',
            'lainnya': 'Lainnya'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    }

    logout() {
        this.storage.clearCurrentUser();
        this.notification.show('Anda telah logout', 'info');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.smartTaniApp = new SmartTaniApp();
});