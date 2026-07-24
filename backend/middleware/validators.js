const { body, param, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array().map((e) => `${e.path}: ${e.msg}`).join(', '),
    });
  }
  next();
};

const createPreferenceRules = [
  body('appointmentId').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('serviceName').isString().trim().isLength({ min: 1, max: 200 }).escape(),
  body('depositAmount').isFloat({ gt: 0, lt: 1_000_000 }),
  body('clientName').isString().trim().isLength({ min: 1, max: 100 }).escape(),
  body('clientEmail').optional({ checkFalsy: true }).isEmail().isLength({ max: 200 }).normalizeEmail(),
  body('clientPhone').optional({ checkFalsy: true }).matches(/^\+?[\d\s\-()]{6,20}$/),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('startTime').matches(/^\d{2}:\d{2}$/),
  body(['successUrl', 'pendingUrl', 'failureUrl']).optional({ checkFalsy: true }).isURL({ require_tld: false }),
];

const notifyRules = [
  body('clientName').isString().trim().isLength({ min: 1, max: 100 }).escape(),
  body('clientEmail').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('clientPhone').optional({ checkFalsy: true }).matches(/^\+?[\d\s\-()]{6,20}$/),
  body('serviceName').isString().trim().isLength({ min: 1, max: 200 }).escape(),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('startTime').matches(/^\d{2}:\d{2}$/),
];

const rescheduleRules = [
  ...notifyRules,
  body('oldDate').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('oldStartTime').matches(/^\d{2}:\d{2}$/),
];

const idParamRule = [param('id').matches(/^[A-Za-z0-9_\-]{1,80}$/)];

const loginRules = [body('password').isString().isLength({ min: 1, max: 128 })];

const appointmentRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('serviceId').isString().trim().isLength({ min: 1, max: 80 }),
  body('serviceName').isString().trim().isLength({ min: 1, max: 200 }).escape(),
  body('clientName').isString().trim().isLength({ min: 1, max: 100 }).escape(),
  body('clientEmail').optional({ checkFalsy: true }).isEmail().isLength({ max: 200 }).normalizeEmail(),
  body('clientPhone').optional({ checkFalsy: true }).matches(/^\+?[\d\s\-()]{6,20}$/),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('startTime').matches(/^\d{2}:\d{2}$/),
  body('endTime').matches(/^\d{2}:\d{2}$/),
  body('paymentStatus').optional({ checkFalsy: true }).isIn(['pending', 'paid', 'failed']),
  body('depositAmount').optional({ nullable: true }).isFloat({ min: 0, max: 1_000_000 }),
  body('servicePrice').optional({ nullable: true }).isFloat({ min: 0, max: 1_000_000 }),
  body('kind').optional({ checkFalsy: true }).isIn(['service', 'special']),
];

const appointmentPatchRules = [
  body('date').optional({ checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/),
  body('startTime').optional({ checkFalsy: true }).matches(/^\d{2}:\d{2}$/),
  body('endTime').optional({ checkFalsy: true }).matches(/^\d{2}:\d{2}$/),
  body('paymentStatus').optional({ checkFalsy: true }).isIn(['pending', 'paid', 'failed']),
  body('paymentId').optional({ checkFalsy: true }).isString().isLength({ max: 80 }),
  body('preferenceId').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
];

const serviceRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('duration').isInt({ min: 5, max: 600 }),
  body('price').isFloat({ min: 0, max: 10_000_000 }),
  body('imageUrl').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 1_000_000 }),
  body('availableDays').optional({ nullable: true }).isArray(),
  body('sectionId').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 80 }),
];

const blockedDateRules = [
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
  body('reason').optional({ nullable: true }).isString().isLength({ max: 200 }),
];

const scheduleRules = [
  body('schedule').isArray({ min: 7, max: 7 }),
];


const sectionRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('imageUrl').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 1_000_000 }),
];


const specialServiceRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('duration').isInt({ min: 5, max: 600 }),
  body('price').isFloat({ min: 0, max: 10_000_000 }),
  body('imageUrl').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 1_000_000 }),
  body('date').optional({ nullable: true, checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/),
  body('categoryId').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 80 }),
];

const specialCategoryRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('imageUrl').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 1_000_000 }),
];

const promotionRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('imageUrl').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 1_000_000 }),
  body('discountPercent').isFloat({ min: 0, max: 100 }),
  body('items').optional({ nullable: true }).isArray({ max: 100 }),
  body('items.*.id').optional().isString().isLength({ min: 1, max: 80 }),
  body('items.*.type').optional().isIn(['service', 'special']),
];

const uniqueServiceRules = [
  body('id').isString().trim().matches(/^[A-Za-z0-9_\-]{1,80}$/),
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('imageUrl').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 1_000_000 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 40 }),
];

module.exports = {
  handleValidation,
  createPreferenceRules, notifyRules, rescheduleRules,
  idParamRule, loginRules,
  appointmentRules, appointmentPatchRules,
  serviceRules, sectionRules, blockedDateRules, scheduleRules,
  specialServiceRules, specialCategoryRules, promotionRules,
  uniqueServiceRules,
};
