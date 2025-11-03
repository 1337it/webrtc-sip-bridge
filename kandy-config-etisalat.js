// Kandy.io Configuration for Etisalat UAE
// Based on actual CloudTalk UCS configuration

const KANDY_ETISALAT_UAE_CONFIG = {
    // ===== AUTHENTICATION CONFIGURATION =====
    authentication: {
        subscription: {
            protocol: 'https',
            server: 'ct-webrtc.etisalat.ae',
            port: '443',
            version: 'v2.0',
            expires: 3600,
            service: ['call', 'IM', 'Presence', 'MWI']
        },
        websocket: {
            protocol: 'wss',
            server: 'ct-webrtc.etisalat.ae',
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
        pingInterval: 120000,
        reconnectLimit: 3,
        reconnectDelay: 3000,
        reconnectTimeMultiplier: 1,
        reconnectTimeLimit: 640000,
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
                    credential: ''
                },
                {
                    urls: 'turns:ct-turn2.etisalat.ae:443?transport=tcp',
                    credential: ''
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
        iceCollectionIdealTimeout: 500,
        iceCollectionMaxTimeout: 3000,
        removeBundling: false,
        earlyMedia: true,
        resyncOnConnect: true,
        removeH264Codecs: false,
        mediaBrokerOnly: false,
        ringingFeedbackMode: 'auto'
    },

    webrtcdtls: true,

    requests: {
        customAgentVersionHeaderSuffix: 'smartOfficeVersion/4.2.1.1171 omniVersion/1.7.1.400 osType/iOS osVersion/18.4 webViewVersion/AppleWebKit/605.1.15/WebRTC/m91 deviceType/AppleiPad8.6 securityPatch/'
    },

    appName: 'CloudTalk UCS',
    companyName: 'Etisalat',
    
    emergencyList: ['155', '911', '112', '113', '194', '000', '192', '901', '909', '991', '992', '993', '996', '997', '998', '999'],
    emergencyCallCenterNumber: '999911',
    emergencyLocationTracking: false,

    portalEndpoints: [
        'https://portal-uae.kandy.io/api/rest/3.52/clients/',
        'https://ct-admin.etisalat.ae/api/rest/3.52/clients/'
    ],

    ucaasRestUrl: 'https://kbs-uae-cpaas-oauth.kandy.io/rest/version/1/sip-auth',
    
    pushServer: {
        protocol: 'https',
        port: '443',
        server: 'ct-webrtc.etisalat.ae',
        version: '1'
    },
    pushServices: ['call', 'IM'],

    removeCodecList: ['OPUS', 'opus', 'ILBC', 'ISAC', 'VP8', 'VP9'],
    defaultCallingMode: 'VoIP',
    
    privacyPolicyLink: 'https://pay-smbapp.etisalat.ae/SMB_APP/terms_conditions_en.html',
    endUserPortalUrl: 'https://ct-portal.etisalat.ae/index.html#/',
    forgotPasswordUrl: 'https://www.etisalat.ae/b2bportal/reset-password-step1.html?login=f'
};

const BRIDGE_CONFIG = {
    kandy: {
        authServer: 'https://ct-webrtc.etisalat.ae:443',
        websocketServer: 'wss://ct-webrtc.etisalat.ae:443',
        apiVersion: 'v2.0',
        subscriptionUrl: 'https://ct-webrtc.etisalat.ae/v2.0/subscription',
        
        credentials: {
            username: 'YOUR_USERNAME',
            password: 'YOUR_PASSWORD',
            accountId: 'YOUR_ACCOUNT_ID',
            userId: 'YOUR_USER_ID'
        }
    },

    iceServers: [
        {
            urls: 'turns:ct-turn1.etisalat.ae:443?transport=tcp',
            username: '',
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

    peerConnection: {
        sdpSemantics: 'unified-plan',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
    },

    ice: {
        idealTimeout: 500,
        maxTimeout: 3000,
        gatheringTimeout: 5000
    },

    connection: {
        pingInterval: 120000,
        maxMissedPings: 3,
        reconnectLimit: 3,
        reconnectDelay: 3000,
        reconnectTimeMultiplier: 1,
        reconnectTimeLimit: 640000,
        autoReconnect: true,
        checkConnectivity: true
    },

    call: {
        earlyMedia: true,
        serverTurnCredentials: true,
        resyncOnConnect: true,
        ringingFeedbackMode: 'auto',
        codecs: {
            audio: ['PCMU', 'PCMA', 'G722'],
            video: []
        }
    },

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

    server: {
        host: '0.0.0.0',
        port: 8080,
        secure: false,
        sslCert: '/path/to/ssl/cert.pem',
        sslKey: '/path/to/ssl/key.pem'
    },

    logging: {
        level: 'debug',
        logToFile: true,
        logFilePath: '/var/log/kandy-bridge-uae.log',
        logActions: true,
        enableFcsLogs: true
    },

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

async function authenticateWithKandy(credentials) {
    const authUrl = 'https://ct-webrtc.etisalat.ae/v2.0/subscription';
    
    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: credentials.username,
                password: credentials.password,
                service: ['call', 'IM', 'Presence', 'MWI']
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return {
            accessToken: data.access_token || data.token || data.subscriptionId,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 3600,
            tokenType: data.token_type || 'Bearer',
            subscriptionId: data.subscriptionId
        };
    } catch (error) {
        console.error('Kandy authentication error:', error);
        throw error;
    }
}

function formatUAEPhoneNumber(number) {
    let cleaned = number.replace(/\D/g, '');
    
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

function validateUAEPhoneNumber(number) {
    const formatted = formatUAEPhoneNumber(number);
    const patterns = BRIDGE_CONFIG.regional.phoneFormat;
    
    return patterns.mobile.test(formatted) || 
           patterns.landline.test(formatted) || 
           patterns.tollFree.test(formatted);
}

function isEmergencyNumber(number) {
    const cleaned = number.replace(/\D/g, '');
    return BRIDGE_CONFIG.regional.emergencyNumbers.includes(cleaned);
}

module.exports = {
    KANDY_ETISALAT_UAE_CONFIG,
    BRIDGE_CONFIG,
    getKandySDKConfig,
    authenticateWithKandy,
    formatUAEPhoneNumber,
    validateUAEPhoneNumber,
    isEmergencyNumber
};
