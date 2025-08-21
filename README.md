# WhatsApp Grocery Delivery Bot

A simple, scalable WhatsApp grocery delivery bot built with Node.js and Express.js using the Meta Cloud API.

## Features

- **Welcome Message**: Automatically responds with shop list when user sends "Hi"
- **Shop Selection**: Users can select shops by typing unique codes (e.g., "shop1")
- **Order Processing**: Parses grocery lists and calculates prices
- **Order Confirmation**: Shows summary with prices and total
- **Order Dispatch**: Sends order details to shop owner

## Project Structure

```
whatsapp-grocery-bot/
├── package.json          # Dependencies and scripts
├── app.js               # Main application file with bot logic
├── data.js              # Shop and item data storage
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Environment variables template
└── README.md            # This file
```

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Meta Cloud API credentials (Access Token, Phone Number ID)
- WhatsApp Business Account

## Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your actual credentials:
   ```bash
   cp .env.example .env
   ```

4. **Edit .env file with your credentials**
   ```env
   # Meta Cloud API Configuration
   ACCESS_TOKEN=your_actual_access_token_here
   PHONE_NUMBER_ID=your_actual_phone_number_id_here
   VERIFY_TOKEN=your_webhook_verify_token_here

   # Shop Owner Configuration
   SHOP_OWNER_NUMBER=1234567890

   # Server Configuration
   PORT=3000
   ```

## Setup Instructions

### 1. Meta Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add WhatsApp Business API product
4. Get your:
   - **Access Token** from WhatsApp > Getting Started
   - **Phone Number ID** from WhatsApp > Getting Started
   - **Verify Token** (create any string for webhook verification)

### 2. Configure Webhook

1. **For local development**, use ngrok:
   ```bash
   npm install -g ngrok
   ngrok http 3000
   ```
   Copy the HTTPS URL provided by ngrok

2. **Set webhook URL** in Meta Developer Console:
   - Go to WhatsApp > Configuration
   - Set webhook URL: `https://your-ngrok-url.ngrok.io/webhook`
   - Set verify token: same as in your .env file

3. **Subscribe to messages**:
   - Click "Subscribe" for messages field

### 3. Start the server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## Usage Guide

### Bot Flow

1. **User sends "Hi"** → Bot responds with shop list
2. **User types shop code** (e.g., "shop1") → Bot confirms selection
3. **User sends grocery list** → Bot parses and calculates
4. **Bot shows order summary** → User confirms
5. **Order sent to shop owner**

### Supported Commands

- `hi`, `hello`, `hey` - Show shop list
- `shop1`, `shop2`, `shop3` - Select shop
- `accept`, `yes`, `हाँ` - Confirm order
- `cancel` - Cancel current order
- `back`, `menu` - Go back to shop selection

### Order Format

Send grocery items in this format:
```
1kg atta, 500gm sugar, 2 dozen eggs, 1 liter milk
```

## API Endpoints

- `GET /` - Health check
- `GET /webhook` - Webhook verification
- `POST /webhook` - Receive WhatsApp messages

## Customization

### Adding New Shops

Edit `data.js` to add new shops:
```javascript
shop4: {
  name: "Your Shop Name",
  code: "shop4",
  items: {
    "item1": { name: "Item Name", price: 100, unit: "kg" },
    // Add more items
  }
}
```

### Modifying Items

Update item prices and details in `data.js`:
```javascript
"atta": { name: "Brand Name", price: 50, unit: "kg" }
```

## Error Handling

The bot includes basic error handling for:
- Invalid shop codes
- Unrecognized commands
- API failures
- Malformed order formats

## Scaling for Production

To scale this bot for production:

1. **Database Integration**: Replace `data.js` with MongoDB or PostgreSQL
2. **Session Management**: Use Redis for user sessions
3. **Logging**: Add comprehensive logging with Winston
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Authentication**: Add user authentication if needed
6. **Deployment**: Deploy to cloud platforms like Heroku, AWS, or DigitalOcean

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check if webhook URL is correctly set in Meta Console
   - Ensure HTTPS URL (use ngrok for local development)
   - Verify verify token matches

2. **Messages not sending**
   - Check ACCESS_TOKEN validity
   - Ensure Phone Number ID is correct
   - Check if recipient number is in correct format

3. **Bot not responding**
   - Check server logs for errors
   - Verify .env configuration
   - Ensure all dependencies are installed

### Debug Mode

Enable debug logging by setting:
```javascript
// In app.js
console.log = function(...args) {
  console.info(...args);
};
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify Meta API documentation
4. Ensure all environment variables are correctly set

## License

This project is open source and available under the [MIT License](LICENSE).
