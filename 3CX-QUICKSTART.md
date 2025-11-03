# Quick Start - 3CX SIP Trunk Setup

Get your 3CX connected to Kandy.io/Etisalat in **10 minutes**!

## ⚡ Super Quick Setup

### 1️⃣ Configure Server (2 minutes)

Edit `sip-server-3cx.js`:

```javascript
const SIP_CONFIG = {
    domain: 'sip.yourcompany.com',        // Your domain
    
    users: {
        '3cx_trunk': {
            password: 'StrongPassword123!',  // Change this!
            displayName: '3CX Trunk'
        }
    },
    
    kandy: {
        clientId: 'YOUR_CLIENT_ID',       // From Kandy.io
        username: 'YOUR_USERNAME',         // From Kandy.io
        password: 'YOUR_PASSWORD'          // From Kandy.io
    }
};
```

### 2️⃣ Start Server (30 seconds)

```bash
npm install
node sip-server-3cx.js
```

You'll see:
```
=================================
SIP Trunk Server for 3CX
=================================
Protocol: UDP
Address: 0.0.0.0:5060
Domain: sip.yourcompany.com
=================================
```

### 3️⃣ Configure 3CX (5 minutes)

**Add SIP Trunk:**

1. Open 3CX Management Console
2. Go to **SIP Trunks** → **Add SIP Trunk**
3. Select **Generic SIP Trunk**

**Enter Details:**

| Setting | Value |
|---------|-------|
| Name | Kandy UAE |
| Authentication ID | 3cx_trunk |
| Password | StrongPassword123! |
| Registrar | YOUR_SERVER_IP:5060 |
| Proxy | YOUR_SERVER_IP:5060 |
| Transport | UDP |

4. Click **OK**

### 4️⃣ Test (2 minutes)

1. Check trunk status in 3CX → Should be **"Registered"** ✅
2. From 3CX extension, dial: `0501234567`
3. Call should connect! 🎉

## 🔧 Detailed Configuration

### Network Requirements

**Ports to Open:**

On Bridge Server:
```bash
sudo ufw allow 5060/udp      # SIP signaling
sudo ufw allow 10000:20000/udp  # RTP media
```

On 3CX Server:
- Outbound UDP 5060 to bridge server
- Bidirectional UDP 10000-20000 for RTP

### IP Addresses

Find your bridge server IP:
```bash
hostname -I
# or
ip addr show
```

Use this IP in 3CX trunk configuration.

## 📞 Outbound Rules

Configure 3CX to route calls through trunk:

### UAE Mobile Numbers (05XXXXXXXX)

1. **Outbound Rules** → **Add**
2. **Name**: UAE Mobile
3. **Pattern**: `05XXXXXXXX`
4. **Strip**: `1` digit
5. **Prepend**: `971`
6. **Route**: Select your trunk
7. **Apply**

**Result**: `0501234567` → `971501234567` ✅

### UAE Landline (0X XXXXXXX)

1. **Pattern**: `0[2-4,6-7,9]XXXXXXX`
2. **Strip**: `1`
3. **Prepend**: `971`

**Result**: `043456789` → `97143456789` ✅

### International Format (971XXXXXXXXX)

1. **Pattern**: `971XXXXXXXXX`
2. **Strip**: `0`
3. **Prepend**: (empty)

**Result**: `971501234567` → `971501234567` ✅

## 📱 Quick Dial Patterns

Add these common patterns:

| Pattern | Description | Strip | Prepend | Example |
|---------|-------------|-------|---------|---------|
| `0[5]XXXXXXXX` | Mobile | 1 | 971 | 0501234567 → 971501234567 |
| `0[4]XXXXXXX` | Dubai | 1 | 971 | 043456789 → 97143456789 |
| `0[2]XXXXXXX` | Abu Dhabi | 1 | 971 | 026789012 → 97126789012 |
| `0[6]XXXXXXX` | Sharjah | 1 | 971 | 065432109 → 97165432109 |
| `971XXXXXXXXX` | Full intl | 0 | - | 971501234567 → 971501234567 |

## 🧪 Testing

### Test Registration

In 3CX:
```
SIP Trunks → Your Trunk → Status
Should show: "Registered" in green
```

### Test Outbound Call

```
1. Pick up any 3CX extension
2. Dial: 0501234567
3. Should hear ringing
4. Call connects!
```

### Check Logs

On bridge server:
```bash
# Watch real-time logs
tail -f /var/log/sip-server.log

# or if using console:
node sip-server-3cx.js
# You'll see live activity
```

Expected log output:
```
[INFO] Received REGISTER from 3CX
[INFO] Registration successful for 3cx_trunk
[INFO] Received INVITE
[INFO] Initiating Kandy call to: 971501234567
[INFO] Call established
```

## ❌ Troubleshooting

### Trunk Won't Register

**Problem**: Status shows "Not Registered" or "Failed"

**Solutions**:
1. Check server is running: `ps aux | grep sip-server`
2. Verify IP address is correct in 3CX
3. Check password matches in both places
4. Verify port 5060 is not blocked: `telnet SERVER_IP 5060`
5. Check server logs for errors

### Calls Don't Connect

**Problem**: Dial tone, but call fails

**Solutions**:
1. Check Kandy.io credentials are correct
2. Verify outbound rule is configured
3. Check phone number format: `971XXXXXXXXX`
4. Review bridge server logs
5. Ensure Kandy.io account is active

### One-Way Audio

**Problem**: Can't hear other party (or vice versa)

**Solutions**:
1. Open RTP ports: `sudo ufw allow 10000:20000/udp`
2. Check NAT configuration in 3CX
3. Verify codec compatibility (use PCMU/PCMA)
4. Check firewall between 3CX and bridge server

### Registration Expires

**Problem**: Trunk registers but disconnects

**Solutions**:
1. Increase expires time in 3CX: `7200` seconds
2. Check network stability
3. Enable keep-alive in 3CX trunk settings
4. Review server logs for disconnect reason

## 🔒 Security Checklist

Before going to production:

- [ ] Change default password in `sip-server-3cx.js`
- [ ] Use strong password (12+ chars, mixed case, numbers, symbols)
- [ ] Restrict firewall to 3CX IP only:
  ```bash
  sudo ufw allow from 3CX_IP to any port 5060 proto udp
  ```
- [ ] Enable fail2ban for SIP attacks
- [ ] Use TLS/SRTP if possible (future enhancement)
- [ ] Regularly update server
- [ ] Monitor for unauthorized registration attempts
- [ ] Keep logs for security auditing

## 📊 Monitoring

### Check Active Calls

Add monitoring to `sip-server-3cx.js`:

```javascript
// Add this HTTP endpoint
const express = require('express');
const app = express();

app.get('/status', (req, res) => {
    res.json({
        registrations: registrations.size,
        activeCalls: activeCalls.size,
        uptime: process.uptime()
    });
});

app.listen(8080);
```

Access: `http://SERVER_IP:8080/status`

### Set Up Alerts

Monitor with a simple cron script:

```bash
#!/bin/bash
# check-trunk.sh

STATUS=$(curl -s http://localhost:8080/status)
if [ $? -ne 0 ]; then
    echo "Bridge server down!" | mail -s "Alert" admin@company.com
fi
```

Add to crontab:
```bash
*/5 * * * * /path/to/check-trunk.sh
```

## 🎯 Production Deployment

### Run as Service

Create systemd service `/etc/systemd/system/sip-bridge.service`:

```ini
[Unit]
Description=SIP Bridge for 3CX
After=network.target

[Service]
Type=simple
User=sipbridge
WorkingDirectory=/opt/webrtc-sip-bridge
ExecStart=/usr/bin/node sip-server-3cx.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable sip-bridge
sudo systemctl start sip-bridge
sudo systemctl status sip-bridge
```

### Auto-Start on Boot

```bash
sudo systemctl enable sip-bridge
```

### View Service Logs

```bash
sudo journalctl -u sip-bridge -f
```

## 📈 Scaling

### Single Server Limits

- **Concurrent Calls**: ~100-200
- **Registrations**: 1000+
- **CPU**: 2-4 cores recommended
- **RAM**: 4GB minimum
- **Bandwidth**: 100Mbps+

### Load Balancing (Future)

For >200 concurrent calls:

1. Deploy multiple bridge servers
2. Use DNS SRV records
3. Configure 3CX with multiple trunks
4. Enable automatic failover

## 📋 Pre-Launch Checklist

- [ ] Server running on UDP 5060
- [ ] Kandy.io credentials configured
- [ ] 3CX trunk shows "Registered"
- [ ] Test outbound call successful
- [ ] Test inbound call (if applicable)
- [ ] Outbound rules configured
- [ ] Number formatting tested
- [ ] Audio quality verified
- [ ] Emergency numbers working
- [ ] Firewall rules applied
- [ ] Monitoring enabled
- [ ] Backup plan in place
- [ ] Support contacts documented

## 🆘 Quick Commands

```bash
# Start server
node sip-server-3cx.js

# Stop server (Ctrl+C)
^C

# Check if running
ps aux | grep sip-server

# View logs
tail -f /var/log/sip-server.log

# Test connectivity to 3CX
ping 3CX_IP

# Check port open
nc -zvu 0.0.0.0 5060

# Restart service (if using systemd)
sudo systemctl restart sip-bridge
```

## 📞 Support Resources

**3CX Support:**
- Forum: https://www.3cx.com/community/
- Docs: https://www.3cx.com/docs/

**Kandy.io Support:**
- Portal: https://developer.kandy.io/
- Email: support@kandy.io

**Bridge Server:**
- Check README.md for detailed docs
- Review ARCHITECTURE.md for system design
- See 3CX-SETUP.md for full configuration

## 🎉 Success!

If you can:
- ✅ See "Registered" status in 3CX
- ✅ Make outbound calls
- ✅ Hear clear audio
- ✅ Calls complete successfully

**Congratulations! Your 3CX is now connected to Kandy.io! 🚀**

---

**Need Help?**
1. Check bridge server logs
2. Review 3CX trunk logs
3. Verify network connectivity
4. Check this guide's troubleshooting section
5. Contact support if needed

**Ready to go?** Run `node sip-server-3cx.js` and configure 3CX!
