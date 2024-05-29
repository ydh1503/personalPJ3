import express from 'express';
import Joi from 'joi';
import authMiddleware from '../middlewares/auth.middleware.js';
import { usersPrisma, gameDataPrisma } from '../utils/prisma/index.js';
import { Prisma } from '../../prisma/usersClient/index.js';

const router = express.Router();

const characterIdSchema = Joi.object({ characterId: Joi.string().required() });

const itemSchema = Joi.object({
  itemCode: Joi.number().integer().required(),
  itemCount: Joi.number().integer().min(1).required(),
});

/** 아이템 구입 API * */
router.post('/users/auth/characters/:characterId/trading', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    let validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: { Inventory: true },
    });

    if (!character || character.UserId !== +userId) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    validation = await itemSchema.validateAsync(req.body);
    const { itemCode, itemCount } = validation;

    const item = await gameDataPrisma.items.findFirst({
      where: { itemCode },
    });

    if (!item) {
      return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
    }

    const totalPrice = item.itemPrice * itemCount;
    const balance = character.characterMoney - totalPrice;

    if (balance < 0) {
      return res.status(401).json({
        errorMessage: `보유한 금액 ${character.characterMoney} 이 구매하려는 Item의 가격 ${totalPrice} 보다 적습니다.`,
      });
    }

    const updatedcharacter = await usersPrisma.$transaction(
      async (tx) => {
        const existingItem = character.Inventory.find((item) => item.itemCode === itemCode);
        if (existingItem) {
          await tx.inventories.update({
            data: { itemCount: existingItem.itemCount + itemCount },
            where: { inventoryId: existingItem.inventoryId },
          });
        } else {
          await tx.inventories.create({
            data: {
              CharacterId: characterId,
              itemCode,
              itemCount,
            },
          });
        }

        const updatedcharacter = await tx.characters.update({
          data: {
            characterMoney: balance,
          },
          where: { characterId },
        });

        return updatedcharacter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({
      message: `${item.itemName} * ${itemCount} 구매를 완료했습니다.`,
      balance: updatedcharacter.characterMoney,
    });
  } catch (err) {
    next(err);
  }
});

/** 아이템 판매 API * */
const itemsSchema = Joi.array().items(
  Joi.object({
    itemCode: Joi.number().integer().required(),
    itemCount: Joi.number().integer().min(1).required(),
  })
);
router.delete('/users/auth/characters/:characterId/trading', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;
    let validation = await characterIdSchema.validateAsync(req.params);
    const { characterId } = validation;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: { Inventory: true },
    });

    if (!character || character.UserId !== +userId) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    validation = await itemsSchema.validateAsync(req.body);
    const items = validation;
    const existingItems = [];
    const soldItems = [];
    let totalPrice = 0;

    for (const { itemCode, itemCount } of items) {
      const item = await gameDataPrisma.items.findFirst({
        where: { itemCode },
      });

      if (!item) {
        return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
      }

      const existingItem = character.Inventory.find((item) => item.itemCode === itemCode);

      if (!existingItem) {
        return res.status(404).json({ errorMessage: '인벤토리 내 Item 조회에 실패했습니다.' });
      } else if (existingItem.itemCount < itemCount) {
        return res.status(401).json({
          errorMessage: `판매하려는 아이템 '${item.itemName}' 의 개수 ${itemCount} 가 보유하고 있는 아이템의 개수 ${existingItem.itemCount} 보다 많습니다.`,
        });
      }
      existingItem.itemCount -= itemCount;
      existingItems.push(existingItem);
      totalPrice += parseInt(item.itemPrice * itemCount * 0.6);
      soldItems.push(`${item.itemName}*${itemCount}`);
    }

    const updatedcharacter = await usersPrisma.$transaction(
      async (tx) => {
        for (const existingItem of existingItems) {
          if (existingItem.itemCount === 0) {
            await tx.inventories.delete({
              where: { inventoryId: existingItem.inventoryId },
            });
          } else {
            await tx.inventories.update({
              data: { itemCount: existingItem.itemCount },
              where: { inventoryId: existingItem.inventoryId },
            });
          }
        }

        const updatedcharacter = await tx.characters.update({
          data: {
            characterMoney: { increment: totalPrice },
          },
          where: { characterId },
        });

        return updatedcharacter;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(201).json({
      message: `${soldItems} 판매를 완료했습니다.`,
      balance: updatedcharacter.characterMoney,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
