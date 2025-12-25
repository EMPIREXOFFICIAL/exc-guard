require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const PREFIX = ".";
const UPI_ID = "dreamhelper@upi"; // 🔴 apni UPI ID yaha daalo

// ---------- FOLDERS ----------
if (!fs.existsSync("payments")) fs.mkdirSync("payments");
if (!fs.existsSync("data")) fs.mkdirSync("data");

// ---------- JSON HELPERS ----------
function loadJSON(file, def) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
  return JSON.parse(fs.readFileSync(file));
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let owners = loadJSON("data/owners.json", []);
let whitelist = loadJSON("data/whitelist.json", []);

// ---------- EVENTS ----------
client.once("ready", () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
});

client.on("guildMemberAdd", async member => {
  const role = member.guild.roles.cache.find(r => r.name === "Member");
  if (role) await member.roles.add(role);

  const channel = member.guild.channels.cache.find(c => c.name === "welcome");
  if (channel) channel.send(`🎉 Welcome ${member} to the server!`);
});

// ---------- MESSAGE HANDLER ----------
client.on("messageCreate", async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const isOwner = owners.includes(message.author.id);

  // ---------- ADD OWNER ----------
  if (cmd === "addowner") {
    if (!isOwner) return message.reply("❌ Owner only command");
    const member = message.mentions.users.first();
    if (!member) return message.reply("❌ Mention a user");

    if (!owners.includes(member.id)) {
      owners.push(member.id);
      saveJSON("data/owners.json", owners);
    }

    message.reply(`✅ ${member.username} added as owner`);
  }

  // ---------- WHITELIST ----------
  if (cmd === "whitelist_add") {
    if (!isOwner) return message.reply("❌ Owner only");
    const member = message.mentions.users.first();
    if (!member) return message.reply("❌ Mention a user");

    if (!whitelist.includes(member.id)) {
      whitelist.push(member.id);
      saveJSON("data/whitelist.json", whitelist);
    }

    message.reply("✅ User whitelisted");
  }

  // ---------- KICK ----------
  if (cmd === "kick") {
    if (!isOwner) return message.reply("❌ No permission");
    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Mention a member");

    await member.kick();
    message.reply(`👢 ${member.user.username} kicked`);
  }

  // ---------- PAYMENT ----------
  if (cmd === "payamount") {
    if (!isOwner && !whitelist.includes(message.author.id))
      return message.reply("❌ You are not whitelisted");

    const username = args[0];
    const amount = parseInt(args[1]);

    if (!username || isNaN(amount) || amount <= 0)
      return message.reply("❌ Usage: .payamount name amount");

    const upiLink = `upi://pay?pa=${UPI_ID}&pn=${username}&am=${amount}&cu=INR`;
    const filePath = path.join("payments", `${username}_${amount}.png`);

    await QRCode.toFile(filePath, upiLink);

    message.channel.send({
      content: `💸 **UPI Payment Request**
👤 Name: ${username}
💰 Amount: ₹${amount}`,
      files: [filePath]
    });
  }

  // ---------- PANEL ----------
  if (cmd === "panel") {
    message.channel.send(
      "**📌 BOT PANEL**\n" +
      "🔐 Security: .kick\n" +
      "👤 Whitelist: .whitelist_add\n" +
      "💰 Payment: .payamount name amount\n" +
      "👑 Owner: .addowner"
    );
  }
});

// ---------- RUN ----------
client.login(process.env.BOT_TOKEN);
