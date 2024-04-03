'use strict';

module.exports = class Host {
    constructor() {
        this.authorizedIPs = new Map();
    }

    getAuthorizedIPs() {
        return Object.fromEntries(this.authorizedIPs);
    }


    setAuthorizedIP(ip, authorized) {
        this.authorizedIPs.set(ip, authorized);
    }


    isAuthorizedIP(ip) {
        return this.authorizedIPs.has(ip);
    }

    deleteIP(ip) {
        return this.authorizedIPs.delete(ip);
    }
};
