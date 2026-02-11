// src/features/knowledge/api.ts
// التفاف بسيط حول طبقة الـ API الحالية لتوحيد الاستيراد
import {
  fetchDocuments as _fetchDocuments,
  uploadDocument as _uploadDocument,
  deleteDocument as _deleteDocument,
} from "./api/documentsApi";

import {
  fetchLinks as _fetchLinks,
  addLinks as _addLinks,
  deleteLink as _deleteLink,
} from "./api/linksApi";

import {
  fetchFaqs as _fetchFaqs,
  addFaqs as _addFaqs,
  deleteFaq as _deleteFaq,
  updateFaq as _updateFaq,
  deleteAllFaqs as _deleteAllFaqs,
} from "./api/faqsApi";

export const docsApi = {
  fetch: _fetchDocuments,
  upload: _uploadDocument,
  remove: _deleteDocument,
};

export const linksApi = {
  fetch: _fetchLinks,
  add: _addLinks,
  remove: _deleteLink,
};

export const faqsApi = {
  fetch: _fetchFaqs,
  add: _addFaqs,
  remove: _deleteFaq,
  update: _updateFaq,
  removeAll: _deleteAllFaqs,
};
