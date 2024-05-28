import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { usersPrisma } from '../utils/prisma/index.js';

const router = express.Router();

const characterIdSchema = Joi.object({ characterId: Joi.string().required() });

/** 게임 머니를 버는 API * */
router.patch('/users/auth/characters/:characterId/earnings', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    let validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
    });

    if (!character || character.UserId !== +userId) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    const EARNINGS = 100;
    const updatedcharacter = await usersPrisma.characters.update({
      where: { characterId },
      data: {
        characterMoney: character.characterMoney + EARNINGS,
      },
    });

    return res
      .status(200)
      .json({ message: `${EARNINGS} 골드를 획득했습니다.`, balance: updatedcharacter.characterMoney });
  } catch (err) {
    next(err);
  }
});

export default router;
