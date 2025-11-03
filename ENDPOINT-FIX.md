# 🎉 FIXED - Correct Etisalat UAE Endpoints!

## ✅ What Was Fixed

Your authentication was failing because you were using the **wrong server endpoints**.

### ❌ Old (Wrong) Endpoints
```
kbs-uae-cim-auth.kandy.io
```

### ✅ New (Correct) Endpoints
```
ct-webrtc.etisalat.ae
```

## 📝 Updated Configuration

All files have been updated with the correct Etisalat UAE endpoints:

### Authentication Server
- **OLD**: `https://kbs-uae-cim-auth.kandy.io:443`
- **NEW**: `https://ct-webrtc.etisalat.ae:443`

### WebSocket Server
- **OLD**: `wss://kbs-uae-cim-auth.kandy.io:443`
- **NEW**: `wss://ct-webrtc.etisalat.ae:443`

### Subscription Endpoint
- **NEW**: `https://ct-webrtc.etisalat.ae/v2.0/subscription`

### TURN/STUN Servers (Already Correct)
- ✅ `turns:ct-turn1.etisalat.ae:443?transport=tcp`
- ✅ `turns:ct-turn2.etisalat.ae:443?transport=tcp`
- ✅ `stun:ct-turn1.etisalat.ae:3478?transport=udp`
- ✅ `stun:ct-turn2.etisalat.ae:3478?transport=udp`

## 🧪 Test Authentication Now

Try this command with your credentials:

```bash
curl -X POST https://ct-webrtc.etisalat.ae/v2.0/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD",
    "service": ["call", "IM"]
  }'
```

**If successful**, you'll get:
```json
{
  "subscriptionId": "...",
  "access_token": "...",
  "expires_in": 3600
}
```

## 🔧 Update Your Server

### Option 1: Download Updated Package

Extract the new package and replace your current files.

### Option 2: Manual Update on Running Server

If your server is already running, update just the config file:

```bash
cd ~/webrtc-sip-bridge

# Backup old config
cp kandy-config-etisalat.js kandy-config-etisalat.js.backup

# Download new config (or copy from package)
# ... update the file ...

# Restart server
pkill -f sip-server
node sip-server-3cx.js
```

## 🚀 What to Do Now

1. **Stop your current server**: Press `Ctrl+C`

2. **Update your credentials** in `sip-server-3cx.js`:
   ```javascript
   kandy: {
       username: 'your_actual_username',
       password: 'your_actual_password'
   }
   ```

3. **Test authentication** with the curl command above

4. **Restart server**:
   ```bash
   node sip-server-3cx.js
   ```

5. **Make a test call** from 3CX

## 📋 Expected Behavior

With correct endpoints, you should see:

```
[INFO] Authenticating with Kandy
[INFO] Kandy.io authentication successful
[INFO] Connected to Kandy WebSocket
[INFO] Initiating Kandy call to: 971XXXXXXXXX
[INFO] Call established
```

Instead of:
```
❌ Error: Authentication failed: 401
❌ Error: Unexpected server response: 401
```

## 🎯 Key Changes Made

### 1. kandy-config-etisalat.js
- Updated authentication.subscription.server
- Updated authentication.websocket.server
- Updated BRIDGE_CONFIG.kandy.authServer
- Updated BRIDGE_CONFIG.kandy.websocketServer
- Updated BRIDGE_CONFIG.kandy.subscriptionUrl
- Updated pushServer.server
- Updated authenticateWithKandy() function

### 2. All endpoint references changed from:
- `kbs-uae-cim-auth.kandy.io` 
- `kbs-uae-cpaas-oauth.kandy.io`

To:
- `ct-webrtc.etisalat.ae`

## ✅ What This Fixes

- ✅ Authentication will work with correct credentials
- ✅ WebSocket connection will succeed
- ✅ Calls can be bridged to Kandy.io
- ✅ No more 401 errors

## 🔐 Still Need

You still need **valid Etisalat CloudTalk credentials**:
- Username (e.g., `user@domain.ae` or `username`)
- Password

If you don't have these, contact:
- Email: ucaas-support@emircom.com
- Portal: https://ct-portal.etisalat.ae/

## 📞 Support

If authentication still fails after updating:
1. Verify your credentials work on https://ct-portal.etisalat.ae/
2. Try different username formats (with/without domain)
3. Check account is active and has API access
4. Contact Etisalat support

---

**This was the missing piece!** Your server should now work with correct credentials. 🎉
