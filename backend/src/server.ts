import cors from 'cors';
import express from 'express';
import api from './routes/api.js';
import { env } from './config/env.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', api);

app.listen(env.port, () => {
  console.log(`Intake & Requisition API running on http://localhost:${env.port}`);
});
