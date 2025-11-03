// WebRTC Client for connecting to the SIP bridge
class WebRTCSIPClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        // Callbacks
        this.onCallConnected = null;
        this.onCallDisconnected = null;
        this.onIncomingCall = null;
        this.onError = null;
        this.onCallRinging = null;
        this.onCallTrying = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.onopen = () => {
                console.log('Connected to bridge server');
                resolve();
            };

            this.ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);
                    await this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error handling server message:', error);
                    if (this.onError) this.onError(error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
                if (this.onError) this.onError(error);
            };

            this.ws.onclose = () => {
                console.log('Disconnected from bridge server');
                if (this.onCallDisconnected) this.onCallDisconnected();
            };
        });
    }

    async handleServerMessage(message) {
        console.log('Received from server:', message.type);

        switch (message.type) {
            case 'answer':
                await this.handleAnswer(message.answer);
                break;

            case 'ice-candidate':
                await this.handleIceCandidate(message.candidate);
                break;

            case 'call-connected':
                console.log('Call connected');
                if (this.onCallConnected) this.onCallConnected();
                break;

            case 'call-rejected':
                console.log('Call rejected:', message.reason);
                if (this.onError) this.onError(new Error(`Call rejected: ${message.reason}`));
                break;

            case 'call-ringing':
                console.log('Call ringing');
                if (this.onCallRinging) this.onCallRinging();
                break;

            case 'call-trying':
                console.log('Call trying');
                if (this.onCallTrying) this.onCallTrying();
                break;

            case 'incoming-call':
                console.log('Incoming call from:', message.from);
                if (this.onIncomingCall) this.onIncomingCall(message.from, message.displayName);
                break;

            case 'call-ended':
                console.log('Call ended');
                this.cleanup();
                if (this.onCallDisconnected) this.onCallDisconnected();
                break;

            case 'sip-status':
                console.log('SIP status:', message.status);
                break;

            case 'webrtc-connected':
                console.log('WebRTC connection established');
                break;

            case 'registration-status':
                console.log('SIP registration status:', message.status);
                break;

            case 'error':
                console.error('Server error:', message.message);
                if (this.onError) this.onError(new Error(message.message));
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    async initializePeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.config);

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate
                }));
            }
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            
            if (this.peerConnection.connectionState === 'disconnected' ||
                this.peerConnection.connectionState === 'failed' ||
                this.peerConnection.connectionState === 'closed') {
                if (this.onCallDisconnected) this.onCallDisconnected();
            }
        };

        // Handle incoming remote tracks
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
            }
        };

        // Add local audio track if available
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
    }

    async handleAnswer(answer) {
        if (!this.peerConnection) {
            console.error('No peer connection available');
            return;
        }

        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
        );
        console.log('Remote description set successfully');
    }

    async handleIceCandidate(candidate) {
        if (!this.peerConnection) {
            console.error('No peer connection available');
            return;
        }

        await this.peerConnection.addIceCandidate(candidate);
        console.log('ICE candidate added');
    }

    async getLocalMediaStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                },
                video: false
            });
            console.log('Local media stream obtained');
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    async makeCall(destination) {
        try {
            console.log('Making call to:', destination);

            // Get local media
            await this.getLocalMediaStream();

            // Initialize peer connection
            await this.initializePeerConnection();

            // Create offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            // Set local description
            await this.peerConnection.setLocalDescription(offer);

            // Send offer to server
            this.ws.send(JSON.stringify({
                type: 'offer',
                offer: offer
            }));

            // Send call command with destination
            this.ws.send(JSON.stringify({
                type: 'call',
                destination: destination
            }));

            console.log('Call initiated');
        } catch (error) {
            console.error('Error making call:', error);
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    answerIncomingCall() {
        // Answer logic for incoming calls
        this.ws.send(JSON.stringify({
            type: 'answer-incoming'
        }));
    }

    hangup() {
        console.log('Hanging up call');

        // Send hangup to server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'hangup'
            }));
        }

        this.cleanup();
    }

    cleanup() {
        // Clean up peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Stop local media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Clear remote stream
        this.remoteStream = null;
    }

    disconnect() {
        this.hangup();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    getRemoteAudioElement() {
        // Create and return audio element for remote stream
        if (!this.remoteStream) return null;

        const audio = document.createElement('audio');
        audio.srcObject = this.remoteStream;
        audio.autoplay = true;
        return audio;
    }

    attachRemoteAudio(audioElement) {
        if (this.remoteStream && audioElement) {
            audioElement.srcObject = this.remoteStream;
        }
    }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCSIPClient;
}
