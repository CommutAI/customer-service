# Database-Driven SMS Integration

## Overview

This is a database-driven SMS system where the frontend queues SMS messages in Supabase, and a backend service on the Raspberry Pi polls the database and sends SMS via SIM900.

## Architecture

```
Frontend (React) → Supabase (sms_queue table) → Raspberry Pi (sms_queue_processor.py) → SIM900 → SMS
```

### Benefits

- Frontend doesn't need direct access to Raspberry Pi
- SMS sending is decoupled from frontend operations
- Better error handling and retry logic
- Can work even if Raspberry Pi is temporarily offline
- Easy to monitor and debug SMS sending

## Components

### 1. Frontend (React)

**File**: `src/lib/smsService.ts`

Functions that queue SMS messages to the database:
- `sendTopUpConfirmation()` - Queues top-up SMS
- `sendCardClaimNotification()` - Queues card claim SMS
- `sendCardExpirationNotification()` - Queues card expiration SMS
- `sendReservationStatusNotification()` - Queues reservation status SMS

These functions insert records into the `sms_queue` table in Supabase.

### 2. Database (Supabase)

**Table**: `sms_queue`

Schema:
```sql
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0
);
```

Run the schema:
```bash
psql -h your-db-host -U your-user -d your-database -f supabase/sms_queue_schema.sql
```

Or run it in Supabase SQL Editor.

### 3. Backend (Raspberry Pi)

**File**: `sms_queue_processor.py`

A Python service that:
1. Polls the `sms_queue` table for pending SMS (every 30 seconds by default)
2. Sends SMS via SIM900 module
3. Updates the status to 'sent' or 'failed'
4. Tracks attempts and errors

## Setup Instructions

### 1. Database Setup

Run the schema to create the `sms_queue` table:

```bash
# In Supabase SQL Editor, run:
# Open supabase/sms_queue_schema.sql and execute it
```

### 2. Raspberry Pi Setup

Transfer `sms_queue_processor.py` to your Raspberry Pi:

```bash
scp sms_queue_processor.py chichi@commutai:~/raspberry-pi-server/
```

On the Raspberry Pi:

```bash
cd ~/raspberry-pi-server

# Install dependencies
pip3 install python-dotenv pyserial supabase

# Create .env file with credentials
nano .env
```

Add to `.env`:
```env
SIM900A_PORT=/dev/ttyUSB0
SIM900A_BAUDRATE=9600
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
SMS_POLL_INTERVAL=30
```

### 3. Create Systemd Service

Create a systemd service to run the SMS processor automatically:

```bash
sudo nano /etc/systemd/system/commutai-sms-queue.service
```

Add:
```ini
[Unit]
Description=CommuteAI SMS Queue Processor
After=network.target

[Service]
Type=simple
User=chichi
WorkingDirectory=/home/chichi/raspberry-pi-server
Environment="PATH=/home/chichi/raspberry-pi-server/venv/bin"
ExecStart=/home/chichi/raspberry-pi-server/venv/bin/python sms_queue_processor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable commutai-sms-queue
sudo systemctl start commutai-sms-queue
```

Check status:
```bash
sudo systemctl status commutai-sms-queue
```

View logs:
```bash
sudo journalctl -u commutai-sms-queue -f
```

### 4. Frontend Configuration

No configuration needed! The frontend uses the same Supabase connection it already has.

## How It Works

### Sending SMS

1. **Frontend**: When an event occurs (top-up, card issued, etc.), the frontend calls a function in `smsService.ts`
2. **Queue**: The function inserts a record into the `sms_queue` table with status 'pending'
3. **Poll**: The Raspberry Pi service polls the table every 30 seconds (configurable)
4. **Send**: When it finds pending SMS, it sends them via SIM900
5. **Update**: It updates the status to 'sent' or 'failed' with timestamp and error message

### Card Expiration Checks

The card expiration check now queues SMS to the database instead of sending directly:

1. The frontend's scheduled task runs daily
2. It queries for cards expiring within 7 days
3. For each expiring card, it inserts a record into `sms_queue`
4. The Raspberry Pi picks it up and sends the SMS

## Testing

### 1. Test Database Queue

```typescript
// In browser console or test code
import { supabase } from './lib/supabase';

await supabase.from('sms_queue').insert({
  phone_number: '+639123456789',
  message: 'Test SMS from database',
  sms_type: 'test',
  status: 'pending',
  metadata: {},
});
```

### 2. Test SMS Processor

Run manually on Raspberry Pi:
```bash
cd ~/raspberry-pi-server
python3 sms_queue_processor.py
```

### 3. Monitor Queue

Check pending SMS in Supabase:
```sql
SELECT * FROM sms_queue WHERE status = 'pending' ORDER BY created_at DESC;
```

Check sent SMS:
```sql
SELECT * FROM sms_queue WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 10;
```

Check failed SMS:
```sql
SELECT * FROM sms_queue WHERE status = 'failed' ORDER BY created_at DESC;
```

## Troubleshooting

### SMS Not Being Sent

1. Check if processor is running:
   ```bash
   sudo systemctl status commutai-sms-queue
   ```

2. Check logs:
   ```bash
   sudo journalctl -u commutai-sms-queue -n 50
   ```

3. Check if there are pending SMS in database:
   ```sql
   SELECT COUNT(*) FROM sms_queue WHERE status = 'pending';
   ```

4. Check SIM900 connection in logs

### SIM900 Not Working

1. Check hardware connections
2. Check port configuration in `.env`
3. Test SIM900 manually:
   ```bash
   python3
   >>> import serial
   >>> ser = serial.Serial('/dev/ttyUSB0', 9600)
   >>> ser.write(b'AT\r')
   >>> ser.read(100)
   ```

### Database Connection Issues

1. Check SUPABASE_URL and SUPABASE_KEY in `.env`
2. Ensure using service role key (not anon key)
3. Check RLS policies on `sms_queue` table

## Monitoring

### Dashboard Queries

Create a simple dashboard to monitor SMS:

```sql
-- SMS sent today
SELECT COUNT(*) FROM sms_queue
WHERE status = 'sent'
AND DATE(sent_at) = CURRENT_DATE;

-- SMS failed today
SELECT COUNT(*) FROM sms_queue
WHERE status = 'failed'
AND DATE(created_at) = CURRENT_DATE;

-- SMS by type
SELECT sms_type, COUNT(*)
FROM sms_queue
WHERE status = 'sent'
AND DATE(sent_at) = CURRENT_DATE
GROUP BY sms_type;
```

## Advantages Over Direct API Calls

1. **No Direct Network Access**: Frontend doesn't need to access Raspberry Pi
2. **Reliability**: SMS queue survives frontend restarts and network issues
3. **Retry Logic**: Failed SMS can be retried automatically
4. **Audit Trail**: Complete history of all SMS sent
5. **Monitoring**: Easy to monitor and debug SMS sending
6. **Scalability**: Can add multiple SMS processors if needed
7. **Offline Support**: SMS queue fills up even if processor is temporarily down

## Files

- `src/lib/smsService.ts` - Frontend SMS queue functions
- `supabase/sms_queue_schema.sql` - Database schema
- `sms_queue_processor.py` - Raspberry Pi SMS processor
- `SMS-DATABASE-DRIVEN.md` - This documentation

## Cleanup

Delete old files that are no longer needed:
- `SMS-INTEGRATION-SUMMARY.md`
- `sms-server.py`
- `sms-server-requirements.txt`
- `setup-sms-server.sh`
