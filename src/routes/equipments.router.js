import express from 'express';
import Joi from 'joi';
import authMiddleware, { authCharacter } from '../middlewares/auth.middleware.js';
import { usersPrisma, gameDataPrisma } from '../utils/prisma/index.js';
import { Prisma } from '../../prisma/usersClient/index.js';

const router = express.Router();

/** 캐릭터가 장착한 아이템 목록 조회 API * */
router.get('/users/characters/:characterId/equipments', async (req, res, next) => {
  try {
    const { characterId } = req.params;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: {
        Equipment: {
          orderBy: { itemCode: 'asc' },
        },
      },
    });

    if (!character) {
      return res.status(404).json({ errorMessage: '캐릭터 조회에 실패했습니다.' });
    }

    return res.status(200).json({
      Equipment: await Promise.all(
        character.Equipment.map(
          async (item) =>
            await gameDataPrisma.items.findFirst({
              where: { itemCode: item.itemCode },
              select: { itemCode: true, itemName: true },
            })
        )
      ),
    });
  } catch (err) {
    next(err);
  }
});

/** 아이템 장착 API * */
const itemSchema = Joi.object({
  itemCode: Joi.number().integer().required(),
});

router.post('/users/auth/characters/:characterId/equipments', authMiddleware, authCharacter, async (req, res, next) => {
  try {
    const validation = await itemSchema.validateAsync(req.body);
    const { itemCode } = validation;

    const item = await gameDataPrisma.items.findFirst({
      where: { itemCode },
      include: {
        ItemStat: true,
      },
    });
    if (!item) {
      return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
    }

    const { characterId } = req.character;

    const character = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: {
        CharacterStat: true,
        Inventory: true,
        Equipment: { orderBy: { itemCode: 'asc' } },
      },
    });

    const existingItem = character.Inventory.find((item) => item.itemCode === itemCode);
    if (!existingItem) {
      return res.status(404).json({ errorMessage: '인벤토리 내에 해당 아이템이 존재하지 않습니다.' });
    }

    if (character.Equipment.find((item) => item.itemCode === itemCode)) {
      return res.status(400).json({ errorMessage: '이미 장착하고 있는 아이템입니다.' });
    }

    // 아이템 장착
    await usersPrisma.$transaction(
      async (tx) => {
        // 장착 테이블에 추가
        await tx.equipments.create({
          data: {
            CharacterId: characterId,
            itemCode,
          },
        });

        // 인벤토리 테이블에서 제거
        if (existingItem.itemCount === 1) {
          await tx.inventories.delete({
            where: { inventoryId: existingItem.inventoryId },
          });
        } else {
          await tx.inventories.update({
            where: { inventoryId: existingItem.inventoryId },
            data: {
              itemCount: { decrement: 1 },
            },
          });
        }

        // 캐릭터 스텟 변경
        await tx.characterStats.update({
          where: { CharacterId: characterId },
          data: {
            health: { increment: +item.ItemStat.health },
            power: { increment: +item.ItemStat.power },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    const updatedCharacter = await usersPrisma.characters.findFirst({
      where: { characterId },
      include: { CharacterStat: true, Equipment: { orderBy: { itemCode: 'asc' } } },
    });

    return res.status(200).json({
      data: {
        characterName: character.characterName,
        health: character.CharacterStat.health,
        power: character.CharacterStat.power,
        Equipment: await Promise.all(
          character.Equipment.map(
            async (item) =>
              await gameDataPrisma.items.findFirst({
                where: { itemCode: item.itemCode },
                select: { itemCode: true, itemName: true },
              })
          )
        ),
      },
      updatedData: {
        characterName: updatedCharacter.characterName,
        health: updatedCharacter.CharacterStat.health,
        power: updatedCharacter.CharacterStat.power,
        Equipment: await Promise.all(
          updatedCharacter.Equipment.map(
            async (item) =>
              await gameDataPrisma.items.findFirst({
                where: { itemCode: item.itemCode },
                select: { itemCode: true, itemName: true },
              })
          )
        ),
      },
    });
  } catch (err) {
    next(err);
  }
});

/** 아이템 탈착 API * */
router.delete(
  '/users/auth/characters/:characterId/equipments',
  authMiddleware,
  authCharacter,
  async (req, res, next) => {
    try {
      const validation = await itemSchema.validateAsync(req.body);
      const { itemCode } = validation;

      const item = await gameDataPrisma.items.findFirst({
        where: { itemCode },
        include: {
          ItemStat: true,
        },
      });
      if (!item) {
        return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
      }

      const { characterId } = req.character;

      const character = await usersPrisma.characters.findFirst({
        where: { characterId },
        include: {
          CharacterStat: true,
          Inventory: true,
          Equipment: { orderBy: { itemCode: 'asc' } },
        },
      });

      const equipingItem = character.Equipment.find((item) => item.itemCode === itemCode);
      if (!equipingItem) {
        return res.status(400).json({ errorMessage: '장착 중인 아이템이 아닙니다.' });
      }

      // 아이템 탈착
      await usersPrisma.$transaction(
        async (tx) => {
          // 장착 테이블에서 제거
          await tx.equipments.delete({
            where: { equipmentId: equipingItem.equipmentId },
          });

          // 인벤토리 테이블에 추가
          const existingItem = character.Inventory.find((item) => item.itemCode === itemCode);
          if (!existingItem) {
            await tx.inventories.create({
              data: {
                CharacterId: characterId,
                itemCode,
                itemCount: 1,
              },
            });
          } else {
            await tx.inventories.update({
              where: { inventoryId: existingItem.inventoryId },
              data: {
                itemCount: { increment: 1 },
              },
            });
          }

          // 캐릭터 스텟 변경
          await tx.characterStats.update({
            where: { CharacterId: characterId },
            data: {
              health: { decrement: +item.ItemStat.health },
              power: { decrement: +item.ItemStat.power },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        }
      );

      const updatedCharacter = await usersPrisma.characters.findFirst({
        where: { characterId },
        include: { CharacterStat: true, Equipment: { orderBy: { itemCode: 'asc' } } },
      });

      return res.status(200).json({
        data: {
          characterName: character.characterName,
          characterStatHealth: character.CharacterStat.health,
          characterStatPower: character.CharacterStat.power,
          Equipment: await Promise.all(
            character.Equipment.map(
              async (item) =>
                await gameDataPrisma.items.findFirst({
                  where: { itemCode: item.itemCode },
                  select: { itemCode: true, itemName: true },
                })
            )
          ),
        },
        updatedData: {
          characterName: updatedCharacter.characterName,
          health: updatedCharacter.CharacterStat.health,
          power: updatedCharacter.CharacterStat.power,
          Equipment: await Promise.all(
            updatedCharacter.Equipment.map(
              async (item) =>
                await gameDataPrisma.items.findFirst({
                  where: { itemCode: item.itemCode },
                  select: { itemCode: true, itemName: true },
                })
            )
          ),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
