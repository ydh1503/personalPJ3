import express from 'express';
import Joi from 'joi';
import { gameDataPrisma, usersPrisma } from '../utils/prisma/index.js';
import { Prisma as GameDataPrisma } from '../../prisma/gameDataClient/index.js';
import { Prisma as UsersPrisma } from '../../prisma/usersClient/index.js';

const router = express.Router();

/** 아이템 생성 API * */
let itemsSchema = Joi.object({
  itemCode: Joi.number().integer(),
  itemName: Joi.string().required(),
  itemStat: Joi.object({
    health: Joi.number().integer(),
    power: Joi.number().integer(),
  }),
  itemPrice: Joi.number().integer().required(),
});

router.post('/items', async (req, res, next) => {
  try {
    const validation = await itemsSchema.validateAsync(req.body);
    const { itemCode, itemName, itemStat, itemPrice } = validation;

    if (
      await gameDataPrisma.items.findFirst({
        where: {
          OR: [{ itemCode }, { itemName }],
        },
      })
    ) {
      return res.status(409).json({ errorMessage: '이미 존재하는 Item 입니다.' });
    }

    const [item, stat] = await gameDataPrisma.$transaction(
      async (tx) => {
        const item = await tx.items.create({
          data: { itemCode, itemName, itemPrice },
        });

        const stat = await tx.itemStats.create({
          data: {
            ItemCode: item.itemCode,
            ...itemStat,
          },
        });

        return [item, stat];
      },
      {
        isolationLevel: GameDataPrisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    item.ItemStat = itemStat;

    return res.status(201).json({ message: 'Item이 생성되었습니다.', data: item });
  } catch (err) {
    next(err);
  }
});

/** 아이템 수정 API * */
router.patch('/items/:itemCode', async (req, res, next) => {
  try {
    let validation = await Joi.object({
      itemCode: Joi.number().integer().required(),
    }).validateAsync(req.params);
    const { itemCode } = validation;

    validation = await Joi.object({
      itemName: Joi.string(),
      itemStat: Joi.object({
        health: Joi.number().integer(),
        power: Joi.number().integer(),
      }),
    }).validateAsync(req.body);
    const { itemName, itemStat } = validation;

    if (await gameDataPrisma.items.findFirst({ where: { itemName, NOT: { itemCode } } })) {
      return res.status(409).json({ errorMessage: '이미 존재하는 Item 명입니다.' });
    }

    const item = await gameDataPrisma.items.findFirst({
      where: { itemCode },
      select: {
        itemCode: true,
        itemName: true,
        ItemStat: {
          select: {
            health: true,
            power: true,
          },
        },
      },
    });
    if (!item) {
      return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
    }

    const newItem = await gameDataPrisma.$transaction(
      async (tx) => {
        await tx.itemStats.update({
          data: {
            ...itemStat,
          },
          where: { ItemCode: itemCode },
        });

        const newItem = await tx.items.update({
          data: {
            itemName,
          },
          where: { itemCode },
          select: {
            itemCode: true,
            itemName: true,
            ItemStat: {
              select: {
                health: true,
                power: true,
              },
            },
          },
        });

        // 변경된 스탯을 해당 아이템을 장착한 캐릭터 스탯에도 반영
        await usersPrisma.$transaction(
          async (tx) => {
            const characters = await tx.equipments.findMany({
              where: { itemCode },
              select: { Character: true },
            });

            for (const { Character } of characters) {
              await tx.characters.update({
                where: { characterId: Character.characterId },
                data: {
                  characterStatHealth: Character.characterStatHealth - item.ItemStat.health + newItem.ItemStat.health,
                  characterStatPower: Character.characterStatPower - item.ItemStat.power + newItem.ItemStat.power,
                },
              });
            }
          },
          {
            isolationLevel: UsersPrisma.TransactionIsolationLevel.ReadCommitted,
          }
        );

        return newItem;
      },
      {
        isolationLevel: GameDataPrisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({ message: 'Item 변경이 완료되었습니다.', old: item, new: newItem });
  } catch (err) {
    next(err);
  }
});

/** 아이템 목록 조회 API * */
router.get('/items', async (req, res, next) => {
  try {
    const items = await gameDataPrisma.items.findMany({
      orderBy: { itemCode: 'asc' },
      select: {
        itemCode: true,
        itemName: true,
        itemPrice: true,
      },
    });

    return res.status(200).json({ data: items });
  } catch (err) {
    next(err);
  }
});

/** 아이템 상세 조회 API * */
router.get('/items/:itemCode', async (req, res, next) => {
  try {
    const validation = await Joi.object({
      itemCode: Joi.number().integer().required(),
    }).validateAsync(req.params);
    const { itemCode } = validation;

    const item = await gameDataPrisma.items.findFirst({
      where: { itemCode },
      select: {
        itemCode: true,
        itemName: true,
        ItemStat: {
          select: {
            health: true,
            power: true,
          },
        },
        itemPrice: true,
      },
    });
    if (!item) {
      return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
    }

    return res.status(200).json({ message: 'Item을 조회했습니다.', data: item });
  } catch (err) {
    next(err);
  }
});

export default router;
