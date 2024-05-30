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
        where: { characterName },
      })
    ) {
      return res.status(409).json({ errorMessage: '이미 존재하는 캐릭터 명입니다.' });
    }

    const HEALTH = 500;
    const POWER = 100;
    const MONEY = 10000;

    const character = await usersPrisma.$transaction(async (tx) => {
      const character = await tx.characters.create({
        data: {
          UserId: +userId,
          characterName,
          characterMoney: MONEY,
        },
        select: {
          characterId: true,
        },
      });

      await tx.characterStats.create({
        data: {
          CharacterId: character.characterId,
          health: HEALTH,
          power: POWER,
        },
      });

      return character;
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
        CharacterStat: {
          select: {
            health: true,
            power: true,
          },
        },
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

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: { CharacterStat: true },
    });

    if (!character) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    const data = {
      characterName: character.characterName,
      health: character.CharacterStat.health,
      power: character.CharacterStat.power,
    };

    if (character.UserId === +userId) {
      data.characterMoney = character.characterMoney;
    }

    return res.status(200).json({ message: '캐릭터를 조회 했습니다.', data: data });
  } catch (err) {
    next(err);
  }
});

export default router;
