import discord
from discord.ext import commands
import qrcode
import os
import json

# ---------- BASIC SETUP ----------
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix=".", intents=intents)

UPI_ID = "yourupi@bank"  # 🔴 apni UPI ID yaha daalo

# ---------- FILE SETUP ----------
os.makedirs("payments", exist_ok=True)
os.makedirs("data", exist_ok=True)

def load_json(file, default):
    if not os.path.exists(file):
        with open(file, "w") as f:
            json.dump(default, f)
    with open(file, "r") as f:
        return json.load(f)

def save_json(file, data):
    with open(file, "w") as f:
        json.dump(data, f, indent=4)

owners = load_json("data/owners.json", [])
whitelist = load_json("data/whitelist.json", [])

# ---------- EVENTS ----------
@bot.event
async def on_ready():
    print(f"✅ Bot Online: {bot.user}")

@bot.event
async def on_member_join(member):
    role = discord.utils.get(member.guild.roles, name="Member")
    if role:
        await member.add_roles(role)

    channel = discord.utils.get(member.guild.text_channels, name="welcome")
    if channel:
        await channel.send(f"🎉 Welcome {member.mention} to the server!")

# ---------- OWNER CHECK ----------
def is_owner(ctx):
    return ctx.author.id in owners

# ---------- OWNER COMMANDS ----------
@bot.command()
async def addowner(ctx, member: discord.Member):
    if not is_owner(ctx):
        return await ctx.send("❌ Owner only command")
    owners.append(member.id)
    save_json("data/owners.json", owners)
    await ctx.send(f"✅ {member.name} added as owner")

# ---------- WHITELIST ----------
@bot.command()
async def whitelist_add(ctx, member: discord.Member):
    if not is_owner(ctx):
        return await ctx.send("❌ Owner only")
    whitelist.append(member.id)
    save_json("data/whitelist.json", whitelist)
    await ctx.send("✅ User whitelisted")

# ---------- SECURITY ----------
@bot.command()
async def kick(ctx, member: discord.Member, *, reason="No reason"):
    if not is_owner(ctx):
        return await ctx.send("❌ No permission")
    await member.kick(reason=reason)
    await ctx.send(f"👢 {member.name} kicked")

# ---------- PAYMENT (UPI QR) ----------
@bot.command()
async def payamount(ctx, username: str, amount: int):
    if ctx.author.id not in whitelist and not is_owner(ctx):
        return await ctx.send("❌ You are not whitelisted")

    if amount <= 0:
        return await ctx.send("❌ Invalid amount")

    upi_link = f"upi://pay?pa={UPI_ID}&pn={username}&am={amount}&cu=INR"
    qr_path = f"payments/{username}_{amount}.png"

    img = qrcode.make(upi_link)
    img.save(qr_path)

    await ctx.send(
        f"💸 **UPI Payment Request**\n"
        f"👤 Name: {username}\n"
        f"💰 Amount: ₹{amount}",
        file=discord.File(qr_path)
    )

# ---------- HELP ----------
@bot.command()
async def panel(ctx):
    await ctx.send(
        "**📌 BOT PANEL**\n"
        "🔐 Security: `.kick`\n"
        "👤 Whitelist: `.whitelist_add`\n"
        "💰 Payment: `.payamount name amount`\n"
        "👑 Owner: `.addowner`\n"
    )

# ---------- RUN ----------
bot.run("YOUR_BOT_TOKEN")
