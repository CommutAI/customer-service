-- SIM900A Hardware Diagnostic
-- Run this on the Raspberry Pi

import serial
import time

def check_sim900a():
    try:
        ser = serial.Serial('/dev/ttyUSB0', 9600, timeout=5)
        print("Connected to SIM900A")

        # Clear buffer
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        # Test 1: Check SIM registration
        print("\n=== SIM Registration Status ===")
        ser.write(b'AT+CREG?\r')
        time.sleep(1)
        response = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
        print(f"Response: {response}")

        # Test 2: Check SIM card presence
        print("\n=== SIM Card Presence ===")
        ser.write(b'AT+CPIN?\r')
        time.sleep(1)
        response = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
        print(f"Response: {response}")

        # Test 3: Check network registration
        print("\n=== Network Registration ===")
        ser.write(b'AT+COPS?\r')
        time.sleep(2)
        response = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
        print(f"Response: {response}")

        # Test 4: Check signal quality
        print("\n=== Signal Quality ===")
        ser.write(b'AT+CSQ\r')
        time.sleep(1)
        response = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
        print(f"Response: {response}")

        # Test 5: Check SMS center number
        print("\n=== SMS Center Number ===")
        ser.write(b'AT+CSCA?\r')
        time.sleep(1)
        response = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
        print(f"Response: {response}")

        ser.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_sim900a()
