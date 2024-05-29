import express from 'express';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { usersPrisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

dotenv.config();

const router = express.Router();

const signUpSchema = Joi.object({
  id: Joi.string()
    .pattern(new RegExp(/^[a-z|0-9]+$/))
    .required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().min(6).required(),
  name: Joi.string().required(),
});

/** 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  try {
    const validation = await signUpSchema.validateAsync(req.body);
    const { id, password, confirmPassword, name } = validation;
    if (password !== confirmPassword) {
      return res.status(401).json({ message: '비밀번호 확인이 일치하지 않습니다.' });
    }

    const isExistUser = await usersPrisma.users.findFirst({
      where: {
        id,
      },
    });

    if (isExistUser) {
      return res.status(409).json({ message: '이미 존재하는 ID 입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Users 테이블에 사용자를 추가합니다.
    const user = await usersPrisma.users.create({
      data: {
        id,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ message: '회원가입이 완료되었습니다.', data: user });
  } catch (err) {
    next(err);
  }
});

/** 로그인 API **/
router.post('/sign-in', async (req, res, next) => {
  try {
    const { id, password } = req.body;
    const user = await usersPrisma.users.findFirst({ where: { id } });

    if (!user) return res.status(401).json({ message: '존재하지 않는 ID 입니다.' });
    // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
    else if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
    const token = jwt.sign(
      {
        userId: user.userId,
      },
      process.env.JWT_SECRET_KEY // 비밀 키, dotenv를 이용해서 외부에서 코드를 보더라도 알 수 없도록 구현해야합니다.
    );

    res.header('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: '로그인 성공' });
  } catch (err) {
    next(err);
  }
});

/** 사용자 조회 API **/
router.get('/users', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await usersPrisma.users.findFirst({
      where: { userId: +userId },
      select: {
        userId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        Characters: {
          select: {
            characterName: true,
            characterId: true,
          },
        },
      },
    });

    return res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
