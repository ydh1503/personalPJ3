import express from 'express';
import Joi from 'joi';
import { gameDataPrisma } from '../utils/prisma/index.js';

const router = express.Router();

/** 아이템 생성 API * */
let itemsSchema = Joi.object({
  itemCode: Joi.number().integer(),
  itemName: Joi.string().required(),
  itemStatHealth: Joi.number().integer(),
  itemStatPower: Joi.number().integer(),
  itemPrice: Joi.number().integer().required(),
});

router.post('/items', async (req, res, next) => {
  try {
    const validation = await itemsSchema.validateAsync(req.body);
    const { itemCode, itemName, itemStatHealth, itemStatPower, itemPrice } = validation;

    if (
      await gameDataPrisma.items.findFirst({
        where: {
          OR: [{ itemCode }, { itemName }],
        },
      })
    ) {
      return res.status(409).json({ errorMessage: '이미 존재하는 Item 입니다.' });
    }

    const item = await gameDataPrisma.items.create({
      data: { itemCode, itemName, itemStatHealth, itemStatPower, itemPrice },
    });

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
      itemStatHealth: Joi.number().integer(),
      itemStatPower: Joi.number().integer(),
    }).validateAsync(req.body);
    const updatedData = validation;

    const item = await gameDataPrisma.items.findFirst({
      where: { itemCode },
    });
    if (!item) {
      return res.status(404).json({ errorMessage: 'Item 조회에 실패했습니다.' });
    }
    await gameDataPrisma.items.update({
      data: {
        ...updatedData,
      },
      where: { itemCode },
    });

    const changedData = {};
    for (let key in updatedData) {
      if (item[key] !== updatedData[key]) {
        changedData[key] = `${item[key]} => ${updatedData[key]}`;
        item[key] = updatedData[key];
      }
    }

    return res.status(200).json({ message: 'Item 변경이 완료되었습니다.', changedData, item });
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
