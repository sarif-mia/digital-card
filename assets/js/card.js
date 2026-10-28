/* Shared contact export. Pages stay readable and links work without JavaScript. */
(() => {
  'use strict';

  function escapeVCard(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n')
      .replace(/;/g, '\\;').replace(/,/g, '\\,');
  }

  // RFC 6350 folding: each physical line contains at most 75 UTF-8 bytes.
  function foldLine(line) {
    let result = '';
    let bytes = 0;
    for (const character of line) {
      const size = new TextEncoder().encode(character).length;
      if (bytes + size > 75) {
        result += '\r\n ';
        bytes = 1;
      }
      result += character;
      bytes += size;
    }
    return result;
  }

  function createVCard(contact) {
    const value = key => escapeVCard(contact[key]);
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N;CHARSET=UTF-8:;${value('name')};;;`,
      `FN;CHARSET=UTF-8:${value('name')}`,
      `TEL;TYPE=CELL:${value('phone')}`,
      `EMAIL;TYPE=INTERNET:${value('email')}`,
      `ORG;CHARSET=UTF-8:${value('company')}`,
      `TITLE;CHARSET=UTF-8:${value('job')}`,
      `ADR;TYPE=WORK;CHARSET=UTF-8:;;${value('address')};;;;`,
      `URL:${value('website')}`,
      'END:VCARD',
    ].map(foldLine).join('\r\n') + '\r\n';
  }

  // Expose pure helpers to Node's built-in test runner without browser dependencies.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeVCard, foldLine, createVCard };
  }
  if (typeof document === 'undefined') return;

  document.querySelector('[data-download-contact]')?.addEventListener('click', () => {
    const contact = Object.fromEntries(
      ['name', 'phone', 'email', 'company', 'job', 'address', 'website']
        .map(key => [key, document.getElementById(key)?.value.trim() || ''])
    );
    if (!contact.name || !contact.phone || !contact.email) {
      window.alert('Contact details are incomplete. Please contact the card owner.');
      return;
    }

    const url = URL.createObjectURL(new Blob([createVCard(contact)], {
      type: 'text/vcard;charset=utf-8',
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contact.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}_digital_card.vcf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Allow the browser to begin reading the download before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
