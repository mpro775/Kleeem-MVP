import { detectOrderIntent } from '../../utils/intents';

describe('detectOrderIntent', () => {
  it('detects order by ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(detectOrderIntent(id)).toEqual({
      step: 'orderDetails',
      orderId: id,
    });
  });
  it('detects phone for orders', () => {
    expect(detectOrderIntent('7701234567')).toEqual({
      step: 'orders',
      phone: '7701234567',
    });
  });
  it('asks for phone for relevant keywords', () => {
    expect(detectOrderIntent('أريد تتبع طلبي')).toEqual({ step: 'askPhone' });
  });
  it('returns normal otherwise', () => {
    expect(detectOrderIntent('hello')).toEqual({ step: 'normal' });
  });
});
