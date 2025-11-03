// Correct Kandy.io Authentication Implementation for Etisalat UAE
// Based on Ribbon WebRTC SDK pattern

const WebSocket = require('ws');
const fetch = require('node-fetch');

class KandyClient {
    constructor(config) {
        this.config = config;
        this.credentials = null;
        this.ws = null;
        this.subscriptionId = null;
        this.isSubscribed = false;
    }

    // Step 1: Set Credentials
    setCredentials(username, password) {
        this.credentials = { username, password };
        console.log('Credentials set for:', username);
    }

    // Step 2: Subscribe to services
    async subscribe(services = ['call', 'IM', 'Presence']) {
        if (!this.credentials) {
            throw new Error('Credentials not set. Call setCredentials() first.');
        }

        try {
            console.log('Subscribing to services:', services);

            // Call subscription endpoint
            const response = await fetch(`${this.config.subscriptionUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: this.credentials.username,
                    password: this.credentials.password,
                    service: services
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Subscription failed: ${response.status} - ${error}`);
            }

            const data = await response.json();
            console.log('Subscription successful:', data);

            this.subscriptionId = data.subscriptionId || data.access_token;
            this.isSubscribed = true;

            // Step 3: Connect WebSocket with subscription token
            await this.connectWebSocket();

            return data;

        } catch (error) {
            console.error('Subscribe error:', error.message);
            throw error;
        }
    }

    // Step 3: Connect WebSocket
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const wsUrl = `${this.config.websocketUrl}?subscriptionId=${this.subscriptionId}`;
            console.log('Connecting to WebSocket...');

            this.ws = new WebSocket(wsUrl);

            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000);

            this.ws.on('open', () => {
                clearTimeout(timeout);
                console.log('WebSocket connected');
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('error', (error) => {
                clearTimeout(timeout);
                console.error('WebSocket error:', error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('WebSocket closed');
                this.isSubscribed = false;
            });
        });
    }

    // Handle WebSocket messages
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message.type || message.method);

            // Handle different message types
            switch (message.type) {
                case 'notification':
                    this.handleNotification(message);
                    break;
                case 'response':
                    this.handleResponse(message);
                    break;
                default:
                    console.log('Unknown message:', message);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    handleNotification(message) {
        console.log('Notification:', message.method);
    }

    handleResponse(message) {
        console.log('Response:', message.method);
    }

    // Make a call
    makeCall(destination) {
        if (!this.isSubscribed || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not subscribed or WebSocket not connected');
        }

        const callId = 'call_' + Date.now();
        
        const callRequest = {
            type: 'request',
            method: 'call.make',
            id: 'req_' + Date.now(),
            params: {
                callId: callId,
                destination: destination,
                mediaType: 'audio'
            }
        };

        console.log('Making call to:', destination);
        this.ws.send(JSON.stringify(callRequest));

        return callId;
    }

    // End a call
    endCall(callId) {
        const endRequest = {
            type: 'request',
            method: 'call.end',
            id: 'req_' + Date.now(),
            params: {
                callId: callId
            }
        };

        this.ws.send(JSON.stringify(endRequest));
    }

    // Unsubscribe
    async unsubscribe() {
        if (this.ws) {
            this.ws.close();
        }
        this.isSubscribed = false;
        this.subscriptionId = null;
        console.log('Unsubscribed');
    }
}

// Configuration for Etisalat UAE
const ETISALAT_CONFIG = {
    subscriptionUrl: 'https://ct-webrtc.etisalat.ae/v2.0/subscription',
    websocketUrl: 'wss://ct-webrtc.etisalat.ae',
    iceServers: [
        { urls: 'turns:ct-turn1.etisalat.ae:443?transport=tcp' },
        { urls: 'turns:ct-turn2.etisalat.ae:443?transport=tcp' },
        { urls: 'stun:ct-turn1.etisalat.ae:3478?transport=udp' },
        { urls: 'stun:ct-turn2.etisalat.ae:3478?transport=udp' }
    ]
};

// Export
module.exports = { KandyClient, ETISALAT_CONFIG };

// ===== USAGE EXAMPLE =====
/*
const { KandyClient, ETISALAT_CONFIG } = require('./kandy-client');

// Create client
const client = new KandyClient(ETISALAT_CONFIG);

// Set credentials
client.setCredentials('your_username', 'your_password');

// Subscribe to services
await client.subscribe(['call', 'IM', 'Presence']);

// Make a call
const callId = client.makeCall('971501234567');

// End call
client.endCall(callId);

// Unsubscribe when done
await client.unsubscribe();
*/
