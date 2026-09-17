import request from 'supertest';
import { app } from '../../src/app';
import { initDb, closeDb } from '../../src/db';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '..', '..', 'data', 'test-routes.db');

beforeAll(async () => {
  process.env.DATABASE_PATH = TEST_DB_PATH;
  await initDb();
});

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('Monitors API', () => {
  let monitorId: number;

  describe('POST /api/monitors', () => {
    it('should create a monitor with valid data', async () => {
      const res = await request(app)
        .post('/api/monitors')
        .send({
          name: 'Test Monitor',
          url: 'https://httpbin.org/status/200',
          method: 'GET',
          expected_status: 200,
          check_interval_seconds: 60
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Monitor');
      expect(res.body.url).toBe('https://httpbin.org/status/200');
      monitorId = res.body.id;
    });

    it('should return 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/monitors')
        .send({
          name: 'Bad Monitor',
          url: 'not-a-valid-url'
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/monitors')
        .send({
          url: 'https://httpbin.org/status/200'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/monitors', () => {
    it('should list all monitors', async () => {
      const res = await request(app).get('/api/monitors');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should filter active monitors', async () => {
      const res = await request(app).get('/api/monitors?active=true');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/monitors/:id', () => {
    it('should get a single monitor', async () => {
      const res = await request(app).get(`/api/monitors/${monitorId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(monitorId);
      expect(res.body.name).toBe('Test Monitor');
    });

    it('should return 404 for non-existent monitor', async () => {
      const res = await request(app).get('/api/monitors/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/monitors/:id', () => {
    it('should update a monitor', async () => {
      const res = await request(app)
        .put(`/api/monitors/${monitorId}`)
        .send({
          name: 'Updated Monitor'
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Monitor');
    });

    it('should return 404 for non-existent monitor', async () => {
      const res = await request(app)
        .put('/api/monitors/99999')
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/monitors/:id', () => {
    it('should delete a monitor', async () => {
      const res = await request(app).delete(`/api/monitors/${monitorId}`);

      expect(res.status).toBe(204);

      const checkRes = await request(app).get(`/api/monitors/${monitorId}`);
      expect(checkRes.status).toBe(404);
    });

    it('should return 404 for non-existent monitor', async () => {
      const res = await request(app).delete('/api/monitors/99999');

      expect(res.status).toBe(404);
    });
  });
});
