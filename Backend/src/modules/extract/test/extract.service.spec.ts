// src/extract/extract.service.spec.ts
// يغطي ExtractService.extractFromUrl مع إصلاح نوع AxiosResponse عبر config.headers
import { faker } from '@faker-js/faker';
import { Logger } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

import { ExtractService, type ExtractResult } from '../extract.service';

import type { HttpService } from '@nestjs/axios';
import type { AxiosResponse } from 'axios';
import type { DeepMockProxy } from 'jest-mock-extended';

// مُساعد لصنع AxiosResponse صحيح النوع (Axios v1 يتطلب config.headers)
function makeAxiosResponse<T>(
  data: T,
  init?: Partial<AxiosResponse<T>>,
): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    // InternalAxiosRequestConfig يتطلب headers، نمرّرها فارغة
    config: { headers: {} as any, ...(init?.config as any) },
    ...init,
  } as AxiosResponse<T>;
}

describe('ExtractService', () => {
  let http: DeepMockProxy<HttpService>;
  let service: ExtractService;

  beforeEach(() => {
    http = mockDeep<HttpService>();
    service = new ExtractService(http);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('يعيد البيانات المستخرجة ويمرر url كـ query param (happy path)', async () => {
    const url = faker.internet.url();
    const payload: ExtractResult = {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      images: [faker.image.url(), faker.image.url()],
      price: Number(faker.commerce.price()),
      availability: 'in_stock',
    };

    http.get.mockReturnValue(
      of(makeAxiosResponse<{ data: ExtractResult }>({ data: payload })) as any,
    );

    const result = await service.extractFromUrl(url);

    expect(http.get).toHaveBeenCalledWith(
      'http://extractor-service:8001/extract/',
      { params: { url } },
    );
    expect(result).toEqual(payload);
  });

  it('يعيد {} عندما تكون الاستجابة بلا حقول ذات معنى (partial/empty payload)', async () => {
    const url = '';
    http.get.mockReturnValue(
      of(makeAxiosResponse<{ data: ExtractResult }>({ data: {} })) as any,
    );

    const result = await service.extractFromUrl(url);

    expect(result).toEqual({});

    expect(http.get).toHaveBeenCalledWith(
      'http://extractor-service:8001/extract/',
      { params: { url } },
    );
  });

  it('يرجع {} عند فشل الطلب ويُسجل الخطأ برسالة واضحة (error path)', async () => {
    const url = faker.internet.url();
    const error = new Error('network down');
    http.get.mockReturnValue(throwError(() => error) as any);
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();

    const result = await service.extractFromUrl(url);

    expect(result).toEqual({});
    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy.mock.calls[0][0]).toContain(`Extract failed for ${url}`);
    expect(loggerSpy.mock.calls[0][0]).toContain(error.message);
  });

  it('يتعامل مع خطأ بلا message دون أن يرمي (edge case)', async () => {
    const url = faker.internet.url();
    const weirdErr: any = {}; // بلا message

    http.get.mockReturnValue(throwError(() => weirdErr) as any);
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();

    const result = await service.extractFromUrl(url);

    expect(result).toEqual({});
    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy.mock.calls[0][0]).toContain(`Extract failed for ${url}`);
  });
});
