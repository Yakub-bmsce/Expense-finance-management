const express = require('express');
const { getExpenses, createExpense, updateExpense, deleteExpense, getBalances, settleUp } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getExpenses);
router.post('/create', protect, createExpense);
router.put('/:id', protect, updateExpense);
router.delete('/:id', protect, deleteExpense);
router.get('/balances', protect, getBalances);
router.post('/settle', protect, settleUp);

module.exports = router;
