#!/usr/bin/env node
import { createHmac, createHash } from 'node:crypto';

const baseUrl = process.env.AGENTFLOW_URL || 'http://localhost:3000';
const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
if (!checksumKey) throw new Error('Set PAYOS_CHECKSUM_KEY in your local shell before running this test. Never commit it.');

const data = {
  orderCode: Number(process.env.TEST_ORDER_CODE || Date.now()),
  amount: Number(process.env.TEST_AMOUNT || 2000),
  description: 'AgentFlow webhook test',
  accountNumber: 'TEST',
  reference: process.env.TEST_REFERENCE || `TEST-${Date.now()}`,
  transactionDateTime: new Date().toISOString(),
  currency: 'VND',
  paymentLinkId: 'TEST-LINK',
  code: '00',
  desc: 'Thành công',
  counterAccountBankId: '',
  counterAccountBankName: '',
  counterAccountName: '',
  counterAccountNumber: '',
  virtualAccountName: '',
  virtualAccountNumber: '',
};
const sorted = Object.keys(data).sort();
const query = sorted.map(k => `${k}=${data[k] ?? ''}`).join('&');
const signature = createHmac('sha256', checksumKey).update(query).digest('hex');
const payload = { code: '00', desc: 'success', success: true, data, signature };

console.log(`POST ${baseUrl}/api/payments/webhook`);
console.log(`reference=${data.reference}, amount=${data.amount} VND`);
console.log('WARNING: this is a signed synthetic webhook. It is NOT a PayOS sandbox transaction. Do not run against production unless the application is explicitly in test mode.');

const response = await fetch(`${baseUrl}/api/payments/webhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
console.log('HTTP', response.status);
console.log(await response.text());
