import { Types } from 'mongoose';
import {
  ChannelProvider,
  ChannelDocument,
} from '../../channels/schemas/channel.schema';
import { MerchantDocument } from '../schemas/merchant.schema';

export interface MerchantChecklistRepository {
  findMerchantLean(
    merchantId: string,
  ): Promise<
    | (Pick<
        MerchantDocument,
        | '_id'
        | 'logoUrl'
        | 'addresses'
        | 'publicSlug'
        | 'publicSlugEnabled'
        | 'quickConfig'
        | 'skippedChecklistItems'
        | 'productSourceConfig'
        | 'workingHours'
        | 'returnPolicy'
        | 'exchangePolicy'
        | 'shippingPolicy'
      > &
        Record<string, any>)
    | null
  >;

  countProducts(merchantId: string | Types.ObjectId): Promise<number>;
  countCategories(merchantId: string | Types.ObjectId): Promise<number>;

  /** يرجع: الافتراضي إن وُجد، وإلا آخر مفعّل، وإلا أي قناة لنفس المزود */
  getDefaultOrEnabledOrAnyChannel(
    merchantId: string,
    provider: ChannelProvider,
  ): Promise<
    | (Pick<ChannelDocument, 'enabled' | 'status' | 'isDefault'> &
        Record<string, any>)
    | null
  >;
}
