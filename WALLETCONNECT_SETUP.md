# WalletConnect Integration Guide

This document describes the real WalletConnect integration for RentarPay, replacing the previous mock implementation.

## Overview

WalletConnect enables secure communication between RentarPay and user Stellar wallets, allowing users to:
- Connect their wallet without sharing private keys
- Sign authentication challenges securely
- Perform transactions through their wallet

## Setup Instructions

### 1. Get a WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign in or create an account
3. Create a new project
4. Copy your **Project ID**

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_NETWORK=testnet
```

Or copy and modify the provided `.env.example`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.

### 3. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

This will install:
- `@walletconnect/sign-client@^2.13.0` - WalletConnect client library
- `@walletconnect/modal@^2.6.2` - WalletConnect modal UI

### 4. Run Development Server

```bash
npm run dev
```

## Architecture

### Key Components

#### `src/lib/wallet/walletconnect.ts`
- Real WalletConnect client implementation
- Manages SignClient initialization and lifecycle
- Handles Stellar namespace configuration
- Implements `stellar_signMessage` CAIP method
- Session persistence and restoration

#### `src/contexts/wallet-context.tsx`
- React context for wallet state management
- Coordinates Freighter and WalletConnect connections
- SEP-10 challenge signing flow
- Session restoration on app mount

#### `next.config.ts`
- Exposes `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` environment variable

### Authentication Flow

```
1. User clicks "Connect Wallet"
   ↓
2. WalletConnect modal opens with QR code
   ↓
3. User scans with Stellar wallet (mobile app or browser extension)
   ↓
4. Wallet approves connection
   ↓
5. SignClient receives session approval with Stellar account
   ↓
6. Real Stellar public key extracted and displayed
   ↓
7. Challenge fetched from backend
   ↓
8. User signs challenge in wallet
   ↓
9. Signed challenge sent to backend for verification
   ↓
10. JWT token issued, user authenticated
```

## Key Features

### ✅ Real Wallet Integration
- Connects to actual Stellar wallets (Freighter, Albedo, etc.)
- Retrieves real Stellar public keys
- No mock keys or signatures

### ✅ Security
- Uses WalletConnect v2 protocol
- Private keys never leave the user's wallet
- Secure message signing via `stellar_signMessage`
- Public key validation using Stellar SDK

### ✅ Session Management
- Automatic session persistence
- Session restoration on app reload
- Graceful disconnection handling

### ✅ Network Support
- Testnet support for development
- Mainnet support for production
- Network-aware configuration

### ✅ Error Handling
- Project ID validation at initialization
- Public key format validation
- Detailed error messages for debugging

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ Yes | - | WalletConnect Project ID from Cloud dashboard |
| `NEXT_PUBLIC_NETWORK` | ❌ No | `testnet` | Stellar network: `testnet` or `mainnet` |
| `NEXT_PUBLIC_API_URL` | ❌ No | `/api` | Backend API URL |
| `NEXT_PUBLIC_CONTRACT_ID` | ❌ No | `CDUMMY` | Soroban contract address |

## Testing

### Manual Testing

1. **Connect with WalletConnect:**
   - Click "Connect Wallet" button
   - Select "WalletConnect" option
   - Scan QR code with Stellar wallet
   - Approve connection

2. **Verify Public Key:**
   - After connection, verify the displayed public key starts with "G"
   - Confirm it matches your wallet's public key

3. **Sign Challenge:**
   - Complete login flow
   - Verify you're authenticated with correct account

### Network Testing

**Testnet (Default):**
```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-testnet-project-id>
```

**Mainnet:**
```env
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-mainnet-project-id>
```

## Troubleshooting

### "WalletConnect Project ID not configured"
- Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set in `.env.local`
- Restart dev server after changing environment variables

### "No Stellar accounts found in WalletConnect session"
- Verify the connected wallet supports Stellar
- Check WalletConnect modal shows Stellar chains
- Try reconnecting

### "Invalid Stellar public key format"
- Verify your wallet's public key is valid
- Public keys should start with "G"
- Check network matches (testnet vs mainnet)

### QR Code not displaying
- Ensure `@walletconnect/modal` is installed
- Check browser console for errors
- Verify Project ID is valid

## API Integration

### Challenge Endpoint
```typescript
POST /api/auth/challenge
{
  "publicKey": "GXXXXXX..."
}
```

Returns:
```json
{
  "challenge": "rentar.io - SEP-10 challenge...",
  "token": "challenge_token_..."
}
```

### Verify Endpoint
```typescript
POST /api/auth/verify
{
  "publicKey": "GXXXXXX...",
  "signedChallenge": "signed_message_from_wallet"
}
```

Returns:
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "publicKey": "GXXXXXX...",
    "displayName": "User Name",
    "email": "user@example.com",
    "kycStatus": "verified"
  }
}
```

## Security Considerations

1. **Never expose the Project ID in production code** - It's safe to use `NEXT_PUBLIC_` prefix because this Project ID is meant to be public
2. **Validate all signatures on the backend** - Never trust client-side signature validation
3. **Use HTTPS in production** - WalletConnect requires secure connections
4. **Implement rate limiting** - Protect challenge endpoint from abuse
5. **Monitor session expiry** - Implement session timeout and refresh

## Migration from Mock

If you were previously using the mock WalletConnect implementation:

1. The API remains the same
2. Update environment variables
3. No changes needed to `wallet-context.tsx`
4. `walletconnect.ts` is now a real implementation
5. Session restoration is automatic

## Resources

- [WalletConnect Documentation](https://docs.walletconnect.com)
- [WalletConnect Cloud Dashboard](https://cloud.walletconnect.com)
- [Stellar Documentation](https://developers.stellar.org)
- [WalletConnect Stellar CAIP](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md)

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review WalletConnect documentation
3. Check browser console for error messages
4. Open an issue with error logs
