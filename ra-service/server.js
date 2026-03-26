import app from './src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5300;

const server = app.listen(PORT, () => {
  console.log(`RA microservice running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
