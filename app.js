import express from 'express';
import cors from 'cors';
import masterRoutes from './routes/masterRoutes.js';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
const app = express();
const port = 3002;

// Use express.json() to parse incoming JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(cors());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

app.use(masterRoutes);
app.use(authRoutes);
app.use(transactionRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});