#!/usr/bin/env python3
"""
Check available serial ports on Raspberry Pi
"""

import serial.tools.list_ports

print("=== Available Serial Ports ===")
ports = serial.tools.list_ports.comports()

if not ports:
    print("No serial ports found!")
    print("\nPossible issues:")
    print("1. SIM900A not connected via USB")
    print("2. USB-to-serial adapter not recognized")
    print("3. SIM900A not powered on")
else:
    for port in ports:
        print(f"Port: {port.device}")
        print(f"  Description: {port.description}")
        print(f"  HWID: {port.hwid}")
        print()

print("\nCommon SIM900A ports:")
print("  - /dev/ttyUSB0 (most common)")
print("  - /dev/ttyACM0 (some adapters)")
print("  - /dev/ttyAMA0 (hardware serial)")
