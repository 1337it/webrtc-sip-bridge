# WebRTC to SIP Bridge for UAE (Kandy.io / Etisalat)

A Node.js-based WebRTC to SIP bridge specifically configured for **Kandy.io** (Ribbon Communications) and **Etisalat UAE** infrastructure. This bridge allows WebRTC clients to connect to SIP trunks and make/receive calls through the Kandy.io platform.

## 📋 Features

- ✅ WebRTC to SIP call bridging
- ✅ Kandy.io / Ribbon Communications integration
- ✅ Etisalat UAE TURN/STUN server configuration
- ✅ OAuth authentication with Kandy.io
- ✅ Incoming and outgoing call support
- ✅ UAE phone number formatting and validation
- ✅ Auto-reconnection handling
- ✅ WebSocket-based signaling
- ✅ ICE candidate handling
- ✅ Early media support
- ✅ Web-based demo interface

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   WebRTC    │ ◄─────► │    Bridge    │ ◄─────► │   Kandy.io      │
│   Client    │  WSS    │    Server    │  WSS    │   Platform      │
│ (Browser)   │         │  (Node.js)   │         │  (Etisalat UAE) │
└─────────────┘         └──────────────┘         └─────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ TURN/STUN    │
                        │   Servers    │
                        │ (Etisalat)   │
                        └──────────────┘
```

## 📦 Installation

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- SSL certificates (for production)
- Kandy.io account credentials
- Etisalat UAE SIP trunk access

### Steps

1. **Clone or download the repository**

```bash
cd webrtc-sip-bridge
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure your credentials**

Edit `kandy-config-etisalat.js` and update the credentials section:

```javascript
credentials: {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    accountId: 'YOUR_ACCOUNT_ID',
    userId: 'YOUR_USER_ID'
}
```

4. **Configure SSL (for production)**

Update the server configuration in `kandy-config-etisalat.js`:

```javascript
server: {
    host: '0.0.0.0',
    port: 8080,
    secure: true, // Set to true for HTTPS/WSS
    sslCert: '/path/to/your/cert.pem',
    sslKey: '/path/to/your/key.pem'
}
```

## 🚀 Usage

### Start the Kandy.io Bridge Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### Start the Generic SIP Bridge Server

If you want to use a different SIP provider:

```bash
npm run start:generic
```

### Access the Web Interface

Open your browser and navigate to:

```
http://localhost:8080
```

Or for HTTPS:

```
https://your-domain:8080
```

## 📝 Configuration Files

### Main Configuration Files

1. **`kandy-config-etisalat.js`** - Kandy.io and Etisalat UAE specific configuration
2. **`config-uae.js`** - Generic UAE SIP providers configuration
3. **`kandy-server.js`** - Main Kandy.io bridge server
4. **`server-uae.js`** - Generic SIP bridge server
5. **`client.js`** - WebRTC client library

### Kandy.io Configuration Details

The configuration is based on the actual Etisalat UAE Kandy.io setup:

- **Auth Server**: `kbs-uae-cim-auth.kandy.io:443`
- **WebSocket**: `wss://kbs-uae-cim-auth.kandy.io:443`
- **TURN Servers**: 
  - `turns:ct-turn1.etisalat.ae:443?transport=tcp`
  - `turns:ct-turn2.etisalat.ae:443?transport=tcp`
- **STUN Servers**:
  - `stun:ct-turn1.etisalat.ae:3478?transport=udp`
  - `stun:ct-turn2.etisalat.ae:3478?transport=udp`

## 🔌 API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "activeSessions": 2,
  "config": {
    "provider": "Kandy.io Etisalat UAE",
    "authenticated": true
  }
}
```

### Authentication

```
POST /authenticate
Content-Type: application/json

{
  "clientId": "your_client_id",
  "username": "your_username",
  "password": "your_password"
}
```

Response:
```json
{
  "success": true,
  "expiresIn": 3600
}
```

## 🌐 WebSocket Protocol

### Client to Server Messages

#### Offer (WebRTC)
```json
{
  "type": "offer",
  "offer": {
    "type": "offer",
    "sdp": "v=0..."
  }
}
```

#### ICE Candidate
```json
{
  "type": "ice-candidate",
  "candidate": {
    "candidate": "...",
    "sdpMid": "...",
    "sdpMLineIndex": 0
  }
}
```

#### Make Call
```json
{
  "type": "call",
  "destination": "971501234567"
}
```

#### Hangup
```json
{
  "type": "hangup"
}
```

### Server to Client Messages

#### Answer (WebRTC)
```json
{
  "type": "answer",
  "answer": {
    "type": "answer",
    "sdp": "v=0..."
  }
}
```

#### Call Status
```json
{
  "type": "call-connected"
}
```

#### Incoming Call
```json
{
  "type": "incoming-call",
  "from": "971501234567",
  "callId": "call_123456"
}
```

## 📞 UAE Phone Number Formats

The bridge automatically handles these UAE number formats:

- **Mobile**: `971501234567` or `0501234567` or `+971501234567`
- **Landline**: `97143456789` or `043456789` or `+97143456789`
- **Toll-free**: `971800123456` or `800123456`

### Area Codes

- **Abu Dhabi**: 2
- **Dubai**: 4
- **Sharjah/Ajman/UAQ**: 6
- **Ras Al Khaimah**: 7
- **Fujairah**: 9
- **Al Ain**: 3

## 🔧 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your Kandy.io credentials
   - Check if your account is active
   - Ensure you have the correct client ID and secret

2. **WebSocket Connection Failed**
   - Check if the server URL is correct
   - Verify SSL certificates are valid
   - Check firewall rules

3. **ICE Connection Failed**
   - Verify TURN/STUN servers are accessible
   - Check network firewalls
   - Ensure UDP ports 3478 and TCP port 443 are open

4. **No Audio**
   - Check microphone permissions in browser
   - Verify audio codecs are supported
   - Check that remote audio element is properly configured

### Debugging

Enable debug logging in `kandy-config-etisalat.js`:

```javascript
logging: {
    level: 'debug', // Change from 'info' to 'debug'
    logToFile: true,
    logFilePath: '/var/log/kandy-bridge-uae.log'
}
```

View logs:
```bash
tail -f /var/log/kandy-bridge-uae.log
```

## 🔒 Security Considerations

1. **SSL/TLS**: Always use HTTPS/WSS in production
2. **Authentication**: Store credentials securely (use environment variables)
3. **CORS**: Configure appropriate CORS policies
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: All phone numbers are validated
6. **Token Management**: Access tokens are auto-refreshed

## 📚 Additional Resources

- [Kandy.io Documentation](https://developer.kandy.io/)
- [Ribbon Communications](https://ribboncommunications.com/)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [SIP.js Documentation](https://sipjs.com/)
- [UAE TRA Regulations](https://www.tdra.gov.ae/)

## 📄 License

MIT License

## 🤝 Support

For issues related to:
- **Kandy.io Platform**: Contact Ribbon Communications support
- **Etisalat Services**: Contact Etisalat business support
- **This Bridge**: Open an issue in the repository

## 📋 TODO

- [ ] Add call recording functionality
- [ ] Implement call transfer
- [ ] Add conference call support
- [ ] Implement WebRTC statistics
- [ ] Add call quality metrics
- [ ] Create Docker container
- [ ] Add unit tests
- [ ] Implement load balancing

## ⚠️ Important Notes

1. This bridge requires active Kandy.io and Etisalat UAE accounts
2. UAE has specific regulations for VoIP services - ensure compliance
3. Call recording may require user consent under UAE law
4. Emergency services (999, 998, 997) should be handled appropriately
5. Data retention policies must comply with UAE regulations

## 🔄 Version History

- **v1.0.0** - Initial release with Kandy.io Etisalat UAE support
