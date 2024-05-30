import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { authCharacter } from '../middlewares/auth.middleware.js';
import { usersPrisma, gameDataPrisma } from '../utils/prisma/index.js';

const router = express.Router();

/** 캐릭터가 보유한 인벤토리 내 아이템 목록 조회 API * */
router.get('/users/auth/characters/:characterId/inventory', authMiddleware, authCharacter, async (req, res, next) => {
  try {
    const { characterId } = req.character;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: {
        Inventory: {
          orderBy: { itemCode: 'asc' },
        },
      },
    });

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
