const { Telegraf } = require('telegraf');
const fs = require('fs');
const config = require('./config');

// Kode ini menggunakan cara lama agar tidak error di Node.js versi tua
const bot = new Telegraf(config.BOT_TOKEN);

// --- DATABASE (FILE SISTEM) ---
const DB_FILE = 'products.json';
let products = {};

// Load Data
if (fs.existsSync(DB_FILE)) {
    try {
        products = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch(e) { console.log("DB Error"); }
} else {
    products = {
        "spotify": "🎵 **SPOTIFY PREMIUM**\n• 1 Bulan : 8k\n• 3 Bulan : 11k",
        "yt": "📺 **YOUTUBE PREMIUM**\n• 1 Bulan : 10k"
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(products));
}

// Fungsi Simpan
function saveProducts() {
    fs.writeFileSync(DB_FILE, JSON.stringify(products, null, 2));
}

// --- DATA MEMBER ---
let bannedUsers = new Set();
let mutedUsers = new Map();

// --- LOGIKA ADMIN ---
const isAdmin = (ctx) => config.ADMIN_IDS.includes(ctx.from.id);

// --- FITUR BLOKIR/MUTE ---
bot.use((ctx, next) => {
    if (bannedUsers.has(ctx.from.id)) return;
    return next();
});

bot.use(async (ctx, next) => {
    if (mutedUsers.has(ctx.from.id)) {
        try { await ctx.deleteMessage(); } catch (e) {}
        if (Date.now() > mutedUsers.get(ctx.from.id)) mutedUsers.delete(ctx.from.id);
        return;
    }
    return next();
});

// --- MENU UTAMA ---
bot.start((ctx) => ctx.reply(
    `👋 **Selamat Datang di ${config.GROUP_NAME}**\n*Bot Resmi Grup Premium Apps*\n\n` +
    `Pilih menu di bawah ini 👇`,
    { "reply_markup": { "keyboard": [['/price', '/payment'], ['/rules', '/help']], "resize_keyboard": true } }
));

bot.command('price', (ctx) => {
    let txt = "🛍️ **DAFTAR HARGA**\n\n";
    Object.keys(products).forEach(k => txt += `• *${k}* : Lihat detail dengan ketik "${k}"\n`);
    ctx.reply(txt);
});

bot.command('payment', (ctx) => ctx.reply(`💳 **INFO PEMBAYARAN**\n\n💰 BCA : 1234567890\n💰 DANA : 08123456789`));
bot.command('rules', (ctx) => ctx.reply(`⚠️ **ATURAN GRUB**\n\n1. Dilarang spam link ❌\n2. Dilarang berkata kasar 🤐`));
bot.command('help', (ctx) => ctx.reply(`🤖 **HELP MENU**\n• /start - Menu Utama\n• /price - Daftar Harga\n• /listproduk - Lihat Keyword Aktif`));

// --- MANAJEMEN PRODUK ---
bot.command('addlist', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('🚫 Khusus Admin!');
    const text = ctx.message.text.replace('/addlist ', '');
    const parts = text.split(' ');
    if (parts.length < 2) return ctx.reply('Format: /addlist [keyword] [isi pesan]');
    
    const keyword = parts[0].toLowerCase();
    const content = text.replace(keyword + ' ', '');
    products[keyword] = content;
    saveProducts();
    ctx.reply(`✅ Produk "${keyword}" ditambahkan!`);
});

bot.command('dellist', (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('🚫 Khusus Admin!');
    const keyword = ctx.message.text.split(' ')[1]?.toLowerCase();
    if (!keyword) return ctx.reply('Format: /dellist [keyword]');
    
    if (products[keyword]) {
        delete products[keyword];
        saveProducts();
        ctx.reply(`🗑️ Produk "${keyword}" dihapus.`);
    } else {
        ctx.reply('⚠️ Produk tidak ditemukan.');
    }
});

bot.command('listproduk', (ctx) => {
    const keys = Object.keys(products).join(', ');
    ctx.reply(keys ? `🗂️ Keywords: ${keys}` : 'Belum ada produk.');
});

// --- MANAGE MEMBER ---
bot.command('ban', (ctx) => {
    if (!isAdmin(ctx)) return;
    const target = ctx.message.reply_to_message ? ctx.message.reply_to_message.from.id : ctx.message.text.split(' ')[1];
    if (!target) return ctx.reply('Balas pesan atau masukkan ID');
    bannedUsers.add(Number(target));
    ctx.reply(`User ${target} BANNED.`);
});

bot.command('unban', (ctx) => {
    if (!isAdmin(ctx)) return;
    const target = Number(ctx.message.text.split(' ')[1]);
    bannedUsers.delete(target);
    ctx.reply(`User ${target} di UNBAN.`);
});

// --- EVENT & AUTO REPLY ---
bot.on('text', (ctx) => {
    const text = ctx.message.text.toLowerCase();
    
    // Cek Badword
    config.BAD_WORDS.forEach(w => {
        if (text.includes(w)) {
            ctx.deleteMessage();
            ctx.reply("Mind your language please! 🤐");
        }
    });

    // Cek Produk
    const foundKey = Object.keys(products).find(k => text.includes(k));
    if (foundKey) {
        ctx.reply(products[foundKey]);
    }

    // Cek Admin Tag
    if (text.includes('@admin') || text.includes('admin') || text.includes('min')) {
        const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
        ctx.reply(`🔔 ${user} manggil admin! @bujajg`);
    }
});

// Welcome
bot.on('new_chat_members', (ctx) => {
    ctx.message.new_chat_members.forEach(m => {
        ctx.reply(`Halo ${m.first_name}! Selamat datang di ${config.GROUP_NAME}.\nCek /price ya.`);
    });
});

// Start Bot
console.log('Bot Jalan...');
bot.launch();
