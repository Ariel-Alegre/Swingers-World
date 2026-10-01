const { PhotoRequest, User, Profile } = require('../db');
const { Op } = require('sequelize');
const { getIO } = require('./socket');
const { isProfileComplete } = require('../utils/profileCompletion');
const { getDisplayName, notifyUser } = require('../utils/notificationService');

function emitPhotoAccessChanged(userId) {
  try {
    getIO().to(userId.toString()).emit('discoverProfilesChanged', {
      reason: 'photo_access_changed',
      changedAt: new Date().toISOString(),
    });
  } catch {
    // The HTTP response must not fail if the realtime transport is unavailable.
  }
}

function emitPhotoRequestsChanged(userId) {
  try {
    getIO().to(userId.toString()).emit('photoRequestsChanged', {
      changedAt: new Date().toISOString(),
    });
  } catch {
    // The HTTP response must not fail if the realtime transport is unavailable.
  }
}
const RequestPhotoAccess = async (req, res) => {
  const requesterId = req.userId || req.body.requesterId;
  const { targetUserId } = req.body;

  try {
    if (!targetUserId || requesterId === targetUserId) {
      return res.status(400).json({ message: 'Invalid access request' });
    }

    const [requester, targetUser] = await Promise.all([
      User.findByPk(requesterId, { include: [{ model: Profile }] }),
      User.findByPk(targetUserId, { include: [{ model: Profile }] }),
    ]);

    if (!requester || !isProfileComplete(requester.Profile)) {
      return res.status(403).json({
        code: 'PROFILE_INCOMPLETE',
        message: 'Complete your profile before requesting access to private photos.',
      });
    }

    if (!targetUser || targetUser.Profile?.photosVisible !== false) {
      return res.status(400).json({ message: 'This user does not exist or already has visible photos' });
    }

    const existingRequest = await PhotoRequest.findOne({
      where: { requesterId, targetUserId }
    });
    let photoRequest;

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(409).json({ message: 'You already sent a request to this user' });
      }
      if (
        existingRequest.status === 'accepted' &&
        (!existingRequest.permissionExpiresAt || existingRequest.permissionExpiresAt > new Date())
      ) {
        return res.status(409).json({ message: 'You already have active access to these photos' });
      }
      existingRequest.status = 'pending';
      existingRequest.respondedAt = null;
      existingRequest.permissionExpiresAt = null;
      await existingRequest.save();
      photoRequest = existingRequest;
    } else {
      photoRequest = await PhotoRequest.create({ requesterId, targetUserId });
    }

    await notifyUser({
      userId: targetUserId,
      type: 'photo_request',
      actorName: getDisplayName(requester),
      relatedId: photoRequest.id,
      data: { requesterId, requestId: photoRequest.id },
    }).catch((error) => console.error('Failed to notify the photo owner:', error));

    try {
      getIO().to(targetUserId.toString()).emit('newPhotoRequest', {
        requesterId,
        targetUserId,
      });
      emitPhotoRequestsChanged(targetUserId);
    } catch (socketError) {
      console.warn('Failed to emit the request in real time:', socketError.message);
    }

    
    res.status(201).json({ message: 'Request sent or reactivated' });
  } catch (error) {
    console.error('❌ Photo access request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const GetPhotoRequests = async (req, res) => {
  const userId = req.userId || req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: 'The owner user is required' });
  }
  if (req.userId && req.params.userId && userId !== req.params.userId) {
    return res.status(403).json({ message: "You cannot access another user's permissions" });
  }

  try {
    const photoRequests = await PhotoRequest.findAll({
      where: { targetUserId: userId,}, 
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'backgroundColor'],
          include: [
            {
              model: Profile,
              attributes: ['displayName', 'photos', 'birthDate', 'gender', 'verified', 'description', 'address'],
            },
          ],
        },
      ],
    });

    res.json(photoRequests);
  } catch (error) {
    console.error('❌ Failed to retrieve requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const GetSentPhotoRequests = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication is required' });
  }

  try {
    const photoRequests = await PhotoRequest.findAll({
      where: { requesterId: userId },
      include: [{
        model: User,
        as: 'targetUser',
        attributes: ['id', 'firstName', 'lastName', 'backgroundColor'],
        include: [{
          model: Profile,
          attributes: ['displayName', 'photos', 'photosVisible', 'verified', 'description', 'address'],
        }],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json(photoRequests);
  } catch (error) {
    console.error('Failed to retrieve sent photo requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



const RespondToPhotoRequest = async (req, res) => {
  const { requestId } = req.params;
  const { decision, durationHours } = req.body; 

  try {
    const photoRequest = await PhotoRequest.findByPk(requestId);
    if (!photoRequest) return res.status(404).json({ message: 'Request not found' });
    if (req.userId && photoRequest.targetUserId !== req.userId) {
      return res.status(403).json({ message: 'Only the owner can manage this permission' });
    }

    const targetUser = await User.findByPk(photoRequest.targetUserId, { include: [{ model: Profile }] });
    if (!['accepted', 'rejected', 'pending'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid response' });
    }
    if (decision === "rejected") {
      await photoRequest.destroy();
      emitPhotoAccessChanged(photoRequest.requesterId);
      emitPhotoRequestsChanged(photoRequest.targetUserId);
      await notifyUser({
        userId: photoRequest.requesterId,
        type: "photo_request_rejected",
        actorName: getDisplayName(targetUser),
        relatedId: targetUser.id,
        data: { targetUserId: targetUser.id },
      }).catch((error) => console.error('Failed to notify the photo requester:', error));

      return res.json({ message: "Request rejected and deleted" });
    }

    
    photoRequest.status = decision;
    photoRequest.respondedAt = new Date();
    if (decision === 'accepted' && durationHours !== undefined) {
      const hours = Number(durationHours);
      if (![24, 168].includes(hours)) {
        return res.status(400).json({ message: 'Duration must be either 24 hours or 7 days' });
      }
      photoRequest.permissionExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    } else {
      photoRequest.permissionExpiresAt = null;
    }
    await photoRequest.save();
    emitPhotoAccessChanged(photoRequest.requesterId);
    emitPhotoRequestsChanged(photoRequest.targetUserId);

    await notifyUser({
      userId: photoRequest.requesterId,
      type: decision === 'accepted' ? 'photo_request_accepted' : 'photo_request_pending',
      actorName: getDisplayName(targetUser),
      relatedId: targetUser.id,
      data: { targetUserId: targetUser.id },
    }).catch((error) => console.error('Failed to notify the photo requester:', error));

    res.json({ message: `Photo request ${decision}` });
  } catch (error) {
    console.error("❌ Failed to respond to request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const VerifyPhotoAccess = async (req, res) => {
  const requesterId = req.userId || req.query.requesterId;
  const { targetUserId } = req.query;

  if (!requesterId || !targetUserId) {
    return res.status(400).json({ message: 'requesterId and targetUserId are required' });
  }

  try {
    const photoRequest = await PhotoRequest.findOne({
      where: {
        requesterId,
        targetUserId,
        status: 'accepted',
        [Op.or]: [
          { permissionExpiresAt: null },
          { permissionExpiresAt: { [Op.gt]: new Date() } },
        ],
      },
    });

    res.json({ allowed: !!photoRequest, permissionExpiresAt: photoRequest?.permissionExpiresAt || null });
  } catch (error) {
    console.error('❌ Failed to verify photo access:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const GetAcceptedPhotoRequests = async (req, res) => {
  const userId = req.userId || req.params.userId;

  if (req.userId && req.params.userId && userId !== req.params.userId) {
    return res.status(403).json({ message: "You cannot access another user's permissions" });
  }

  try {
    const photoRequests = await PhotoRequest.findAll({
      where: {
        requesterId: userId,
        status: 'accepted',
        [Op.or]: [
          { permissionExpiresAt: null },
          { permissionExpiresAt: { [Op.gt]: new Date() } },
        ],
      },
    });

    res.json(photoRequests);
  } catch (error) {
    console.error('❌ Failed to retrieve accepted requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
module.exports = { RequestPhotoAccess, GetPhotoRequests, GetSentPhotoRequests, RespondToPhotoRequest, VerifyPhotoAccess, GetAcceptedPhotoRequests};
