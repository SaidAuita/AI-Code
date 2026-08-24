/**
 * Sample Data Generator
 * English realistic templates and random generator for EAN-13 and QR Code types
 */
var SampleData = (function () {
    'use strict';

    var EAN_PREFIXES = ['003', '004', '005', '006', '007', '008', '009', '400', '401', '500', '501', '460'];

    var URL_SAMPLES = [
        'https://www.adobe.com/illustrator',
        'https://github.com/SaidAuita/AI-Dimension',
        'https://behance.net/galleries',
        'https://dribbble.com/shots',
        'https://fonts.google.com',
        'https://www.iso.org'
    ];

    var PLAIN_SAMPLES = [
        'Batch #45892-A / Prod: 2026-08-24 / Exp: 2028-08-24',
        'Get 15% off with promo code VECTOR2026 at checkout',
        'Wi-Fi: Studio_Guest / Pass: Creative2026!',
        'Certified Product. ISO 9001:2015 / Net Wt: 250g',
        'Order #88412-P / Client: Apex Design / Status: Ready'
    ];

    var SMS_SAMPLES = [
        { phone: '+1 (555) 123-4567', message: 'Confirming order #1045' },
        { phone: '+1 (555) 987-6543', message: 'START' },
        { phone: '+1 (555) 777-8899', message: 'SUBSCRIBE' },
        { phone: '+44 7911 123456', message: 'INFO' }
    ];

    var EMAIL_SAMPLES = [
        {
            to: 'order@design-studio.com',
            subject: 'Print Order: A4 Brochure',
            body: 'Hello! Please provide a quote for 500 copies.'
        },
        {
            to: 'prepress@primeprint.com',
            subject: 'Artwork Review [Job #4412]',
            body: 'Hi team, please find attached the vector artwork with bleeds.'
        },
        {
            to: 'support@studio.com',
            subject: 'Commercial License Inquiry',
            body: 'Hello, I would like to inquire about extending our enterprise license.'
        }
    ];

    var VCARD_SAMPLES = [
        {
            firstName: 'Alex',
            lastName: 'Smith',
            title: 'Art Director',
            organization: 'Vector Studio Inc.',
            cellPhone: '+1 (555) 234-5678',
            workPhone: '+1 (555) 765-4321',
            email: 'a.smith@vectorstudio.com',
            website: 'https://vectorstudio.com',
            street: '450 Mission St, Suite 300',
            city: 'San Francisco',
            country: 'USA'
        },
        {
            firstName: 'Elena',
            lastName: 'Taylor',
            title: 'Lead Prepress Engineer',
            organization: 'Prime Print Group',
            cellPhone: '+1 (555) 345-6789',
            workPhone: '+1 (555) 111-2233',
            email: 'elena.taylor@primeprint.com',
            website: 'https://primeprint.com',
            street: '742 Evergreen Terrace',
            city: 'New York',
            country: 'USA'
        },
        {
            firstName: 'Michael',
            lastName: 'Brown',
            title: 'Packaging Technologist',
            organization: 'Flexo Pack Global',
            cellPhone: '+44 7700 900123',
            workPhone: '+44 20 7946 0199',
            email: 'm.brown@flexopack.co.uk',
            website: 'https://flexopack.co.uk',
            street: '10 Downing Street',
            city: 'London',
            country: 'United Kingdom'
        },
        {
            firstName: 'John',
            lastName: 'Doe',
            title: 'Creative Director',
            organization: 'Pixel Craft Studio',
            cellPhone: '+1 (555) 888-9900',
            workPhone: '+1 (555) 876-5432',
            email: 'johndoe@pixelcraft.com',
            website: 'https://pixelcraft.com',
            street: '123 Design Avenue',
            city: 'Los Angeles',
            country: 'USA'
        }
    ];

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getRandomEAN13() {
        var prefix = pickRandom(EAN_PREFIXES);
        var rest = '';
        var needed = 12 - prefix.length;
        for (var i = 0; i < needed; i++) {
            rest += Math.floor(Math.random() * 10);
        }
        var code12 = prefix + rest;
        var chk = EAN13.calculateChecksum(code12);
        return code12 + chk;
    }

    function getRandomQR(type) {
        switch (type) {
            case 'url':
                return { url: pickRandom(URL_SAMPLES) };
            case 'plain':
                return { text: pickRandom(PLAIN_SAMPLES) };
            case 'sms':
                return pickRandom(SMS_SAMPLES);
            case 'email':
                return pickRandom(EMAIL_SAMPLES);
            case 'vcard':
                return pickRandom(VCARD_SAMPLES);
            default:
                return { url: URL_SAMPLES[0] };
        }
    }

    function getDefaultQR(type) {
        switch (type) {
            case 'url':
                return { url: 'https://www.adobe.com/illustrator' };
            case 'plain':
                return { text: 'Batch #45892-A / Prod: 2026-08-24 / Exp: 2028-08-24' };
            case 'sms':
                return SMS_SAMPLES[0];
            case 'email':
                return EMAIL_SAMPLES[0];
            case 'vcard':
                return VCARD_SAMPLES[0];
            default:
                return { url: 'https://www.adobe.com/illustrator' };
        }
    }

    return {
        getRandomEAN13: getRandomEAN13,
        getRandomQR: getRandomQR,
        getDefaultQR: getDefaultQR
    };
})();
