const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const fetch = require('node-fetch');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const { 
    BRIDGE_CONFIG, 
    getKandySDKConfig, 
    authenticateWithKandy,
    formatUAEPhoneNumber,
    validateUAEPhoneNumber 
} = require('./kandy-config-etisalat');

const app = express();
app.use(express.json());

// Create server (HTTP or HTTPS)
let server;
if (BRIDGE_CONFIG.server.secure) {
    try {
        const serverOptions = {
            cert: fs.readFileSync(BRIDGE_CONFIG.server.sslCert),
            key: fs.readFileSync(BRIDGE_CONFIG.server.sslKey)
        };
        server = https.createServer(serverOptions, app);
    } catch (error) {
        console.log('SSL certificates not found, using HTTP server');
        server = http.createServer(app);
    }
} else {
    server = http.createServer(app);
}

const wss = new WebSocket.Server({ server });

// Store active sessions
const sessions = new Map();
const kandyTokens = new Map(); // Store authentication tokens

// Logging function
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage, data);
    
    if (BRIDGE_CONFIG.logging.logToFile) {
        try {
            const logEntry = `${logMessage} ${JSON.stringify(data)}\n`;
            fs.appendFileSync(BRIDGE_CONFIG.logging.logFilePath, logEntry);
        } catch (error) {
            console.error('Error writing to log file:', error.message);
        }
    }
}

// ===== KANDY.IO AUTHENTICATION =====
class KandyAuthManager {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;
    }

    async authenticate(credentials) {
        try {
            log('info', 'Authenticating with Kandy.io');
            
            const auth = await authenticateWithKandy(credentials);
            
            this.accessToken = auth.accessToken;
            this.refreshToken = auth.refreshToken;
            this.expiresAt = Date.now() + (auth.expiresIn * 1000);
            
            log('info', 'Kandy.io authentication successful', {
                expiresIn: auth.expiresIn
            });
            
            return auth;
        } catch (error) {
            log('error', 'Kandy.io authentication failed', { error: error.message });
            throw error;
        }
    }

    async getValidToken() {
        if (!this.accessToken || Date.now() >= this.expiresAt - 60000) {
            // Token expired or about to expire, refresh it
            await this.refreshAccessToken();
        }
        return this.accessToken;
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            log('info', 'Refreshing Kandy.io access token');
            
            const authUrl = `${BRIDGE_CONFIG.kandy.authServer}/v2.0/token`;
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                client_id: BRIDGE_CONFIG.kandy.credentials.clientId
            });

            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.expiresAt = Date.now() + (data.expires_in * 1000);
            
            log('info', 'Access token refreshed successfully');
            
            return this.accessToken;
        } catch (error) {
            log('error', 'Token refresh failed', { error: error.message });
            throw error;
        }
    }
}

// Global auth manager
const kandyAuth = new KandyAuthManager();

// ===== KANDY.IO WEBRTC BRIDGE =====
class KandyWebRTCBridge {
    constructor(websocket, sessionId) {
        this.ws = websocket;
        this.sessionId = sessionId;
        this.peerConnection = null;
        this.kandyWs = null;
        this.callId = null;
        this.remoteStream = null;
        this.localStream = null;
        this.iceServers = [];
        
        log('info', 'New Kandy bridge session created', { sessionId });
        this.connectToKandy();
    }

    async connectToKandy() {
        try {
            // Get valid access token
            const token = await kandyAuth.getValidToken();
            
            // Connect to Kandy WebSocket
            const wsUrl = `${BRIDGE_CONFIG.kandy.websocketServer}?access_token=${token}`;
            log('info', 'Connecting to Kandy WebSocket', { sessionId: this.sessionId });
            
            this.kandyWs = new WebSocket(wsUrl);
            
            this.kandyWs.on('open', () => {
                log('info', 'Connected to Kandy WebSocket', { sessionId: this.sessionId });
                this.sendToWebRTC({ type: 'kandy-connected' });
                
                // Request TURN credentials
                this.requestTurnCredentials();
            });

            this.kandyWs.on('message', (data) => {
                this.handleKandyMessage(data);
            });

            this.kandyWs.on('error', (error) => {
                log('error', 'Kandy WebSocket error', { 
                    sessionId: this.sessionId, 
                    error: error.message 
                });
            });

            this.kandyWs.on('close', () => {
                log('info', 'Kandy WebSocket closed', { sessionId: this.sessionId });
            });

        } catch (error) {
            log('error', 'Error connecting to Kandy', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
            this.sendToWebRTC({
                type: 'error',
                message: `Kandy connection failed: ${error.message}`
            });
        }
    }

    async requestTurnCredentials() {
        try {
            // Request ICE servers from Kandy
            const message = {
                type: 'request',
                method: 'call.getIceServers',
                id: this.generateRequestId()
            };
            
            if (this.kandyWs && this.kandyWs.readyState === WebSocket.OPEN) {
                this.kandyWs.send(JSON.stringify(message));
                log('debug', 'Requested TURN credentials from Kandy', { sessionId: this.sessionId });
            }
        } catch (error) {
            log('error', 'Error requesting TURN credentials', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
        }
    }

    handleKandyMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            log('debug', 'Received from Kandy', { 
                sessionId: this.sessionId, 
                type: message.type || message.method 
            });

            switch (message.type || message.method) {
                case 'response':
                    this.handleKandyResponse(message);
                    break;
                case 'notification':
                    this.handleKandyNotification(message);
                    break;
                case 'call.incomingCall':
                    this.handleIncomingCall(message);
                    break;
                default:
                    log('debug', 'Unhandled Kandy message', { message });
            }
        } catch (error) {
            log('error', 'Error handling Kandy message', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
        }
    }

    handleKandyResponse(message) {
        if (message.method === 'call.getIceServers' && message.result) {
            this.iceServers = message.result.iceServers || [];
            log('info', 'Received ICE servers from Kandy', { 
                sessionId: this.sessionId,
                serverCount: this.iceServers.length 
            });
        }
    }

    handleKandyNotification(message) {
        // Handle various Kandy notifications
        log('info', 'Kandy notification', { 
            sessionId: this.sessionId, 
            notification: message.method 
        });
        
        this.sendToWebRTC({
            type: 'kandy-notification',
            notification: message
        });
    }

    async handleIncomingCall(message) {
        log('info', 'Incoming call from Kandy', { 
            sessionId: this.sessionId,
            from: message.params.from 
        });
        
        this.callId = message.params.callId;
        
        this.sendToWebRTC({
            type: 'incoming-call',
            from: message.params.from,
            callId: this.callId
        });
    }

    async createWebRTCPeerConnection() {
        const iceServers = this.iceServers.length > 0 
            ? this.iceServers 
            : BRIDGE_CONFIG.iceServers;

        this.peerConnection = new RTCPeerConnection({
            iceServers: iceServers,
            iceTransportPolicy: BRIDGE_CONFIG.peerConnection.iceTransportPolicy,
            bundlePolicy: BRIDGE_CONFIG.peerConnection.bundlePolicy,
            rtcpMuxPolicy: BRIDGE_CONFIG.peerConnection.rtcpMuxPolicy,
            iceCandidatePoolSize: BRIDGE_CONFIG.peerConnection.iceCandidatePoolSize,
            sdpSemantics: 'unified-plan'
        });

        log('info', 'WebRTC peer connection created', { 
            sessionId: this.sessionId,
            iceServerCount: iceServers.length 
        });

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                log('debug', 'ICE candidate generated', { 
                    sessionId: this.sessionId,
                    candidate: event.candidate.candidate 
                });
                this.sendToWebRTC({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // ICE gathering state
        this.peerConnection.onicegatheringstatechange = () => {
            log('debug', `ICE gathering state: ${this.peerConnection.iceGatheringState}`, {
                sessionId: this.sessionId
            });
        };

        // ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            log('info', `ICE connection state: ${this.peerConnection.iceConnectionState}`, {
                sessionId: this.sessionId
            });
        };

        // Connection state
        this.peerConnection.onconnectionstatechange = () => {
            log('info', `Connection state: ${this.peerConnection.connectionState}`, {
                sessionId: this.sessionId
            });
            
            if (this.peerConnection.connectionState === 'connected') {
                this.sendToWebRTC({ type: 'call-connected' });
            } else if (this.peerConnection.connectionState === 'failed') {
                this.sendToWebRTC({ type: 'call-failed' });
            }
        };

        // Handle incoming tracks
        this.peerConnection.ontrack = (event) => {
            log('info', 'Received track from WebRTC client', { 
                sessionId: this.sessionId,
                kind: event.track.kind 
            });
            
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
            }
        };

        return this.peerConnection;
    }

    async handleWebRTCOffer(offer) {
        try {
            log('info', 'Handling WebRTC offer', { sessionId: this.sessionId });
            
            await this.createWebRTCPeerConnection();
            
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            log('info', 'WebRTC answer created', { sessionId: this.sessionId });
            return answer;
            
        } catch (error) {
            log('error', 'Error handling WebRTC offer', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
            throw error;
        }
    }

    async initiateKandyCall(destination) {
        try {
            const formattedNumber = formatUAEPhoneNumber(destination);
            
            if (!validateUAEPhoneNumber(formattedNumber)) {
                throw new Error('Invalid UAE phone number');
            }

            log('info', `Initiating Kandy call to: ${formattedNumber}`, { 
                sessionId: this.sessionId 
            });

            // Get the local SDP from peer connection
            if (!this.peerConnection || !this.peerConnection.localDescription) {
                throw new Error('No local SDP available');
            }

            const sdp = this.peerConnection.localDescription.sdp;
            this.callId = this.generateCallId();

            // Send call request to Kandy
            const callMessage = {
                type: 'request',
                method: 'call.make',
                id: this.generateRequestId(),
                params: {
                    callId: this.callId,
                    destination: formattedNumber,
                    sdp: sdp,
                    mediaType: 'audio'
                }
            };

            if (this.kandyWs && this.kandyWs.readyState === WebSocket.OPEN) {
                this.kandyWs.send(JSON.stringify(callMessage));
                log('info', 'Call request sent to Kandy', { sessionId: this.sessionId });
                
                this.sendToWebRTC({ type: 'call-trying' });
            } else {
                throw new Error('Kandy WebSocket not connected');
            }

        } catch (error) {
            log('error', 'Error initiating Kandy call', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
            throw error;
        }
    }

    async answerKandyCall() {
        try {
            if (!this.callId) {
                throw new Error('No call ID available');
            }

            log('info', 'Answering Kandy call', { 
                sessionId: this.sessionId,
                callId: this.callId 
            });

            const sdp = this.peerConnection.localDescription.sdp;

            const answerMessage = {
                type: 'request',
                method: 'call.answer',
                id: this.generateRequestId(),
                params: {
                    callId: this.callId,
                    sdp: sdp
                }
            };

            if (this.kandyWs && this.kandyWs.readyState === WebSocket.OPEN) {
                this.kandyWs.send(JSON.stringify(answerMessage));
                log('info', 'Answer sent to Kandy', { sessionId: this.sessionId });
            }

        } catch (error) {
            log('error', 'Error answering call', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
            throw error;
        }
    }

    async hangup() {
        try {
            log('info', 'Hanging up call', { sessionId: this.sessionId });

            if (this.callId && this.kandyWs && this.kandyWs.readyState === WebSocket.OPEN) {
                const hangupMessage = {
                    type: 'request',
                    method: 'call.end',
                    id: this.generateRequestId(),
                    params: {
                        callId: this.callId
                    }
                };
                this.kandyWs.send(JSON.stringify(hangupMessage));
            }
            
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            
            this.sendToWebRTC({ type: 'call-ended' });
            
        } catch (error) {
            log('error', 'Error during hangup', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
        }
    }

    async cleanup() {
        try {
            await this.hangup();
            
            if (this.kandyWs) {
                this.kandyWs.close();
                this.kandyWs = null;
            }
            
            log('info', 'Session cleanup complete', { sessionId: this.sessionId });
            
        } catch (error) {
            log('error', 'Error during cleanup', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
        }
    }

    sendToWebRTC(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    generateCallId() {
        return `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}

// ===== WEBSOCKET CONNECTION HANDLER =====
wss.on('connection', (ws) => {
    const sessionId = Math.random().toString(36).substring(7);
    log('info', 'New WebSocket connection', { sessionId });
    
    const bridge = new KandyWebRTCBridge(ws, sessionId);
    sessions.set(sessionId, bridge);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            log('debug', 'Received message', { sessionId, type: data.type });

            switch (data.type) {
                case 'offer':
                    const answer = await bridge.handleWebRTCOffer(data.offer);
                    bridge.sendToWebRTC({
                        type: 'answer',
                        answer: answer
                    });
                    break;

                case 'ice-candidate':
                    if (bridge.peerConnection && data.candidate) {
                        await bridge.peerConnection.addIceCandidate(data.candidate);
                    }
                    break;

                case 'call':
                    await bridge.initiateKandyCall(data.destination);
                    break;

                case 'answer-incoming':
                    await bridge.answerKandyCall();
                    break;

                case 'hangup':
                    await bridge.hangup();
                    break;

                default:
                    log('warn', 'Unknown message type', { sessionId, type: data.type });
            }
        } catch (error) {
            log('error', 'Error handling message', { 
                sessionId, 
                error: error.message 
            });
            bridge.sendToWebRTC({
                type: 'error',
                message: error.message
            });
        }
    });

    ws.on('close', async () => {
        log('info', 'WebSocket closed', { sessionId });
        await bridge.cleanup();
        sessions.delete(sessionId);
    });

    ws.on('error', (error) => {
        log('error', 'WebSocket error', { sessionId, error: error.message });
    });
});

// ===== HTTP ENDPOINTS =====
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeSessions: sessions.size,
        config: {
            provider: 'Kandy.io Etisalat UAE',
            authenticated: kandyAuth.accessToken !== null
        }
    });
});

app.post('/authenticate', async (req, res) => {
    try {
        const { clientId, username, password } = req.body;
        
        const auth = await kandyAuth.authenticate({
            clientId,
            username,
            password
        });
        
        res.json({
            success: true,
            expiresIn: auth.expiresIn
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
});

// Serve static files
app.use(express.static('public'));

// ===== START SERVER =====
const PORT = BRIDGE_CONFIG.server.port || 8080;

// Authenticate on startup if credentials are configured
if (BRIDGE_CONFIG.kandy.credentials.username && 
    BRIDGE_CONFIG.kandy.credentials.password) {
    kandyAuth.authenticate(BRIDGE_CONFIG.kandy.credentials)
        .then(() => {
            startServer();
        })
        .catch((error) => {
            log('error', 'Initial authentication failed', { error: error.message });
            console.log('Server starting without authentication. Use /authenticate endpoint.');
            startServer();
        });
} else {
    console.log('No credentials configured. Use /authenticate endpoint.');
    startServer();
}

function startServer() {
    server.listen(PORT, BRIDGE_CONFIG.server.host, () => {
        log('info', 'Kandy WebRTC Bridge started', {
            port: PORT,
            secure: BRIDGE_CONFIG.server.secure
        });
        console.log(`\n=================================`);
        console.log(`Kandy WebRTC to SIP Bridge`);
        console.log(`Etisalat UAE Configuration`);
        console.log(`=================================`);
        console.log(`WebSocket: ${BRIDGE_CONFIG.server.secure ? 'wss' : 'ws'}://localhost:${PORT}`);
        console.log(`Health Check: http://localhost:${PORT}/health`);
        console.log(`Auth Endpoint: http://localhost:${PORT}/authenticate`);
        console.log(`=================================\n`);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    log('info', 'SIGTERM received, shutting down gracefully');
    
    for (const [sessionId, bridge] of sessions) {
        await bridge.cleanup();
    }
    
    server.close(() => {
        log('info', 'Server closed');
        process.exit(0);
    });
});
