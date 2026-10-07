// ==================== CONFIG & SOUND SYNTHESIZER ====================
if (typeof Phaser === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const gc = document.getElementById('game-container');
        if (gc) gc.innerHTML = '<p style="color:#fff;padding:24px;font-weight:bold">Gagal memuat Phaser (cek koneksi internet), lalu muat ulang halaman.</p>';
    });
    throw new Error('Phaser tidak termuat');
}

// Kosongkan = hint memakai teks cadangan. JANGAN taruh key asli di repo publik.
const GEMINI_API_KEY = "";
const GEMINI_MODEL = "gemini-2.5-flash"; // sesuaikan dengan model yang tersedia di akunmu 

// Variabel penampung status tombol layar sentuh
let touchState = { left: false, right: false, up: false, down: false };

let audioCtx = null;
let audioUnlocked = false;
function getAudioCtx() {
    if (!audioUnlocked) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
}
function unlockAudio() {
    audioUnlocked = true;
    try { getAudioCtx(); } catch (e) { /* audio tidak didukung */ }
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, unlockAudio, { once: true, passive: true }));

function playSFX(type) {
    let ctx;
    try { ctx = getAudioCtx(); } catch (e) { return; }
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'correct') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'wrong') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'type') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
    } else if (type === 'levelup') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.12);
        });
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }
}

// DATA POS SCREENING LK 1 & LK 2
const GAME_DATA = {
    lk1: [
        { id: 1, title: "Pos 1: Sejarah HMI", screenerName: "Master Screener Sejarah", x: 480, y: 320, question: "Pada tanggal berapakah HMI resmi didirikan di Yogyakarta?", options: ["5 Februari 1947", "17 Agustus 1945", "10 November 1945", "28 Oktober 1928"], answer: 0 },
        { id: 2, title: "Pos 2: Konstitusi HMI", screenerName: "Master Screener Konstitusi", x: 1440, y: 320, question: "Apa bentuk/status organisasi HMI berdasarkan Pasal 3 AD HMI?", options: ["Organisasi Partai Politik", "Organisasi Mahasiswa", "Organisasi Kemasyarakatan", "Organisasi Kepemudaan"], answer: 1 },
        { id: 3, title: "Pos 3: NDP HMI", screenerName: "Master Screener NDP", x: 960, y: 820, question: "Siapakah perumus utama Nilai-Nilai Dasar Perjuangan (NDP) HMI?", options: ["Lafran Pane", "Dahlan Ranuwihardjo", "Nurcholish Madjid (Cak Nur)", "Ahmadi Thaha"], answer: 2 }
    ],
    lk2: [
        { id: 1, title: "Pos 1: Ideopolitorstratak", screenerName: "Master Screener Ideopolitor", x: 480, y: 320, question: "Apa fokus utama analisis materi Ideopolitorstratak dalam HMI?", options: ["Seni & Olahraga", "Strategi & Taktik Perjuangan Politik", "Manajemen Keuangan", "Desain Grafis"], answer: 1 },
        { id: 2, title: "Pos 2: KDM", screenerName: "Master Screener KDM", x: 1440, y: 320, question: "Kepanjangan dari KDM dalam materi perkaderan LK 2 adalah...", options: ["Karakter Dasar Mahasiswa", "Kepemimpinan, Manajemen & Organisasi", "Kaderisasi Daerah Mandiri", "Keterampilan Mengajar"], answer: 1 },
        { id: 3, title: "Pos 3: Pendalaman NDP", screenerName: "Master Screener Filsafat NDP", x: 960, y: 820, question: "Bab berapa dalam NDP yang membahas tentang 'Kemerdekaan Manusia & Takdir'?", options: ["Bab I", "Bab II", "Bab III", "Bab IV"], answer: 1 }
    ]
};

// DATA DIALOG STORY
const STORY_DIALOGUES = {
    intro: [
        { speaker: "Narator", portrait: "assets/player.png", text: "Langkah kaki berbunyi menyusuri koridor. Hari yang dipersiapkan sejak lama akhirnya tiba: Arena Screening Perkaderan HMI." },
        { speaker: "Kader HMI", portrait: "assets/player.png", text: "Darahku berdesir... Ini pertaruhan mental, pemahaman sejarah, dan keteguhan ideologi untuk membuktikan diriku sebagai Insan Akademis!" },
        { speaker: "Ayanda Lafran Pane", portrait: "assets/screener_sejarah.png", text: "Ananda... HMI didirikan bukan hanya untuk melahirkan sarjana, melainkan kader pencipta dan pengabdi yang bernafaskan Islam." },
        { speaker: "Kader HMI", portrait: "assets/player.png", text: "Bismillah! Dengan keyakinan dan keikhlasan, perjalananku dimulai sekarang!" }
    ],
    forum_lk1: [
        { speaker: "Master of Training (MOT)", portrait: "assets/screener_konstitusi.png", text: "Selamat bagi yang lulus screening! Sekarang kita berada di Aula Forum LK 1 bersama seluruh peserta kader lainnya." },
        { speaker: "MOT", portrait: "assets/screener_konstitusi.png", text: "Di forum ini, pemikiran awal kalian diuji: Mengapa HMI harus mempertahankan sifat organisasinya yang 'Independen'?" },
        { speaker: "Kader Peserta A", portrait: "assets/teman.png", text: "Saran saya, lebih baik independensi dilepas saja agar organisasi dapat dana besar dari parpol politik!" }
    ],
    transition_lk2: [
        { speaker: "MOT", portrait: "assets/screener_konstitusi.png", text: "Luar biasa! Argumenmu di Forum LK 1 sangat tepat. Kamu resmi dinyatakan LULUS LK 1!" },
        { speaker: "Kader HMI", portrait: "assets/player.png", text: "Terima kasih Kanda! Saya siap melangkah ke Arena Screening LK 2!" },
        { speaker: "Master Screener LK 2", portrait: "assets/screener_ndp.png", text: "Persiapkan dirimu. Arena Screening dan Forum LK 2 menyajikan materi kepemimpinan dan ideopolitor yang jauh lebih berat!" }
    ],
    forum_lk2: [
        { speaker: "MOT LK 2", portrait: "assets/screener_ndp.png", text: "PERHATIAN AULA FORUM LK 2! Kita memasuki sesi dinamika paling krusial: Analisis Ideopolitorstratak dan Dialektika NDP!" },
        { speaker: "Kader Peserta A (Modernis)", portrait: "assets/teman.png", text: "INTERUPSI MOT! Gagasan NDP itu sudah usang dan tidak relevan di era digital saat ini! Harus dirombak total!" },
        { speaker: "Kader Peserta B (Sakral)", portrait: "assets/screener_konstitusi.png", text: "TIDAK BISA! Siapa kamu berani mengubah NDP? Kamu tidak paham esensi nilai keislaman dan keindonesiaan!" },
        { speaker: "MOT LK 2", portrait: "assets/screener_ndp.png", text: "FORUM HARAP TENANG! Kepada Kader di tengah, bagaimana sikap dan solusimu atas benturan gagasan ini?!" },
        { speaker: "Kader HMI", portrait: "assets/player.png", text: "(Suasana forum memanas... Tatapan seluruh teman seperjuangan tertuju padaku. Ini saatnya aku mengambil sikap sebagai Insan Pencipta!)" }
    ],
    ending: [
        { speaker: "MOT LK 2", portrait: "assets/screener_ndp.png", text: "Dinamika yang luar biasa! Kamu mampu memecah kebuntuan forum dengan pemikiran yang solutif dan berdasar!" },
        { speaker: "Ayanda Lafran Pane", portrait: "assets/screener_sejarah.png", text: "Selamat Ananda. Kamu telah membuktikan dirimu sebagai Insan Akademis, Insan Pencipta, dan Insan Pengabdi." },
        { speaker: "Kader HMI", portrait: "assets/player.png", text: "Inilah bukti nyata perjuangan. Pengabdian sesungguhnya baru saja dimulai di tengah-tengah masyarakat!" },
        { speaker: "Narator", portrait: "assets/player.png", text: "YAKIN USAHA SAMPAI! Sang kader melangkah keluar arena perkaderan dengan membawa pencerahan bagi bangsa." }
    ]
};

// SOAL PILIHAN ARGUMEN FORUM
const FORUM_QUESTIONS = {
    lk1: {
        title: "Dinamika Forum LK 1",
        question: "Bagaimana tanggapanmu atas usulan agar HMI melepaskan independensinya demi dana politik?",
        options: [
            { text: "A. Setuju saja agar organisasi punya banyak uang.", correct: false },
            { text: "B. Independensi adalah watak hakiki HMI agar tetap kritis dan objektif membela kebenaran tanpa intervensi.", correct: true },
            { text: "C. Tidak peduli, ikut suara mayoritas forum.", correct: false }
        ]
    },
    lk2: {
        title: "Debat Panas Forum LK 2",
        question: "Bagaimana solusimu atas perdebatan antara pihak yang menganggap NDP usang dengan pihak yang sakral kaku?",
        options: [
            { text: "A. Menyalahkan kedua belah pihak dan keluar dari forum.", correct: false },
            { text: "B. Menerangkan bahwa NDP adalah nilai substansial universal, sedangkan metode penerapannya yang harus dimodernisasi secara kreatif.", correct: true },
            { text: "C. Mendukung perombakan total tanpa memikirkan akar nilai keislaman.", correct: false }
        ]
    }
};

const ARGUMENT_BATTLE_LK2 = {
    rounds: [
        {
            attacker: "Kader Peserta A (Modernis)",
            portrait: "assets/teman.png",
            attackText: "NDP itu sudah kuno! Harus dirombak total tanpa ampun, atau HMI akan ditinggalkan zaman!",
            responses: [
                { text: "Mari kita bedah dulu esensinya secara jernih, jangan tergesa menghakimi.", tension: -18 },
                { text: "Kamu salah besar! NDP itu harga mati, tidak boleh disentuh sedikit pun!", tension: 22 },
                { text: "Terserah forum saja, aku ikut suara terbanyak.", tension: 8 }
            ]
        },
        {
            attacker: "Kader Peserta B (Sakral)",
            portrait: "assets/screener_konstitusi.png",
            attackText: "Kalau begitu kamu ini tidak paham nilai keislaman dalam NDP! Berani sekali!",
            responses: [
                { text: "Nilai dasarnya tetap sakral, hanya metode dakwahnya yang perlu relevan dengan zaman.", tension: -18 },
                { text: "Kalian berdua sama-sama keras kepala, diam semua!", tension: 22 },
                { text: "Aku dengarkan dulu semua argumen sebelum bicara.", tension: 8 }
            ]
        }
    ]
};

let currentLevel = 'lk1';
let completedPosIds = new Set();
let currentActivePos = null;
let playerLives = 3;
let timerInterval = null;
let timeLeft = 30;
let hintTimeRemaining = null;
let phaserGame = null;
let activeScene = null;
let nearbyScreener = null;

let currentDialogueSequence = [];
let currentDialogueIndex = 0;
let isStoryActive = false;
let isForumMode = false;
let currentMapType = 'screening';
let isGameFinished = false;
let lastForumData = null;
let isBattleActive = false;
let isGordonActive = false;
let battleTension = 50;
let currentQuestionText = '';

// UI & MODAL VARIABLES
let quizModal, lafranModal, statusModal, storyOverlay;
let questionText, optionsContainer, screenerTitle, posBadge, lafranResponse;
let progressInfo, levelBadge, livesInfo, timerText, speakerName, dialogueText, portraitImg;
let storyCallbackOnComplete = null;

// ==================== PHASER SCENE ====================
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('playerCustom', 'assets/player.png');
        this.load.image('screener1', 'assets/screener_sejarah.png');
        this.load.image('screener2', 'assets/screener_konstitusi.png');
        this.load.image('screener3', 'assets/screener_ndp.png');
        this.load.image('temanCustom', 'assets/teman.png');

        this.load.on('loaderror', (file) => {
            console.warn(`[HMI Game] Gagal memuat asset: ${file.key} (${file.src}). Sprite fallback akan dipakai.`);
        });

        let g = this.make.graphics({x: 0, y: 0, add: false});
        g.fillStyle(0x008037);
        g.fillRect(0, 0, 32, 48);
        g.generateTexture('fallback_sprite', 32, 48);
    }

    create() {
        activeScene = this;
        this.screenerOverlapCollider = null;
        this.drawEnvironment();

        let playerKey = this.textures.exists('playerCustom') ? 'playerCustom' : 'fallback_sprite';
        this.physics.world.setBounds(40, 120, 1840, 920);
        this.player = this.physics.add.sprite(960, 580, playerKey);
        this.baseScale = playerKey === 'playerCustom' ? 0.45 : 1.5;
        this.player.setScale(this.baseScale);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(100);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.renderEntities();
        startStorySequence(STORY_DIALOGUES.intro);
    }

    drawEnvironment() {
        if (this.envTweens) this.envTweens.forEach(t => t.remove());
        this.envTweens = [];
        if (this.envGroup) this.envGroup.destroy(true);
        this.envGroup = this.add.group();

        // ---- helper visual (semua objek masuk envGroup, depth negatif = di bawah karakter) ----
        const add = (o, d = -5) => { o.setDepth(d); this.envGroup.add(o); return o; };
        const gfx = (d = -5) => add(this.add.graphics(), d);
        const grad = (g, x, y, w, h, top, bottom, a = 1) => {
            g.fillGradientStyle(top, top, bottom, bottom, a, a, a, a);
            g.fillRect(x, y, w, h);
        };
        const glow = (x, y, rw, rh, color, a, d = -4) => {
            const g = gfx(d).setBlendMode(Phaser.BlendModes.ADD);
            for (let i = 6; i >= 1; i--) { g.fillStyle(color, a / 6); g.fillEllipse(x, y, rw * i / 6, rh * i / 6); }
            return g;
        };
        const pulse = (o, from, to, dur, delay = 0) => this.envTweens.push(this.tweens.add({
            targets: o, alpha: { from, to }, duration: dur, delay, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        }));
        const label = (x, y, txt, style, d = -2) =>
            add(this.add.text(x, y, txt, style).setOrigin(0.5).setShadow(0, 2, '#000000', 6, true, true), d);
        const vignette = () => {
            const g = gfx(150), W = 1920, H = 1080, t = 230;
            g.fillGradientStyle(0, 0, 0, 0, 0.75, 0.75, 0, 0); g.fillRect(0, 0, W, t);
            g.fillGradientStyle(0, 0, 0, 0, 0, 0, 0.75, 0.75); g.fillRect(0, H - t, W, t);
            g.fillGradientStyle(0, 0, 0, 0, 0.7, 0, 0.7, 0); g.fillRect(0, 0, t, H);
            g.fillGradientStyle(0, 0, 0, 0, 0, 0.7, 0, 0.7); g.fillRect(W - t, 0, t, H);
        };

        if (currentMapType === 'screening') {
            // Latar, dinding panel hijau & list emas
            grad(gfx(-10), 0, 0, 1920, 1080, 0x07140e, 0x020806);
            const wall = gfx(-9);
            grad(wall, 40, 0, 1840, 125, 0x1b6b3a, 0x0b2e1b);
            for (let x = 40; x < 1880; x += 115) { wall.fillStyle(0xffffff, 0.06); wall.fillRect(x, 0, 3, 125); }
            wall.fillStyle(0xfacc15, 0.9); wall.fillRect(40, 119, 1840, 4);

            // Lantai kayu bertekstur + pantulan cahaya
            const floor = gfx(-9);
            grad(floor, 40, 123, 1840, 917, 0xcf9a62, 0x7a4a24);
            for (let y = 123, row = 0; y < 1040; y += 46, row++) {
                floor.fillStyle(0x000000, 0.10); floor.fillRect(40, y, 1840, 2);
                for (let x = 40 + (row % 2) * 120; x < 1880; x += 240) { floor.fillStyle(0x000000, 0.07); floor.fillRect(x, y, 2, 46); }
            }
            glow(960, 580, 1600, 800, 0xfff1c9, 0.18, -8);

            // Karpet dengan bayangan & bingkai emas
            const carpet = gfx(-7);
            carpet.fillStyle(0x000000, 0.35); carpet.fillRect(372, 306, 1190, 640);
            grad(carpet, 360, 290, 1190, 635, 0x118a45, 0x064d27);
            carpet.lineStyle(4, 0xfacc15, 0.95); carpet.strokeRect(378, 308, 1154, 599);
            carpet.lineStyle(2, 0xffffff, 0.35); carpet.strokeRect(392, 322, 1126, 571);

            // Cahaya sorot di setiap pos screener
            GAME_DATA[currentLevel].forEach(p => pulse(glow(p.x, p.y + 40, 380, 210, 0x4ade80, 0.28, -6), 0.55, 1, 1500 + p.id * 300));

            // Lampu dinding
            for (let x = 220; x < 1720; x += 300) {
                const lamp = gfx(-6); lamp.fillStyle(0xfde68a, 1); lamp.fillRoundedRect(x - 18, 84, 36, 10, 5);
                pulse(glow(x, 108, 220, 90, 0xfde68a, 0.45, -6), 0.7, 1, 2200, x);
            }

            // Tanaman hias di sisi ruangan
            [140, 1780].forEach(x => {
                const p = gfx(-3);
                p.fillStyle(0x000000, 0.35); p.fillEllipse(x, 1005, 130, 30);
                p.fillStyle(0x92400e, 1); p.fillRoundedRect(x - 28, 900, 56, 100, 10);
                p.fillStyle(0x15803d, 1); p.fillCircle(x, 850, 50);
                p.fillStyle(0x22c55e, 1); p.fillCircle(x - 24, 828, 33); p.fillCircle(x + 26, 834, 31);
                p.fillStyle(0x86efac, 0.9); p.fillCircle(x, 808, 24);
            });

            // Banner kaca modern
            const bn = gfx(-3);
            bn.fillStyle(0x000000, 0.4); bn.fillRoundedRect(572, 40, 790, 70, 16);
            bn.fillStyle(0x0b3d20, 0.96); bn.fillRoundedRect(565, 32, 790, 70, 16);
            bn.fillStyle(0xffffff, 0.10); bn.fillRoundedRect(565, 32, 790, 28, { tl: 16, tr: 16, bl: 0, br: 0 });
            bn.lineStyle(3, 0xfacc15, 1); bn.strokeRoundedRect(565, 32, 790, 70, 16);
            label(960, 55, `RUANG SCREENING PERKADERAN HMI (${currentLevel.toUpperCase()})`, { font: "bold 24px 'Segoe UI', Arial", fill: '#ffffff' });
            label(960, 83, 'Yakin Usaha Sampai - Yakusa', { font: "italic 16px 'Segoe UI', Arial", fill: '#bbf7d0' });
        } else {
            // Aula forum: latar malam, lantai keramik, karpet tengah
            grad(gfx(-10), 0, 0, 1920, 1080, 0x0b1220, 0x020617);
            const floor = gfx(-9);
            grad(floor, 40, 120, 1840, 920, 0xe6edf6, 0x8b9bb0);
            for (let x = 40; x < 1880; x += 120) { floor.fillStyle(0x64748b, 0.14); floor.fillRect(x, 120, 2, 920); }
            for (let y = 120; y < 1040; y += 120) { floor.fillStyle(0x64748b, 0.14); floor.fillRect(40, y, 1840, 2); }
            glow(960, 640, 1500, 760, 0xffffff, 0.22, -8);

            const aisle = gfx(-7);
            aisle.fillStyle(0x000000, 0.3); aisle.fillRect(866, 300, 200, 760);
            grad(aisle, 860, 290, 200, 760, 0x16a34a, 0x064e3b);
            aisle.lineStyle(3, 0xfacc15, 0.9); aisle.strokeRect(870, 300, 180, 740);

            // Tirai samping
            const cur = gfx(-6);
            grad(cur, 40, 120, 130, 920, 0x065f46, 0x022c22, 0.95);
            grad(cur, 1750, 120, 130, 920, 0x065f46, 0x022c22, 0.95);
            for (let i = 0; i < 4; i++) { cur.fillStyle(0x000000, 0.18); cur.fillRect(60 + i * 30, 120, 6, 920); cur.fillRect(1770 + i * 30, 120, 6, 920); }

            // Panggung bertingkat + layar LED
            const st = gfx(-5);
            st.fillStyle(0x000000, 0.45); st.fillRect(270, 130, 1400, 190);
            grad(st, 260, 120, 1400, 170, 0x475569, 0x0f172a);
            grad(st, 260, 290, 1400, 22, 0x22c55e, 0x064e3b);
            st.lineStyle(3, 0xfacc15, 0.9); st.strokeRect(260, 120, 1400, 192);
            const led = gfx(-4);
            grad(led, 440, 128, 1040, 44, 0x16a34a, 0x064e3b);
            led.lineStyle(2, 0xffffff, 0.6); led.strokeRect(440, 128, 1040, 44);
            pulse(led, 0.75, 1, 1800);

            // Meja MOT
            const desk = gfx(-3);
            desk.fillStyle(0x000000, 0.4); desk.fillRoundedRect(666, 162, 600, 70, 14);
            desk.fillStyle(0x008037, 1); desk.fillRoundedRect(660, 155, 600, 70, 14);
            desk.fillStyle(0xffffff, 0.14); desk.fillRoundedRect(660, 155, 600, 24, { tl: 14, tr: 14, bl: 0, br: 0 });
            desk.lineStyle(3, 0xffffff, 1); desk.strokeRoundedRect(660, 155, 600, 70, 14);
            label(960, 190, `AULA UTAMA FORUM PERKADERAN ${currentLevel.toUpperCase()}`, { font: "bold 24px 'Segoe UI', Arial", fill: '#ffffff' });

            // Spotlight panggung (berdenyut halus)
            [560, 960, 1360].forEach((x, i) => {
                const beam = gfx(-4).setBlendMode(Phaser.BlendModes.ADD);
                beam.fillStyle(0xfff7d6, 0.14); beam.fillTriangle(x - 22, 0, x + 22, 0, x + 190, 760);
                beam.fillStyle(0xfff7d6, 0.10); beam.fillTriangle(x - 22, 0, x + 22, 0, x - 190, 760);
                pulse(beam, 0.5, 1, 2400, i * 500);
            });
        }
        vignette();
    }

    renderEntities() {
        if (this.screenersGroup) this.screenersGroup.destroy(true);
        if (this.npcGroup) this.npcGroup.destroy(true);
        if (this.decorGroup) this.decorGroup.destroy(true);
        this.decorGroup = this.add.group();
        if (this.screenerOverlapCollider) {
            this.screenerOverlapCollider.destroy();
            this.screenerOverlapCollider = null;
        }

        this.screenersGroup = this.physics.add.staticGroup();
        this.npcGroup = this.add.group();

        if (currentMapType === 'screening') {
            let currentPosList = GAME_DATA[currentLevel];
            currentPosList.forEach(pos => {
                this.decorGroup.add(this.add.rectangle(pos.x, pos.y + 25, 160, 65, 0x6e4726).setStrokeStyle(3, 0x4a2e16));
                let screenerKey = 'screener' + pos.id;

                let npc;
                if (this.textures.exists(screenerKey)) {
                    npc = this.screenersGroup.create(pos.x, pos.y - 20, screenerKey).setScale(0.8);
                } else {
                    npc = this.screenersGroup.create(pos.x, pos.y - 20, 'fallback_sprite').setScale(1.5);
                }

                npc.posData = pos;
                this.decorGroup.add(this.add.rectangle(pos.x, pos.y + 70, 50, 16, 0x008037));

                let isDone = completedPosIds.has(Number(pos.id));
                let statusText = isDone ? " [LULUS]" : "";
                let textColor = isDone ? "#15803d" : "#008037";
                let shortName = pos.screenerName.replace("Master Screener ", "Screener ");

                let nameTag = this.add.text(pos.x, pos.y - 110, `${shortName}${statusText}`, {
                    font: "bold 13px 'Segoe UI', Arial",
                    fill: textColor,
                    backgroundColor: "#ffffff",
                    padding: { x: 10, y: 5 }
                }).setOrigin(0.5);

                nameTag.setStroke('#008037', 1);
                this.decorGroup.add(nameTag);
            });

            // Deteksi screener dilakukan berbasis jarak di update()
        } else {
            let motSprite = this.textures.exists('screener2') ? 
                this.add.sprite(960, 130, 'screener2').setScale(0.8) : 
                this.add.sprite(960, 130, 'fallback_sprite').setScale(1.5);
            
            let motLabel = this.add.text(960, 75, "MASTER OF TRAINING (MOT)", { font: "bold 14px Arial", fill: "#ffffff", backgroundColor: "#008037", padding: {x:8, y:4} }).setOrigin(0.5);
            this.npcGroup.addMultiple([motSprite, motLabel]);

            let npcPositions = [
                {x: 400, y: 450}, {x: 600, y: 450}, {x: 800, y: 450}, {x: 1120, y: 450}, {x: 1320, y: 450}, {x: 1520, y: 450},
                {x: 400, y: 700}, {x: 600, y: 700}, {x: 800, y: 700}, {x: 1120, y: 700}, {x: 1320, y: 700}, {x: 1520, y: 700}
            ];

            npcPositions.forEach((p, idx) => {
                let desk = this.add.rectangle(p.x, p.y + 15, 110, 45, 0x64748b);
                let chair = this.add.rectangle(p.x, p.y - 15, 35, 12, 0x1e293b);

                let npcChar = this.textures.exists('temanCustom') ? 
                    this.add.sprite(p.x, p.y - 10, 'temanCustom').setScale(0.45) : 
                    this.add.sprite(p.x, p.y - 10, 'fallback_sprite').setScale(1.2);

                let tag = this.add.text(p.x, p.y - 60, `Kader #${idx+1}`, { font: "bold 11px Arial", fill: "#1e293b", backgroundColor: "#ffffff", padding: {x:4, y:2} }).setOrigin(0.5);
                this.npcGroup.addMultiple([desk, chair, npcChar, tag]);
            });
        }
    }

    switchMap(type) {
        currentMapType = type;
        nearbyScreener = null;
        this.drawEnvironment();
        this.renderEntities();

        if (this.player) {
            this.player.setVisible(true);
            this.player.setActive(true);
            if (type === 'forum') {
                this.player.setPosition(960, 900);
            } else {
                this.player.setPosition(960, 580);
            }
        }
    }

    update() {
        if (!this.player) return;
        this.player.setVelocity(0);

        if (isStoryActive && Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
            advanceStory();
            return;
        }
        if (isQuizOpen() && !isForumMode && Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            closeQuizModal();
            return;
        }
        if (Phaser.Input.Keyboard.JustDown(this.keyE)) tryInteract();

        const promptEl = document.getElementById('interaction-prompt');
        if (isUIBlocking()) {
            this.player.setScale(this.baseScale);
            if (promptEl) promptEl.classList.add('hidden');
            return;
        }

        // Screener terdekat. Nilainya bertahan antar-frame supaya tombol E layar sentuh
        // (yang dipicu di luar siklus update) selalu membaca data yang benar.
        nearbyScreener = null;
        if (currentMapType === 'screening' && this.screenersGroup) {
            let best = 170;
            this.screenersGroup.getChildren().forEach(sc => {
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sc.x, sc.y);
                if (d < best) { best = d; nearbyScreener = sc; }
            });
        }
        if (promptEl) promptEl.classList.toggle('hidden', !nearbyScreener);

        const speed = 300;
        const c = this.cursors, w = this.wasd;
        const left = c.left.isDown || w.A.isDown || touchState.left;
        const right = c.right.isDown || w.D.isDown || touchState.right;
        const up = c.up.isDown || w.W.isDown || touchState.up;
        const down = c.down.isDown || w.S.isDown || touchState.down;
        const vx = (right ? 1 : 0) - (left ? 1 : 0);
        const vy = (down ? 1 : 0) - (up ? 1 : 0);

        if (vx !== 0) this.player.setFlipX(vx < 0);
        this.player.setVelocity(vx * speed, vy * speed);
        if (vx !== 0 && vy !== 0) this.player.body.velocity.normalize().scale(speed);

        if (vx !== 0 || vy !== 0) {
            const bounce = Math.sin(this.time.now * 0.018) * 0.04;
            this.player.setScale(this.baseScale, this.baseScale * (1 + bounce));
            if (Math.random() < 0.08) playSFX('type');
        } else {
            this.player.setScale(this.baseScale);
        }
    }
}

// FIX: PERBAIKAN NAMA PARENT CONTEXT MENJADI 'game-wrapper'
const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    pixelArt: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: MainScene
};

// HELPER FUNCTIONS
function isVisible(el) { return !!el && !el.classList.contains('hidden'); }
function isQuizOpen() { return isVisible(quizModal); }
function isUIBlocking() {
    return isStoryActive || isBattleActive || isGordonActive ||
        isVisible(quizModal) || isVisible(lafranModal) || isVisible(statusModal);
}
function tryInteract() {
    if (isUIBlocking() || currentMapType !== 'screening') return;
    if (!nearbyScreener || !nearbyScreener.active || !nearbyScreener.posData) return;
    const pos = nearbyScreener.posData;
    if (completedPosIds.has(Number(pos.id))) {
        showToast('✅ Pos ini sudah kamu lulusi.');
        return;
    }
    openQuizModal(pos);
}
function startStorySequence(sequence, onCompleteCallback = null) {
    isStoryActive = true;
    currentDialogueSequence = sequence;
    currentDialogueIndex = 0;
    if (storyOverlay) storyOverlay.classList.remove('hidden');
    storyCallbackOnComplete = onCompleteCallback;
    displayCurrentDialogue();
}

function displayCurrentDialogue() {
    let item = currentDialogueSequence[currentDialogueIndex];
    if (speakerName) speakerName.innerText = item.speaker;
    
    if (portraitImg) {
        if (item.portrait) {
            portraitImg.onerror = () => { portraitImg.style.display = 'none'; };
            portraitImg.style.display = 'block';
            portraitImg.src = item.portrait;
        } else {
            portraitImg.style.display = 'none';
        }
    }
    
    if (dialogueText) typeWriterEffect(dialogueText, item.text, 25);
}

function advanceStory() {
    playSFX('click');
    if (dialogueText && dialogueText.typewriterTimer) {
        clearInterval(dialogueText.typewriterTimer);
        dialogueText.typewriterTimer = null;
        dialogueText.textContent = currentDialogueSequence[currentDialogueIndex].text;
        return;
    }

    currentDialogueIndex++;
    if (currentDialogueIndex < currentDialogueSequence.length) {
        displayCurrentDialogue();
    } else {
        if (storyOverlay) storyOverlay.classList.add('hidden');
        isStoryActive = false;

        if (phaserGame && phaserGame.input && phaserGame.input.keyboard) {
            phaserGame.input.keyboard.enabled = true;
        }
        window.focus();

        if (storyCallbackOnComplete) {
            let cb = storyCallbackOnComplete;
            storyCallbackOnComplete = null;
            cb();
        }
    }
}

function updateHUD() {
    let totalPos = GAME_DATA[currentLevel].length;
    if (progressInfo) progressInfo.innerText = `Pos Selesai: ${completedPosIds.size} / ${totalPos}`;
    if (levelBadge) levelBadge.innerText = `LEVEL: ${currentLevel.toUpperCase()}`;
    if (livesInfo) livesInfo.innerText = `${'❤️'.repeat(Math.max(playerLives, 0))}${'🖤'.repeat(Math.max(3 - playerLives, 0))} Nyawa`;
}

function typeWriterEffect(element, text, speed = 20, callback = null) {
    if (!element) return;
    element.textContent = '';
    let i = 0;
    if (element.typewriterTimer) clearInterval(element.typewriterTimer);

    element.typewriterTimer = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            if (i % 3 === 0) playSFX('type');
        } else {
            clearInterval(element.typewriterTimer);
            element.typewriterTimer = null;
            if (callback) callback();
        }
    }, speed);
}

function startTimer(resumeFrom = 30) {
    clearInterval(timerInterval);
    timeLeft = resumeFrom;
    if (timerText) timerText.innerText = timeLeft;
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timerText) timerText.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            playSFX('wrong');
            handleWrongAnswer("Waktu Habis! Nyawa berkurang.");
        }
    }, 1000);
}

function openQuizModal(posData) {
    playSFX('click');
    if (phaserGame && phaserGame.input && phaserGame.input.keyboard) phaserGame.input.keyboard.enabled = false;

    isForumMode = false;
    currentActivePos = posData;
    currentQuestionText = posData.question;
    const closeBtn = document.getElementById('btn-close-quiz');
    if (closeBtn) closeBtn.classList.remove('hidden');
    if (posBadge) posBadge.innerText = posData.title;
    if (screenerTitle) screenerTitle.innerText = posData.screenerName;
    if (optionsContainer) optionsContainer.innerHTML = '';

    typeWriterEffect(questionText, posData.question, 15, () => {
        posData.options.forEach((opt, index) => {
            let btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'option-btn';
            btn.innerText = `${String.fromCharCode(65 + index)}. ${opt}`;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.blur();
                checkAnswer(index === posData.answer, posData.id);
            });
            if (optionsContainer) optionsContainer.appendChild(btn);
        });
    });

    if (quizModal) quizModal.classList.remove('hidden');
    startTimer(30);
}

function openForumModal(forumData) {
    playSFX('click');
    if (phaserGame && phaserGame.input && phaserGame.input.keyboard) phaserGame.input.keyboard.enabled = false;

    isForumMode = true;
    lastForumData = forumData;
    currentQuestionText = forumData.question;
    const closeBtnForum = document.getElementById('btn-close-quiz');
    if (closeBtnForum) closeBtnForum.classList.add('hidden');
    if (posBadge) posBadge.innerText = "AULA FORUM UTAMA";
    if (screenerTitle) screenerTitle.innerText = forumData.title;
    if (optionsContainer) optionsContainer.innerHTML = '';

    typeWriterEffect(questionText, forumData.question, 15, () => {
        forumData.options.forEach((opt) => {
            let btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'option-btn';
            btn.innerText = opt.text;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.blur();
                checkAnswer(opt.correct);
            });
            if (optionsContainer) optionsContainer.appendChild(btn);
        });
    });

    if (quizModal) quizModal.classList.remove('hidden');
    startTimer(30);
}

function closeQuizModal() {
    clearInterval(timerInterval);
    if (quizModal) quizModal.classList.add('hidden');

    if (phaserGame && phaserGame.input && phaserGame.input.keyboard) {
        phaserGame.input.keyboard.enabled = true;
    }
    window.focus();
}

function checkAnswer(isCorrect, posId = null) {
    clearInterval(timerInterval);

    if (isCorrect) {
        playSFX('correct');
        
        if (!isForumMode) {
            let idToAdd = posId || (currentActivePos ? currentActivePos.id : null);
            if (idToAdd) {
                completedPosIds.add(Number(idToAdd));
            }

            updateHUD();
            closeQuizModal();

            if (activeScene) activeScene.renderEntities();

            if (completedPosIds.size >= GAME_DATA[currentLevel].length) {
                setTimeout(() => {
                    startForumPhase();
                }, 300);
            }
        } else {
            closeQuizModal();
            if (currentLevel === 'lk1') {
                startStorySequence(STORY_DIALOGUES.transition_lk2, () => {
                    currentLevel = 'lk2';
                    completedPosIds.clear();
                    updateHUD();
                    if (activeScene) activeScene.switchMap('screening');
                });
            } else {
                playSFX('levelup');
                startStorySequence(STORY_DIALOGUES.ending, () => {
                    showGordonReward(() => {
                        showVictoryModal();
                    });
                });
            }
        }
    } else {
        playSFX('wrong');
        handleWrongAnswer("Jawaban Kurang Tepat.");
    }
}

function startForumPhase() {
    if (activeScene) activeScene.switchMap('forum');

    if (currentLevel === 'lk1') {
        startStorySequence(STORY_DIALOGUES.forum_lk1, () => {
            openForumModal(FORUM_QUESTIONS.lk1);
        });
    } else {
        startStorySequence(STORY_DIALOGUES.forum_lk2, () => {
            startArgumentBattle(() => {
                openForumModal(FORUM_QUESTIONS.lk2);
            });
        });
    }
}

function injectBattleStyles() {
    if (document.getElementById('hmi-battle-styles')) return;
    const style = document.createElement('style');
    style.id = 'hmi-battle-styles';
    style.textContent = `
        @keyframes hmiShake {
            0%,100% { transform: translate(0,0); }
            20% { transform: translate(-10px,5px); }
            40% { transform: translate(10px,-5px); }
            60% { transform: translate(-7px,-5px); }
            80% { transform: translate(7px,5px); }
        }
        .hmi-shake { animation: hmiShake 0.35s ease-in-out; }
        #hmi-battle-overlay {
            position: fixed; inset: 0; z-index: 9500;
            background: radial-gradient(circle at center, #4c1010 0%, #111827 75%);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #fff; font-family: Arial, sans-serif; padding: 20px; box-sizing: border-box;
        }
        #hmi-battle-label {
            position: absolute; top: 26px; font-size: clamp(16px,2.2vw,24px); font-weight: 900;
            letter-spacing: 2px; color: #ef4444; text-shadow: 0 0 10px #000; text-align: center;
        }
        #hmi-battle-overlay .hmi-vs-row { display: flex; align-items: center; gap: 40px; margin-bottom: 18px; }
        #hmi-battle-overlay .hmi-fighter {
            width: 110px; height: 110px; border-radius: 50%; border: 4px solid #ef4444;
            object-fit: cover; background: #374151;
        }
        #hmi-battle-overlay .hmi-vs-text { font-size: 30px; font-weight: 900; color: #facc15; text-shadow: 0 0 12px #ef4444; }
        #hmi-battle-tensionbar-wrap {
            width: 85%; max-width: 600px; height: 20px; background: #1f2937;
            border: 2px solid #fff; border-radius: 12px; overflow: hidden; margin-bottom: 8px;
        }
        #hmi-battle-tensionbar { height: 100%; width: 50%; background: linear-gradient(90deg,#22c55e,#facc15,#ef4444); transition: width .4s ease; }
        #hmi-battle-tensionlabel { font-size: 12px; letter-spacing: 1px; margin-bottom: 18px; color: #cbd5e1; }
        #hmi-battle-attacktext {
            max-width: 700px; text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;
            background: rgba(0,0,0,.55); padding: 14px 20px; border-radius: 10px; border-left: 5px solid #ef4444;
        }
        #hmi-battle-options { display: flex; flex-direction: column; gap: 10px; width: 90%; max-width: 700px; }
        #hmi-battle-options button {
            padding: 12px 18px; font-size: 14px; border-radius: 8px; border: 2px solid #008037;
            background: #f0fdf4; color: #064e3b; cursor: pointer; text-align: left; font-weight: 600;
        }
        #hmi-battle-options button:hover { background: #008037; color: #fff; }
    `;
    document.head.appendChild(style);
}

function buildBattleOverlay() {
    let overlay = document.getElementById('hmi-battle-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'hmi-battle-overlay';
    overlay.innerHTML = `
        <div id="hmi-battle-label">⚔️ FORUM MEMANAS! ADU ARGUMENTASI LK 2 ⚔️</div>
        <div class="hmi-vs-row">
            <img class="hmi-fighter" id="hmi-fighter-left" src="assets/teman.png" onerror="this.style.visibility='hidden'">
            <div class="hmi-vs-text">VS</div>
            <img class="hmi-fighter" id="hmi-fighter-right" src="assets/screener_konstitusi.png" onerror="this.style.visibility='hidden'">
        </div>
        <div id="hmi-battle-tensionbar-wrap"><div id="hmi-battle-tensionbar"></div></div>
        <div id="hmi-battle-tensionlabel">KETEGANGAN FORUM</div>
        <div id="hmi-battle-attacktext"></div>
        <div id="hmi-battle-options"></div>
    `;
    document.body.appendChild(overlay);
}

function updateTensionBar() {
    const bar = document.getElementById('hmi-battle-tensionbar');
    if (bar) bar.style.width = `${battleTension}%`;
}

function runBattleRound(idx, onComplete) {
    const overlay = document.getElementById('hmi-battle-overlay');
    if (!overlay) return;

    if (idx >= ARGUMENT_BATTLE_LK2.rounds.length) {
        const label = document.getElementById('hmi-battle-label');
        const attackTextEl = document.getElementById('hmi-battle-attacktext');
        const optionsEl = document.getElementById('hmi-battle-options');
        if (label) label.textContent = battleTension >= 70
            ? "🔥 FORUM NYARIS PECAH! SEMUA MATA TERTUJU PADAMU! 🔥"
            : "Forum mulai tenang... saatnya kamu mengambil sikap penentu.";
        if (attackTextEl) attackTextEl.textContent = "";
        if (optionsEl) optionsEl.innerHTML = "";
        playSFX(battleTension >= 70 ? 'wrong' : 'correct');
        setTimeout(() => {
            overlay.remove();
            onComplete();
        }, 1400);
        return;
    }

    const round = ARGUMENT_BATTLE_LK2.rounds[idx];
    const attackTextEl = document.getElementById('hmi-battle-attacktext');
    const optionsEl = document.getElementById('hmi-battle-options');

    overlay.classList.add('hmi-shake');
    playSFX('wrong');
    setTimeout(() => overlay.classList.remove('hmi-shake'), 350);

    if (attackTextEl) attackTextEl.textContent = `${round.attacker}: "${round.attackText}"`;
    if (optionsEl) {
        optionsEl.innerHTML = '';
        round.responses.forEach(resp => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = resp.text;
            btn.addEventListener('click', () => {
                battleTension = Math.max(0, Math.min(100, battleTension + resp.tension));
                updateTensionBar();
                playSFX(resp.tension < 0 ? 'correct' : 'click');
                optionsEl.querySelectorAll('button').forEach(b => b.disabled = true);
                setTimeout(() => runBattleRound(idx + 1, onComplete), 600);
            });
            optionsEl.appendChild(btn);
        });
    }
}

function startArgumentBattle(onComplete) {
    isBattleActive = true;
    if (phaserGame && phaserGame.input && phaserGame.input.keyboard) phaserGame.input.keyboard.enabled = false;

    battleTension = 50;
    injectBattleStyles();
    buildBattleOverlay();
    updateTensionBar();

    runBattleRound(0, () => {
        isBattleActive = false;
        onComplete();
    });
}

function handleWrongAnswer(reason) {
    playerLives--;
    updateHUD();
    closeQuizModal();

    if (playerLives <= 0) {
        showGameOverModal();
        return;
    }

    if (isForumMode && lastForumData) {
        showToast(`❌ ${reason} Forum masih menunggu argumenmu... (Nyawa: ${playerLives})`);
        setTimeout(() => {
            openForumModal(lastForumData);
        }, 1500);
    } else {
        showToast(`❌ ${reason} Nyawa: ${playerLives}`);
    }
}

function showToast(message, duration = 1800) {
    let toast = document.getElementById('hmi-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'hmi-toast';
        toast.style.cssText = `
            position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
            background: rgba(17,24,39,0.95); color: #fff; padding: 12px 22px;
            border-radius: 10px; border: 2px solid #ef4444; font: bold 15px Arial, sans-serif;
            z-index: 9999; max-width: 80vw; text-align: center; box-shadow: 0 6px 20px rgba(0,0,0,.4);
            transition: opacity .25s ease; pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

function showGameOverModal() {
    const statusTitle = document.getElementById('status-title');
    const statusMsg = document.getElementById('status-msg');
    const btnAction = document.getElementById('btn-status-action');

    if (statusTitle) statusTitle.innerText = "❌ GAME OVER";
    if (statusMsg) statusMsg.innerText = "Indeks kelulusan Anda gugur. Silakan mengulang dari awal!";
    if (btnAction) btnAction.innerText = "Ulangi dari Awal";
    if (statusModal) statusModal.classList.remove('hidden');
}

function injectGordonStyles() {
    if (document.getElementById('hmi-gordon-styles')) return;
    const style = document.createElement('style');
    style.id = 'hmi-gordon-styles';
    style.textContent = `
        @keyframes hmiGordonFadeBg { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hmiGordonFlash { 0% { opacity: .95; } 100% { opacity: 0; } }
        @keyframes hmiGordonDrop {
            0%   { transform: translateY(-260px) scale(.4) rotate(-14deg); opacity: 0; }
            55%  { transform: translateY(18px) scale(1.08) rotate(4deg); opacity: 1; }
            75%  { transform: translateY(-8px) scale(.98) rotate(-2deg); }
            100% { transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes hmiGordonGlow { 0%,100% { box-shadow: 0 0 26px 6px rgba(250,204,21,.5); } 50% { box-shadow: 0 0 48px 16px rgba(250,204,21,.9); } }
        @keyframes hmiGordonTwinkle { 0%,100% { opacity: 0; transform: scale(.3) rotate(0deg); } 50% { opacity: 1; transform: scale(1.3) rotate(35deg); } }
        @keyframes hmiGordonBannerIn { from { transform: translateX(130%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes hmiGordonBtnIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        #hmi-gordon-overlay {
            position: fixed; inset: 0; z-index: 9700; display: flex; flex-direction: column;
            align-items: center; justify-content: center; overflow: hidden;
            background: radial-gradient(circle at center, #1c2b20 0%, #0a0f0c 80%);
            animation: hmiGordonFadeBg .4s ease both; font-family: Arial, sans-serif;
        }
        #hmi-gordon-flash { position: absolute; inset: 0; background: #fff; animation: hmiGordonFlash .6s ease-out .25s both; pointer-events: none; }
        .hmi-gordon-medal { position: relative; width: 220px; height: 340px; animation: hmiGordonDrop 1s cubic-bezier(.34,1.56,.64,1) .35s both; }
        .hmi-gordon-strap {
            position: absolute; top: -6px; width: 48px; height: 190px; border: 3px solid #000; border-radius: 6px;
            background: repeating-linear-gradient(180deg, #16a34a 0 10px, #0a0a0a 10px 16px);
        }
        .hmi-gordon-strap-left { left: 34px; transform: rotate(18deg); transform-origin: top center; }
        .hmi-gordon-strap-right { right: 34px; transform: rotate(-18deg); transform-origin: top center; }
        .hmi-gordon-pendant {
            position: absolute; left: 50%; top: 150px; transform: translateX(-50%); width: 96px;
            border: 3px solid #000; border-radius: 8px 8px 0 0; overflow: hidden;
            clip-path: polygon(0 0, 100% 0, 100% 76%, 50% 100%, 0 76%);
            animation: hmiGordonGlow 1.8s ease-in-out 1.2s infinite;
        }
        .hmi-gordon-pendant-top { background: #111827; color: #f1f5f9; text-align: center; font-size: 26px; padding: 10px 0 6px; letter-spacing: 3px; }
        .hmi-gordon-pendant-bottom { background: #16a34a; color: #fff; text-align: center; font: 900 18px/1.25 Arial; padding: 8px 0 30px; letter-spacing: 3px; }
        .hmi-gordon-sparkle { position: absolute; font-size: 20px; color: #fde68a; animation: hmiGordonTwinkle 1.4s ease-in-out infinite; pointer-events: none; }
        #hmi-gordon-banner {
            position: absolute; top: 8%; right: 4%; max-width: 320px; background: #0a0f1a; color: #fde68a;
            border: 3px solid #f1f5f9; border-radius: 10px; padding: 14px 18px; font: bold 15px/1.4 'Courier New', monospace;
            text-align: left; animation: hmiGordonBannerIn .6s ease-out 1s both; box-shadow: 0 8px 24px rgba(0,0,0,.5);
        }
        #hmi-gordon-caption { margin-top: 26px; color: #d1fae5; font-size: 14px; letter-spacing: 1px; text-align: center; opacity: 0; animation: hmiGordonBtnIn .5s ease .9s forwards; }
        #hmi-gordon-continue {
            margin-top: 22px; padding: 10px 28px; font-weight: 800; font-size: 15px; border-radius: 8px;
            border: 2px solid #fde68a; background: #16a34a; color: #fff; cursor: pointer; opacity: 0;
            animation: hmiGordonBtnIn .5s ease 1.9s forwards;
        }
        #hmi-gordon-continue:hover { background: #15803d; }
    `;
    document.head.appendChild(style);
}

function buildGordonOverlay() {
    let overlay = document.getElementById('hmi-gordon-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'hmi-gordon-overlay';

    let sparklesHtml = '';
    const sparklePositions = [
        { top: '18%', left: '30%', delay: '0s' },
        { top: '30%', left: '68%', delay: '.3s' },
        { top: '50%', left: '22%', delay: '.6s' },
        { top: '55%', left: '78%', delay: '.15s' },
        { top: '70%', left: '38%', delay: '.45s' },
        { top: '68%', left: '62%', delay: '.75s' }
    ];
    sparklePositions.forEach(p => {
        sparklesHtml += `<span class="hmi-gordon-sparkle" style="top:${p.top};left:${p.left};animation-delay:${p.delay};">✦</span>`;
    });

    overlay.innerHTML = `
        <div id="hmi-gordon-flash"></div>
        <div id="hmi-gordon-banner">🏅 Kader Berhasil!<br>Kamu memperoleh<br><span style="font-size:18px;">GORDON HMI</span>!</div>
        <div class="hmi-gordon-medal">
            <div class="hmi-gordon-strap hmi-gordon-strap-left"></div>
            <div class="hmi-gordon-strap hmi-gordon-strap-right"></div>
            ${sparklesHtml}
            <div class="hmi-gordon-pendant">
                <div class="hmi-gordon-pendant-top">☾✦</div>
                <div class="hmi-gordon-pendant-bottom">H<br>M<br>I</div>
            </div>
        </div>
        <div id="hmi-gordon-caption">Lambang Insan Akademis, Pencipta &amp; Pengabdi</div>
        <button id="hmi-gordon-continue" type="button">Lanjutkan</button>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function showGordonReward(onComplete) {
    isGordonActive = true;
    if (phaserGame && phaserGame.input && phaserGame.input.keyboard) phaserGame.input.keyboard.enabled = false;

    injectGordonStyles();
    const overlay = buildGordonOverlay();
    playSFX('levelup');
    setTimeout(() => playSFX('correct'), 900);

    const btn = document.getElementById('hmi-gordon-continue');
    if (btn) {
        btn.addEventListener('click', () => {
            playSFX('click');
            overlay.remove();
            isGordonActive = false;
            onComplete();
        });
    }
}

function showVictoryModal() {
    isGameFinished = true;
    const statusTitle = document.getElementById('status-title');
    const statusMsg = document.getElementById('status-msg');
    const btnAction = document.getElementById('btn-status-action');

    if (statusTitle) statusTitle.innerText = "🎉 SELAMAT, LULUS LK 1 & LK 2!";
    if (statusMsg) statusMsg.innerText = "Yakin Usaha Sampai! Kamu telah menyelesaikan seluruh perjalanan perkaderan HMI.";
    if (btnAction) btnAction.innerText = "Main Lagi dari Awal";
    if (statusModal) statusModal.classList.remove('hidden');
}

const FALLBACK_HINT = "Ananda, cermati kembali poin-poin materi pokok dalam modul perkaderanmu, lalu singkirkan pilihan yang paling tidak sejalan dengan nilai-nilai HMI.";

async function getLafranAIHint(question) {
    if (!GEMINI_API_KEY) return FALLBACK_HINT;

    const promptText = `Kamu adalah Ayanda Lafran Pane, pendiri HMI.
Berikan petunjuk singkat kepada kader tanpa membocorkan jawaban langsung.
Maksimal 2-3 kalimat. Sapa dengan "Ananda".
Pertanyaan: ${question}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
            }),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`API merespons status ${response.status}`);

        const data = await response.json();
        const hint = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (!hint) throw new Error("Format respons AI tidak sesuai dugaan");
        return hint;
    } catch (error) {
        console.warn('[HMI Game] Lafran AI hint gagal:', error);
        return FALLBACK_HINT;
    } finally {
        clearTimeout(timeoutId);
    }
}

// INISIALISASI SETELAH DOM SELESAI SIAP
document.addEventListener('DOMContentLoaded', () => {
    quizModal = document.getElementById('quiz-modal');
    lafranModal = document.getElementById('lafran-modal');
    statusModal = document.getElementById('status-modal');
    storyOverlay = document.getElementById('story-overlay');

    questionText = document.getElementById('question-text');
    optionsContainer = document.getElementById('options-container');
    screenerTitle = document.getElementById('screener-title');
    posBadge = document.getElementById('pos-badge');
    lafranResponse = document.getElementById('lafran-response');
    progressInfo = document.getElementById('progress-info');
    levelBadge = document.getElementById('level-badge');
    livesInfo = document.getElementById('lives-info');
    timerText = document.getElementById('timer-text');
    speakerName = document.getElementById('speaker-name');
    dialogueText = document.getElementById('dialogue-text');
    portraitImg = document.getElementById('portrait-img');

    if (storyOverlay) {
        storyOverlay.addEventListener('click', () => {
            if (isStoryActive) advanceStory();
        });
    }

    const btnCloseQuiz = document.getElementById('btn-close-quiz');
    if (btnCloseQuiz) btnCloseQuiz.addEventListener('click', closeQuizModal);

    const btnLafran = document.getElementById('btn-lafran');
    if (btnLafran) {
        btnLafran.addEventListener('click', async () => {
            hintTimeRemaining = timeLeft;
            clearInterval(timerInterval);
            if (quizModal) quizModal.classList.add('hidden');
            if (lafranModal) lafranModal.classList.remove('hidden');

            typeWriterEffect(lafranResponse, "Ayanda Lafran sedang merenungkan petunjuk untukmu...", 15, async () => {
                let hint = await getLafranAIHint(currentQuestionText || "Forum Debat");
                typeWriterEffect(lafranResponse, hint, 20);
            });
        });
    }

    const btnCloseLafran = document.getElementById('btn-close-lafran');
    if (btnCloseLafran) {
        btnCloseLafran.addEventListener('click', () => {
            if (lafranModal) lafranModal.classList.add('hidden');
            if (quizModal) quizModal.classList.remove('hidden');
            startTimer(hintTimeRemaining ?? 30);
        });
    }

    const btnStatusAction = document.getElementById('btn-status-action');
    if (btnStatusAction) {
        btnStatusAction.addEventListener('click', () => {
            if (statusModal) statusModal.classList.add('hidden');
            const staleBattle = document.getElementById('hmi-battle-overlay');
            if (staleBattle) staleBattle.remove();
            isBattleActive = false;
            battleTension = 50;
            Object.keys(touchState).forEach(k => { touchState[k] = false; });
            playerLives = 3;
            completedPosIds.clear();
            currentLevel = 'lk1';
            isGameFinished = false;
            updateHUD();
            if (activeScene) activeScene.switchMap('screening');
            if (phaserGame && phaserGame.input && phaserGame.input.keyboard) phaserGame.input.keyboard.enabled = true;
            window.focus();
        });
    }

    // ===== Kontrol sentuh (Pointer Events: touch + mouse, multi-touch aman) =====
    const releaseAllTouch = () => { Object.keys(touchState).forEach(k => { touchState[k] = false; }); };
    const bindHold = (id, dir) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try { btn.setPointerCapture(e.pointerId); } catch (_) { /* abaikan */ }
            touchState[dir] = true;
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
            btn.addEventListener(ev, () => { touchState[dir] = false; }));
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    bindHold('btn-up', 'up');
    bindHold('btn-down', 'down');
    bindHold('btn-left', 'left');
    bindHold('btn-right', 'right');

    const btnActionE = document.getElementById('btn-action-e');
    if (btnActionE) {
        btnActionE.addEventListener('pointerdown', (e) => { e.preventDefault(); tryInteract(); });
        btnActionE.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    window.addEventListener('blur', releaseAllTouch);
    document.addEventListener('visibilitychange', releaseAllTouch);
    // Tampilkan kontrol sentuh juga di perangkat hybrid begitu layar pertama kali disentuh
    window.addEventListener('touchstart', () => document.body.classList.add('touch-active'), { once: true, passive: true });

    // STARTS PHASER GAME
    try {
        phaserGame = new Phaser.Game(config);
    } catch (err) {
        console.error('[HMI Game] Phaser gagal dijalankan:', err);
        const gc = document.getElementById('game-container');
        if (gc) gc.innerHTML = '<p style="color:#fff;padding:24px;font-weight:bold">Game gagal dimuat. Muat ulang halaman.</p>';
    }
    updateHUD();
});