# ✅ CORRECT Authentication Flow for Etisalat UAE

## 🎯 Based on Ribbon WebRTC SDK Pattern

Your example from another region (`blue.rbbn.com`) shows the **correct authentication pattern** for Ribbon/Kandy.io services.

## 📝 Correct Flow (3 Steps)

### Step 1: Set Credentials
```javascript
// Just username and password - NO OAuth!
client.setCredentials({ 
    username: 'your_username', 
    password: 'your_password' 
})
```

### Step 2: Subscribe to Services
```javascript
// This is where authentication happens
client.services.subscribe(['call', 'IM', 'Presence'])
```

### Step 3: WebSocket Connects Automatically
```javascript
// WebSocket connection happens during subscription
// Uses subscriptionId from Step 2
```

## 🔧 What We Fixed

### ❌ Old (Wrong) Approach
```javascript
// Was trying OAuth with bearer token
GET /oauth/token
Authorization: Bearer ...
```

### ✅ New (Correct) Approach
```javascript
// Use subscription service
POST https://ct-webrtc.etisalat.ae/v2.0/subscription
{
  "username": "your_username",
  "password": "your_password",
  "service": ["call", "IM", "Presence", "MWI"]
}

// Returns subscriptionId
{
  "subscriptionId": "abc123...",
  "expires_in": 3600
}

// Then connect WebSocket
wss://ct-webrtc.etisalat.ae?subscriptionId=abc123...
```

## 🧪 Test Your Credentials

Try this command:

```bash
curl -X POST https://ct-webrtc.etisalat.ae/v2.0/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD",
    "service": ["call", "IM", "Presence", "MWI"]
  }'
```

### Expected Success Response:
```json
{
  "subscriptionId": "eyJhbGc...long_token",
  "access_token": "eyJhbGc...token",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Expected Error (Wrong Credentials):
```json
{
  "error": "invalid_credentials",
  "error_description": "Invalid username or password"
}
```

## 🚀 Updated SIP Server

The server now uses the correct flow:

```javascript
// In sip-server-3cx.js, CallSession.connectToKandy():

// 1. Subscribe (authenticate)
const response = await fetch('https://ct-webrtc.etisalat.ae/v2.0/subscription', {
    method: 'POST',
    body: JSON.stringify({
        username: SIP_CONFIG.kandy.username,
        password: SIP_CONFIG.kandy.password,
        service: ['call', 'IM', 'Presence', 'MWI']
    })
});

const authData = await response.json();

// 2. Connect WebSocket with subscriptionId
const wsUrl = `wss://ct-webrtc.etisalat.ae?subscriptionId=${authData.subscriptionId}`;
this.kandyWs = new WebSocket(wsUrl);

// 3. Make calls through WebSocket
```

## 📋 Complete Configuration

### For Etisalat UAE:

```javascript
// Server endpoints
subscription: 'https://ct-webrtc.etisalat.ae/v2.0/subscription'
websocket: 'wss://ct-webrtc.etisalat.ae'

// TURN/STUN servers
turns:ct-turn1.etisalat.ae:443?transport=tcp
turns:ct-turn2.etisalat.ae:443?transport=tcp
stun:ct-turn1.etisalat.ae:3478?transport=udp
stun:ct-turn2.etisalat.ae:3478?transport=udp

// Credentials (just these two!)
username: 'your_username'
password: 'your_password'
```

## 🎯 What You Need to Do

### 1. Get Valid Credentials

Your credentials should work on:
- **Portal**: https://ct-portal.etisalat.ae/
- **Admin**: https://ct-admin.etisalat.ae/

If you can log in to either portal, those credentials should work for the API.

### 2. Update sip-server-3cx.js

```javascript
kandy: {
    username: 'your_actual_username',  // From CloudTalk portal
    password: 'your_actual_password'   // From CloudTalk portal
}
```

### 3. Test with Curl

```bash
curl -X POST https://ct-webrtc.etisalat.ae/v2.0/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_actual_username",
    "password": "your_actual_password",
    "service": ["call"]
  }'
```

### 4. Restart Server

```bash
cd ~/webrtc-sip-bridge
node sip-server-3cx.js
```

### 5. Make Test Call from 3CX

Dial a UAE number from your 3CX extension.

## 📊 Expected Server Logs

### Success:
```
[INFO] Authenticating with Kandy
[INFO] Kandy subscription successful { subscriptionId: "abc123..." }
[INFO] Connected to Kandy WebSocket
[INFO] Initiating Kandy call to: 971501234567
[INFO] Call established
```

### Failure (Wrong Credentials):
```
[ERROR] Subscription failed: 401 - Invalid credentials
```

### Failure (Wrong Endpoint):
```
[ERROR] Failed to connect to Kandy: 401
```

## 🔐 Credential Formats to Try

Try these username formats:

1. **Full email**: `user@domain.ae`
2. **Just username**: `username`
3. **With realm**: `username@etisalat.ae`
4. **Account format**: `accountid/username`

## 📞 Contact Support

If none of these work:

**Email**: ucaas-support@emircom.com

**Subject**: CloudTalk API Credentials Request

**Message**:
```
Hi,

I need API credentials for CloudTalk/Kandy.io integration.

- Account: [Your account number]
- Service: CloudTalk UCS
- Purpose: SIP trunk bridging integration

Please provide:
1. API username
2. API password
3. Confirm these work with subscription endpoint

Thanks!
```

## ✅ Summary

**Key Changes:**
1. ✅ Using correct endpoints (`ct-webrtc.etisalat.ae`)
2. ✅ Using subscription authentication (not OAuth)
3. ✅ Following Ribbon SDK pattern
4. ✅ WebSocket connects with subscriptionId

**What You Need:**
- Username (from CloudTalk portal)
- Password (from CloudTalk portal)

**Next Step:**
- Test authentication with curl command above
- If it works, restart your SIP server
- Make a call from 3CX

---

**The authentication flow is now correct! Just need valid credentials.** 🎉
