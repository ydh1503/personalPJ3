import express from 'express';
import UsersRouter from './routes/users.router.js';
import CharactersRouter from './routes/characters.router.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middleware.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api', [UsersRouter, CharactersRouter]);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸습니다.');
});
