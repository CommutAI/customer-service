import type { Passenger, QRCard, Transaction, Notification, DashboardStats } from '../types';

export const mockPassengers: Passenger[] = [
  {
    id: '1',
    name: 'John Smith',
    phone: '+1234567890',
    email: 'john@example.com',
    cardId: 'CARD001',
    balance: 150.00,
    status: 'active',
    type: 'Regular',
    createdAt: '2024-01-15T10:00:00Z',
    qrCode: 'QR123456789'
  },
  {
    id: '2',
    name: 'Jane Doe',
    phone: '+1234567891',
    email: 'jane@example.com',
    cardId: 'CARD002',
    balance: 75.50,
    status: 'active',
    type: 'Student',
    createdAt: '2024-02-20T14:30:00Z',
    qrCode: 'QR987654321'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    phone: '+1234567892',
    email: 'bob@example.com',
    cardId: 'CARD003',
    balance: 0.00,
    status: 'inactive',
    type: 'Senior Citizen',
    createdAt: '2024-03-10T09:15:00Z',
    qrCode: 'QR456789123'
  }
];

export const mockQRCards: QRCard[] = [
  {
    id: '1',
    passengerId: '1',
    cardId: 'CARD001',
    status: 'active',
    issuedAt: '2024-01-15T10:00:00Z',
    qrCode: 'QR123456789'
  },
  {
    id: '2',
    passengerId: '2',
    cardId: 'CARD002',
    status: 'active',
    issuedAt: '2024-02-20T14:30:00Z',
    qrCode: 'QR987654321'
  },
  {
    id: '3',
    passengerId: '3',
    cardId: 'CARD003',
    status: 'disabled',
    issuedAt: '2024-03-10T09:15:00Z',
    qrCode: 'QR456789123'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    passengerId: '1',
    passengerName: 'John Smith',
    type: 'top_up',
    amount: 50.00,
    balanceAfter: 150.00,
    timestamp: '2024-07-15T09:30:00Z',
    method: 'cash'
  },
  {
    id: '2',
    passengerId: '2',
    passengerName: 'Jane Doe',
    type: 'fare',
    amount: -2.50,
    balanceAfter: 75.50,
    timestamp: '2024-07-15T08:45:00Z',
    method: 'qr'
  },
  {
    id: '3',
    passengerId: '1',
    passengerName: 'John Smith',
    type: 'fare',
    amount: -3.00,
    balanceAfter: 100.00,
    timestamp: '2024-07-15T08:00:00Z',
    method: 'qr'
  },
  {
    id: '4',
    passengerId: '2',
    passengerName: 'Jane Doe',
    type: 'top_up',
    amount: 25.00,
    balanceAfter: 78.00,
    timestamp: '2024-07-14T16:20:00Z',
    method: 'card'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'replacement_request',
    message: 'Card replacement requested for CARD003',
    timestamp: '2024-07-15T11:30:00Z',
    read: false,
    passengerId: '3'
  },
  {
    id: '2',
    type: 'failed_scan',
    message: 'Failed scan attempt at Station A',
    timestamp: '2024-07-15T10:45:00Z',
    read: false,
    passengerId: '2'
  },
  {
    id: '3',
    type: 'system_alert',
    message: 'System maintenance scheduled for tonight',
    timestamp: '2024-07-15T09:00:00Z',
    read: true
  }
];

export const mockDashboardStats: DashboardStats = {
  todayRegistrations: 12,
  todayTopUps: 8,
  todayTransactions: 45,
  totalRevenue: 1250.00
};
