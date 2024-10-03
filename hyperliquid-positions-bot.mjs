import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CONFIG = {
  prefix: '!',
  API_ENDPOINT: 'https://api.hyperliquid.xyz/info',
  IMAGES: {
    POSITIVE: [
      'https://i.ibb.co/qDZXRcp/cash.png',
      'https://i.ibb.co/tBVxygN/cheers.png',
      'https://i.ibb.co/vYKzp5V/happy.png',
      'https://i.ibb.co/9TccRPJ/hypurr.png',
      'https://i.ibb.co/nbm27Kd/meowdy.png',
      'https://i.ibb.co/FkQKZ2N/saiyan.png',
      'https://i.ibb.co/Lr52ghG/theories.png',
      'https://i.ibb.co/xSrZnkB/thumbs-up.png'
    ],
    NEGATIVE: [
      'https://i.ibb.co/nzzd8z1/cry.png',
      'https://i.ibb.co/vjQymsP/dafuq.png',
      'https://i.ibb.co/xMpmy78/dead.png',
      'https://i.ibb.co/FY36DFB/fire-panic.png',
      'https://i.ibb.co/88k6Q9C/this-is-fine.png',
      'https://i.ibb.co/yNvjSD8/shook.png',
      'https://i.ibb.co/gbY1ZTZ/shrug.png',
      'https://i.ibb.co/3WfK2Hs/smoking.png'
    ]
  }
};

const db = new sqlite3.Database(new URL('./bot_data.sqlite', import.meta.url).pathname);

// Initialize database with new table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS hldiscordwallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_user_id TEXT,
    wallet_address TEXT,
    wallet_name TEXT,
    UNIQUE(discord_user_id, wallet_address)
  )`);
});

// Save wallet address for a specific Discord user
function saveWalletAddress(discordUserId, address, name = null) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO hldiscordwallets (discord_user_id, wallet_address, wallet_name) VALUES (?, ?, ?)', [discordUserId, address, name], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Get wallet addresses for a specific Discord user
function getWalletAddresses(discordUserId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT wallet_address, wallet_name FROM hldiscordwallets WHERE discord_user_id = ?', [discordUserId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Update wallet name for a specific Discord user and wallet address
function updateWalletName(discordUserId, address, name) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE hldiscordwallets SET wallet_name = ? WHERE discord_user_id = ? AND wallet_address = ?', [name, discordUserId, address], function(err) {
      if (err) reject(err);
      else {
        if (this.changes === 0) {
          // If no rows were updated, it means the wallet doesn't exist, so we create it
          saveWalletAddress(discordUserId, address, name)
            .then(() => resolve(1))
            .catch(reject);
        } else {
          resolve(this.changes);
        }
      }
    });
  });
}

// Remove wallet address for a specific Discord user
function removeWalletAddress(discordUserId, address) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM hldiscordwallets WHERE discord_user_id = ? AND wallet_address = ?', [discordUserId, address], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

async function fetchPositions(walletAddress) {
  try {
    const response = await axios.post(CONFIG.API_ENDPOINT, {
      type: "clearinghouseState",
      user: walletAddress
    });
    return response.data.assetPositions || [];
  } catch (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
}

function getPositionDirection(currentPrice, entryPrice) {
  return currentPrice > entryPrice ? "Long" : "Short";
}

function calculateDropToLiquidation(currentPrice, liquidationPrice) {
  if (!liquidationPrice || liquidationPrice === 0) return "N/A";
  const dropPercentage = ((currentPrice - liquidationPrice) / currentPrice) * 100;
  return dropPercentage > 0 ? dropPercentage.toFixed(2) + "%" : "N/A";
}

function getRandomImage(pnl) {
  const imageArray = pnl >= 0 ? CONFIG.IMAGES.POSITIVE : CONFIG.IMAGES.NEGATIVE;
  return imageArray[Math.floor(Math.random() * imageArray.length)];
}

client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(CONFIG.prefix) || message.author.bot) return;

  const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Hyperliquid Bot Commands')
      .setDescription('Here are all the commands you can use:')
      .addFields(
        { name: '!wallet [address]', value: 'Add a new wallet or see your current wallets.' },
        { name: '!namewallet [address] [name]', value: 'Give a name to one of your wallets.' },
        { name: '!updatename [address] [new name]', value: 'Update the name of one of your wallets.' },
        { name: '!removewallet [address]', value: 'Remove one of your wallets.' },
        { name: '!positions [wallet]', value: 'See positions for all or one of your wallets.' },
        { name: '!help', value: 'Show this help message.' }
      );
    message.reply({ embeds: [helpEmbed] });
  } else if (command === 'wallet') {
    if (args.length > 0) {
      await saveWalletAddress(message.author.id, args[0]);
      message.reply(`Wallet address added: ${args[0]} for user ${message.author.username}`);
    } else {
      const walletAddresses = await getWalletAddresses(message.author.id);
      if (walletAddresses.length > 0) {
        const walletList = walletAddresses.map(w => `${w.wallet_address}${w.wallet_name ? ` (${w.wallet_name})` : ''}`).join('\n');
        message.reply(`Your current wallet addresses:\n${walletList}`);
      } else {
        message.reply('You haven\'t set any wallet addresses yet. Use !wallet [address] to add one.');
      }
    }
  } else if (command === 'namewallet') {
    if (args.length < 2) {
      return message.reply('Usage: !namewallet [wallet address] [name]');
    }
    const address = args.shift();
    const name = args.join(' '); // This allows for spaces in the name
    const changes = await updateWalletName(message.author.id, address, name);
    if (changes > 0) {
      message.reply(`Wallet ${address} has been named "${name}"`);
    } else {
      message.reply(`An error occurred while naming the wallet. Please try again.`);
    }
  } else if (command === 'updatename') {
    if (args.length < 2) {
      return message.reply('Usage: !updatename [wallet address] [new name]');
    }
    const address = args.shift();
    const newName = args.join(' '); // This allows for spaces in the name
    const changes = await updateWalletName(message.author.id, address, newName);
    if (changes > 0) {
      message.reply(`Wallet ${address} has been renamed to "${newName}"`);
    } else {
      message.reply(`No wallet found with address ${address} for your account. Please check the address and try again.`);
    }
  } else if (command === 'removewallet') {
    if (args.length !== 1) {
      return message.reply('Usage: !removewallet [wallet address]');
    }
    const address = args[0];
    const changes = await removeWalletAddress(message.author.id, address);
    if (changes > 0) {
      message.reply(`Wallet ${address} has been removed from your account.`);
    } else {
      message.reply(`No wallet address found matching ${address}. Use !wallet to see your current addresses.`);
    }
  } else if (command === 'positions') {
  try {
    const walletAddresses = await getWalletAddresses(message.author.id);
    if (walletAddresses.length === 0) {
      return message.reply('Please set a wallet address first using !wallet [address]');
    }

    let targetWallets = walletAddresses;
    if (args.length > 0) {
      const specifiedWallet = args[0];
      targetWallets = walletAddresses.filter(w => w.wallet_address === specifiedWallet || w.wallet_name === specifiedWallet);
      if (targetWallets.length === 0) {
        return message.reply(`No wallet found matching "${specifiedWallet}". Please check your wallet address or name.`);
      }
    }

    let allPositions = [];
    for (const wallet of targetWallets) {
      const positions = await fetchPositions(wallet.wallet_address);
      allPositions = allPositions.concat(positions.map(p => ({ ...p, wallet })));
    }
    
    // Sort positions by unrealized PNL
    allPositions.sort((a, b) => parseFloat(b.position.unrealizedPnl) - parseFloat(a.position.unrealizedPnl));

    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Hyperliquid Positions for ${message.author.username}`);

    if (allPositions.length === 0) {
      embed.setDescription('No positions found.');
    } else {
      let totalPnl = 0;
      let descriptionText = '';

      allPositions.forEach(position => {
        const p = position.position;
        const currentPrice = parseFloat(p.positionValue) / parseFloat(p.szi);
        const direction = getPositionDirection(currentPrice, parseFloat(p.entryPx));
        const pnlValue = parseFloat(p.unrealizedPnl);
        const roeValue = parseFloat(p.returnOnEquity);
        const liquidationPrice = parseFloat(p.liquidationPx);
        const dropToLiquidation = calculateDropToLiquidation(currentPrice, liquidationPrice);

        totalPnl += pnlValue;

        const walletIdentifier = position.wallet.wallet_name || `${position.wallet.wallet_address.slice(0, 6)}...${position.wallet.wallet_address.slice(-4)}`;
        const pnlColor = pnlValue >= 0 ? "🟢" : "🔴";

        descriptionText += `**${p.coin} ${direction} (${walletIdentifier})**\n`;
        descriptionText += `${pnlColor} PNL: ${pnlValue >= 0 ? "+" : ""}$${pnlValue.toFixed(2)} (${(roeValue * 100).toFixed(2)}% ROE)\n`;
        descriptionText += `Entry: $${parseFloat(p.entryPx).toFixed(4)} | Current: $${currentPrice.toFixed(4)}\n`;
        descriptionText += `Liquidation: ${liquidationPrice ? '$' + liquidationPrice.toFixed(4) : 'N/A'} | Drop to Liq: ${dropToLiquidation}\n\n`;
      });

      // Add random image based on total PNL
      const imageUrl = getRandomImage(totalPnl);
      console.log('Image URL:', imageUrl); // Log the image URL

      // Set the description and image
      embed.setDescription(descriptionText);
      embed.setImage(imageUrl);
    }

    embed.setFooter({ 
      text: `Wallets: ${targetWallets.map(w => w.wallet_name || w.wallet_address).join(', ')}`, 
      iconURL: 'https://pbs.twimg.com/profile_images/1646594253982830592/F4sMsWyA_400x400.png' 
    });

    await message.reply({ embeds: [embed] });
    console.log('Embed sent successfully');
  } catch (error) {
    console.error('Error in positions command:', error);
    message.reply('An error occurred while fetching positions. Please try again later.');
  }
}
});

client.login(process.env.DISCORD_BOT_TOKEN);