# Quick Start Guide - WebRTC to SIP Bridge for UAE

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Credentials

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Kandy.io credentials:
```env
KANDY_CLIENT_ID=your_client_id
KANDY_USERNAME=your_username
KANDY_PASSWORD=your_password
```

Or edit directly in `kandy-config-etisalat.js`:
```javascript
credentials: {
    clientId: 'YOUR_CLIENT_ID',
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD'
}
```

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
=================================
Kandy WebRTC to SIP Bridge
Etisalat UAE Configuration
=================================
WebSocket: ws://localhost:8080
Health Check: http://localhost:8080/health
Auth Endpoint: http://localhost:8080/authenticate
=================================
```

### Step 4: Open the Web Interface

Open your browser and go to:
```
http://localhost:8080
```

### Step 5: Make a Call

1. Click **"Connect"** button
2. Enter a UAE phone number (e.g., `971501234567` or `0501234567`)
3. Click **"Call"** button
4. Allow microphone access when prompted
5. Wait for the call to connect

## 📱 Supported Phone Number Formats

The system automatically handles these formats:

| Format | Example | Description |
|--------|---------|-------------|
| International | +971501234567 | With + prefix |
| Country Code | 971501234567 | Without + prefix |
| Local | 0501234567 | Starting with 0 |
| Mobile | 971 50 123 4567 | UAE mobile |
| Landline | 971 4 345 6789 | Dubai landline |

## 🔧 Troubleshooting

### Server won't start?

Check if port 8080 is available:
```bash
lsof -i :8080
```

Use a different port by editing `kandy-config-etisalat.js`:
```javascript
server: {
    port: 3000  // Change to your preferred port
}
```

### Authentication failed?

1. Verify credentials are correct
2. Check if account is active on Kandy.io portal
3. View server logs:
```bash
tail -f /var/log/kandy-bridge-uae.log
```

### Can't connect from browser?

1. Check browser console for errors (F12)
2. Verify WebSocket URL is correct
3. For HTTPS, ensure SSL certificates are valid

### No audio during call?

1. Check microphone permissions in browser
2. Verify audio element is unmuted
3. Check browser console for media errors

## 🌐 Testing the API

### Check Server Health

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "activeSessions": 0,
  "config": {
    "provider": "Kandy.io Etisalat UAE",
    "authenticated": true
  }
}
```

### Authenticate (if not done on startup)

```bash
curl -X POST http://localhost:8080/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your_client_id",
    "username": "your_username",
    "password": "your_password"
  }'
```

## 📋 Quick Reference - WebSocket Messages

### Make a Call
```javascript
{
  "type": "call",
  "destination": "971501234567"
}
```

### Hangup
```javascript
{
  "type": "hangup"
}
```

### Handle Incoming Call
```javascript
{
  "type": "answer-incoming"
}
```

## 🎯 Next Steps

1. **Production Setup**: Configure SSL certificates for HTTPS/WSS
2. **Customize**: Modify the web interface in `public/index.html`
3. **Integrate**: Use `client.js` in your own application
4. **Monitor**: Set up logging and monitoring
5. **Scale**: Deploy behind a load balancer for multiple instances

## 📚 File Structure

```
webrtc-sip-bridge/
├── kandy-server.js           # Main Kandy.io bridge server
├── kandy-config-etisalat.js  # Kandy/Etisalat config
├── server-uae.js             # Generic SIP bridge
├── config-uae.js             # UAE providers config
├── client.js                 # WebRTC client library
├── package.json              # Dependencies
├── public/
│   ├── index.html           # Web interface
│   └── client.js            # Client library (copy)
├── README.md                # Full documentation
└── QUICKSTART.md           # This file
```

## ⚡ Development Mode

Run with auto-reload (requires nodemon):
```bash
npm run dev
```

## 🔒 Production Checklist

- [ ] Configure SSL certificates
- [ ] Set `SERVER_SECURE=true` in `.env`
- [ ] Use strong passwords
- [ ] Enable firewall rules
- [ ] Set up monitoring
- [ ] Configure log rotation
- [ ] Test emergency numbers
- [ ] Review UAE compliance requirements

## 💡 Tips

1. **Use Quick Dial Buttons**: Pre-configure common numbers
2. **Check Logs**: Enable debug mode for detailed logs
3. **Test Locally First**: Verify everything works before production
4. **Monitor Sessions**: Check `/health` endpoint regularly
5. **Keep Updated**: Update dependencies periodically

## 🆘 Getting Help

- **Kandy.io Issues**: support@kandy.io
- **Etisalat UAE**: Business support hotline
- **Technical Issues**: Check README.md for detailed docs

## 📞 Example Test Numbers

Replace these with your actual test numbers:

```javascript
// Dubai Office
quickDial('97143456789')

// Abu Dhabi Branch
quickDial('97126789012')

// Mobile Number
quickDial('971501234567')
```

---

**Ready to start?** Run `npm start` and open `http://localhost:8080`!
