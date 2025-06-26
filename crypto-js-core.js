/*
CryptoJS v3.1.2 - Core Components
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
License: BSD-3-Clause
*/
var CryptoJS=CryptoJS||function(h,r){var k={},l=k.lib={},n=function(){},f=l.Base={extend:function(a){n.prototype=this;var b=new n;a&&b.mixIn(a);b.hasOwnProperty("init")||(b.init=function(){b.$super.init.apply(this,arguments)});b.init.prototype=b;b.$super=this;return b},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var b in a)a.hasOwnProperty(b)&&(this[b]=a[b]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
j=l.WordArray=f.extend({init:function(a,b){a=this.words=a||[];this.sigBytes=b!=r?b:4*a.length},toString:function(a){return(a||s).stringify(this)},concat:function(a){var b=this.words,d=a.words,c=this.sigBytes;a=a.sigBytes;this.clamp();if(c%4)for(var e=0;e<a;e++)b[c+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((c+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)b[c+e>>>2]=d[e>>>2];else b.push.apply(b,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<
32-8*(b%4);a.length=h.ceil(b/4)},clone:function(){var a=f.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],d=0;d<a;d+=4)b.push(4294967296*h.random()|0);return new j.init(b,a)}}),m=k.enc={},s=m.Hex={stringify:function(a){var b=a.words;a=a.sigBytes;for(var d=[],c=0;c<a;c++){var e=b[c>>>2]>>>24-8*(c%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c+=2)d[c>>>3]|=parseInt(a.substr(c,
2),16)<<24-4*(c%8);return new j.init(d,b/2)}},p=m.Latin1={stringify:function(a){var b=a.words;a=a.sigBytes;for(var d=[],c=0;c<a;c++)d.push(String.fromCharCode(b[c>>>2]>>>24-8*(c%4)&255));return d.join("")},parse:function(a){for(var b=a.length,d=[],c=0;c<b;c++)d[c>>>2]|=(a.charCodeAt(c)&255)<<24-8*(c%4);return new j.init(d,b)}},t=m.Utf8={stringify:function(a){try{return decodeURIComponent(escape(p.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return p.parse(unescape(encodeURIComponent(a)))}},
q=l.BufferedBlockAlgorithm=f.extend({reset:function(){this._data=new j.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=t.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,d=b.words,c=b.sigBytes,e=this.blockSize,f=c/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;c=h.min(4*a,c);if(a){for(var g=0;g<a;g+=e)this._doProcessBlock(d,g);g=d.splice(0,a);b.sigBytes-=c}return new j.init(g,c)},clone:function(){var a=f.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});l.Hasher=q.extend({cfg:f.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){q.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,d){return(new a.init(d)).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return(new u.HMAC.init(a,
d)).finalize(b)}}});var u=k.algo={};return k}(Math);

/*
CryptoJS v3.1.2 - SHA256
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
License: BSD-3-Clause
*/
(function (Math) {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var Hasher = C_lib.Hasher;
    var C_algo = C.algo;

    // Initialization and round constants tables
    var H = [];
    var K = [];

    // Compute constants
    (function () {
        function isPrime(n) {
            var sqrtN = Math.sqrt(n);
            for (var factor = 2; factor <= sqrtN; factor++) {
                if (!(n % factor)) {
                    return false;
                }
            }

            return true;
        }

        function getFractionalBits(n) {
            return ((n - (n | 0)) * 0x100000000) | 0;
        }

        var n = 2;
        var nPrime = 0;
        while (nPrime < 64) {
            if (isPrime(n)) {
                if (nPrime < 8) {
                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
                }
                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

                nPrime++;
            }

            n++;
        }
    }());

    // Reusable object
    var W = [];

    /**
     * SHA-256 hash algorithm.
     */
    var SHA256 = C_algo.SHA256 = Hasher.extend({
        _doReset: function () {
            this._hash = new WordArray.init(H.slice(0));
        },

        _doProcessBlock: function (M, offset) {
            // Shortcut
            var H = this._hash.words;

            // Working variables
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d = H[3];
            var e = H[4];
            var f = H[5];
            var g = H[6];
            var h = H[7];

            // Computation
            for (var i = 0; i < 64; i++) {
                if (i < 16) {
                    W[i] = M[offset + i] | 0;
                } else {
                    var gamma0x = W[i - 15];
                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
                                   (gamma0x >>> 3);

                    var gamma1x = W[i - 2];
                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
                                   (gamma1x >>> 10);

                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
                }

                var ch  = (e & f) ^ (~e & g);
                var maj = (a & b) ^ (a & c) ^ (b & c);

                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

                var t1 = h + sigma1 + ch + K[i] + W[i];
                var t2 = sigma0 + maj;

                h = g;
                g = f;
                f = e;
                e = (d + t1) | 0;
                d = c;
                c = b;
                b = a;
                a = (t1 + t2) | 0;
            }

            // Intermediate hash value
            H[0] = (H[0] + a) | 0;
            H[1] = (H[1] + b) | 0;
            H[2] = (H[2] + c) | 0;
            H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0;
            H[5] = (H[5] + f) | 0;
            H[6] = (H[6] + g) | 0;
            H[7] = (H[7] + h) | 0;
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;

            // Hash final blocks
            this._process();

            // Return final computed hash
            return this._hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        }
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA256('message');
     *     var hash = CryptoJS.SHA256(wordArray);
     */
    C.SHA256 = Hasher._createHelper(SHA256);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA256(message, key);
     */
    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
}(Math));

/*
CryptoJS v3.1.2 - HMAC
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
License: BSD-3-Clause
*/
(function () {
    // Shortcuts
    var C = CryptoJS;
    var C_lib = C.lib;
    var Base = C_lib.Base;
    var C_enc = C.enc;
    var Utf8 = C_enc.Utf8;
    var C_algo = C.algo;

    /**
     * HMAC algorithm.
     */
    var HMAC = C_algo.HMAC = Base.extend({
        /**
         * Initializes a newly created HMAC.
         *
         * @param {Hasher} hasher The hash algorithm to use.
         * @param {WordArray|string} key The secret key.
         *
         * @example
         *
         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
         */
        init: function (hasher, key) {
            // Init hasher
            hasher = this._hasher = new hasher.init();

            // Convert string to WordArray, else assume WordArray already
            if (typeof key == 'string') {
                key = Utf8.parse(key);
            }

            // Shortcuts
            var hasherBlockSize = hasher.blockSize;
            var hasherBlockSizeBytes = hasherBlockSize * 4;

            // Allow arbitrary length keys
            if (key.sigBytes > hasherBlockSizeBytes) {
                key = hasher.finalize(key);
            }

            // Clamp excess bits
            key.clamp();

            // Clone key for inner and outer pads
            var oKey = this._oKey = key.clone();
            var iKey = this._iKey = key.clone();

            // Shortcuts
            var oKeyWords = oKey.words;
            var iKeyWords = iKey.words;

            // XOR keys with pad constants
            for (var i = 0; i < hasherBlockSize; i++) {
                oKeyWords[i] ^= 0x5c5c5c5c;
                iKeyWords[i] ^= 0x36363636;
            }
            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

            // Set initial values
            this.reset();
        },

        /**
         * Resets this HMAC to its initial state.
         *
         * @example
         *
         *     hmacHasher.reset();
         */
        reset: function () {
            // Shortcut
            var hasher = this._hasher;

            // Reset
            hasher.reset();
            hasher.update(this._iKey);
        },

        /**
         * Updates this HMAC with a message.
         *
         * @param {WordArray|string} messageUpdate The message to append.
         *
         * @return {HMAC} This HMAC instance.
         *
         * @example
         *
         *     hmacHasher.update('message');
         *     hmacHasher.update(wordArray);
         */
        update: function (messageUpdate) {
            this._hasher.update(messageUpdate);

            // Chainable
            return this;
        },

        /**
         * Finalizes the HMAC computation.
         * Note that the finalize operation is effectively a destructive, read-once operation.
         *
         * @param {WordArray|string} messageUpdate (Optional) A final message update.
         *
         * @return {WordArray} The HMAC.
         *
         * @example
         *
         *     var hmac = hmacHasher.finalize();
         *     var hmac = hmacHasher.finalize('message');
         *     var hmac = hmacHasher.finalize(wordArray);
         */
        finalize: function (messageUpdate) {
            // Shortcut
            var hasher = this._hasher;

            // Compute HMAC
            var innerHash = hasher.finalize(messageUpdate);
            hasher.reset();
            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

            return hmac;
        }
    });
}());
