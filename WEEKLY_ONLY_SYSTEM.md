# 📊 Weekly-Only Impact Meal Management System

## Overview

The system has been refactored to implement a **week-only impact** approach where advance payments and due adjustments only affect the specific week they are applied to, rather than carrying forward to subsequent weeks.

## 🔄 New Calculation Logic

### Previous System (Carry-Forward)
- Week 1: Balance = Previous + Purchases + Advance Payments - Meal Cost
- Week 2: Balance = **Week 1 Carry Forward** + Week 2 Data - Week 2 Cost
- Advance payments affected all future weeks

### New System (Week-Only Impact)
- Week 1: Balance = Previous **Purchases Only** + Week 1 Purchases + Week 1 Advance Payments - Week 1 Meal Cost
- Week 2: Balance = Previous **Purchases Only** + Week 2 Purchases + Week 2 Advance Payments - Week 2 Meal Cost
- **Advance payments only affect the specific week they are added to**

## 📋 Key Changes

### 1. WeeklyBalance Model Updates
- `purchaseCarryFromPreviousWeek`: Only purchases carry forward (not advance payments)
- `purchaseCarryForward`: Purchases available for next week
- `totalDueAdjustments`: Sum of all admin adjustments for this week
- `adjustedBalance`: Final balance after admin adjustments
- `advanceToNextWeek`: Always 0 (no advance carry-forward)

### 2. New DueAdjustment Model
- Tracks all direct admin adjustments to user balances
- Supports credit, debit, and clear_due operations
- Maintains audit trail with reason codes
- Links to specific week/month/year

### 3. Enhanced Admin Controls
- **Direct Due Adjustments**: Modify user balance without adding advance payment
- **Week-Specific Impact**: Changes only affect the selected week
- **Audit Trail**: Full history of all adjustments made

## 🔧 Admin Features

### Advance Payment Management
- Add advance payments that only affect the specific week
- No carry-forward to future weeks
- Automatic recalculation of affected week only

### Direct Due Adjustments
- **Credit (+)**: Add money to reduce due or increase credit
- **Debit (-)**: Subtract money to increase due or reduce credit  
- **Clear Due**: Set balance to exactly zero
- Select specific week/month/year for adjustment
- Reason codes for audit purposes

## 📊 Dashboard Enhancements

### User Dashboard
- **Weekly Calculation Breakdown**: Visual flow showing calculation steps
- **Previous Purchase Carry**: Shows only purchase amounts from previous weeks
- **Week Advance Payments**: Highlights advance payments for current week only
- **Admin Adjustments**: Shows any direct modifications by admin
- **Week-Only Impact Notice**: Clear indication of the new logic

### Admin Dashboard
- **Week-Specific View**: Focus on individual week calculations
- **Adjustment Tracking**: See all admin modifications
- **Purchase vs Advance**: Separate columns for purchases and advance payments
- **Audit Trail**: History of all changes made

## 🏗️ Technical Implementation

### Backend Changes
1. **WeeklyCalculationService.js**: Modified to implement week-only logic
2. **DueAdjustment.js**: New model for tracking admin adjustments
3. **dueAdjustments.js**: New routes for adjustment management
4. **WeeklyBalance.js**: Updated schema for new calculation fields

### Frontend Changes
1. **DueAdjustmentManager.js**: New admin interface for direct adjustments
2. **Dashboard.js**: Enhanced visualization of week-only calculations
3. **AdminDashboard.js**: Updated admin interface with new tabs and data
4. **api.js**: New API methods for due adjustment operations

## 📈 Calculation Examples

### Example 1: Week-Only Advance Payment Impact
```
Week 1:
- Previous Purchase Carry: $50
- Week 1 Purchases: $30
- Week 1 Advance Payments: $20 (added by admin)
- Week 1 Meal Cost: $25
- Week 1 Balance: $50 + $30 + $20 - $25 = $75 (Credit)

Week 2:
- Previous Purchase Carry: $80 (only $50 + $30, NOT including $20 advance)
- Week 2 Purchases: $40
- Week 2 Advance Payments: $0
- Week 2 Meal Cost: $35
- Week 2 Balance: $80 + $40 + $0 - $35 = $85 (Credit)
```

### Example 2: Direct Due Adjustment
```
Original Week Balance: -$15 (Due)
Admin adds $20 Credit adjustment
New Week Balance: -$15 + $20 = $5 (Credit)

This adjustment ONLY affects this specific week.
```

## 🔐 Security & Permissions

### Admin-Only Features
- Add/modify advance payments
- Make direct due adjustments
- View all user balances and histories
- Delete adjustments (with reversal)

### User Features
- View their own weekly breakdowns
- See calculation transparency
- View adjustment history (read-only)

## 🚨 Important Notes

1. **Week-Only Impact**: All payments and adjustments only affect the specific week
2. **Purchase Carry-Forward**: Only purchases carry forward between weeks, not advance payments
3. **Admin Transparency**: All adjustments are logged with reasons and timestamps
4. **Calculation Clarity**: Users can see exactly how their week balance is calculated
5. **Audit Trail**: Complete history of all changes for compliance and dispute resolution

## 🔄 Migration from Previous System

When upgrading from the previous carry-forward system:

1. Existing weekly balances will be recalculated using the new logic
2. Previous advance payment effects will be isolated to their specific weeks
3. Admin can use direct adjustments to correct any discrepancies
4. Historical data remains intact with full audit trail

## 📞 Support

For questions about the new weekly-only impact system:
- Review the calculation breakdown in user dashboard
- Check admin adjustment history for any modifications
- Contact system administrator for direct due adjustments
- Refer to this documentation for calculation logic details