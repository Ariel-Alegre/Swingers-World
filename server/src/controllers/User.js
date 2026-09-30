require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('../utils/jwt');
const { Op } = require('sequelize');
const { User, Profile, Like, Message, PhotoRequest, Notification, PushToken, ContentReport, UserBlock } = require('../db'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { findObjectionableMatch } = require('../utils/safety');
const { getBlockedUserIdsForUser, areUsersBlocked } = require('../utils/blocks');
const { uploadFile, deleteStoredObject, normalizeStorageReference } = require('../utils/objectStorage');
const { matchesProfileSearch } = require('../utils/profileMatching');
const { getIO } = require('./socket');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },

});
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function serializeUser(user) {
  const value = user.toJSON();
  delete value.password;
  delete value.adminVisiblePassword;
  return value;
}

function emitDiscoverProfilesChanged(userIds, reason) {
  try {
    const realtime = getIO();
    const payload = { reason, changedAt: new Date().toISOString() };
    if (Array.isArray(userIds) && userIds.length) {
      for (const userId of new Set(userIds.filter(Boolean))) {
        realtime.to(userId.toString()).emit('discoverProfilesChanged', payload);
      }
      return;
    }
    realtime.emit('discoverProfilesChanged', payload);
  } catch {
    // HTTP operations remain available while Socket.IO is starting or unavailable.
  }
}

function normalizeBooleanInput(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}
const planPriceIds = {
  monthly: 'price_1ScFJdEe7RTtR8KatM8j0aRc',  
  'six_months': 'price_1ScFPtEe7RTtR8KaNYEc9CJT',
  'annual': 'price_1ScFRCEe7RTtR8KaSyN44OoN',
};
const VALID_PROFILE_TYPES = ['single', 'couple'];
const VALID_COUPLE_TYPES = ['woman_man', 'two_women', 'two_men', 'other'];
const VALID_LOOKING_FOR_COUPLE_TYPES = [...VALID_COUPLE_TYPES, 'all'];

async function createBaseProfile(userId, firstName, lastName) {
  const existingProfile = await Profile.findOne({ where: { userId } });
  if (existingProfile) {
    return existingProfile;
  }

  return Profile.create({
    userId,
    displayName: `${firstName} ${lastName.charAt(0)}.`,
    description: null,
    photosVisible: true,
    privacyEnabled: false,
    publicProfile: true,
    verified: false,
  });
}

function mapRevenueCatProductToPlan(productIdentifier) {
  const productMap = {
    'com.swingers.vip.monthly': 'monthly',
    'com.swingers.vip.6months': 'six_months',
    'com.swingers.vip.annual': 'annual',
  };

  return productMap[productIdentifier] || null;
}

function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Token was not provided or is invalid.');
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (err) {
    const error = new Error('Token is invalid or expired.');
    error.status = 401;
    throw error;
  }
}

async function notifyModerationTeam({ type, reporter, reportedUser, reason, details, source }) {
  const moderationEmail = process.env.MODERATION_EMAIL || process.env.EMAIL || 'infoswingersvip@gmail.com';

  if (!moderationEmail) {
    return;
  }

  const reporterName = reporter ? `${reporter.firstName} ${reporter.lastName}`.trim() : 'Unknown user';
  const reportedName = reportedUser ? `${reportedUser.firstName} ${reportedUser.lastName}`.trim() : 'Unknown user';

  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: moderationEmail,
      subject: `[SW VIP] ${type === 'block' ? 'User blocked' : 'User reported'} - ${reason}`,
      html: `
        <h2>Moderation event received</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Source:</strong> ${source || 'profile'}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Reporter:</strong> ${reporterName} (${reporter?.email || 'no-email'})</p>
        <p><strong>Reported user:</strong> ${reportedName} (${reportedUser?.email || 'no-email'})</p>
        <p><strong>Details:</strong> ${details || 'No additional details provided.'}</p>
        <p>Please review and act within 24 hours according to App Review requirements.</p>
      `,
    });
  } catch (error) {
    console.error('⚠️ Failed to send moderation email:', error.message);
  }
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




createPaymentSession: async (req, res) => {
  try {
    const { firstName, lastName, email, password, country, plan, isWeb } = req.body;

    
    if (!planPriceIds[plan]) {
      return res.status(400).json({ message: `The plan "${plan}" does not exist.` });
    }

    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "A user with that email address already exists." });
    }

    
    
    const customer = await stripe.customers.create({
      email: email,
      metadata: { firstName, lastName, email, password, country, plan },
    });
    const customerId = customer.id;

    
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: planPriceIds[plan] }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    
    if (isWeb) {
      
      return res.json({
        paymentIntent: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        customer: customerId,
        isWeb: true
      });
    }

    
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2022-11-15' }
    );

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
    });

  } catch (error) {
    console.error('❌ Failed to create payment session:', error);
    res.status(500).json({ message: 'Failed to create payment session', error: error.message });
  }
},




webhookStripe: async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Error webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Evento recibido:", event.type);

  try {
    if (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
      const invoice = event.data.object;
      const customer = await stripe.customers.retrieve(invoice.customer);
      const metadata = customer.metadata || {};
      const { firstName, lastName, email, country, password, plan } = metadata;

      
      let user = await User.findOne({ where: { email } });

      if (!user) {
        
        const hashedPassword = await bcrypt.hash(password, 10);

        user = await User.create({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          country,
          backgroundColor: getRandomColor(),
          status: "active",
          plan,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: invoice.subscription,
          subscriptionStatus: invoice.status || "active",
          currentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
          lastPaymentStatus: "succeeded",
          acceptedTerms: true,
        });

        await Profile.create({
          userId: user.id,
          displayName: `${firstName} ${lastName.charAt(0)}.`,
          description: null,
          photosVisible: true,
          privacyEnabled: false,
          publicProfile: true,
          verified: false,
        });

        
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: 'Welcome to Swingers VIP!',
          html: `
<html>
  <body style="background-color: #f4f4f4; padding: 2em 0;">
    <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      
      <tr>
        <td style="
          background: linear-gradient(135deg, #363683, #d62874);
          text-align: center;
          padding: 1.5em;
          border-top-left-radius: 10px;
          border-top-right-radius: 10px;
        ">
          <h1 style="color: #fff; margin: 0;">SWINGERS WORLD</h1>
        </td>
      </tr>

      <tr>
        <td style="padding: 2em; color: #333;">
          <h2 style="color: #363683; margin-bottom: 0.5em;">Welcome to Swingers VIP, ${firstName} ${lastName}!</h2>
          
          <p style="color: #444; font-size: 15px;">
            Your account has been successfully created and you are now part of our exclusive community.
          </p>

          <p style="color: #444; font-size: 15px;">
            Explore profiles, connect with like-minded people, and experience new things in a safe, respectful, and completely private environment.
          </p>

          <div style="margin: 2em 0; text-align: center;">
            <a href="https://www.elaritech.com/" target="_blank" style="background-color: #d62874; color: #fff; padding: 0.9em 1.8em; border-radius: 5px; text-decoration: none; font-weight: bold;">
              Access the platform
            </a>
          </div>

          <p style="color: #555; font-size: 14px;">
            Do you have any questions or need assistance? <a href="mailto:info@elaritech.com" style="color: #363683;" target="_blank">Contact us here</a>. Our team is here to help you.
          </p>

          <p style="margin-top: 2.5em; color: #888; font-size: 12px;">
            This email was automatically generated. Please do not reply to this address.
          </p>

          <p style="color: #555; font-size: 13px;">
            — The team of <strong>Swingers VIP</strong>
          </p>
        </td>
      </tr>

    </table>
  </body>
</html>



      `
        });

        console.log("📧 User created and email sent:", email);
      } else {
        
        console.log("ℹ️ User already exists and was not created again:", email);
      }
    } 
    else if (event.type === "invoice.payment_failed" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const affectedUser = await User.findOne({ where: { stripeSubscriptionId: subscription.id } });

      if (affectedUser) {
        await affectedUser.update({
          status: "pending",
          subscriptionStatus: subscription.status || "canceled",
          lastPaymentStatus: "failed",
        });
        console.log("⚠️ Subscription expired or canceled; user marked as pending:", affectedUser.email);
      }
    } 
    else {
      
      console.log("ℹ️ Unhandled Stripe event:", event.type);
    }
  } catch (err) {
    console.error("❌ Event processing error:", err);
  }

  
  res.json({ received: true });
},

webhookRevenueCat: async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (expectedSecret) {
      const expectedAuth = `Bearer ${expectedSecret}`;
      if (authHeader !== expectedAuth) {
        return res.status(401).json({ message: 'Unauthorized RevenueCat webhook.' });
      }
    }

    const event = req.body?.event;

    if (!event) {
      return res.status(400).json({ message: 'Invalid RevenueCat payload.' });
    }

    const {
      type,
      app_user_id,
      original_app_user_id,
      product_id,
      expiration_at_ms,
    } = event;

    const possibleEmails = [app_user_id, original_app_user_id]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());

    if (!possibleEmails.length) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const user = await User.findOne({
      where: {
        email: {
          [Op.in]: possibleEmails,
        },
      },
    });

    if (!user) {
      return res.status(200).json({ received: true, ignored: true, reason: 'user_not_found' });
    }

    const plan = mapRevenueCatProductToPlan(product_id) || user.plan;
    const currentPeriodEnd = expiration_at_ms ? new Date(expiration_at_ms) : user.currentPeriodEnd;

    if (['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'].includes(type)) {
      await user.update({
        status: 'active',
        plan,
        subscriptionStatus: 'active',
        currentPeriodEnd,
        lastPaymentStatus: 'succeeded',
        stripeCustomerId: user.stripeCustomerId || possibleEmails[0],
        stripeSubscriptionId: product_id || user.stripeSubscriptionId,
      });
    } else if (['CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED'].includes(type)) {
      await user.update({
        plan,
        subscriptionStatus: 'canceled',
        currentPeriodEnd,
        lastPaymentStatus: 'failed',
      });
    } else if (['EXPIRATION'].includes(type)) {
      await user.update({
        status: 'pending',
        plan,
        subscriptionStatus: 'expired',
        currentPeriodEnd,
        lastPaymentStatus: 'failed',
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ RevenueCat webhook processing error:', error);
    return res.status(500).json({ message: 'RevenueCat webhook processing error', error: error.message });
  }
},


  Register: async (req, res) => {
    try {
      const {
        firstName, lastName, email, password, country,
        profileType = 'single', gender, partnerFirstName, partnerLastName, coupleType, acceptedTerms,
      } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'All required registration fields must be completed.' });
      }
      if (!VALID_PROFILE_TYPES.includes(profileType)) {
        return res.status(400).json({ code: 'INVALID_PROFILE_TYPE', message: 'The profile type is invalid.' });
      }
      if (!(acceptedTerms === true || acceptedTerms === 'true')) {
        return res.status(400).json({ code: 'TERMS_REQUIRED', message: 'The terms and adult-age confirmation must be accepted.' });
      }

      const normalizedGender = profileType === 'single' ? normalizeGenderValue(gender) : null;
      if (profileType === 'single' && !normalizedGender) {
        return res.status(400).json({ code: 'PROFILE_DETAILS_REQUIRED', message: 'Gender is required for an individual profile.' });
      }
      if (profileType === 'couple' && (!partnerFirstName?.trim() || !partnerLastName?.trim() || !VALID_COUPLE_TYPES.includes(coupleType))) {
        return res.status(400).json({ code: 'PROFILE_DETAILS_REQUIRED', message: 'Partner first name, last name, and couple composition are required.' });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ code: 'EMAIL_ALREADY_REGISTERED', message: 'A user with that email address already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        country,
        role: 'user',
        backgroundColor: getRandomColor(),
        acceptedTerms: true,
        status: 'active',
      });

      const profile = await Profile.create({
        userId: newUser.id,
        displayName: profileType === 'couple'
          ? `${firstName.trim()} ${lastName.trim().charAt(0)}. & ${partnerFirstName.trim()} ${partnerLastName.trim().charAt(0)}.`
          : `${firstName.trim()} ${lastName.trim().charAt(0)}.`,
        profileType,
        gender: normalizedGender,
        partnerFirstName: profileType === 'couple' ? partnerFirstName.trim() : null,
        partnerLastName: profileType === 'couple' ? partnerLastName.trim() : null,
        coupleType: profileType === 'couple' ? coupleType : null,
        description: null,
        photosVisible: true,
        privacyEnabled: false,
        publicProfile: true,
        verified: false,
      });

































































      emitDiscoverProfilesChanged(null, 'profile_created');
      return res.status(201).json({ user: serializeUser(newUser), profile });
    } catch (error) {
      console.error("❌ Internal server error:", error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  RegisterIOSRevenueCatSubscription: async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        country,
        plan,
        acceptedTerms,
        latestExpirationDate,
        revenueCatAppUserId,
        productIdentifier,
      } = req.body;

      if (!firstName || !lastName || !email || !password || !plan) {
        return res.status(400).json({ message: 'Required iOS subscription data is missing.' });
      }

      const validPlans = ['monthly', 'six_months', 'annual'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({ message: 'The selected plan is invalid.' });
      }

      let user = await User.findOne({ where: { email } });

      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);

        user = await User.create({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          country,
          role: 'user',
          backgroundColor: getRandomColor(),
          status: 'active',
          plan,
          subscriptionStatus: 'active',
          currentPeriodEnd: latestExpirationDate ? new Date(latestExpirationDate) : null,
          lastPaymentStatus: 'succeeded',
          acceptedTerms: Boolean(acceptedTerms),
        });
      } else {
        const updatedFields = {
          firstName,
          lastName,
          country,
          status: 'active',
          plan,
          subscriptionStatus: 'active',
          currentPeriodEnd: latestExpirationDate ? new Date(latestExpirationDate) : user.currentPeriodEnd,
          lastPaymentStatus: 'succeeded',
          acceptedTerms: Boolean(acceptedTerms),
        };

        if (revenueCatAppUserId && !user.stripeCustomerId) {
          updatedFields.stripeCustomerId = revenueCatAppUserId;
        }

        if (productIdentifier && !user.stripeSubscriptionId) {
          updatedFields.stripeSubscriptionId = productIdentifier;
        }

        await user.update(updatedFields);
      }

      const profile = await createBaseProfile(user.id, firstName, lastName);

      return res.status(201).json({
        user: serializeUser(user),
        profile,
        message: 'iOS subscription registered successfully.',
      });
    } catch (error) {
      console.error('❌ Failed to register iOS subscription with RevenueCat:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  Login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.scope('withPassword').findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'The email address or password is incorrect.' });
      }

      if (!user.password) {
        return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'The email address or password is incorrect.' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'The email address or password is incorrect.' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15d' }
      );

      return res.status(200).json({ token, user: serializeUser(user) });
    } catch (error) {
      console.error("❌ Internal server error:", error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  GetCurrentUser: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token was not provided or is invalid.' });
      }

      const token = authHeader.split(' ')[1];

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token is invalid or expired.' });
      }

      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
        include: [{ model: Profile }],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      return res.status(200).json(user);
    } catch (error) {
      console.error("❌ Failed to retrieve profile with token:", error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  Profile: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [{ model: Profile }],
      });

      if (!user) {
        return res.status(404).json({ message: 'Profile not found.' });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("❌ Failed to retrieve profile:", error);
      return res.status(500).json({ error: error.message });
    }
  },

UpdateProfile: async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token was not provided or is invalid.' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Token is invalid or expired.' });
    }

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Profile }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const {
      description, address, birthDate, gender, lookingFor, lookingForProfileType, lookingForCoupleType, country,
      publicProfile, photosVisible, latitude, longitude, radius,
      city, region, countryCode, timezone, locationSource, locationTrackingEnabled,
      displayName, partnerFirstName, partnerLastName, coupleType
    } = req.body;

    const objectionableDescriptionMatch = findObjectionableMatch(description);
    if (objectionableDescriptionMatch) {
      return res.status(400).json({
        message: 'The description contains prohibited content and could not be saved.',
        code: objectionableDescriptionMatch,
      });
    }

    const normalizedGender = gender !== undefined ? normalizeGenderValue(gender) : user.Profile.gender;
    const normalizedLookingFor = lookingFor !== undefined ? normalizeLookingForValue(lookingFor) : user.Profile.lookingFor;
    const normalizedPublicProfile = normalizeBooleanInput(publicProfile, user.Profile.publicProfile);
    const normalizedPhotosVisible = normalizeBooleanInput(photosVisible, user.Profile.photosVisible);
    const preferencesProvided = lookingFor !== undefined || lookingForProfileType !== undefined || lookingForCoupleType !== undefined;
    const finalLookingForProfileType = lookingForProfileType !== undefined
      ? String(lookingForProfileType).trim()
      : user.Profile.lookingForProfileType || 'single';
    const finalLookingForCoupleType = lookingForCoupleType !== undefined
      ? String(lookingForCoupleType).trim()
      : user.Profile.lookingForCoupleType;
    const finalDisplayName = displayName !== undefined ? String(displayName).trim() : user.Profile.displayName;
    const finalPartnerFirstName = partnerFirstName !== undefined ? String(partnerFirstName).trim() : user.Profile.partnerFirstName;
    const finalPartnerLastName = partnerLastName !== undefined ? String(partnerLastName).trim() : user.Profile.partnerLastName;
    const finalCoupleType = coupleType !== undefined ? String(coupleType).trim() : user.Profile.coupleType;

    if (!finalDisplayName) {
      return res.status(400).json({ message: 'A display name is required.' });
    }
    if (user.Profile.profileType === 'single' && !normalizedGender) {
      return res.status(400).json({ message: 'Gender is required for an individual profile.' });
    }
    if (user.Profile.profileType === 'couple' && (!finalPartnerFirstName || !finalPartnerLastName || !VALID_COUPLE_TYPES.includes(finalCoupleType))) {
      return res.status(400).json({ message: 'Partner first name, last name, and couple composition are required.' });
    }
    if (preferencesProvided && !VALID_PROFILE_TYPES.includes(finalLookingForProfileType)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'The preferred profile type is invalid.' });
    }
    if (preferencesProvided && finalLookingForProfileType === 'single' && !normalizedLookingFor) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'The preferred person type is required.' });
    }
    if (preferencesProvided && finalLookingForProfileType === 'couple' && !VALID_LOOKING_FOR_COUPLE_TYPES.includes(finalLookingForCoupleType)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'The preferred couple composition is required.' });
    }

    
    let newPhotos = [];
    if (req.files && req.files['photos']) {
      const uploadPromises = req.files['photos'].map(async (file) => ({
        url: await uploadFile(file, 'profile-photos'),
      }));

      newPhotos = await Promise.all(uploadPromises);
    }

    
    
    const existingPhotos = user.Profile.photos || [];
    
    
    
    const finalPhotos = [...existingPhotos, ...newPhotos].slice(0, 9);

    const manualLocation = locationSource === 'manual';
    const parsedLatitude = manualLocation ? null : latitude !== undefined && latitude !== '' ? parseFloat(latitude) : user.Profile.latitude;
    const parsedLongitude = manualLocation ? null : longitude !== undefined && longitude !== '' ? parseFloat(longitude) : user.Profile.longitude;
    const parsedRadius = radius !== undefined && radius !== '' ? parseFloat(radius) : user.Profile.radius;
    const lat = manualLocation ? null : Number.isFinite(parsedLatitude) ? parsedLatitude : user.Profile.latitude;
    const lon = manualLocation ? null : Number.isFinite(parsedLongitude) ? parsedLongitude : user.Profile.longitude;
    const radiusValue = Number.isFinite(parsedRadius) ? parsedRadius : user.Profile.radius;

    if (country !== undefined) {
      await user.update({
        country: country ? String(country).trim() : null,
      });
    }

    
    await Profile.update(
      {
        description,
        address,
        displayName: finalDisplayName,
        partnerFirstName: user.Profile.profileType === 'couple' ? finalPartnerFirstName : null,
        partnerLastName: user.Profile.profileType === 'couple' ? finalPartnerLastName : null,
        coupleType: user.Profile.profileType === 'couple' ? finalCoupleType : null,
        city: city !== undefined ? String(city).trim() || null : user.Profile.city,
        region: region !== undefined ? String(region).trim() || null : user.Profile.region,
        countryCode: countryCode !== undefined ? String(countryCode).trim().toUpperCase() || null : user.Profile.countryCode,
        timezone: timezone !== undefined ? String(timezone).trim() || null : user.Profile.timezone,
        locationTrackingEnabled: locationTrackingEnabled !== undefined
          ? locationTrackingEnabled === true || locationTrackingEnabled === 'true'
          : user.Profile.locationTrackingEnabled,
        latitude: lat,
        longitude: lon,
        birthDate,
        gender: normalizedGender,
        publicProfile: normalizedPublicProfile,
        photosVisible: normalizedPhotosVisible,
        lookingFor: preferencesProvided
          ? finalLookingForProfileType === 'single' ? normalizedLookingFor : null
          : user.Profile.lookingFor,
        lookingForProfileType: preferencesProvided ? finalLookingForProfileType : user.Profile.lookingForProfileType,
        lookingForCoupleType: preferencesProvided && finalLookingForProfileType === 'couple'
          ? finalLookingForCoupleType
          : preferencesProvided ? null : user.Profile.lookingForCoupleType,
        radius: radiusValue,
        
        photos: newPhotos.length > 0 ? finalPhotos : existingPhotos,
      },
      { where: { id: user.Profile.id } }
    );

    emitDiscoverProfilesChanged(null, 'profile_updated');
    return res.status(200).json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('❌ Failed to update profile:', error);
    return res.status(error.status || 500).json({
      code: error.code || 'INTERNAL_ERROR',
      message: error.publicMessage || 'Internal server error',
    });
  }
},
  DeleteProfilePhoto: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token was not provided or is invalid.' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findByPk(decoded.id, { include: [Profile] });
      if (!user || !user.Profile) {
        return res.status(404).json({ message: 'Profile not found.' });
      }

      const requestedUrl = req.query.url;
      if (!requestedUrl) {
        return res.status(400).json({ message: 'Photo URL is required.' });
      }

      const url = normalizeStorageReference(requestedUrl);
      await deleteStoredObject(url);

      
      const updatedPhotos = (user.Profile.photos || []).filter(f => f.url !== url);

      
      await Profile.update({ photos: updatedPhotos }, { where: { id: user.Profile.id } });

      emitDiscoverProfilesChanged(null, 'profile_photo_deleted');
      return res.status(200).json({ message: 'Photo deleted successfully.' });
    } catch (error) {
      console.error('❌ Failed to delete photo:', error);
      return res.status(error.status || 500).json({
        code: error.code || 'INTERNAL_ERROR',
        message: error.publicMessage || 'Internal server error',
      });
    }
  },

  DeleteAccount: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token was not provided or is invalid.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token is invalid or expired.' });
      }

      const user = await User.findByPk(decoded.id, {
        include: [{ model: Profile }],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const profilePhotos = user.Profile?.photos || [];

      for (const photo of profilePhotos) {
        try {
          const photoUrl = normalizeStorageReference(photo?.url);
          if (!photoUrl) continue;

          await deleteStoredObject(photoUrl);
        } catch (storageError) {
          console.error('Failed to delete photo from the bucket:', storageError.message);
        }
      }

      await Like.destroy({
        where: {
          [Op.or]: [
            { userId: user.id },
            { likedUserId: user.id },
          ],
        },
      });

      await Message.destroy({
        where: {
          [Op.or]: [
            { senderId: user.id },
            { receiverId: user.id },
          ],
        },
      });

      await PhotoRequest.destroy({
        where: {
          [Op.or]: [
            { requesterId: user.id },
            { targetUserId: user.id },
          ],
        },
      });

      await Notification.destroy({
        where: { userId: user.id },
      });

      await PushToken.destroy({
        where: { userId: user.id },
      });

      await UserBlock.destroy({
        where: {
          [Op.or]: [
            { blockerId: user.id },
            { blockedUserId: user.id },
          ],
        },
      });

      await ContentReport.destroy({
        where: {
          [Op.or]: [
            { reporterId: user.id },
            { reportedUserId: user.id },
          ],
        },
      });

      if (user.Profile) {
        await user.Profile.destroy();
      }

      await user.destroy();

      return res.status(200).json({ message: 'Account deleted successfully.' });
    } catch (error) {
      console.error('❌ Failed to delete account:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },



  GetProfiles: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token was not provided or is invalid.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token is invalid or expired.' });
      }

      const user = await User.findByPk(decoded.id, {
        include: [{ model: Profile }],
      });

      if (!user || !user.Profile) {
        return res.status(404).json({ message: 'User or profile not found.' });
      }

      const blockedUserIds = await getBlockedUserIdsForUser(user.id);
      const excludedIds = [user.id, ...blockedUserIds];

      const lookingForProfileType = user.Profile.lookingForProfileType || 'single';
      const lookingFor = normalizeLookingForValue(user.Profile.lookingFor);
      const lookingForCoupleType = user.Profile.lookingForCoupleType;

      if (
        (lookingForProfileType === 'single' && !lookingFor)
        || (lookingForProfileType === 'couple' && !VALID_LOOKING_FOR_COUPLE_TYPES.includes(lookingForCoupleType))
      ) {
        return res.status(200).json([]);
      }

      
      const users = await User.findAll({
        where: {
          id: { [Op.notIn]: excludedIds },
        },
        include: [
          {
            model: Profile,
            where: {
              publicProfile: true,
            }
          }
        ],
        attributes: { exclude: ['password'] },
      });

      
      const filteredUsers = users.filter((candidate) => {
        const profile = candidate.Profile;

        const hasValidProfileDetails = profile?.profileType === 'couple'
          ? Boolean(profile.partnerFirstName?.trim() && profile.partnerLastName?.trim() && VALID_COUPLE_TYPES.includes(profile.coupleType))
          : Boolean(normalizeGenderValue(profile?.gender));

        return (
          hasValidProfileDetails &&
          matchesProfileSearch(profile, lookingForProfileType, lookingFor, lookingForCoupleType)
        );
      });
      const acceptedPhotoRequests = filteredUsers.length
        ? await PhotoRequest.findAll({
          where: {
            requesterId: user.id,
            targetUserId: { [Op.in]: filteredUsers.map((candidate) => candidate.id) },
            status: 'accepted',
            [Op.or]: [
              { permissionExpiresAt: null },
              { permissionExpiresAt: { [Op.gt]: new Date() } },
            ],
          },
          attributes: ['targetUserId'],
        })
        : [];
      const accessibleProfileIds = new Set(acceptedPhotoRequests.map((request) => request.targetUserId));
      const profilesWithAccess = filteredUsers.map((candidate) => ({
        ...serializeUser(candidate),
        canViewPrivatePhotos: accessibleProfileIds.has(candidate.id),
      }));

      for (let i = profilesWithAccess.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [profilesWithAccess[i], profilesWithAccess[j]] = [profilesWithAccess[j], profilesWithAccess[i]];
      }
      return res.status(200).json(profilesWithAccess);


    } catch (error) {
      console.error('❌ Failed to retrieve profiles:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  GetIOSCommunityProfiles: async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const blockedUserIds = await getBlockedUserIdsForUser(userId);
      const excludedIds = [userId, ...blockedUserIds];
      const users = await User.findAll({
        where: { id: { [Op.notIn]: excludedIds } },
        include: [{
          model: Profile,
          where: {
            publicProfile: true,
            description: { [Op.ne]: null },
          },
        }],
        attributes: ['id', 'firstName', 'lastName', 'backgroundColor', 'acceptedTerms'],
      });

      const miembros = users
        .filter((entry) => {
          const profile = entry.Profile;
          const hasPhotos = Array.isArray(profile?.photos) && profile.photos.length > 0;
          const hasValidDescription = Boolean(profile?.description?.trim());
          const hasValidProfileDetails = profile?.profileType === 'couple'
            ? Boolean(profile.partnerFirstName?.trim() && profile.partnerLastName?.trim() && VALID_COUPLE_TYPES.includes(profile.coupleType))
            : Boolean(normalizeGenderValue(profile?.gender));
          return entry.acceptedTerms === true && hasPhotos && hasValidDescription && hasValidProfileDetails;
        })
        .map((entry) => ({
          id: entry.id,
          firstName: entry.firstName,
          lastName: entry.lastName,
          backgroundColor: entry.backgroundColor,
          Profile: {
            displayName: entry.Profile?.displayName,
            profileType: entry.Profile?.profileType,
            partnerFirstName: entry.Profile?.partnerFirstName,
            partnerLastName: entry.Profile?.partnerLastName,
            coupleType: entry.Profile?.coupleType,
            photos: entry.Profile?.photos || [],
            photosVisible: entry.Profile?.photosVisible,
            verified: entry.Profile?.verified,
          },
        }));

      for (let i = miembros.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [miembros[i], miembros[j]] = [miembros[j], miembros[i]];
      }

      return res.status(200).json(miembros);
    } catch (error) {
      console.error('Failed to retrieve the iOS community:', error);
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  },

  GetProfile: async (req, res) => {
    try {
      const { id } = req.params;
      let requesterId = null;

      try {
        requesterId = getAuthenticatedUserId(req);
      } catch (error) {
        requesterId = null;
      }

      if (requesterId) {
        const blocked = await areUsersBlocked(requesterId, id);
        if (blocked) {
          return res.status(404).json({ message: 'User not found or unavailable.' });
        }
      }

      const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Profile,
          where: {
            publicProfile: true,
          },
          required: true,
        }],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found or profile is not public.' });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error('❌ Failed to retrieve user details:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  LikeUser: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token was not provided or is malformed.' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Token is invalid or expired.' });
      }

      const userId = decoded.id;
      const { likedUserId } = req.body;

      if (!likedUserId) {
        return res.status(400).json({ message: 'The liked user ID is required.' });
      }

      if (userId === likedUserId) {
        return res.status(400).json({ message: 'You cannot like yourself.' });
      }

      const blocked = await areUsersBlocked(userId, likedUserId);
      if (blocked) {
        return res.status(403).json({ message: 'You cannot interact with this user.' });
      }

      
      const user = await User.findByPk(userId);
      const likedUser = await User.findByPk(likedUserId);

      if (!user || !likedUser) {
        return res.status(404).json({ message: 'One or both users do not exist.' });
      }

      
      const alreadyExists = await Like.findOne({ where: { userId, likedUserId } });
      if (alreadyExists) {
        return res.status(200).json({ message: 'You already liked this profile.' });
      }

      
      const newLike = await Like.create({ userId, likedUserId });
      return res.status(201).json({ message: 'Like saved successfully.', like: newLike });

    } catch (error) {
      console.error('❌ Failed to save like:', error);
      return res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
  },

  GetMyLikes: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Token is required.' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      const likes = await Like.findAll({
        where: { userId },
        include: [{
          model: User,
          as: 'likedUser',
          attributes: ['id', 'firstName', 'lastName', 'backgroundColor'],
          include: ['Profile'],
        }],
      });

      const likedUsers = likes.map((like) => like.likedUser).filter(Boolean);
      const acceptedPhotoRequests = likedUsers.length
        ? await PhotoRequest.findAll({
          where: {
            requesterId: userId,
            targetUserId: { [Op.in]: likedUsers.map((likedUser) => likedUser.id) },
            status: 'accepted',
            [Op.or]: [
              { permissionExpiresAt: null },
              { permissionExpiresAt: { [Op.gt]: new Date() } },
            ],
          },
          attributes: ['targetUserId'],
        })
        : [];
      const accessibleProfileIds = new Set(acceptedPhotoRequests.map((request) => request.targetUserId));

      return res.status(200).json(likedUsers.map((likedUser) => ({
        ...serializeUser(likedUser),
        canViewPrivatePhotos: accessibleProfileIds.has(likedUser.id),
      })));
    } catch (error) {
      console.error('❌ Failed to retrieve likes:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  GetReceivedLikes: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Token is required.' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const blockedUserIds = await getBlockedUserIdsForUser(userId);
      const where = { likedUserId: userId };

      if (blockedUserIds.length) {
        where.userId = { [Op.notIn]: blockedUserIds };
      }

      const likes = await Like.findAll({
        where,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'backgroundColor'],
          include: ['Profile'],
        }],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json(likes.map((like) => like.user).filter(Boolean));
    } catch (error) {
      console.error('Failed to retrieve received likes:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  DeleteLike: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Token is required.' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const likedUserId = req.params.id;

      const deletedCount = await Like.destroy({ where: { userId, likedUserId } });

      if (!deletedCount) {
        return res.status(404).json({ message: 'The profile was not saved in your circle.' });
      }

      return res.status(200).json({ message: 'Profile removed from your circle.' });
    } catch (error) {
      console.error('❌ Failed to remove like:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  ReportUser: async (req, res) => {
    try {
      const reporterId = getAuthenticatedUserId(req);
      const {
        reportedUserId,
        reason,
        details,
        source = 'profile',
      } = req.body;

      if (!reportedUserId || !reason) {
        return res.status(400).json({ message: 'The reported user and reason are required.' });
      }

      if (reportedUserId === reporterId) {
        return res.status(400).json({ message: 'You cannot report yourself.' });
      }

      const [reporter, reportedUser] = await Promise.all([
        User.findByPk(reporterId),
        User.findByPk(reportedUserId),
      ]);

      if (!reporter || !reportedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const report = await ContentReport.create({
        reporterId,
        reportedUserId,
        source,
        reason,
        details: details ? String(details).trim() : null,
        status: 'pending',
        autoBlocked: false,
      });

      await notifyModerationTeam({
        type: 'report',
        reporter,
        reportedUser,
        reason,
        details,
        source,
      });

      return res.status(201).json({
        message: 'Report submitted successfully. Our team will review it within 24 hours.',
        report,
      });
    } catch (error) {
      console.error('❌ Failed to report user:', error);
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  },

  BlockUser: async (req, res) => {
    try {
      const blockerId = getAuthenticatedUserId(req);
      const {
        blockedUserId,
        reason = 'abusive_or_unwanted',
        details,
        source = 'profile',
      } = req.body;

      if (!blockedUserId) {
        return res.status(400).json({ message: 'The user to block is required.' });
      }

      if (blockedUserId === blockerId) {
        return res.status(400).json({ message: 'You cannot block yourself.' });
      }

      const [blocker, blockedUser] = await Promise.all([
        User.findByPk(blockerId),
        User.findByPk(blockedUserId),
      ]);

      if (!blocker || !blockedUser) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const [block] = await UserBlock.findOrCreate({
        where: {
          blockerId,
          blockedUserId,
        },
        defaults: {
          reason,
          details: details ? String(details).trim() : null,
          status: 'active',
        },
      });

      if (block.status !== 'active') {
        await block.update({
          status: 'active',
          reason,
          details: details ? String(details).trim() : null,
        });
      }

      await ContentReport.create({
        reporterId: blockerId,
        reportedUserId: blockedUserId,
        source,
        reason,
        details: details ? String(details).trim() : null,
        status: 'pending',
        autoBlocked: true,
      });

      await notifyModerationTeam({
        type: 'block',
        reporter: blocker,
        reportedUser: blockedUser,
        reason,
        details,
        source,
      });

      emitDiscoverProfilesChanged([blockerId, blockedUserId], 'user_blocked');
      return res.status(200).json({
        message: 'User blocked successfully and removed from your feed.',
      });
    } catch (error) {
      console.error('❌ Failed to block user:', error);
      const status = error.status || 500;
      return res.status(status).json({ message: error.message || 'Internal server error' });
    }
  },

  GetBlockedUsers: async (req, res) => {
    try {
      const blockerId = getAuthenticatedUserId(req);
      const blocks = await UserBlock.findAll({
        where: { blockerId, status: 'active' },
        include: [{
          model: User,
          as: 'blockedUser',
          attributes: ['id', 'firstName', 'lastName', 'backgroundColor'],
          include: [{ model: Profile }],
        }],
        order: [['updatedAt', 'DESC']],
      });

      const blockedUsers = blocks
        .filter((block) => block.blockedUser)
        .map((block) => ({
          ...serializeUser(block.blockedUser),
          blockedAt: block.updatedAt,
        }));

      return res.status(200).json(blockedUsers);
    } catch (error) {
      console.error('Failed to retrieve blocked users:', error);
      return res.status(error.status || 500).json({ message: error.message || 'Internal server error' });
    }
  },

  UnblockUser: async (req, res) => {
    try {
      const blockerId = getAuthenticatedUserId(req);
      const [updatedCount] = await UserBlock.update(
        { status: 'inactive' },
        {
          where: {
            blockerId,
            blockedUserId: req.params.id,
            status: 'active',
          },
        },
      );

      if (!updatedCount) {
        return res.status(404).json({ message: 'Active block not found.' });
      }

      emitDiscoverProfilesChanged([blockerId, req.params.id], 'user_unblocked');
      return res.status(200).json({ message: 'User unblocked successfully.' });
    } catch (error) {
      console.error('Failed to unblock user:', error);
      return res.status(error.status || 500).json({ message: error.message || 'Internal server error' });
    }
  }



};
