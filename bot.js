// =====================================================
//   TWT WHATSAPP BOT — v0.2
//   All config at top — change before giving to Tanhaa
// =====================================================

const CONFIG = {
  ADMIN_NUMBER          : '923223477992@c.us',
  SECRET_COMMAND        : 'xtrader_admin',
  PREMIUM_INVITE        : 'https://chat.whatsapp.com/XXXXXXXXXXXXXX',
  BEP20_ADDRESS         : '0xYOURADDRESSHERE',
  BOT_NAME              : 'TWT Premium',
  SUPPORT_NUMBER        : '923223477992',
  IB_LINK               : '',
  IB_PARTNER_CODE       : '',
  IB_VIDEO_LINK         : '',
  EXPIRY_REMINDER_DAYS  : 3,
  INACTIVE_WARNING_HOURS: 24,
  ADMIN_REVIEW_HOURS    : 24,
  SPAM_COOLDOWN_SECONDS : 3,
  MAINTENANCE_MODE      : false,
  BACKUP_KEEP_COUNT     : 10,
  DB_VERSION            : '0.2',

  EXCHANGES: [
    { name: 'Exness', link: '' }
  ],

  // v0.2: Model removed — only valid Exness account types
  ACCOUNT_TYPES: ['Standard', 'Pro', 'Raw Spread', 'Zero'],

  PLANS: [
    { key: '1', label: '1 Month',  price: 30,  days: 30,    savingPct: null, savingAmt: null },
    { key: '2', label: '3 Months', price: 80,  days: 90,    savingPct: 12,   savingAmt: 10   },
    { key: '3', label: 'Yearly',   price: 270, days: 365,   savingPct: 25,   savingAmt: 90   },
    { key: '4', label: 'Lifetime', price: 500, days: 36500, savingPct: null, savingAmt: null },
  ],

  WELCOME_MESSAGE: `Assalam-o-Alaikum 👋

Welcome to TWT Premium Group!

Please read these instructions carefully before taking any trade.

━━━━━━━━━━━━━━━━━━━━

📊 *Daily Levels*
Daily buy & sell levels will be shared regularly.

🟥 Red Zone = Sell Area
🟩 Green Zone = Buy Area

Each level includes its timeframe.

━━━━━━━━━━━━━━━━━━━━

🎯 *Entry Rule*
Take trades only from the exact level provided.
Do not enter early or use guess entries.

━━━━━━━━━━━━━━━━━━━━

💰 *Profit Target*
Target is usually 150–200 pips per level.
After securing profit, you may keep a small lot running if desired.

━━━━━━━━━━━━━━━━━━━━

⛔ *Exit Rule*
Do not exit until the candle closes clearly beyond the same timeframe level.
A proper candle close = level break.

━━━━━━━━━━━━━━━━━━━━

⚙️ *Layered Entry System*
1️⃣ First Entry → Initial touch
2️⃣ Second Entry → 50% zone
3️⃣ Third Entry → Full zone sweep

━━━━━━━━━━━━━━━━━━━━

📌 *Important*
Trade every valid level with discipline and patience.
Consistency and risk management are the keys to long-term success.

Stay disciplined and trade smart 💪

— Tanha Bhai`,

  _BACKEND: {
    STANDARD_THRESHOLD: 0.10,
    CENT_THRESHOLD    : 0.05,
    INACTIVE_DAYS     : 5,
  },
};

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function getUserScreenshotDir(userId) {
  const dir = path.join(SCREENSHOTS_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveScreenshot(userId, type, mediaData) {
  try {
    const dir      = getUserScreenshotDir(userId);
    const ext      = mediaData.mimetype?.includes('png') ? 'png' : 'jpg';
    const filename = `${type}_${Date.now()}.${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, Buffer.from(mediaData.data, 'base64'));
    log(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch(e) {
    log(`Screenshot save error: ${e.message}`, 'ERROR');
    return null;
  }
}

function log(msg, type = 'INFO') {
  const ts   = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' });
  const line = `[${ts}] [${type}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync('bot.log', line + '\n'); } catch(e) {}
}

function audit(action, adminId, details) {
  const ts   = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' });
  const line = `[${ts}] ADMIN:${adminId?.replace('@c.us','')} ACTION:${action} ${JSON.stringify(details)}`;
  console.log(`  [AUDIT] ${line}`);
  try { fs.appendFileSync('audit.log', line + '\n'); } catch(e) {}
}

const DB_FILE       = 'database.json';
const PENDING_FILE  = 'pending.json';
const WARNINGS_FILE = 'warnings.json';

function safeSave(filepath, data) {
  const tmp = filepath + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify({
      _version: CONFIG.DB_VERSION,
      _savedAt: new Date().toISOString(),
      data,
    }, null, 2));
    fs.renameSync(tmp, filepath);
  } catch(e) { log(`Save failed ${filepath}: ${e.message}`, 'ERROR'); }
}

function safeLoad(filepath) {
  try {
    if (!fs.existsSync(filepath)) return {};
    const raw    = fs.readFileSync(filepath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.data || parsed;
  } catch(e) {
    log(`Load error ${filepath}: ${e.message}`, 'ERROR');
    try {
      const bak = filepath + '.backup';
      if (fs.existsSync(bak)) {
        const raw    = fs.readFileSync(bak, 'utf8');
        const parsed = JSON.parse(raw);
        log(`Recovered from backup: ${bak}`, 'WARN');
        return parsed.data || parsed;
      }
    } catch(e2) {}
    return {};
  }
}

let database = safeLoad(DB_FILE);
let pending  = safeLoad(PENDING_FILE);
let warnings = safeLoad(WARNINGS_FILE);

function saveDB()       { safeSave(DB_FILE,       database); }
function savePending()  { safeSave(PENDING_FILE,  pending);  }
function saveWarnings() { safeSave(WARNINGS_FILE, warnings); }
function saveAll()      { saveDB(); savePending(); saveWarnings(); }

process.on('SIGINT',  () => { log('Shutting down — saving data...'); saveAll(); process.exit(0); });
process.on('SIGTERM', () => { log('SIGTERM — saving data...');       saveAll(); process.exit(0); });

const userState      = {};
const adminState     = {};
const spamCooldown   = {};
const exnessData     = {};
const pendingRemoval = {};

log(`Bot v0.2 starting — Approved: ${Object.keys(database).length} | Pending: ${Object.keys(pending).length}`);
log(`Screenshots folder: ${SCREENSHOTS_DIR}`);

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('\n✅ Scan QR code with your WhatsApp!\n');
});

client.on('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅  ${CONFIG.BOT_NAME} BOT v0.2 — LIVE & RUNNING`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Terminal commands: export | stats | maintenance | open-screenshots | quit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('Bot v0.2 ready');

  setInterval(() => { saveAll(); log('Auto-backup done'); },   60 * 60 * 1000);
  setInterval(checkExpiryReminders,                            12 * 60 * 60 * 1000);
  setInterval(checkExpiredUsers,                               24 * 60 * 60 * 1000);
  setInterval(checkWarnings,                                   60 * 60 * 1000);
  setInterval(cleanupStates,                                   30 * 60 * 1000);
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', input => {
  const cmd = input.trim().toLowerCase();
  if (cmd === 'export') {
    const ts   = new Date().toISOString().replace(/[:.]/g, '-');
    const file = `backup_v0.2_${ts}.json`;
    fs.writeFileSync(file, JSON.stringify({
      exportedAt: new Date().toISOString(), version: 'v0.2',
      database, pending, exnessData, warnings,
    }, null, 2));
    log(`Exported: ${file}`);
    console.log(`✅ Exported: ${file}`);
    rotateBackups();
  }
  else if (cmd === 'stats') {
    const all = Object.values(database);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 BOT STATS v0.2');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Total Approved : ${all.length}`);
    console.log(`✅ Active         : ${all.filter(m=>m.status==='Active').length}`);
    console.log(`❌ Inactive       : ${all.filter(m=>m.status==='Inactive').length}`);
    console.log(`⌛ Expired        : ${all.filter(m=>m.approvalStatus==='expired').length}`);
    console.log(`💎 IB/Free        : ${all.filter(m=>m.accessType==='ib').length}`);
    console.log(`💰 Paid           : ${all.filter(m=>m.accessType==='paid').length}`);
    console.log(`⏳ Pending        : ${Object.keys(pending).length}`);
    console.log(`⚠️  Warnings       : ${Object.keys(warnings).length}`);
    console.log(`🔧 Maintenance    : ${CONFIG.MAINTENANCE_MODE ? 'ON' : 'OFF'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  else if (cmd === 'maintenance') {
    CONFIG.MAINTENANCE_MODE = !CONFIG.MAINTENANCE_MODE;
    console.log(`✅ Maintenance mode: ${CONFIG.MAINTENANCE_MODE ? 'ON' : 'OFF'}`);
  }
  else if (cmd === 'open-screenshots') {
    const { exec } = require('child_process');
    if (process.platform === 'darwin')     { exec(`open "${SCREENSHOTS_DIR}"`);     console.log(`✅ Opened screenshots folder in Finder`); }
    else if (process.platform === 'win32') { exec(`explorer "${SCREENSHOTS_DIR}"`); console.log(`✅ Opened screenshots folder in Explorer`); }
    else                                   { console.log(`📁 Screenshots path: ${SCREENSHOTS_DIR}`); }
  }
  else if (cmd === 'quit') { saveAll(); process.exit(0); }
  else { console.log('Commands: export | stats | maintenance | open-screenshots | quit'); }
});

function rotateBackups() {
  try {
    const files = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json')).sort();
    while (files.length > CONFIG.BACKUP_KEEP_COUNT) fs.unlinkSync(files.shift());
  } catch(e) {}
}

async function send(to, text) {
  try { await client.sendMessage(to, text); }
  catch(e) { log(`Send error to ${to}: ${e.message}`, 'ERROR'); }
}

async function sendLong(to, text) {
  const MAX = 3500;
  if (text.length <= MAX) { await send(to, text); return; }
  const chunks = [];
  let current  = '';
  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > MAX) { chunks.push(current); current = ''; }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  for (const chunk of chunks) { await send(to, chunk); await sleep(500); }
}

async function forwardMediaToAdmin(media, caption) {
  try {
    await client.sendMessage(CONFIG.ADMIN_NUMBER, media, { caption });
    log(`Media forwarded to admin: ${caption?.substring(0,50)}`);
  } catch(e) {
    log(`Media forward error: ${e.message}`, 'ERROR');
  }
}

// v0.2: Save screenshot + immediately forward to admin
async function saveAndForward(userId, type, mediaData, adminCaption) {
  const filepath = saveScreenshot(userId, type, mediaData);
  if (filepath) {
    try {
      const media = MessageMedia.fromFilePath(filepath);
      await forwardMediaToAdmin(media, adminCaption);
    } catch(e) {
      log(`Forward after save error: ${e.message}`, 'ERROR');
    }
  }
  return filepath;
}

// v0.2: Send screenshots of ONE specific member to a recipient — fix for find member bug
async function sendMemberScreenshots(userId, memberName, recipientId) {
  const dir = path.join(SCREENSHOTS_DIR, userId || 'unknown');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  if (!files.length) return;
  for (const file of files) {
    try {
      const media = MessageMedia.fromFilePath(path.join(dir, file));
      await client.sendMessage(recipientId, media, { caption: `📸 ${memberName} — ${file}` });
      log(`Screenshot sent to ${recipientId}: ${file}`);
      await sleep(1000);
    } catch(e) {
      log(`Screenshot send error ${file}: ${e.message}`, 'ERROR');
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function nowISO()  { return new Date().toISOString(); }

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  try {
    return new Date(isoStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi'
    });
  } catch(e) { return isoStr; }
}

function toISODate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normalizeEmail(e)   { return e.toLowerCase().trim(); }
function normalizeAccount(a) { if (!a) return null; const c = a.trim(); return c.startsWith('#') ? c : '#' + c; }
function isValidAccount(t)   { return /^#?\d{6,12}$/.test(t.trim()); }
function isValidEmail(e)     { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidPhone(p)     { return /^\+?[\d\s\-]{7,15}$/.test(p.trim()); }
function getPlanByKey(key)   { return CONFIG.PLANS.find(p => p.key === key); }
function getExchange()       { return CONFIG.EXCHANGES[0] || { name: 'Exness', link: '' }; }
function getPendingList()    { return Object.entries(pending); }

function generateUserID() {
  return 'TWT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function getPlanList() {
  return CONFIG.PLANS.map(p => {
    if (p.key === '4') return `*${p.key}* — ${p.label} — $${p.price}  _(Best Value)_`;
    if (p.savingPct)   return `*${p.key}* — ${p.label} — $${p.price}  _(~${p.savingPct}% off · saves $${p.savingAmt})_`;
    return `*${p.key}* — ${p.label} — $${p.price}`;
  }).join('\n');
}

function getAccountTypeMsg() {
  return (
    `Which account type did you create?\n\n` +
    CONFIG.ACCOUNT_TYPES.map((t, i) => `*${i+1}* — ${t}`).join('\n')
  );
}

function isSpam(id) {
  const now  = Date.now();
  const last = spamCooldown[id] || 0;
  if (now - last < CONFIG.SPAM_COOLDOWN_SECONDS * 1000) return true;
  spamCooldown[id] = now;
  return false;
}

function cleanupStates() {
  const now     = Date.now();
  const TIMEOUT = 30 * 60 * 1000;
  for (const id in userState)    { if (userState[id]?.lastActivity    && now - userState[id].lastActivity    > TIMEOUT) delete userState[id];    }
  for (const id in adminState)   { if (adminState[id]?.lastActivity   && now - adminState[id].lastActivity   > TIMEOUT) delete adminState[id];   }
  for (const id in spamCooldown) { if (now - spamCooldown[id] > 60000) delete spamCooldown[id]; }
}

function fullResetUser(id) { delete userState[id]; }

function addHistory(record, type, oldVal, newVal, screenshotPath) {
  if (!record.history) record.history = [];
  record.history.push({
    type,
    oldValue      : oldVal        || null,
    newValue      : newVal        || null,
    date          : nowISO(),
    dateDisplay   : formatDate(nowISO()),
    screenshotPath: screenshotPath || null,
  });
}

function getAccessOptionsMsg() {
  const ex = getExchange();
  return (
    `📢 *${CONFIG.BOT_NAME}*\n\n` +
    `Choose how you would like to join:\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💎 *Option 1 — Free Access (Exness IB)*\n\n` +
    `Join for free by creating an Exness account using our referral link or changing your current IB partner code to ours.\n\n` +
    `🔗 Referral Link:\n${ex.link || '(Coming soon)'}\n\n` +
    `🔑 Partner Code:\n${CONFIG.IB_PARTNER_CODE || '(Coming soon)'}\n\n` +
    `🎥 How to Change IB:\n${CONFIG.IB_VIDEO_LINK || '(Coming soon)'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 *Option 2 — Paid Access*\n\n` +
    `${getPlanList()}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 *What You Get:*\n` +
    `• 5–7 Daily Trades\n` +
    `• Gold & Crypto Signals\n` +
    `• Risk Management Guidance\n` +
    `• Private WhatsApp Group Access\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Reply *1* for Free Access or *2* for Paid Access`
  );
}

function getSupportMenu() {
  return (
    `👋 *Welcome to ${CONFIG.BOT_NAME} Support*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `• *hi* — Start new registration\n` +
    `• *mydata* — View your account details\n` +
    `• *renew* — Renew your subscription\n` +
    `• *cancel* — Cancel current process\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `For assistance, contact: wa.me/${CONFIG.SUPPORT_NUMBER}`
  );
}

function findPendingByQuery(query) {
  const q = query.toLowerCase().trim();
  return Object.entries(pending).find(([, v]) =>
    v.userId?.toLowerCase() === q ||
    v.name?.toLowerCase()   === q ||
    v.whatsappNumber?.replace('@c.us','') === q.replace(/[^0-9]/g,'')
  ) || null;
}

function findApprovedByQuery(query) {
  const q = query.toLowerCase().trim();
  return Object.entries(database).find(([k, v]) =>
    v.userId?.toLowerCase()  === q ||
    v.name?.toLowerCase()    === q ||
    k.replace('@c.us','')    === q.replace(/[^0-9]/g,'') ||
    v.accountNumber          === normalizeAccount(q)
  ) || null;
}

function buildFullMemberReport(m) {
  let report =
    `👤 *Full Member Report*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 User ID       : ${m.userId || 'N/A'}\n` +
    `👤 Full Name     : ${m.name || 'N/A'}\n` +
    `📧 Email         : ${m.email || 'N/A'}\n` +
    `📱 Phone         : ${m.phone || 'N/A'}\n` +
    `📲 WhatsApp      : ${m.whatsappNumber?.replace('@c.us','') || 'N/A'}\n` +
    `🔢 Account No.   : ${m.accountNumber || 'N/A'}\n` +
    `💳 Account Type  : ${m.accountType || 'N/A'}\n` +
    `🔑 Access Type   : ${m.accessType === 'ib' ? 'Free/IB' : 'Paid'}\n` +
    `📦 Plan          : ${m.planLabel || 'N/A'}\n` +
    `💰 Plan Price    : ${m.planPrice ? '$' + m.planPrice : 'N/A'}\n` +
    `💳 Payment       : ${m.paymentStatus || 'N/A'}\n` +
    `📊 Status        : ${m.status || 'N/A'}\n` +
    `✅ Approval      : ${m.approvalStatus || 'N/A'}\n` +
    `📅 Registered    : ${formatDate(m.registeredAt)}\n` +
    `📅 Approved      : ${formatDate(m.approvedAt)}\n` +
    `📅 Sub Start     : ${formatDate(m.subscriptionStart)}\n` +
    `📅 Sub End       : ${formatDate(m.subscriptionEnd)}\n` +
    `🔄 IB Changed    : ${m.ibChanged ? 'Yes' : 'No'}\n`;

  if (m.history && m.history.length > 0) {
    report += `\n📋 *Change History (${m.history.length}):*\n`;
    m.history.forEach((h, i) => {
      report += `\n${i+1}. [${h.type}] — ${h.dateDisplay}\n`;
      if (h.oldValue && !h.oldValue.includes(path.sep)) report += `   Old: ${h.oldValue}\n`;
      if (h.newValue && !h.newValue.includes(path.sep)) report += `   New: ${h.newValue}\n`;
    });
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━`;
  return report;
}

function buildUserRecord(data) {
  return {
    _version          : CONFIG.DB_VERSION,
    userId            : data.userId            || generateUserID(),
    whatsappNumber    : data.whatsappNumber    || null,
    name              : data.name              || null,
    email             : data.email             || null,
    phone             : data.phone             || null,
    accessType        : data.accessType        || null,
    accountNumber     : data.accountNumber     || null,
    accountType       : data.accountType       || null,
    exchange          : data.exchange          || 'Exness',
    usedReferral      : data.usedReferral      || null,
    ibChanged         : data.ibChanged         || false,
    hasExistingAccount: data.hasExistingAccount|| false,
    plan              : data.plan              || null,
    planLabel         : data.planLabel         || null,
    planPrice         : data.planPrice         || null,
    paymentStatus     : data.paymentStatus     || null,
    approvalStatus    : data.approvalStatus    || 'pending',
    subscriptionStart : data.subscriptionStart || null,
    subscriptionEnd   : data.subscriptionEnd   || null,
    expiryReminderSent: false,
    clientId          : data.clientId          || null,
    clientAccount     : data.clientAccount     || null,
    status            : data.status            || 'Active',
    signUpDate        : data.signUpDate        || null,
    lastTradingDate   : data.lastTradingDate   || null,
    partnerCode       : data.partnerCode       || null,
    profit            : data.profit            || null,
    volume            : data.volume            || null,
    reward            : data.reward            || null,
    rebates           : data.rebates           || null,
    balance           : data.balance           || null,
    equity            : data.equity            || null,
    comment           : data.comment           || null,
    country           : data.country           || null,
    registeredAt      : data.registeredAt      || nowISO(),
    approvedAt        : data.approvedAt        || null,
    lastSeen          : data.lastSeen          || nowISO(),
    screenshots       : data.screenshots       || {},
    autoAddEnabled    : false,
    notificationsOn   : true,
    history           : data.history           || [],
    _thresholdOverride: null,
  };
}

// ─────────────────────────────────────────────────────
//  TIMED CHECKS
// ─────────────────────────────────────────────────────
async function checkWarnings() {
  const now = Date.now();
  for (const acc in warnings) {
    const hoursPassed = (now - warnings[acc]) / (1000 * 60 * 60);
    if (hoursPassed >= CONFIG.INACTIVE_WARNING_HOURS) {
      const member = Object.values(database).find(m => m.accountNumber === acc);
      if (member && member.status === 'Inactive') {
        await send(CONFIG.ADMIN_NUMBER,
          `🚨 *24 Hours Passed — Action Required*\n\n` +
          `👤 Name: ${member.name}\n` +
          `🆔 User ID: ${member.userId || 'N/A'}\n` +
          `🔢 Account: ${acc}\n` +
          `📱 WhatsApp: ${member.whatsappNumber?.replace('@c.us','') || 'N/A'}\n\n` +
          `⚠️ Still inactive. Please remove manually.`
        );
        delete warnings[acc];
        saveWarnings();
      }
    }
  }
}

// v0.2: Auto expiry reminder — fixed and tested
async function checkExpiryReminders() {
  const now = new Date();
  for (const num in database) {
    const m = database[num];
    if (!m.subscriptionEnd || m.expiryReminderSent || m.accessType === 'ib') continue;
    const daysLeft = Math.ceil((new Date(m.subscriptionEnd) - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= CONFIG.EXPIRY_REMINDER_DAYS && daysLeft > 0) {
      await send(num,
        `⏰ *Subscription Expiry Reminder*\n\n` +
        `Dear ${m.name},\n\n` +
        `Your subscription expires in *${daysLeft} day(s)* on ${formatDate(m.subscriptionEnd)}.\n\n` +
        `To renew, please reply with *renew*.\n\n` +
        `For assistance, contact: wa.me/${CONFIG.SUPPORT_NUMBER}`
      );
      database[num].expiryReminderSent = true;
      saveDB();
      log(`Expiry reminder sent: ${m.name} — ${daysLeft} day(s) left`);
    }
  }
}

async function checkExpiredUsers() {
  const now = new Date();
  for (const num in database) {
    const m = database[num];
    if (!m.subscriptionEnd || m.approvalStatus !== 'approved' || m.accessType === 'ib') continue;
    if (new Date(m.subscriptionEnd) < now) {
      database[num].approvalStatus = 'expired';
      database[num].status         = 'Inactive';
      saveDB();
      log(`Subscription expired: ${m.name} (${m.userId})`);
      await send(num,
        `⚠️ *Your Subscription Has Ended*\n\n` +
        `Dear ${m.name},\n\n` +
        `Your premium subscription has expired.\n\n` +
        `To continue, please reply with *renew*.\n\n` +
        `For assistance, contact: wa.me/${CONFIG.SUPPORT_NUMBER}`
      );
      await send(CONFIG.ADMIN_NUMBER,
        `⏰ *Subscription Expired*\n\n` +
        `👤 ${m.name}  |  🆔 ${m.userId || 'N/A'}\n` +
        `📱 ${num.replace('@c.us','')}\n` +
        `📦 Plan was: ${m.planLabel || 'N/A'}\n\n` +
        `⚠️ Please remove from the group manually.`
      );
    }
  }
}

// ─────────────────────────────────────────────────────
//  APPROVE / REJECT / REMOVE
// ─────────────────────────────────────────────────────
async function approveUser(adminId, query) {
  const list    = getPendingList();
  const asIndex = parseInt(query) - 1;
  let entry     = null;

  if (!isNaN(asIndex) && asIndex >= 0 && asIndex < list.length) entry = list[asIndex];
  else entry = findPendingByQuery(query);
  if (!entry) return send(adminId, `⚠️ User not found: *${query}*\n\nUse option *3* to see pending list.`);

  const [num, data] = entry;
  const plan   = getPlanByKey(data.plan) || { label: 'IB/Free', price: 0, days: 36500 };
  const endISO = toISODate(plan.days);
  const record = buildUserRecord({
    ...data,
    approvalStatus   : 'approved',
    approvedAt       : nowISO(),
    subscriptionStart: nowISO(),
    subscriptionEnd  : endISO,
    status           : 'Active',
  });

  database[num] = record;
  delete pending[num];
  saveDB(); savePending();
  audit('APPROVE', adminId, { name: data.name, userId: data.userId, accessType: data.accessType });
  log(`✅ Approved: ${data.name} (${data.userId})`);

  // v0.2: Expiry date shown in approve message for paid users
  await send(num,
    `🎉 *Congratulations ${data.name}! Your application has been approved.*\n\n` +
    `🆔 *Your User ID: ${data.userId}*\n\n` +
    (data.accessType === 'paid'
      ? `📦 Plan: ${plan.label} — $${plan.price}\n📅 Valid until: *${formatDate(endISO)}*\n\n`
      : `✅ Access Type: Free via Exness IB\n\n`) +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *Join Premium Group:*\n${CONFIG.PREMIUM_INVITE}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `To renew your subscription in the future, simply reply: *renew*`
  );
  await sleep(1000);
  await send(num, CONFIG.WELCOME_MESSAGE);

  return send(adminId,
    `✅ *Approved Successfully!*\n` +
    `👤 ${data.name}  |  🆔 ${data.userId}\n` +
    `🔑 ${data.accessType === 'ib' ? 'Free/IB' : plan.label}`
  );
}

async function rejectUser(adminId, query, reason) {
  const list    = getPendingList();
  const asIndex = parseInt(query) - 1;
  let entry     = null;

  if (!isNaN(asIndex) && asIndex >= 0 && asIndex < list.length) entry = list[asIndex];
  else entry = findPendingByQuery(query);
  if (!entry) return send(adminId, `⚠️ User not found: *${query}*\n\nUse option *3* to see pending list.`);

  const [num, data] = entry;
  delete pending[num];
  savePending();
  audit('REJECT', adminId, { name: data.name, userId: data.userId, reason });
  log(`❌ Rejected: ${data.name} (${data.userId}) — Reason: ${reason}`);

  await send(num,
    `❌ *Your application has been rejected.*\n\n` +
    `Reason: ${reason || 'Not specified'}\n\n` +
    `If you believe this is an error, please contact: wa.me/${CONFIG.SUPPORT_NUMBER}\n\n` +
    `Reply *hi* to submit a fresh application.`
  );
  return send(adminId,
    `❌ *Rejected!*\n` +
    `👤 ${data.name}  |  🆔 ${data.userId}\n` +
    `📋 Reason: ${reason || 'Not specified'}`
  );
}

async function removeMember(adminId, query) {
  const entry = findApprovedByQuery(query);
  if (!entry) return send(adminId, `⚠️ Member not found: *${query}*`);
  const [num, member] = entry;
  pendingRemoval[adminId]  = { num, member };
  adminState[adminId].step = 'ADMIN_REMOVE_CONFIRM';
  return send(adminId,
    `⚠️ *Confirm Member Removal*\n\n` +
    `You are about to remove:\n\n` +
    `👤 ${member.name}\n` +
    `🆔 ${member.userId || 'N/A'}\n` +
    `📱 ${num.replace('@c.us','')}\n\n` +
    `This will:\n` +
    `• Delete all their data permanently\n` +
    `• Send them a removal notification\n\n` +
    `Reply *confirm* to proceed or *cancel* to abort.`
  );
}

// ─────────────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────────────
async function showAdminMenu(id) {
  adminState[id] = { step: 'ADMIN_MENU', lastActivity: Date.now() };
  await send(id,
    `🔐 *${CONFIG.BOT_NAME} — ADMIN PANEL v0.2*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `*1* — Find member\n` +
    `*2* — Full member report\n` +
    `*3* — Pending approvals\n` +
    `*4* — Approve a user\n` +
    `*5* — Reject a user\n` +
    `*6* — Remove a member\n` +
    `*7* — Broadcast to all members\n` +
    `*8* — Stats overview\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Type *exit* to leave admin panel`
  );
}

async function checkAdminExit(id, lo) {
  if (lo === 'exit') {
    delete adminState[id];
    delete pendingRemoval[id];
    await send(id, `👋 *Admin panel closed.*\n\nReply *hi* to continue as a normal user.`);
    return true;
  }
  if (lo === 'back' || lo === 'menu') {
    delete pendingRemoval[id];
    await showAdminMenu(id);
    return true;
  }
  return false;
}

async function handleAdminMenu(id, text, lo) {
  try {
    adminState[id].lastActivity = Date.now();
    if (await checkAdminExit(id, lo)) return;

    if (lo === '1') {
      adminState[id].step = 'ADMIN_FIND';
      return send(id,
        `🔍 *Find Member*\n\n` +
        `Enter any of:\n` +
        `• User ID (TWT-XXXXXX)\n` +
        `• Account number (#123456789)\n` +
        `• WhatsApp number\n` +
        `• Full name`
      );
    }

    if (lo === '2') {
      const all = Object.values(database);
      if (!all.length) return send(id, `⚠️ No members yet.`);
      let msg = `📊 *Member Report (${all.length})*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      all.forEach((m, i) => {
        const icon   = m.status === 'Active' ? '✅' : '❌';
        const access = m.accessType === 'ib' ? '💎 Free/IB' : `💰 ${m.planLabel || 'N/A'}`;
        msg += `${i+1}. ${icon} ${m.name}  (${m.userId || 'N/A'})\n   🔢 ${m.accountNumber || 'N/A'}  ${access}\n   📅 ${formatDate(m.subscriptionEnd)}\n   📱 ${m.whatsappNumber?.replace('@c.us','') || 'N/A'}\n\n`;
      });
      return sendLong(id, msg);
    }

    if (lo === '3') {
      const list = getPendingList();
      if (!list.length) return send(id, `✅ No pending approvals.`);
      let msg = `⏳ *Pending Approvals (${list.length})*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      list.forEach(([num, p], i) => {
        const access = p.accessType === 'ib' ? '💎 Free/IB' : `💰 ${p.planLabel} — $${p.planPrice}`;
        msg +=
          `*#${i+1}*  👤 ${p.name}  🆔 ${p.userId}\n` +
          `   📧 ${p.email}  📱 ${p.phone}\n` +
          `   🔢 ${p.accountNumber || 'N/A'}  💳 ${p.accountType || 'N/A'}  ${access}\n` +
          `   🔄 IB: ${p.ibChanged ? 'Yes' : 'No'}  📲 ${num.replace('@c.us','')}\n\n`;
      });
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `Send *4* to approve a member\n`;
      msg += `Send *5* to reject a member`;
      return sendLong(id, msg);
    }

    if (lo === '4') {
      adminState[id].step = 'ADMIN_APPROVE';
      return send(id,
        `✅ *Approve a Member*\n\n` +
        `Type the member number from the pending list.\n\n` +
        `Example: *approve 1*\n\n` +
        `Send *3* first to see the pending list.`
      );
    }

    if (lo === '5') {
      adminState[id].step = 'ADMIN_REJECT';
      return send(id,
        `❌ *Reject a Member*\n\n` +
        `Type the member number and reason.\n\n` +
        `Example: *reject 1 payment not received*\n\n` +
        `Send *3* first to see the pending list.`
      );
    }

    if (lo === '6') {
      adminState[id].step = 'ADMIN_REMOVE';
      return send(id, `🗑️ *Remove Member*\n\nEnter User ID, name, or WhatsApp number:`);
    }

    if (lo === '7') {
      adminState[id].step = 'ADMIN_BROADCAST';
      return send(id, `📢 *Broadcast Message*\n\nWill be sent to *${Object.keys(database).length}* members.\n\nType your message:`);
    }

    if (lo === '8') {
      const all = Object.values(database);
      return send(id,
        `📊 *Stats v0.2*\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 Total: ${all.length}\n` +
        `✅ Active: ${all.filter(m=>m.status==='Active').length}\n` +
        `❌ Inactive: ${all.filter(m=>m.status==='Inactive').length}\n` +
        `⌛ Expired: ${all.filter(m=>m.approvalStatus==='expired').length}\n\n` +
        `💎 IB/Free: ${all.filter(m=>m.accessType==='ib').length}\n` +
        `💰 Paid: ${all.filter(m=>m.accessType==='paid').length}\n\n` +
        `⏳ Pending: ${Object.keys(pending).length}\n` +
        `⚠️ Warned: ${Object.keys(warnings).length}\n` +
        `🔧 Maintenance: ${CONFIG.MAINTENANCE_MODE ? 'ON' : 'OFF'}\n` +
        `📁 Screenshots: ${SCREENSHOTS_DIR}\n` +
        `━━━━━━━━━━━━━━━━━━━━`
      );
    }

    return send(id, `⚠️ Invalid option. Reply with a number or *exit*.`);

  } catch(e) {
    log(`Admin menu error: ${e.message}`, 'ERROR');
    return send(id, `⚠️ An error occurred. Please try again.`);
  }
}

async function handleAdminStep(id, text, lo, msg) {
  const step = adminState[id]?.step;
  adminState[id].lastActivity = Date.now();

  if (await checkAdminExit(id, lo)) return;

  if (step === 'ADMIN_FIND') {
    adminState[id].step = 'ADMIN_MENU';
    const input = text.trim();
    const entry = findApprovedByQuery(input);
    if (!entry) {
      const pEntry = findPendingByQuery(input);
      if (pEntry) {
        const [, p] = pEntry;
        return send(id,
          `🔍 *Found in Pending*\n━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ${p.name}  🆔 ${p.userId}\n` +
          `📧 ${p.email}  📱 ${p.phone}\n` +
          `🔢 ${p.accountNumber || 'N/A'}\n` +
          `${p.accessType === 'ib' ? '💎 Free/IB' : `📦 ${p.planLabel}`}\n` +
          `📲 ${p.whatsappNumber?.replace('@c.us','')}\n` +
          `━━━━━━━━━━━━━━━━━━━━`
        );
      }
      return send(id, `⚠️ No member found for: *${input}*`);
    }
    const [, member] = entry;
    await sendLong(id, buildFullMemberReport(member));
    // v0.2: Send ONLY this member's screenshots — bug fix
    await sendMemberScreenshots(member.userId, member.name, id);
    return;
  }

  if (step === 'ADMIN_APPROVE') {
    adminState[id].step = 'ADMIN_MENU';
    const parts = text.trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'approve' || !parts[1]) return send(id, `⚠️ Format: *approve [#number / User ID / name]*`);
    return approveUser(id, parts.slice(1).join(' '));
  }

  if (step === 'ADMIN_REJECT') {
    adminState[id].step = 'ADMIN_MENU';
    const parts = text.trim().split(/\s+/);
    if (parts[0].toLowerCase() !== 'reject' || !parts[1]) return send(id, `⚠️ Format: *reject [#number / User ID / name] [reason]*`);
    let query, reason;
    if (!isNaN(parseInt(parts[1])) || parts[1].toUpperCase().startsWith('TWT-')) {
      query  = parts[1];
      reason = parts.slice(2).join(' ') || 'Not specified';
    } else {
      query  = parts.slice(1, 3).join(' ');
      reason = parts.slice(3).join(' ') || 'Not specified';
    }
    return rejectUser(id, query, reason);
  }

  if (step === 'ADMIN_REMOVE') {
    return removeMember(id, text.trim());
  }

  if (step === 'ADMIN_REMOVE_CONFIRM') {
    if (lo === 'cancel') {
      delete pendingRemoval[id];
      adminState[id].step = 'ADMIN_MENU';
      return send(id, `✅ Removal cancelled.`);
    }
    if (lo === 'confirm') {
      const removal = pendingRemoval[id];
      if (!removal) { adminState[id].step = 'ADMIN_MENU'; return send(id, `⚠️ No removal pending.`); }
      const { num, member } = removal;
      delete database[num];
      delete pendingRemoval[id];
      saveDB();
      adminState[id].step = 'ADMIN_MENU';
      audit('REMOVE', id, { name: member.name, userId: member.userId });
      log(`🗑️ Member removed: ${member.name} (${member.userId})`);
      try {
        await send(num,
          `⚠️ *You have been removed from ${CONFIG.BOT_NAME}.*\n\n` +
          `Your membership has been cancelled.\n\n` +
          `For assistance, contact: wa.me/${CONFIG.SUPPORT_NUMBER}`
        );
      } catch(e) {}
      return send(id,
        `✅ *Member removed successfully.*\n` +
        `👤 ${member.name}  🆔 ${member.userId || 'N/A'}`
      );
    }
    return send(id, `⚠️ Please reply *confirm* to remove or *cancel* to abort.`);
  }

  if (step === 'ADMIN_BROADCAST') {
    adminState[id].step = 'ADMIN_MENU';
    const allNums = Object.keys(database);
    if (!allNums.length) return send(id, `⚠️ No approved members.`);
    let sent = 0;
    for (const num of allNums) {
      try { await send(num, `📢 *${CONFIG.BOT_NAME}:*\n\n${text}`); sent++; await sleep(1500); }
      catch(e) {}
    }
    audit('BROADCAST', id, { sentTo: sent });
    log(`📢 Broadcast sent to ${sent} members`);
    return send(id, `✅ *Broadcast Complete!*\n📢 Sent to *${sent}* members.`);
  }
}

// ─────────────────────────────────────────────────────
//  SUBMIT APPLICATION
// ─────────────────────────────────────────────────────
async function submitApplication(id, data, paymentMedia) {
  const userId        = generateUserID();
  data.userId         = userId;
  data.whatsappNumber = id;
  data.registeredAt   = nowISO();

  const tempFolderName = 'temp_' + id.replace('@c.us', '');
  const tempDir        = path.join(SCREENSHOTS_DIR, tempFolderName);
  const userDir        = path.join(SCREENSHOTS_DIR, userId);

  if (fs.existsSync(tempDir)) {
    try {
      fs.renameSync(tempDir, userDir);
      for (const key in data.screenshots) {
        if (data.screenshots[key]) data.screenshots[key] = data.screenshots[key].replace(tempDir, userDir);
      }
      if (data.history) {
        data.history.forEach(h => {
          if (h.screenshotPath) h.screenshotPath = h.screenshotPath.replace(tempDir, userDir);
        });
      }
    } catch(e) { log(`Folder rename error: ${e.message}`, 'WARN'); }
  }

  if (pending[id]) delete pending[id];
  pending[id] = data;
  savePending();
  fullResetUser(id);
  log(`New ${data.accessType} pending: ${data.name} | ID: ${userId}`);

  const accessLabel = data.accessType === 'ib'
    ? `💎 Free/IB | IB Changed: ${data.ibChanged ? 'Yes' : 'No'}`
    : `💰 ${data.planLabel} — $${data.planPrice}`;

  const adminMsg =
    `⚡ *New Application*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Name     : ${data.name}\n` +
    `🆔 User ID  : ${userId}\n` +
    `📧 Email    : ${data.email}\n` +
    `📱 Phone    : ${data.phone}\n` +
    `🔢 Account  : ${data.accountNumber || 'N/A'}\n` +
    `💳 Acc Type : ${data.accountType || 'N/A'}\n` +
    `${accessLabel}\n` +
    `📲 WhatsApp : ${id.replace('@c.us','')}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Type *${CONFIG.SECRET_COMMAND}* → option *3* to view pending\n` +
    `Approve: *approve ${userId}*`;

  await send(id,
    `✅ *Your application has been submitted successfully!*\n\n` +
    `🆔 *Your User ID: ${userId}*\n\n` +
    `Please save this ID for future reference.\n\n` +
    `🕐 The admin will review within *${CONFIG.ADMIN_REVIEW_HOURS} hours*.\n` +
    `📬 You will be notified once approved.\n\n` +
    `For assistance: wa.me/${CONFIG.SUPPORT_NUMBER}`
  );

  await send(CONFIG.ADMIN_NUMBER, adminMsg);

  const finalDir = fs.existsSync(userDir) ? userDir : (fs.existsSync(tempDir) ? tempDir : null);
  if (finalDir) {
    const files = fs.readdirSync(finalDir);
    for (const file of files) {
      try {
        const media = MessageMedia.fromFilePath(path.join(finalDir, file));
        await forwardMediaToAdmin(media, `📸 ${data.name} (${userId}) — ${file}`);
        await sleep(500);
      } catch(e) { log(`Forward error ${file}: ${e.message}`, 'ERROR'); }
    }
  }

  if (paymentMedia) {
    try { await forwardMediaToAdmin(paymentMedia, `📸 ${data.name} (${userId}) — Payment Proof`); }
    catch(e) { log(`Payment forward error: ${e.message}`, 'ERROR'); }
  }
}

// ─────────────────────────────────────────────────────
//  MAIN MESSAGE HANDLER
// ─────────────────────────────────────────────────────
client.on('message', async msg => {
  try {
    const id   = msg.from;
    const text = msg.body?.trim() || '';
    const lo   = text.toLowerCase();

    if (id.includes('@g.us')) return;

    if (lo === CONFIG.SECRET_COMMAND.toLowerCase()) return showAdminMenu(id);

    if (adminState[id]) {
      if (adminState[id].step === 'ADMIN_MENU') return handleAdminMenu(id, text, lo);
      return handleAdminStep(id, text, lo, msg);
    }

    if (isSpam(id)) return;

    if (database[id]) database[id].lastSeen = nowISO();
    if (userState[id]) userState[id].lastActivity = Date.now();

    const step = userState[id]?.step;

    if (lo === 'cancel' || lo === 'back') {
      fullResetUser(id);
      return send(id, `❌ *Cancelled.*\n\nReply *hi* to start again.`);
    }

    if (lo === 'support' || lo === 'help') return send(id, getSupportMenu());

    // v0.2: mydata shows expiry date in report
    if (lo === 'mydata') {
      const m = database[id];
      if (!m) return send(id, `⚠️ No account found. Reply *hi* to register.`);
      return sendLong(id, buildFullMemberReport(m));
    }

    if (lo === 'hi' || lo === 'hello' || lo === 'start') {
      if (CONFIG.MAINTENANCE_MODE) {
        return send(id, `🔧 *${CONFIG.BOT_NAME} is currently under maintenance.*\n\nPlease try again later.\nContact: wa.me/${CONFIG.SUPPORT_NUMBER}`);
      }
      if (database[id] && database[id].approvalStatus === 'approved') {
        return send(id,
          `👋 *Welcome back, ${database[id].name}!*\n\n` +
          `You are an approved member.\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• *mydata* — View your account\n` +
          `• *renew* — Renew subscription\n` +
          `• *support* — Get help\n` +
          `━━━━━━━━━━━━━━━━━━━━`
        );
      }
      if (pending[id]) {
        return send(id,
          `⏳ *Your application is under review.*\n\n` +
          `🆔 Your User ID: *${pending[id].userId}*\n\n` +
          `You will be notified once approved.\n\n` +
          `Reply *newrequest* to cancel and start over.\n` +
          `Contact: wa.me/${CONFIG.SUPPORT_NUMBER}`
        );
      }
      fullResetUser(id);
      userState[id] = { step: 'NAME', data: { screenshots: {} }, lastActivity: Date.now() };
      return send(id,
        `👋 *Welcome to ${CONFIG.BOT_NAME}!* 🚀\n\n` +
        `⚠️ Providing incorrect information may result in rejection.\n\n` +
        `Let's begin. Please enter your *full name*:`
      );
    }

    // v0.2: Renew flow — skip name/email/phone if already in database, go straight to access choice
    if (lo === 'renew') {
      if (CONFIG.MAINTENANCE_MODE) return send(id, `🔧 Bot is under maintenance. Please try again later.`);
      if (pending[id]) return send(id, `⏳ You have a pending application.\n🆔 ${pending[id].userId}\nWait for approval or reply *newrequest* to start over.`);
      const existing = database[id];
      fullResetUser(id);
      if (existing?.name && existing?.email && existing?.phone) {
        // Already have their details — skip straight to access choice
        userState[id] = {
          step: 'ACCESS_CHOICE',
          data: {
            name       : existing.name,
            email      : existing.email,
            phone      : existing.phone,
            screenshots: {},
          },
          lastActivity: Date.now(),
        };
        return send(id,
          `👋 *Welcome back, ${existing.name}!*\n\n` +
          `Your details are already saved.\n\n` +
          getAccessOptionsMsg()
        );
      }
      // No existing record — start fresh
      userState[id] = {
        step: 'NAME',
        data: { screenshots: {} },
        lastActivity: Date.now(),
      };
      return send(id,
        `👋 *Welcome to ${CONFIG.BOT_NAME}!* 🚀\n\n` +
        `Let's begin. Please enter your *full name*:`
      );
    }

    if (lo === 'newrequest') {
      if (!pending[id]) return send(id, `⚠️ No pending application found. Reply *hi* to register.`);
      delete pending[id]; savePending();
      fullResetUser(id);
      userState[id] = { step: 'NAME', data: { screenshots: {} }, lastActivity: Date.now() };
      return send(id, `✅ *Previous application deleted.*\n\nPlease enter your *full name*:`);
    }

    if (step === 'NAME') {
      if (!text || text.trim().length < 2) return send(id, `⚠️ Please enter your full name:`);
      userState[id].data.name = text.trim();
      userState[id].step = 'EMAIL';
      return send(id, `✅ Thank you!\n\nPlease enter your *email address*:`);
    }

    if (step === 'EMAIL') {
      const email = normalizeEmail(text);
      if (!isValidEmail(email)) return send(id, `❌ That does not appear to be a valid email.\n\nPlease enter a valid email (e.g. example@gmail.com):`);
      const oldEmail = userState[id].data.email;
      userState[id].data.email = email;
      if (database[id] && oldEmail && oldEmail !== email) {
        addHistory(database[id], 'EMAIL_CHANGE', oldEmail, email, null);
        saveDB();
      }
      userState[id].step = 'PHONE';
      return send(id, `✅ Email saved!\n\nPlease enter your *phone number*:`);
    }

    if (step === 'PHONE') {
      if (!isValidPhone(text)) return send(id, `❌ That does not appear to be a valid phone number.\n\nPlease enter a valid phone number:`);
      userState[id].data.phone = text.trim();
      userState[id].step = 'ACCESS_CHOICE';
      return send(id, getAccessOptionsMsg());
    }

    if (step === 'ACCESS_CHOICE') {
      if (lo === '1') {
        userState[id].data.accessType = 'ib';
        userState[id].step = 'IB_EXISTING';
        return send(id,
          `✅ Phone number saved!\n\n` +
          `Do you already have an Exness account?\n\n` +
          `*1* — I already have an Exness account created with your referral link\n` +
          `*2* — I want to create a new account\n` +
          `*3* — I want to change my IB partner code`
        );
      }
      if (lo === '2') {
        userState[id].data.accessType = 'paid';
        userState[id].step = 'PLAN';
        return send(id, `💰 *Paid Membership*\n\nPlease select your plan:\n\n${getPlanList()}`);
      }
      return send(id, `⚠️ Please reply *1* for Free Access or *2* for Paid Access.`);
    }

    if (step === 'IB_EXISTING') {
      if (lo === '1') {
        userState[id].data.hasExistingAccount = true;
        userState[id].data.usedReferral       = 'yes';
        userState[id].step = 'EXNESS_SCREENSHOT';
        return send(id,
          `✅ Great!\n\n` +
          `📸 Please send a screenshot of your *Exness account* showing:\n` +
          `• Your account balance\n` +
          `• Your account number (starts with *#*)`
        );
      }
      if (lo === '2') {
        userState[id].data.hasExistingAccount = false;
        userState[id].data.usedReferral       = 'new';
        userState[id].step = 'NEW_ACCOUNT_SCREENSHOT';
        const ex = getExchange();
        return send(id,
          `📌 *Create your Exness account:*\n\n` +
          `1️⃣ Register using our referral link:\n${ex.link || '(Coming soon)'}\n\n` +
          `2️⃣ Deposit funds\n\n` +
          `3️⃣ Send a screenshot showing:\n` +
          `• Your balance\n` +
          `• Account number (starts with *#*)`
        );
      }
      if (lo === '3') {
        userState[id].data.hasExistingAccount = true;
        userState[id].data.ibChanged          = true;
        userState[id].data.usedReferral       = 'ib_change';
        userState[id].step = 'IB_WAITING';
        return send(id,
          `🔄 *Here's how to change your Exness IB / Partner Code:*\n\n` +
          `You can use either:\n\n` +
          `🔗 *Exness Invite Link:*\n${CONFIG.IB_LINK || '(Coming soon)'}\n\n` +
          `🔑 *Partner Code:*\n${CONFIG.IB_PARTNER_CODE || '(Coming soon)'}\n\n` +
          `📺 *Watch Tutorial:*\n${CONFIG.IB_VIDEO_LINK || '(Coming soon)'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `After requesting the IB change:\n` +
          `1️⃣ Create a new trading account\n` +
          `2️⃣ Transfer your funds\n` +
          `3️⃣ Start trading to activate\n\n` +
          `⏳ IB change requests take *3 days* to process.\n\n` +
          `Once Exness approves, you will receive a confirmation email.\n` +
          `Please send a *screenshot of that email* here.`
        );
      }
      return send(id, `⚠️ Please reply *1*, *2*, or *3* to continue.`);
    }

    if (step === 'IB_WAITING') {
      if (msg.hasMedia) {
        try {
          const media    = await msg.downloadMedia();
          const tempId   = 'temp_' + id.replace('@c.us','');
          const userName = userState[id].data.name || id.replace('@c.us','');
          const filepath = await saveAndForward(tempId, 'ib_email', media, `📸 ${userName} — IB Approval Email`);
          if (filepath) {
            userState[id].data.screenshots['ib_email'] = filepath;
            addHistory(userState[id].data, 'IB_CHANGE', null, CONFIG.IB_PARTNER_CODE || 'TWT IB', filepath);
          }
        } catch(e) { log(`IB email error: ${e.message}`, 'ERROR'); }
        userState[id].step = 'IB_ACCOUNT_SCREENSHOT';
        return send(id,
          `✅ Email screenshot received!\n\n` +
          `📸 Now send your *Exness account screenshot* showing:\n` +
          `• Your balance\n` +
          `• Account number (starts with *#*)`
        );
      }
      return send(id,
        `⏳ *Please wait for your IB change to be approved by Exness.*\n\n` +
        `Once approved, Exness will send you a confirmation email.\n\n` +
        `Please send a *screenshot of that email* here.`
      );
    }

    if (step === 'IB_ACCOUNT_SCREENSHOT' || step === 'NEW_ACCOUNT_SCREENSHOT' || step === 'EXNESS_SCREENSHOT') {
      if (!msg.hasMedia) return send(id, `⚠️ Please send your screenshot as an *image/photo*.`);
      try {
        const media    = await msg.downloadMedia();
        const tempId   = 'temp_' + id.replace('@c.us','');
        const userName = userState[id].data.name || id.replace('@c.us','');
        const label    = step === 'IB_ACCOUNT_SCREENSHOT' ? 'Exness Account (after IB)' : 'Exness Account';
        const filepath = await saveAndForward(tempId, 'exness_account', media, `📸 ${userName} — ${label}`);
        if (filepath) {
          userState[id].data.screenshots['exness_account'] = filepath;
          addHistory(userState[id].data, 'EXNESS_SCREENSHOT', null, null, filepath);
        }
      } catch(e) { log(`Exness screenshot error: ${e.message}`, 'ERROR'); }
      userState[id].step = 'ACCOUNT_NUMBER';
      return send(id,
        `✅ Screenshot received!\n\n` +
        `Please enter your *account number*.\n` +
        `It starts with *#* (e.g. *#123xxxxxx*)`
      );
    }

    if (step === 'ACCOUNT_NUMBER') {
      const accNum = normalizeAccount(text.trim());
      if (!isValidAccount(text.trim())) {
        return send(id,
          `⚠️ That does not appear to be a valid account number.\n\n` +
          `Your account number should start with *#* followed by digits.\n` +
          `Example: *#123xxxxxx*`
        );
      }
      const dupDB      = Object.values(database).find(m => m.accountNumber === accNum);
      const dupPending = Object.values(pending).find(m => m.accountNumber === accNum);
      if (dupDB || dupPending) {
        return send(id,
          `⚠️ This account number is already registered.\n\n` +
          `If you believe this is an error, contact: wa.me/${CONFIG.SUPPORT_NUMBER}`
        );
      }
      userState[id].data.accountNumber = accNum;

      // v0.2: Account type only for free (IB) users
      if (userState[id].data.accessType === 'ib') {
        userState[id].step = 'ACCOUNT_TYPE';
        return send(id, getAccountTypeMsg());
      }

      // Paid users go straight to plan selection
      userState[id].step = 'PLAN';
      return send(id, `✅ Account saved!\n\nPlease select your plan:\n\n${getPlanList()}`);
    }

    // v0.2: Account type step — only for IB/free users
    if (step === 'ACCOUNT_TYPE') {
      const idx = parseInt(lo) - 1;
      if (isNaN(idx) || idx < 0 || idx >= CONFIG.ACCOUNT_TYPES.length) {
        return send(id, `⚠️ Please select a valid option:\n\n${getAccountTypeMsg()}`);
      }
      userState[id].data.accountType = CONFIG.ACCOUNT_TYPES[idx];
      userState[id].step = 'IB_CONFIRM';
      const d = userState[id].data;
      return send(id,
        `📋 *Please review your details:*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Name: ${d.name}\n` +
        `📧 Email: ${d.email}\n` +
        `📱 Phone: ${d.phone}\n` +
        `🔢 Account: ${d.accountNumber}\n` +
        `💳 Account Type: ${d.accountType}\n` +
        `💎 Access: Free via Exness IB\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Reply *confirm* to submit or *cancel* to restart.`
      );
    }

    if (step === 'IB_CONFIRM') {
      if (lo === 'cancel') { fullResetUser(id); return send(id, `❌ Cancelled. Reply *hi* to start again.`); }
      if (lo !== 'confirm') return send(id, `⚠️ Reply *confirm* to submit or *cancel* to restart.`);
      await submitApplication(id, userState[id].data, null);
      return;
    }

    if (step === 'PLAN') {
      const plan = getPlanByKey(text);
      if (!plan) return send(id, `⚠️ Please reply with a number:\n\n${getPlanList()}`);
      userState[id].data.plan      = text;
      userState[id].data.planLabel = plan.label;
      userState[id].data.planPrice = plan.price;
      userState[id].step = 'CONFIRM';
      const d = userState[id].data;
      return send(id,
        `📋 *Please review your details:*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Name: ${d.name}\n` +
        `📧 Email: ${d.email}\n` +
        `📱 Phone: ${d.phone}\n` +
        (d.accountNumber ? `🔢 Account: ${d.accountNumber}\n` : '') +
        `📦 Plan: ${plan.label} — $${plan.price}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Please ensure all information is correct.\n\n` +
        `Reply *confirm* to proceed to payment or *cancel* to restart.`
      );
    }

    if (step === 'CONFIRM') {
      if (lo === 'cancel') { fullResetUser(id); return send(id, `❌ Cancelled. Reply *hi* to start again.`); }
      if (lo !== 'confirm') return send(id, `⚠️ Reply *confirm* or *cancel*.`);
      const plan = getPlanByKey(userState[id].data.plan);
      userState[id].step = 'PAYMENT';
      return send(id,
        `📦 *${plan.label}* — $${plan.price} USDT\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 *Payment Address (BEP20 — USDT):*\n\n` +
        `${CONFIG.BEP20_ADDRESS}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ Send exactly *$${plan.price} USDT* via *BEP20 (BSC)* only.\n\n` +
        `Once paid, reply *paid*`
      );
    }

    if (step === 'PAYMENT') {
      if (lo !== 'paid') return send(id, `⚠️ Reply *paid* once your payment is complete.`);
      userState[id].data.paymentStatus = 'paid';
      userState[id].step = 'PAYMENT_SCREENSHOT';
      return send(id, `✅ Thank you!\n\n📸 Please send your *payment screenshot* as an image:`);
    }

    if (step === 'PAYMENT_SCREENSHOT') {
      if (!msg.hasMedia) return send(id, `⚠️ Please send your payment proof as an *image/photo*.`);
      let paymentMedia = null;
      try {
        paymentMedia   = await msg.downloadMedia();
        const tempId   = 'temp_' + id.replace('@c.us','');
        const userName = userState[id].data.name || id.replace('@c.us','');
        const filepath = await saveAndForward(tempId, 'payment', paymentMedia, `📸 ${userName} — Payment Proof`);
        if (filepath) {
          userState[id].data.screenshots['payment'] = filepath;
          addHistory(userState[id].data, 'PAYMENT_SCREENSHOT', null, null, filepath);
        }
      } catch(e) { log(`Payment screenshot error: ${e.message}`, 'ERROR'); }
      await submitApplication(id, userState[id].data, paymentMedia);
      return;
    }

    if (!step) return send(id, getSupportMenu());

  } catch(e) {
    log(`Message handler error: ${e.message}`, 'ERROR');
  }
});

client.initialize();

// ─────────────────────────────────────────────────────
//  v0.2 CHANGELOG
//  1. Find member — sends ONLY that member's screenshots (bug fixed)
//  2. Messages restored to v1.2 originals
//  3. Model removed from account types (Standard/Pro/Raw Spread/Zero only)
//  4. Account type question — only for free/IB users, not paid
//  5. Expiry date shown in approve message + mydata report
//  6. Renew flow — skips name/email/phone if already in database
//  7. Auto expiry reminder — fixed with log confirmation
//  8. Screenshots saved + forwarded immediately on receipt
// ─────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
//  HOW TO RUN
//  Ctrl+C
//  cd whatsapp-bot
//  nano twt_v0.2.js
//  Paste → Ctrl+O → Enter → Ctrl+X
//  node twt_v0.2.js
//
//  FRESH SETUP:
//  1. Install Node.js
//  2. Copy whatsapp-bot folder
//  3. npm install whatsapp-web.js qrcode-terminal
//  4. node twt_v0.2.js
//  5. Scan QR → done ✅
// ─────────────────────────────────────────────────────
