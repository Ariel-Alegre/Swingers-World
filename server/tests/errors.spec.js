const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const {
  requestContext,
  normalizeErrorResponses,
  notFoundHandler,
  errorHandler,
} = require('../src/middleware/errors');

function createTestApp() {
  const app = express();
  app.use(requestContext);
  app.use(normalizeErrorResponses);
  app.use(express.json());
  app.get('/failure', (req, res, next) => next(new Error('sensitive database detail')));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('API error handling', () => {
  let originalConsoleError;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = () => {};
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('returns a traceable and stable response for unknown routes', async () => {
    const response = await request(createTestApp()).get('/missing').expect(404);

    expect(response.body).to.include({
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    });
    expect(response.body.requestId).to.equal(response.headers['x-request-id']);
  });

  it('does not expose internal error details', async () => {
    const response = await request(createTestApp()).get('/failure').expect(500);

    expect(response.body.code).to.equal('INTERNAL_ERROR');
    expect(response.body.message).to.equal('An unexpected server error occurred.');
    expect(JSON.stringify(response.body)).not.to.include('sensitive database detail');
    expect(response.body.requestId).to.equal(response.headers['x-request-id']);
  });

  it('returns a specific code for malformed JSON', async () => {
    const response = await request(createTestApp())
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{invalid')
      .expect(400);

    expect(response.body.code).to.equal('INVALID_JSON');
    expect(response.body.message).to.equal('The request body contains invalid JSON.');
    expect(response.body.requestId).to.equal(response.headers['x-request-id']);
  });
});
