(function(root, factory) {
  const core = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  }

  root.ReplyPalCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function isValidDate(day, month, year) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
  }

  function prefersMonthFirst(locale) {
    try {
      const parts = new Intl.DateTimeFormat(locale || undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }).formatToParts(new Date(2001, 10, 22));
      return parts.find(part => part.type === 'month')?.value === '11' &&
        parts.findIndex(part => part.type === 'month') < parts.findIndex(part => part.type === 'day');
    } catch (error) {
      return false;
    }
  }

  function normalizeDateString(rawDate, locale) {
    if (typeof rawDate !== 'string') return '';

    const value = rawDate.trim();
    let day;
    let month;
    let year;

    let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      match = value.match(/^(\d{1,2})([./])(\d{1,2})\2(\d{4})$/);
      if (!match) return '';

      const first = Number(match[1]);
      const second = Number(match[3]);
      year = Number(match[4]);

      if (match[2] === '.') {
        day = first;
        month = second;
      } else if (first > 12) {
        day = first;
        month = second;
      } else if (second > 12) {
        month = first;
        day = second;
      } else if (prefersMonthFirst(locale)) {
        month = first;
        day = second;
      } else {
        day = first;
        month = second;
      }
    }

    return isValidDate(day, month, year) ? `${pad(day)}.${pad(month)}.${year}` : '';
  }

  function parsePrePlainText(value, locale) {
    if (typeof value !== 'string') return null;

    const match = value.match(/^\[(\d{1,2}):(\d{2}),\s*([^\]]+)\]\s*(.*?):\s*$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const date = normalizeDateString(match[3], locale);
    if (!date || hours > 23 || minutes > 59) return null;

    return {
      date,
      time: `${pad(hours)}:${pad(minutes)}`,
      senderName: cleanDisplayName(match[4])
    };
  }

  function cleanDisplayName(value) {
    if (typeof value !== 'string') return '';

    return value
      .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, '')
      .replace(/(?:פרטי\s+הפרופיל|profile\s+details?)/giu, ' ')
      .replace(/\(\s*\)|\[\s*\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseDateTime(dateString, timeString) {
    const normalizedDate = normalizeDateString(dateString);
    const timeMatch = typeof timeString === 'string' &&
      timeString.match(/^(\d{1,2}):(\d{2})$/);
    if (!normalizedDate || !timeMatch) return null;

    const [day, month, year] = normalizedDate.split('.').map(Number);
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours > 23 || minutes > 59) return null;

    return new Date(year, month - 1, day, hours, minutes);
  }

  function getTimeDifferenceInMinutes(message1, message2) {
    const first = parseDateTime(message1.date, message1.time);
    const second = parseDateTime(message2.date, message2.time);
    if (!first || !second) return null;
    return Math.abs(second - first) / 60000;
  }

  function getRelativeDate(dateString, now = new Date()) {
    const normalizedDate = normalizeDateString(dateString);
    if (!normalizedDate) return '';

    const [day, month, year] = normalizedDate.split('.').map(Number);
    const messageDate = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today - messageDate) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) {
      return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(messageDate);
    }
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(messageDate);
  }

  return {
    cleanDisplayName,
    getRelativeDate,
    getTimeDifferenceInMinutes,
    normalizeDateString,
    parseDateTime,
    parsePrePlainText
  };
});
