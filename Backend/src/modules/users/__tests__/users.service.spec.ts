import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { UsersService } from '../users.service';

import type { CreateUserDto } from '../dto/create-user.dto';
import type { MongoUsersRepository } from '../repositories/mongo-users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<MongoUsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'UsersRepository',
          useValue: mockDeep<MongoUsersRepository>(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get('UsersRepository');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      repository.findByIdLean.mockResolvedValue(mockUser as any);

      const result = await service.findOne('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findByIdLean.bind(repository)).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should return null when user not found', async () => {
      repository.findByIdLean.mockResolvedValue(null as any);

      const result = await service.findOne('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return new user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
      };

      const mockCreatedUser = {
        id: '2',
        ...createUserDto,
      };

      repository.create.mockResolvedValue(mockCreatedUser as any);

      const result = await service.create(
        createUserDto as unknown as CreateUserDto,
      );

      expect(result).toEqual(mockCreatedUser);
      expect(repository.create.bind(repository)).toHaveBeenCalledWith(
        createUserDto,
      );
    });
  });

  describe('findById', () => {
    it('should return user when found by id', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      repository.findByIdLean.mockResolvedValue(mockUser as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(repository.findByIdLean.bind(repository)).toHaveBeenCalledWith(
        '1',
      );
    });

    it('should return null when user not found by id', async () => {
      repository.findByIdLean.mockResolvedValue(null as any);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
