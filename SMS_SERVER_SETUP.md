# SMS Server Setup for Raspberry Pi

This document explains how to set up the SMS server on the Raspberry Pi (commutai.local) to handle SMS notifications for the CommuteAI customer service application.

## Overview

The SMS server receives HTTP requests from the customer service application and sends SMS messages using the Raspberry Pi's GSM modem.

## SMS Notification Triggers

The customer service application sends SMS notifications for the following events:

1. **Card Claim** - When a card reservation is claimed and the QR card is created
2. **Card Expiration** - When a card is about to expire (scheduled job needed)
3. **Top-up** - When a card balance is topped up
4. **Reservation Status** - When a reservation is cancelled or expired

## Prerequisites

- Raspberry Pi with GSM modem (SIM800L, SIM7600, or similar)
- Active SIM card with SMS capability
- Node.js installed on Raspberry Pi
- Python (for serial communication with GSM modem)

## Raspberry Pi SMS Server Setup

### 1. Install Dependencies

SSH into the Raspberry Pi:
```bash
ssh chichi@commutai.local
```

Install required packages:
```bash
sudo apt update
sudo apt install -y nodejs npm python3 python3-pip serialport
pip3 install pyserial
```

### 2. Create SMS Server Directory

```bash
cd ~
mkdir sms-server
cd sms-server
```

### 3. Initialize Node.js Project

```bash
npm init -y
npm install express body-parser cors
```

### 4. Create SMS Server Application

Create `server.js`:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Log file for SMS operations
const LOG_FILE = '/home/chichi/sms-server/sms.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Send SMS using Python script with GSM modem
function sendSMS(phoneNumber, message) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'send_sms.py');
    const command = `python3 ${pythonScript} "${phoneNumber}" "${message}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`Error sending SMS: ${error.message}`);
        reject(error);
      } else {
        log(`SMS sent successfully to ${phoneNumber}`);
        resolve(stdout);
      }
    });
  });
}

// API endpoint to send SMS
app.post('/api/send-sms', async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    log('Missing phoneNumber or message');
    return res.status(400).json({ error: 'phoneNumber and message are required' });
  }

  // Validate phone number format (Philippines: 09XXXXXXXXX)
  const phoneRegex = /^09\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    log(`Invalid phone number format: ${phoneNumber}`);
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    await sendSMS(phoneNumber, message);
    res.json({ success: true, message: 'SMS sent successfully' });
  } catch (error) {
    log(`Failed to send SMS: ${error.message}`);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get SMS logs
app.get('/logs', (req, res) => {
  try {
    const logs = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logs.split('\n').filter(line => line.trim());
    // Return last 100 lines
    const recentLogs = lines.slice(-100);
    res.json({ logs: recentLogs });
  } catch (error) {
    res.json({ logs: [] });
  }
});

app.listen(PORT, () => {
  log(`SMS Server running on port ${PORT}`);
});
```

### 5. Create Python SMS Script

Create `send_sms.py`:

```python
#!/usr/bin/env python3
import serial
import sys
import time

def send_sms(phone_number, message):
    # GSM modem serial port (adjust based on your setup)
    # Common ports: /dev/ttyUSB0, /dev/ttyS0, /dev/ttyAMA0
    SERIAL_PORT = '/dev/ttyUSB0'
    BAUD_RATE = 9600

    try:
        # Initialize serial connection
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=5)
        time.sleep(1)

        # Check if modem is ready
        ser.write(b'AT\r')
        time.sleep(1)
        response = ser.read_all().decode()
        if 'OK' not in response:
            print('Modem not ready')
            return False

        # Set SMS text mode
        ser.write(b'AT+CMGF=1\r')
        time.sleep(1)
        ser.read_all()

        # Set recipient phone number
        ser.write(f'AT+CMGS="{phone_number}"\r'.encode())
        time.sleep(1)
        ser.read_all()

        # Send message (Ctrl+Z = \x1A to send)
        ser.write(f'{message}\x1A'.encode())
        time.sleep(3)

        # Read response
        response = ser.read_all().decode()
        ser.close()

        if 'OK' in response or '+CMGS:' in response:
            print('SMS sent successfully')
            return True
        else:
            print(f'Failed to send SMS: {response}')
            return False

    except Exception as e:
        print(f'Error: {e}')
        return False

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python3 send_sms.py <phone_number> <message>')
        sys.exit(1)

    phone_number = sys.argv[1]
    message = sys.argv[2]

    success = send_sms(phone_number, message)
    sys.exit(0 if success else 1)
```

Make the script executable:
```bash
chmod +x send_sms.py
```

### 6. Configure Serial Port Permissions

Add the user to the dialout group:
```bash
sudo usermod -a -G dialout chichi
```

Or grant permissions to the serial port:
```bash
sudo chmod 666 /dev/ttyUSB0
```

### 7. Test GSM Modem Connection

Check if the GSM modem is detected:
```bash
ls -l /dev/ttyUSB*
```

Test communication with the modem:
```bash
sudo screen /dev/ttyUSB0 9600
# Type AT and press Enter - should respond with OK
# Press Ctrl+A then K to exit screen
```

### 8. Start the SMS Server

```bash
node server.js
```

The server will start on port 3001.

### 9. Set Up as Systemd Service (Auto-start on boot)

Create service file:
```bash
sudo nano /etc/systemd/system/sms-server.service
```

Add the following content:
```ini
[Unit]
Description=CommuteAI SMS Server
After=network.target

[Service]
Type=simple
User=chichi
WorkingDirectory=/home/chichi/sms-server
ExecStart=/usr/bin/node /home/chichi/sms-server/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sms-server
sudo systemctl start sms-server
sudo systemctl status sms-server
```

### 10. Configure Firewall (if enabled)

Allow port 3001:
```bash
sudo ufw allow 3001
```

## Customer Service Application Configuration

Update the `.env.local` file in the customer service application:

```env
VITE_SMS_SERVER_URL=http://commutai.local:3001
```

If running locally:
```env
VITE_SMS_SERVER_URL=http://localhost:3001
```

## Testing the SMS Server

### Test Health Check
```bash
curl http://commutai.local:3001/health
```

### Test SMS Sending
```bash
curl -X POST http://commutai.local:3001/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"09123456789","message":"Test message from CommuteAI"}'
```

### View Logs
```bash
curl http://commutai.local:3001/logs
```

Or view log file directly:
```bash
tail -f /home/chichi/sms-server/sms.log
```

## Troubleshooting

### GSM Modem Not Detected
- Check USB connections
- Verify power supply to the modem
- Try different USB ports
- Check with `lsusb` command

### Permission Denied on Serial Port
```bash
sudo chmod 666 /dev/ttyUSB0
# Or add user to dialout group permanently
sudo usermod -a -G dialout chichi
# Logout and login again for changes to take effect
```

### SMS Not Sending
- Check if SIM card has active service
- Verify signal strength with `AT+CSQ` command
- Check if SMS center number is configured: `AT+CSCA?`
- Test with minicom or screen tool first

### Server Not Starting
- Check if port 3001 is already in use: `sudo lsof -i :3001`
- Check logs: `journalctl -u sms-server -f`
- Verify Node.js is installed: `node --version`

## Scheduled Job for Card Expiration Notifications

To send SMS notifications for expiring cards, create a cron job:

```bash
crontab -e
```

Add the following to run daily at 8 AM:
```bash
0 8 * * * /usr/bin/node /home/chichi/sms-server/check-expirations.js
```

Create `check-expirations.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExpirations() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: expiringCards } = await supabase
    .from('qr_cards')
    .select('*')
    .lte('expires_at', thirtyDaysFromNow.toISOString())
    .eq('status', 'active');

  for (const card of expiringCards) {
    if (card.contact_number) {
      // Send SMS notification
      await fetch('http://localhost:3001/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: card.contact_number,
          message: `CommuteAI: Your card ${card.card_uid} expires on ${new Date(card.expires_at).toLocaleDateString()}. Please renew at the terminal.`
        })
      });
    }
  }
}

checkExpirations();
```

## Security Considerations

1. **Authentication**: Add API key authentication to the SMS server
2. **Rate Limiting**: Implement rate limiting to prevent SMS spam
3. **Input Validation**: Validate all phone numbers and message content
4. **Logging**: Maintain logs for audit purposes
5. **Network**: Restrict access to the SMS server to trusted IPs only

## Monitoring

Monitor the SMS server:
```bash
# Check service status
sudo systemctl status sms-server

# View logs
sudo journalctl -u sms-server -f

# Check disk space for logs
df -h
```

## Support

For issues or questions:
- Check the SMS server logs at `/home/chichi/sms-server/sms.log`
- Check systemd logs with `journalctl -u sms-server -f`
- Verify GSM modem connectivity with serial tools
