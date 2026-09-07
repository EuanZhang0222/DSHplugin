// 与服务端语义字段的长度限制保持一致；仅复制原始元数据，不处理页面占位文字。
export const COMMENT_COPY_TARGETS = Object.freeze({
  businessName: Object.freeze({ label: '业务名称', maxLength: 200 }),
  customComment: Object.freeze({ label: '自定义业务注释', maxLength: 5000 }),
});

export function copyDatabaseComments(fields, target, { overwrite = false } = {}) {
  if (!Object.hasOwn(COMMENT_COPY_TARGETS, target)) throw new Error('不支持的注释复制目标');
  const { label, maxLength } = COMMENT_COPY_TARGETS[target];
  const rows = Array.isArray(fields) ? fields : [];
  const result = {
    target, label, maxLength, total: rows.length,
    copied: 0, overwritten: 0, preserved: 0, emptyComment: 0, unchanged: 0, tooLong: [], fields: rows,
  };
  const next = rows.map((field) => {
    const raw = typeof field.databaseComment === 'string' ? field.databaseComment.trim() : '';
    if (!raw) { result.emptyComment++; return field; }
    const previous = typeof field[target] === 'string' ? field[target] : '';
    const occupied = Boolean(previous.trim());
    if (occupied && !overwrite) { result.preserved++; return field; }
    // 业务名称为单行；自定义业务注释保留原注释的内部分行。
    const value = target === 'businessName' ? raw.replace(/[\r\n\u2028\u2029]+/g, ' ') : raw;
    if (value.length > maxLength) {
      result.tooLong.push({ name: field.name, length: value.length });
      return field;
    }
    if (previous === value) { result.unchanged++; return field; }
    result.copied++;
    if (occupied) result.overwritten++;
    return { ...field, [target]: value };
  });
  if (result.copied) result.fields = next;
  return result;
}
