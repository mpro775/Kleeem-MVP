// tools/sample-schema.js
function guessType(v){
    if (v === null || v === undefined) return "null";
    if (Array.isArray(v)) return "array";
    if (typeof v === "object") return "object";
    return typeof v;
  }
  const collections = db.getCollectionNames();
  collections.forEach(cn => {
    const sample = db.getCollection(cn).aggregate([{ $sample: { size: 200 } }]).toArray();
    const shape = {};
    sample.forEach(doc => {
      Object.keys(doc).forEach(k => {
        const t = guessType(doc[k]);
        shape[k] = shape[k] || new Set();
        shape[k].add(t);
      });
    });
    Object.keys(shape).forEach(k => shape[k] = Array.from(shape[k]));
    printjson({ collection: cn, shape });
  });
  