import express from 'express';
import authMiddleware, { authCharacter } from '../middlewares/auth.middleware.js';
import { usersPrisma } from '../utils/prisma/index.js';

const router = express.Router();

/** 게임 머니를 버는 API * */
router.patch('/users/auth/characters/:characterId/earnings', authMiddleware, authCharacter, async (req, res, next) => {
  try {
    const character = req.character;

    const EARNINGS = 100;
    const updatedcharacter = await usersPrisma.characters.update({
      where: { characterId: character.characterId },
      data: {
        characterMoney: { increment: EARNINGS },
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
