// // src/modules/integrations/integrations.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { Integration, IntegrationDocument } from './schemas/integration.schema';

// @Injectable()
// export class IntegrationsService {
//   constructor(
//     @InjectModel(Integration.name)
//     private readonly intModel: Model<IntegrationDocument>,
//   ) {}

//   // src/modules/integrations/integrations.service.ts
//   async list(merchantId: string): Promise<Integration[]> {
//     const allKeys: Integration['key'][] = [
//       'zapier',
//       'whatsapp',
//       'facebook',
//       'instagram',
//       'slack',
//     ];
//     const existingDocs = await this.intModel.find({ merchantId }).lean();
//     const existingMap = new Map(existingDocs.map((doc) => [doc.key, doc]));

//     const result: Integration[] = [];
//     for (const key of allKeys) {
//       const doc = existingMap.get(key);
//       if (doc) {
//         result.push(doc);
//       } else {
//         const created = await this.intModel.create({
//           merchantId,
//           key,
//           enabled: false,
//           config: {},
//           tier: 'free',
//         });
//         result.push(created.toObject());
//       }
//     }
//     return result;
//   }

//   async connect(
//     merchantId: string,
//     key: Integration['key'],
//     config: Record<string, any>,
//   ): Promise<Integration> {
//     const updated = await this.intModel
//       .findOneAndUpdate(
//         { merchantId, key },
//         { enabled: true, config },
//         { new: true, upsert: true },
//       )
//       .exec();
//     if (!updated) throw new NotFoundException('Integration not found');
//     // هنا يمكنك إضافة منطق OAuth أو استدعاء APIs حسب key
//     return updated;
//   }

//   async disconnect(
//     merchantId: string,
//     key: Integration['key'],
//   ): Promise<Integration> {
//     const updated = await this.intModel
//       .findOneAndUpdate(
//         { merchantId, key },
//         { enabled: false, config: {} },
//         { new: true },
//       )
//       .exec();
//     if (!updated) throw new NotFoundException('Integration not found');
//     return updated;
//   }
// }
