# SMS Integration Summary

## What Was Done

I've integrated SMS notifications with your existing Raspberry Pi SMS service. The remote repository already had SMS functionality, so I updated it to use your existing SMS API instead of creating a new server.

## Frontend Changes

### Files Modified
1. **src/lib/smsService.ts** - Updated to call existing Raspberry Pi SMS API endpoints
   - Changed from `SMS_SERVER_URL` to `SMS_API_URL`
   - Updated `sendTopUpConfirmation()` to call `/topup` endpoint
   - Updated `sendCardClaimNotification()` to call `/card-claim` endpoint
   - Updated `sendCardExpirationNotification()` to call `/card-expiration` endpoint

2. **src/lib/supabaseApi.ts** - Integrated SMS calls into card operations
   - Added `sendCardExpirationNotification` import
   - Added SMS notification in `issueQRCard()` when new cards are issued
   - Added SMS notification in `replaceCard()` when cards are replaced
   - Added `checkAndNotifyExpiredCards()` function for daily expiration checks
   - Top-up SMS already existed and is now using the correct API

3. **src/lib/scheduledTasks.ts** - New file for automated tasks
   - `runCardExpirationCheck()` - Checks for cards expiring within 7 days
   - `initScheduledTasks()` - Sets up daily checks (every 24 hours)

4. **src/App.tsx** - Initialize scheduled tasks on app startup
   - Calls `initScheduledTasks()` when app starts

## SMS Notification Triggers

### 1. Top-up Confirmation
- **Trigger**: When a passenger tops up their card balance
- **Endpoint**: `/topup`
- **Message**: Includes passenger name, card ID, amount, and new balance

### 2. Card Claim Notification
- **Trigger**: When a new card is issued or an existing card is replaced
- **Endpoint**: `/card-claim`
- **Message**: Includes passenger name, card ID, card type, and initial balance

### 3. Card Expiration Warning
- **Trigger**: When a card expires within 7 days (checked daily)
- **Endpoint**: `/card-expiration`
- **Message**: Includes passenger name, card ID, and expiration date

## Raspberry Pi Changes Required

Your Raspberry Pi already has an SMS service with `sms_service.py` and `sms_api.py`. You need to add the following:

### 1. Add Methods to `sms_service.py`

Add these methods to the `SMSService` class:

```python
def send_card_claim_notification(self, phone_number: str, card_id: str,
                                  card_holder: str, passenger_type: str) -> Dict:
    """
    Send SMS notification for card claim (new card issued or card replaced)
    """
    message = f"CARD CLAIMED. Card ID: {card_id}. Holder: {card_holder}. Type: {passenger_type}. Your card is now active. Thank you for using CommuteAI!"
    logger.info(f"Sending card claim notification to {phone_number}")
    return self.send_sms(phone_number, message, 'card_claim')


def send_card_expiration_notification(self, phone_number: str, card_id: str,
                                      card_holder: str, expiration_date: str) -> Dict:
    """
    Send SMS notification for card expiration warning
    """
    message = f"CARD EXPIRATION NOTICE. Card ID: {card_id}. Holder: {card_holder}. Expires: {expiration_date}. Please renew your card to continue using CommuteAI services. Contact support for assistance."
    logger.info(f"Sending card expiration notification to {phone_number}")
    return self.send_sms(phone_number, message, 'card_expiration')
```

### 2. Add Endpoints to `sms_api.py`

Add these request models and endpoints:

```python
class CardClaimRequest(BaseModel):
    phone_number: str
    card_id: str
    card_holder: str
    passenger_type: str


class CardExpirationRequest(BaseModel):
    phone_number: str
    card_id: str
    card_holder: str
    expiration_date: str


@app.post("/card-claim")
async def card_claim(request: CardClaimRequest):
    """
    Send SMS notification when a card is claimed (issued or replaced)
    """
    try:
        message = f"CARD CLAIMED. Card ID: {request.card_id}. Holder: {request.card_holder}. Type: {request.passenger_type}. Your card is now active. Thank you for using CommuteAI!"
        result = sms_service.send_sms(request.phone_number, message, 'card_claim')
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/card-expiration")
async def card_expiration(request: CardExpirationRequest):
    """
    Send SMS notification when a card is about to expire
    """
    try:
        message = f"CARD EXPIRATION NOTICE. Card ID: {request.card_id}. Holder: {request.card_holder}. Expires: {request.expiration_date}. Please renew your card to continue using CommuteAI services. Contact support for assistance."
        result = sms_service.send_sms(request.phone_number, message, 'card_expiration')
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Frontend Configuration

Add to your `.env.local` file:

```bash
VITE_SMS_API_URL=http://raspberry-pi-ip:8001
```

Replace `raspberry-pi-ip` with your Raspberry Pi's actual IP address.

## Testing

### 1. Test SMS API Health
```bash
curl http://raspberry-pi-ip:8001/health
```

### 2. Test Card Claim Notification
```bash
curl -X POST http://raspberry-pi-ip:8001/card-claim \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+639123456789",
    "card_id": "RC-123-45-678",
    "card_holder": "John Doe",
    "passenger_type": "Regular"
  }'
```

### 3. Test Card Expiration Notification
```bash
curl -X POST http://raspberry-pi-ip:8001/card-expiration \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+639123456789",
    "card_id": "RC-123-45-678",
    "card_holder": "John Doe",
    "expiration_date": "2025-01-15"
  }'
```

## Next Steps

1. ✅ Frontend SMS integration complete
2. ⏳ Add methods to Raspberry Pi `sms_service.py`
3. ⏳ Add endpoints to Raspberry Pi `sms_api.py`
4. ⏳ Restart SMS API service on Raspberry Pi
5. ⏳ Configure `VITE_SMS_API_URL` in frontend `.env.local`
6. ⏳ Test the SMS notifications

## Files to Commit

All changes are already in your working directory:
- `src/lib/smsService.ts`
- `src/lib/supabaseApi.ts`
- `src/lib/scheduledTasks.ts`
- `src/App.tsx`

The files `sms-api-extension.py`, `SMS-INTEGRATION.md`, `SMS-INTEGRATION-EXISTING.md`, `setup-sms-server.sh`, `sms-server.py`, and `sms-server-requirements.txt` were for the standalone server approach which is no longer needed since you have an existing SMS service. You can delete them if you want.
