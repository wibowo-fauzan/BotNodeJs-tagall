const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    const { version } = await fetchLatestBaileysVersion(); // Ambil versi terbaru
    
    const sock = makeWASocket({
        version, // Pastikan pakai versi terbaru
        auth: state,
        printQRInTerminal: true,
        syncFullHistory: false, // Matikan jika sering error
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr) {
            console.log("Scan QR ini di WhatsApp HP kamu:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") {
            console.log("✅ Bot berhasil terhubung ke WhatsApp!");
        }
        if (connection === "close") {
            console.log("❌ Bot terputus, mencoba ulang...");
            connectToWhatsApp(); // Restart otomatis jika terputus
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Event untuk membaca pesan masuk
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || !msg.key.remoteJid.endsWith("@g.us")) return; // Hanya di grup

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        if (text === "!tagall") {
            try {
                const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
                const participants = groupMetadata.participants.map(p => p.id);

                await sock.sendMessage(msg.key.remoteJid, { 
                    text: `👥 Mention Semua:\n${participants.map(id => `@${id.split("@")[0]}`).join(" ")}`,
                    mentions: participants
                });
            } catch (error) {
                console.error("❌ Gagal mengambil data grup:", error);
            }
        }
    });
}

connectToWhatsApp();
