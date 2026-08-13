export default function StatCard({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon: string }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
    </article>
  )
}
