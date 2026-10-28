#!/usr/bin/env python3
"""
Diagnostic script for SIM900A connection
Run this on the Raspberry Pi to debug SMS sending issues
"""

import serial
import serial.tools.list_ports
import time

def test_sim900a():
    # First, check available ports
    print("=== Checking Available Serial Ports ===")
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("No serial ports found!")
        print("\nPossible issues:")
        print("1. SIM900A not connected via USB")
        print("2. USB-to-serial adapter not recognized")
        print("3. SIM900A not powered on")
        return False
    
    for port in ports:
        print(f"Port: {port.device}")
        print(f"  Description: {port.description}")
        print(f"  HWID: {port.hwid}")
        print()
    
    # Try to find the SIM900A port
    sim900a_port = None
    for port in ports:
        if 'USB' in port.device or 'ACM' in port.device:
            sim900a_port = port.device
            break
    
    if not sim900a_port:
        print("No USB/ACM serial ports found")
        return False
    
    print(f"Using port: {sim900a_port}")
    port = sim900a_port
    baudrate = 9600
    
    print(f"Connecting to SIM900A on {port} @ {baudrate} baud...")
    
    try:
        ser = serial.Serial(port, baudrate, timeout=5)
        time.sleep(2)
        
        # Test 1: Basic AT command
        print("\n=== Test 1: Basic AT Command ===")
        ser.write(b'AT\r')
        time.sleep(1)
        response = ser.read(100).decode('utf-8', errors='ignore')
        print(f"Response: {response}")
        
        if 'OK' in response:
            print("✓ Basic AT command successful")
        else:
            print("✗ SIM900A not responding to AT")
            return False
        
        # Test 2: Check SIM registration
        print("\n=== Test 2: SIM Registration ===")
        ser.write(b'AT+CREG?\r')
        time.sleep(1)
        response = ser.read(100).decode('utf-8', errors='ignore')
        print(f"Response: {response}")
        
        if '+CREG:' in response:
            print("✓ SIM registration status available")
        else:
            print("✗ Cannot check SIM registration")
        
        # Test 3: Check signal strength
        print("\n=== Test 3: Signal Strength ===")
        ser.write(b'AT+CSQ\r')
        time.sleep(1)
        response = ser.read(100).decode('utf-8', errors='ignore')
        print(f"Response: {response}")
        
        if '+CSQ:' in response:
            print("✓ Signal strength available")
        else:
            print("✗ Cannot check signal strength")
        
        # Test 4: Check SIM card info
        print("\n=== Test 4: SIM Card Info ===")
        ser.write(b'AT+CCID\r')
        time.sleep(1)
        response = ser.read(100).decode('utf-8', errors='ignore')
        print(f"Response: {response}")
        
        if '+CCID:' in response:
            print("✓ SIM card detected")
        else:
            print("✗ SIM card not detected")
        
        # Test 5: Send a test SMS
        print("\n=== Test 5: Send Test SMS ===")
        phone = "+639991146757"  # Replace with your test number
        ser.write(b'AT+CMGF=1\r')
        time.sleep(0.5)
        ser.write(f'AT+CMGS="{phone}"\r'.encode())
        time.sleep(1)
        ser.write(b'Test SMS from CommuteAI\x1A')
        time.sleep(5)
        response = ser.read(200).decode('utf-8', errors='ignore')
        print(f"Response: {response}")
        
        if 'OK' in response or '+CMGS:' in response:
            print("✓ Test SMS sent successfully")
        else:
            print("✗ Test SMS failed")
        
        ser.close()
        print("\n=== Diagnostics Complete ===")
        return True
        
    except serial.SerialException as e:
        print(f"✗ Serial error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    test_sim900a()
