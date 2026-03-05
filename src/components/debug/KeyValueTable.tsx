type KeyValueTableProps = {
  headers: Record<string, string>;
  emptyMessage?: string;
};

export default function KeyValueTable({ headers, emptyMessage = "No headers" }: KeyValueTableProps) {
  const entries = Object.entries(headers ?? {});
  if (entries.length === 0) {
    return (
      <div className="feed-detail__empty">
        {emptyMessage}
      </div>
    );
  }
  return (
    <table className="feed-detail__kv-table">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td className="feed-detail__kv-key">{key}</td>
            <td className="feed-detail__kv-value">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
