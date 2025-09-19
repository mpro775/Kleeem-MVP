import { Test } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../repositories/users.repository';
import { PaginationResult } from '../../../common/dto/pagination.dto';

describe('UsersService', () => {
  let svc: UsersService;
  const repo: jest.Mocked<UsersRepository> = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByIdLean: jest.fn(),
    updateById: jest.fn(),
    softDeleteById: jest.fn(),
    setFirstLoginFalse: jest.fn(),
    getNotificationsPrefs: jest.fn(),
    updateNotificationsPrefs: jest.fn(),
    list: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: 'UsersRepository', useValue: repo }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('findOne returns DTO and throws when missing', async () => {
    repo.findByIdLean.mockResolvedValueOnce({
      _id: '64a',
      email: 'e',
      name: 'n',
      merchantId: 'm',
      firstLogin: true,
      role: 'admin',
    });
    const dto = await svc.findOne('64a00000000000000000000');
    expect(dto.email).toBe('e');

    repo.findByIdLean.mockResolvedValueOnce(null);
    await expect(svc.findOne('64b00000000000000000000')).rejects.toThrow();
  });

  it('getUsers proxies to repo.list', async () => {
    const paged: PaginationResult<any> = {
      items: [],
      meta: {
        hasMore: false,
        count: 0,
      },
    };
    repo.list.mockResolvedValueOnce(paged);
    const res = await svc.getUsers({ limit: 10 } as any);
    expect(res).toBe(paged);
  });
});
