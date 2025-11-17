import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Limpar mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const createNotificationDto = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'EVENT_REMINDER',
      };

      const expectedNotification = {
        id: 'notif-123',
        ...createNotificationDto,
        read: false,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(
        expectedNotification,
      );

      const result = await service.create(createNotificationDto);

      expect(result).toEqual(expectedNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: createNotificationDto,
      });
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all notifications with user data', async () => {
      const expectedNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'Notification 1',
          message: 'Message 1',
          type: 'EVENT_REMINDER',
          read: false,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          title: 'Notification 2',
          message: 'Message 2',
          type: 'NEW_COMMENT',
          read: true,
          createdAt: new Date(),
          user: {
            id: 'user-2',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        expectedNotifications,
      );

      const result = await service.findAll();

      expect(result).toEqual(expectedNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('findUserNotifications', () => {
    it('should return notifications for a specific user', async () => {
      const userId = 'user-123';
      const expectedNotifications = [
        {
          id: 'notif-1',
          userId,
          title: 'Notification 1',
          message: 'Message 1',
          type: 'EVENT_REMINDER',
          read: false,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(
        expectedNotifications,
      );

      const result = await service.findUserNotifications(userId);

      expect(result).toEqual(expectedNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications for user', async () => {
      const userId = 'user-123';
      const expectedCount = 5;

      mockPrismaService.notification.count.mockResolvedValue(expectedCount);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(expectedCount);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId,
          read: false,
        },
      });
    });

    it('should return 0 when user has no unread notifications', async () => {
      const userId = 'user-123';
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      const notificationId = 'notif-123';
      const expectedNotification = {
        id: notificationId,
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'EVENT_REMINDER',
        read: false,
        createdAt: new Date(),
      };

      mockPrismaService.notification.findUnique.mockResolvedValue(
        expectedNotification,
      );

      const result = await service.findOne(notificationId);

      expect(result).toEqual(expectedNotification);
      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notif-123';
      const expectedNotification = {
        id: notificationId,
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'EVENT_REMINDER',
        read: true,
        createdAt: new Date(),
      };

      mockPrismaService.notification.update.mockResolvedValue(
        expectedNotification,
      );

      const result = await service.markAsRead(notificationId);

      expect(result).toEqual(expectedNotification);
      expect(result.read).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { read: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const userId = 'user-123';
      const expectedResult = { count: 3 };

      mockPrismaService.notification.updateMany.mockResolvedValue(
        expectedResult,
      );

      const result = await service.markAllAsRead(userId);

      expect(result).toEqual(expectedResult);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
        },
      });
    });

    it('should return count 0 when no unread notifications', async () => {
      const userId = 'user-123';
      mockPrismaService.notification.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.markAllAsRead(userId);

      expect(result.count).toBe(0);
    });
  });

  describe('update', () => {
    it('should update a notification', async () => {
      const notificationId = 'notif-123';
      const updateDto = { read: true };
      const expectedNotification = {
        id: notificationId,
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'EVENT_REMINDER',
        read: true,
        createdAt: new Date(),
      };

      mockPrismaService.notification.update.mockResolvedValue(
        expectedNotification,
      );

      const result = await service.update(notificationId, updateDto);

      expect(result).toEqual(expectedNotification);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a notification', async () => {
      const notificationId = 'notif-123';
      const deletedNotification = {
        id: notificationId,
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'EVENT_REMINDER',
        read: false,
        createdAt: new Date(),
      };

      mockPrismaService.notification.delete.mockResolvedValue(
        deletedNotification,
      );

      const result = await service.remove(notificationId);

      expect(result).toEqual(deletedNotification);
      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
    });
  });
});
