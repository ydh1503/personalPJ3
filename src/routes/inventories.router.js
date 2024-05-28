import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { usersPrisma } from '../utils/prisma/index.js';
import { gameDataPrisma } from '../utils/prisma/index.js';

const router = express.Router();

const characterIdSchema = Joi.object({ characterId: Joi.string().required() });

/** 캐릭터가 보유한 인벤토리 내 아이템 목록 조회 API * */
router.get('/users/auth/characters/:characterId/inventory', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: {
        Inventory: {
          orderBy: { itemCode: 'asc' },
        },
      },
    });

    if (!character || character.UserId !== +userId) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    const data = [];
    for (const { itemCode, itemCount } of character.Inventory) {
      const item = await gameDataPrisma.items.findFirst({
        where: { itemCode },
      });

      data.push({
        itemCode,
        itemName: item.itemName,
        itemCount,
      });
    }
    return res.status(200).json({ data: data });
  } catch (err) {
    next(err);
  }
});

export default router;
