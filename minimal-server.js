import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

const port = 5000;
app.listen(port, () => {
  console.log(`Minimal server running on port ${port}`);
});
