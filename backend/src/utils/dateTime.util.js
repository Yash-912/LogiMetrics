/**
 * Date/Time Utility Functions
 */

const moment = require('moment');

/**
 * Format date to ISO string
 */
function toISOString(date) {
  return moment(date).toISOString();
}

/**
 * Format date for display
 */
function formatDate(date, format = 'DD/MM/YYYY') {
  return moment(date).format(format);
}

/**
 * Format datetime for display
 */
function formatDateTime(date, format = 'DD/MM/YYYY HH:mm') {
  return moment(date).format(format);
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
function getRelativeTime(date) {
  return moment(date).fromNow();
}

/**
 * Add time to date
 */
function addTime(date, amount, unit = 'days') {
  return moment(date).add(amount, unit).toDate();
}

/**
 * Subtract time from date
 */
function subtractTime(date, amount, unit = 'days') {
  return moment(date).subtract(amount, unit).toDate();
}

/**
 * Check if date is past
 */
function isPast(date) {
  return moment(date).isBefore(moment());
}

/**
 * Check if date is future
 */
function isFuture(date) {
  return moment(date).isAfter(moment());
}

/**
 * Get start of day
 */
function startOfDay(date = new Date()) {
  return moment(date).startOf('day').toDate();
}

/**
 * Get end of day
 */
function endOfDay(date = new Date()) {
  return moment(date).endOf('day').toDate();
}

/**
 * Get start of week
 */
function startOfWeek(date = new Date()) {
  return moment(date).startOf('week').toDate();
}

/**
 * Get start of month
 */
function startOfMonth(date = new Date()) {
  return moment(date).startOf('month').toDate();
}

/**
 * Calculate difference between dates
 */
function dateDiff(date1, date2, unit = 'days') {
  return moment(date1).diff(moment(date2), unit);
}

/**
 * Check if date is within range
 */
function isWithinRange(date, startDate, endDate) {
  return moment(date).isBetween(startDate, endDate, null, '[]');
}

/**
 * Format duration in human readable format
 */
function formatDuration(seconds) {
  const duration = moment.duration(seconds, 'seconds');
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get business days between dates
 */
function getBusinessDays(startDate, endDate) {
  let count = 0;
  const current = moment(startDate);
  const end = moment(endDate);

  while (current.isSameOrBefore(end)) {
    if (current.day() !== 0 && current.day() !== 6) {
      count++;
    }
    current.add(1, 'day');
  }

  return count;
}

/**
 * Get ETA with buffer
 */
function getETAWithBuffer(estimatedMinutes, bufferPercentage = 15) {
  const buffer = Math.ceil(estimatedMinutes * (bufferPercentage / 100));
  return {
    eta: addTime(new Date(), estimatedMinutes, 'minutes'),
    etaWithBuffer: addTime(new Date(), estimatedMinutes + buffer, 'minutes'),
    durationMinutes: estimatedMinutes,
    bufferMinutes: buffer
  };
}

module.exports = {
  toISOString,
  formatDate,
  formatDateTime,
  getRelativeTime,
  addTime,
  subtractTime,
  isPast,
  isFuture,
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  dateDiff,
  isWithinRange,
  formatDuration,
  getBusinessDays,
  getETAWithBuffer
};
