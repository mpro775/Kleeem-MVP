// tools/dump-indexes.js
const dbName = db.getName();
print(`Database: ${dbName}`);

db.getCollectionNames().forEach(cn => {
  const stats = db.getCollection(cn).stats();
  printjson({ collection: cn, count: stats.count, size: stats.size, storageSize: stats.storageSize });

  const idx = db.getCollection(cn).getIndexes();
  print("Indexes:");
  idx.forEach(i => printjson(i));
  print("----");
});
