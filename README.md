# HyperliquidPositionsBot
Hyperliquid bot for discord, that allows end users to save their wallet, rename wallet, get and track position information. Data is stored in SQLite database for ease of access.

## Features
- Manage wallet addresses (add, remove, name)
- Fetch and display position information
- Calculate metrics like PNL, ROE, entry price, current price, and liquidation price
- User-friendly Discord embed responses
- Cute hypurr images depending on PNL 

## Requirements
- Node.js (version 14 or higher recommended)
- Discord Bot Token
- Access to Hyperliquid API

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/hyperliquid-discord-bot.git
   cd hyperliquid-discord-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your Discord bot token:
   ```
   DISCORD_BOT_TOKEN=your_bot_token_here
   ```

## Usage

To start the bot, run:

```
npm start
```

## Commands
- `!help`: Display a list of available commands
- `!wallet [address]`: Add a new wallet or display current wallets
- `!namewallet [address] [name]`: Give a name to a wallet
- `!updatename [address] [new name]`: Update the name of a wallet
- `!removewallet [address]`: Remove a wallet
- `!positions [wallet]`: Display positions for all or a specific wallet

## Sample of Outputs 
### Example of !positions 
<img width="447" alt="image" src="https://github.com/user-attachments/assets/86cf72d3-90df-40fd-8cc7-84c9ddccf96a">

### Example of !namewallet 
<img width="585" alt="image" src="https://github.com/user-attachments/assets/4226e783-6a84-4b76-8173-4f18d18b50a3">

### Example of !removewallet 
<img width="540" alt="image" src="https://github.com/user-attachments/assets/094920ad-16d8-4d4b-90b3-86376304e812">

### Example of !help 
<img width="380" alt="image" src="https://github.com/user-attachments/assets/c43e5264-bfb7-4ec5-b8df-ffbc6afda3cf">

## Configuration
The bot's configuration can be changed and updated in the CONFIG object within main script file. 

## Database
The bot uses SQLite to store wallet information. The database file (`bot_data.sqlite`) will be created automatically in the project directory.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the ISC License.


