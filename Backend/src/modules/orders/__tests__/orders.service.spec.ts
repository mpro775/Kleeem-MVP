import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../orders.service';
import { OrdersRepository } from '../repositories/orders.repository';
import { LeadsService } from '../../leads/leads.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: OrdersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: 'OrdersRepository',
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: LeadsService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repo = module.get<OrdersRepository>('OrdersRepository');
  });

  it('should create order and call leadsService', async () => {
    (repo.create as jest.Mock).mockResolvedValue({ id: '1' });
    const dto = {
      customer: { phone: '123' },
      products: [],
      merchantId: 'm1',
    } as any;

    const result = await service.create(dto);
    expect(result).toEqual({ id: '1' });
    expect(repo.create).toHaveBeenCalled();
  });

  it('should return all orders', async () => {
    (repo.findAll as jest.Mock).mockResolvedValue([{ id: '1' }]);
    const result = await service.findAll();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('should return one order', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue({ id: '1' });
    const result = await service.findOne('1');
    expect(result).toEqual({ id: '1' });
  });

  it('should update status', async () => {
    (repo.updateStatus as jest.Mock).mockResolvedValue({
      id: '1',
      status: 'done',
    });
    const result = await service.updateStatus('1', 'done');
    expect(result).toEqual({ id: '1', status: 'done' });
  });
});
