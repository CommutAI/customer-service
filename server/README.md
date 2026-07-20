# SMS Server - SIM900A Integration

Backend service for sending SMS notifications using a SIM900A GSM module. This server provides an API endpoint for the frontend to send SMS confirmations after successful top-ups.

## Hardware Requirements

- **SIM900A GSM Module** (or compatible SIM800L/SIM900)
- **USB-to-TTL Serial Adapter** (CP2102, FT232, or similar)
- **SIM Card** with active SMS service
- **Antenna** for the GSM module

## Hardware Connection

Connect the SIM900A module to your computer via USB-to-TTL adapter:

| SIM900A Pin | USB-TTL Pin |
|-------------|-------------|
| VCC         | 5V          |
| GND         | GND         |
| TX          | RX          |
| RX          | TX          |

**Note:** The SIM900A operates at 5V, but the TX/RX pins are 3.3V. Some USB-TTL adapters have 5V tolerant RX pins. If not, use a logic level converter.

## Software Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PORT=3001
SERIAL_PORT=COM3      # Windows: COM3, COM4, etc. | Linux: /dev/ttyUSB0 | Mac: /dev/tty.usbserial-*
BAUD_RATE=9600
```

### 3. Find Your Serial Port

**Windows:**
```powershell
# Open Device Manager and look under "Ports (COM & LPT)"
# Or use PowerShell:
Get-WmiObject Win32_SerialPort | Select-Object DeviceID, Description
```

**Linux:**
```bash
ls /dev/ttyUSB*
# Or
dmesg | grep tty
```

**Mac:**
```bash
ls /dev/tty.usbserial*
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Send SMS

**POST** `/api/send-sms`

**Request Body:**
```json
{
  "phoneNumber": "09123456789",
  "message": "Your top-up was successful!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS sent successfully"
}
```

### Health Check

**GET** `/api/health`

**Response:**
```json
{
  "status": "ok",
  "serialPort": "connected"
}
```

## Frontend Integration

The frontend is already configured to use this SMS server. Add the following to your frontend `.env.local`:

```env
VITE_SMS_SERVER_URL=http://localhost:3001
```

## Testing the SMS Service

### 1. Test Serial Connection

Start the server and check the console output. You should see:

```
Serial port COM3 opened at 9600 baud
SIM900A initialized
SMS server running on port 3001
```

### 2. Test SMS Sending

Use curl or Postman to test:

```bash
curl -X POST http://localhost:3001/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"09123456789","message":"Test message from CommuteAI"}'
```

### 3. Check SIM900A Status

Send AT commands via serial monitor to verify module status:

```
AT          # Should respond OK
AT+CPIN?    # Check SIM card status
AT+CSQ      # Check signal strength
AT+CREG?    # Check network registration
```

## Troubleshooting

### Serial Port Not Found

- **Windows:** Run Device Manager as administrator
- **Linux:** Add user to dialout group: `sudo usermod -a -G dialout $USER`
- **Mac:** Install FTDI drivers if needed

### SIM900A Not Responding

- Check power supply (SIM900A requires up to 2A during transmission)
- Verify TX/RX connections are crossed (TX→RX, RX→TX)
- Try different baud rates (9600, 115200)
- Check if SIM card is inserted and has network coverage

### SMS Not Sending

- Verify SIM card has SMS service enabled
- Check signal strength with `AT+CSQ` (should be >10)
- Ensure SIM card is not out of credit
- Check if SMS center number is configured: `AT+CSCA?`

### Permission Denied (Linux)

```bash
sudo chmod 666 /dev/ttyUSB0
# Or add user to dialout group permanently
sudo usermod -a -G dialout $USER
# Then logout and login again
```

## Production Deployment

For production deployment:

1. **Use a dedicated server** (Raspberry Pi, mini PC)
2. **Use PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name sms-server
   pm2 save
   pm2 startup
   ```
3. **Configure firewall** to allow only local access
4. **Add error logging** and monitoring
5. **Use HTTPS** if accessing from remote network

## Security Considerations

- The SMS server should only be accessible from your local network
- Add authentication if exposing to the internet
- Rate limit SMS sending to prevent abuse
- Validate phone numbers before sending

## License

Part of CommutAI Customer Service System
