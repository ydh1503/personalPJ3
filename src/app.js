import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api', []);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸습니다.');
});
