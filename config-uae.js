// UAE Configuration for WebRTC to SIP Bridge
// This file contains UAE-specific settings for SIP trunk providers

const UAE_CONFIG = {
    // ===== ETISALAT UAE SIP TRUNK CONFIGURATION =====
    etisalat: {
        sipServer: 'sip.etisalat.ae',
        sipServerIP: '213.42.20.0', // Example IP - verify with Etisalat
        sipDomain: 'etisalat.ae',
        sipUsername: 'YOUR_ETISALAT_USERNAME',
        sipPassword: 'YOUR_ETISALAT_PASSWORD',
        sipPort: 5060,
        sipSecurePort: 5061,
        transport: 'UDP', // or 'TCP', 'TLS', 'WSS'
        codec: ['PCMU', 'PCMA', 'G729'],
        registrar: 'sip.etisalat.ae',
        proxy: 'sip.etisalat.ae',
        outboundProxy: 'sip.etisalat.ae:5060',
        realm: 'etisalat.ae'
    },

    // ===== DU (EMIRATES INTEGRATED TELECOMMUNICATIONS) =====
    du: {
        sipServer: 'sip.du.ae',
        sipServerIP: '213.162.69.0', // Example IP - verify with du
        sipDomain: 'du.ae',
        sipUsername: 'YOUR_DU_USERNAME',
        sipPassword: 'YOUR_DU_PASSWORD',
        sipPort: 5060,
        sipSecurePort: 5061,
        transport: 'UDP',
        codec: ['PCMU', 'PCMA', 'G729', 'G722'],
        registrar: 'sip.du.ae',
        proxy: 'sip.du.ae',
        outboundProxy: 'sip.du.ae:5060',
        realm: 'du.ae'
    },

    // ===== RIBBON COMMUNICATIONS (KANDY) FOR UAE =====
    ribbon_kandy: {
        sipServer: 'sbc-uae.kandy.io', // UAE-specific SBC
        sipDomain: 'kandy.io',
        sipUsername: 'YOUR_KANDY_USERNAME',
        sipPassword: 'YOUR_KANDY_PASSWORD',
        apiKey: 'YOUR_KANDY_API_KEY',
        apiSecret: 'YOUR_KANDY_API_SECRET',
        sipPort: 5060,
        sipSecurePort: 5061,
        transport: 'WSS', // Kandy typically uses WebSocket Secure
        codec: ['opus', 'PCMU', 'PCMA'],
        websocketUrl: 'wss://webrtc-uae.kandy.io/ws',
        restApiUrl: 'https://api-uae.kandy.io/v1',
        region: 'uae',
        stunServers: [
            'stun:turn-uae-1.kandy.io:3478',
            'stun:turn-uae-2.kandy.io:3478'
        ],
        turnServers: [
            {
                urls: 'turn:turn-uae-1.kandy.io:3478',
                username: 'YOUR_TURN_USERNAME',
                credential: 'YOUR_TURN_PASSWORD'
            }
        ]
    },

    // ===== VOIP GATE UAE =====
    voipgate: {
        sipServer: 'sip.voipgate.ae',
        sipDomain: 'voipgate.ae',
        sipUsername: 'YOUR_VOIPGATE_USERNAME',
        sipPassword: 'YOUR_VOIPGATE_PASSWORD',
        sipPort: 5060,
        transport: 'UDP',
        codec: ['PCMU', 'PCMA', 'G729'],
        registrar: 'sip.voipgate.ae',
        proxy: 'sip.voipgate.ae'
    },

    // ===== EMIRATES VOICE (GENERIC UAE PROVIDER) =====
    emirates_voice: {
        sipServer: 'sip.emiratesvoice.ae',
        sipDomain: 'emiratesvoice.ae',
        sipUsername: 'YOUR_USERNAME',
        sipPassword: 'YOUR_PASSWORD',
        sipPort: 5060,
        transport: 'UDP',
        codec: ['PCMU', 'PCMA'],
        registrar: 'sip.emiratesvoice.ae'
    },

    // ===== REGIONAL SETTINGS FOR UAE =====
    regional: {
        timezone: 'Asia/Dubai',
        countryCode: '+971',
        emergencyNumber: '999', // Police
        emergencyAmbulance: '998',
        emergencyFire: '997',
        locale: 'ar-AE', // Arabic (UAE) or 'en-AE' for English
        
        // UAE Phone Number Format
        phoneFormat: {
            mobile: /^(\+971|00971|971)?5[0-9]{8}$/, // Mobile: +971 5X XXX XXXX
            landline: /^(\+971|00971|971)?[2-4,6-7,9][0-9]{7}$/, // Landline
            tollFree: /^(\+971|00971|971)?800[0-9]{5}$/ // Toll-free
        },

        // Popular Emirates and their area codes
        areaCodes: {
            'Abu Dhabi': '2',
            'Dubai': '4',
            'Sharjah': '6',
            'Ajman': '6',
            'Umm Al Quwain': '6',
            'Ras Al Khaimah': '7',
            'Fujairah': '9',
            'Al Ain': '3'
        }
    },

    // ===== STUN/TURN SERVERS IN UAE REGION =====
    iceServers: {
        stunServers: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun.voip.blackberry.com:3478',
            // UAE regional STUN servers (if available)
            'stun:stun.uae.example.com:3478'
        ],
        
        // TURN servers for better connectivity in UAE
        turnServers: [
            {
                urls: 'turn:turn.uae.example.com:3478',
                username: 'uaeuser',
                credential: 'uaepass'
            },
            {
                urls: 'turns:turn.uae.example.com:5349', // Secure TURN
                username: 'uaeuser',
                credential: 'uaepass'
            }
        ]
    },

    // ===== NETWORK & FIREWALL SETTINGS FOR UAE =====
    network: {
        // Common ports that need to be open
        requiredPorts: {
            sip: [5060, 5061], // SIP and Secure SIP
            rtp: '10000-20000', // RTP media range
            webrtc: [443, 8443], // HTTPS for WebRTC
            websocket: [8080, 8443],
            stun: [3478, 3479],
            turn: [3478, 3479, 5349]
        },

        // UAE ISP considerations
        ispNotes: {
            etisalat: 'May require VPN for certain VoIP services',
            du: 'Check for VoIP restrictions on residential connections',
            firewall: 'UAE has strict internet regulations - ensure compliance'
        },

        // Recommended QoS settings for UAE networks
        qos: {
            audioCodec: 'PCMA', // Preferred in MENA region
            videoBitrate: 512, // kbps - conservative for UAE networks
            audioBitrate: 64, // kbps
            packetization: 20, // ms
            dtx: true, // Discontinuous transmission
            vad: true // Voice activity detection
        }
    },

    // ===== COMPLIANCE & REGULATORY =====
    compliance: {
        // UAE Telecommunications Regulatory Authority
        regulator: 'TRA (Telecommunications and Digital Government Regulatory Authority)',
        website: 'https://www.tdra.gov.ae',
        
        notes: [
            'VoIP services must be licensed in UAE',
            'Call recording may require user consent',
            'Emergency services integration mandatory',
            'Data localization requirements may apply',
            'Encryption standards must comply with UAE laws'
        ],

        dataRetention: {
            callRecords: '2 years', // Typical requirement
            billingData: '5 years'
        }
    }
};

// ===== EXAMPLE CONFIGURATION SELECTOR =====
function getUAEConfig(provider = 'ribbon_kandy') {
    const config = UAE_CONFIG[provider];
    
    if (!config) {
        throw new Error(`Provider ${provider} not found. Available: ${Object.keys(UAE_CONFIG).join(', ')}`);
    }

    return {
        ...config,
        iceServers: UAE_CONFIG.iceServers,
        regional: UAE_CONFIG.regional,
        network: UAE_CONFIG.network
    };
}

// ===== COMPLETE SERVER CONFIGURATION FOR UAE =====
const SERVER_CONFIG = {
    // Select your provider
    provider: 'ribbon_kandy', // Change to 'etisalat', 'du', etc.
    
    // Get provider-specific config
    ...getUAEConfig('ribbon_kandy'),
    
    // Server settings
    server: {
        host: '0.0.0.0',
        port: 8080,
        secure: true, // Use HTTPS
        sslCert: '/path/to/ssl/cert.pem',
        sslKey: '/path/to/ssl/key.pem'
    },

    // WebRTC settings optimized for UAE
    webrtc: {
        iceServers: UAE_CONFIG.iceServers.stunServers.map(url => ({ urls: url }))
            .concat(UAE_CONFIG.iceServers.turnServers),
        
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all', // or 'relay' for TURN-only
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        
        // Codec preferences for UAE
        audioCodecs: ['opus', 'PCMU', 'PCMA', 'G722', 'G729'],
        videoCodecs: ['VP8', 'VP9', 'H264']
    },

    // SIP settings
    sip: {
        registerExpires: 600, // seconds
        sessionTimers: true,
        sessionTimersExpires: 1800,
        keepAlive: true,
        keepAliveInterval: 30,
        traceSip: true, // Enable for debugging
        autostart: true,
        
        // User agent string
        userAgentString: 'WebRTC-SIP-Bridge-UAE/1.0'
    },

    // Logging for UAE operations
    logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        logToFile: true,
        logFilePath: '/var/log/webrtc-sip-bridge-uae.log',
        logRotation: {
            maxSize: '10m',
            maxFiles: 5
        }
    }
};

// Export configurations
module.exports = {
    UAE_CONFIG,
    SERVER_CONFIG,
    getUAEConfig
};

// ===== USAGE EXAMPLE =====
// const config = require('./config-uae');
// const myConfig = config.getUAEConfig('ribbon_kandy');
// console.log('Using configuration:', myConfig);
