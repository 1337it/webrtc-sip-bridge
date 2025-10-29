# 3CX Configuration Guide - SIP Trunk Setup

This guide explains how to configure 3CX to use your WebRTC-to-SIP bridge as a SIP trunk.

## 🎯 Overview

The SIP server listens on **UDP port 5060** and acts as a bridge between:
- **3CX PBX** (SIP client) ↔ **Bridge Server** ↔ **Kandy.io/Etisalat** (WebRTC trunk)

## 🔧 Step 1: Configure the Bridge Server

### Edit SIP Configuration

Edit `sip-server-3cx.js` and update these settings:

```javascript
const SIP_CONFIG = {
    host: '0.0.0.0',          // Listen on all interfaces
    port: 5060,                // Standard SIP port
    transport: 'UDP',          // Transport protocol
    domain: 'sip.yourcompany.com',  // Your SIP domain
    realm: 'sip.yourcompany.com',   // Authentication realm
    
    // 3CX trunk credentials
    users: {
        '3cx_trunk': {
            password: 'YourSecurePassword123!',
            displayName: '3CX Trunk'
        },
        'trunk_backup': {
            password: 'AnotherSecurePassword456!',
            displayName: 'Backup Trunk'
        }
    },
    
    // Kandy.io credentials
    kandy: {
        clientId: 'YOUR_KANDY_CLIENT_ID',
        username: 'YOUR_KANDY_USERNAME',
        password: 'YOUR_KANDY_PASSWORD'
    }
};
```

### Start the SIP Server

```bash
node sip-server-3cx.js
```

You should see:
```
=================================
SIP Trunk Server for 3CX
=================================
Protocol: UDP
Address: 0.0.0.0:5060
Domain: sip.yourcompany.com
=================================
```

## 📞 Step 2: Configure 3CX SIP Trunk

### 2.1 Add New SIP Trunk

1. Open **3CX Management Console**
2. Go to **SIP Trunks** section
3. Click **"Add SIP Trunk"**

### 2.2 Main Settings

**General Tab:**
- **Name**: `Kandy.io Etisalat UAE`
- **Country**: United Arab Emirates
- **Number of Simultaneous Calls**: `10` (or your license limit)

**Registrar/Server:**
- **Type**: Select **"Generic SIP Trunk"**
- **Main Trunk No**: Leave empty (we'll configure extensions separately)

### 2.3 Service Provider Settings

Click **"Service Provider"** tab:

**Main Settings:**
- **Authentication ID**: `3cx_trunk`
- **Authentication Password**: `YourSecurePassword123!`

**Server Details:**
- **Registrar**: `YOUR_SERVER_IP:5060` (e.g., `192.168.1.100:5060`)
- **Proxy**: `YOUR_SERVER_IP:5060`
- **Transport**: **UDP**
- **Register**: ☑️ **Enabled**
- **Registration Expiry (seconds)**: `3600`

**Advanced Options:**
- **Use IP address instead of FQDN**: ☑️ **Checked** (if using IP)
- **Outbound Proxy**: Leave empty
- **Use SRV Records**: ☐ **Unchecked**

### 2.4 Options Tab

**SIP Options:**
- **Rewrite From Header**: ☑️ **Checked**
- **Create SIP Extension**: ☑️ **Checked**
- **Format Caller ID on Outbound Calls**: ☑️ **Checked**

**Media Settings:**
- **Codecs Allowed**: 
  - ☑️ PCMU (G.711 μ-law)
  - ☑️ PCMA (G.711 A-law)
  - ☑️ Opus (if supported)
- **DTMF**: RFC2833

### 2.5 DIDs (Numbers) Tab

Add your UAE phone numbers:

1. Click **"Add DID"**
2. **DID Number**: `971XXXXXXXXX` (your Etisalat number)
3. **Route to**: Select destination (IVR, extension, etc.)
4. Repeat for all numbers

## 🔢 Step 3: Configure Outbound Rules

### 3.1 Create Outbound Rule

1. Go to **Outbound Rules** in 3CX
2. Click **"Add Outbound Rule"**

**Rule Settings:**
- **Name**: `UAE Mobile Calls`
- **Applies to Calls to Numbers Starting with**: `971` or `0`
- **Route 1**: Select **"Kandy.io Etisalat UAE"** trunk
- **Calls starting with**: `0` or `971`

**Number Manipulation:**
- **Strip Digits**: `1` (if calls start with 0)
- **Prepend**: `971` (to add country code)

Example rules:

| Caller Dials | Strip | Prepend | Sent to Trunk |
|--------------|-------|---------|---------------|
| 0501234567   | 1     | 971     | 971501234567  |
| 971501234567 | 0     |         | 971501234567  |
| 043456789    | 0     | 971     | 97143456789   |

### 3.2 UAE Number Patterns

Create multiple rules for different UAE number types:

**Rule 1: Local Mobile (05XXXXXXXX)**
```
Pattern: 05XXXXXXXX
Strip: 1 digit
Prepend: 971
Result: 971 5XXXXXXXX
```

**Rule 2: Local Landline (0X XXXXXXX)**
```
Pattern: 0[2-4,6-7,9]XXXXXXX
Strip: 1 digit
Prepend: 971
Result: 971 X XXXXXXX
```

**Rule 3: International Format (971XXXXXXXXX)**
```
Pattern: 971XXXXXXXXX
Strip: 0 digits
Prepend: (empty)
Result: 971XXXXXXXXX
```

## 🧪 Step 4: Test the Trunk

### 4.1 Check Registration Status

In 3CX:
1. Go to **SIP Trunks**
2. Look for your trunk
3. Status should show **"Registered"** in green

### 4.2 Make Test Call

1. From a 3CX extension, dial: `971501234567`
2. Check 3CX call logs
3. Check bridge server logs:
```bash
tail -f /var/log/sip-server.log
```

### 4.3 Verify Logs

You should see:
```
[INFO] Received REGISTER from 3CX
[INFO] Registration successful for 3cx_trunk
[INFO] Received INVITE
[INFO] Connected to Kandy WebSocket
[INFO] Initiating Kandy call to: 971501234567
[INFO] Call established
```

## 🔒 Security Configuration

### Firewall Rules

**On Bridge Server:**
```bash
# Allow SIP from 3CX
sudo ufw allow from 3CX_IP to any port 5060 proto udp

# Allow RTP media range
sudo ufw allow 10000:20000/udp
```

**On 3CX Server:**
- Allow outbound UDP 5060 to bridge server
- Allow inbound/outbound UDP 10000-20000 for RTP

### IP Restrictions

In `sip-server-3cx.js`, add IP whitelist:

```javascript
const ALLOWED_IPS = [
    '192.168.1.10',  // 3CX server IP
    '10.0.0.5'       // Backup 3CX server
];

// In handleMessage method:
if (!ALLOWED_IPS.includes(rinfo.address)) {
    log('warn', 'Rejected connection from unauthorized IP', { ip: rinfo.address });
    return;
}
```

## 📊 Monitoring & Troubleshooting

### Check Active Registrations

Add monitoring endpoint (in a separate HTTP server):

```javascript
app.get('/registrations', (req, res) => {
    const regs = Array.from(registrations.entries()).map(([user, data]) => ({
        user,
        contact: data.contact,
        expires: data.expires,
        address: data.address,
        registeredAt: new Date(data.registeredAt)
    }));
    res.json(regs);
});
```

### Check Active Calls

```javascript
app.get('/calls', (req, res) => {
    const calls = Array.from(activeCalls.entries()).map(([callId, session]) => ({
        callId,
        from: session.from.user,
        to: session.to.user,
        state: session.state
    }));
    res.json(calls);
});
```

### Common Issues

**1. Registration Fails**
- Check credentials in both 3CX and server config
- Verify network connectivity: `ping BRIDGE_SERVER_IP`
- Check firewall: `sudo ufw status`

**2. Calls Don't Connect**
- Check Kandy.io credentials
- Verify phone number format
- Check bridge server logs
- Verify 3CX outbound rules

**3. One-Way Audio**
- Check RTP ports (10000-20000) are open
- Verify NAT configuration in 3CX
- Check codec compatibility

**4. Registration Expires**
- Increase expiry time in 3CX trunk settings
- Check for network interruptions
- Review keep-alive settings

### Enable Debug Logging

In `sip-server-3cx.js`:

```javascript
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}`;
    console.log(logEntry);
    
    // Log to file
    fs.appendFileSync('/var/log/sip-server.log', logEntry + '\n');
}
```

View logs:
```bash
tail -f /var/log/sip-server.log
```

## 📝 3CX Extension Configuration

### Direct Extension Dialing

To allow specific extensions to use this trunk:

1. Go to **Extensions** in 3CX
2. Select an extension
3. Go to **Options** tab
4. Under **Outbound Rules**, select:
   - ☑️ Allow this extension to use: **Kandy.io Etisalat UAE**

### Call Recording

Enable call recording:

1. In trunk settings → **Options** tab
2. **Call Recording**: Select **"Always"** or **"On Demand"**

## 🌍 UAE-Specific Settings

### Emergency Numbers

Configure emergency number routing:

In 3CX:
1. **Outbound Rules** → **Add Rule**
2. **Name**: `UAE Emergency`
3. **Pattern**: `999|998|997` (Police|Ambulance|Fire)
4. **Route**: Direct to **Kandy.io Etisalat UAE**
5. **Priority**: **Highest**

### Local Number Formatting

For proper caller ID display:

1. Trunk → **Options** tab
2. **Rewrite From Header**: ☑️ Enabled
3. **Format**: `+971XXXXXXXXX`

## 🔄 Failover Configuration

### Add Backup Trunk

1. Configure second trunk with `trunk_backup` credentials
2. In **Outbound Rules**:
   - **Route 1**: Primary trunk (Kandy.io)
   - **Route 2**: Backup trunk
   - **Failover**: Enable automatic failover

### Health Checking

The bridge server responds to OPTIONS:
```
3CX will send OPTIONS packets every 30 seconds
Bridge server responds with 200 OK
If 3 consecutive OPTIONS fail, 3CX marks trunk as down
```

## 📋 Checklist

Before going live:

- [ ] Bridge server running on UDP 5060
- [ ] Kandy.io credentials configured
- [ ] 3CX trunk registered successfully
- [ ] Test outbound call completes
- [ ] Test inbound call routes correctly
- [ ] Emergency numbers configured
- [ ] Call recording tested (if enabled)
- [ ] Firewall rules applied
- [ ] Monitoring enabled
- [ ] Logs are being written
- [ ] Backup trunk configured (optional)

## 📞 Support

**3CX Issues:**
- 3CX Support Portal: https://www.3cx.com/support/
- 3CX Community: https://www.3cx.com/community/

**Bridge Server Issues:**
- Check server logs: `/var/log/sip-server.log`
- Test Kandy.io connectivity
- Verify network configuration

**Kandy.io/Etisalat Issues:**
- Contact Etisalat business support
- Verify account status
- Check service availability

---

**Ready to configure?** Start the SIP server with `node sip-server-3cx.js`!
