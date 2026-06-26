import Category from '../models/Category.js';

/**
 * ایندکس درون‌حافظه‌ای دسته‌بندی‌ها (BE-05)
 * ----------------------------------------------------------------------------
 * به‌جای اجرای BFS دیتابیس برای هر جستجوی ذخیره‌شده (N+1)، یک‌بار همهٔ دسته‌ها
 * را می‌خوانیم و نوادگان هر slug را در حافظه محاسبه می‌کنیم.
 *
 * خروجی: تابع descendantIdsBySlug(slug) → آرایه‌ای از ObjectIdها (خود دسته + همهٔ نوادگان)
 */
export async function buildCategoryIndex() {
  const cats = await Category.find().select('_id slug parent').lean();

  const bySlug = new Map();
  const childrenByParent = new Map(); // parentId(string) → [cat]

  for (const c of cats) {
    bySlug.set(c.slug, c);
    const key = c.parent ? String(c.parent) : 'root';
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(c);
  }

  /** خود دسته + همهٔ نوادگان (هر عمقی) — از حافظه، بدون کوئری اضافه. */
  function descendantIdsBySlug(slug) {
    const root = bySlug.get(slug);
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

  return { descendantIdsBySlug };
}
