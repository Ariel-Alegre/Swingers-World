require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('../utils/jwt');
const { User, Profile, Admin} = require('../db');
const { uploadFile, normalizeStorageReference } = require('../utils/objectStorage');

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getRegistrationSource(user) {
  if (user.plan === 'free' && user.subscriptionStatus === 'free') {
    return 'admin';
  }

  return 'self';
}

function normalizeGenderValue(value) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase();

  if (['male', 'masculino', 'hombre', 'man'].includes(normalized)) {
    return 'Male';
  }

  if (['female', 'femenino', 'mujer', 'woman'].includes(normalized)) {
    return 'Female';
  }

  return null;
}

function normalizeLookingForValue(value) {
  if (!value) return null;

  const normalized = String(value).trim().toLowerCase();

  if (['men', 'hombres', 'hombre', 'male', 'man'].includes(normalized)) {
    return 'Men';
  }

  if (['women', 'mujeres', 'mujer', 'female', 'woman'].includes(normalized)) {
    return 'Women';
  }

  if (['both', 'ambos', 'ambas', 'todos', 'todas'].includes(normalized)) {
    return 'Both';
  }

  return null;
}

module.exports = {
 RegisterAdmin: async (req, res) => {
    const { name, lastName, email, password } = req.body;

    try {
      const registrationSecret = req.headers['x-admin-registration-secret'];
      if (!process.env.ADMIN_REGISTRATION_SECRET || registrationSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
        return res.status(403).json({ message: 'Administrator registration is not authorized.' });
      }


      if (!name || !lastName || !email || !password) {
        return res
          .status(400)
          .json({ message: "All required fields must be completed." });
      }


      const emailExists = await Admin.findOne({ where: { email } });
      if (emailExists) {
        return res
          .status(409)
          .json({ message: "The email address is already registered." });
      }


      const hashedPassword = await bcrypt.hash(password, 10);


      const newAdmin = await Admin.create({
        avatarBackground: getRandomColor(),

        name,
        lastName,
        email,
        password: hashedPassword,
        role: "admin",
      });

      return res.status(201).json({
        message: "Administrator registered successfully.",
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          lastName: newAdmin.lastName,
          email: newAdmin.email,
          avatar: newAdmin.avatar,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "An internal server error occurred.",
        error: error.message,
      });
    }
  },
  LoginAdmin: async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      const admin = await Admin.scope('withPassword').findOne({ where: { email } });
      const passwordIsValid = admin && await bcrypt.compare(password, admin.password);
      if (!passwordIsValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const tokenPayload = {
        id: admin.id,
        name: admin.name,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);

      console.log('✅ Login successful');
      return res.json({
        message: 'Login successful',
        token,
        role: admin.role,

      });

    } catch (error) {
      console.error('⚠️ Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  RegisterFreeUser: async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      password,
    } = req.body;

    try {
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          message: 'First name, last name, email, and password are required.',
        });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ message: 'The email address is already registered.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        backgroundColor: getRandomColor(),
        status: 'active',
        plan: 'free',
        subscriptionStatus: 'free',
        lastPaymentStatus: 'free',
        acceptedTerms: true,
      });

      const profile = await Profile.create({
        userId: user.id,
        displayName: `${firstName} ${lastName}`.trim(),
      });

      return res.status(201).json({
        message: 'Free user registered successfully.',
        user: {
          ...user.toJSON(),
          password: undefined,
          adminVisiblePassword: undefined,
          registrationSource: 'admin',
          Profile: profile,
        },
      });
    } catch (error) {
      console.error('⚠️ Free user registration error:', error);
      return res.status(500).json({
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  UpdateAdminCreatedUserProfile: async (req, res) => {
    const { userId } = req.params;
      const {
        displayName,
        profileType,
        partnerFirstName,
        partnerLastName,
        coupleType,
        gender,
        lookingFor,
        lookingForProfileType,
        lookingForCoupleType,
      birthDate,
      address,
      description,
      publicProfile,
      photosVisible,
      privacyEnabled,
      verified,
      existingPhotos: serializedExistingPhotos,
    } = req.body;

    try {
      const user = await User.findByPk(userId, {
        include: {
          model: Profile,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (getRegistrationSource(user) !== 'admin') {
        return res.status(403).json({
          message: 'Only profiles created by an administrator can be edited from this panel.',
        });
      }

      const profile = user.Profile;
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found.' });
      }

      const normalizedGender = gender !== undefined ? normalizeGenderValue(gender) : profile.gender;
      const normalizedLookingFor = lookingFor !== undefined ? normalizeLookingForValue(lookingFor) : profile.lookingFor;
      const finalLookingForProfileType = lookingForProfileType !== undefined ? String(lookingForProfileType).trim() : profile.lookingForProfileType || 'single';
      const finalLookingForCoupleType = lookingForCoupleType !== undefined ? String(lookingForCoupleType).trim() : profile.lookingForCoupleType;
      const finalProfileType = profileType !== undefined ? String(profileType).trim() : profile.profileType;
      const finalDisplayName = displayName !== undefined ? String(displayName).trim() : profile.displayName;
      const finalPartnerFirstName = partnerFirstName !== undefined ? String(partnerFirstName).trim() : profile.partnerFirstName;
      const finalPartnerLastName = partnerLastName !== undefined ? String(partnerLastName).trim() : profile.partnerLastName;
      const finalCoupleType = coupleType !== undefined ? String(coupleType).trim() : profile.coupleType;

      if (!['single', 'couple'].includes(finalProfileType)) {
        return res.status(400).json({ message: 'The profile type is invalid.' });
      }
      if (!finalDisplayName) {
        return res.status(400).json({ message: 'A display name is required.' });
      }
      if (finalProfileType === 'couple' && (!finalPartnerFirstName || !finalPartnerLastName || !['woman_man', 'two_women', 'two_men', 'other'].includes(finalCoupleType))) {
        return res.status(400).json({ message: 'Partner first name, last name, and couple composition are required.' });
      }
      if (!['single', 'couple'].includes(finalLookingForProfileType)) {
        return res.status(400).json({ message: 'The preferred profile type is invalid.' });
      }
      if (finalLookingForProfileType === 'couple' && !['woman_man', 'two_women', 'two_men', 'other'].includes(finalLookingForCoupleType)) {
        return res.status(400).json({ message: 'The preferred couple composition is required.' });
      }

      let existingPhotos = profile.photos || [];
      if (serializedExistingPhotos) {
        try {
          const parsedPhotos = JSON.parse(serializedExistingPhotos);
          if (Array.isArray(parsedPhotos)) {
            existingPhotos = parsedPhotos
              .filter((url) => typeof url === 'string' && url.trim())
              .map((url) => ({ url: normalizeStorageReference(url) }));
          }
        } catch (error) {
          return res.status(400).json({ message: 'The existing photos format is invalid.' });
        }
      }

      let newPhotos = [];
      if (req.files && req.files.photos) {
        const uploadPromises = req.files.photos.map(async (file) => ({
          url: await uploadFile(file, 'profile-photos'),
        }));

        newPhotos = await Promise.all(uploadPromises);
      }

      const finalPhotos = [...existingPhotos, ...newPhotos].slice(0, 9);

      await profile.update({
        displayName: finalDisplayName,
        profileType: finalProfileType,
        partnerFirstName: finalProfileType === 'couple' ? finalPartnerFirstName : null,
        partnerLastName: finalProfileType === 'couple' ? finalPartnerLastName : null,
        coupleType: finalProfileType === 'couple' ? finalCoupleType : null,
        gender: finalProfileType === 'single' ? normalizedGender : null,
        lookingFor: finalLookingForProfileType === 'single' ? normalizedLookingFor : null,
        lookingForProfileType: finalLookingForProfileType,
        lookingForCoupleType: finalLookingForProfileType === 'couple' ? finalLookingForCoupleType : null,
        birthDate: birthDate || null,
        address: address || null,
        description: description || null,
        publicProfile:
          publicProfile !== undefined
            ? publicProfile === true || publicProfile === 'true'
            : profile.publicProfile,
        photosVisible:
          photosVisible !== undefined
            ? photosVisible === true || photosVisible === 'true'
            : profile.photosVisible,
        privacyEnabled:
          privacyEnabled !== undefined
            ? privacyEnabled === true || privacyEnabled === 'true'
            : profile.privacyEnabled,
        verified:
          verified !== undefined
            ? verified === true || verified === 'true'
            : profile.verified,
        photos: finalPhotos,
      });

      const updatedUser = await User.findByPk(userId, {
        include: {
          model: Profile,
        },
      });

      return res.status(200).json({
        message: 'Profile updated successfully.',
        user: {
          ...updatedUser.toJSON(),
          registrationSource: 'admin',
        },
      });
    } catch (error) {
      console.error('⚠️ Administrator profile update error:', error);
      return res.status(error.status || 500).json({
        code: error.code || 'INTERNAL_ERROR',
        message: error.publicMessage || 'Internal server error',
      });
    }
  },


    GetAllUsers: async (req, res) => {

    try {
       const user = await User.findAll({
        include:{
          model: Profile
        }
       });

       if(!user) {
        console.log("No registered users were found")
        res.status(401).send({message: "No registered users were found"})
       }

        const usersWithSource = user.map((user) => ({
          ...user.toJSON(),
          registrationSource: getRegistrationSource(user),
        }));

        res.status(200).send(usersWithSource)

    } catch (error) {
      console.error('⚠️ Failed to retrieve registered users:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },


    GetUserById: async (req, res) => {
      const {userId} = req.params

    try {
       const user = await User.findByPk(userId, {
              include:[{
          model: Profile
        },
     ]
       });

       if(!user) {
        console.log("User not found")
        res.status(401).send({message: "User not found"})
       }


 return res.status(200).json(user);

    } catch (error) {
      console.error('⚠️ Failed to retrieve user:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },


UpdateUserStatus: async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }


    let newStatus;
    if (user.status === "active") {
      newStatus = "pending";
    } else {
      newStatus = "active";
    }


    user.status = newStatus;
    await user.save();

    console.log(`Status updated to ${newStatus}`);
    return res.status(200).json({ message: 'Status updated', status: newStatus });

  } catch (error) {
    console.error("⚠️ Failed to update user status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
},


GetAdminProfile :async (req, res) => {
  try {
    res.json(req.admin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}


};
