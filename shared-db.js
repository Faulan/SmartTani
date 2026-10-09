var db = null;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("SmartTaniDB", 5);
        
        request.onupgradeneeded = function(event) {
            db = event.target.result;
            
            // Plants store
            if (!db.objectStoreNames.contains("plants")) {
                const plantStore = db.createObjectStore("plants", { keyPath: "id" });
                plantStore.createIndex("userId", "userId", { unique: false });
                plantStore.createIndex("nextWatering", "nextWatering", { unique: false });
                plantStore.createIndex("nextFertilizing", "nextFertilizing", { unique: false });
                plantStore.createIndex("progress", "progress", { unique: false });
                plantStore.createIndex("status", "status", { unique: false });
            }
            
            // Images store
            if (!db.objectStoreNames.contains("images")) {
                db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
            }
            
            // Notifications store
            if (!db.objectStoreNames.contains("notifications")) {
                const notificationStore = db.createObjectStore("notifications", { keyPath: "id" });
                notificationStore.createIndex("userId", "userId", { unique: false });
                notificationStore.createIndex("read", "read", { unique: false });
                notificationStore.createIndex("type", "type", { unique: false });
                notificationStore.createIndex("date", "date", { unique: false });
                notificationStore.createIndex("plantId", "plantId", { unique: false });
            }
            
            // Users store
            if (!db.objectStoreNames.contains("users")) {
                const userStore = db.createObjectStore("users", { keyPath: "id" });
                userStore.createIndex("email", "email", { unique: true });
            }
            
            // Plant History store
            if (!db.objectStoreNames.contains("plantHistory")) {
                const historyStore = db.createObjectStore("plantHistory", { keyPath: "id" });
                historyStore.createIndex("plantId", "plantId", { unique: false });
                historyStore.createIndex("userId", "userId", { unique: false });
                historyStore.createIndex("date", "date", { unique: false });
                historyStore.createIndex("type", "type", { unique: false });
            }
        };
        
        request.onsuccess = function(event) {
            db = event.target.result;
            console.log("✅ IndexedDB initialized successfully");
            resolve(db);
        };
        
        request.onerror = function(event) {
            reject("Database error: " + event.target.errorCode);
        };
    });
}

async function getAllPlantsFromDB() {
    // Ambil dari Supabase terlebih dahulu
    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient.from('plants').select('*');
            if (!error && data) {
                console.log('✅ Plants loaded from Supabase:', data.length);
                return data.map(p => ({
                    ...(p.details || {}),
                    id: p.id,
                    userId: p.user_id,
                    name: p.name,
                    type: p.type,
                    status: p.status
                }));
            }
            console.warn('Supabase query error:', error);
        } catch (e) {
            console.warn('Supabase exception, fallback to IndexedDB:', e);
        }
    }

    // Fallback ke IndexedDB
    return new Promise((resolve, reject) => {
        if (!db) { resolve([]); return; }
        const store = db.transaction("plants", "readonly").objectStore("plants");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

async function getUserPlants() {
    try {
        const allPlants = await getAllPlantsFromDB();
        if (!window.currentUser) return [];
        return allPlants.filter(plant => plant.userId == window.currentUser.id);
    } catch (error) {
        console.error("Error getting user plants:", error);
        return [];
    }
}

async function getPlantFromDB(plantId) {
    if (window.supabaseClient) {
        try {
            const { data } = await window.supabaseClient.from('plants').select('*').eq('id', plantId).maybeSingle();
            if (data) return { ...data.details, id: data.id, userId: data.user_id };
        } catch(e) {}
    }
    return new Promise((resolve, reject) => {
        if (!db) { resolve(null); return; }
        const store = db.transaction("plants", "readonly").objectStore("plants");
        const request = store.get(plantId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Gagal mengambil tanaman");
    });
}

async function savePlantToDB(plant) {
    if (window.supabaseClient) {
        try {
            const supabasePlant = {
                id: plant.id,
                user_id: plant.userId,
                name: plant.name,
                type: plant.type,
                status: plant.status,
                details: plant
            };
            await window.supabaseClient.from('plants').upsert([supabasePlant]);
        } catch(e) {}
    }
    return new Promise((resolve, reject) => {
        if (!db) { reject("Database belum diinisialisasi"); return; }
        const store = db.transaction("plants", "readwrite").objectStore("plants");
        const request = store.put(plant);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Gagal menyimpan tanaman");
    });
}

async function updatePlantInDB(plantId, updates) {
    const plant = await getPlantFromDB(plantId);
    if (!plant) throw new Error("Tanaman tidak ditemukan");
    const updatedPlant = { ...plant, ...updates };
    await savePlantToDB(updatedPlant);
    return updatedPlant;
}

async function saveImageToIndexedDB(file) {
    if (window.supabaseClient) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const userId = window.currentUser ? window.currentUser.id : 'public';
            const filePath = `${userId}/${fileName}`;

            const { data, error } = await window.supabaseClient.storage
                .from('plant-images')
                .upload(filePath, file);

            if (!error) {
                const { data: { publicUrl } } = window.supabaseClient.storage
                    .from('plant-images')
                    .getPublicUrl(filePath);
                return publicUrl;
            } else {
                console.warn('Supabase upload failed, falling back to base64:', error);
            }
        } catch (e) {
            console.warn('Supabase storage exception:', e);
        }
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject("Gagal membaca file");
        reader.readAsDataURL(file);
    });
}

async function getImageFromIndexedDB(imageId) {
    return new Promise((resolve, reject) => {
        if (!imageId) { resolve(null); return; }
        if (typeof imageId === 'string' && (imageId.startsWith('data:image') || imageId.startsWith('http'))) {
            resolve(imageId);
            return;
        }
        if (!db) { resolve(null); return; }
        const store = db.transaction("images", "readonly").objectStore("images");
        const request = store.get(parseInt(imageId));
        request.onsuccess = e => resolve(e.target.result ? e.target.result.imageData : null);
        request.onerror = () => reject("Gagal mengambil gambar");
    });
}

async function deletePlantFromDB(plantId) {
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('plants').delete().eq('id', plantId);
        } catch(e) {}
    }
    return new Promise((resolve, reject) => {
        if (!db) { reject("Database belum diinisialisasi"); return; }
        const store = db.transaction("plants", "readwrite").objectStore("plants");
        const request = store.delete(plantId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject("Gagal menghapus tanaman");
    });
}
