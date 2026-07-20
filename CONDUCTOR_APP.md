# Conductor App - Fare Validation & Destination Management

## Overview
The Conductor App enables conductors to validate passenger fares and allows passengers to view their registered destinations during transit.

## Features

### 1. Fare Validation
- **QR Code Scanning**: Conductors scan passenger QR cards to validate fare
- **Automatic Fare Calculation**: System calculates fare based on:
  - Passenger type (Regular, Student, Senior Citizen, PWD)
  - Registered destination
  - Starting point (terminal)
- **Discount Application**: Automatic 20% discount for eligible passengers (Student, Senior Citizen, PWD)
- **Balance Check**: Verify sufficient balance before validation
- **Transaction Recording**: Log all fare validations for audit purposes

### 2. Passenger Destination View
- **Destination Display**: Passengers can view their registered destination
- **Route Information**: Show complete route details (starting point → destination)
- **Fare Preview**: Display applicable fare before validation
- **Balance Status**: Show current card balance

## User Flows

### Conductor Fare Validation Flow
1. **Login**: Conductor authenticates with staff credentials
2. **Select Route**: Choose current route/terminal
3. **Scan QR Card**: Use device camera to scan passenger QR code
4. **Validate Passenger**: System displays:
   - Passenger name and type
   - Registered destination
   - Applicable fare (with discounts if applicable)
   - Current balance
5. **Confirm Validation**: Conductor confirms fare deduction
6. **Generate Receipt**: Optional receipt generation for passenger

### Passenger Destination View Flow
1. **Scan QR Card**: Passenger scans their own QR card
2. **View Details**: System displays:
   - Registered destination
   - Route information
   - Fare amount
   - Current balance
   - Transaction history

## Technical Requirements

### API Endpoints

#### Fare Validation
```typescript
POST /api/validate-fare
{
  cardId: string,
  terminal: string,
  conductorId: string
}

Response:
{
  success: boolean,
  passengerName: string,
  passengerType: string,
  destination: string,
  fare: number,
  discount: number,
  finalFare: number,
  balanceBefore: number,
  balanceAfter: number,
  transactionId: string
}
```

#### Get Passenger Destination
```typescript
GET /api/passenger/destination/:cardId

Response:
{
  cardId: string,
  passengerName: string,
  destination: string,
  fare: number,
  balance: number,
  passengerType: string
}
```

#### Get Route Information
```typescript
GET /api/routes/:terminal/:destination

Response:
{
  terminal: string,
  destination: string,
  fare: number,
  distance: string,
  estimatedTime: string
}
```

### Database Schema Updates

#### Add Destination to QR Cards
```sql
ALTER TABLE qr_cards ADD COLUMN destination VARCHAR(100);
ALTER TABLE qr_cards ADD COLUMN route_id UUID REFERENCES routes(id);
```

#### Routes Table
```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  fare DECIMAL(10,2) NOT NULL,
  distance_km DECIMAL(10,2),
  estimated_time_minutes INTEGER,
  UNIQUE(terminal, destination)
);
```

#### Fare Validations Table
```sql
CREATE TABLE fare_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES qr_cards(id),
  conductor_id UUID REFERENCES staff(id),
  route_id UUID REFERENCES routes(id),
  fare DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  final_fare DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  validated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed'
);
```

## Fare Calculation Logic

### Base Fares (from Manolo Fortich Terminal)
- Dicklum: ₱15
- San Miguel: ₱20
- Lunocan: ₱25
- Alae: ₱30
- Mambatangan: ₱40
- Puerto: ₱50
- Agora Terminal: ₱65

### Discount Rules
- **Regular**: No discount
- **Student**: 20% discount
- **Senior Citizen**: 20% discount
- **PWD**: 20% discount

### Calculation Formula
```
finalFare = baseFare - (baseFare * discountPercentage)
```

Example:
- Regular passenger to Agora: ₱65
- Student to Agora: ₱65 - (₱65 * 0.20) = ₱52

## Security Considerations

### Authentication
- Conductors must authenticate with staff credentials
- Session tokens with expiration
- Role-based access control

### Validation Security
- QR code verification to prevent fraud
- Balance checks before fare deduction
- Transaction logging for audit trails
- Offline mode with sync when connection restored

## UI Components

### Conductor Dashboard
- Current route/terminal display
- Quick scan button
- Recent validations list
- Daily statistics

### Validation Modal
- Passenger information card
- Destination and route details
- Fare breakdown (original, discount, final)
- Balance status
- Confirm/Cancel buttons

### Passenger View
- Destination card with route visualization
- Current balance display
- Recent transactions
- QR code for scanning

## Implementation Priority

1. **Phase 1**: Core fare validation
   - QR scanning integration
   - Fare calculation logic
   - Balance deduction
   - Basic transaction recording

2. **Phase 2**: Destination management
   - Passenger destination registration
   - Route information display
   - Destination validation

3. **Phase 3**: Enhanced features
   - Offline mode
   - Receipt generation
   - Analytics dashboard
   - Multi-terminal support

## Testing Requirements

### Unit Tests
- Fare calculation logic
- Discount application
- Balance validation
- QR code parsing

### Integration Tests
- API endpoint testing
- Database operations
- Transaction flow

### User Acceptance Tests
- Conductor validation flow
- Passenger destination view
- Error handling scenarios
- Edge cases (insufficient balance, invalid QR, etc.)
