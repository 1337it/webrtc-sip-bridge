const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');
const SIP = require('sip.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const CONFIG = {
    sipServer: 'sip.yourprovider.com', // Your SIP trunk provider
    sipUsername: 'your_username',
    sipPassword: 'your_password',
    sipDomain: 'yourprovider.com',
    stunServers: ['stun:stun.l.google.com:19302'],
    port: 8080
};

// Store active sessions
const sessions = new Map();

// ICE server configuration for WebRTC
const iceServers = {
    iceServers: [
        { urls: CONFIG.stunServers },
        // Add TURN servers if needed
        // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
    ]
};

class WebRTCToSIPBridge {
    constructor(websocket, sessionId) {
        this.ws = websocket;
        this.sessionId = sessionId;
        this.peerConnection = null;
        this.sipSession = null;
        this.sipUA = null;
        
        this.initializeSIPUA();
    }

    initializeSIPUA() {
        // SIP.js User Agent configuration
        const uri = SIP.UserAgent.makeURI(`sip:${CONFIG.sipUsername}@${CONFIG.sipDomain}`);
        
        const transportOptions = {
            server: `wss://${CONFIG.sipServer}`,
            // For non-secure: `ws://${CONFIG.sipServer}`
        };

        const userAgentOptions = {
            authorizationUsername: CONFIG.sipUsername,
            authorizationPassword: CONFIG.sipPassword,
            transportOptions,
            uri,
            logLevel: 'warn',
            delegate: {
                onInvite: (invitation) => {
                    this.handleIncomingSIPCall(invitation);
                }
            }
        };

        this.sipUA = new SIP.UserAgent(userAgentOptions);
        this.sipUA.start();
        
        console.log(`SIP UA initialized for session ${this.sessionId}`);
    }

    async createWebRTCPeerConnection() {
        this.peerConnection = new RTCPeerConnection(iceServers);

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendToWebRTC({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log(`WebRTC connection state: ${this.peerConnection.connectionState}`);
        };

        // Handle incoming tracks (audio from WebRTC client)
        this.peerConnection.ontrack = (event) => {
            console.log('Received track from WebRTC client:', event.track.kind);
            if (this.sipSession) {
                // Forward audio to SIP
                this.forwardAudioToSIP(event.streams[0]);
            }
        };

        return this.peerConnection;
    }

    async handleWebRTCOffer(offer) {
        console.log(`Handling WebRTC offer for session ${this.sessionId}`);
        
        await this.createWebRTCPeerConnection();
        
        // Set remote description (offer from WebRTC client)
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer)
        );

        // Create answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        return answer;
    }

    async initiateSIPCall(destination) {
        const target = SIP.UserAgent.makeURI(`sip:${destination}@${CONFIG.sipDomain}`);
        
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
            console.log(`SIP session state: ${state}`);
            this.sendToWebRTC({
                type: 'sip-status',
                status: state
            });
        });

        // Send the INVITE
        await inviter.invite({
            requestDelegate: {
                onAccept: (response) => {
                    console.log('SIP call accepted');
                    this.handleSIPCallAccepted();
                },
                onReject: (response) => {
                    console.log('SIP call rejected');
                    this.sendToWebRTC({
                        type: 'call-rejected',
                        reason: response.message.reasonPhrase
                    });
                }
            }
        });

        return inviter;
    }

    handleSIPCallAccepted() {
        // Get remote SDP from SIP session
        if (this.sipSession && this.sipSession.sessionDescriptionHandler) {
            const remoteSdp = this.sipSession.sessionDescriptionHandler.remoteDescription;
            
            // Bridge audio between WebRTC and SIP
            this.bridgeMedia();
            
            this.sendToWebRTC({
                type: 'call-connected'
            });
        }
    }

    handleIncomingSIPCall(invitation) {
        console.log('Incoming SIP call');
        this.sipSession = invitation;

        // Notify WebRTC client about incoming call
        this.sendToWebRTC({
            type: 'incoming-call',
            from: invitation.remoteIdentity.uri.user
        });

        // Auto-accept for now (you can add logic to wait for WebRTC client confirmation)
        invitation.accept({
            sessionDescriptionHandlerOptions: {
                constraints: {
                    audio: true,
                    video: false
                }
            }
        });

        this.bridgeMedia();
    }

    bridgeMedia() {
        // This is where you'd implement actual media bridging
        // In production, you'd use a media server like Janus or FreeSWITCH
        // Or implement RTP forwarding between WebRTC and SIP
        console.log('Bridging media between WebRTC and SIP');
        
        // For a complete solution, you'd need to:
        // 1. Extract RTP packets from WebRTC
        // 2. Forward them to SIP endpoint
        // 3. Extract RTP packets from SIP
        // 4. Forward them to WebRTC
    }

    forwardAudioToSIP(stream) {
        // Implementation for forwarding audio to SIP
        console.log('Forwarding audio from WebRTC to SIP');
    }

    hangup() {
        if (this.sipSession) {
            this.sipSession.dispose();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        if (this.sipUA) {
            this.sipUA.stop();
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
    console.log(`New WebSocket connection: ${sessionId}`);
    
    const bridge = new WebRTCToSIPBridge(ws, sessionId);
    sessions.set(sessionId, bridge);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data.type);

            switch (data.type) {
                case 'offer':
                    // WebRTC offer from client
                    const answer = await bridge.handleWebRTCOffer(data.offer);
                    bridge.sendToWebRTC({
                        type: 'answer',
                        answer: answer
                    });
                    break;

                case 'ice-candidate':
                    // ICE candidate from WebRTC client
                    if (bridge.peerConnection) {
                        await bridge.peerConnection.addIceCandidate(data.candidate);
                    }
                    break;

                case 'call':
                    // Initiate SIP call to destination
                    await bridge.initiateSIPCall(data.destination);
                    break;

                case 'hangup':
                    bridge.hangup();
                    break;

                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            bridge.sendToWebRTC({
                type: 'error',
                message: error.message
            });
        }
    });

    ws.on('close', () => {
        console.log(`WebSocket closed: ${sessionId}`);
        bridge.hangup();
        sessions.delete(sessionId);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Serve static files
app.use(express.static('public'));

// Start server
server.listen(CONFIG.port, () => {
    console.log(`WebRTC to SIP Bridge running on port ${CONFIG.port}`);
    console.log(`WebSocket endpoint: ws://localhost:${CONFIG.port}`);
});
