const dgram = require('dgram');
const crypto = require('crypto');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const WebSocket = require('ws');
const { 
    BRIDGE_CONFIG, 
    authenticateWithKandy,
    formatUAEPhoneNumber 
} = require('./kandy-config-etisalat');

// ===== SIP SERVER CONFIGURATION =====
const SIP_CONFIG = {
    host: '0.0.0.0',
    port: 5060,
    transport: 'UDP',
    domain: 'sip.local', // Your SIP domain
    realm: 'sip.local',
    
    // 3CX trunk authentication
    users: {
        '3cx_trunk': {
            password: 'your_secure_password',
            displayName: '3CX Trunk'
        }
        // Add more users as needed
    },
    
    // Kandy.io credentials (username and password only - no clientId needed)
    kandy: {
        username: 'YOUR_KANDY_USERNAME',
        password: 'YOUR_KANDY_PASSWORD'
    }
};

// Store active registrations and sessions
const registrations = new Map();
const activeCalls = new Map();
let kandyAuth = null;

// ===== LOGGING =====
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
}

// ===== SIP MESSAGE PARSER =====
class SIPMessage {
    constructor(rawMessage) {
        this.raw = rawMessage;
        this.lines = rawMessage.split('\r\n');
        this.firstLine = this.lines[0];
        this.headers = {};
        this.body = '';
        
        this.parse();
    }

    parse() {
        // Parse first line (Request or Response)
        const firstLineParts = this.firstLine.split(' ');
        
        if (this.firstLine.startsWith('SIP/')) {
            // Response
            this.type = 'response';
            this.statusCode = parseInt(firstLineParts[1]);
            this.reason = firstLineParts.slice(2).join(' ');
        } else {
            // Request
            this.type = 'request';
            this.method = firstLineParts[0];
            this.uri = firstLineParts[1];
            this.version = firstLineParts[2];
        }

        // Parse headers
        let inBody = false;
        let bodyLines = [];
        
        for (let i = 1; i < this.lines.length; i++) {
            const line = this.lines[i];
            
            if (line === '') {
                inBody = true;
                continue;
            }
            
            if (inBody) {
                bodyLines.push(line);
            } else {
                const colonIndex = line.indexOf(':');
                if (colonIndex > -1) {
                    const name = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    this.headers[name.toLowerCase()] = value;
                }
            }
        }
        
        this.body = bodyLines.join('\r\n');
    }

    getHeader(name) {
        return this.headers[name.toLowerCase()];
    }

    getCallId() {
        return this.getHeader('call-id');
    }

    getFrom() {
        const from = this.getHeader('from');
        return this.parseAddress(from);
    }

    getTo() {
        const to = this.getHeader('to');
        return this.parseAddress(to);
    }

    parseAddress(address) {
        if (!address) return null;
        
        const match = address.match(/<sip:([^@>]+)@?([^>]*)>/);
        if (match) {
            return {
                user: match[1],
                host: match[2],
                tag: address.match(/tag=([^;]+)/)?.[1],
                raw: address
            };
        }
        
        const simple = address.match(/sip:([^@]+)@?(.+)/);
        if (simple) {
            return {
                user: simple[1],
                host: simple[2],
                raw: address
            };
        }
        
        return { raw: address };
    }

    getVia() {
        const via = this.getHeader('via');
        if (!via) return null;
        
        const match = via.match(/SIP\/2.0\/(\w+)\s+([^:;]+):?(\d+)?/);
        if (match) {
            return {
                transport: match[1],
                host: match[2],
                port: match[3] || 5060,
                branch: via.match(/branch=([^;]+)/)?.[1]
            };
        }
        return null;
    }
}

// ===== SIP RESPONSE BUILDER =====
class SIPResponse {
    constructor(statusCode, reason, request, additionalHeaders = {}) {
        this.statusCode = statusCode;
        this.reason = reason;
        this.request = request;
        this.additionalHeaders = additionalHeaders;
    }

    build() {
        const lines = [];
        
        // Status line
        lines.push(`SIP/2.0 ${this.statusCode} ${this.reason}`);
        
        // Copy headers from request
        const via = this.request.getHeader('via');
        const from = this.request.getHeader('from');
        const to = this.request.getHeader('to');
        const callId = this.request.getHeader('call-id');
        const cseq = this.request.getHeader('cseq');
        
        lines.push(`Via: ${via}`);
        lines.push(`From: ${from}`);
        
        // Add To tag if not present (required for responses)
        if (to && !to.includes('tag=')) {
            const toTag = crypto.randomBytes(8).toString('hex');
            lines.push(`To: ${to};tag=${toTag}`);
        } else {
            lines.push(`To: ${to}`);
        }
        
        lines.push(`Call-ID: ${callId}`);
        lines.push(`CSeq: ${cseq}`);
        
        // Additional headers
        for (const [name, value] of Object.entries(this.additionalHeaders)) {
            lines.push(`${name}: ${value}`);
        }
        
        // Standard headers
        lines.push(`Server: WebRTC-SIP-Bridge/1.0`);
        lines.push(`Content-Length: 0`);
        lines.push('');
        lines.push('');
        
        return lines.join('\r\n');
    }
}

// ===== AUTHENTICATION =====
function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

function calculateMD5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

function verifyDigestAuth(request, username, password, nonce) {
    const auth = request.getHeader('authorization');
    if (!auth || !auth.includes('Digest')) {
        return false;
    }

    // Parse authorization header
    const authParams = {};
    const matches = auth.matchAll(/(\w+)="([^"]+)"/g);
    for (const match of matches) {
        authParams[match[1]] = match[2];
    }

    // Calculate expected response
    const ha1 = calculateMD5(`${username}:${SIP_CONFIG.realm}:${password}`);
    const ha2 = calculateMD5(`${request.method}:${authParams.uri}`);
    const expectedResponse = calculateMD5(`${ha1}:${nonce}:${ha2}`);

    return authParams.response === expectedResponse;
}

// ===== CALL SESSION MANAGER =====
class CallSession {
    constructor(callId, from, to, remoteInfo) {
        this.callId = callId;
        this.from = from;
        this.to = to;
        this.remoteInfo = remoteInfo;
        this.kandyWs = null;
        this.peerConnection = null;
        this.state = 'initial';
        this.localTag = crypto.randomBytes(8).toString('hex');
        this.remoteTag = null;
    }

    async connectToKandy() {
        try {
            // Get Kandy access token
            if (!kandyAuth) {
                kandyAuth = await authenticateWithKandy(SIP_CONFIG.kandy);
            }

            const wsUrl = `${BRIDGE_CONFIG.kandy.websocketServer}?access_token=${kandyAuth.accessToken}`;
            this.kandyWs = new WebSocket(wsUrl);

            return new Promise((resolve, reject) => {
                this.kandyWs.on('open', () => {
                    log('info', 'Connected to Kandy WebSocket', { callId: this.callId });
                    this.state = 'kandy-connected';
                    resolve();
                });

                this.kandyWs.on('error', (error) => {
                    log('error', 'Kandy WebSocket error', { callId: this.callId, error: error.message });
                    reject(error);
                });

                this.kandyWs.on('message', (data) => {
                    this.handleKandyMessage(data);
                });
            });
        } catch (error) {
            log('error', 'Failed to connect to Kandy', { callId: this.callId, error: error.message });
            throw error;
        }
    }

    handleKandyMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            log('debug', 'Received from Kandy', { callId: this.callId, type: message.type });
            
            // Handle Kandy messages and update call state
            if (message.type === 'response' && message.method === 'call.make') {
                if (message.result) {
                    this.state = 'kandy-calling';
                }
            }
        } catch (error) {
            log('error', 'Error handling Kandy message', { callId: this.callId, error: error.message });
        }
    }

    async initiateKandyCall(destination, sdp) {
        try {
            const formattedNumber = formatUAEPhoneNumber(destination);
            log('info', `Initiating Kandy call to: ${formattedNumber}`, { callId: this.callId });

            const callMessage = {
                type: 'request',
                method: 'call.make',
                id: `req_${Date.now()}`,
                params: {
                    callId: this.callId,
                    destination: formattedNumber,
                    sdp: sdp,
                    mediaType: 'audio'
                }
            };

            if (this.kandyWs && this.kandyWs.readyState === WebSocket.OPEN) {
                this.kandyWs.send(JSON.stringify(callMessage));
                this.state = 'calling';
                return true;
            }
            
            return false;
        } catch (error) {
            log('error', 'Error initiating Kandy call', { callId: this.callId, error: error.message });
            return false;
        }
    }

    async cleanup() {
        if (this.kandyWs) {
            this.kandyWs.close();
            this.kandyWs = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }
}

// ===== SIP SERVER =====
class SIPServer {
    constructor() {
        this.socket = dgram.createSocket('udp4');
        this.nonces = new Map(); // Store nonces for authentication
    }

    start() {
        this.socket.on('message', (msg, rinfo) => {
            this.handleMessage(msg.toString(), rinfo);
        });

        this.socket.on('error', (err) => {
            log('error', 'Socket error', { error: err.message });
        });

        this.socket.bind(SIP_CONFIG.port, SIP_CONFIG.host, () => {
            log('info', `SIP Server listening`, {
                host: SIP_CONFIG.host,
                port: SIP_CONFIG.port,
                transport: SIP_CONFIG.transport
            });
            console.log(`\n=================================`);
            console.log(`SIP Trunk Server for 3CX`);
            console.log(`=================================`);
            console.log(`Protocol: ${SIP_CONFIG.transport}`);
            console.log(`Address: ${SIP_CONFIG.host}:${SIP_CONFIG.port}`);
            console.log(`Domain: ${SIP_CONFIG.domain}`);
            console.log(`=================================\n`);
        });
    }

    handleMessage(message, rinfo) {
        try {
            const sipMsg = new SIPMessage(message);
            
            if (sipMsg.type === 'request') {
                log('info', `Received ${sipMsg.method}`, {
                    from: rinfo.address,
                    port: rinfo.port,
                    callId: sipMsg.getCallId()
                });

                switch (sipMsg.method) {
                    case 'REGISTER':
                        this.handleRegister(sipMsg, rinfo);
                        break;
                    case 'INVITE':
                        this.handleInvite(sipMsg, rinfo);
                        break;
                    case 'ACK':
                        this.handleAck(sipMsg, rinfo);
                        break;
                    case 'BYE':
                        this.handleBye(sipMsg, rinfo);
                        break;
                    case 'CANCEL':
                        this.handleCancel(sipMsg, rinfo);
                        break;
                    case 'OPTIONS':
                        this.handleOptions(sipMsg, rinfo);
                        break;
                    default:
                        this.sendResponse(405, 'Method Not Allowed', sipMsg, rinfo);
                }
            }
        } catch (error) {
            log('error', 'Error handling message', { error: error.message });
        }
    }

    handleRegister(request, rinfo) {
        const from = request.getFrom();
        const username = from.user;
        const auth = request.getHeader('authorization');

        // Check if user exists
        if (!SIP_CONFIG.users[username]) {
            this.sendResponse(404, 'Not Found', request, rinfo);
            return;
        }

        // Check authentication
        if (!auth) {
            // Challenge with 401
            const nonce = generateNonce();
            this.nonces.set(username, nonce);
            
            const authHeader = `Digest realm="${SIP_CONFIG.realm}", nonce="${nonce}", algorithm=MD5`;
            this.sendResponse(401, 'Unauthorized', request, rinfo, {
                'WWW-Authenticate': authHeader
            });
            return;
        }

        // Verify authentication
        const nonce = this.nonces.get(username);
        const password = SIP_CONFIG.users[username].password;
        
        if (!verifyDigestAuth(request, username, password, nonce)) {
            this.sendResponse(403, 'Forbidden', request, rinfo);
            return;
        }

        // Registration successful
        registrations.set(username, {
            contact: request.getHeader('contact'),
            expires: parseInt(request.getHeader('expires') || '3600'),
            address: rinfo.address,
            port: rinfo.port,
            registeredAt: Date.now()
        });

        log('info', `Registration successful for ${username}`, { from: rinfo.address });
        
        this.sendResponse(200, 'OK', request, rinfo, {
            'Contact': request.getHeader('contact'),
            'Expires': request.getHeader('expires') || '3600'
        });
    }

    async handleInvite(request, rinfo) {
        const callId = request.getCallId();
        const from = request.getFrom();
        const to = request.getTo();
        const sdp = request.body;

        log('info', `Incoming INVITE`, {
            callId,
            from: from.user,
            to: to.user
        });

        // Send 100 Trying
        this.sendResponse(100, 'Trying', request, rinfo);

        try {
            // Create call session
            const session = new CallSession(callId, from, to, rinfo);
            activeCalls.set(callId, session);

            // Connect to Kandy
            await session.connectToKandy();

            // Send 180 Ringing
            this.sendResponse(180, 'Ringing', request, rinfo);

            // Initiate call via Kandy
            const success = await session.initiateKandyCall(to.user, sdp);

            if (success) {
                // Send 200 OK with SDP (in production, wait for actual answer from Kandy)
                const responseHeaders = {
                    'Contact': `<sip:${SIP_CONFIG.domain}>`,
                    'Content-Type': 'application/sdp',
                    'Content-Length': sdp.length.toString()
                };

                // For now, echo back the SDP (in production, use Kandy's answer)
                this.sendResponseWithBody(200, 'OK', request, rinfo, responseHeaders, sdp);
            } else {
                this.sendResponse(503, 'Service Unavailable', request, rinfo);
                activeCalls.delete(callId);
            }

        } catch (error) {
            log('error', 'Error handling INVITE', { callId, error: error.message });
            this.sendResponse(500, 'Internal Server Error', request, rinfo);
            activeCalls.delete(callId);
        }
    }

    handleAck(request, rinfo) {
        const callId = request.getCallId();
        const session = activeCalls.get(callId);
        
        if (session) {
            session.state = 'established';
            log('info', 'Call established', { callId });
        }
    }

    async handleBye(request, rinfo) {
        const callId = request.getCallId();
        const session = activeCalls.get(callId);

        if (session) {
            await session.cleanup();
            activeCalls.delete(callId);
            log('info', 'Call terminated', { callId });
        }

        this.sendResponse(200, 'OK', request, rinfo);
    }

    handleCancel(request, rinfo) {
        const callId = request.getCallId();
        const session = activeCalls.get(callId);

        if (session) {
            session.cleanup();
            activeCalls.delete(callId);
        }

        this.sendResponse(200, 'OK', request, rinfo);
    }

    handleOptions(request, rinfo) {
        this.sendResponse(200, 'OK', request, rinfo, {
            'Allow': 'INVITE, ACK, CANCEL, BYE, OPTIONS',
            'Accept': 'application/sdp'
        });
    }

    sendResponse(statusCode, reason, request, rinfo, additionalHeaders = {}) {
        const response = new SIPResponse(statusCode, reason, request, additionalHeaders);
        const message = response.build();
        
        this.socket.send(message, rinfo.port, rinfo.address, (err) => {
            if (err) {
                log('error', 'Error sending response', { error: err.message });
            } else {
                log('debug', `Sent ${statusCode} ${reason}`, { to: rinfo.address });
            }
        });
    }

    sendResponseWithBody(statusCode, reason, request, rinfo, headers, body) {
        const response = new SIPResponse(statusCode, reason, request, headers);
        let message = response.build();
        
        // Replace Content-Length and add body
        message = message.replace('Content-Length: 0', `Content-Length: ${body.length}`);
        message = message.trim() + '\r\n' + body;
        
        this.socket.send(message, rinfo.port, rinfo.address, (err) => {
            if (err) {
                log('error', 'Error sending response with body', { error: err.message });
            } else {
                log('debug', `Sent ${statusCode} ${reason} with SDP`, { to: rinfo.address });
            }
        });
    }
}

// ===== START SERVER =====
const server = new SIPServer();
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
    log('info', 'SIGTERM received, shutting down');
    for (const [callId, session] of activeCalls) {
        session.cleanup();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    log('info', 'SIGINT received, shutting down');
    for (const [callId, session] of activeCalls) {
        session.cleanup();
    }
    process.exit(0);
});
