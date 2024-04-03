'use strict';

const os = require('os');
const ifaces = os.networkInterfaces();

const getLocalIp = () => {
    let localIp = '127.0.0.1';
    let checkIp = true;
    Object.keys(ifaces).forEach((ifname) => {
        for (const iface of ifaces[ifname]) {
            
            if (iface.family !== 'IPv4' || iface.internal !== false || checkIp === false) {
                continue;
            }
            
            localIp = iface.address;
            checkIp = false;
            return;
        }
    });
    return localIp;
};

module.exports = {
    server: {
        listen: {
            
            ip: '0.0.0.0',
            port: process.env.PORT || 3010,
        },
        ssl: {
            
            cert: '../ssl/cert.pem',
            key: '../ssl/key.pem',
        },
    },
    host: {
        protected: false,
        user_auth: false,
        users: [
            {
                username: 'username',
                password: 'password',
            },
            {
                username: 'username2',
                password: 'password2',
            },
            
        ],
    },
    presenters: {
        list: [
            
            'AS Developers',
            'sushilkumar.yadav.9545@gmail.com',
        ],
        join_first: true,  
    },
    console: {
        debug: true,
        colors: true,
    },
    ngrok: {
        
        authToken: '',
    },
    api: {
        
        keySecret: 'mirotalksfu_default_secret',
    },
    sentry: {
        
        enabled: false,
        DSN: '',
        tracesSampleRate: 0.5,
    },
    slack: {
        
        enabled: false,
        signingSecret: '',
    },
    chatGPT: {
        
        enabled: false,
        basePath: 'https://api.openai.com/v1/',
        apiKey: 'H2hfB5WSGT6xZWuXQVjgT3BlbkFJtdTUXq3IaICe08h2ehOm',
        model: 'gpt-3.5-turbo-instruct',
        max_tokens: 1000,
        temperature: 0,
    },
    IPLookup: {
        
        enabled: false,
        getEndpoint(ip) {
            return `https://get.geojs.io/v1/ip/geo/${ip}.json`;
        },
    },
    survey: {
        
        enabled: false,
        url: '',
    },
    redirect: {
        
        enabled: false,
        url: '',
    },
    stats: {
        
        enabled: true,
        src: 'https://stats.mirotalk.com/script.js',
        id: '41d26670-f275-45bb-af82-3ce91fe57756',
    },
    mediasoup: {
        
        numWorkers: Object.keys(os.cpus()).length,
        worker: {
            rtcMinPort: 40000,
            rtcMaxPort: 40100,
            logLevel: 'error',
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc', 'sctp'],
        },
        
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP9',
                    clockRate: 90000,
                    parameters: {
                        'profile-id': 2,
                        'x-google-start-bitrate': 1000,
                    },
                },
                {
                    kind: 'video',
                    mimeType: 'video/h264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '4d0032',
                        'level-asymmetry-allowed': 1,
                        'x-google-start-bitrate': 1000,
                    },
                },
                {
                    kind: 'video',
                    mimeType: 'video/h264',
                    clockRate: 90000,
                    parameters: {
                        'packetization-mode': 1,
                        'profile-level-id': '42e01f',
                        'level-asymmetry-allowed': 1,
                        'x-google-start-bitrate': 1000,
                    },
                },
            ],
        },
        
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: getLocalIp(),  
                },  
            ],
            initialAvailableOutgoingBitrate: 1000000,
            minimumAvailableOutgoingBitrate: 600000,
            maxSctpMessageSize: 262144,
            maxIncomingBitrate: 1500000,
        },
    },
};
