# Architecture - 3CX to Kandy.io Bridge

## 📐 System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│   3CX PBX       │         │   Bridge Server  │         │   Kandy.io      │
│                 │         │                  │         │   Platform      │
│  • Extensions   │  SIP    │  • SIP Server    │  WSS    │                 │
│  • Trunks       │ ◄─────► │    (UDP 5060)    │ ◄─────► │  • Auth Server  │
│  • Routing      │         │  • WebRTC Bridge │         │  • WebSocket    │
│                 │         │  • Kandy.io API  │         │  • Media Server │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        ▲                            │                            │
        │                            ▼                            ▼
        │                   ┌──────────────┐           ┌─────────────────┐
        │                   │              │           │                 │
        └───────RTP─────────│ Media Relay  │           │  Etisalat UAE   │
         Audio Stream       │  (RTP Ports) │           │  TURN/STUN      │
                           │              │           │  Servers        │
                           └──────────────┘           └─────────────────┘
```

## 🔄 Call Flow Diagram

### Outbound Call (3CX → UAE Number)

```
1. 3CX Extension dials: 0501234567
        ↓
2. 3CX applies outbound rule:
   - Strip 1 digit
   - Prepend 971
   - Result: 971501234567
        ↓
3. 3CX sends INVITE to Bridge (SIP/UDP 5060)
   - From: extension@3cx.local
   - To: 971501234567@sip.yourcompany.com
   - SDP: Audio codecs, RTP ports
        ↓
4. Bridge Server:
   - Receives SIP INVITE
   - Sends "100 Trying"
   - Connects to Kandy.io WebSocket
        ↓
5. Bridge authenticates with Kandy.io:
   - OAuth token request
   - Receives access token
        ↓
6. Bridge requests TURN credentials from Kandy.io
        ↓
7. Bridge sends call request to Kandy.io:
   - Method: call.make
   - Destination: 971501234567
   - SDP: Audio parameters
        ↓
8. Kandy.io processes call:
   - Routes to Etisalat SIP trunk
   - Initiates call to UAE number
        ↓
9. Bridge sends "180 Ringing" to 3CX
        ↓
10. When answered:
    - Bridge sends "200 OK" to 3CX with SDP
    - 3CX sends ACK
    - RTP audio stream established
        ↓
11. Call in progress:
    - Audio flows: 3CX ↔ Bridge ↔ Kandy.io ↔ UAE Number
        ↓
12. Call termination:
    - Either party sends BYE
    - Bridge cleans up session
    - Kandy.io call ends
```

### Inbound Call (UAE Number → 3CX Extension)

```
1. Call arrives at Etisalat trunk → Kandy.io
        ↓
2. Kandy.io sends WebSocket notification to Bridge:
   - Type: call.incomingCall
   - From: 971501234567
   - CallId: unique_id
        ↓
3. Bridge sends INVITE to 3CX:
   - From: 971501234567@sip.yourcompany.com
   - To: DID@3cx.local
   - SDP: Audio parameters
        ↓
4. 3CX routes call based on DID rules:
   - IVR, Ring Group, or Direct Extension
        ↓
5. 3CX sends "180 Ringing" → Bridge → Kandy.io
        ↓
6. Extension answers:
   - 3CX sends "200 OK" to Bridge
   - Bridge sends ACK
   - Bridge notifies Kandy.io: call.answer
        ↓
7. Call connected:
   - Audio stream: UAE Number ↔ Kandy.io ↔ Bridge ↔ 3CX Extension
```

## 🔐 Authentication Flow

```
┌─────────┐                  ┌────────┐                ┌─────────┐
│  3CX    │                  │ Bridge │                │ Kandy   │
└────┬────┘                  └───┬────┘                └────┬────┘
     │                           │                          │
     │ 1. REGISTER              │                          │
     │──────────────────────────>│                          │
     │                           │                          │
     │ 2. 401 Unauthorized       │                          │
     │    WWW-Authenticate       │                          │
     │<──────────────────────────│                          │
     │                           │                          │
     │ 3. REGISTER + Auth        │                          │
     │    (Digest Response)      │                          │
     │──────────────────────────>│                          │
     │                           │                          │
     │                           │ 4. OAuth Token Request   │
     │                           │─────────────────────────>│
     │                           │                          │
     │                           │ 5. Access Token          │
     │                           │<─────────────────────────│
     │                           │                          │
     │ 6. 200 OK                 │                          │
     │<──────────────────────────│                          │
     │                           │                          │
     │ 7. Periodic Re-REGISTER   │ 8. Token Refresh         │
     │──────────────────────────>│─────────────────────────>│
     │                           │                          │
```

## 📊 Component Details

### Bridge Server Components

**SIP Server (UDP 5060)**
- Handles SIP REGISTER from 3CX
- Processes INVITE, ACK, BYE, CANCEL
- Digest authentication
- Response generation

**Kandy.io WebSocket Client**
- OAuth authentication
- Real-time signaling
- Call control messages
- Event notifications

**Call Session Manager**
- Tracks active calls
- Maps SIP Call-ID to Kandy Call-ID
- State management
- Resource cleanup

**Media Handling**
- SDP parsing and generation
- Codec negotiation
- RTP port allocation
- DTMF relay (RFC2833)

## 🌐 Network Ports

### Bridge Server

| Port | Protocol | Purpose | Direction |
|------|----------|---------|-----------|
| 5060 | UDP | SIP signaling | Inbound from 3CX |
| 10000-20000 | UDP | RTP media | Bidirectional |
| 443 | TCP | Kandy.io WSS | Outbound |
| 443 | TCP | TURN (TCP) | Outbound |
| 3478 | UDP | STUN | Outbound |

### 3CX Server

| Port | Protocol | Purpose | Direction |
|------|----------|---------|-----------|
| 5060 | UDP | SIP to trunk | Outbound to bridge |
| 9000-9500 | UDP | RTP media | Bidirectional |
| 5001 | TCP | 3CX tunnel | N/A |

## 🔄 State Machine

### Call States

```
        ┌─────────┐
        │ INITIAL │
        └────┬────┘
             │
             ▼
    ┌────────────────┐
    │ KANDY_CONNECTED│
    └────┬───────────┘
         │
         ▼
    ┌─────────┐
    │ CALLING │
    └────┬────┘
         │
         ▼
    ┌──────────┐
    │ RINGING  │
    └────┬─────┘
         │
         ▼
    ┌────────────┐
    │ ESTABLISHED│
    └────┬───────┘
         │
         ▼
    ┌────────────┐
    │ TERMINATED │
    └────────────┘
```

### Registration States

```
┌──────────────┐
│ UNREGISTERED │
└──────┬───────┘
       │
       ▼
┌────────────┐
│ CHALLENGED │ (401 sent)
└──────┬─────┘
       │
       ▼
┌────────────┐
│ REGISTERED │
└──────┬─────┘
       │
       ▼ (on expire)
┌────────────┐
│ UNREGISTERED│
└────────────┘
```

## 💾 Data Flow

### SIP Message Example

**REGISTER Request:**
```
REGISTER sip:sip.yourcompany.com SIP/2.0
Via: SIP/2.0/UDP 192.168.1.10:5060;branch=z9hG4bK-xxx
From: <sip:3cx_trunk@sip.yourcompany.com>;tag=xxx
To: <sip:3cx_trunk@sip.yourcompany.com>
Call-ID: xxx@192.168.1.10
CSeq: 1 REGISTER
Contact: <sip:3cx_trunk@192.168.1.10:5060>
Expires: 3600
Content-Length: 0
```

**INVITE Request:**
```
INVITE sip:971501234567@sip.yourcompany.com SIP/2.0
Via: SIP/2.0/UDP 192.168.1.10:5060;branch=z9hG4bK-xxx
From: "Extension 100" <sip:100@3cx.local>;tag=xxx
To: <sip:971501234567@sip.yourcompany.com>
Call-ID: xxx@192.168.1.10
CSeq: 1 INVITE
Contact: <sip:100@192.168.1.10:5060>
Content-Type: application/sdp
Content-Length: 245

v=0
o=3CX 0 0 IN IP4 192.168.1.10
s=3CX Call
c=IN IP4 192.168.1.10
t=0 0
m=audio 9000 RTP/AVP 0 8 101
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:101 telephone-event/8000
a=ptime:20
```

### Kandy.io WebSocket Message

**Call Request:**
```json
{
  "type": "request",
  "method": "call.make",
  "id": "req_1234567890",
  "params": {
    "callId": "call_abc123",
    "destination": "971501234567",
    "sdp": "v=0\r\no=...",
    "mediaType": "audio"
  }
}
```

**Call Response:**
```json
{
  "type": "response",
  "method": "call.make",
  "id": "req_1234567890",
  "result": {
    "callId": "call_abc123",
    "status": "ringing",
    "sdp": "v=0\r\no=..."
  }
}
```

## 🔧 Scalability Considerations

### Single Server

- **Concurrent Calls**: ~100-200
- **CPU**: 2-4 cores
- **RAM**: 4GB
- **Network**: 100Mbps

### Load Balanced

```
         ┌─────────┐
         │   3CX   │
         └────┬────┘
              │
              ▼
         ┌────────┐
         │  Load  │
         │Balancer│
         └─┬───┬──┘
           │   │
      ┌────┘   └────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│ Bridge 1 │  │ Bridge 2 │
└────┬─────┘  └────┬─────┘
     │             │
     └──────┬──────┘
            ▼
     ┌──────────┐
     │ Kandy.io │
     └──────────┘
```

### High Availability

- Multiple bridge servers
- DNS SRV records
- Health checking
- Automatic failover
- Session persistence

## 📈 Performance Metrics

### Key Performance Indicators

- **Call Setup Time**: <2 seconds
- **Registration Time**: <500ms
- **Audio Latency**: <150ms
- **Packet Loss**: <1%
- **MOS Score**: >4.0

### Monitoring Points

1. SIP registration success rate
2. Call completion rate
3. Average call duration
4. Failed call reasons
5. Kandy.io connection uptime
6. RTP packet statistics

## 🔍 Debugging

### Enable Packet Capture

```bash
# Capture SIP traffic
sudo tcpdump -i any -n port 5060 -w sip-traffic.pcap

# Capture RTP traffic
sudo tcpdump -i any -n udp portrange 10000-20000 -w rtp-traffic.pcap
```

### Analyze with Wireshark

```bash
wireshark sip-traffic.pcap
# Filter: sip || rtp
```

### SIP Trace

```bash
# Add to sip-server-3cx.js
console.log('RAW SIP MESSAGE:', message);
```

## 📚 References

- **SIP RFC 3261**: https://tools.ietf.org/html/rfc3261
- **SDP RFC 4566**: https://tools.ietf.org/html/rfc4566
- **RTP RFC 3550**: https://tools.ietf.org/html/rfc3550
- **3CX Documentation**: https://www.3cx.com/docs/
- **Kandy.io API**: https://developer.kandy.io/

---

**Architecture Version**: 1.0  
**Last Updated**: 2024
