const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const SIP = require('sip.js');
const { SERVER_CONFIG, getUAEConfig } = require('./config-uae');

const app = express();

// Create server (HTTP or HTTPS based on config)
let server;
if (SERVER_CONFIG.server.secure) {
    const serverOptions = {
        cert: fs.readFileSync(SERVER_CONFIG.server.sslCert),
        key: fs.readFileSync(SERVER_CONFIG.server.sslKey)
    };
    server = https.createServer(serverOptions, app);
} else {
    server = http.createServer(app);
}

const wss = new WebSocket.Server({ server });

// Store active sessions
const sessions = new Map();

// Logging function
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage, data);
    
    if (SERVER_CONFIG.logging.logToFile) {
        // In production, use a proper logging library like winston
        const logEntry = `${logMessage} ${JSON.stringify(data)}\n`;
        fs.appendFileSync(SERVER_CONFIG.logging.logFilePath, logEntry);
    }
}

class WebRTCToSIPBridge {
    constructor(websocket, sessionId) {
        this.ws = websocket;
        this.sessionId = sessionId;
        this.peerConnection = null;
        this.sipSession = null;
        this.sipUA = null;
        this.remoteStream = null;
        this.localStream = null;
        
        log('info', `New bridge session created`, { sessionId });
        this.initializeSIPUA();
    }

    initializeSIPUA() {
        try {
            // Get UAE-specific configuration
            const provider = SERVER_CONFIG.provider || 'ribbon_kandy';
            const uaeConfig = getUAEConfig(provider);
            
            log('info', `Initializing SIP UA with provider: ${provider}`, { sessionId: this.sessionId });

            // Build SIP URI
            const sipUri = `sip:${uaeConfig.sipUsername}@${uaeConfig.sipDomain}`;
            const uri = SIP.UserAgent.makeURI(sipUri);
            
            if (!uri) {
                throw new Error(`Failed to create SIP URI: ${sipUri}`);
            }

            // Determine transport URL based on transport type
            let transportUrl;
            if (uaeConfig.transport === 'WSS' || uaeConfig.transport === 'WS') {
                transportUrl = uaeConfig.websocketUrl || 
                              `${uaeConfig.transport === 'WSS' ? 'wss' : 'ws'}://${uaeConfig.sipServer}`;
            } else {
                transportUrl = `${uaeConfig.transport.toLowerCase()}://${uaeConfig.sipServer}:${uaeConfig.sipPort}`;
            }

            const transportOptions = {
                server: transportUrl,
                connectionTimeout: 10
            };

            const userAgentOptions = {
                authorizationUsername: uaeConfig.sipUsername,
                authorizationPassword: uaeConfig.sipPassword,
                transportOptions,
                uri,
                displayName: uaeConfig.sipUsername,
                userAgentString: SERVER_CONFIG.sip.userAgentString,
                logLevel: SERVER_CONFIG.logging.level === 'debug' ? 'debug' : 'warn',
                sessionDescriptionHandlerFactoryOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                    peerConnectionConfiguration: {
                        iceServers: SERVER_CONFIG.webrtc.iceServers,
                        iceTransportPolicy: SERVER_CONFIG.webrtc.iceTransportPolicy,
                        bundlePolicy: SERVER_CONFIG.webrtc.bundlePolicy,
                        rtcpMuxPolicy: SERVER_CONFIG.webrtc.rtcpMuxPolicy
                    }
                },
                delegate: {
                    onInvite: (invitation) => {
                        log('info', 'Incoming SIP call', { 
                            sessionId: this.sessionId,
                            from: invitation.remoteIdentity.uri.user 
                        });
                        this.handleIncomingSIPCall(invitation);
                    },
                    onConnect: () => {
                        log('info', 'SIP UA connected', { sessionId: this.sessionId });
                    },
                    onDisconnect: (error) => {
                        log('warn', 'SIP UA disconnected', { sessionId: this.sessionId, error });
                    }
                }
            };

            this.sipUA = new SIP.UserAgent(userAgentOptions);
            
            // Start the UA
            this.sipUA.start().then(() => {
                log('info', 'SIP UA started successfully', { sessionId: this.sessionId });
                
                // Register if configured
                if (SERVER_CONFIG.sip.autostart) {
                    this.registerSIP();
                }
            }).catch((error) => {
                log('error', 'Failed to start SIP UA', { sessionId: this.sessionId, error: error.message });
                this.sendToWebRTC({
                    type: 'error',
                    message: `SIP UA start failed: ${error.message}`
                });
            });

        } catch (error) {
            log('error', 'Error initializing SIP UA', { sessionId: this.sessionId, error: error.message });
            this.sendToWebRTC({
                type: 'error',
                message: `SIP initialization failed: ${error.message}`
            });
        }
    }

    async registerSIP() {
        try {
            const registerer = new SIP.Registerer(this.sipUA, {
                expires: SERVER_CONFIG.sip.registerExpires
            });

            registerer.stateChange.addListener((state) => {
                log('info', `SIP registration state: ${state}`, { sessionId: this.sessionId });
                this.sendToWebRTC({
                    type: 'registration-status',
                    status: state
                });
            });

            await registerer.register();
            log('info', 'SIP registration successful', { sessionId: this.sessionId });
            
        } catch (error) {
            log('error', 'SIP registration failed', { sessionId: this.sessionId, error: error.message });
        }
    }

    async createWebRTCPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: SERVER_CONFIG.webrtc.iceServers,
            iceTransportPolicy: SERVER_CONFIG.webrtc.iceTransportPolicy,
            bundlePolicy: SERVER_CONFIG.webrtc.bundlePolicy,
            rtcpMuxPolicy: SERVER_CONFIG.webrtc.rtcpMuxPolicy,
            iceCandidatePoolSize: SERVER_CONFIG.webrtc.iceCandidatePoolSize
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

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            log('info', `ICE connection state: ${this.peerConnection.iceConnectionState}`, {
                sessionId: this.sessionId
            });
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            log('info', `WebRTC connection state: ${this.peerConnection.connectionState}`, {
                sessionId: this.sessionId
            });
            
            if (this.peerConnection.connectionState === 'connected') {
                this.sendToWebRTC({ type: 'webrtc-connected' });
            }
        };

        // Handle incoming tracks (audio from WebRTC client)
        this.peerConnection.ontrack = (event) => {
            log('info', 'Received track from WebRTC client', { 
                sessionId: this.sessionId,
                kind: event.track.kind 
            });
            
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                if (this.sipSession) {
                    this.forwardAudioToSIP(event.streams[0]);
                }
            }
        };

        return this.peerConnection;
    }

    async handleWebRTCOffer(offer) {
        try {
            log('info', 'Handling WebRTC offer', { sessionId: this.sessionId });
            
            await this.createWebRTCPeerConnection();
            
            // Set remote description (offer from WebRTC client)
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            // Create answer
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

    async initiateSIPCall(destination) {
        try {
            // Format destination number for UAE
            const formattedNumber = this.formatUAENumber(destination);
            log('info', `Initiating SIP call to: ${formattedNumber}`, { sessionId: this.sessionId });

            const uaeConfig = getUAEConfig(SERVER_CONFIG.provider);
            const targetUri = `sip:${formattedNumber}@${uaeConfig.sipDomain}`;
            const target = SIP.UserAgent.makeURI(targetUri);
            
            if (!target) {
                throw new Error(`Invalid target URI: ${targetUri}`);
            }

            const inviter = new SIP.Inviter(this.sipUA, target, {
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                }
            });

            this.sipSession = inviter;

            // Handle SIP session state changes
            inviter.stateChange.addListener((state) => {
                log('info', `SIP session state: ${state}`, { sessionId: this.sessionId });
                this.sendToWebRTC({
                    type: 'sip-status',
                    status: state
                });
            });

            // Send the INVITE
            await inviter.invite({
                requestDelegate: {
                    onAccept: (response) => {
                        log('info', 'SIP call accepted', { sessionId: this.sessionId });
                        this.handleSIPCallAccepted();
                    },
                    onReject: (response) => {
                        log('warn', 'SIP call rejected', { 
                            sessionId: this.sessionId,
                            reason: response.message.reasonPhrase 
                        });
                        this.sendToWebRTC({
                            type: 'call-rejected',
                            reason: response.message.reasonPhrase
                        });
                    },
                    onTrying: () => {
                        log('info', 'SIP call trying', { sessionId: this.sessionId });
                        this.sendToWebRTC({ type: 'call-trying' });
                    },
                    onProgress: () => {
                        log('info', 'SIP call ringing', { sessionId: this.sessionId });
                        this.sendToWebRTC({ type: 'call-ringing' });
                    }
                }
            });

            return inviter;
            
        } catch (error) {
            log('error', 'Error initiating SIP call', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
            throw error;
        }
    }

    formatUAENumber(number) {
        // Remove any non-digit characters
        let cleaned = number.replace(/\D/g, '');
        
        // Add UAE country code if not present
        if (cleaned.startsWith('971')) {
            return cleaned;
        } else if (cleaned.startsWith('00971')) {
            return cleaned.substring(2);
        } else if (cleaned.startsWith('+971')) {
            return cleaned.substring(1);
        } else if (cleaned.startsWith('0')) {
            return '971' + cleaned.substring(1);
        } else if (cleaned.length === 9) {
            return '971' + cleaned;
        }
        
        return cleaned;
    }

    handleSIPCallAccepted() {
        log('info', 'SIP call connected, bridging media', { sessionId: this.sessionId });
        this.bridgeMedia();
        
        this.sendToWebRTC({
            type: 'call-connected'
        });
    }

    handleIncomingSIPCall(invitation) {
        this.sipSession = invitation;

        const from = invitation.remoteIdentity.uri.user;
        log('info', `Incoming SIP call from: ${from}`, { sessionId: this.sessionId });

        // Notify WebRTC client about incoming call
        this.sendToWebRTC({
            type: 'incoming-call',
            from: from,
            displayName: invitation.remoteIdentity.displayName || from
        });

        // Setup session state handlers
        invitation.stateChange.addListener((state) => {
            log('info', `Incoming SIP session state: ${state}`, { sessionId: this.sessionId });
        });

        // Accept the call
        invitation.accept({
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: false
                }
            }
        }).then(() => {
            log('info', 'Incoming SIP call accepted', { sessionId: this.sessionId });
            this.bridgeMedia();
        }).catch((error) => {
            log('error', 'Error accepting incoming call', { 
                sessionId: this.sessionId, 
                error: error.message 
            });
        });
    }

    bridgeMedia() {
        // Media bridging implementation
        // In a production environment, you would need to implement proper RTP forwarding
        // This typically requires a media server like:
        // - Janus Gateway
        // - Kurento
        // - FreeSWITCH
        // - Asterisk with WebRTC support
        
        log('info', 'Media bridging active', { sessionId: this.sessionId });
        
        // Placeholder for media bridging logic
        // The actual implementation depends on your media server setup
    }

    forwardAudioToSIP(stream) {
        log('info', 'Forwarding audio from WebRTC to SIP', { sessionId: this.sessionId });
        // Implementation depends on media server
    }

    async hangup() {
        try {
            log('info', 'Hanging up call', { sessionId: this.sessionId });

            if (this.sipSession) {
                if (this.sipSession.state === SIP.SessionState.Established) {
                    await this.sipSession.bye();
                } else {
                    this.sipSession.dispose();
                }
                this.sipSession = null;
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
            
            if (this.sipUA) {
                await this.sipUA.stop();
                this.sipUA = null;
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
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    const sessionId = Math.random().toString(36).substring(7);
    log('info', 'New WebSocket connection', { sessionId });
    
    const bridge = new WebRTCToSIPBridge(ws, sessionId);
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
                    await bridge.initiateSIPCall(data.destination);
                    break;

                case 'hangup':
                    await bridge.hangup();
                    break;

                case 'answer-incoming':
                    // Client confirmed to answer incoming call
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

// Serve static files
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeSessions: sessions.size,
        config: {
            provider: SERVER_CONFIG.provider,
            region: 'UAE'
        }
    });
});

// Start server
const PORT = SERVER_CONFIG.server.port || 8080;
server.listen(PORT, SERVER_CONFIG.server.host, () => {
    log('info', `WebRTC to SIP Bridge started`, {
        port: PORT,
        secure: SERVER_CONFIG.server.secure,
        provider: SERVER_CONFIG.provider
    });
    console.log(`\n=================================`);
    console.log(`WebRTC to SIP Bridge (UAE)`);
    console.log(`=================================`);
    console.log(`Provider: ${SERVER_CONFIG.provider}`);
    console.log(`WebSocket: ${SERVER_CONFIG.server.secure ? 'wss' : 'ws'}://localhost:${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`=================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    log('info', 'SIGTERM received, shutting down gracefully');
    
    // Close all active sessions
    for (const [sessionId, bridge] of sessions) {
        await bridge.cleanup();
    }
    
    server.close(() => {
        log('info', 'Server closed');
        process.exit(0);
    });
});
