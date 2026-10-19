const crypto = require('crypto');
const { parseCookies } = require('./http');

const COOKIE = 'mimate_session';
const MAX_AGE = 60 * 60 * 24 * 7;
const attempts = new Map();

function sha(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function signingKey() {
  return sha('mimate-session:' + (process.env.ADMIN_PASSWORD || ''));
}

function sign(exp) {
  return crypto.createHmac('sha256', signingKey()).update(String(exp)).digest('base64url');
}

function isConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

function passwordOk(input) {
  if (!isConfigured()) return false;
  return crypto.timingSafeEqual(sha(input), sha(process.env.ADMIN_PASSWORD));
}

function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return exp + '.' + sign(exp);
}

function tokenOk(token) {
  if (!isConfigured() || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const exp = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(exp);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isAdmin(req) {
  return tokenOk(parseCookies(req)[COOKIE]);
}

function isHttps(req) {
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function sessionCookie(req, token) {
  const parts = [COOKIE + '=' + token, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=' + MAX_AGE];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(req) {
  const parts = [COOKIE + '=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > 10 * 60 * 1000) return false;
  return entry.count >= 8;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > 10 * 60 * 1000) attempts.set(ip, { first: now, count: 1 });
  else entry.count += 1;
}

function clearFailures(ip) {
  attempts.delete(ip);
}

module.exports = { isConfigured, passwordOk, makeToken, isAdmin, sessionCookie, clearCookie, tooManyAttempts, recordFailure, clearFailures };
