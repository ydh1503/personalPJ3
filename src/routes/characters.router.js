import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { usersPrisma } from '../utils/prisma/index.js';

const router = express.Router();

const characterIdSchema = Joi.object({ characterId: Joi.string().required() });

/** 캐릭터 생성 API * */
router.post('/users/auth/characters', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const validation = await Joi.object({ characterName: Joi.string().required() }).validateAsync(req.body);
    const { characterName } = validation;
    if (
      await usersPrisma.characters.findFirst({
        where: {
          characterName,
        },
      })
    ) {
      return res.status(409).json({ errorMessage: '이미 존재하는 캐릭터 명입니다.' });
    }

    const HEALTH = 500;
    const POWER = 100;
    const MONEY = 10000;

    const character = await usersPrisma.characters.create({
      data: {
        UserId: +userId,
        characterName,
        characterStatHealth: HEALTH,
        characterStatPower: POWER,
        characterMoney: MONEY,
      },
      select: {
        characterId: true,
      },
    });

    return res.status(201).json({ message: '캐릭터가 생성되었습니다.', data: character });
  } catch (err) {
    next(err);
  }
});

/** 캐릭터 삭제 API * */
router.delete('/users/auth/characters/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await usersPrisma.characters.findFirst({
      where: {
        UserId: +userId,
        characterId,
      },
    });

    if (!character) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    const name = character.characterName;

    await usersPrisma.characters.delete({
      where: { characterId },
    });

    return res.status(200).json({ message: `캐릭터 '${name}'를 삭제했습니다.` });
  } catch (err) {
    next(err);
  }
});

/** 캐릭터 상세 조회(인증 필요 X) API * */
router.get('/users/characters/:characterId', async (req, res, next) => {
  try {
    const validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      select: {
        characterName: true,
        characterStatHealth: true,
        characterStatPower: true,
      },
    });

    if (!character) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    return res.status(200).json({ message: '캐릭터를 조회 했습니다.', data: character });
  } catch (err) {
    next(err);
  }
});

/** 캐릭터 상세 조회(인증 필요) API * */
router.get('/users/auth/characters/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    let character = await usersPrisma.characters.findFirst({
      where: { characterId },
    });

    if (!character) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    } else if (character.UserId === +userId) {
      character = await usersPrisma.characters.findFirst({
        where: { characterId },
        select: {
          characterName: true,
          characterStatHealth: true,
          characterStatPower: true,
          characterMoney: true,
        },
      });
    } else {
      character = await usersPrisma.characters.findFirst({
        where: { characterId },
        select: {
          characterName: true,
          characterStatHealth: true,
          characterStatPower: true,
        },
      });
    }

    return res.status(200).json({ message: '캐릭터를 조회 했습니다.', data: character });
  } catch (err) {
    next(err);
  }
});

// /** 캐릭터 로그인 API **/
// router.post('/sign-in', async (req, res, next) => {
//   try {
//     const { id, password } = req.body;
//     const user = await usersPrisma.users.findFirst({ where: { id } });

//     if (!user) return res.status(401).json({ message: '존재하지 않는 ID 입니다.' });
//     // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
//     else if (!(await bcrypt.compare(password, user.password)))
//       return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

//     // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
//     const token = jwt.sign(
//       {
//         userId: user.userId,
//       },
//       process.env.JWT_SECRET_KEY // 비밀 키, dotenv를 이용해서 외부에서 코드를 보더라도 알 수 없도록 구현해야합니다.
//     );

//     res.header('authorization', `Bearer ${token}`);
//     return res.status(200).json({ message: '로그인 성공' });
//   } catch (err) {
//     next(err);
//   }
// });

export default router;
