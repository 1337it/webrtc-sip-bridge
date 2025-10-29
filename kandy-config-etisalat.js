// Kandy.io Configuration for Etisalat UAE
// Based on actual CloudTalk UCS configuration

const KANDY_ETISALAT_UAE_CONFIG = {
    // ===== AUTHENTICATION CONFIGURATION =====
    authentication: {
        subscription: {
            protocol: 'https',
            server: 'kbs-uae-cim-auth.kandy.io',
            port: '443',
            version: 'v2.0',
            expires: 3600,
            service: ['call', 'IM', 'Presence', 'MWI']
        },
        websocket: {
            protocol: 'wss',
            server: 'kbs-uae-cim-auth.kandy.io',
            port: '443'
        }
    },

    // ===== LOGGING CONFIGURATION =====
    logs: {
        logLevel: 'debug',
        logActions: {
            actionOnly: true,
            collapsed: false,
            diff: false
        },
        enableFcsLogs: true
    },

    // ===== CONNECTIVITY CONFIGURATION =====
    connectivity: {
        method: {
            type: 'keepAlive'
        },
        pingInterval: 120000, // 2 minutes
        reconnectLimit: 3,
        reconnectDelay: 3000, // 3 seconds
        reconnectTimeMultiplier: 1,
        reconnectTimeLimit: 640000, // ~10 minutes
        autoReconnect: true,
        maxMissedPings: 3,
        checkConnectivity: true,
        webSocketOAuthMode: 'query'
    },

    // ===== CALL CONFIGURATION =====
    call: {
        serverTurnCredentials: true,
        defaultPeerConfig: {
            sdpSemantics: 'unified-plan',
            iceServers: [
                {
                    urls: 'turns:ct-turn1.etisalat.ae:443?transport=tcp',
                    credential: '' // Will be provided by server
                },
                {
                    urls: 'turns:ct-turn2.etisalat.ae:443?transport=tcp',
                    credential: '' // Will be provided by server
                },
                {
                    urls: 'stun:ct-turn1.etisalat.ae:3478?transport=udp',
                    credential: ''
                },
                {
                    urls: 'stun:ct-turn2.etisalat.ae:3478?transport=udp',
                    credential: ''
                }
            ]
        },
        iceCollectionIdealTimeout: 500, // milliseconds
        iceCollectionMaxTimeout: 3000, // milliseconds
        removeBundling: false,
        earlyMedia: true,
        resyncOnConnect: true,
        removeH264Codecs: false,
        mediaBrokerOnly: false,
        ringingFeedbackMode: 'auto'
    },

    // ===== WEBRTC CONFIGURATION =====
    webrtcdtls: true,

    // ===== CUSTOM HEADERS =====
    requests: {
        customAgentVersionHeaderSuffix: 'smartOfficeVersion/4.2.1.1171 omniVersion/1.7.1.400 osType/iOS osVersion/18.4 webViewVersion/AppleWebKit/605.1.15/WebRTC/m91 deviceType/AppleiPad8.6 securityPatch/'
    },

    // ===== ETISALAT SPECIFIC SETTINGS =====
    appName: 'CloudTalk UCS',
    companyName: 'Etisalat',
    
    // Emergency numbers for UAE
    emergencyList: ['155', '911', '112', '113', '194', '000', '192', '901', '909', '991', '992', '993', '996', '997', '998', '999'],
    emergencyCallCenterNumber: '999911',
    emergencyLocationTracking: false,

    // Portal endpoints
    portalEndpoints: [
        'https://portal-uae.kandy.io/api/rest/3.52/clients/',
        'https://ct-admin.etisalat.ae/api/rest/3.52/clients/'
    ],

    // UCaaS REST API
    ucaasRestUrl: 'https://kbs-uae-cpaas-oauth.kandy.io/rest/version/1/sip-auth',
    
    // Push server
    pushServer: {
        protocol: 'https',
        port: '443',
        server: 'kbs-uae-cim-auth.kandy.io',
        version: '1'
    },
    pushServices: ['call', 'IM'],

    // Codecs to remove
    removeCodecList: ['OPUS', 'opus', 'ILBC', 'ISAC', 'VP8', 'VP9'],
    
    // Default calling mode
    defaultCallingMode: 'VoIP',
    
    // Privacy policy
    privacyPolicyLink: 'https://pay-smbapp.etisalat.ae/SMB_APP/terms_conditions_en.html',
    endUserPortalUrl: 'https://ct-portal.etisalat.ae/index.html#/',
    forgotPasswordUrl: 'https://www.etisalat.ae/b2bportal/reset-password-step1.html?login=f'
};

// ===== FULL SERVER CONFIGURATION FOR BRIDGE =====
const BRIDGE_CONFIG = {
    // Kandy.io / Etisalat UAE specific settings
    kandy: {
        authServer: 'https://kbs-uae-cim-auth.kandy.io:443',
        websocketServer: 'wss://kbs-uae-cim-auth.kandy.io:443',
        apiVersion: 'v2.0',
        ucaasRestUrl: 'https://kbs-uae-cpaas-oauth.kandy.io/rest/version/1/sip-auth',
        
        // Your Kandy.io credentials (username and password only)
        credentials: {
            username: 'YOUR_USERNAME',  // Your Kandy.io username
            password: 'YOUR_PASSWORD',  // Your Kandy.io password
            accountId: 'YOUR_ACCOUNT_ID', // Optional
            userId: 'YOUR_USER_ID'        // Optional
        }
    },

    // ICE/TURN/STUN servers for Etisalat UAE
    iceServers: [
        {
            urls: 'turns:ct-turn1.etisalat.ae:443?transport=tcp',
            username: '', // Will be populated from Kandy server
            credential: ''
        },
        {
            urls: 'turns:ct-turn2.etisalat.ae:443?transport=tcp',
            username: '',
            credential: ''
        },
        {
            urls: 'stun:ct-turn1.etisalat.ae:3478?transport=udp'
        },
        {
            urls: 'stun:ct-turn2.etisalat.ae:3478?transport=udp'
        }
    ],

    // WebRTC peer connection configuration
    peerConnection: {
        sdpSemantics: 'unified-plan',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
    },

    // ICE gathering configuration
    ice: {
        idealTimeout: 500, // ms
        maxTimeout: 3000, // ms
        gatheringTimeout: 5000 // ms
    },

    // Connection and reconnection settings
    connection: {
        pingInterval: 120000, // 2 minutes
        maxMissedPings: 3,
        reconnectLimit: 3,
        reconnectDelay: 3000,
        reconnectTimeMultiplier: 1,
        reconnectTimeLimit: 640000,
        autoReconnect: true,
        checkConnectivity: true
    },

    // Call settings
    call: {
        earlyMedia: true,
        serverTurnCredentials: true,
        resyncOnConnect: true,
        ringingFeedbackMode: 'auto',
        codecs: {
            audio: ['PCMU', 'PCMA', 'G722'], // Removed OPUS as per config
            video: [] // VP8/VP9 removed as per config
        }
    },

    // SIP trunk settings
    sip: {
        domain: 'etisalat.ae',
        transportProtocol: 'WSS',
        port: 443,
        registerExpires: 3600,
        sessionTimersExpires: 1800,
        keepAlive: true,
        keepAliveInterval: 30,
        userAgentString: 'CloudTalk-Bridge/1.0'
    },

    // Server settings
    server: {
        host: '0.0.0.0',
        port: 8080,
        secure: false,
        sslCert: '/path/to/ssl/cert.pem',
        sslKey: '/path/to/ssl/key.pem'
    },

    // Logging
    logging: {
        level: 'debug',
        logToFile: true,
        logFilePath: '/var/log/kandy-bridge-uae.log',
        logActions: true,
        enableFcsLogs: true
    },

    // Regional settings for UAE
    regional: {
        timezone: 'Asia/Dubai',
        countryCode: '+971',
        locale: 'en-AE',
        emergencyNumbers: KANDY_ETISALAT_UAE_CONFIG.emergencyList,
        phoneFormat: {
            mobile: /^(\+971|00971|971)?5[0-9]{8}$/,
            landline: /^(\+971|00971|971)?[2-4,6-7,9][0-9]{7}$/,
            tollFree: /^(\+971|00971|971)?800[0-9]{5}$/
        }
    }
};

// ===== KANDY.IO SDK INITIALIZATION HELPER =====
function getKandySDKConfig() {
    return {
        authentication: KANDY_ETISALAT_UAE_CONFIG.authentication,
        call: KANDY_ETISALAT_UAE_CONFIG.call,
        connectivity: KANDY_ETISALAT_UAE_CONFIG.connectivity,
        logs: KANDY_ETISALAT_UAE_CONFIG.logs,
        webrtcdtls: KANDY_ETISALAT_UAE_CONFIG.webrtcdtls,
        requests: KANDY_ETISALAT_UAE_CONFIG.requests
    };
}

// ===== AUTHENTICATION HELPER (without OAuth clientId) =====
async function authenticateWithKandy(credentials) {
    const authUrl = `${BRIDGE_CONFIG.kandy.ucaasRestUrl}`;
    
    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: credentials.username,
                password: credentials.password
            })
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token || data.token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 3600,
            tokenType: data.token_type || 'Bearer'
        };
    } catch (error) {
        console.error('Kandy authentication error:', error);
        throw error;
    }
}

// ===== PHONE NUMBER FORMATTER FOR UAE =====
function formatUAEPhoneNumber(number) {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Handle various UAE number formats
    if (cleaned.startsWith('971')) {
        return cleaned;
    } else if (cleaned.startsWith('00971')) {
        return cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
        return '971' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
        return '971' + cleaned;
    }
    
    return cleaned;
}

// ===== VALIDATE UAE PHONE NUMBER =====
function validateUAEPhoneNumber(number) {
    const formatted = formatUAEPhoneNumber(number);
    const patterns = BRIDGE_CONFIG.regional.phoneFormat;
    
    return patterns.mobile.test(formatted) || 
           patterns.landline.test(formatted) || 
           patterns.tollFree.test(formatted);
}

// ===== CHECK IF EMERGENCY NUMBER =====
function isEmergencyNumber(number) {
    const cleaned = number.replace(/\D/g, '');
    return BRIDGE_CONFIG.regional.emergencyNumbers.includes(cleaned);
}

// Export configurations
module.exports = {
    KANDY_ETISALAT_UAE_CONFIG,
    BRIDGE_CONFIG,
    getKandySDKConfig,
    authenticateWithKandy,
    formatUAEPhoneNumber,
    validateUAEPhoneNumber,
    isEmergencyNumber
};

// ===== USAGE EXAMPLE =====
/*
const config = require('./kandy-config-etisalat');

// Get Kandy SDK configuration
const kandyConfig = config.getKandySDKConfig();

// Authenticate (no clientId needed!)
const auth = await config.authenticateWithKandy({
    username: 'your_username',
    password: 'your_password'
});

// Format phone number
const phoneNumber = config.formatUAEPhoneNumber('0501234567');
console.log(phoneNumber); // 971501234567

// Check emergency
const isEmergency = config.isEmergencyNumber('999');
console.log(isEmergency); // true
*/
    // ===== AUTHENTICATION CONFIGURATION =====
    authentication: {
        subscription: {
            protocol: 'https',
            server: 'kbs-uae-cim-auth.kandy.io',
            port: '443',
            version: 'v2.0',
            expires: 3600,
            service: ['call', 'IM', 'Presence', 'MWI']
        },
        websocket: {
            protocol: 'wss',
            server: 'kbs-uae-cim-auth.kandy.io',
            port: '443'
        }
    },

    // ===== LOGGING CONFIGURATION =====
    logs: {
        logLevel: 'debug',
        logActions: {
            actionOnly: true,
            collapsed: false,
            diff: false
        },
        enableFcsLogs: true
    },

    // ===== CONNECTIVITY CONFIGURATION =====
    connectivity: {
        method: {
            type: 'keepAlive'
        },
        pingInterval: 120000, // 2 minutes
        reconnectLimit: 3,
        reconnectDelay: 3000, // 3 seconds
        reconnectTimeMultiplier: 1,
        reconnectTimeLimit: 640000, // ~10 minutes
        autoReconnect: true,
        maxMissedPings: 3,
        checkConnectivity: true,
        webSocketOAuthMode: 'query'
    },

    // ===== CALL CONFIGURATION =====
    call: {
        serverTurnCredentials: true,
        defaultPeerConfig: {
            sdpSemantics: 'unified-plan',
            iceServers: [
                {
                    urls: 'turns:ct-turn1.etisalat.ae:443?transport=tcp',
                    credential: '' // Will be provided by server
                },
                {
                    urls: 'turns:ct-turn2.etisalat.ae:443?transport=tcp',
                    credential: '' // Will be provided by server
                },
                {
                    urls: 'stun:ct-turn1.etisalat.ae:3478?transport=udp',
                    credential: ''
                },
                {
                    urls: 'stun:ct-turn2.etisalat.ae:3478?transport=udp',
                    credential: ''
                }
            ]
        },
        iceCollectionIdealTimeout: 500, // milliseconds
        iceCollectionMaxTimeout: 3000, // milliseconds
        removeBundling: false,
        earlyMedia: true,
        resyncOnConnect: true,
        removeH264Codecs: false,
        mediaBrokerOnly: false,
        ringingFeedbackMode: 'auto'
    },

    // ===== WEBRTC CONFIGURATION =====
    webrtcdtls: true,

    // ===== CUSTOM HEADERS =====
    requests: {
        customAgentVersionHeaderSuffix: 'smartOfficeVersion/4.2.1.1171 omniVersion/1.7.1.400 osType/iOS osVersion/18.4 webViewVersion/AppleWebKit/605.1.15/WebRTC/m91 deviceType/AppleiPad8.6 securityPatch/'
    }
};

// ===== FULL SERVER CONFIGURATION FOR BRIDGE =====
const BRIDGE_CONFIG = {
    // Kandy.io / Etisalat UAE specific settings
    kandy: {
        authServer: 'https://kbs-uae-cim-auth.kandy.io:443',
        websocketServer: 'wss://kbs-uae-cim-auth.kandy.io:443',
        apiVersion: 'v2.0',
        
        // Your Kandy.io credentials
        credentials: {
            clientId: 'YOUR_CLIENT_ID',
            clientSecret: 'YOUR_CLIENT_SECRET',
            username: 'YOUR_USERNAME',
            password: 'YOUR_PASSWORD',
            accountId: 'YOUR_ACCOUNT_ID',
            userId: 'YOUR_USER_ID'
        },

        // OAuth configuration
        oauth: {
            mode: 'query', // As specified in config
            tokenEndpoint: 'https://kbs-uae-cim-auth.kandy.io:443/v2.0/token',
            scope: 'openid'
        }
    },

    // ICE/TURN/STUN servers for Etisalat UAE
    iceServers: [
        {
            urls: 'turns:ct-turn1.etisalat.ae:443?transport=tcp',
            username: '', // Will be populated from Kandy server
            credential: ''
        },
        {
            urls: 'turns:ct-turn2.etisalat.ae:443?transport=tcp',
            username: '',
            credential: ''
        },
        {
            urls: 'stun:ct-turn1.etisalat.ae:3478?transport=udp'
        },
        {
            urls: 'stun:ct-turn2.etisalat.ae:3478?transport=udp'
        }
    ],

    // WebRTC peer connection configuration
    peerConnection: {
        sdpSemantics: 'unified-plan',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all', // Use both STUN and TURN
        iceCandidatePoolSize: 10
    },

    // ICE gathering configuration
    ice: {
        idealTimeout: 500, // ms - as per Kandy config
        maxTimeout: 3000, // ms - as per Kandy config
        gatheringTimeout: 5000 // ms - safety timeout
    },

    // Connection and reconnection settings
    connection: {
        pingInterval: 120000, // 2 minutes
        maxMissedPings: 3,
        reconnectLimit: 3,
        reconnectDelay: 3000, // 3 seconds
        reconnectTimeMultiplier: 1,
        reconnectTimeLimit: 640000, // ~10 minutes
        autoReconnect: true,
        checkConnectivity: true
    },

    // Call settings
    call: {
        earlyMedia: true,
        serverTurnCredentials: true,
        resyncOnConnect: true,
        ringingFeedbackMode: 'auto',
        codecs: {
            audio: ['opus', 'PCMU', 'PCMA', 'G722'],
            video: ['VP8', 'VP9', 'H264']
        }
    },

    // SIP trunk settings (for bridging)
    sip: {
        domain: 'etisalat.ae',
        transportProtocol: 'WSS',
        port: 443,
        registerExpires: 3600,
        sessionTimersExpires: 1800,
        keepAlive: true,
        keepAliveInterval: 30,
        userAgentString: 'WebRTC-Kandy-Bridge/1.0'
    },

    // Server settings
    server: {
        host: '0.0.0.0',
        port: 8080,
        secure: true,
        sslCert: '/path/to/ssl/cert.pem',
        sslKey: '/path/to/ssl/key.pem'
    },

    // Logging
    logging: {
        level: 'debug', // debug, info, warn, error
        logToFile: true,
        logFilePath: '/var/log/kandy-bridge-uae.log',
        logActions: true,
        enableFcsLogs: true
    },

    // Regional settings for UAE
    regional: {
        timezone: 'Asia/Dubai',
        countryCode: '+971',
        locale: 'en-AE',
        phoneFormat: {
            mobile: /^(\+971|00971|971)?5[0-9]{8}$/,
            landline: /^(\+971|00971|971)?[2-4,6-7,9][0-9]{7}$/,
            tollFree: /^(\+971|00971|971)?800[0-9]{5}$/
        }
    }
};

// ===== KANDY.IO SDK INITIALIZATION HELPER =====
function getKandySDKConfig() {
    return {
        authentication: {
            subscription: {
                service: ['call', 'IM', 'Presence', 'MWI'],
                server: KANDY_ETISALAT_UAE_CONFIG.authentication.subscription.server,
                protocol: KANDY_ETISALAT_UAE_CONFIG.authentication.subscription.protocol,
                port: KANDY_ETISALAT_UAE_CONFIG.authentication.subscription.port,
                version: KANDY_ETISALAT_UAE_CONFIG.authentication.subscription.version,
                expires: KANDY_ETISALAT_UAE_CONFIG.authentication.subscription.expires
            },
            websocket: {
                server: KANDY_ETISALAT_UAE_CONFIG.authentication.websocket.server,
                protocol: KANDY_ETISALAT_UAE_CONFIG.authentication.websocket.protocol,
                port: KANDY_ETISALAT_UAE_CONFIG.authentication.websocket.port
            }
        },
        call: {
            defaultPeerConfig: {
                iceServers: BRIDGE_CONFIG.iceServers,
                sdpSemantics: 'unified-plan',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            },
            iceCollectionIdealTimeout: KANDY_ETISALAT_UAE_CONFIG.call.iceCollectionIdealTimeout,
            iceCollectionMaxTimeout: KANDY_ETISALAT_UAE_CONFIG.call.iceCollectionMaxTimeout,
            serverTurnCredentials: true,
            earlyMedia: true,
            resyncOnConnect: true,
            ringingFeedbackMode: 'auto'
        },
        connectivity: {
            method: 'keepAlive',
            pingInterval: 120000,
            reconnectLimit: 3,
            reconnectDelay: 3000,
            autoReconnect: true,
            maxMissedPings: 3,
            checkConnectivity: true,
            webSocketOAuthMode: 'query'
        },
        logs: {
            logLevel: 'debug',
            enableFcsLogs: true
        }
    };
}

// ===== AUTHENTICATION HELPER =====
async function authenticateWithKandy(credentials) {
    const authUrl = `${BRIDGE_CONFIG.kandy.authServer}/v2.0/token`;
    
    const params = new URLSearchParams({
        grant_type: 'password',
        username: credentials.username,
        password: credentials.password,
        client_id: credentials.clientId,
        scope: 'openid'
    });

    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            tokenType: data.token_type
        };
    } catch (error) {
        console.error('Kandy authentication error:', error);
        throw error;
    }
}

// ===== PHONE NUMBER FORMATTER FOR UAE =====
function formatUAEPhoneNumber(number) {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Handle various UAE number formats
    if (cleaned.startsWith('971')) {
        return cleaned;
    } else if (cleaned.startsWith('00971')) {
        return cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
        return '971' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
        return '971' + cleaned;
    }
    
    return cleaned;
}

// ===== VALIDATE UAE PHONE NUMBER =====
function validateUAEPhoneNumber(number) {
    const formatted = formatUAEPhoneNumber(number);
    const patterns = BRIDGE_CONFIG.regional.phoneFormat;
    
    return patterns.mobile.test(formatted) || 
           patterns.landline.test(formatted) || 
           patterns.tollFree.test(formatted);
}

// Export configurations
module.exports = {
    KANDY_ETISALAT_UAE_CONFIG,
    BRIDGE_CONFIG,
    getKandySDKConfig,
    authenticateWithKandy,
    formatUAEPhoneNumber,
    validateUAEPhoneNumber
};

// ===== USAGE EXAMPLE =====
/*
const config = require('./kandy-config-etisalat');

// Get Kandy SDK configuration
const kandyConfig = config.getKandySDKConfig();

// Initialize Kandy SDK
kandy.setup(kandyConfig);

// Authenticate
const auth = await config.authenticateWithKandy({
    clientId: 'your_client_id',
    username: 'your_username',
    password: 'your_password'
});

// Format phone number
const phoneNumber = config.formatUAEPhoneNumber('0501234567');
console.log(phoneNumber); // 971501234567

// Validate phone number
const isValid = config.validateUAEPhoneNumber('971501234567');
console.log(isValid); // true
*/
