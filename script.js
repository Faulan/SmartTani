// Data dan State Management
let currentUser = null;
let plants = [];
let favorites = [];
let currentPlants = [];
let plantHistory = [];
let searchResults = [];
let currentCategory = 'all';
let savedAccounts = JSON.parse(localStorage.getItem('savedAccounts')) || [];

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthState();
});

// Fungsi inisialisasi
function initializeApp() {
    // Load data dari localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForUser();
        loadUserPlants(); // Load tanaman user yang login
    }

    const savedFavorites = localStorage.getItem('userFavorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }

    // Setup mobile menu
    setupMobileMenu();
    
    // Setup calendar
    setupCalendar();
    
    // Setup notifications
    checkWateringNotifications();
}

// Setup Mobile Menu
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');
    
    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }
}

// Setup Calendar
function setupCalendar() {
    const calendarEl = document.querySelector('.calendar');
    if (!calendarEl) return;

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Clear calendar
    calendarEl.innerHTML = '';
    
    // Add day headers
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    days.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        calendarEl.appendChild(dayEl);
    });
    
    // Add empty cells for days before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'calendar-date';
        calendarEl.appendChild(emptyEl);
    }
    
    // Add date cells
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dateEl = document.createElement('div');
        dateEl.className = 'calendar-date';
        dateEl.textContent = i;
        
        // Check if today
        if (i === today.getDate() && today.getMonth() === new Date().getMonth()) {
            dateEl.classList.add('today');
        }
        
        // Add watering events (contoh)
        if (i % 3 === 0) {
            dateEl.classList.add('has-event', 'event-siram');
        }
        
        calendarEl.appendChild(dateEl);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth forms
    setupAuthForms();
    
    // Search functionality
    setupSearch();
    
    // Category filters
    setupCategoryFilters();
    
    // Plant actions
    setupPlantActions();
    
    // Modal handlers
    setupModalHandlers();
    
    // Form submissions
    setupFormSubmissions();
}

// Setup Auth Forms
function setupAuthForms() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        setupPasswordValidation();
    }

    // Forgot password form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }

    // Reset password form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
        setupPasswordRequirements();
    }

    // Verification form
    const verificationForm = document.getElementById('verificationForm');
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
        startVerificationCountdown();
    }

    // Toggle password visibility
    setupPasswordToggle();
    
    // Saved accounts
    setupSavedAccounts();
}

// Setup Password Toggle
function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
}

// Setup Password Validation
function setupPasswordValidation() {
    const passwordInput = document.getElementById('registerPassword');
    if (!passwordInput) return;

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
        
        let strength = 0;
        let feedback = '';
        
        if (password.length >= 8) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        strengthBar.className = 'strength-fill';
        if (strength <= 2) {
            strengthBar.classList.add('weak');
            feedback = 'Lemah';
        } else if (strength <= 4) {
            strengthBar.classList.add('medium');
            feedback = 'Sedang';
        } else {
            strengthBar.classList.add('strong');
            feedback = 'Kuat';
        }
        
        strengthText.textContent = feedback;
    });
}

// Setup Password Requirements
function setupPasswordRequirements() {
    const passwordInput = document.getElementById('newPassword');
    if (!passwordInput) return;

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const requirements = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        Object.keys(requirements).forEach(key => {
            const element = document.querySelector(`[data-requirement="${key}"]`);
            if (element) {
                if (requirements[key]) {
                    element.classList.add('valid');
                } else {
                    element.classList.remove('valid');
                }
            }
        });
    });
}

// Setup Saved Accounts
function setupSavedAccounts() {
    const savedAccountsList = document.querySelector('.saved-accounts-list');
    if (!savedAccountsList) return;

    savedAccountsList.innerHTML = '';
    
    savedAccounts.forEach(account => {
        const accountItem = document.createElement('div');
        accountItem.className = 'saved-account-item';
        accountItem.innerHTML = `
            <img src="${account.avatar}" alt="${account.name}">
            <div class="saved-account-info">
                <div class="saved-account-name">${account.name}</div>
                <div class="saved-account-phone">${account.phone}</div>
            </div>
            <i class="fas fa-chevron-right"></i>
        `;
        
        accountItem.addEventListener('click', function() {
            document.getElementById('loginPhone').value = account.phone;
            document.getElementById('loginPassword').focus();
        });
        
        savedAccountsList.appendChild(accountItem);
    });
}

// Setup Search
function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            performSearch(this.value);
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchInput = document.querySelector('.search-input');
            performSearch(searchInput.value);
        });
    }
}

// Setup Category Filters
function setupCategoryFilters() {
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.addEventListener('click', function() {
            // Remove active class from all filters
            document.querySelectorAll('.category-filter').forEach(f => {
                f.classList.remove('active');
            });
            
            // Add active class to clicked filter
            this.classList.add('active');
            
            // Filter plants
            currentCategory = this.dataset.category;
            filterPlants();
        });
    });
}

// Setup Plant Actions
function setupPlantActions() {
    // Favorite buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.favorite-btn')) {
            const btn = e.target.closest('.favorite-btn');
            const plantId = btn.dataset.plantId;
            toggleFavorite(plantId, btn);
        }
        
        // Share buttons
        if (e.target.closest('.share-btn')) {
            const plantId = e.target.closest('.share-btn').dataset.plantId;
            sharePlant(plantId);
        }
        
        // Start planting buttons
        if (e.target.closest('.start-plant-btn')) {
            const plantId = e.target.closest('.start-plant-btn').dataset.plantId;
            openPlantingModal(plantId);
        }
        
        // Watering buttons
        if (e.target.closest('.water-btn')) {
            const plantId = e.target.closest('.water-btn').dataset.plantId;
            openWateringModal(plantId);
        }

        // Edit plant buttons
        if (e.target.closest('.edit-plant-btn')) {
            const plantId = e.target.closest('.edit-plant-btn').dataset.plantId;
            openEditPlantModal(plantId);
        }
        
        // Delete plant buttons
        if (e.target.closest('.delete-plant-btn')) {
            const plantId = e.target.closest('.delete-plant-btn').dataset.plantId;
            deletePlant(plantId);
        }
    });
}

// Setup Modal Handlers
function setupModalHandlers() {
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Forgot password modal
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('forgotPasswordModal').style.display = 'block';
        });
    }
}

// Setup Form Submissions
function setupFormSubmissions() {
    // Plant form
    const plantForm = document.getElementById('plantForm');
    if (plantForm) {
        plantForm.addEventListener('submit', handlePlantForm);
    }

    // Edit plant form
    const editPlantForm = document.getElementById('editPlantForm');
    if (editPlantForm) {
        editPlantForm.addEventListener('submit', handleEditPlantForm);
    }
    
    // Watering form
    const wateringForm = document.getElementById('wateringForm');
    if (wateringForm) {
        wateringForm.addEventListener('submit', handleWateringForm);
    }
}

// Authentication Handlers
function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validasi
    if (!phone || !password) {
        showNotification('Harap isi semua field', 'error');
        return;
    }
    
    if (!rememberMe) {
        showNotification('Harap centang "Ingat Saya" sebelum melanjutkan', 'error');
        return;
    }
    
    // Cek apakah pengguna terdaftar
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
    const user = registeredUsers.find(u => u.phone === phone);
    
    if (!user) {
        showNotification('Maaf, nomor telepon yang Anda masukkan belum terdaftar', 'error');
        return;
    }
    
    // Verifikasi password
    if (user.password !== password) {
        showNotification('Maaf, password yang Anda masukkan salah', 'error');
        return;
    }
    
    // Login berhasil
    const currentUser = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=4CAF50&color=fff'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Simpan ke akun tersimpan jika remember me dicentang
    if (rememberMe) {
        const savedAccounts = JSON.parse(localStorage.getItem('savedAccounts')) || [];
        if (!savedAccounts.find(acc => acc.phone === user.phone)) {
            savedAccounts.push({
                name: user.name,
                phone: user.phone,
                avatar: currentUser.avatar
            });
            localStorage.setItem('savedAccounts', JSON.stringify(savedAccounts));
        }
    }
    
    showNotification('Login berhasil!', 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validasi
    if (!name || !phone || !password || !confirmPassword) {
        showNotification('Harap isi semua field', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Password tidak cocok', 'error');
        return;
    }
    
    if (!agreeTerms) {
        showNotification('Harap setujui Syarat & Ketentuan dan Kebijakan Privasi', 'error');
        return;
    }

    // Cek apakah nomor telepon sudah terdaftar
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
    if (registeredUsers.find(u => u.phone === phone)) {
        showNotification('Nomor telepon sudah terdaftar', 'error');
        return;
    }
    
    // Simpan pengguna baru
    const newUser = {
        id: Date.now(),
        name: name,
        phone: phone,
        password: password,
        email: '',
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=4CAF50&color=fff',
        createdAt: new Date().toISOString()
    };
    
    registeredUsers.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    
    showNotification('Pendaftaran berhasil! Mengirim kode verifikasi...', 'success');
    
    // Simulasi kirim kode verifikasi ke WhatsApp
    sendVerificationCode(phone);
    
    // Redirect ke halaman verifikasi
    setTimeout(() => {
        window.location.href = 'verification.html?phone=' + encodeURIComponent(phone);
    }, 2000);
}

function handleForgotPassword(e) {
    e.preventDefault();
    
    const phone = document.getElementById('forgotPhone').value;
    
    if (!phone) {
        showNotification('Harap masukkan nomor telepon', 'error');
        return;
    }

    // Cek apakah nomor terdaftar
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
    const user = registeredUsers.find(u => u.phone === phone);
    
    if (!user) {
        showNotification('Nomor telepon tidak terdaftar', 'error');
        return;
    }
    
    // Simulasi kirim kode reset
    showNotification('Kode reset telah dikirim ke WhatsApp Anda', 'success');
    document.getElementById('forgotPasswordModal').style.display = 'none';
    document.getElementById('resetPasswordModal').style.display = 'block';
}

function handleResetPassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('Password tidak cocok', 'error');
        return;
    }
    
    showNotification('Password berhasil direset!', 'success');
    
    setTimeout(() => {
        document.getElementById('resetPasswordModal').style.display = 'none';
        window.location.href = 'index.html';
    }, 2000);
}

function handleVerification(e) {
    e.preventDefault();
    
    const code = document.getElementById('verificationCode').value;
    
    if (!code) {
        showNotification('Harap masukkan kode verifikasi', 'error');
        return;
    }
    
    // Simulasi verifikasi berhasil
    showNotification('Verifikasi berhasil! Akun Anda telah aktif.', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// Plant Management Functions
function handlePlantForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const plantData = {
        id: Date.now(),
        name: formData.get('plantName'),
        type: formData.get('plantType'),
        address: formData.get('plantAddress'),
        startDate: formData.get('startDate'),
        waterSchedule: formData.get('waterSchedule'),
        quantity: formData.get('quantity'),
        status: 'active',
        progress: 0,
        lastWatered: null,
        nextWatering: calculateNextWatering(formData.get('waterSchedule'))
    };
    
    plants.push(plantData);
    
    // Simpan tanaman berdasarkan user ID
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        localStorage.setItem(`userPlants_${currentUser.id}`, JSON.stringify(plants));
    }
    
    showNotification('Tanaman berhasil ditambahkan!', 'success');
    document.getElementById('plantingModal').style.display = 'none';
    e.target.reset();
    
    // Refresh plants display
    displayPlants();
}

function handleEditPlantForm(e) {
    e.preventDefault();
    
    const plantId = parseInt(document.getElementById('editPlantId').value);
    const formData = new FormData(e.target);
    
    // Update plant data
    const plantIndex = plants.findIndex(p => p.id === plantId);
    if (plantIndex > -1) {
        plants[plantIndex] = {
            ...plants[plantIndex],
            name: formData.get('editPlantName'),
            type: formData.get('editPlantType'),
            address: formData.get('editPlantAddress'),
            startDate: formData.get('editStartDate'),
            waterSchedule: formData.get('editWaterSchedule'),
            quantity: formData.get('editQuantity')
        };
        
        // Simpan perubahan
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            localStorage.setItem(`userPlants_${currentUser.id}`, JSON.stringify(plants));
        }
        
        showNotification('Tanaman berhasil diperbarui!', 'success');
        document.getElementById('editPlantModal').style.display = 'none';
        displayPlants();
    }
}

function handleWateringForm(e) {
    e.preventDefault();
    
    const plantId = parseInt(e.target.dataset.plantId);
    const proofFile = document.getElementById('wateringProof').files[0];
    
    if (!proofFile) {
        showNotification('Harap unggah bukti penyiraman', 'error');
        return;
    }
    
    // Update plant data
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
        plant.lastWatered = new Date().toISOString();
        plant.nextWatering = calculateNextWatering(plant.waterSchedule);
        plant.progress = Math.min(plant.progress + 10, 100);
        
        // Simpan perubahan
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            localStorage.setItem(`userPlants_${currentUser.id}`, JSON.stringify(plants));
        }
        
        showNotification('Penyiraman berhasil dicatat!', 'success');
        document.getElementById('wateringModal').style.display = 'none';
        displayPlants();
    }
}

// Utility Functions
function performSearch(query) {
    if (!query.trim()) {
        searchResults = [];
        displayPlants();
        return;
    }
    
    const searchLower = query.toLowerCase();
    searchResults = plants.filter(plant => 
        plant.name.toLowerCase().includes(searchLower) ||
        plant.type.toLowerCase().includes(searchLower)
    );
    
    displayPlants();
}

function filterPlants() {
    let filteredPlants = searchResults.length > 0 ? searchResults : plants;
    
    if (currentCategory !== 'all') {
        filteredPlants = filteredPlants.filter(plant => 
            plant.type === currentCategory
        );
    }
    
    displayFilteredPlants(filteredPlants);
}

function displayPlants() {
    const plantsGrid = document.querySelector('.plants-grid');
    if (!plantsGrid) return;
    
    let plantsToDisplay = searchResults.length > 0 ? searchResults : plants;
    
    if (currentCategory !== 'all') {
        plantsToDisplay = plantsToDisplay.filter(plant => 
            plant.type === currentCategory
        );
    }
    
    displayFilteredPlants(plantsToDisplay);
}

function displayFilteredPlants(filteredPlants) {
    const plantsGrid = document.querySelector('.plants-grid');
    if (!plantsGrid) return;
    
    plantsGrid.innerHTML = '';
    
    if (filteredPlants.length === 0) {
        plantsGrid.innerHTML = `
            <div class="no-plants" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-light);">
                <i class="fas fa-seedling" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Tidak ada tanaman yang ditemukan</p>
            </div>
        `;
        return;
    }
    
    filteredPlants.forEach(plant => {
        const isFavorite = favorites.includes(plant.id);
        const needsWatering = plant.nextWatering && new Date(plant.nextWatering) <= new Date();
        
        const plantCard = document.createElement('div');
        plantCard.className = 'plant-card';
        plantCard.innerHTML = `
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-plant-id="${plant.id}">
                <i class="fas fa-star"></i>
            </button>
            <div class="plant-image">
                <i class="fas fa-seedling"></i>
            </div>
            <div class="plant-header">
                <div class="plant-name">${plant.name}</div>
                <div class="plant-type">${plant.type}</div>
            </div>
            <div class="plant-body">
                <div class="plant-details">
                    <div class="plant-detail">
                        <span>Tanggal Mulai:</span>
                        <span>${formatDate(plant.startDate)}</span>
                    </div>
                    <div class="plant-detail">
                        <span>Jadwal Siram:</span>
                        <span>${plant.waterSchedule} hari</span>
                    </div>
                    <div class="plant-detail">
                        <span>Jumlah:</span>
                        <span>${plant.quantity} tanaman</span>
                    </div>
                </div>
                <div class="plant-status">
                    <div class="status-item">
                        <i class="fas fa-tint"></i>
                        <span>Status Air:</span>
                        <span class="status-badge ${needsWatering ? 'warning' : 'completed'}">
                            ${needsWatering ? 'Perlu Disiram' : 'Terkendali'}
                        </span>
                    </div>
                    <div class="status-item">
                        <i class="fas fa-chart-line"></i>
                        <span>Progress:</span>
                        <span class="status-badge ${plant.progress === 100 ? 'completed' : 'pending'}">
                            ${plant.progress}%
                        </span>
                    </div>
                </div>
                <div class="plant-actions">
                    <button class="btn-secondary edit-plant-btn" data-plant-id="${plant.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger delete-plant-btn" data-plant-id="${plant.id}">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
                ${needsWatering ? `
                    <button class="btn-primary water-btn full-width" data-plant-id="${plant.id}" style="margin-top: 10px;">
                        <i class="fas fa-tint"></i> Siram Sekarang
                    </button>
                ` : ''}
            </div>
        `;
        
        plantsGrid.appendChild(plantCard);
    });
}

function toggleFavorite(plantId, button) {
    const index = favorites.indexOf(plantId);
    
    if (index > -1) {
        favorites.splice(index, 1);
        button.classList.remove('active');
        showNotification('Dihapus dari favorit', 'info');
    } else {
        favorites.push(plantId);
        button.classList.add('active');
        showNotification('Ditambahkan ke favorit', 'success');
    }
    
    localStorage.setItem('userFavorites', JSON.stringify(favorites));
}

function sharePlant(plantId) {
    const plant = plants.find(p => p.id === plantId);
    if (plant) {
        const shareUrl = `${window.location.origin}/plant.html?id=${plantId}`;
        const shareText = `Lihat tanaman ${plant.name} saya di SmartTani!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'SmartTani - Bagikan Tanaman',
                text: shareText,
                url: shareUrl
            });
        } else {
            // Fallback untuk browser yang tidak support Web Share API
            navigator.clipboard.writeText(shareUrl).then(() => {
                showNotification('Link berhasil disalin ke clipboard!', 'success');
            });
        }
    }
}

function openPlantingModal(plantId) {
    document.getElementById('plantingModal').style.display = 'block';
}

function openEditPlantModal(plantId) {
    const plant = plants.find(p => p.id == plantId);
    if (plant) {
        document.getElementById('editPlantId').value = plant.id;
        document.getElementById('editPlantName').value = plant.name;
        document.getElementById('editPlantType').value = plant.type;
        document.getElementById('editPlantAddress').value = plant.address;
        document.getElementById('editStartDate').value = plant.startDate;
        document.getElementById('editWaterSchedule').value = plant.waterSchedule;
        document.getElementById('editQuantity').value = plant.quantity;
        
        document.getElementById('editPlantModal').style.display = 'block';
    }
}

function deletePlant(plantId) {
    if (confirm('Apakah Anda yakin ingin menghapus tanaman ini?')) {
        plants = plants.filter(p => p.id != plantId);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser) {
            localStorage.setItem(`userPlants_${currentUser.id}`, JSON.stringify(plants));
        }
        
        showNotification('Tanaman berhasil dihapus', 'success');
        displayPlants();
    }
}

function openWateringModal(plantId) {
    const modal = document.getElementById('wateringModal');
    const form = document.getElementById('wateringForm');
    
    form.dataset.plantId = plantId;
    modal.style.display = 'block';
}

function viewPlantDetails(plantId) {
    // Implementasi view plant details
    showNotification('Fitur detail tanaman akan segera hadir!', 'info');
}

// Notification Functions
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function checkWateringNotifications() {
    const today = new Date();
    plants.forEach(plant => {
        if (plant.nextWatering && new Date(plant.nextWatering) <= today) {
            showNotification(`Tanaman ${plant.name} perlu disiram hari ini!`, 'warning');
        }
    });
}

// Helper Functions
function calculateNextWatering(schedule) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + parseInt(schedule));
    return nextDate.toISOString();
}

function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

function sendVerificationCode(phone) {
    // Simulasi pengiriman kode verifikasi ke WhatsApp
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    
    console.log(`Kode verifikasi ${verificationCode} telah dikirim ke WhatsApp ${phone}`);
    
    // Simpan kode untuk verifikasi
    sessionStorage.setItem('verificationCode', verificationCode);
    sessionStorage.setItem('verificationPhone', phone);
}

function startVerificationCountdown() {
    const countdownEl = document.querySelector('.countdown-timer');
    if (!countdownEl) return;
    
    let timeLeft = 120; // 2 menit
    
    const countdown = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            countdownEl.textContent = '0:00';
            
            // Enable resend button
            const resendBtn = document.querySelector('.resend-btn');
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Kirim Ulang Kode';
            }
        }
        
        timeLeft--;
    }, 1000);
}

function updateUIForUser() {
    const userMenu = document.querySelector('.user-menu span');
    const welcomeSection = document.querySelector('.welcome-section h2');
    
    if (currentUser) {
        if (userMenu) {
            userMenu.textContent = currentUser.name;
        }
        if (welcomeSection) {
            welcomeSection.textContent = `Selamat Datang, ${currentUser.name}! 👋`;
        }
    }
}

function checkAuthState() {
    const authPages = ['index.html', 'register.html', 'verification.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (authPages.includes(currentPage) && currentUser) {
        window.location.href = 'dashboard.html';
    } else if (!authPages.includes(currentPage) && !currentUser) {
        window.location.href = 'index.html';
    }
}

// Load User Plants
function loadUserPlants() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    const userPlants = JSON.parse(localStorage.getItem(`userPlants_${currentUser.id}`)) || [];
    plants = userPlants;
    
    displayPlants();
}

// Logout Function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('Logout berhasil', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Export functions untuk digunakan di HTML
window.logout = logout;
window.viewPlantDetails = viewPlantDetails;
window.openPlantingModal = openPlantingModal;
window.openEditPlantModal = openEditPlantModal;
window.deletePlant = deletePlant;
window.showNotification = showNotification;

// Profile Management Functions
function openEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'block';
}

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'block';
}

// Profile form submissions
document.addEventListener('DOMContentLoaded', function() {
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showNotification('Profil berhasil diperbarui!', 'success');
            document.getElementById('editProfileModal').style.display = 'none';
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;
            
            if (newPassword !== confirmPassword) {
                showNotification('Password tidak cocok!', 'error');
                return;
            }
            
            showNotification('Password berhasil diubah!', 'success');
            document.getElementById('changePasswordModal').style.display = 'none';
        });
    }

    // Profile tab functionality
    const profileMenuItems = document.querySelectorAll('.profile-menu-item');
    if (profileMenuItems.length > 0) {
        profileMenuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all items
                document.querySelectorAll('.profile-menu-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked item
                this.classList.add('active');
                
                // Show corresponding tab
                const tabId = this.dataset.tab + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // Password requirements validation for profile
    const profilePasswordInput = document.getElementById('newPassword');
    if (profilePasswordInput) {
        profilePasswordInput.addEventListener('input', function() {
            const password = this.value;
            const requirements = {
                length: password.length >= 8,
                lowercase: /[a-z]/.test(password),
                uppercase: /[A-Z]/.test(password),
                number: /[0-9]/.test(password),
                special: /[^A-Za-z0-9]/.test(password)
            };

            Object.keys(requirements).forEach(key => {
                const element = document.querySelector(`[data-requirement="${key}"]`);
                if (element) {
                    if (requirements[key]) {
                        element.classList.add('valid');
                    } else {
                        element.classList.remove('valid');
                    }
                }
            });
        });
    }
});