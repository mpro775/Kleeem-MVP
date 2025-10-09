import { ProductsModule } from './products.module';

describe('ProductsModule', () => {
  it('should be defined', () => {
    expect(ProductsModule).toBeDefined();
  });

  it('should have module metadata', () => {
    const metadata = Reflect.getMetadata('__module__', ProductsModule);
    expect(metadata).toBeDefined();
  });
});
