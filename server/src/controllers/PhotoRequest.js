const { PhotoRequest, Notification, User, Profile } = require('../db');
const { Expo } = require('expo-server-sdk');
const { Op } = require('sequelize');
const { getIO } = require('./socket');
const { sendExpoPushNotifications } = require('../utils/pushNotifications');
const RequestPhotoAccess = async (req, res) => {
  const requesterId = req.userId || req.body.requesterId;
  const { targetUserId } = req.body;

  try {
    if (!targetUserId || requesterId === targetUserId) {
      return res.status(400).json({ message: 'Invalid access request' });
    }

    const targetUser = await User.findByPk(targetUserId, {
      include: [{ model: Profile }]
    });

    if (!targetUser || targetUser.Profile?.photosVisible !== false) {
      return res.status(400).json({ message: 'This user does not exist or already has visible photos' });
    }

    const existingRequest = await PhotoRequest.findOne({
      where: { requesterId, targetUserId }
    });

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
    } else {
      await PhotoRequest.create({ requesterId, targetUserId });
    }

    await Notification.create({
      userId: targetUserId,
      type: 'photo_request',
      description: 'Someone wants to view your private photos',
    });

    try {
      getIO().to(targetUserId.toString()).emit('newPhotoRequest', {
        requesterId,
        targetUserId,
      });
    } catch (socketError) {
      console.warn('Failed to emit the request in real time:', socketError.message);
    }

    
if (targetUser.pushToken && Expo.isExpoPushToken(targetUser.pushToken)) {
  const messages = [{
    to: targetUser.pushToken,
    sound: 'default',
    title: 'Private photo request',
    body: 'Someone wants to view your private photos',
    data: {
      screen: 'Requests',
        params: { type: 'photo_request' }
    },
  }];

  await sendExpoPushNotifications(messages);
  console.log('✅ Notification sent to the target user');
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

    const targetUser = await User.findByPk(photoRequest.targetUserId); 
    const requester = await User.findByPk(photoRequest.requesterId); 

    if (!['accepted', 'rejected', 'pending'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid response' });
    }
 let notificationTitle = "";
    let notificationBody = "";
    let destinationScreen = 'Profile';
function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

    if (decision === "rejected") {
      await photoRequest.destroy();
      notificationTitle = `${capitalize(targetUser.firstName)} ${capitalize(targetUser.lastName)}`;
      notificationBody = "Your request to view photos was rejected.";

      await Notification.create({
        userId: photoRequest.requesterId,
        type: "photo_response",
        description: notificationBody,
      });

      if (requester?.pushToken && Expo.isExpoPushToken(requester.pushToken)) {
        await sendExpoPushNotifications([
          {
            to: requester.pushToken,
            sound: "default",
            title: notificationTitle,
            body: notificationBody,
            data: { 
              screen: destinationScreen, 
              params: { type: "photo_request_response", targetUserId: targetUser.id }
            },
          },
        ]);
        console.log("✅ Notification sent to requester (rejected)");
      }

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

    if (decision === "accepted") {
      notificationTitle = `${capitalize(targetUser.firstName)} ${capitalize(targetUser.lastName)}`;

      notificationBody = "You were granted access to the private photos.";
    } else {
        notificationTitle = `${capitalize(targetUser.firstName)} ${capitalize(targetUser.lastName)}`;

      notificationBody = "The request was marked as pending.";
    }

    await Notification.create({
      userId: photoRequest.requesterId,
      type: "photo_response",
      description: notificationBody,
    });

    if (requester?.pushToken && Expo.isExpoPushToken(requester.pushToken)) {
      await sendExpoPushNotifications([
        {
          to: requester.pushToken,
          sound: "default",
          title: notificationTitle,
          body: notificationBody,
          data: { 
            screen: destinationScreen, 
            params: { type: "photo_request_response", targetUserId: targetUser.id }
          },
        },
      ]);
      console.log(`✅ Notification sent to requester (${decision})`);
    }

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
