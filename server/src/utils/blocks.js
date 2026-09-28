const { Op } = require('sequelize');
const { UserBlock } = require('../db');

async function getBlockedUserIdsForUser(userId) {
  if (!userId) {
    return [];
  }

  const rows = await UserBlock.findAll({
    where: {
      status: 'active',
      [Op.or]: [
        { blockerId: userId },
        { blockedUserId: userId },
      ],
    },
    attributes: ['blockerId', 'blockedUserId'],
  });

  const blockedIds = new Set();

  for (const row of rows) {
    const plain = row.get({ plain: true });
    if (plain.blockerId === userId) {
      blockedIds.add(plain.blockedUserId);
    }
    if (plain.blockedUserId === userId) {
      blockedIds.add(plain.blockerId);
    }
  }

  return Array.from(blockedIds);
}

async function areUsersBlocked(userAId, userBId) {
  if (!userAId || !userBId) {
    return false;
  }

  const existingBlock = await UserBlock.findOne({
    where: {
      status: 'active',
      [Op.or]: [
        { blockerId: userAId, blockedUserId: userBId },
        { blockerId: userBId, blockedUserId: userAId },
      ],
    },
  });

  return Boolean(existingBlock);
}

module.exports = {
  getBlockedUserIdsForUser,
  areUsersBlocked,
};
