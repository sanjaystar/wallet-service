import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      message: 'Wallet Service API',
      version: '1.0.0',
      endpoints: {
        'GET /api/wallets/:userId/balance': 'Get wallet balance',
        'POST /api/wallets/topup': 'Top-up wallet',
        'POST /api/wallets/bonus': 'Add bonus credits',
        'POST /api/wallets/spend': 'Spend credits',
      },
      example: {
        getBalance: 'GET http://localhost:3000/api/wallets/1/balance',
        topUp: 'POST http://localhost:3000/api/wallets/topup',
      },
    };
  }
}
