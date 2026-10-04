const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const { User, Profile } = require('../src/db');
const { RegisterLifetimeUser } = require('../src/controllers/Admin');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.post('/users/lifetime', RegisterLifetimeUser);
  return app;
}

describe('Administrator lifetime user registration', () => {
  let originalFindOne;
  let originalCreateUser;
  let originalCreateProfile;
  let originalTransaction;

  beforeEach(() => {
    originalFindOne = User.findOne;
    originalCreateUser = User.create;
    originalCreateProfile = Profile.create;
    originalTransaction = User.sequelize.transaction;
  });

  afterEach(() => {
    User.findOne = originalFindOne;
    User.create = originalCreateUser;
    Profile.create = originalCreateProfile;
    User.sequelize.transaction = originalTransaction;
  });

  it('creates an active lifetime account and profile without exposing the password', async () => {
    let savedUser;
    let savedProfile;
    User.findOne = async () => null;
    User.sequelize.transaction = async (callback) => callback({});
    User.create = async (values) => {
      savedUser = values;
      return { id: 'new-user', ...values };
    };
    Profile.create = async (values) => { savedProfile = values; };

    const response = await request(createTestApp())
      .post('/users/lifetime')
      .send({
        firstName: '  Ana ',
        lastName: ' Pérez ',
        email: ' ANA@EXAMPLE.COM ',
        password: 'a-long-password-for-test',
        profileType: 'single',
        gender: 'Female',
        termsAccepted: true,
      })
      .expect(201);

    expect(savedUser).to.include({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      status: 'active',
      plan: 'lifetime',
      subscriptionStatus: 'lifetime',
      acceptedTerms: true,
    });
    expect(savedUser.password).not.to.equal('a-long-password-for-test');
    expect(savedProfile).to.include({ userId: 'new-user', displayName: 'Ana P.', profileType: 'single', gender: 'Female', description: null, publicProfile: true });
    expect(response.body.user).not.to.have.property('password');
    expect(response.body.user.plan).to.equal('lifetime');
  });

  it('creates a couple profile with both names and its composition', async () => {
    let savedProfile;
    User.findOne = async () => null;
    User.sequelize.transaction = async (callback) => callback({});
    User.create = async (values) => ({ id: 'couple-user', ...values });
    Profile.create = async (values) => { savedProfile = values; };

    await request(createTestApp())
      .post('/users/lifetime')
      .send({
        firstName: 'Ana', lastName: 'Pérez', partnerFirstName: 'Luis', partnerLastName: 'Gómez',
        profileType: 'couple', coupleType: 'woman_man', email: 'couple@example.com',
        password: 'a-long-password-for-test', termsAccepted: true,
      })
      .expect(201);

    expect(savedProfile).to.include({
      userId: 'couple-user', displayName: 'Ana P. & Luis G.', profileType: 'couple',
      partnerFirstName: 'Luis', partnerLastName: 'Gómez', coupleType: 'woman_man', gender: null,
    });
  });

  it('rejects a couple without partner details', async () => {
    await request(createTestApp())
      .post('/users/lifetime')
      .send({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', password: 'long-enough-password', profileType: 'couple', termsAccepted: true })
      .expect(400);
  });

  it('rejects registration without adult/terms confirmation', async () => {
    await request(createTestApp())
      .post('/users/lifetime')
      .send({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', password: 'long-enough-password' })
      .expect(400);
  });

  it('rejects duplicate email addresses', async () => {
    User.findOne = async () => ({ id: 'existing-user' });
    await request(createTestApp())
      .post('/users/lifetime')
      .send({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com', password: 'long-enough-password', profileType: 'single', gender: 'Female', termsAccepted: true })
      .expect(409);
  });
});
