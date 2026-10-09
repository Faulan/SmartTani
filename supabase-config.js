// File ini digunakan untuk menghubungkan aplikasi Anda ke Supabase

// URL Proyek Anda (Saya sudah ambil dari URL di browser Anda)
const supabaseUrl = 'https://lukumonbsopuvhxfdfyq.supabase.co';

// MENGGUNAKAN PUBLISHABLE KEY (JANGAN PERNAH GUNAKAN SECRET KEY DI FILE HTML/JS)
const supabaseKey = 'sb_publishable_GcVjvmMLdg8RjdM1holG7Q_o0M8zfCr';

// Membuat koneksi ke Supabase dan jadikan GLOBAL (var) agar bisa diakses di semua file HTML
var supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
window.supabaseClient = supabase;

console.log("Koneksi Supabase siap digunakan!");
