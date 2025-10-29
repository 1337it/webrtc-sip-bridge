# ⚡ Simplified Configuration Guide

## 🎯 What Changed

Based on your actual Kandy.io configuration, we've **removed the clientId requirement**. You only need:
- ✅ Username
- ✅ Password

That's it! No OAuth clientId or clientSecret needed.

## 📝 Step-by-Step Configuration

### 1. For WebRTC Server (Browser Clients)

Edit `kandy-config-etisalat.js`:

```javascript
credentials: {
    username: 'your_username@domain.com',  // Your Kandy username
    password: 'your_password'               // Your Kandy password
}
```

### 2. For 3CX SIP Server

Edit `sip-server-3cx.js`:

```javascript
const SIP_CONFIG = {
    // ... other settings ...
    
    // Kandy.io credentials
    kandy: {
        username: 'your_username@domain.com',
        password: 'your_password'
    }
};
```

## 🔑 Where to Get Credentials

Your Kandy.io credentials are:

**Username**: The login username you use for Etisalat CloudTalk
**Password**: The password you use for Etisalat CloudTalk

**Portal**: https://ct-portal.etisalat.ae/

## 🚀 Quick Start Examples

### Start WebRTC Server
```bash
# 1. Edit credentials in kandy-config-etisalat.js
nano kandy-config-etisalat.js

# 2. Update:
credentials: {
    username: 'john@company.ae',
    password: 'MyPassword123'
}

# 3. Start server
npm start
```

### Start 3CX SIP Server
```bash
# 1. Edit credentials in sip-server-3cx.js
nano sip-server-3cx.js

# 2. Update both 3CX users and Kandy credentials:
users: {
    '3cx_trunk': {
        password: 'StrongPassword123!'  // 3CX will use this
    }
},
kandy: {
    username: 'john@company.ae',       // Your Kandy username
    password: 'MyPassword123'          // Your Kandy password
}

# 3. Start server
npm run start:sip
```

## 📋 Configuration Files Summary

### All Configuration is in 2 Files:

1. **`kandy-config-etisalat.js`** 
   - For WebRTC/browser clients
   - Used by: `kandy-server.js`
   
2. **`sip-server-3cx.js`** 
   - For 3CX SIP trunk
   - Used for 3CX registration

## 🔧 What's Pre-Configured

These are **already configured** from your Kandy.io settings:

✅ Authentication servers: `kbs-uae-cim-auth.kandy.io`  
✅ WebSocket server: `wss://kbs-uae-cim-auth.kandy.io:443`  
✅ TURN servers: `ct-turn1.etisalat.ae`, `ct-turn2.etisalat.ae`  
✅ STUN servers: Same as TURN  
✅ ICE timeouts: 500ms / 3000ms  
✅ Emergency numbers: All UAE emergency numbers  
✅ Codec settings: PCMU, PCMA, G722 (OPUS removed)  
✅ Connection settings: 120s ping, auto-reconnect  

**You don't need to change any of this!**

## ⚙️ Environment Variables (Optional)

Instead of editing files, you can use environment variables:

```bash
# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

Add:
```env
KANDY_USERNAME=your_username@domain.ae
KANDY_PASSWORD=your_password
```

## 🧪 Test Your Configuration

### Test 1: Check Credentials
```bash
node -e "
const config = require('./kandy-config-etisalat');
console.log('Username:', config.BRIDGE_CONFIG.kandy.credentials.username);
console.log('Password:', config.BRIDGE_CONFIG.kandy.credentials.password ? '✓ Set' : '✗ Not set');
"
```

### Test 2: Start Server
```bash
npm start
# or
npm run start:sip
```

Look for:
```
✓ Connected to Kandy WebSocket
✓ Kandy.io authentication successful
```

## ❌ Removed Configuration

These are **NOT needed** anymore:

- ❌ `clientId`
- ❌ `clientSecret`  
- ❌ OAuth application setup
- ❌ Developer portal OAuth configuration

## 🆘 Troubleshooting

### Authentication Failed?

**Check:**
1. Username format: `user@domain.ae` or just `username`
2. Password: No special characters causing issues?
3. Account active: Can you log in to https://ct-portal.etisalat.ae/?

**Try:**
```bash
# Test authentication directly
curl -X POST https://kbs-uae-cpaas-oauth.kandy.io/rest/version/1/sip-auth \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

### Still Issues?

1. Check server logs for detailed error
2. Verify account is active on Etisalat portal
3. Try resetting password
4. Contact Etisalat support

## 📚 Documentation Files

- **3CX-COMPLETE-GUIDE.md** - Full 3CX setup
- **3CX-QUICKSTART.md** - Quick 3CX setup
- **README.md** - Complete documentation
- **ARCHITECTURE.md** - System architecture

## ✅ Configuration Checklist

Before starting:

- [ ] Obtained Kandy.io username from Etisalat
- [ ] Obtained Kandy.io password
- [ ] Edited `kandy-config-etisalat.js` (for WebRTC)
- [ ] OR edited `sip-server-3cx.js` (for 3CX)
- [ ] Installed dependencies: `npm install`
- [ ] Ready to start: `npm start` or `npm run start:sip`

## 🎉 That's It!

Just username and password. No complicated OAuth setup needed!

---

**Questions?** Check the full documentation in README.md
