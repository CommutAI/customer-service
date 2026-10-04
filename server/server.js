import express from 'express';
import cors from 'cors';
import { SerialPort } from 'serialport';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for SMS endpoint
const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 SMS requests per 15 minutes
  message: 'Too many SMS requests, please try again later.',
});

app.use(cors());
app.use(express.json());

// Serial port configuration for SIM900A
let serialPort = null;

async function initializeSerialPort() {
  try {
    const port = process.env.SERIAL_PORT || 'COM3'; // Windows default
    const baudRate = parseInt(process.env.BAUD_RATE) || 9600;

    serialPort = new SerialPort({
      path: port,
      baudRate: baudRate,
    });

    serialPort.on('open', () => {
      console.log(`Serial port ${port} opened at ${baudRate} baud`);
    });

    serialPort.on('error', (err) => {
      console.error('Serial port error:', err.message);
    });

    // Initialize SIM900A
    await sendATCommand('AT', 1000);
    await sendATCommand('AT+CMGF=1', 1000); // Set SMS to text mode
    console.log('SIM900A initialized');
  } catch (error) {
    console.error('Failed to initialize serial port:', error.message);
  }
}

function sendATCommand(command, delay = 1000) {
  return new Promise((resolve, reject) => {
    if (!serialPort) {
      reject(new Error('Serial port not initialized'));
      return;
    }

    serialPort.write(command + '\r\n', (err) => {
      if (err) {
        reject(err);
        return;
      }
      setTimeout(resolve, delay);
    });
  });
}

function sendSMS(phoneNumber, message) {
  return new Promise((resolve, reject) => {
    if (!serialPort) {
      reject(new Error('Serial port not initialized'));
      return;
    }

    // Remove any non-digit characters from phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const commands = [
      `AT+CMGS="${cleanPhone}"`,
      message,
      String.fromCharCode(26) // Ctrl+Z to send
    ];

    let commandIndex = 0;

    function sendNextCommand() {
      if (commandIndex >= commands.length) {
        resolve({ success: true, message: 'SMS sent successfully' });
        return;
      }

      const command = commands[commandIndex];
      const delay = commandIndex === 1 ? 500 : 1000; // Shorter delay for message content

      serialPort.write(command + (commandIndex === 1 ? '' : '\r\n'), (err) => {
        if (err) {
          reject(err);
          return;
        }
        commandIndex++;
        setTimeout(sendNextCommand, delay);
      });
    }

    sendNextCommand();
  });
}

// API endpoint to send SMS (with stricter rate limiting)
app.post('/api/send-sms', smsLimiter, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }

    console.log(`Sending SMS to ${phoneNumber}: ${message}`);
    const result = await sendSMS(phoneNumber, message);
    res.json(result);
  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serialPort: serialPort ? 'connected' : 'disconnected' 
  });
});

// Initialize serial port and start server
initializeSerialPort().then(() => {
  app.listen(PORT, () => {
    console.log(`SMS server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  // Start server anyway even if serial port fails
  app.listen(PORT, () => {
    console.log(`SMS server running on port ${PORT} (serial port not connected)`);
  });
});
