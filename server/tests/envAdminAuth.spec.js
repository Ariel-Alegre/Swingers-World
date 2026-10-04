const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const { LoginAdmin } = require('../src/controllers/Admin');
const adminMiddleware = require('../src/middleware/adminMiddleware');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post('/login', LoginAdmin);
  app.get('/me', adminMiddleware, (req, res) => res.json(req.admin));
  return app;
}

describe('Environment administrator login', () => {
  const saved = {};
  const keys = ['ADMIN_LOGIN_EMAIL', 'ADMIN_LOGIN_PASSWORD', 'JWT_SECRET'];

  beforeEach(() => {
    for (const key of keys) saved[key] = process.env[key];
    process.env.ADMIN_LOGIN_EMAIL = 'admin@example.test';
    process.env.ADMIN_LOGIN_PASSWORD = 'test-password-only';
    process.env.JWT_SECRET = 'test-jwt-secret-only';
  });

  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('allows the configured account to access protected admin routes', async () => {
    const app = createTestApp();
    const login = await request(app)
      .post('/login')
      .send({ email: 'ADMIN@example.test', password: 'test-password-only' })
      .expect(200);

    expect(login.body.token).to.be.a('string');
    expect(login.body.role).to.equal('admin');

    const profile = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);
    expect(profile.body.email).to.equal('admin@example.test');
    expect(profile.body).not.to.have.property('authVersion');
  });

  it('rejects a wrong password', async () => {
    await request(createTestApp())
      .post('/login')
      .send({ email: 'admin@example.test', password: 'wrong' })
      .expect(401);
  });

  it('invalidates existing sessions after the password changes', async () => {
    const app = createTestApp();
    const login = await request(app)
      .post('/login')
      .send({ email: 'admin@example.test', password: 'test-password-only' })
      .expect(200);

    process.env.ADMIN_LOGIN_PASSWORD = 'changed-password';
    await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(401);
  });
});
