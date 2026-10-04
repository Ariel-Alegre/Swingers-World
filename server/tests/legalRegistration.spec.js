const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const { Register } = require('../src/controllers/User');

describe('Registration legal acknowledgments', () => {
  const app = express();
  app.use(express.json());
  app.post('/register', Register);

  const base = {
    firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com',
    password: 'a-secure-password', acceptedTerms: true,
  };

  it('requires terms acceptance independently', async () => {
    const response = await request(app).post('/register').send({ ...base, acceptedTerms: false, acknowledgedPrivacy: true }).expect(400);
    expect(response.body.code).to.equal('TERMS_REQUIRED');
  });

  it('requires privacy acknowledgment independently', async () => {
    const response = await request(app).post('/register').send({ ...base, acknowledgedPrivacy: false }).expect(400);
    expect(response.body.code).to.equal('PRIVACY_ACKNOWLEDGMENT_REQUIRED');
  });
});
