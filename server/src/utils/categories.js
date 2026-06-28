import Category from '../models/Category.js';

/**
 * ایندکس درون‌حافظه‌ای دسته‌بندی‌ها (BE-05)
 * ----------------------------------------------------------------------------
 * به‌جای اجرای BFS دیتابیس برای هر جستجوی وابسته به دسته‌بندی، یک‌بار همهٔ
 * دسته‌ها را می‌خوانیم و نوادگان هر دسته را در حافظه محاسبه می‌کنیم.
 *
 * خروجی:
 *   - descendantIdsBySlug(slug)
 *   - descendantIdsById(id)
 *
 * نکتهٔ معماری:
 *   savedSearch قبلاً از نسخهٔ slug-based استفاده می‌کرد. حالا ad.routes هم به
 *   همین utility مشترک مهاجرت می‌کند تا منطق descendants فقط یک‌جا نگه‌داری شود.
 */
export async function buildCategoryIndex() {
  const cats = await Category.find().select('_id slug parent').lean();

  const bySlug = new Map();
  const byId = new Map();
  const childrenByParent = new Map(); // parentId(string) → [cat]

  for (const c of cats) {
    bySlug.set(c.slug, c);
    byId.set(String(c._id), c);
    const key = c.parent ? String(c.parent) : 'root';
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(c);
  }

  /** خود دسته + همهٔ نوادگان (هر عمقی) — از حافظه، بدون کوئری اضافه. */
  function descendantIdsFromNode(root) {
    if (!root) return [];
    const ids = [root._id];
    let frontier = [String(root._id)];
    let guard = 0;
    while (frontier.length && guard++ < 20) {
      const next = [];
      for (const pid of frontier) {
        for (const child of childrenByParent.get(pid) || []) {
          ids.push(child._id);
          next.push(String(child._id));
        }
      }
      frontier = next;
    }
    return ids;
  }

  function descendantIdsBySlug(slug) {
    return descendantIdsFromNode(bySlug.get(slug));
  }

  function descendantIdsById(id) {
    return descendantIdsFromNode(byId.get(String(id)));
  }

  function getById(id) {
    return byId.get(String(id)) || null;
  }

  return { descendantIdsBySlug, descendantIdsById, getById };
}
